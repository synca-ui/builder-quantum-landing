import React, { useState, useEffect, useMemo } from "react";
import Index from "./Index";
import { Loader2 } from "lucide-react";
import AppRenderer from "@/components/dynamic/AppRenderer.tsx";

export default function HostAwareRoot() {
  const [config, setConfig] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  // 1. Identifiziere die Subdomain (Deine bestehende Logik)
  const subdomain = useMemo(() => {
    try {
      const host = window.location.hostname;
      const mainDomains = [
        "maitr.de",
        "www.maitr.de",
        "staging.maitr.de",
        "www.staging.maitr.de",
        "localhost",
        "127.0.0.1",
      ];

      if (mainDomains.includes(host) || host.endsWith(".netlify.app")) {
        return null;
      }

      const parts = host.split('.');
      return parts.length >= 2 ? parts[0] : null;
    } catch {
      return null;
    }
  }, []);

  // 2. DATEN LADEN: Wenn eine Subdomain erkannt wurde, frage die API ab
  useEffect(() => {
    if (!subdomain) {
      setIsLoading(false);
      return;
    }

    const fetchSiteData = async () => {
      try {
        // Wir rufen die API auf, die du vorhin im Backend erstellt hast
        const response = await fetch(`https://www.maitr.de/api/sites/${subdomain}`);
        const result = await response.json();

        if (result.success) {
          // Hier landen jetzt "Bekka", "Wiener Schnitzel" & Co. im State
          setConfig(result.data);
        }
      } catch (err) {
        console.error("Fehler beim Laden der Subdomain-Daten:", err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchSiteData();
  }, [subdomain]);

  // 3. LADE-ZUSTAND: Verhindert das Flackern der "Your Business" Standardseite
  if (isLoading) {
    return (
      <div className="h-screen flex flex-col items-center justify-center bg-white">
        <Loader2 className="w-10 h-10 text-teal-500 animate-spin mb-4" />
        <p className="text-gray-500 font-medium animate-pulse">Lade Restaurant-Profil...</p>
      </div>
    );
  }

  // 4. RENDERING
  // Wenn wir auf bekkas.maitr.de sind und Daten haben -> Zeige Bekka
  if (subdomain && config) {
    return <AppRenderer config={config} />;
  }

  // Ansonsten -> Zeige die Maitr-Hauptseite (Dashboard/Landingpage)
  return <Index />;
}