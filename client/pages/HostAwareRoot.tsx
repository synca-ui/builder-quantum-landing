import React, { useMemo } from "react";
import Index from "./Index";
import Site from "./Site";

export default function HostAwareRoot() {
  const shouldRenderSite = useMemo(() => {
    try {
      const host = window.location.hostname;
      // Render Site when on a tenant subdomain like <slug>.synca.digital
      if (host.endsWith(".synca.digital")) {
        const base = "synca.digital";
        if (host !== base) return true;
      }
    } catch {}
    return false;
  }, []);

  return shouldRenderSite ? <Site /> : <Index />;
}
