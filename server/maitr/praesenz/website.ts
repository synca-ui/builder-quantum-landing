/**
 * Website-Prüfung - was die eigene Seite des Betriebs über seine Präsenz sagt.
 *
 * Dieselben Prüfungen wie im Restaurant-Audit (n8n, 9.827 Seiten, 31.08.2026):
 * erreichbar, verschlüsselt, mobil lesbar, strukturierte Daten, Speisekarte
 * auffindbar, Reservierung, Öffnungszeiten, Adresse, Instagram. Die Leseteile
 * (`extractSiteDetails`, `detectReservation`) sind die des Konfigurators -
 * dieselbe Erkennung, die die Web-App befüllt, bewertet hier die Ausgangslage.
 *
 * Der Abruf geht über `safeFetch`: Die Adresse kommt von Google oder aus dem
 * Betriebsprofil, also aus fremder Hand - ohne die Schranken dort wäre das eine
 * SSRF-Lücke ins Railway-Netz (Begründung in server/services/safeFetch.ts).
 */
import type { WebsitePruefung } from "@maitr/core/analytics";
import { collectJsonLd, extractSiteDetails } from "../../../shared/siteDetails";
import { detectReservation } from "../../../shared/reservation";
import { safeFetch, SafeFetchError } from "../../services/safeFetch";

/** Eine Startseite ist selten größer; mehr wäre ohnehin nicht die Startseite. */
const MAX_HTML_BYTES = 4 * 1024 * 1024;
/** Kürzer als der Netlify-Proxy (26 s) abzüglich Places und Fotos (je 7 s). */
const TIMEOUT_MS = 7_000;

const BETRIEBSTYPEN =
  /Restaurant|LocalBusiness|FoodEstablishment|CafeOrCoffeeShop|BarOrPub|Bakery|Brewery|IceCreamShop|FastFoodRestaurant|Winery|Distillery/;

function seitentitel(html: string): string | undefined {
  const m = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  if (!m) return undefined;
  const t = m[1].replace(/\s+/g, " ").trim();
  return t ? t.slice(0, 120) : undefined;
}

/** Nennt die Seite irgendwo einen schema.org-Betrieb? Typen können Arrays sein. */
function hatStrukturierteDaten(html: string): boolean {
  return collectJsonLd(html).some((node) => {
    const typ = node?.["@type"];
    const typen: unknown[] = Array.isArray(typ) ? typ : [typ];
    return typen.some((t) => typeof t === "string" && BETRIEBSTYPEN.test(t));
  });
}

/**
 * Speisekarte verlinkt? Link-Ziel ODER Link-Text - "Karte" allein reicht nicht
 * (Anfahrtskarte), "Speisekarte", "Menü", "Getränke" und PDF-Ziele schon.
 */
export function speisekarteVerlinkt(html: string): boolean {
  const muster = /speise|men[uü]|getr[aä]nke|karte\.pdf|menu\.pdf|\/karte\b|mittagstisch|tageskarte/i;
  for (const a of html.matchAll(/<a\b[^>]*href\s*=\s*["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi)) {
    const ziel = a[1];
    const label = a[2].replace(/<[^>]+>/g, " ");
    if (muster.test(ziel) || /speise|men[uü]|getr[aä]nke|mittagstisch|tageskarte/i.test(label)) return true;
  }
  return false;
}

/** Rein: HTML → Befund. Getrennt vom Abruf, damit es sich ohne Netz prüfen lässt. */
export function websitePruefungAus(html: string, finalUrl: string, ladezeitMs?: number): WebsitePruefung {
  const details = extractSiteDetails(html, finalUrl);
  const reservierung = detectReservation(html, finalUrl);
  const titel = seitentitel(html);
  return {
    url: finalUrl,
    erreichbar: true,
    https: /^https:/i.test(finalUrl),
    ...(titel ? { titel } : {}),
    mobilTauglich: /<meta\b[^>]*name\s*=\s*["']viewport["']/i.test(html),
    strukturierteDaten: hatStrukturierteDaten(html),
    speisekarteVerlinkt: speisekarteVerlinkt(html),
    ...(reservierung ? { reservierung: { anbieter: reservierung.provider, url: reservierung.url } } : {}),
    oeffnungszeitenGefunden: Boolean(details.openingHours),
    adresseGefunden: Boolean(details.address),
    ...(details.social?.instagram ? { instagram: details.social.instagram } : {}),
    ...(details.social?.facebook ? { facebook: details.social.facebook } : {}),
    ...(typeof ladezeitMs === "number" ? { ladezeitMs } : {}),
  };
}

/** Nicht lesbar - alle Befunde negativ, mit dem Grund. */
export function websiteNichtErreichbar(url: string, fehler: string): WebsitePruefung {
  return {
    url,
    erreichbar: false,
    https: /^https:/i.test(url),
    mobilTauglich: false,
    strukturierteDaten: false,
    speisekarteVerlinkt: false,
    oeffnungszeitenGefunden: false,
    adresseGefunden: false,
    fehler,
  };
}

/**
 * Die Gründe, die `WebsitePruefung.fehler` tragen darf - neutral, ohne Host und
 * ohne Adresse.
 *
 * ANLASS (Prüfbefund): `fehler` war `${reason}: ${message}` aus safeFetch, etwa
 * "blocked_address: postgres.railway.internal löst auf eine nicht erlaubte
 * Adresse auf (fd12:…)". Das Feld wird gespeichert und an jedes Mitglied
 * ausgeliefert, die geprüfte Adresse ist über einen Analyse-Job steuerbar - ein
 * Orakel ins interne Netz. Dieselbe Regel wie in server/routes/n8nProxy.ts: Der
 * Grund geht ins Server-Log, der Aufrufer bekommt nur die Sorte.
 */
const NEUTRALE_GRUENDE: Record<string, string> = {
  timeout: "Zeitüberschreitung - die Seite hat nicht rechtzeitig geantwortet.",
  http_status: "Die Seite antwortet mit einem Fehler.",
  content_type: "Unter der Adresse liegt keine HTML-Seite.",
  too_large: "Die Seite ist zu groß für die Prüfung.",
  redirect: "Die Seite leitet zu oft oder an eine unzulässige Adresse weiter.",
};
const NICHT_ERREICHBAR = "Die Seite ist nicht erreichbar.";
const ERLAUBTE_FEHLER = new Set([...Object.values(NEUTRALE_GRUENDE), NICHT_ERREICHBAR]);

/** Grund einer gescheiterten Prüfung → Text für die App. Alles Unbekannte wird "nicht erreichbar". */
export function neutralerWebsiteFehler(err: unknown): string {
  if (err instanceof SafeFetchError) return NEUTRALE_GRUENDE[err.reason] ?? NICHT_ERREICHBAR;
  return NICHT_ERREICHBAR;
}

/**
 * Für gespeicherte Zeilen von vor dieser Änderung: Ein `fehler`, der nicht einer
 * der neutralen Texte ist, wird beim Lesen ersetzt - sonst lieferte die App den
 * alten Text mit Host und IP weiter aus, bis die Seite neu geprüft wird.
 */
export function bereinigterWebsiteFehler(fehler: unknown): string | undefined {
  if (typeof fehler !== "string" || !fehler) return undefined;
  return ERLAUBTE_FEHLER.has(fehler) ? fehler : NICHT_ERREICHBAR;
}

export async function pruefeWebsite(url: string): Promise<WebsitePruefung> {
  const start = Date.now();
  try {
    const geladen = await safeFetch(url, {
      maxBytes: MAX_HTML_BYTES,
      timeoutMs: TIMEOUT_MS,
      allowedContentTypes: ["text/html", "application/xhtml"],
    });
    return websitePruefungAus(geladen.buffer.toString("utf8"), geladen.finalUrl, Date.now() - start);
  } catch (err) {
    // Details (Host, aufgelöste Adresse) nur ins Log - nie in die gespeicherte Prüfung.
    const grund = err instanceof SafeFetchError ? `${err.reason}: ${err.message}` : (err as Error)?.message;
    console.warn(`[maitr] Website-Prüfung gescheitert: ${String(grund).slice(0, 300)}`);
    return websiteNichtErreichbar(url, neutralerWebsiteFehler(err));
  }
}
