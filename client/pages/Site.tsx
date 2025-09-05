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
    {
      id: "minimalist",
      name: "Minimalist",
      description:
        "Clean, simple design focusing on content with perfect readability",
      preview: "bg-gradient-to-br from-white to-gray-100",
      businessTypes: ["cafe", "restaurant", "bar"],
      style: {
        background: "#FFFFFF",
        accent: "#000000",
        text: "#1A1A1A",
        secondary: "#F8F9FA",
        layout: "minimal-grid",
        navigation: "borderless-clean",
        typography: "minimal-sans",
      },
      features: ["Ultra Clean", "Fast Loading", "Content Focus"],
      mockup: {
        nav: {
          bg: "bg-white",
          text: "text-black",
          border: "border-transparent",
        },
        hero: { bg: "bg-white", text: "text-black" },
        cards: {
          bg: "bg-gray-50",
          border: "border-gray-100",
          text: "text-gray-800",
        },
      },
    },
    {
      id: "modern",
      name: "Modern",
      description: "Contemporary design with bold colors and sleek animations",
      preview: "bg-gradient-to-br from-sky-400 via-blue-500 to-indigo-600",
      businessTypes: ["cafe", "restaurant", "bar"],
      style: {
        background:
          "linear-gradient(135deg, #38bdf8 0%, #2563eb 50%, #1e40af 100%)",
        accent: "#2563EB",
        text: "#FFFFFF",
        secondary: "#1D4ED8",
        layout: "modern-cards",
        navigation: "glassmorphism",
        typography: "modern-geometric",
      },
      features: ["Vibrant Colors", "Glass Effects", "Rectangular Layout"],
      mockup: {
        nav: {
          bg: "bg-white/10 backdrop-blur-md",
          text: "text-white",
          border: "border-white/20",
        },
        hero: {
          bg: "bg-gradient-to-r from-sky-400 via-blue-500 to-indigo-600",
          text: "text-white",
        },
        cards: {
          bg: "bg-white/15 backdrop-blur-sm",
          border: "border-white/30",
          text: "text-white",
        },
      },
    },
    {
      id: "stylish",
      name: "Stylish",
      description:
        "Visual-first design with overlays, mixed sections, and motion",
      preview: "bg-gradient-to-br from-emerald-50 to-slate-800",
      businessTypes: ["cafe", "restaurant", "bar"],
      style: {
        background: "#111827",
        accent: "#059669",
        text: "#F9FAFB",
        secondary: "#1F2937",
        layout: "visual-overlap",
        navigation: "contrast",
        typography: "decorative-serif",
      },
      features: ["Soft Colors", "Great Spacing", "Easy Reading"],
      mockup: {
        nav: {
          bg: "bg-slate-900/80 backdrop-blur",
          text: "text-white",
          border: "border-emerald-300/20",
        },
        hero: {
          bg: "bg-gradient-to-r from-emerald-500/20 to-transparent",
          text: "text-white",
        },
        cards: {
          bg: "bg-white/5 backdrop-blur",
          border: "border-white/10",
          text: "text-slate-100",
        },
      },
    },
    {
      id: "cozy",
      name: "Cozy",
      description:
        "Warm, personal, and grounded aesthetic with authentic photography.",
      preview: "bg-gradient-to-br from-amber-100 via-orange-50 to-rose-50",
      businessTypes: ["cafe", "restaurant", "bar"],
      style: {
        background: "#FFFBF0",
        accent: "#EA580C",
        text: "#1F2937",
        secondary: "#FEF3C7",
        layout: "cozy-grid",
        navigation: "rounded-top",
        typography: "handwritten-sans",
      },
      features: ["Warm Colors", "Rounded Corners", "Community Feel"],
      mockup: {
        nav: {
          bg: "bg-white/90",
          text: "text-amber-900",
          border: "border-amber-200",
        },
        hero: {
          bg: "bg-amber-50",
          text: "text-amber-900",
        },
        cards: {
          bg: "bg-white",
          border: "border-amber-200",
          text: "text-slate-800",
        },
      },
    },
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
    { id: "cappuccino", name: "Cappuccino", description: "Rich espresso with steamed milk foam", price: 3.50, imageUrl: "/placeholder.svg" },
    { id: "coffee", name: "Drip Coffee", description: "Our signature house blend", price: 2.75, imageUrl: "/placeholder.svg" },
    { id: "latte", name: "Latte", description: "Espresso with steamed milk", price: 4.00, imageUrl: "/placeholder.svg" },
    { id: "croissant", name: "Croissant", description: "Buttery and flaky, baked fresh", price: 2.50, imageUrl: "/placeholder.svg" },
  ],
  gallery: [
      { url: "/placeholder.svg", alt: "A cozy coffee shop interior" },
      { url: "/placeholder.svg", alt: "A cup of latte with art" },
      { url: "/placeholder.svg", alt: "A delicious looking pastry" },
      { url: "/placeholder.svg", alt: "Friendly staff smiling" },
  ],
  socialMedia: {
      instagram: "https://instagram.com/example",
      facebook: "https://facebook.com/example",
  },
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
    const selectedTemplateDef = templates.find((t) => t.id === selectedIdForSwitch) || templates[0];
    const mockup = selectedTemplateDef.mockup || templates[0].mockup;
    const baseTemplateStyle = selectedTemplateDef.style;

    const themeOverride = (formData as any).templateThemes?.[selectedIdForSwitch] || {};
    const isDark = (formData as any).themeMode === 'dark';
    const forcedText = selectedIdForSwitch === 'modern' ? '#FFFFFF' : isDark ? '#F8FAFC' : (formData as any).fontColor;
    const styles = {
      ...baseTemplateStyle,
      userPrimary: themeOverride.primary || formData.primaryColor || (baseTemplateStyle as any).accent,
      userSecondary: isDark ? '#0F172A' : themeOverride.secondary || formData.secondaryColor || (baseTemplateStyle as any).secondary,
      userFontColor: themeOverride.text || forcedText,
      userBackground: isDark ? '#0B1020' : themeOverride.background || formData.backgroundColor || (baseTemplateStyle as any).background,
    } as const;

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

    const normalizeUrl = (u?: string) => {
      if (!u) return "/placeholder.svg";
      if (u.startsWith('data:')) return u;
      if (u.startsWith('http://') || u.startsWith('https://') || u.startsWith('/')) return u;
      if (u.startsWith('blob:')) return "/placeholder.svg";
      return u;
    };

    const LogoDisplay = () => {
        const { logo } = formData as any;
        if (logo && typeof logo === 'string' && !logo.startsWith('blob:')) {
            return <img src={logo} alt="Business logo" className="w-full h-full object-contain" />;
        }
        return getBusinessIcon();
    };

    const renderPageContent = () => {
        const items = formData.menuItems || [];
        const gallery = (formData.gallery || []).map((g: any) => ({ ...g, url: normalizeUrl(g?.url) }));

        const toRgba = (hex: string, alpha = 1) => {
          if (!hex) return `rgba(0,0,0,${alpha})`;
          let h = hex.replace('#', '');
          if (h.length === 3) h = h.split('').map((c) => c + c).join('');
          const int = parseInt(h, 16);
          const r = (int >> 16) & 255;
          const g = (int >> 8) & 255;
          const b = int & 255;
          return `rgba(${r}, ${g}, ${b}, ${alpha})`;
        };

        switch (activePage) {
            case "home":
                return (
                    <section className="px-6 pt-6 pb-24">
                        <div className="mx-auto w-20 h-20 rounded-2xl bg-white/20 backdrop-blur flex items-center justify-center border border-white/40 overflow-hidden">
                            <LogoDisplay />
                        </div>
                        <h1 className="text-center text-xl font-extrabold mt-3">{getBusinessName()}</h1>
                        <p className="text-center text-sm opacity-95">{formData.slogan || ""}</p>
                        <div className="mt-4 grid grid-cols-2 gap-3">
                            {items.slice(0, 4).map((it: any, index: number) => (
                                <button key={it.id || it.name || index} className="text-left rounded-2xl border border-white/40 bg-white/25 backdrop-blur-md p-3 shadow-lg" onClick={() => setProductOpen(it)}>
                                    <img src={it.imageUrl || "/placeholder.svg"} alt={it.name} className="w-full h-20 object-cover rounded-lg mb-2" />
                                    <div className="text-[11px] font-semibold truncate">{it.name}</div>
                                    <div className="text-[11px] font-bold" style={{ color: toRgba(String(styles.userPrimary), 0.9) }}>${Number(it.price).toFixed(2)}</div>
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
                        <h2 className="text-lg font-bold mb-3" style={{ color: styles.userFontColor }}>Menu</h2>
                        <div className="grid grid-cols-2 gap-3">
                            {items.map((it: any, index: number) => (
                                <div key={it.id || it.name || index} className="rounded-2xl border border-white/40 bg-white/15 backdrop-blur-md p-3 shadow-lg cursor-pointer" onClick={() => setProductOpen(it)}>
                                    <img src={it.imageUrl || "/placeholder.svg"} alt={it.name} className="w-full h-20 object-cover rounded-lg mb-2" />
                                    <div className="text-sm font-semibold truncate" style={{ color: styles.userFontColor }}>{it.name}</div>
                                    {typeof it.price !== "undefined" && <div className="text-xs" style={{ color: toRgba(String(styles.userPrimary), 0.9) }}>${Number(it.price).toFixed(2)}</div>}
                                </div>
                            ))}
                        </div>
                    </section>
                );
            case "gallery":
                return (
                    <section className="max-w-md mx-auto px-6 py-8">
                        <h2 className="text-lg font-bold mb-3" style={{ color: styles.userFontColor }}>Gallery</h2>
                        <GalleryGrid images={gallery as any} templateStyle={selectedIdForSwitch} />
                    </section>
                );
            case "about":
                return (
                    <section className="max-w-md mx-auto px-6 py-8">
                        <h2 className="text-lg font-bold mb-3" style={{ color: styles.userFontColor }}>About Us</h2>
                        <div className="rounded-2xl border border-white/35 bg-white/10 backdrop-blur-md p-4 text-white/95">
                            <p className="text-sm">{formData.uniqueDescription || ""}</p>
                        </div>
                    </section>
                );
            case "contact":
                return (
                    <section className="max-w-md mx-auto px-6 py-8">
                        <h2 className="text-lg font-bold mb-3" style={{ color: styles.userFontColor }}>Contact</h2>
                        <div className="rounded-2xl border border-white/35 bg-white/10 backdrop-blur-md p-4 text-white/95">
                            {formData.location && <p className="text-sm mb-2 flex items-center gap-2"><MapPin className="w-4 h-4" /> {formData.location}</p>}
                            {Array.isArray(formData.contactMethods) && formData.contactMethods.length > 0 && (
                                <ul className="mt-2 text-sm space-y-1">
                                    {formData.contactMethods.map((m: any, i: number) => <li key={i} className="flex items-center gap-2"><Mail className="w-4 h-4" /> {typeof m === "string" ? m : `${m.type}: ${m.value}`}</li>)}
                                </ul>
                            )}
                            {formData.socialMedia && (Object.keys(formData.socialMedia).length > 0) && (
                                <div className="mt-4 pt-4 border-t border-white/20">
                                    <h3 className="text-sm font-semibold mb-2">Follow Us</h3>
                                    <div className="flex gap-4">
                                        {formData.socialMedia.instagram && <a href={formData.socialMedia.instagram} target="_blank" rel="noopener noreferrer"><Instagram className="w-5 h-5" /></a>}
                                        {formData.socialMedia.facebook && <a href={formData.socialMedia.facebook} target="_blank" rel="noopener noreferrer"><Facebook className="w-5 h-5" /></a>}
                                    </div>
                                </div>
                            )}
                        </div>
                    </section>
                );
            default: return <div className="p-8 text-white">Page not found.</div>;
        }
    };

    return (
        <div className={`min-h-screen relative ${fontClass}`} style={{ background: styles.userBackground, color: styles.userFontColor }}>
            <div className="w-full bg-white" style={{height: 'max(env(safe-area-inset-top, 16px), 16px)'}} />
            <header className="px-4 h-14 flex items-center justify-between relative z-30 bg-white border-b border-black/10">
                <Link to={pageLink("home")} className="flex items-center gap-2 text-lg font-extrabold text-black">
                    <span className="w-8 h-8 rounded-xl inline-flex items-center justify-center overflow-hidden bg-gray-100"><LogoDisplay /></span>
                    {getBusinessName()}
                </Link>
                <button aria-label="Menu" onClick={() => setMenuOpen(true)} className="sm:hidden w-9 h-9 rounded-xl flex items-center justify-center bg-gray-100 text-black">
                  <Menu className="w-5 h-5" />
                </button>
                <nav className="hidden sm:flex gap-4 text-sm">
                    {menuPages.filter(p => p !== 'home').map(p => (
                        <Link key={p} to={pageLink(p)} className={`${activePage === p ? 'text-black' : 'text-gray-600'} hover:text-black font-semibold`}>
                            {p.charAt(0).toUpperCase() + p.slice(1)}
                        </Link>
                    ))}
                </nav>
            </header>

            {menuOpen && (
                <div className="fixed inset-0 z-20">
                    <div className="fixed inset-0 bg-black/30" style={{ top: 'calc(env(safe-area-inset-top, 0px) + 56px)' }} onClick={() => setMenuOpen(false)} />
                    <div className="fixed left-0 right-0 bg-white border-b border-black/10 shadow-lg" style={{ top: 'calc(env(safe-area-inset-top, 0px) + 56px)' }}>
                        <div className="px-4 py-3 flex justify-end">
                            <button aria-label="Close menu" className="w-9 h-9 rounded-xl bg-gray-100 text-black" onClick={() => setMenuOpen(false)}>×</button>
                        </div>
                        <div className="px-4 pb-4 space-y-2">
                            {menuPages.map(p => (
                                <Link key={p} to={pageLink(p)} onClick={() => setMenuOpen(false)} className={`block w-full text-left px-4 py-3 rounded-xl font-semibold ${activePage === p ? 'bg-gray-100 text-black' : 'text-gray-800 hover:bg-gray-50'}`}>
                                    {p.charAt(0).toUpperCase() + p.slice(1)}
                                </Link>
                            ))}
                        </div>
                    </div>
                </div>
            )}

            <div className="pb-20">
                {renderPageContent()}
            </div>

            {productOpen && (
                <div className="absolute inset-0 z-30 flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-black/50" onClick={() => setProductOpen(null)} />
                    <div className="relative bg-white text-gray-900 rounded-2xl w-full max-w-sm p-5 shadow-2xl">
                        <button aria-label="Close" className="absolute top-2 right-2 w-8 h-8 rounded-full hover:bg-gray-100" onClick={() => setProductOpen(null)}>×</button>
                        <img src={productOpen.imageUrl || "/placeholder.svg"} alt={productOpen.name} className="w-full h-40 object-cover rounded-lg mb-4" />
                        <div className="text-lg font-bold mb-1">{productOpen.name}</div>
                        <p className="text-sm text-gray-600 mb-3">{productOpen.description}</p>
                        {typeof productOpen.price !== 'undefined' && <div className="font-semibold mb-3" style={{ color: styles.userPrimary }}>${Number(productOpen.price).toFixed(2)}</div>}
                        <button className="w-full rounded-lg text-white py-2 font-medium" style={{ backgroundColor: styles.userPrimary }} onClick={() => setProductOpen(null)}>Add to cart</button>
                    </div>
                </div>
            )}

            {activePage === 'home' && formData.reservationsEnabled && (
                <div className="fixed bottom-4 left-0 right-0 flex justify-center px-4 z-20">
                    <button className="w-full max-w-md rounded-full text-white py-3 text-sm font-semibold shadow-2xl backdrop-blur" style={{ backgroundColor: styles.userPrimary }}>
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
