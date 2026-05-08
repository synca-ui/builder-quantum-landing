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

  // Sicheres JSON-Encoding (verhindert XSS durch </script> in Config-Daten)
  const safeConfig = JSON.stringify(config).replace(
    /<\/script>/gi,
    "<\\/script>",
  );

  const injectedHtml = originalHtml.replace(
    "<head>",
    `<head>
<script>
  window.__MAITR_CONFIG__=${safeConfig};
  window.__MAITR_SUBDOMAIN__="${subdomain}";
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
