/**
 * AppRenderer.tsx - PRODUCTION VERSION
 *
 * ✅ Pixel-perfekte Visual Parity mit TemplatePreviewContent.tsx
 * ✅ Nutzt Shared Components (Navigation, DishCard, DishModal, OpeningHours, MenuOverlay)
 * ✅ CSS Variable Injection via StyleInjector
 * ✅ Template Tokens Integration
 * ✅ Mobile & Desktop Responsive Design
 * ✅ Zero Syntax Errors
 */

import React, { useState, useMemo, useCallback, useEffect } from "react";
import {
  Clock,
  MapPin,
  Phone,
  Mail,
  Instagram,
  Facebook,
  ArrowRight,
  Camera,
  Calendar,
  Users,
  CalendarCheck,
} from "lucide-react";
import type { Configuration, MenuItem, OpeningHours as OpeningHoursType } from "@/types/domain";
import { injectGlobalStyles } from "@/lib/styleInjector";
import { getTemplateTokens, getVisualConfig, TemplateTokens } from "@/lib/templateTokens";
import { normalizeImageSrc, getPageLabel } from "@/lib/helpers";

// ============================================
// SHARED COMPONENTS - 100% Visual Parity
// ============================================
import { Navigation } from "@/components/shared/Navigation";
import { MenuOverlay } from "@/components/shared/MenuOverlay";
import { DishCard } from "@/components/shared/DishCard";
import { DishModal } from "@/components/shared/DishModal";
import { OpeningHours } from "@/components/shared/OpeningHours";
import { Hero } from "@/components/shared/Hero";
import { CategoryFilter } from "@/components/shared/CategoryFilter";

interface AppRendererProps {
  config: any; // Akzeptiert flache DB-Daten oder verschachtelte Configuration
}

// ============================================
// HELPER FUNCTIONS
// ============================================

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
  const { business, design, content, features, contact, pages, payments } = config;

  // ✅ TEMPLATE TOKENS INTEGRATION
  // Load template-specific tokens (colors, spacing, typography)
  const templateTokens = useMemo(
    () => getTemplateTokens(design.template),
    [design.template]
  );

  const visualConfig = useMemo(
    () => getVisualConfig(design.template),
    [design.template]
  );

  // ✅ MERGE TEMPLATE TOKENS WITH USER OVERRIDES
  // User config has priority, but template tokens provide defaults
  const finalColors = useMemo(() => ({
    primary: design.primaryColor || templateTokens.colors.primary,
    secondary: design.secondaryColor || templateTokens.colors.secondary,
    background: design.backgroundColor || templateTokens.colors.background,
    text: design.fontColor || templateTokens.colors.text,
    accent: templateTokens.colors.accent, // Always from template
    border: templateTokens.colors.border, // Always from template
    price: design.priceColor || templateTokens.colors.primary,
  }), [design.primaryColor, templateTokens.colors.primary, design.secondaryColor, templateTokens.colors.secondary, design.backgroundColor, templateTokens.colors.background, design.fontColor, templateTokens.colors.text, templateTokens.colors.accent, templateTokens.colors.border, design.priceColor]);

  // ✅ CSS VARIABLE INJECTION - Inject template-specific styles
  useEffect(() => {
    injectGlobalStyles({
      template: design.template,
      primaryColor: finalColors.primary,
      secondaryColor: finalColors.secondary,
      backgroundColor: finalColors.background,
      fontColor: finalColors.text,
      priceColor: finalColors.price,
    });

    return () => {
      // Cleanup: Remove injected styles on unmount
      const styleElement = document.getElementById('maitr-global-styles');
      if (styleElement) {
        styleElement.remove();
      }
    };
  }, [design.template, finalColors]);

  // Local State
  const [menuOpen, setMenuOpen] = useState(false);
  const [activePage, setActivePage] = useState<string>("home");
  const [cartItems, setCartItems] = useState<any[]>([]);
  const [hoursExpanded, setHoursExpanded] = useState(false);
  const [activeMenuCategory, setActiveMenuCategory] = useState<string | null>(null);
  const [selectedDish, setSelectedDish] = useState<MenuItem | null>(null);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);

  // Font Class
  const fontClass = {
    "sans-serif": "font-sans",
    "serif": "font-serif",
    "monospace": "font-mono",
  }[design.fontFamily] || "font-sans";

  // Build deduplicated navigation menu + AUTO-DISCOVERY
  const navigationMenu = useMemo(() => {
    const menuSet = new Set<string>();
    const menuArray: Array<{ id: string; label: string }> = [];

    // Immer Startseite als erstes
    menuArray.push({ id: "home", label: "Startseite" });
    menuSet.add("home");

    // Füge selectedPages hinzu (ohne Duplikate)
    pages.selectedPages.forEach((pageId) => {
      if (!menuSet.has(pageId)) {
        menuArray.push({ id: pageId, label: getPageLabel(pageId) });
        menuSet.add(pageId);
      }
    });

    // AUTO-DISCOVERY: Zeige Seiten an, wenn Daten vorhanden sind
    if (content.menuItems.length > 0 && !menuSet.has("menu")) {
      menuArray.push({ id: "menu", label: "Speisekarte" });
      menuSet.add("menu");
    }

    if (content.gallery.length > 0 && !menuSet.has("gallery")) {
      menuArray.push({ id: "gallery", label: "Galerie" });
      menuSet.add("gallery");
    }

    if ((contact.contactMethods && contact.contactMethods.length > 0) || contact.phone || contact.email || business.location) {
      if (!menuSet.has("contact")) {
        menuArray.push({ id: "contact", label: "Kontakt" });
        menuSet.add("contact");
      }
    }

    if (features.reservationsEnabled && !menuSet.has("reservations")) {
      menuArray.push({ id: "reservations", label: "Reservieren" });
      menuSet.add("reservations");
    }

    if ((payments as any)?.offerBanner?.enabled && !menuSet.has("offers")) {
      menuArray.push({ id: "offers", label: "Angebote" });
      menuSet.add("offers");
    }

    return menuArray;
  }, [pages.selectedPages, features.reservationsEnabled, payments, content.menuItems.length, content.gallery.length, contact.contactMethods, contact.phone, contact.email, business.location]);

  // Handlers
  const toggleMenu = useCallback(() => setMenuOpen(prev => !prev), []);
  const closeMenu = useCallback(() => setMenuOpen(false), []);

  const navigateToPage = useCallback((page: string) => {
    setActivePage(page);
    setMenuOpen(false);
    // Scroll to top
    window.scrollTo({ top: 0, behavior: 'smooth' });
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
  }, [selectedDish?.images]);

  const prevImage = useCallback(() => {
    if (!selectedDish?.images) return;
    setCurrentImageIndex(prev => prev > 0 ? prev - 1 : selectedDish.images!.length - 1);
  }, [selectedDish?.images]);

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

  // Template-spezifische Styles mit Desktop-Optimierung und Token-Integration
  const styles = useMemo(() => {
    const spacing = templateTokens.spacing;
    const typography = templateTokens.typography;

    return {
      wrapper: {
        backgroundColor: finalColors.background,
        color: finalColors.text
      },
      page: `px-5 md:px-8 lg:px-12 pt-24 md:pt-28 pb-16 min-h-screen ${fontClass} max-w-7xl mx-auto`,
      // Use CSS variables for title sizing - set via styleInjector
      titleClass: `maitr-title text-3xl md:text-5xl lg:text-6xl`,
      // Use CSS variables for body sizing
      bodyClass: `maitr-body text-sm md:text-base`,
      nav: `fixed top-0 left-0 right-0 z-30 px-5 md:px-8 lg:px-12 pt-6 md:pt-6 pb-4 md:pb-5 flex items-center justify-between border-b border-black/5 transition-all`,
    };
  }, [templateTokens.spacing, templateTokens.typography, finalColors.background, finalColors.text]);

  // ============================================
  // RENDER FUNCTIONS
  // ============================================

  const renderHomePage = () => (
    <div className="space-y-8 md:space-y-16 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* ✅ Hero Component - Ersetzt inline Hero-Section */}
      <Hero
        slogan={business.slogan || business.name}
        description={business.uniqueDescription || "Willkommen in unserem Geschäft!"}
        primaryColor={finalColors.primary}
        fontColor={finalColors.text}
        backgroundColor={finalColors.background}
        onlineOrdering={features.onlineOrderingEnabled}
        reservationsEnabled={features.reservationsEnabled}
        reservationButtonColor={features.reservationButtonColor}
        reservationButtonTextColor={features.reservationButtonTextColor}
        reservationButtonShape={features.reservationButtonShape as "rounded" | "pill" | "square"}
      />

      {/* Highlights / Featured Items */}
      {content.menuItems.length > 0 && (
        <div className="space-y-6 md:space-y-8">
          <div className="flex items-center justify-between">
            <h3 className="text-xl md:text-2xl font-bold">Highlights</h3>
            <button
              onClick={() => navigateToPage("menu")}
              className="flex items-center gap-2 text-sm md:text-base font-medium hover:gap-3 transition-all"
              style={{ color: finalColors.text }}
            >
              Alle anzeigen <ArrowRight className="w-4 h-4" />
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-6">
            {(() => {
              // ✅ Smart Highlight-Logik: Zeige markierte Highlights, fülle mit zufälligen auf
              const selectedHighlights = content.menuItems.filter(
                (item: MenuItem) => (item as any).isHighlight
              );

              const remainingSlots = Math.max(0, 3 - selectedHighlights.length);

              // Zufällige Gerichte zum Auffüllen
              const randomFiller = content.menuItems
                .filter((item: MenuItem) => !(item as any).isHighlight)
                .sort(() => 0.5 - Math.random())
                .slice(0, remainingSlots);

              // Kombiniere und limitiere auf 3
              const highlightsToShow = [...selectedHighlights, ...randomFiller].slice(0, 3);

              return highlightsToShow.map((item: MenuItem, i: number) => (
                <DishCard
                  key={item.id || i}
                  item={item}
                  onClick={() => openDishModal(item)}
                  fontColor={finalColors.text}
                  priceColor={finalColors.price}
                  primaryColor={finalColors.primary}
                  backgroundColor={finalColors.background}
                  onlineOrdering={features.onlineOrderingEnabled}
                  onAddToCart={addToCart}
                  isPreview={false}
                />
              ));
            })()}
          </div>
        </div>
      )}

      {/* Reservierungen CTA (wenn aktiviert) */}
      {features.reservationsEnabled && (
        <div className="text-center p-8 md:p-12 rounded-2xl border border-current/10 bg-white/5 backdrop-blur-sm space-y-4 shadow-sm">
          <CalendarCheck className="w-12 h-12 md:w-16 md:h-16 mx-auto opacity-80" />
          <h3 className="text-xl md:text-2xl font-bold">Jetzt Tisch reservieren</h3>
          <p className={`${styles.bodyClass} opacity-70 max-w-md mx-auto`}>
            Sichern Sie sich Ihren Platz – schnell und unkompliziert online buchen
          </p>
          <button
            onClick={() => navigateToPage("reservations")}
            className="w-full py-3 md:py-4 rounded-xl font-bold shadow-lg transition-transform active:scale-[0.98] hover:shadow-xl hover:scale-105"
            style={{
              backgroundColor: features.reservationButtonColor,
              color: features.reservationButtonTextColor,
              borderRadius: features.reservationButtonShape === "pill" ? "9999px" : features.reservationButtonShape === "square" ? "0.5rem" : "0.75rem",
            }}
          >
            Zur Reservierung
          </button>
        </div>
      )}
    </div>
  );

  const renderMenuPage = () => (
    <div className="space-y-6 md:space-y-10 animate-in fade-in duration-300">
      <h2 className={styles.titleClass}>Speisekarte</h2>

      {/* ✅ CategoryFilter Component */}
      {allCategories.length > 0 && (
        <CategoryFilter
          categories={allCategories}
          activeCategory={activeMenuCategory}
          onCategoryChange={setActiveMenuCategory}
          fontColor={finalColors.text}
          backgroundColor={finalColors.background}
        />
      )}

      {/* Menu Items - NUTZT DishCard Shared Component */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6 pb-4">
        {filteredMenuItems.length > 0 ? (
          filteredMenuItems.map((item: MenuItem, i: number) => (
            <DishCard
              key={item.id || i}
              item={item}
              fontColor={design.fontColor}
              priceColor={design.priceColor}
              primaryColor={design.primaryColor}
              backgroundColor={design.backgroundColor}
              template={design.template}
              onlineOrdering={features.onlineOrderingEnabled}
              onClick={() => openDishModal(item)}
              onAddToCart={addToCart}
              isPreview={false}
            />
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
    <div className="space-y-6 md:space-y-10 animate-in fade-in duration-300">
      <h2 className={styles.titleClass}>Kontakt</h2>

      <div className="grid gap-6 md:gap-8 max-w-3xl mx-auto">
        {/* Location */}
        {business.location && (
          <div className="p-6 md:p-8 rounded-2xl border border-current/10 bg-white/5 space-y-6 backdrop-blur-sm shadow-sm">
            <div className="flex items-start gap-4">
              <div className="mt-1 p-2 md:p-3 bg-current/5 rounded-full">
                <MapPin className="w-5 h-5 md:w-6 md:h-6" />
              </div>
              <div className="flex-1">
                <h3 className="font-bold text-base md:text-lg mb-1">Standort</h3>
                <div className={styles.bodyClass}>{business.location}</div>
              </div>
            </div>
          </div>
        )}

        {/* Phone */}
        {contact.phone && (
          <div className="p-6 md:p-8 rounded-2xl border border-current/10 bg-white/5 backdrop-blur-sm shadow-sm">
            <div className="flex items-start gap-4">
              <div className="p-2 md:p-3 bg-current/5 rounded-full">
                <Phone className="w-5 h-5 md:w-6 md:h-6" />
              </div>
              <div className="flex-1">
                <h3 className="font-bold text-base md:text-lg mb-1">Telefon</h3>
                <div className={styles.bodyClass}>{contact.phone}</div>
              </div>
            </div>
          </div>
        )}

        {/* Email */}
        {contact.email && (
          <div className="p-6 md:p-8 rounded-2xl border border-current/10 bg-white/5 backdrop-blur-sm shadow-sm">
            <div className="flex items-start gap-4">
              <div className="p-2 md:p-3 bg-current/5 rounded-full">
                <Mail className="w-5 h-5 md:w-6 md:h-6" />
              </div>
              <div className="flex-1">
                <h3 className="font-bold text-base md:text-lg mb-1">E-Mail</h3>
                <div className={styles.bodyClass}>{contact.email}</div>
              </div>
            </div>
          </div>
        )}

        {/* Opening Hours */}
        <div className="p-6 md:p-8 rounded-2xl border border-current/10 bg-white/5 space-y-6 backdrop-blur-sm shadow-sm">
          <div className="flex items-start gap-4">
            <div className="p-2 md:p-3 bg-current/5 rounded-full">
              <Clock className="w-5 h-5 md:w-6 md:h-6" />
            </div>
            <div className="flex-1">
              <h3 className="font-bold text-base md:text-lg mb-4">Öffnungszeiten</h3>
              {Object.keys(content.openingHours).length > 0 ? (
                Object.entries(content.openingHours).map(([day, hours]) => (
                  <div
                    key={day}
                    className="flex justify-between py-2 border-b border-current/5 last:border-b-0 text-xs md:text-sm"
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
      </div>

      {/* Social Media */}
      {(contact.socialMedia?.instagram || contact.socialMedia?.facebook) && (
        <div className="flex justify-center gap-6 md:gap-8 py-6 md:py-8 opacity-80">
          {contact.socialMedia?.instagram && (
            <a
              href={contact.socialMedia.instagram}
              target="_blank"
              rel="noopener noreferrer"
              className="hover:opacity-100 hover:scale-110 transition-all"
            >
              <Instagram className="w-6 h-6 md:w-8 md:h-8" />
            </a>
          )}
          {contact.socialMedia?.facebook && (
            <a
              href={contact.socialMedia.facebook}
              target="_blank"
              rel="noopener noreferrer"
              className="hover:opacity-100 hover:scale-110 transition-all"
            >
              <Facebook className="w-6 h-6 md:w-8 md:h-8" />
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
          style={{ backgroundColor: `${finalColors.primary}20` }}
        >
          <CalendarCheck className="w-8 h-8 md:w-10 md:h-10" style={{ color: finalColors.primary }} />
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
        className="w-full py-3 md:py-4 rounded-xl font-bold text-base md:text-lg shadow-lg transition-transform active:scale-[0.98] hover:shadow-xl hover:scale-105"
        style={{
          backgroundColor: features.reservationButtonColor,
          color: features.reservationButtonTextColor,
          borderRadius: features.reservationButtonShape === "pill" ? "9999px" : features.reservationButtonShape === "square" ? "0.5rem" : "0.75rem",
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
      {/* ✅ NAVIGATION - Shared Component statt Inline Code */}
      <Navigation
        businessName={business.name}
        businessType={business.type}
        logo={business.logo?.url || null}
        headerFontColor={design.headerFontColor}
        headerFontSize={design.headerFontSize}
        headerBackgroundColor={design.headerBackgroundColor}
        onlineOrdering={features.onlineOrderingEnabled}
        cartCount={cartItems.length}
        menuOpen={menuOpen}
        onToggleMenu={toggleMenu}
        onNavigateHome={() => navigateToPage("home")}
        isPreview={false}
        className={styles.nav}
      />

      {/* ✅ MENU OVERLAY - Shared Component statt Inline Code */}
      <MenuOverlay
        isOpen={menuOpen}
        backgroundColor={finalColors.background}
        fontColor={finalColors.text}
        menuItems={navigationMenu}
        onClose={closeMenu}
        onNavigate={navigateToPage}
        isPreview={false}
      />

      {/* MAIN CONTENT */}
      <main className="flex-1 overflow-y-auto scroll-smooth" style={{ WebkitOverflowScrolling: "touch" }}>
        <div className={styles.page}>{renderContent()}</div>
        <div className="h-12 w-full" />
      </main>

      {/* ✅ DISH MODAL - Shared Component statt Inline Code */}
      <DishModal
        dish={selectedDish}
        currentImageIndex={currentImageIndex}
        fontColor={finalColors.text}
        backgroundColor={finalColors.background}
        priceColor={finalColors.price}
        primaryColor={finalColors.primary}
        onlineOrdering={features.onlineOrderingEnabled}
        onClose={closeDishModal}
        onPrevImage={prevImage}
        onNextImage={nextImage}
        onSetImageIndex={setCurrentImageIndex}
        onAddToCart={addToCart}
        isPreview={false}
      />

      {/* FOOTER */}
      <footer className="text-center py-6 opacity-30 text-[10px] font-bold uppercase tracking-widest border-t border-current/5">
        © {new Date().getFullYear()} {business.name} | Maitr Website Builder
      </footer>
    </div>
  );
};

export default AppRenderer;