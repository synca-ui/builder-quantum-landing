import React, { useMemo } from "react";
import Index from "./Index";
import Site from "./Site";

export default function HostAwareRoot() {
  const shouldRenderSite = useMemo(() => {
    try {
      const host = window.location.hostname;

      // List of main domains (not subdomains)
      const mainDomains = [
        "maitr.de",
        "synca.digital",
        "localhost",
        "127.0.0.1",
      ];

      // If it's a main domain or localhost, show Index
      if (mainDomains.includes(host)) {
        return false;
      }

      // If it has dots and doesn't match a main domain, it's a subdomain - show Site
      if (host.includes(".")) {
        return true;
      }
    } catch {}
    return false;
  }, []);

  return shouldRenderSite ? <Site /> : <Index />;
}
