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

  const pages = (config as any).selectedPages || ["home", "menu", "gallery", "contact"];
  const uniqueDescription = (config as any).uniqueDescription as string | undefined;
  const location = (config as any).location as string | undefined;
  const openingHours = (config as any).openingHours as Record<string, any> | undefined;
  const reservationsEnabled = !!(config as any).reservationsEnabled;
  const contactMethods = (config as any).contactMethods as string[] | undefined;
  const social = (config as any).socialMedia as Record<string, string> | undefined;

  return (
    <div style={theme} className="min-h-screen bg-white text-gray-900">
      <header className="sticky top-0 z-40 bg-white/80 backdrop-blur border-b">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="font-black text-xl" style={{ color: "var(--primary)" }}>
            {config.businessName || "Your Business"}
          </div>
          <nav className="text-sm text-gray-600 flex gap-4">
            {pages.includes("menu") && (
              <a href="#menu" className="hover:text-black">Menu</a>
            )}
            {pages.includes("gallery") && (
              <a href="#gallery" className="hover:text-black">Gallery</a>
            )}
            {pages.includes("about") && (
              <a href="#about" className="hover:text-black">About</a>
            )}
            {pages.includes("contact") && (
              <a href="#contact" className="hover:text-black">Contact</a>
            )}
          </nav>
        </div>
      </header>

      <main>
        {pages.includes("home") && (
          <section className="py-16 bg-gradient-to-br from-gray-50 to-white">
            <div className="max-w-6xl mx-auto px-4">
              <h1 className="text-4xl md:text-5xl font-extrabold mb-4" style={{ color: "var(--primary)" }}>
                {config.businessName || "Your Business"}
              </h1>
              {config.slogan && (
                <p className="text-lg text-gray-600 max-w-2xl">{config.slogan}</p>
              )}
              {reservationsEnabled && (
                <div className="mt-6">
                  <Button onClick={() => alert("Reservation flow coming soon")}>Reserve a table</Button>
                </div>
              )}
            </div>
          </section>
        )}

        {pages.includes("about") && uniqueDescription && (
          <section id="about" className="py-14 border-t">
            <div className="max-w-6xl mx-auto px-4">
              <h2 className="text-2xl font-bold mb-4">About</h2>
              <p className="text-gray-700 leading-relaxed max-w-3xl">{uniqueDescription}</p>
            </div>
          </section>
        )}

        {pages.includes("menu") && Array.isArray(config.menuItems) && config.menuItems.length > 0 && (
          <section id="menu" className="py-14 border-t">
            <div className="max-w-6xl mx-auto px-4">
              <h2 className="text-2xl font-bold mb-6">Menu</h2>
              <MenuSection items={config.menuItems as any} />
            </div>
          </section>
        )}

        {pages.includes("gallery") && Array.isArray(config.gallery) && config.gallery.length > 0 && (
          <section id="gallery" className="py-14 border-t">
            <div className="max-w-6xl mx-auto px-4">
              <h2 className="text-2xl font-bold mb-6">Gallery</h2>
              <GalleryGrid images={config.gallery as any} />
            </div>
          </section>
        )}

        {pages.includes("contact") && (
          <section id="contact" className="py-14 border-t">
            <div className="max-w-6xl mx-auto px-4 grid md:grid-cols-2 gap-8">
              <div>
                <h2 className="text-2xl font-bold mb-4">Contact</h2>
                {location && <p className="text-gray-700 mb-2">{location}</p>}
                {Array.isArray(contactMethods) && contactMethods.length > 0 && (
                  <ul className="text-gray-700 space-y-1">
                    {contactMethods.map((m, i) => (
                      <li key={i}>{m}</li>
                    ))}
                  </ul>
                )}
                {social && Object.keys(social).length > 0 && (
                  <div className="mt-3 flex gap-3 text-sm text-gray-600">
                    {Object.entries(social).map(([k, v]) => (
                      <a key={k} href={v} target="_blank" rel="noreferrer" className="underline">
                        {k}
                      </a>
                    ))}
                  </div>
                )}
              </div>
              {openingHours && Object.keys(openingHours).length > 0 && (
                <div>
                  <h2 className="text-2xl font-bold mb-4">Opening Hours</h2>
                  <ul className="text-gray-700 space-y-1">
                    {Object.entries(openingHours).map(([day, val]: any) => (
                      <li key={day} className="flex justify-between max-w-sm">
                        <span className="font-medium capitalize">{day}</span>
                        <span className="text-gray-600">{typeof val === 'string' ? val : (val?.open && val?.close ? `${val.open} – ${val.close}` : 'closed')}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </section>
        )}
      </main>

      <footer className="py-10 border-t mt-10 text-center text-sm text-gray-500">
        © {new Date().getFullYear()} {config.businessName || "Your Business"}
      </footer>
    </div>
  );
}
