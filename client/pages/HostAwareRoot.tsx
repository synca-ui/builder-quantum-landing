/**
 * HostAwareRoot.tsx
 *
 * Performance-optimierte Version:
 *  ✅ AppRenderer-Bundle und API-Fetch starten PARALLEL (nicht seriell)
 *  ✅ normalizeConfig wird im fetch() aufgerufen, nicht beim Render
 *  ✅ ETag-Support via If-None-Match Header für Cache-Hits (304)
 *  ✅ Kein unnötiger Loading-State auf der Hauptdomain
 */
import React, { useState, useEffect, useMemo, lazy, Suspense } from "react";
import Index from "./Index";
import { Loader2 } from "lucide-react";
import normalizeConfig from "@/lib/normalizeConfig";

// Bundle-Download SOFORT starten (parallel zum fetch, nicht danach)
const appRendererPromise = import("@/components/dynamic/AppRenderer.tsx");
const AppRenderer = lazy(() => appRendererPromise);
const CheckLanding = lazy(() => import("./CheckLanding"));

function detectSubdomain(): string | null {
  try {
    const host = window.location.hostname;
    const mainDomains = [
      "maitr.de",
      "www.maitr.de",
      "localhost",
      "staging.maitr.de",
    ];
    if (mainDomains.includes(host) || host.endsWith(".netlify.app")) {
      return null;
    }
    const parts = host.split(".");
    return parts.length >= 2 ? parts[0] : null;
  } catch {
    return null;
  }
}

// Singleton: Subdomain wird einmal pro Session bestimmt
const SUBDOMAIN = detectSubdomain();

// Config die von der Netlify Edge Function injiziert wurde (window.__MAITR_CONFIG__)
// Falls vorhanden: kein fetch() nötig – sofort rendern
const EDGE_INJECTED_CONFIG =
  typeof window !== "undefined"
    ? (window as any).__MAITR_CONFIG__ ?? null
    : null;

// In-Memory cache für die aktuelle Browser-Session (verhindert Re-Fetch bei
// Navigation zurück zur Startseite)
let sessionCache: { subdomain: string; config: any } | null = null;
let sessionEtag: string | null = null;

export default function HostAwareRoot() {
  const [config, setConfig] = useState<any>(
    // Priorität: 1. Session-Cache  2. Edge-injizierte Config  3. null (fetch nötig)
    sessionCache?.subdomain === SUBDOMAIN
      ? sessionCache.config
      : EDGE_INJECTED_CONFIG,
  );
  const [loading, setLoading] = useState(
    // Kein Loader wenn Config bereits vorhanden (Edge-Injection ODER Session-Cache)
    !!SUBDOMAIN && SUBDOMAIN !== "check" && !sessionCache?.config && !EDGE_INJECTED_CONFIG,
  );

  useEffect(() => {
    if (!SUBDOMAIN || SUBDOMAIN === "check" || config) {
      setLoading(false);
      return;
    }

    // ── Fetch und Bundle-Download laufen PARALLEL ──────────────────────────
    const fetchConfig = fetch(`/api/sites/${SUBDOMAIN}`, {
      headers: {
        // ETag-Support: Server antwortet mit 304 wenn nichts geändert hat
        ...(sessionEtag ? { "If-None-Match": sessionEtag } : {}),
        Accept: "application/json",
      },
    });

    Promise.all([
      fetchConfig,
      appRendererPromise, // bereits gestartet – wartet nur auf Abschluss
    ])
      .then(async ([response]) => {
        // 304 Not Modified: Session-Cache noch gültig
        if (response.status === 304 && sessionCache?.config) {
          setConfig(sessionCache.config);
          return;
        }
        if (!response.ok) return;

        const etag = response.headers.get("ETag");
        if (etag) sessionEtag = etag;

        const result = await response.json();
        if (result.success && result.data) {
          // Normalisieren direkt nach dem Fetch, nicht beim Render
          const normalized = normalizeConfig(result.data);
          sessionCache = { subdomain: SUBDOMAIN, config: normalized };
          setConfig(normalized);
        }
      })
      .catch((err) => {
        console.error("[HostAwareRoot] Fetch-Fehler:", err);
        // Offline-Fallback: Session-Cache verwenden wenn vorhanden
        if (sessionCache?.subdomain === SUBDOMAIN) {
          setConfig(sessionCache.config);
        }
      })
      .finally(() => setLoading(false));
  }, []); // Kein Dependency-Array – läuft einmal

  // Loading State
  if (loading) {
    return (
      <div className="h-screen flex flex-col items-center justify-center bg-white">
        <Loader2 className="w-10 h-10 text-orange-500 animate-spin mb-4" />
        <p className="text-gray-500 font-medium animate-pulse italic">
          Wird geladen...
        </p>
      </div>
    );
  }

  // check.maitr.de → Check-Landing Page
  if (SUBDOMAIN === "check") {
    return (
      <Suspense
        fallback={
          <div className="h-screen flex items-center justify-center bg-white">
            <Loader2 className="w-10 h-10 text-orange-500 animate-spin" />
          </div>
        }
      >
        <CheckLanding />
      </Suspense>
    );
  }

  // Subdomain erkannt + Daten vorhanden → Nutzer-Website
  if (SUBDOMAIN && config) {
    return (
      <Suspense
        fallback={
          <div className="h-screen flex items-center justify-center bg-white">
            <Loader2 className="w-10 h-10 text-orange-500 animate-spin" />
          </div>
        }
      >
        {/* Config ist bereits normalisiert – AppRenderer bekommt direkt Configuration */}
        <AppRenderer config={config} />
      </Suspense>
    );
  }

  // Hauptdomain → Maitr Homepage / Dashboard
  return <Index />;
}
