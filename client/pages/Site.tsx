import { useState, useEffect, useCallback, useMemo } from "react";
import { useParams, Link, useLocation } from "react-router-dom";
import {
  ChevronRight,
  Menu,
  X,
  Palette,
  MapPin,
  Phone,
  Mail,
  Clock,
  Calendar,
  Camera,
  Instagram,
  Facebook,
  Coffee,
  ShoppingBag,
  Utensils,
  Store,
  Building,
  Plus,
  Check,
  Star,
  Heart,
  Home,
  Settings,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
} from "@/components/ui/carousel";
import { motion } from "framer-motion";
import GalleryGrid from "@/components/sections/GalleryGrid";
import { configurationApi, type Configuration } from "@/lib/api";

const fontOptions = [
    { id: "sans-serif", name: "Sans Serif", class: "font-sans", preview: "Modern & Clean", description: "Perfect for digital readability" },
    { id: "serif", name: "Serif", class: "font-serif", preview: "Classic & Elegant", description: "Traditional and sophisticated" },
    { id: "display", name: "Display", class: "font-mono", preview: "Bold & Creative", description: "Eye-catching and unique" },
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
  location: "",
  slogan: "Bold Flavors, Bright Future",
  uniqueDescription: "",
  template: "modern",
  primaryColor: "#fb923c",
  secondaryColor: "#f43f5e",
  fontFamily: "sans-serif",
  selectedPages: ["home", "menu", "contact", "gallery", "about"],
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
    const location = useLocation();

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


function SiteRenderer({ config: formData }: { config: Configuration }) {
    const [previewState, setPreviewState] = useState({
      menuOpen: false,
      activePage: "home",
      hoveredItem: null,
      openHoursExpanded: false,
      orderStage: "select" as "select" | "cart" | "payment" | "done",
      showCartSidebar: true,
      mapView: false,
      sortMode: "popularity" as "popularity" | "price",
      activeCategory: "all",
    });

    const [cartItems, setCartItems] = useState<any[]>([]);
    const [showCart, setShowCart] = useState(false);
    const [productModalOpen, setProductModalOpen] = useState(false);
    const [selectedProduct, setSelectedProduct] = useState<any | null>(null);
    const [selectedQty, setSelectedQty] = useState<number>(1);
    const [showArrowHint, setShowArrowHint] = useState(true);

    const location = useLocation();
    const segs = location.pathname.split("/").filter(Boolean);
    const activePage = (segs[2] || "home").toLowerCase();

    const addToCart = useCallback((item: any, qty: number = 1) => {
        const quantity = Math.max(1, Math.floor(qty || 1));
        setCartItems((prev) => {
          const existingItem = prev.find((cartItem) => cartItem.name === item.name);
          if (existingItem) {
            return prev.map((cartItem) =>
              cartItem.name === item.name
                ? { ...cartItem, quantity: cartItem.quantity + quantity }
                : cartItem,
            );
          }
          return [...prev, { ...item, quantity }];
        });
    }, []);

    const getBusinessName = () => {
      if (formData.businessName) return formData.businessName;
      const templateNames: { [key: string]: string } = {
        minimalist: "Simple",
        modern: "FLUX",
        stylish: "Style",
        cozy: "Cozy",
      };
      const selectedId = formData.template || 'modern';
      return templateNames[selectedId] || "Your Business";
    };

    const getBusinessIcon = () => {
      switch (formData.businessType) {
        case "cafe": return <Coffee className="w-4 h-4" />;
        case "restaurant": return <Utensils className="w-4 h-4" />;
        case "bar": return <Star className="w-4 h-4" />;
        default: return <Building className="w-4 h-4" />;
      }
    };

    const toRgba = (hex: string, alpha = 1) => {
      if (!hex) return `rgba(0,0,0,${alpha})`;
      let h = hex.replace("#", "");
      if (h.length === 3) h = h.split("").map((c) => c + c).join("");
      const int = parseInt(h, 16);
      return `rgba(${(int >> 16) & 255}, ${(int >> 8) & 255}, ${int & 255}, ${alpha})`;
    };

    const selectedIdForSwitch = formData.template || 'modern';

    const selectedTemplateDef = templates.find((t) => t.id === selectedIdForSwitch);
    const baseTemplateStyle = selectedTemplateDef ? selectedTemplateDef.style : templates[0].style;
    const isDark = formData.themeMode === "dark";
    const forcedTextColor = selectedIdForSwitch === "modern" ? "#FFFFFF" : isDark ? "#F8FAFC" : formData.fontColor;
    
    const styles = {
      ...baseTemplateStyle,
      userPrimary: formData.primaryColor || (baseTemplateStyle as any).accent,
      userSecondary: isDark ? "#0F172A" : formData.secondaryColor || (baseTemplateStyle as any).secondary,
      userFontColor: forcedTextColor,
      userFontSize: formData.fontSize,
      userBackground: isDark ? "#0B1020" : formData.backgroundColor || (baseTemplateStyle as any).background,
    };

    const LogoDisplay = () => {
      const { logo } = formData;
      if (logo) {
        if (typeof logo === 'string') {
          return <img src={logo} alt="Business logo" className="w-6 h-6 object-contain rounded" style={{ color: styles.userPrimary }} />;
        }
        if (typeof logo === 'object' && logo instanceof Blob) {
          try {
            const src = URL.createObjectURL(logo);
            return <img src={src} alt="Business logo" className="w-6 h-6 object-contain rounded" style={{ color: styles.userPrimary }} />;
          } catch (e) {
            console.error('Error creating object URL for logo', e);
          }
        }
      }
      return getBusinessIcon();
    };

    const toggleMenu = () => setPreviewState((prev) => ({ ...prev, menuOpen: !prev.menuOpen }));
    const navigateToPage = (page: string) => setPreviewState((prev) => ({ ...prev, activePage: String(page).toLowerCase(), menuOpen: false }));
    
    const openProductModal = (item: any) => {
      setSelectedProduct(item);
      setSelectedQty(1);
      setShowArrowHint(true);
      setProductModalOpen(true);
      setTimeout(() => setShowArrowHint(false), 1800);
    };

    const fontClass = fontOptions.find((f) => f.id === formData.fontFamily)?.class || "font-sans";
    const menuPages = useMemo(() => Array.from(new Set<string>(["home", ...formData.selectedPages, "settings"])), [formData.selectedPages]);

    const renderPageContent = () => {
        // This function will now be local to the SiteRenderer component
        // and will use the activePage from the URL.
        // ... content of renderPageContent from Configurator.tsx
        return <div>Page: {activePage}</div>
    };

    const pageLink = (p: string) => `/site/${segs[1] || ''}/${p === "home" ? "" : p}`.replace(/\/$/, "");

    return (
        <div className={`h-full overflow-y-auto ${fontClass} relative`} style={{ background: styles.userBackground }}>
             <div className="h-8" style={{backgroundColor: toRgba(styles.userPrimary, 0.2)}}/>
            <nav className="bg-white/10 backdrop-blur-md border-b border-white/20 px-4 py-3 relative z-50" style={{borderColor: toRgba(styles.userPrimary, 0.2)}}>
              <div className="flex items-center justify-between">
                <Link to={pageLink('home')} className="flex items-center space-x-3">
                  <div className="w-8 h-8 rounded-xl bg-white/20 backdrop-blur flex items-center justify-center"><LogoDisplay /></div>
                  <h1 className="text-lg font-bold" style={{color: styles.userFontColor}}>{getBusinessName()}</h1>
                </Link>
                <div className="flex items-center space-x-2">
                  <button onClick={toggleMenu} className="p-2 hover:bg-white/10 rounded-xl transition-colors" aria-label="Menu">
                    <Menu className="w-5 h-5" style={{color: styles.userFontColor}} />
                  </button>
                </div>
              </div>
            </nav>
            
            {previewState.menuOpen && (
                <div className="absolute inset-0 z-[60] flex items-start justify-center">
                  <div className="absolute inset-0 bg-black/20" onClick={toggleMenu} />
                  <div className="relative w-full max-w-none p-6 pt-6 backdrop-blur-xl ring-1 ring-white/10" style={{ background: toRgba(styles.userSecondary, 0.85), borderTop: `1px solid ${toRgba(styles.userPrimary, 0.2)}`, color: styles.userFontColor }}>
                    <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center space-x-2">
                            <div className="w-6 h-6 rounded-md bg-white/15 flex items-center justify-center"><LogoDisplay /></div>
                            <span className="text-sm font-semibold">{getBusinessName()}</span>
                        </div>
                        <button onClick={toggleMenu} className="p-2 rounded-md hover:bg-white/10"><X className="w-4 h-4" /></button>
                    </div>
                    <div className="space-y-2">
                      {menuPages.map((page) => (
                          <Link key={page} to={pageLink(page)} onClick={toggleMenu} className="w-full text-left px-4 py-3 text-sm font-semibold rounded-xl border" style={{ backgroundColor: activePage === page ? toRgba(styles.userPrimary, 0.18) : "rgba(255,255,255,0.06)", borderColor: "rgba(255,255,255,0.12)", color: styles.userFontColor }}>
                            {page.charAt(0).toUpperCase() + page.slice(1)}
                          </Link>
                      ))}
                    </div>
                  </div>
                </div>
            )}

            <div className="flex-1 overflow-y-auto p-4">
                {/* Replace with actual page content rendering based on activePage */}
                {activePage === 'home' && <div>Home Page Content</div>}
                {activePage === 'menu' && <div>Menu Page Content</div>}
                {activePage === 'gallery' && <div>Gallery Page Content</div>}
                {activePage === 'about' && <div>About Page Content</div>}
                {activePage === 'contact' && <div>Contact Page Content</div>}
            </div>
        </div>
    );
}
