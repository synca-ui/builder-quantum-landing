import React, { useState, useEffect, useMemo, lazy, Suspense } from "react";
import Index from "./Index"; // Deine Landingpage/Dashboard
import { Loader2 } from "lucide-react";

// Lazy Load heavy components that are only needed for specific subdomains
const CheckLanding = lazy(() => import("./CheckLanding"));
const AppRenderer = lazy(() => import("@/components/dynamic/AppRenderer.tsx"));

export default function HostAwareRoot() {
  const [config, setConfig] = useState<any>(null);

  // 1. Subdomain-Logik: Wer sind wir? (z.B. bekkas)
  const subdomain = useMemo(() => {
    try {
      const host = window.location.hostname;
      const mainDomains = [
        "maitr.de",
        "www.maitr.de",
        "localhost",
        "staging.maitr.de",
      ];

      // Wenn wir auf der Hauptseite oder Netlify-Vorschau sind -> Dashboard zeigen
      if (mainDomains.includes(host) || host.endsWith(".netlify.app")) {
        return null;
      }

      const parts = host.split(".");
      return parts.length >= 2 ? parts[0] : null;
    } catch {
      return null;
    }
  }, []);

  // Avoid loading state for main domain to prevent flash
  // Initialize loading to TRUE only if we have a subdomain to fetch data for
  const [loading, setLoading] = useState(!!subdomain);
  useEffect(() => {
    if (!subdomain) {
      setLoading(false);
      return;
    }

    const fetchData = async () => {
      try {
        // Ruft die API auf, die wir im Backend gebaut haben
        const response = await fetch(`/api/sites/${subdomain}`);
        const result = await response.json();

        if (result.success && result.data) {
          // Das ist das JSON, das du mir geschickt hast!
          setConfig(result.data);
        }
      } catch (err) {
        console.error("API-Fehler beim Laden der Subdomain:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [subdomain]);

  // 3. Anzeige-Logik
  if (loading) {
    return (
      <div className="h-screen flex flex-col items-center justify-center bg-white">
        <Loader2 className="w-10 h-10 text-orange-500 animate-spin mb-4" />
        <p className="text-gray-500 font-medium animate-pulse italic">
          Maitr erstellt deine Website...
        </p>
      </div>
    );
  }

  // WENN Subdomain "check" -> Check-Landing Page
  if (subdomain === "check") {
    return (
      <Suspense fallback={<div className="h-screen flex items-center justify-center bg-white"><Loader2 className="w-10 h-10 text-orange-500 animate-spin" /></div>}>
        <CheckLanding />
      </Suspense>
    );
  }

  // WENN Subdomain erkannt UND Daten vorhanden -> Dynamische Website
  if (subdomain && config) {
    return (
      <Suspense fallback={<div className="h-screen flex items-center justify-center bg-white"><Loader2 className="w-10 h-10 text-orange-500 animate-spin" /></div>}>
        <AppRenderer config={config} />
      </Suspense>
    );
  }

  // ANSONSTEN -> Maitr Homepage / Dashboard
  return <Index />;
}
