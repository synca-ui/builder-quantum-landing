import React, { useMemo } from "react";
import Index from "./Index";
import Site from "./Site";

export default function HostAwareRoot() {
  const shouldRenderSite = useMemo(() => {
    try {
      const host = window.location.hostname;

      // 1. Liste deiner Haupt-Domains (Dashboard)
      const mainDomains = [
        "maitr.de",
        "www.maitr.de", // WICHTIG: Auch mit www
        "staging.maitr.de",
        "www.staging.maitr.de",// Sicherheitshalber auch hier mit www
        "localhost",
        "127.0.0.1",
      ];

      // 2. CHECK: Ist es eine deiner Haupt-Domains?
      if (mainDomains.includes(host)) {
        return false; // Zeige Dashboard / Landing Page
      }

      // 3. CHECK: Ist es eine Netlify Vorschau- oder System-URL?
      // Das erkennt "starlit-madeleine...netlify.app" korrekt als System-Seite
      if (host.endsWith(".netlify.app")) {
        return false; // Zeige Dashboard / Landing Page
      }

      // 4. Fallback: Hat die Domain Punkte? Dann ist es eine Kunden-Subdomain
      // (z.B. kunde.maitr.de -> Zeige JuJu/User-Site)
      if (host.includes(".")) {
        return true;
      }
    } catch {}

    return false;
  }, []);

  return shouldRenderSite ? <Site /> : <Index />;
}
