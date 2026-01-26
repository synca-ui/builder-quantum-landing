import React, { useState, useEffect, useMemo } from "react";
import Index from "./Index";
import { Loader2 } from "lucide-react";
import AppRenderer from "@/components/dynamic/AppRenderer.tsx";

export default function HostAwareRoot() {
  const [config, setConfig] = useState(null);
  const [loading, setLoading] = useState(true);

  // 1. Subdomain aus der URL extrahieren
  const subdomain = useMemo(() => {
    const host = window.location.hostname;
    // Liste der Hauptdomains, auf denen wir das Dashboard zeigen
    const mainDomains = ["maitr.de", "www.maitr.de", "localhost", "staging.maitr.de"];

    if (mainDomains.includes(host) || host.endsWith(".netlify.app")) {
      return null;
    }

    const parts = host.split('.');
    return parts.length >= 2 ? parts[0] : null;
  }, []);

  // 2. Daten von der API laden
  useEffect(() => {
    if (!subdomain) {
      setLoading(false);
      return;
    }

    // Wir rufen deine API auf, die uns gerade das JSON geliefert hat
    fetch(`/api/sites/${subdomain}`)
      .then((res) => res.json())
      .then((result) => {
        if (result.success && result.data) {
          // Hier setzen wir die "Bekka"-Daten in den State
          setConfig(result.data);
        }
        setLoading(false);
      })
      .catch((err) => {
        console.error("Fehler beim Abruf der Website-Daten:", err);
        setLoading(false);
      });
  }, [subdomain]);

  // 3. Anzeige-Logik
  if (loading) {
    return (
      <div className="h-screen flex flex-col items-center justify-center bg-white">
        <Loader2 className="w-10 h-10 text-orange-500 animate-spin mb-4" />
        <p className="text-gray-500 animate-pulse">Lade dein Restaurant...</p>
      </div>
    );
  }

  // Wenn wir auf bekkas.maitr.de sind und die API-Daten haben
  if (subdomain && config) {
    return <AppRenderer config={config} />;
  }

  // Ansonsten (Hauptseite oder Fehler) -> Maitr Landingpage
  return <Index />;
}