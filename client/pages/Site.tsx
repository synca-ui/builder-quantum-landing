import { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import { configurationApi } from "@/lib/api";
import { Button } from "@/components/ui/button";
import GalleryGrid from "@/components/sections/GalleryGrid";
import MenuSection from "@/components/sections/MenuSection";

interface SiteConfig {
  businessName: string;
  slogan?: string;
  template: string;
  primaryColor: string;
  secondaryColor: string;
  fontFamily: string;
  menuItems?: any[];
  gallery?: any[];
  contactMethods?: string[];
  socialMedia?: Record<string, string>;
}

export default function Site() {
  const { subdomain } = useParams();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [config, setConfig] = useState<SiteConfig | null>(null);

  // Resolve tenant slug from route or hostname
  const resolvedSlug = useMemo(() => {
    if (subdomain) return subdomain;
    try {
      const host = window.location.hostname;
      // expect something like tenant.synca.digital
      const parts = host.split(".");
      // If host has at least 3 parts and ends with synca.digital (or current base domain), use first part
      if (parts.length >= 3) {
        return parts[0];
      }
    } catch {}
    return "";
  }, [subdomain]);

  useEffect(() => {
    let mounted = true;
    async function load() {
      if (!resolvedSlug) return;
      setLoading(true);
      const res = await configurationApi.getPublishedSite(resolvedSlug);
      if (!mounted) return;
      if (res.success && res.data) {
        setConfig(res.data as any);
        setError(null);
      } else {
        setError(res.error || "Failed to load site");
      }
      setLoading(false);
    }
    load();
    return () => {
      mounted = false;
    };
  }, [resolvedSlug]);

  const theme = useMemo(
    () =>
      ({
        "--primary": config?.primaryColor || "#111827",
        "--secondary": config?.secondaryColor || "#6B7280",
        fontFamily: config?.fontFamily || "Inter, system-ui, sans-serif",
      }) as React.CSSProperties,
    [config],
  );

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center text-gray-600">
        Loading...
      </div>
    );
  }

  if (error || !config) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center text-center p-6">
        <h1 className="text-2xl font-bold mb-2">Site unavailable</h1>
        <p className="text-gray-600 mb-4">
          {error || "We could not find this published site."}
        </p>
        <Button onClick={() => (window.location.href = "/")}>Go home</Button>
      </div>
    );
  }

  return (
    <div style={theme} className="min-h-screen bg-white text-gray-900">
      <header className="sticky top-0 z-40 bg-white/80 backdrop-blur border-b">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
          <div
            className="font-black text-xl"
            style={{ color: "var(--primary)" }}
          >
            {config.businessName}
          </div>
          <nav className="text-sm text-gray-600">
            <a href="#menu" className="mr-4 hover:text-black">
              Menu
            </a>
            <a href="#gallery" className="hover:text-black">
              Gallery
            </a>
          </nav>
        </div>
      </header>

      <main>
        <section className="py-16 bg-gradient-to-br from-gray-50 to-white">
          <div className="max-w-6xl mx-auto px-4">
            <h1
              className="text-4xl md:text-5xl font-extrabold mb-4"
              style={{ color: "var(--primary)" }}
            >
              {config.businessName}
            </h1>
            {config.slogan && (
              <p className="text-lg text-gray-600 max-w-2xl">{config.slogan}</p>
            )}
          </div>
        </section>

        {Array.isArray(config.menuItems) && config.menuItems.length > 0 && (
          <section id="menu" className="py-14 border-t">
            <div className="max-w-6xl mx-auto px-4">
              <h2 className="text-2xl font-bold mb-6">Menu</h2>
              <MenuSection items={config.menuItems as any} />
            </div>
          </section>
        )}

        {Array.isArray(config.gallery) && config.gallery.length > 0 && (
          <section id="gallery" className="py-14 border-t">
            <div className="max-w-6xl mx-auto px-4">
              <h2 className="text-2xl font-bold mb-6">Gallery</h2>
              <GalleryGrid images={config.gallery as any} />
            </div>
          </section>
        )}
      </main>

      <footer className="py-10 border-t mt-10 text-center text-sm text-gray-500">
        © {new Date().getFullYear()} {config.businessName}
      </footer>
    </div>
  );
}
