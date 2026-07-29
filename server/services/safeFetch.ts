/**
 * Holt eine Datei von einer Adresse, die wir NICHT selbst bestimmt haben.
 *
 * Zwei Stellen brauchen das, und beide bekommen ihre Adressen aus einer
 * fremden Website:
 *   - die Speisekarte (PDF/Bild/HTML), deren Adresse der Scrape gefunden hat
 *   - die Galeriebilder, die vor dem Veröffentlichen in unseren Speicher sollen
 *
 * Damit führt der Server Anfragen aus, deren Ziel ein Angreifer beeinflussen
 * kann. Ohne Schranken ist das eine klassische SSRF-Lücke: Eine Website, die
 * wir analysieren, könnte als Speisekarte
 *   http://169.254.169.254/latest/meta-data/    (Cloud-Metadaten)
 *   http://127.0.0.1:5432/                      (unsere eigene Datenbank)
 *   http://postgres.railway.internal/           (internes Railway-Netz)
 * angeben und sich die Antwort über die erzeugte Web-App zurückgeben lassen.
 * Auf Railway liegen in genau diesem Netz die Datenbank und der
 * Supabase-Service-Key.
 *
 * Deshalb: nur http/https, jede aufgelöste Adresse gegen die privaten Bereiche
 * geprüft, Weiterleitungen einzeln nachgeprüft, Größe und Zeit begrenzt.
 *
 * Bekannte Restlücke: DNS-Rebinding. Zwischen unserer Prüfung und dem
 * eigentlichen Verbindungsaufbau kann derselbe Name auf eine andere Adresse
 * zeigen. Das sauber zu schließen hieße, selbst auf die geprüfte IP zu
 * verbinden und den Host-Header zu setzen – mit Nodes fetch nicht ohne eigenen
 * Agenten möglich. Der Aufwand steht hier nicht dafür: Es gibt keinen
 * unauthentifizierten Weg hierher, und die Antwort wird nie roh
 * zurückgegeben, sondern nur als Bild oder als geparste Speisekarte.
 */
import { lookup } from "node:dns/promises";
import { isIP } from "node:net";

export interface SafeFetchOptions {
  /** Obergrenze in Bytes. Wird sie überschritten, bricht der Download ab. */
  maxBytes: number;
  /** Gesamtzeit in Millisekunden. */
  timeoutMs?: number;
  /** Wie viele Weiterleitungen wir mitgehen. */
  maxRedirects?: number;
  /**
   * Erlaubte Inhaltstypen als Präfix, z.B. ["image/", "application/pdf"].
   * Leer = alles erlaubt (dann muss der Aufrufer selbst prüfen).
   */
  allowedContentTypes?: string[];
  userAgent?: string;
}

export interface SafeFetchResult {
  buffer: Buffer;
  contentType: string;
  /** Adresse nach allen Weiterleitungen. */
  finalUrl: string;
  bytes: number;
}

export class SafeFetchError extends Error {
  constructor(
    message: string,
    readonly reason:
      | "scheme"
      | "credentials"
      | "dns"
      | "blocked_address"
      | "redirect"
      | "http_status"
      | "content_type"
      | "too_large"
      | "timeout"
      | "network",
  ) {
    super(message);
    this.name = "SafeFetchError";
  }
}

const DEFAULT_TIMEOUT_MS = 20_000;
const DEFAULT_MAX_REDIRECTS = 3;
const DEFAULT_USER_AGENT = "Mozilla/5.0 (compatible; Maitr-Bot/1.0)";

/** Wandelt "a.b.c.d" in eine Zahl. Gibt null bei ungültiger Eingabe. */
function ipv4ToInt(ip: string): number | null {
  const parts = ip.split(".");
  if (parts.length !== 4) return null;
  let out = 0;
  for (const part of parts) {
    if (!/^\d{1,3}$/.test(part)) return null;
    const n = Number(part);
    if (n > 255) return null;
    out = out * 256 + n;
  }
  return out;
}

/**
 * IPv4-Bereiche, die nie von außen erreichbar sein dürfen.
 * 169.254.0.0/16 enthält 169.254.169.254 – den Metadaten-Dienst der Cloud.
 */
const BLOCKED_V4: Array<[string, number]> = [
  ["0.0.0.0", 8],
  ["10.0.0.0", 8],
  ["100.64.0.0", 10], // Carrier-Grade NAT
  ["127.0.0.0", 8], // Loopback
  ["169.254.0.0", 16], // Link-local + Cloud-Metadaten
  ["172.16.0.0", 12],
  ["192.0.0.0", 24],
  ["192.0.2.0", 24],
  ["192.168.0.0", 16],
  ["198.18.0.0", 15], // Benchmarking
  ["198.51.100.0", 24],
  ["203.0.113.0", 24],
  ["224.0.0.0", 4], // Multicast
  ["240.0.0.0", 4], // Reserviert, inkl. 255.255.255.255
];

export function isBlockedAddress(ip: string): boolean {
  const version = isIP(ip);
  if (version === 0) return true; // unbekanntes Format -> nicht durchlassen

  if (version === 4) {
    const value = ipv4ToInt(ip);
    if (value === null) return true;
    return BLOCKED_V4.some(([base, bits]) => {
      const baseInt = ipv4ToInt(base);
      if (baseInt === null) return false;
      const mask = bits === 0 ? 0 : (-1 << (32 - bits)) >>> 0;
      return (value & mask) >>> 0 === (baseInt & mask) >>> 0;
    });
  }

  const normalized = ip.toLowerCase().split("%")[0];

  // IPv4-in-IPv6 ("::ffff:169.254.169.254") mit denselben Regeln prüfen,
  // sonst führt die Schreibweise an der v4-Liste vorbei.
  const mapped = normalized.match(/^::ffff:(\d{1,3}(?:\.\d{1,3}){3})$/);
  if (mapped) return isBlockedAddress(mapped[1]);
  const mappedHex = normalized.match(/^::ffff:([0-9a-f]{1,4}):([0-9a-f]{1,4})$/);
  if (mappedHex) {
    const hi = parseInt(mappedHex[1], 16);
    const lo = parseInt(mappedHex[2], 16);
    return isBlockedAddress(
      `${(hi >> 8) & 255}.${hi & 255}.${(lo >> 8) & 255}.${lo & 255}`,
    );
  }

  if (normalized === "::1" || normalized === "::") return true;
  if (/^f[cd][0-9a-f]{2}:/.test(normalized)) return true; // fc00::/7 Unique Local
  if (/^fe[89ab][0-9a-f]:/.test(normalized)) return true; // fe80::/10 Link-Local
  if (/^ff[0-9a-f]{2}:/.test(normalized)) return true; // ff00::/8 Multicast

  return false;
}

/**
 * Prüft eine Adresse, bevor sie abgerufen wird.
 * Wirft SafeFetchError, wenn sie nicht in Frage kommt.
 */
export async function assertUrlAllowed(raw: string): Promise<URL> {
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    throw new SafeFetchError(`Keine gültige Adresse: ${raw}`, "scheme");
  }

  if (url.protocol !== "http:" && url.protocol !== "https:") {
    // file:, gopher:, ftp: und data: haben hier nichts zu suchen.
    throw new SafeFetchError(
      `Nicht unterstütztes Protokoll: ${url.protocol}`,
      "scheme",
    );
  }

  if (url.username || url.password) {
    // Zugangsdaten in der Adresse dienen fast immer der Verschleierung
    // ("http://harmlos.de@169.254.169.254/").
    throw new SafeFetchError("Adresse enthält Zugangsdaten", "credentials");
  }

  const host = url.hostname.replace(/^\[|\]$/g, "");

  // Ist der Host bereits eine IP, gar nicht erst auflösen.
  if (isIP(host)) {
    if (isBlockedAddress(host)) {
      throw new SafeFetchError(
        `Adresse zeigt in ein nicht erlaubtes Netz: ${host}`,
        "blocked_address",
      );
    }
    return url;
  }

  let addresses: Array<{ address: string }>;
  try {
    addresses = await lookup(host, { all: true });
  } catch {
    throw new SafeFetchError(`Name nicht auflösbar: ${host}`, "dns");
  }

  if (!addresses.length) {
    throw new SafeFetchError(`Name nicht auflösbar: ${host}`, "dns");
  }

  // ALLE Adressen müssen zulässig sein. Eine einzige private darunter genügt,
  // um über Round-Robin doch im internen Netz zu landen.
  for (const { address } of addresses) {
    if (isBlockedAddress(address)) {
      throw new SafeFetchError(
        `${host} löst auf eine nicht erlaubte Adresse auf (${address})`,
        "blocked_address",
      );
    }
  }

  return url;
}

/**
 * Lädt eine Datei herunter und hält dabei alle Schranken ein.
 *
 * Weiterleitungen werden bewusst selbst verfolgt (redirect: "manual"): Bei
 * automatischem Folgen prüfte niemand das Ziel, und eine harmlose Adresse
 * könnte per 302 auf 169.254.169.254 zeigen.
 *
 * Die Größe wird am Datenstrom mitgezählt, nicht am Content-Length-Kopf – der
 * ist eine Behauptung der Gegenseite und darf nicht die einzige Schranke sein.
 */
export async function safeFetch(
  rawUrl: string,
  options: SafeFetchOptions,
): Promise<SafeFetchResult> {
  const {
    maxBytes,
    timeoutMs = DEFAULT_TIMEOUT_MS,
    maxRedirects = DEFAULT_MAX_REDIRECTS,
    allowedContentTypes = [],
    userAgent = DEFAULT_USER_AGENT,
  } = options;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    let current = rawUrl;

    for (let hop = 0; hop <= maxRedirects; hop++) {
      const url = await assertUrlAllowed(current);

      let response: Response;
      try {
        response = await fetch(url, {
          redirect: "manual",
          signal: controller.signal,
          headers: { "User-Agent": userAgent, Accept: "*/*" },
        });
      } catch (err) {
        if (controller.signal.aborted) {
          throw new SafeFetchError(
            `Zeitüberschreitung nach ${timeoutMs} ms`,
            "timeout",
          );
        }
        throw new SafeFetchError(
          `Abruf fehlgeschlagen: ${err instanceof Error ? err.message : "unbekannt"}`,
          "network",
        );
      }

      if (response.status >= 300 && response.status < 400) {
        const location = response.headers.get("location");
        if (!location) {
          throw new SafeFetchError(
            `Weiterleitung ohne Ziel (HTTP ${response.status})`,
            "redirect",
          );
        }
        if (hop === maxRedirects) {
          throw new SafeFetchError(
            `Mehr als ${maxRedirects} Weiterleitungen`,
            "redirect",
          );
        }
        // Relative Ziele gegen die aktuelle Adresse auflösen; die nächste
        // Runde prüft sie erneut vollständig.
        current = new URL(location, url).toString();
        continue;
      }

      if (!response.ok) {
        throw new SafeFetchError(
          `Server antwortete mit HTTP ${response.status}`,
          "http_status",
        );
      }

      const contentType = (
        response.headers.get("content-type") || "application/octet-stream"
      )
        .split(";")[0]
        .trim()
        .toLowerCase();

      if (
        allowedContentTypes.length &&
        !allowedContentTypes.some((prefix) => contentType.startsWith(prefix))
      ) {
        throw new SafeFetchError(
          `Nicht erlaubter Inhaltstyp: ${contentType}`,
          "content_type",
        );
      }

      // Angekündigte Größe früh ablehnen, aber ihr nicht vertrauen.
      const announced = Number(response.headers.get("content-length"));
      if (Number.isFinite(announced) && announced > maxBytes) {
        throw new SafeFetchError(
          `Datei zu groß (${announced} Bytes, erlaubt ${maxBytes})`,
          "too_large",
        );
      }

      const buffer = await readCapped(response, maxBytes);

      return {
        buffer,
        contentType,
        finalUrl: url.toString(),
        bytes: buffer.length,
      };
    }

    throw new SafeFetchError(`Mehr als ${maxRedirects} Weiterleitungen`, "redirect");
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Liest den Rumpf und bricht ab, sobald die Grenze überschritten wird.
 * response.arrayBuffer() würde erst alles in den Speicher holen – eine
 * 2-GB-Antwort legte damit den Prozess lahm.
 */
async function readCapped(response: Response, maxBytes: number): Promise<Buffer> {
  const body = response.body;
  if (!body) return Buffer.alloc(0);

  const reader = body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    if (!value) continue;
    total += value.byteLength;
    if (total > maxBytes) {
      await reader.cancel().catch(() => {});
      throw new SafeFetchError(
        `Datei überschreitet ${maxBytes} Bytes`,
        "too_large",
      );
    }
    chunks.push(value);
  }

  return Buffer.concat(chunks.map((c) => Buffer.from(c)), total);
}
