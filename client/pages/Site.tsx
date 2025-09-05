import { useEffect, useMemo, useState } from "react";
import { useParams, useLocation, Link } from "react-router-dom";
import { configurationApi, Configuration } from "@/lib/api";
import GalleryGrid from "@/components/sections/GalleryGrid";

// Fallback configuration when API is unavailable
const FALLBACK_CONFIG: Configuration = {
  id: "fallback",
  userId: "anonymous",
  businessName: "JuJu",
  businessType: "cafe",
  location: "",
  slogan: "Bold Flavors, Bright Future",
  uniqueDescription: "",
  template: "modern",
  primaryColor: "#fb923c", // orange-400
  secondaryColor: "#f43f5e", // rose-500
  fontFamily: "sans-serif",
  selectedPages: ["home", "menu", "contact"],
  customPages: [],
  openingHours: {
    Monday: { open: "07:00", close: "22:00", closed: false },
    Tuesday: { open: "07:00", close: "22:00", closed: false },
    Wednesday: { open: "07:00", close: "22:00", closed: false },
  },
  menuItems: [
    { id: "cappuccino", name: "cappuccino", description: "", price: 2.99 },
    { id: "coffee", name: "coffee", description: "", price: 2.99 },
    { id: "cappuccino-2", name: "cappuccino", description: "", price: 2.79 },
    { id: "cappuccino-3", name: "cappuccino", description: "", price: 2.99 },
  ],
  reservationsEnabled: true,
  maxGuests: 10,
  notificationMethod: "email",
  contactMethods: ["Email: hello@example.com"],
  socialMedia: {},
  gallery: [],
  onlineOrdering: false,
  onlineStore: false,
  teamArea: false,
  hasDomain: false,
  domainName: "",
  selectedDomain: "",
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  status: "published",
  publishedUrl: "",
  previewUrl: "",
};

export default function Site() {
  const { subdomain } = useParams();
  const [loading, setLoading] = useState(true);
  const [config, setConfig] = useState<Configuration | null>(null);
  const [useFallback, setUseFallback] = useState(false);

  // Resolve tenant slug from route or hostname
  const resolvedSlug = useMemo(() => {
    if (subdomain) return subdomain;
    try {
      const host = window.location.hostname;
      const parts = host.split(".");
      if (parts.length >= 3) return parts[0];
    } catch {}
    return "";
  }, [subdomain]);

  useEffect(() => {
    let mounted = true;
    (async () => {
      if (!resolvedSlug) {
        setConfig(FALLBACK_CONFIG);
        setUseFallback(true);
        setLoading(false);
        return;
      }
      setLoading(true);
      const res = await configurationApi.getPublishedSite(resolvedSlug);
      if (!mounted) return;
      if (res.success && res.data) {
        setConfig(res.data);
      } else {
        setConfig(FALLBACK_CONFIG);
        setUseFallback(true);
      }
      setLoading(false);
    })();
    return () => {
      mounted = false;
    };
  }, [resolvedSlug]);

  const location = useLocation();
  const segs = location.pathname.split("/").filter(Boolean);
  const activePage = (segs[2] || "home").toLowerCase();

  if (loading || !config) {
    return (
      <div className="min-h-screen flex items-center justify-center text-gray-600">
        Loading...
      </div>
    );
  }

  const businessName = config.businessName || "Your Business";
  const pages = Array.isArray(config.selectedPages) && config.selectedPages.length
    ? config.selectedPages
    : ["home", "menu", "gallery", "about", "contact"];
  const items = Array.isArray(config.menuItems) ? config.menuItems : [];

  const gradient = `linear-gradient(135deg, ${config.primaryColor || "#f97316"} 0%, ${config.secondaryColor || "#fb7185"} 50%, ${config.secondaryColor || "#ec4899"} 100%)`;

  const pageLink = (p: string) => `/site/${segs[1] || resolvedSlug}/${p === "home" ? "" : p}`.replace(/\/$/, "");

  return (
    <div className="min-h-screen" style={{ fontFamily: config.fontFamily || "Inter, system-ui, sans-serif" }}>
      {useFallback && (
        <div className="bg-blue-50 border-b border-blue-200 px-4 py-2 text-center text-sm text-blue-800">
          Preview Mode: showing latest draft
        </div>
      )}

      {/* Top area with gradient for Home, subtle bar for others */}
      {activePage === "home" ? (
        <div className="min-h-screen text-white relative">
          <div className="h-8" />
          <header className="px-4 py-3 flex items-center justify-between relative z-10">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-white/20 backdrop-blur flex items-center justify-center">
                <span className="font-bold text-sm">{businessName.charAt(0) || "B"}</span>
              </div>
              <div className="text-lg font-extrabold">{businessName}</div>
            </div>
            <nav className="hidden sm:flex gap-4 text-sm">
              {pages.filter(p=>p!=='home').map(p => (
                <Link key={p} to={pageLink(p)} className="text-white/90 hover:text-white">
                  {p.charAt(0).toUpperCase()+p.slice(1)}
                </Link>
              ))}
            </nav>
          </header>
          <div className="absolute inset-0 -z-10" style={{ background: gradient }} />

          <section className="px-6 pt-6">
            <div className="mx-auto w-20 h-20 rounded-2xl bg-white/20 backdrop-blur flex items-center justify-center border border-white/40">
              <span className="text-2xl font-black">{businessName.charAt(0) || "B"}</span>
            </div>
            <h1 className="text-center text-xl font-extrabold mt-3">{businessName}</h1>
            <p className="text-center text-sm opacity-95">{config.slogan || "Bold Flavors, Bright Future"}</p>

            <div className="mt-4 grid grid-cols-2 gap-3">
              {(items.length > 0 ? items : FALLBACK_CONFIG.menuItems).slice(0, 4).map((it: any) => (
                <div key={it.id || it.name} className="rounded-2xl border border-white/40 bg-white/25 backdrop-blur-md p-3 shadow-lg">
                  <div className="text-[11px] font-semibold truncate">{String(it.name).toLowerCase()}</div>
                  <div className="text-[11px] font-bold text-pink-100">${Number(it.price).toFixed(2)}</div>
                </div>
              ))}
            </div>
          </section>

          <div className="fixed bottom-4 left-0 right-0 flex justify-center px-4 z-20">
            <Link to={pageLink("reservations") || "#"} className="w-full max-w-md rounded-full bg-black/70 text-white py-3 text-sm font-semibold shadow-2xl backdrop-blur text-center">
              Reserve Table
            </Link>
          </div>
        </div>
      ) : (
        <div className="min-h-screen bg-white">
          <div className="h-24" style={{ background: gradient }} />
          <header className="px-4 py-3 flex items-center justify-between border-b">
            <Link to={pageLink("home")} className="font-extrabold" style={{ color: "#111" }}>
              {businessName}
            </Link>
            <nav className="text-sm text-gray-600 flex gap-4">
              {pages.filter(p=>p!=='home').map(p => (
                <Link key={p} to={pageLink(p)} className={activePage===p?"font-semibold text-gray-900":"hover:text-gray-900"}>
                  {p.charAt(0).toUpperCase()+p.slice(1)}
                </Link>
              ))}
            </nav>
          </header>

          <main className="max-w-md mx-auto px-6 py-8">
            {activePage === "menu" && (
              <section>
                <h2 className="text-lg font-bold mb-3">Menu</h2>
                <div className="grid grid-cols-2 gap-3">
                  {(items.length > 0 ? items : FALLBACK_CONFIG.menuItems).map((it: any) => (
                    <div key={it.id || it.name} className="rounded-xl border p-3">
                      <div className="text-sm font-semibold truncate">{it.name}</div>
                      {typeof it.price !== "undefined" && (
                        <div className="text-xs text-gray-600">${Number(it.price).toFixed(2)}</div>
                      )}
                    </div>
                  ))}
                </div>
              </section>
            )}

            {activePage === "gallery" && (
              <section>
                <h2 className="text-lg font-bold mb-3">Gallery</h2>
                {Array.isArray(config.gallery) && config.gallery.length > 0 ? (
                  <GalleryGrid images={config.gallery as any} />
                ) : (
                  <div className="text-sm text-gray-600">No images yet.</div>
                )}
              </section>
            )}

            {activePage === "about" && (
              <section>
                <h2 className="text-lg font-bold mb-3">About</h2>
                <p className="text-sm text-gray-700">{config.uniqueDescription || ""}</p>
              </section>
            )}

            {activePage === "contact" && (
              <section>
                <h2 className="text-lg font-bold mb-3">Contact</h2>
                {config.location && <p className="text-sm text-gray-700">{config.location}</p>}
                {Array.isArray(config.contactMethods) && config.contactMethods.length > 0 && (
                  <ul className="mt-2 text-sm text-gray-700 space-y-1">
                    {config.contactMethods.map((m: any, i: number) => (
                      <li key={i}>{typeof m === "string" ? m : `${m.type}: ${m.value}`}</li>
                    ))}
                  </ul>
                )}
              </section>
            )}
          </main>
        </div>
      )}
    </div>
  );
}
