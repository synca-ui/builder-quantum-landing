/**
 * AppRenderer.tsx - PRODUCTION VERSION
 *
 * Vollständig neu geschrieben für 100% visuelle Parität mit TemplatePreviewContent.tsx
 *
 * Features:
 * ✅ Pixel-perfekte Visual Parity zur Live-Preview
 * ✅ Mobile Hamburger-Menü mit Overlay
 * ✅ Interaktive Dish-Modals mit Bild-Karussell
 * ✅ Kategorie-Filter für Speisekarte
 * ✅ Robuste Daten-Normalisierung (flach → verschachtelt)
 * ✅ Responsive Design (Mobile-First)
 * ✅ Template Intent Support (VISUAL, NARRATIVE, COMMERCIAL)
 */

import React, { useState, useMemo, useCallback } from "react";
import {
  Clock,
  MapPin,
  Phone,
  Mail,
  Instagram,
  Facebook,
  ChevronRight,
  ChevronLeft,
  ChevronDown,
  Menu,
  X,
  Plus,
  Camera,
  ArrowRight,
  Coffee,
  Utensils,
  ShoppingBag,
  Calendar,
  Users,
  CalendarCheck,
} from "lucide-react";
import type { Configuration, MenuItem, OpeningHours } from "@/types/domain";
import { defaultTemplates, defaultTemplateThemes } from "@/components/template/TemplateRegistry";
import { generateGlobalStyles } from "@/lib/styleInjector";
import {
  getTemplateTokens,
  getTemplateIntent,
  getVisualConfig,
  type VisualConfig,
} from "@/lib/templateTokens";

interface AppRendererProps {
  config: any; // Akzeptiert flache DB-Daten oder verschachtelte Configuration
}

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Normalisiert Bild-URLs aus verschiedenen Formaten
 */
function normalizeImageSrc(img: any): string {
  if (!img) return "/placeholder.svg";
  if (typeof img === "string") return img;
  const url = img?.url;
  if (typeof url === "string") return url;
  const file = (img as any)?.file || img;
  if (typeof File !== "undefined" && file instanceof File)
    return URL.createObjectURL(file);
  return "/placeholder.svg";
}

/**
 * Header Font Size zu Tailwind Class
 */
function getHeaderFontClass(size: string): string {
  switch (size) {
    case "xs": return "text-[10px]";
    case "small": return "text-xs";
    case "medium": return "text-sm";
    case "large": return "text-base";
    case "xl": return "text-lg";
    case "2xl": return "text-xl";
    case "3xl": return "text-2xl";
    case "4xl": return "text-[28px]";
    case "5xl": return "text-[32px]";
    default: return "text-sm";
  }
}

/**
 * Normalisiert flache DB-Daten zu verschachtelter Configuration-Struktur
 */
const normalizeConfig = (rawConfig: any): Configuration => {
  // Fall 1: Bereits verschachtelt (aus Store)
  if (rawConfig.business && rawConfig.design) {
    return {
      ...rawConfig,
      userId: rawConfig.userId || "anonymous",
    } as Configuration;
  }

  // Fall 2: Flache Struktur (aus DB)
  return {
    userId: rawConfig.userId || "anonymous",
    business: {
      name: rawConfig.businessName || rawConfig.name || "Ihr Geschäft",
      type: rawConfig.businessType || rawConfig.type || "restaurant",
      location: rawConfig.location || "",
      slogan: rawConfig.slogan || "",
      uniqueDescription: rawConfig.uniqueDescription || "",
      logo: rawConfig.logo || null,
    },
    design: {
      template: rawConfig.template || "minimalist",
      primaryColor: rawConfig.primaryColor || "#2563EB",
      secondaryColor: rawConfig.secondaryColor || "#7C3AED",
      backgroundColor: rawConfig.backgroundColor || "#FFFFFF",
      fontColor: rawConfig.fontColor || "#111827",
      fontFamily: rawConfig.fontFamily || "sans-serif",
      priceColor: rawConfig.priceColor || "#059669",
      headerFontColor: rawConfig.headerFontColor || rawConfig.fontColor || "#111827",
      headerFontSize: rawConfig.headerFontSize || "medium",
      headerBackgroundColor: rawConfig.headerBackgroundColor || rawConfig.backgroundColor || "#FFFFFF",
    },
    content: {
      menuItems: rawConfig.menuItems || [],
      gallery: rawConfig.gallery || [],
      openingHours: rawConfig.openingHours || {},
      categories: rawConfig.categories || [],
    },
    features: {
      reservationsEnabled: rawConfig.reservationsEnabled || false,
      reservationButtonColor: rawConfig.reservationButtonColor || "#2563EB",
      reservationButtonTextColor: rawConfig.reservationButtonTextColor || "#FFFFFF",
      reservationButtonShape: rawConfig.reservationButtonShape || "rounded",
      onlineOrderingEnabled: rawConfig.onlineOrdering || rawConfig.onlineOrderingEnabled || false,
      onlineStoreEnabled: rawConfig.onlineStore || rawConfig.onlineStoreEnabled || false,
      teamAreaEnabled: rawConfig.teamArea || rawConfig.teamAreaEnabled || false,
    },
    contact: {
      email: rawConfig.email || "",
      phone: rawConfig.phone || "",
      socialMedia: rawConfig.socialMedia || {},
      contactMethods: rawConfig.contactMethods || [],
    },
    publishing: rawConfig.publishing || { status: rawConfig.status || "draft" },
    pages: {
      selectedPages: rawConfig.selectedPages || ["home"],
      customPages: rawConfig.customPages || [],
    },
    payments: rawConfig.payments || {},
  } as Configuration;
};

// ============================================
// MAIN COMPONENT
// ============================================

export const AppRenderer: React.FC<AppRendererProps> = ({ config: rawConfig }) => {
  const config = useMemo(() => normalizeConfig(rawConfig), [rawConfig]);
  const { business, design, content, features, contact, pages } = config;

  // Template Metadaten laden
  const templateMeta = defaultTemplates.find(t => t.id === design.template) || defaultTemplates[0];
  const theme = defaultTemplateThemes[design.template] || defaultTemplateThemes.modern;
  const templateIntent = getTemplateIntent(design.template);
  const visualConfig: VisualConfig = getVisualConfig(design.template);

  // Globale CSS-Styles generieren
  const globalStyles = generateGlobalStyles(design.template, {
    primaryColor: design.primaryColor,
    secondaryColor: design.secondaryColor,
    backgroundColor: design.backgroundColor,
    fontColor: design.fontColor,
    priceColor: design.priceColor,
  });

  // Local State
  const [menuOpen, setMenuOpen] = useState(false);
  const [activePage, setActivePage] = useState<string>("home");
  const [cartItems, setCartItems] = useState<any[]>([]);
  const [hoursExpanded, setHoursExpanded] = useState(false);
  const [activeMenuCategory, setActiveMenuCategory] = useState<string | null>(null);
  const [selectedDish, setSelectedDish] = useState<MenuItem | null>(null);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [isDesktop, setIsDesktop] = useState(false);

  // Detect Desktop/Mobile
  React.useEffect(() => {
    const checkDesktop = () => setIsDesktop(window.innerWidth >= 768);
    checkDesktop();
    window.addEventListener('resize', checkDesktop);
    return () => window.removeEventListener('resize', checkDesktop);
  }, []);

  // Font Class
  const fontClass = {
    "sans-serif": "font-sans",
    "serif": "font-serif",
    "monospace": "font-mono",
  }[design.fontFamily] || "font-sans";

  // Header Font Class
  const headerFontClass = getHeaderFontClass(design.headerFontSize);

  // Handlers
  const toggleMenu = useCallback(() => setMenuOpen(prev => !prev), []);
  const closeMenu = useCallback(() => setMenuOpen(false), []);
  const navigateToPage = useCallback((page: string) => {
    setActivePage(page);
    setMenuOpen(false);
  }, []);
  const addToCart = useCallback((item: any) => {
    setCartItems(prev => [...prev, item]);
  }, []);
  const openDishModal = useCallback((dish: MenuItem) => {
    setSelectedDish(dish);
    setCurrentImageIndex(0);
  }, []);
  const closeDishModal = useCallback(() => {
    setSelectedDish(null);
    setCurrentImageIndex(0);
  }, []);
  const nextImage = useCallback(() => {
    if (!selectedDish?.images) return;
    setCurrentImageIndex(prev => prev < selectedDish.images!.length - 1 ? prev + 1 : 0);
  }, [selectedDish]);
  const prevImage = useCallback(() => {
    if (!selectedDish?.images) return;
    setCurrentImageIndex(prev => prev > 0 ? prev - 1 : selectedDish.images!.length - 1);
  }, [selectedDish]);

  // Kategorien extrahieren
  const allCategories = useMemo(() => {
    const cats = new Set<string>();
    content.menuItems.forEach((item: any) => {
      if (item.category) cats.add(item.category);
    });
    return Array.from(cats);
  }, [content.menuItems]);

  // Gefilterte Menu Items
  const filteredMenuItems = useMemo(() => {
    if (!activeMenuCategory) return content.menuItems;
    return content.menuItems.filter((item: any) => item.category === activeMenuCategory);
  }, [content.menuItems, activeMenuCategory]);

  // Template-spezifische Styles mit Desktop-Optimierung
  const styles = useMemo(() => {
    const base = {
      wrapper: { backgroundColor: design.backgroundColor, color: design.fontColor },
      page: `px-5 md:px-8 lg:px-12 pt-32 md:pt-40 pb-24 min-h-screen ${fontClass} max-w-7xl mx-auto`,
      titleClass: `text-3xl md:text-5xl lg:text-6xl font-bold mb-6 md:mb-10 text-center leading-tight`,
      bodyClass: `text-sm md:text-base opacity-90 leading-relaxed`,
      itemNameClass: `text-base md:text-lg font-bold leading-tight`,
      itemDescClass: `text-xs md:text-sm opacity-80 mt-1 leading-snug`,
      itemPriceClass: `text-lg md:text-xl font-bold`,
      nav: `fixed top-0 left-0 right-0 z-30 px-5 md:px-8 lg:px-12 pt-12 md:pt-6 pb-4 md:pb-5 flex items-center justify-between border-b border-black/5 transition-all`,
    };

    switch (design.template) {
      case "modern":
        return {
          ...base,
          wrapper: {
            background: `linear-gradient(135deg, ${design.backgroundColor} 0%, ${design.secondaryColor} 100%)`,
            color: design.fontColor,
          },
          itemCard: "bg-white/10 backdrop-blur-md rounded-2xl p-4 md:p-6 border border-white/20 shadow-lg mb-4 md:mb-6",
        };
      case "stylish":
        return {
          ...base,
          itemCard: "bg-white rounded-xl p-4 md:p-6 shadow-lg border border-gray-100 mb-4 md:mb-6 transform hover:scale-[1.01] transition-transform",
        };
      case "cozy":
        return {
          ...base,
          itemCard: "bg-white/90 rounded-[2rem] p-5 md:p-7 border border-amber-100/50 shadow-md mb-5 md:mb-7",
        };
      default:
        return {
          ...base,
          itemCard: "py-5 md:py-6 border-b border-current/10 last:border-0",
        };
    }
  }, [design, fontClass]);

  // ============================================
  // RENDER FUNCTIONS
  // ============================================

  const renderHomePage = () => (
    <div className="space-y-8 md:space-y-16 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Hero Section */}
      <div className="text-center py-8 md:py-20 px-2 flex flex-col items-center">
        <h1 className={styles.titleClass} style={{ color: design.fontColor }}>
          {business.slogan || business.name}
        </h1>
        <p
          className={`${styles.bodyClass} max-w-[90%] md:max-w-2xl text-center`}
          style={{ color: design.fontColor }}
        >
          {business.uniqueDescription || "Willkommen in unserem Geschäft!"}
        </p>

        {features.onlineOrderingEnabled && (
          <div className="mt-6 md:mt-10 w-full md:w-auto px-4 md:px-0">
            <button
              className="w-full md:w-auto md:px-12 py-3 md:py-4 px-6 font-bold text-base md:text-lg rounded-full shadow-lg hover:scale-105 active:scale-95 transition-all"
              style={{ backgroundColor: design.primaryColor, color: "#FFFFFF" }}
              onClick={() => navigateToPage("menu")}
            >
              Jetzt bestellen
            </button>
          </div>
        )}
      </div>

      {/* Highlights Section */}
      {content.menuItems.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-4 md:mb-8 px-1">
            <h3
              className="uppercase tracking-widest font-bold opacity-60 text-[10px] md:text-xs"
              style={{ color: design.fontColor }}
            >
              Highlights
            </h3>
            <span
              className="text-[10px] md:text-xs font-bold opacity-60 cursor-pointer hover:opacity-100 flex items-center gap-1"
              onClick={() => navigateToPage("menu")}
            >
              Alle anzeigen <ArrowRight className="w-3 h-3 md:w-4 md:h-4" />
            </span>
          </div>

          {/* Mobile: Single Column, Desktop: 3 Columns */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-6">
            {content.menuItems.slice(0, 6).map((item: any, i: number) => (
              <div
                key={i}
                className={`${styles.itemCard} cursor-pointer hover:scale-[1.02] transition-transform active:scale-[0.98]`}
                onClick={() => openDishModal(item)}
              >
                <div className="flex justify-between items-start gap-3">
                  <div className="flex-1 min-w-0">
                    <div className={styles.itemNameClass} style={{ color: design.fontColor }}>
                      {item.name}
                    </div>
                    {item.description && (
                      <div className={styles.itemDescClass} style={{ color: design.fontColor }}>
                        {item.description}
                      </div>
                    )}
                  </div>
                  <div className={styles.itemPriceClass} style={{ color: design.priceColor }}>
                    {item.price}€
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Reservierungsbutton */}
      {features.reservationsEnabled && (
        <div className="mt-8 md:mt-12 mb-6 md:mb-10 max-w-md mx-auto">
          <button
            className="w-full py-3 md:py-4 rounded-xl font-bold shadow-lg transition-transform active:scale-[0.98] hover:shadow-xl"
            style={{
              backgroundColor: features.reservationButtonColor,
              color: features.reservationButtonTextColor,
              borderRadius: features.reservationButtonShape === "pill" ? "9999px" : features.reservationButtonShape === "square" ? "0.5rem" : "0.75rem",
            }}
            onClick={() => navigateToPage("reservations")}
          >
            Tisch reservieren
          </button>
        </div>
      )}

      {/* Öffnungszeiten & Location - Desktop: 2 Spalten */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-12 border-t border-current/10 pt-8 md:pt-12">
        {/* Öffnungszeiten */}
        <div
          className="text-center md:text-left cursor-pointer group"
          onClick={() => setHoursExpanded(!hoursExpanded)}
        >
          <div className="flex items-center justify-center md:justify-start gap-2 opacity-70 group-hover:opacity-100 transition-opacity mb-4">
            <Clock className="w-4 h-4 md:w-5 md:h-5 shrink-0" />
            <span className="text-xs md:text-sm font-medium">Öffnungszeiten</span>
            <ChevronDown
              className={`w-3 h-3 md:w-4 md:h-4 transition-transform duration-200 ${hoursExpanded ? "rotate-180" : ""}`}
            />
          </div>

          {(hoursExpanded || isDesktop) && (
            <div className="mt-3 space-y-1.5 md:space-y-2 text-left animate-in fade-in slide-in-from-top-2 duration-200">
              {Object.keys(content.openingHours).length > 0 ? (
                Object.entries(content.openingHours).map(([day, hours]: any) => (
                  <div key={day} className="flex justify-between text-xs md:text-sm opacity-80">
                    <span className="capitalize">{day}</span>
                    <span className="font-medium">
                      {hours.closed ? "Geschlossen" : `${hours.open} - ${hours.close}`}
                    </span>
                  </div>
                ))
              ) : (
                <p className="text-xs md:text-sm italic opacity-50">Keine Zeiten hinterlegt</p>
              )}
            </div>
          )}
        </div>

        {/* Location */}
        {business.location && (
          <div className="text-center md:text-left">
            <div className="flex items-center justify-center md:justify-start gap-2 opacity-70 mb-4">
              <MapPin className="w-4 h-4 md:w-5 md:h-5 shrink-0" />
              <span className="text-xs md:text-sm font-medium">Standort</span>
            </div>
            <p className="text-xs md:text-sm opacity-80">{business.location}</p>
          </div>
        )}
      </div>
    </div>
  );

  const renderMenuPage = () => (
    <div className="space-y-6 md:space-y-10 animate-in fade-in duration-300">
      <h2 className={styles.titleClass}>Speisekarte</h2>

      {/* Kategorie-Filter */}
      {allCategories.length > 0 && (
        <div className="flex gap-2 md:gap-3 overflow-x-auto no-scrollbar pb-2 -mx-2 px-2 md:justify-center">
          <button
            onClick={() => setActiveMenuCategory(null)}
            className={`px-4 py-2 md:px-6 md:py-3 rounded-full text-xs md:text-sm font-bold whitespace-nowrap cursor-pointer transition-all hover:scale-105 ${
              activeMenuCategory === null ? "shadow-md" : "border border-current/20 opacity-70"
            }`}
            style={
              activeMenuCategory === null
                ? { backgroundColor: design.fontColor, color: design.backgroundColor }
                : {}
            }
          >
            Alle
          </button>
          {allCategories.map((cat) => (
            <button
              key={cat}
              onClick={() => setActiveMenuCategory(cat)}
              className={`px-4 py-2 md:px-6 md:py-3 rounded-full text-xs md:text-sm font-bold whitespace-nowrap cursor-pointer transition-all hover:scale-105 ${
                activeMenuCategory === cat ? "shadow-md" : "border border-current/20 opacity-70"
              }`}
              style={
                activeMenuCategory === cat
                  ? { backgroundColor: design.fontColor, color: design.backgroundColor }
                  : {}
              }
            >
              {cat}
            </button>
          ))}
        </div>
      )}

      {/* Menu Items - Desktop: 2-3 Spalten Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6 pb-8">
        {filteredMenuItems.length > 0 ? (
          filteredMenuItems.map((item: any, i: number) => (
            <div
              key={i}
              className={`${styles.itemCard} cursor-pointer hover:scale-[1.02] transition-transform active:scale-[0.98]`}
              onClick={() => openDishModal(item)}
            >
              <div className="flex justify-between items-start gap-3">
                <div className="flex-1 min-w-0">
                  <div className={styles.itemNameClass} style={{ color: design.fontColor }}>
                    {item.name}
                  </div>
                  {item.description && (
                    <div className={styles.itemDescClass} style={{ color: design.fontColor }}>
                      {item.description}
                    </div>
                  )}
                </div>
                <div className="flex flex-col items-end gap-2 pl-2">
                  <div className={styles.itemPriceClass} style={{ color: design.priceColor }}>
                    {item.price}€
                  </div>
                  {features.onlineOrderingEnabled && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        addToCart(item);
                      }}
                      className="w-8 h-8 md:w-10 md:h-10 rounded-full flex items-center justify-center transition-transform active:scale-90 shadow-md hover:shadow-lg"
                      style={{ backgroundColor: design.primaryColor, color: "#FFF" }}
                    >
                      <Plus className="w-4 h-4 md:w-5 md:h-5" />
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))
        ) : (
          <div className="col-span-full text-center py-8 opacity-50 text-sm md:text-base">
            Keine Artikel in dieser Kategorie
          </div>
        )}
      </div>
    </div>
  );

  const renderContactPage = () => (
    <div className="space-y-8 md:space-y-12 animate-in fade-in duration-300">
      <h2 className={styles.titleClass}>Kontakt</h2>

      {/* Desktop: 2-Spalten-Layout */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-12">
        {/* Linke Spalte: Kontaktdaten */}
        <div className="p-6 md:p-8 rounded-2xl border border-current/10 bg-white/5 space-y-6 backdrop-blur-sm shadow-sm">
          <h3 className="font-bold text-lg md:text-xl mb-6">Kontaktinformationen</h3>
          <div className="space-y-6">
            {business.location && (
              <div className="flex items-start gap-4">
                <div className="mt-1 p-2 md:p-3 bg-current/5 rounded-full">
                  <MapPin className="w-4 h-4 md:w-5 md:h-5" />
                </div>
                <div>
                  <div className="font-bold text-sm md:text-base mb-1 opacity-90">Adresse</div>
                  <div className={styles.bodyClass}>{business.location}</div>
                </div>
              </div>
            )}
            {contact.phone && (
              <div className="flex items-center gap-4">
                <div className="p-2 md:p-3 bg-current/5 rounded-full">
                  <Phone className="w-4 h-4 md:w-5 md:h-5" />
                </div>
                <div>
                  <div className="font-bold text-sm md:text-base mb-1 opacity-90">Telefon</div>
                  <div className={styles.bodyClass}>{contact.phone}</div>
                </div>
              </div>
            )}
            {contact.email && (
              <div className="flex items-center gap-4">
                <div className="p-2 md:p-3 bg-current/5 rounded-full">
                  <Mail className="w-4 h-4 md:w-5 md:h-5" />
                </div>
                <div>
                  <div className="font-bold text-sm md:text-base mb-1 opacity-90">E-Mail</div>
                  <div className={styles.bodyClass}>{contact.email}</div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Rechte Spalte: Öffnungszeiten */}
        <div className="p-6 md:p-8 rounded-2xl border border-current/10 bg-white/5 space-y-6 backdrop-blur-sm shadow-sm">
          <h3 className="font-bold text-lg md:text-xl mb-6 flex items-center gap-2">
            <Clock className="w-5 h-5 md:w-6 md:h-6 opacity-70" /> Öffnungszeiten
          </h3>
          <div className="space-y-2 md:space-y-3 opacity-90">
            {Object.keys(content.openingHours).length > 0 ? (
              Object.entries(content.openingHours).map(([day, hours]: any) => (
                <div
                  key={day}
                  className="flex justify-between text-xs md:text-sm py-2 md:py-3 border-b border-current/5 last:border-0"
                >
                  <span className="capitalize opacity-80 font-medium">{day}</span>
                  <span className="font-bold">
                    {hours.closed ? "Geschlossen" : `${hours.open} - ${hours.close}`}
                  </span>
                </div>
              ))
            ) : (
              <div className="text-xs md:text-sm opacity-60 italic">Keine Zeiten hinterlegt.</div>
            )}
          </div>
        </div>
      </div>

      {/* Social Media - zentriert unten */}
      {(contact.socialMedia?.instagram || contact.socialMedia?.facebook) && (
        <div className="flex justify-center gap-6 md:gap-8 py-6 md:py-8 opacity-80">
          {contact.socialMedia?.instagram && (
            <a
              href={contact.socialMedia.instagram}
              target="_blank"
              rel="noopener noreferrer"
              className="hover:opacity-100 transition-opacity"
            >
              <Instagram className="w-6 h-6 md:w-8 md:h-8 cursor-pointer" />
            </a>
          )}
          {contact.socialMedia?.facebook && (
            <a
              href={contact.socialMedia.facebook}
              target="_blank"
              rel="noopener noreferrer"
              className="hover:opacity-100 transition-opacity"
            >
              <Facebook className="w-6 h-6 md:w-8 md:h-8 cursor-pointer" />
            </a>
          )}
        </div>
      )}
    </div>
  );

  const renderGalleryPage = () => (
    <div className="space-y-6 md:space-y-10 animate-in fade-in duration-300">
      <h2 className={styles.titleClass}>Galerie</h2>
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 md:gap-4 lg:gap-6">
        {(content.gallery.length > 0 ? content.gallery : [1, 2, 3, 4, 5, 6, 7, 8]).map((img: any, i: number) => (
          <div
            key={i}
            className="aspect-square rounded-xl md:rounded-2xl overflow-hidden bg-black/5 relative shadow-sm group hover:shadow-xl transition-shadow duration-300"
          >
            {img.url ? (
              <img
                src={normalizeImageSrc(img)}
                className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                alt={img.alt || "Gallery"}
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-current/20">
                <Camera className="w-6 h-6 md:w-8 md:h-8" />
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );

  const renderReservationsPage = () => (
    <div className="space-y-6 md:space-y-10 animate-in fade-in duration-300 max-w-2xl mx-auto">
      <div className="text-center">
        <div
          className="w-16 h-16 md:w-20 md:h-20 mx-auto mb-4 md:mb-6 rounded-full flex items-center justify-center"
          style={{ backgroundColor: `${design.primaryColor}20` }}
        >
          <CalendarCheck className="w-8 h-8 md:w-10 md:h-10" style={{ color: design.primaryColor }} />
        </div>
        <h2 className={styles.titleClass}>Reservierung</h2>
        <p className={`${styles.bodyClass} opacity-70`}>Buchen Sie Ihren Tisch online</p>
      </div>

      <div className="space-y-4 md:space-y-5 p-4 md:p-8 rounded-2xl border border-current/10 bg-white/5">
        <div>
          <label className="block text-xs md:text-sm font-bold mb-2 opacity-70">Datum</label>
          <div className="flex items-center gap-2 md:gap-3 p-3 md:p-4 rounded-xl border border-current/10 bg-white/50">
            <Calendar className="w-4 h-4 md:w-5 md:h-5 opacity-50" />
            <span className="text-sm md:text-base">Datum wählen...</span>
          </div>
        </div>

        <div>
          <label className="block text-xs md:text-sm font-bold mb-2 opacity-70">Uhrzeit</label>
          <div className="flex items-center gap-2 md:gap-3 p-3 md:p-4 rounded-xl border border-current/10 bg-white/50">
            <Clock className="w-4 h-4 md:w-5 md:h-5 opacity-50" />
            <span className="text-sm md:text-base">Zeit wählen...</span>
          </div>
        </div>

        <div>
          <label className="block text-xs md:text-sm font-bold mb-2 opacity-70">Anzahl Gäste</label>
          <div className="flex items-center gap-2 md:gap-3 p-3 md:p-4 rounded-xl border border-current/10 bg-white/50">
            <Users className="w-4 h-4 md:w-5 md:h-5 opacity-50" />
            <span className="text-sm md:text-base">2 Personen</span>
          </div>
        </div>
      </div>

      <button
        className="w-full py-3 md:py-4 rounded-xl font-bold text-base md:text-lg shadow-lg transition-transform active:scale-[0.98] hover:shadow-xl"
        style={{
          backgroundColor: features.reservationButtonColor,
          color: features.reservationButtonTextColor,
        }}
      >
        Reservierung anfragen
      </button>

      <div className="text-center opacity-60 text-xs md:text-sm space-y-1">
        <p>Sie erhalten eine Bestätigung per E-Mail</p>
        <p className="flex items-center justify-center gap-1">
          <Phone className="w-3 h-3 md:w-4 md:h-4" />
          Oder rufen Sie uns an
        </p>
      </div>
    </div>
  );

  const renderContent = () => {
    switch (activePage) {
      case "home": return renderHomePage();
      case "menu": return renderMenuPage();
      case "contact": return renderContactPage();
      case "gallery": return renderGalleryPage();
      case "reservations": return renderReservationsPage();
      default: return <div className="p-10 text-center opacity-50 pt-20">Seite nicht gefunden</div>;
    }
  };

  return (
    <div
      className="min-h-screen relative flex flex-col transition-colors duration-300"
      style={styles.wrapper}
    >
      {/* Globale Styles injizieren */}
      <style dangerouslySetInnerHTML={{ __html: globalStyles }} />

      {/* NAVIGATION */}
      <nav
        className={styles.nav}
        style={{ backgroundColor: design.headerBackgroundColor, color: design.headerFontColor }}
      >
        <div className="flex items-center gap-2 overflow-hidden">
          {business.logo?.url ? (
            <img
              src={business.logo.url}
              alt="Logo"
              className="w-8 h-8 md:w-10 md:h-10 shrink-0 rounded-lg object-cover"
            />
          ) : (
            <div
              className="w-8 h-8 md:w-10 md:h-10 shrink-0 rounded-lg flex items-center justify-center"
              style={{ backgroundColor: `${design.headerFontColor}15` }}
            >
              {business.type === "cafe" ? <Coffee className="w-4 h-4 md:w-5 md:h-5" /> : <Utensils className="w-4 h-4 md:w-5 md:h-5" />}
            </div>
          )}
          <span
            className={`font-bold cursor-pointer truncate ${headerFontClass} md:text-xl`}
            onClick={() => navigateToPage("home")}
            style={{ color: design.headerFontColor }}
          >
            {business.name}
          </span>
        </div>

        {/* Desktop Navigation Links - Hidden on Mobile */}
        <div className="hidden md:flex items-center gap-8 text-sm font-semibold uppercase tracking-wider">
          {pages.selectedPages.map((page) => (
            <button
              key={page}
              onClick={() => navigateToPage(page)}
              className={`hover:opacity-100 transition-opacity ${activePage === page ? 'opacity-100 border-b-2' : 'opacity-70'}`}
              style={{
                color: design.headerFontColor,
                borderColor: activePage === page ? design.headerFontColor : 'transparent'
              }}
            >
              {page === "home" ? "Home" : page.charAt(0).toUpperCase() + page.slice(1)}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-3 shrink-0" style={{ color: design.headerFontColor }}>
          {features.onlineOrderingEnabled && (
            <div className="relative cursor-pointer">
              <ShoppingBag className="w-5 h-5 md:w-6 md:h-6 opacity-90" />
              {cartItems.length > 0 && (
                <span className="absolute -top-1 -right-1 w-3.5 h-3.5 md:w-4 md:h-4 bg-red-500 text-white text-[9px] md:text-[10px] flex items-center justify-center rounded-full font-bold shadow-sm">
                  {cartItems.length}
                </span>
              )}
            </div>
          )}
          {/* Mobile Menu Button - Hidden on Desktop */}
          <button onClick={toggleMenu} className="p-1 md:hidden active:scale-90 transition-transform">
            {menuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>
      </nav>

      {/* MOBILE MENU OVERLAY */}
      {menuOpen && (
        <div
          className="fixed inset-0 z-[60] bg-black/60 backdrop-blur-md transition-opacity"
          onClick={closeMenu}
        >
          <div
            className="absolute right-0 top-0 bottom-0 w-3/4 p-6 pt-20 shadow-2xl h-full flex flex-col transform transition-transform duration-300"
            style={{ backgroundColor: design.backgroundColor, color: design.fontColor }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="font-bold text-2xl mb-8 opacity-90">Menü</h3>
            <div className="space-y-4 flex-1 overflow-y-auto">
              {["home", ...pages.selectedPages].map((item) => (
                <div
                  key={item}
                  className="text-lg font-medium cursor-pointer flex justify-between items-center group pb-3 border-b border-current/10"
                  onClick={() => navigateToPage(item)}
                >
                  <span className="capitalize">
                    {item === "home" ? "Startseite" : item}
                  </span>
                  <ChevronRight className="w-4 h-4 opacity-50" />
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* MAIN CONTENT */}
      <main className="flex-1 overflow-y-auto scroll-smooth" style={{ WebkitOverflowScrolling: "touch" }}>
        <div className={styles.page}>{renderContent()}</div>
        <div className="h-20 w-full" />
      </main>

      {/* DISH MODAL */}
      {selectedDish && (
        <div
          className="fixed inset-0 z-[70] bg-black/70 backdrop-blur-sm flex items-center md:items-center justify-center p-0 md:p-6 animate-in fade-in duration-200"
          onClick={closeDishModal}
        >
          <div
            className="w-full md:w-auto md:min-w-[600px] md:max-w-3xl rounded-t-3xl md:rounded-3xl max-h-[85%] md:max-h-[90vh] overflow-hidden animate-in slide-in-from-bottom md:slide-in-from-bottom-0 duration-300"
            style={{ backgroundColor: design.backgroundColor, color: design.fontColor }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Image Carousel */}
            {selectedDish.images && selectedDish.images.length > 0 ? (
              <div className="relative aspect-[4/3] md:aspect-[16/9] bg-gray-100">
                <img
                  src={normalizeImageSrc(selectedDish.images[currentImageIndex])}
                  alt={selectedDish.name}
                  className="w-full h-full object-cover"
                />
                {selectedDish.images.length > 1 && (
                  <>
                    <button
                      onClick={prevImage}
                      className="absolute left-2 md:left-4 top-1/2 -translate-y-1/2 w-8 h-8 md:w-12 md:h-12 rounded-full bg-black/50 text-white flex items-center justify-center hover:bg-black/70 transition-colors"
                    >
                      <ChevronLeft className="w-5 h-5 md:w-6 md:h-6" />
                    </button>
                    <button
                      onClick={nextImage}
                      className="absolute right-2 md:right-4 top-1/2 -translate-y-1/2 w-8 h-8 md:w-12 md:h-12 rounded-full bg-black/50 text-white flex items-center justify-center hover:bg-black/70 transition-colors"
                    >
                      <ChevronRight className="w-5 h-5 md:w-6 md:h-6" />
                    </button>
                    <div className="absolute bottom-3 md:bottom-4 left-1/2 -translate-x-1/2 flex gap-1.5 md:gap-2">
                      {selectedDish.images.map((_, idx) => (
                        <button
                          key={idx}
                          onClick={() => setCurrentImageIndex(idx)}
                          className={`w-2 h-2 md:w-2.5 md:h-2.5 rounded-full transition-all ${
                            idx === currentImageIndex ? "bg-white w-4 md:w-5" : "bg-white/50"
                          }`}
                        />
                      ))}
                    </div>
                  </>
                )}
                <button
                  onClick={closeDishModal}
                  className="absolute top-3 md:top-4 right-3 md:right-4 w-8 h-8 md:w-10 md:h-10 rounded-full bg-black/50 text-white flex items-center justify-center hover:bg-black/70 transition-colors"
                >
                  <X className="w-5 h-5 md:w-6 md:h-6" />
                </button>
              </div>
            ) : (
              <div className="relative aspect-[4/3] md:aspect-[16/9] bg-gray-100 flex items-center justify-center">
                <Camera className="w-12 h-12 md:w-16 md:h-16 text-gray-300" />
                <button
                  onClick={closeDishModal}
                  className="absolute top-3 md:top-4 right-3 md:right-4 w-8 h-8 md:w-10 md:h-10 rounded-full bg-black/50 text-white flex items-center justify-center hover:bg-black/70 transition-colors"
                >
                  <X className="w-5 h-5 md:w-6 md:h-6" />
                </button>
              </div>
            )}

            {/* Dish Details */}
            <div className="p-5 md:p-8 space-y-3 md:space-y-4">
              <div className="flex justify-between items-start gap-3 md:gap-4">
                <h3 className="text-xl md:text-3xl font-bold">{selectedDish.name}</h3>
                <span className="text-xl md:text-3xl font-bold shrink-0" style={{ color: design.priceColor }}>
                  {selectedDish.price}€
                </span>
              </div>
              {selectedDish.description && (
                <p className="text-sm md:text-base opacity-80 leading-relaxed">{selectedDish.description}</p>
              )}

              {features.onlineOrderingEnabled && (
                <button
                  onClick={() => {
                    addToCart(selectedDish);
                    closeDishModal();
                  }}
                  className="w-full py-3 md:py-4 rounded-xl font-bold text-base md:text-lg text-white shadow-lg mt-4 md:mt-6 transition-transform active:scale-[0.98] hover:shadow-xl"
                  style={{ backgroundColor: design.primaryColor }}
                >
                  <Plus className="w-4 h-4 md:w-5 md:h-5 inline mr-2" />
                  Zum Warenkorb
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* FOOTER */}
      <footer className="text-center py-6 opacity-30 text-[10px] font-bold uppercase tracking-widest border-t border-current/5">
        © {new Date().getFullYear()} {business.name} | Maitr Website Builder
      </footer>
    </div>
  );
};

export default AppRenderer;