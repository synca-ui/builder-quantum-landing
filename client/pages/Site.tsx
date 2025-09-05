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

  const [menuOpen, setMenuOpen] = useState(false);
  const [productOpen, setProductOpen] = useState<null | { name: string; price?: number }>(null);
  const [openHoursExpanded, setOpenHoursExpanded] = useState(false);

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

  const LogoDisplay = () => {
    const src = (config as any).logo;
    if (typeof src === "string" && src) {
      return <img src={src} alt="Logo" className="w-6 h-6 object-contain rounded" />;
    }
    return <span className="font-bold text-sm">{businessName.charAt(0) || "B"}</span>;
  };

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
              <div className="w-8 h-8 rounded-xl bg-white/20 backdrop-blur flex items-center justify-center overflow-hidden">
                <LogoDisplay />
              </div>
              <div className="text-lg font-extrabold">{businessName}</div>
            </div>
            <nav className="hidden sm:flex gap-4 text-sm">
              {pages.filter(p=>p!=='home').map(p => (
                <Link key={p} to={pageLink(p)} className="text-white/90 hover:text-white" onClick={()=>setMenuOpen(false)}>
                  {p.charAt(0).toUpperCase()+p.slice(1)}
                </Link>
              ))}
            </nav>
            <button aria-label="Menu" className="sm:hidden w-9 h-9 rounded-xl bg-white/10 flex items-center justify-center" onClick={()=>setMenuOpen(true)}>
              ≡
            </button>
          </header>
          <div className="absolute inset-0 -z-10" style={{ background: gradient }} />

          {menuOpen && (
            <div className="absolute inset-0 z-20">
              <div className="absolute inset-0 bg-black/30" onClick={()=>setMenuOpen(false)} />
              <div className="relative p-6 pt-12" style={{ background: gradient }}>
                <div className="flex justify-end">
                  <button aria-label="Close menu" className="w-9 h-9 rounded-xl bg-white/15 text-white" onClick={()=>setMenuOpen(false)}>×</button>
                </div>
                <div className="mt-4 space-y-3">
                  {pages.map(p => (
                    <Link key={p} to={pageLink(p)} onClick={()=>setMenuOpen(false)} className="block w-full text-left px-4 py-3 text-white/95 font-semibold rounded-xl border border-white/25 bg-white/10">
                      {p.charAt(0).toUpperCase()+p.slice(1)}
                    </Link>
                  ))}
                </div>
              </div>
            </div>
          )}

          <section className="px-6 pt-6">
            <div className="mx-auto w-20 h-20 rounded-2xl bg-white/20 backdrop-blur flex items-center justify-center border border-white/40">
              <span className="text-2xl font-black">{businessName.charAt(0) || "B"}</span>
            </div>
            <h1 className="text-center text-xl font-extrabold mt-3">{businessName}</h1>
            <p className="text-center text-sm opacity-95">{config.slogan || "Bold Flavors, Bright Future"}</p>

            <div className="mt-4 grid grid-cols-2 gap-3">
              {(items.length > 0 ? items : FALLBACK_CONFIG.menuItems).slice(0, 4).map((it: any) => (
                <button key={it.id || it.name} className="text-left rounded-2xl border border-white/40 bg-white/25 backdrop-blur-md p-3 shadow-lg" onClick={()=>setProductOpen({ name: it.name, price: it.price })}>
                  <div className="text-[11px] font-semibold truncate">{String(it.name).toLowerCase()}</div>
                  <div className="text-[11px] font-bold text-pink-100">${Number(it.price).toFixed(2)}</div>
                </button>
              ))}
            </div>
          </section>

          {/* Opening Hours */}
          {config.openingHours && Object.keys(config.openingHours).length > 0 && (
            <section className="px-6 mt-4">
              <div className="rounded-2xl border border-white/30 bg-white/15 backdrop-blur-md p-4 text-white/95">
                <div className="flex items-center justify-between">
                  <div className="text-sm font-semibold">Opening Hours</div>
                  <button className="text-xs underline" onClick={()=>setOpenHoursExpanded(v=>!v)}>
                    {openHoursExpanded ? "Hide" : "Show"}
                  </button>
                </div>
                <div className="mt-2 text-xs space-y-1">
                  {(openHoursExpanded
                    ? Object.entries(config.openingHours)
                    : Object.entries(config.openingHours).slice(0,2)
                  ).map(([day, hours]: any) => (
                    <div key={day} className="flex justify-between">
                      <span className="font-medium">{day}</span>
                      <span>{typeof hours === 'string' ? hours : (hours.closed ? 'Closed' : `${hours.open} - ${hours.close}`)}</span>
                    </div>
                  ))}
                  {!openHoursExpanded && Object.keys(config.openingHours).length > 2 && (
                    <div className="text-xs opacity-80">+{Object.keys(config.openingHours).length - 2} more days</div>
                  )}
                </div>
              </div>
            </section>
          )}

          <div className="fixed bottom-4 left-0 right-0 flex justify-center px-4 z-20">
            <Link to={pageLink("reservations") || "#"} className="w-full max-w-md rounded-full bg-black/70 text-white py-3 text-sm font-semibold shadow-2xl backdrop-blur text-center">
              Reserve Table
            </Link>
          </div>

          {productOpen && (
            <div className="absolute inset-0 z-30 flex items-center justify-center">
              <div className="absolute inset-0 bg-black/50" onClick={()=>setProductOpen(null)} />
              <div className="relative bg-white text-gray-900 rounded-2xl w-[90%] max-w-sm p-5 shadow-2xl">
                <button aria-label="Close" className="absolute top-2 right-2 w-8 h-8 rounded-full hover:bg-gray-100" onClick={()=>setProductOpen(null)}>×</button>
                <div className="text-lg font-bold mb-1">{productOpen.name}</div>
                {typeof productOpen.price !== 'undefined' && (
                  <div className="text-teal-600 font-semibold mb-3">${Number(productOpen.price).toFixed(2)}</div>
                )}
                <button className="w-full rounded-lg bg-teal-600 hover:bg-teal-700 text-white py-2 font-medium" onClick={()=>setProductOpen(null)}>Add to cart</button>
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="min-h-screen text-white relative">
          <div className="absolute inset-0 -z-10" style={{ background: gradient }} />
          <div className="h-8" />
          <header className="px-4 py-3 flex items-center justify-between relative z-10">
            <Link to={pageLink("home")} className="flex items-center gap-2 text-lg font-extrabold text-white">
              <span className="w-8 h-8 rounded-xl bg-white/20 backdrop-blur inline-flex items-center justify-center overflow-hidden"><LogoDisplay /></span>
              {businessName}
            </Link>
            <nav className="hidden sm:flex gap-4 text-sm">
              {pages.filter(p=>p!=='home').map(p => (
                <Link key={p} to={pageLink(p)} className={activePage===p?"text-white font-semibold":"text-white/90 hover:text-white"} onClick={()=>setMenuOpen(false)}>
                  {p.charAt(0).toUpperCase()+p.slice(1)}
                </Link>
              ))}
            </nav>
            <button aria-label="Menu" className="sm:hidden w-9 h-9 rounded-xl bg-white/10 flex items-center justify-center" onClick={()=>setMenuOpen(true)}>
              ≡
            </button>
          </header>

          {menuOpen && (
            <div className="absolute inset-0 z-20">
              <div className="absolute inset-0 bg-black/30" onClick={()=>setMenuOpen(false)} />
              <div className="relative p-6 pt-12" style={{ background: gradient }}>
                <div className="flex justify-end">
                  <button aria-label="Close menu" className="w-9 h-9 rounded-xl bg-white/15 text-white" onClick={()=>setMenuOpen(false)}>×</button>
                </div>
                <div className="mt-4 space-y-3">
                  {pages.map(p => (
                    <Link key={p} to={pageLink(p)} onClick={()=>setMenuOpen(false)} className="block w-full text-left px-4 py-3 text-white/95 font-semibold rounded-xl border border-white/25 bg-white/10">
                      {p.charAt(0).toUpperCase()+p.slice(1)}
                    </Link>
                  ))}
                </div>
              </div>
            </div>
          )}

          <main className="max-w-md mx-auto px-6 py-8">
            {activePage === "menu" && (
              <section>
                <h2 className="text-lg font-bold mb-3">Menu</h2>
                <div className="grid grid-cols-2 gap-3">
                  {(items.length > 0 ? items : FALLBACK_CONFIG.menuItems).map((it: any) => (
                    <div key={it.id || it.name} className="rounded-2xl border border-white/40 bg-white/15 backdrop-blur-md p-3 shadow-lg">
                      <div className="text-sm font-semibold truncate text-white">{it.name}</div>
                      {typeof it.price !== "undefined" && (
                        <div className="text-xs text-pink-100">${Number(it.price).toFixed(2)}</div>
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
                  <div className="grid grid-cols-2 gap-3">
                    {[1,2,3,4].map(i => (
                      <div key={i} className="aspect-[4/3] rounded-2xl border border-white/35 bg-white/10 backdrop-blur-md" />
                    ))}
                  </div>
                )}
              </section>
            )}

            {activePage === "about" && (
              <section>
                <h2 className="text-lg font-bold mb-3">About</h2>
                <div className="rounded-2xl border border-white/35 bg-white/10 backdrop-blur-md p-4 text-white/95">
                  <p className="text-sm">{config.uniqueDescription || ""}</p>
                </div>
              </section>
            )}

            {activePage === "contact" && (
              <section>
                <h2 className="text-lg font-bold mb-3">Contact</h2>
                <div className="rounded-2xl border border-white/35 bg-white/10 backdrop-blur-md p-4 text-white/95">
                  {config.location && <p className="text-sm mb-2">{config.location}</p>}
                  {Array.isArray(config.contactMethods) && config.contactMethods.length > 0 && (
                    <ul className="mt-2 text-sm space-y-1">
                      {config.contactMethods.map((m: any, i: number) => (
                        <li key={i}>{typeof m === "string" ? m : `${m.type}: ${m.value}`}</li>
                      ))}
                    </ul>
                  )}
                  {config.openingHours && Object.keys(config.openingHours).length > 0 && (
                    <div className="mt-4">
                      <div className="text-sm font-semibold mb-1">Opening Hours</div>
                      <ul className="text-xs space-y-1">
                        {Object.entries(config.openingHours).map(([day, hours]: any) => (
                          <li key={day} className="flex justify-between">
                            <span className="font-medium">{day}</span>
                            <span>{typeof hours === 'string' ? hours : (hours.closed ? 'Closed' : `${hours.open} - ${hours.close}`)}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              </section>
            )}
          </main>
        </div>
      )}
    </div>
  );
}
