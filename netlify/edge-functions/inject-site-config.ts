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

  if (!config) {
    return context.next();
  }

  // ── HTML der SPA laden (index.html vom CDN) ───────────────────────────────
  const response = await context.next();
  const contentType = response.headers.get("content-type") ?? "";

  if (!contentType.includes("text/html")) {
    return response;
  }

  // ── Config in <head> injizieren ──────────────────────────────────────────
  const originalHtml = await response.text();

  const injectedHtml = originalHtml.replace(
    "<head>",
    `<head>
<script>
  window.__MAITR_CONFIG__=${fuerScriptBlock(config)};
  window.__MAITR_SUBDOMAIN__=${fuerScriptBlock(subdomain)};
</script>`,
  );

  // ── Response mit Cache-Headern zurückgeben ───────────────────────────────
  const headers = new Headers(response.headers);
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
