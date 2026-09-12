/**
 * inject-site-config.ts – Netlify Edge Function
 *
 * Läuft am Netlify CDN-Edge-Knoten (Frankfurt für DE-Nutzer).
 * Injiziert die Nutzer-Konfiguration direkt ins HTML-Dokument, bevor es
 * den Browser erreicht – komplett ohne client-seitigen fetch().
 *
 * Ablauf:
 *   Request → Edge Function → HTML + injiziertes <script> → Browser
 *                    ↓
 *             Railway /api/sites/:subdomain
 *
 * Vorteil:
 *   - Browser bekommt Config bereits im ersten HTML-Response
 *   - Kein Wasserfall: React bootet → Config sofort verfügbar → render
 *   - TTFB bleibt gleich, aber FCP verbessert sich um ~300-400ms
 *
 * Aktiviert für: alle GET /*.html Requests auf *.maitr.de Subdomains
 */

import type { Config, Context } from "@netlify/edge-functions";

const MAIN_DOMAINS = new Set([
  "maitr.de",
  "www.maitr.de",
  "staging.maitr.de",
]);

const RAILWAY_API =
  "https://builder-quantum-landing-production.up.railway.app";

// Subdomains die keine Restaurant-Sites sind
const RESERVED_SUBDOMAINS = new Set([
  "www", "api", "admin", "mail", "ftp", "smtp",
  "staging", "dev", "preview", "check"
]);

/**
 * Macht aus einem Wert ein JavaScript-Literal, das in einem `<script>`-Block
 * sicher ist.
 *
 * ANLASS: Hier stand `JSON.stringify(config).replace(/<\/script>/gi, …)`. Das
 * greift zu kurz - der HTML-Parser beendet einen Script-Block bei `</script`
 * gefolgt von Leerzeichen, `/` oder `>`. Ein Betriebsname wie
 *   Adler</script ><script>…
 * (der Scrape übernimmt Namen aus fremdem HTML, siehe og:site_name) wäre also
 * durch die Ersetzung gerutscht und hätte bei JEDEM Besucher der Subdomain
 * fremdes JavaScript ausgeführt. Die Subdomain selbst stand zudem roh in
 * einem doppelt gequoteten JS-String.
 *
 * Ein `<` als \u003c zu schreiben beendet die ganze Fehlerklasse: ohne `<`
 * gibt es kein Tag, egal in welcher Schreibweise. `>` und `&` gehen aus
 * demselben Grund mit. U+2028/U+2029 sind in JSON erlaubt, in JavaScript-Quelltext aber
 * Zeilenumbrüche - unescaped brechen sie den Block syntaktisch auf.
 */
function fuerScriptBlock(wert: unknown): string {
  return JSON.stringify(wert)
    .replace(/</g, "\\u003c")
    .replace(/>/g, "\\u003e")
    .replace(/&/g, "\\u0026")
    .replace(/\u2028/g, "\\u2028")
    .replace(/\u2029/g, "\\u2029");
}

/**
 * Macht aus der ausgelieferten index.html die Hülle einer Restaurant-Seite.
 *
 * ANLASS: Kunden-Subdomains bekommen dieselbe Datei wie www.maitr.de - und die
 * ist die VORGERENDERTE Maitr-Startseite (scripts/prerender.mjs schreibt "/"
 * nach dist/spa/index.html, der SPA-Fallback liefert sie für jeden Pfad aus).
 * Live auf bella12.maitr.de stand darin, auch nach dem Rendern:
 *   - JSON-LD über die Organisation Maitr und den Builder für 39 €,
 *   - <link rel="canonical" href="https://www.maitr.de/"> und og:url - jede
 *     Restaurant-Seite meldete sich damit bei Google als Dublette von maitr.de,
 *   - Maitr-Titel, -Beschreibung, og- und twitter-Tags (Teilen-Vorschauen führen
 *     kein JavaScript aus und zeigten Maitr statt des Restaurants),
 *   - die Maitr-Startseite selbst im #root, samt <noscript>-Google-Abschnitt.
 * Das Restaurant-Schema setzt der Client (client/components/seo/RestaurantJsonLd.tsx).
 *
 * Geschnitten wird nur an Markern, nie am Inhalt: id="maitr-jsonld" am JSON-LD
 * (index.html), data-rh="true" an den Kopf-Tags, die Anker um #root.
 */
const MAITR_JSONLD = /<script\b[^>]*\bid=["']maitr-jsonld["'][^>]*>[\s\S]*?<\/script>\s*/i;
// Dieselben Regeln, mit denen scripts/prerender.mjs die Kopf-Tags pro Route tauscht.
const HELMET_TAG = /<(?:meta|link)\b[^>]*\bdata-rh="true"[^>]*>\s*/g;
const TITEL = /<title\b[^>]*>[\s\S]*?<\/title>\s*/g;
// Dieselben Anker wie pristine() in scripts/prerender.mjs.
const ROOT_OPEN = '<div id="root">';
const ROOT_END = "<!-- Service Worker Registration -->";

function ohneMaitr(html: string): string {
  let out = html
    .replace(MAITR_JSONLD, "")
    .replace(HELMET_TAG, "")
    .replace(TITEL, "")
    .replace(/<noscript>[\s\S]*?<\/noscript>\s*/g, (m) =>
      m.includes("google-profil") ? "" : m,
    );

  const start = out.indexOf(ROOT_OPEN);
  const ende = out.indexOf(ROOT_END);
  if (start !== -1 && ende > start) {
    out =
      out.slice(0, start) +
      `${ROOT_OPEN}\n    <div class="loading-spinner"></div>\n  </div>\n\n  ` +
      out.slice(ende);
  }
  return out;
}

function fuerHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function text(wert: unknown): string {
  return typeof wert === "string" ? wert.trim() : "";
}

/**
 * Titel und Beschreibung des Betriebs, nach derselben Regel wie AppRenderer.tsx
 * (Werte aus dem SEO-Schritt, sonst Name + Slogan) - rohes HTML und gerenderte
 * Seite sagen dasselbe. Die Konfiguration kommt flach (GET /api/sites) oder
 * verschachtelt; beide Formen werden gelesen.
 *
 * Bewusst OHNE Canonical und og:url: Ein fehlender Canonical schadet nicht, ein
 * falscher auf einer Unterseite schon - genau das war der Fehler.
 */
function kopfTagsFuer(config: any): string {
  const publishing = config?.publishing ?? config ?? {};
  const name = text(config?.businessName) || text(config?.business?.name);
  const slogan = text(config?.slogan) || text(config?.business?.slogan);
  const titel =
    text(publishing.metaTitle) || (name ? `${name}${slogan ? ` – ${slogan}` : ""}` : "");
  const beschreibung =
    text(publishing.metaDescription) ||
    text(config?.uniqueDescription) ||
    text(config?.business?.uniqueDescription);

  const tags: string[] = [];
  if (titel) {
    tags.push(
      `<title>${fuerHtml(titel)}</title>`,
      `<meta property="og:title" content="${fuerHtml(titel)}" />`,
    );
  }
  if (beschreibung) {
    tags.push(
      `<meta name="description" content="${fuerHtml(beschreibung)}" />`,
      `<meta property="og:description" content="${fuerHtml(beschreibung)}" />`,
    );
  }
  if (name) tags.push(`<meta property="og:site_name" content="${fuerHtml(name)}" />`);
  if (tags.length) tags.push(`<meta property="og:type" content="website" />`);
  return tags.map((tag) => `  ${tag}\n`).join("");
}

export default async function handler(req: Request, context: Context) {
  const host = req.headers.get("host") ?? "";
  const accept = req.headers.get("accept") ?? "";

  // ── Nur HTML-Requests verarbeiten ────────────────────────────────────────
  if (!accept.includes("text/html")) {
    return context.next();
  }

  // ── Nur Subdomains, nicht die Hauptdomain / Netlify-Previews ─────────────
  if (MAIN_DOMAINS.has(host) || host.endsWith(".netlify.app")) {
    return context.next();
  }

  // ── Subdomain extrahieren ─────────────────────────────────────────────────
  const parts = host.split(".");
  if (parts.length < 2) return context.next();

  const subdomain = parts[0].toLowerCase();
  if (RESERVED_SUBDOMAINS.has(subdomain)) return context.next();

  // ── Config vom Railway-Backend holen ─────────────────────────────────────
  let config: unknown = null;
  try {
    const configRes = await fetch(
      `${RAILWAY_API}/api/sites/${subdomain}`,
      {
        headers: { Accept: "application/json" },
        // Edge Function Timeout: 3s
        signal: AbortSignal.timeout(3_000),
      },
    );

    if (configRes.ok) {
      const data = await configRes.json();
      if (data?.success && data?.data) {
        config = data.data;
      }
    }
  } catch (err) {
    // Config-Fetch gescheitert → ohne Injection weiterfahren
    // Der Client-seitige Fetch in HostAwareRoot.tsx dient als Fallback
    console.error("[Edge] Config fetch failed:", err);
  }

  // ── HTML der SPA laden (index.html vom CDN) ───────────────────────────────
  const response = await context.next();
  const contentType = response.headers.get("content-type") ?? "";

  if (!contentType.includes("text/html")) {
    return response;
  }

  // Auch ohne Config: Scheitert der Fetch, rendert der Client-Fallback in
  // HostAwareRoot.tsx trotzdem das Restaurant – der Maitr-Kopf muss also auf
  // JEDER Subdomain-Antwort weg, nicht nur auf der injizierten.
  const huelle = ohneMaitr(await response.text());

  if (!config) {
    const headers = new Headers(response.headers);
    headers.delete("content-length");
    return new Response(huelle, { status: response.status, headers });
  }

  // ── Config in <head> injizieren ──────────────────────────────────────────
  // Ersetzung als Funktion, nicht als String: In einem Ersatz-String sind `$&`
  // und `$'` Muster - ein Betriebsname "Bar $'" hätte sonst den Rest des
  // Dokuments in den Script-Block kopiert und die Seite zerlegt.
  const injectedHtml = huelle
    .replace(
      "<head>",
      () => `<head>
<script>
  window.__MAITR_CONFIG__=${fuerScriptBlock(config)};
  window.__MAITR_SUBDOMAIN__=${fuerScriptBlock(subdomain)};
</script>`,
    )
    .replace("</head>", () => `${kopfTagsFuer(config)}</head>`);

  // ── Response mit Cache-Headern zurückgeben ───────────────────────────────
  const headers = new Headers(response.headers);
  headers.delete("content-length");
  headers.set("content-type", "text/html; charset=utf-8");
  // CDN cacht 60s, Browser 0 (damit Updates sofort sichtbar sind)
  headers.set("cache-control", "public, s-maxage=60, stale-while-revalidate=300");
  headers.set("x-maitr-edge", "injected");

  return new Response(injectedHtml, {
    status: response.status,
    headers,
  });
}

// Gilt für alle Requests – die Subdomain-Prüfung erfolgt in der Funktion selbst
export const config: Config = {
  path: "/*",
  onError: "bypass",
};
