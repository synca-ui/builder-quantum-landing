import { useState, useEffect, useMemo } from "react";
import { useParams, Link, useLocation } from "react-router-dom";
import {
  Menu,
  X,
  Palette,
  MapPin,
  Phone,
  Mail,
  Clock,
  Camera,
  Instagram,
  Facebook,
  Coffee,
  ShoppingBag,
  Utensils,
  Building,
  Plus,
  Check,
  Star,
  Heart,
  Settings,
} from "lucide-react";
import { motion } from "framer-motion";
import GalleryGrid from "@/components/sections/GalleryGrid";
import { configurationApi, type Configuration } from "@/lib/api";

// Re-using the same data structures from the configurator for consistency
const fontOptions = [
    { id: "sans-serif", class: "font-sans" },
    { id: "serif", class: "font-serif" },
    { id: "display", class: "font-mono" },
];

const templates = [
    { id: "minimalist", style: { background: "#FFFFFF", accent: "#000000", text: "#1A1A1A", secondary: "#F8F9FA" } },
    { id: "modern", style: { background: "linear-gradient(135deg, #38bdf8 0%, #2563eb 50%, #1e40af 100%)", accent: "#2563EB", text: "#FFFFFF", secondary: "#1D4ED8" } },
    { id: "stylish", style: { background: "#111827", accent: "#059669", text: "#F9FAFB", secondary: "#1F2937" } },
    { id: "cozy", style: { background: "#FFFBF0", accent: "#EA580C", text: "#1F2937", secondary: "#FEF3C7" } },
];

const FALLBACK_CONFIG: Configuration = {
  id: "fallback",
  userId: "anonymous",
  businessName: "JuJu",
  businessType: "cafe",
  location: "123 Main Street, Anytown",
  slogan: "Bold Flavors, Bright Future",
  uniqueDescription: "The best place in town for coffee and community.",
  template: "modern",
  primaryColor: "#fb923c",
  secondaryColor: "#f43f5e",
  fontFamily: "sans-serif",
  selectedPages: ["home", "menu", "contact", "gallery", "about"],
  openingHours: {
    Monday: { open: "07:00", close: "22:00", closed: false },
    Tuesday: { open: "07:00", close: "22:00", closed: false },
    Wednesday: { open: "07:00", close: "22:00", closed: false },
    Thursday: { open: "07:00", close: "22:00", closed: false },
    Friday: { open: "07:00", close: "22:00", closed: false },
    Saturday: { open: "09:00", close: "23:00", closed: false },
    Sunday: { open: "09:00", close: "20:00", closed: true },
  },
  menuItems: [
    { id: "cappuccino", name: "Cappuccino", description: "Rich espresso with steamed milk foam", price: 3.50 },
    { id: "coffee", name: "Drip Coffee", description: "Our signature house blend", price: 2.75 },
    { id: "latte", name: "Latte", description: "Espresso with steamed milk", price: 4.00 },
    { id: "croissant", name: "Croissant", description: "Buttery and flaky, baked fresh", price: 2.50 },
  ],
  gallery: [
      { url: "/placeholder.svg", alt: "A cozy coffee shop interior" },
      { url: "/placeholder.svg", alt: "A cup of latte with art" },
      { url: "/placeholder.svg", alt: "A delicious looking pastry" },
      { url: "/placeholder.svg", alt: "Friendly staff smiling" },
  ],
  contactMethods: ["Email: contact@juju.cafe", "Phone: (555) 123-4567"],
  reservationsEnabled: true,
};

// This is the main component that renders the site, now unified with the preview logic.
function SiteRenderer({ config: formData }: { config: Configuration }) {
    const location = useLocation();
    const segs = location.pathname.split("/").filter(Boolean);
    const activePage = (segs.length > 2 ? segs[segs.length - 1] : "home").toLowerCase();

    const [menuOpen, setMenuOpen] = useState(false);
    const [productOpen, setProductOpen] = useState<any | null>(null);
    const [openHoursExpanded, setOpenHoursExpanded] = useState(false);

    const getBusinessName = () => formData.businessName || "Your Business";
    const selectedIdForSwitch = formData.template || 'modern';
    const selectedTemplateDef = templates.find((t) => t.id === selectedIdForSwitch) || templates[1];
    const baseTemplateStyle = selectedTemplateDef.style;

    const styles = {
      ...baseTemplateStyle,
      userPrimary: formData.primaryColor || baseTemplateStyle.accent,
      userSecondary: formData.secondaryColor || baseTemplateStyle.secondary,
      userFontColor: formData.fontColor || baseTemplateStyle.text,
      userBackground: formData.backgroundColor || baseTemplateStyle.background,
    };

    const fontClass = fontOptions.find((f) => f.id === formData.fontFamily)?.class || "font-sans";
    const menuPages = useMemo(() => Array.from(new Set<string>(["home", ...(formData.selectedPages || [])])), [formData.selectedPages]);
    const pageLink = (p: string) => `/site/${segs[1] || ''}/${p === "home" ? "" : p}`.replace(/\/$/, "");

    const getBusinessIcon = () => {
      switch (formData.businessType) {
        case "cafe": return <Coffee className="w-4 h-4" />;
        case "restaurant": return <Utensils className="w-4 h-4" />;
        case "bar": return <Star className="w-4 h-4" />;
        default: return <Building className="w-4 h-4" />;
      }
    };

    const LogoDisplay = () => {
        const { logo } = formData;
        if (logo && typeof logo === 'string') {
            return <img src={logo} alt="Business logo" className="w-full h-full object-contain" />;
        }
        return getBusinessIcon();
    };

    const renderPageContent = () => {
        const items = formData.menuItems || [];
        const gallery = formData.gallery || [];

        switch (activePage) {
            case "home":
                return (
                    <section className="px-6 pt-6">
                        <div className="mx-auto w-20 h-20 rounded-2xl bg-white/20 backdrop-blur flex items-center justify-center border border-white/40 overflow-hidden">
                            <LogoDisplay />
                        </div>
                        <h1 className="text-center text-xl font-extrabold mt-3">{getBusinessName()}</h1>
                        <p className="text-center text-sm opacity-95">{formData.slogan || ""}</p>
                        <div className="mt-4 grid grid-cols-2 gap-3">
                            {items.slice(0, 4).map((it: any) => (
                                <button key={it.id || it.name} className="text-left rounded-2xl border border-white/40 bg-white/25 backdrop-blur-md p-3 shadow-lg" onClick={() => setProductOpen(it)}>
                                    <div className="text-[11px] font-semibold truncate">{it.name}</div>
                                    <div className="text-[11px] font-bold text-pink-100">${Number(it.price).toFixed(2)}</div>
                                </button>
                            ))}
                        </div>
                        {formData.openingHours && Object.keys(formData.openingHours).length > 0 && (
                            <div className="mt-4 rounded-2xl border border-white/30 bg-white/15 backdrop-blur-md p-4 text-white/95">
                                <div className="flex items-center justify-between">
                                    <div className="text-sm font-semibold">Opening Hours</div>
                                    <button className="text-xs underline" onClick={() => setOpenHoursExpanded(v => !v)}>{openHoursExpanded ? "Hide" : "Show"}</button>
                                </div>
                                <div className="mt-2 text-xs space-y-1">
                                    {(openHoursExpanded ? Object.entries(formData.openingHours) : Object.entries(formData.openingHours).slice(0, 2)).map(([day, hours]: any) => (
                                        <div key={day} className="flex justify-between">
                                            <span className="font-medium">{day}</span>
                                            <span>{hours.closed ? 'Closed' : `${hours.open} - ${hours.close}`}</span>
                                        </div>
                                    ))}
                                    {!openHoursExpanded && Object.keys(formData.openingHours).length > 2 && (
                                        <div className="text-xs opacity-80">+{Object.keys(formData.openingHours).length - 2} more days</div>
                                    )}
                                </div>
                            </div>
                        )}
                    </section>
                );
            case "menu":
                return (
                    <section className="max-w-md mx-auto px-6 py-8">
                        <h2 className="text-lg font-bold mb-3 text-white">Menu</h2>
                        <div className="grid grid-cols-2 gap-3">
                            {items.map((it: any) => (
                                <div key={it.id || it.name} className="rounded-2xl border border-white/40 bg-white/15 backdrop-blur-md p-3 shadow-lg">
                                    <div className="text-sm font-semibold truncate text-white">{it.name}</div>
                                    {typeof it.price !== "undefined" && <div className="text-xs text-pink-100">${Number(it.price).toFixed(2)}</div>}
                                </div>
                            ))}
                        </div>
                    </section>
                );
            case "gallery":
                return (
                    <section className="max-w-md mx-auto px-6 py-8">
                        <h2 className="text-lg font-bold mb-3 text-white">Gallery</h2>
                        <GalleryGrid images={gallery as any} />
                    </section>
                );
            case "about":
                return (
                    <section className="max-w-md mx-auto px-6 py-8">
                        <h2 className="text-lg font-bold mb-3 text-white">About Us</h2>
                        <div className="rounded-2xl border border-white/35 bg-white/10 backdrop-blur-md p-4 text-white/95">
                            <p className="text-sm">{formData.uniqueDescription || ""}</p>
                        </div>
                    </section>
                );
            case "contact":
                return (
                    <section className="max-w-md mx-auto px-6 py-8">
                        <h2 className="text-lg font-bold mb-3 text-white">Contact</h2>
                        <div className="rounded-2xl border border-white/35 bg-white/10 backdrop-blur-md p-4 text-white/95">
                            {formData.location && <p className="text-sm mb-2">{formData.location}</p>}
                            {Array.isArray(formData.contactMethods) && formData.contactMethods.length > 0 && (
                                <ul className="mt-2 text-sm space-y-1">
                                    {formData.contactMethods.map((m: any, i: number) => <li key={i}>{typeof m === "string" ? m : `${m.type}: ${m.value}`}</li>)}
                                </ul>
                            )}
                        </div>
                    </section>
                );
            default: return <div className="p-8 text-white">Page not found.</div>;
        }
    };

    return (
        <div className={`min-h-screen text-white relative ${fontClass}`} style={{ background: styles.userBackground }}>
            <div className="h-8" />
            <header className="px-4 py-3 flex items-center justify-between relative z-10">
                <Link to={pageLink("home")} className="flex items-center gap-2 text-lg font-extrabold text-white">
                    <span className="w-8 h-8 rounded-xl bg-white/20 backdrop-blur inline-flex items-center justify-center overflow-hidden"><LogoDisplay /></span>
                    {getBusinessName()}
                </Link>
                <button aria-label="Menu" className="sm:hidden w-9 h-9 rounded-xl bg-white/10 flex items-center justify-center" onClick={() => setMenuOpen(true)}>≡</button>
                <nav className="hidden sm:flex gap-4 text-sm">
                    {menuPages.filter(p => p !== 'home').map(p => (
                        <Link key={p} to={pageLink(p)} className={activePage === p ? "text-white font-semibold" : "text-white/90 hover:text-white"}>
                            {p.charAt(0).toUpperCase() + p.slice(1)}
                        </Link>
                    ))}
                </nav>
            </header>

            {menuOpen && (
                <div className="absolute inset-0 z-20">
                    <div className="absolute inset-0 bg-black/30" onClick={() => setMenuOpen(false)} />
                    <div className="relative p-6 pt-12 bg-gray-800/90 backdrop-blur-xl">
                        <div className="flex justify-end">
                            <button aria-label="Close menu" className="w-9 h-9 rounded-xl bg-white/15 text-white" onClick={() => setMenuOpen(false)}>×</button>
                        </div>
                        <div className="mt-4 space-y-3">
                            {menuPages.map(p => (
                                <Link key={p} to={pageLink(p)} onClick={() => setMenuOpen(false)} className="block w-full text-left px-4 py-3 text-white/95 font-semibold rounded-xl border border-white/25 bg-white/10">
                                    {p.charAt(0).toUpperCase() + p.slice(1)}
                                </Link>
                            ))}
                        </div>
                    </div>
                </div>
            )}

            {renderPageContent()}

            {productOpen && (
                <div className="absolute inset-0 z-30 flex items-center justify-center">
                    <div className="absolute inset-0 bg-black/50" onClick={() => setProductOpen(null)} />
                    <div className="relative bg-white text-gray-900 rounded-2xl w-[90%] max-w-sm p-5 shadow-2xl">
                        <button aria-label="Close" className="absolute top-2 right-2 w-8 h-8 rounded-full hover:bg-gray-100" onClick={() => setProductOpen(null)}>×</button>
                        <div className="text-lg font-bold mb-1">{productOpen.name}</div>
                        {typeof productOpen.price !== 'undefined' && <div className="text-teal-600 font-semibold mb-3">${Number(productOpen.price).toFixed(2)}</div>}
                        <button className="w-full rounded-lg bg-teal-600 hover:bg-teal-700 text-white py-2 font-medium" onClick={() => setProductOpen(null)}>Add to cart</button>
                    </div>
                </div>
            )}

            {activePage === 'home' && formData.reservationsEnabled && (
                <div className="fixed bottom-4 left-0 right-0 flex justify-center px-4 z-20">
                    <button className="w-full max-w-md rounded-full bg-black/70 text-white py-3 text-sm font-semibold shadow-2xl backdrop-blur">
                        Reserve Table
                    </button>
                </div>
            )}
        </div>
    );
}


export default function Site() {
    const { subdomain } = useParams();
    const [loading, setLoading] = useState(true);
    const [config, setConfig] = useState<Configuration | null>(null);

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
            }
            setLoading(false);
        })();
        return () => { mounted = false; };
    }, [resolvedSlug]);

    if (loading || !config) {
        return (
            <div className="h-full flex items-center justify-center bg-gray-50">
                <div className="text-center">
                    <Palette className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                    <p className="text-xs text-gray-500">Loading Site...</p>
                </div>
            </div>
        );
    }
    
    return <SiteRenderer config={config} />;
}
