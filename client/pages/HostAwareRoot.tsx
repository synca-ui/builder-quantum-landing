import React, { useMemo } from "react";
import Index from "./Index";
import Site from "./Site";

export default function HostAwareRoot() {
  const shouldRenderSite = useMemo(() => {
    try {
      const host = window.location.hostname;
      const baseDomain = process.env.VITE_BASE_DOMAIN || "maitr.de";

      // Render Site when on a tenant subdomain like <slug>.maitr.de
      if (host.endsWith(`.${baseDomain}`)) {
        if (host !== baseDomain) return true;
      }
    } catch {}
    return false;
  }, []);

  return shouldRenderSite ? <Site /> : <Index />;
}
