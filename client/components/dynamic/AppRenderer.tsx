/**
 * AppRenderer.tsx - PRODUCTION VERSION
 *
 * ✅ Pixel-perfekte Visual Parity mit TemplatePreviewContent.tsx
 * ✅ Nutzt Shared Components (Navigation, DishCard, DishModal, OpeningHours, MenuOverlay)
 * ✅ CSS Variable Injection via StyleInjector
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
import { normalizeImageSrc, getPageLabel } from "@/lib/helpers";
import normalizeConfig from "@/lib/normalizeConfig"; // ✅ FIX 1: Import zentrale normalizeConfig

// ============================================
// SHARED COMPONENTS - 100% Visual Parity
// ============================================
import { Navigation } from "@/components/shared/Navigation";
import { MenuOverlay } from "@/components/shared/MenuOverlay";
import { DishCard } from "@/components/shared/DishCard";
import { DishModal } from "@/components/shared/DishModal";
import { OpeningHours } from "@/components/shared/OpeningHours";
import { Hero } from "@/components/shared/Hero"; // ✅ Hero Component
import { CategoryFilter } from "@/components/shared/CategoryFilter"; // ✅ CategoryFilter Component

interface AppRendererProps {
  config: any; // Akzeptiert flache DB-Daten oder verschachtelte Configuration
}

// ============================================
// HELPER FUNCTIONS
// ============================================
// ✅ FIX 2: Lokale normalizeConfig entfernt - wird jetzt aus @/lib/normalizeConfig importiert

// ============================================
// MAIN COMPONENT
// ============================================

export const AppRenderer: React.FC<AppRendererProps> = ({ config: rawConfig }) => {
  const config = useMemo(() => normalizeConfig(rawConfig), [rawConfig]);
  const { business, design, content, features, contact, pages, payments } = config;

  // ✅ FIX 3: CSS VARIABLE INJECTION - ALLE Design-Parameter inkl. Header-Styles
  useEffect(() => {
    injectGlobalStyles({
      template: design.template,
      primaryColor: design.primaryColor,
      secondaryColor: design.secondaryColor,
      backgroundColor: design.backgroundColor,
      fontColor: design.fontColor,
      priceColor: design.priceColor,
      headerFontColor: design.headerFontColor,
      headerFontSize: design.headerFontSize,
      headerBackgroundColor: design.headerBackgroundColor,
    } as any);

    return () => {
      // Cleanup: Remove injected styles on unmount
      const styleElement = document.getElementById('maitr-injected-styles');
      if (styleElement) {
        styleElement.remove();
      }
    };
  }, [
    design.template,
    design.primaryColor,
    design.secondaryColor,
    design.backgroundColor,
    design.fontColor,
    design.priceColor,
    design.headerFontColor,
    design.headerFontSize,
    design.headerBackgroundColor,
    features.reservationButtonColor,
    features.reservationButtonTextColor,
    features.reservationButtonShape,
  ]);

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

  // Template-spezifische Styles mit Desktop-Optimierung
  const styles = useMemo(() => ({
    wrapper: { backgroundColor: design.backgroundColor, color: design.fontColor },
    page: `px-5 md:px-8 lg:px-12 pt-24 md:pt-28 pb-16 min-h-screen ${fontClass} max-w-7xl mx-auto`,
    titleClass: `text-3xl md:text-5xl lg:text-6xl font-bold mb-6 md:mb-10 text-center leading-tight`,
    bodyClass: `text-sm md:text-base opacity-90 leading-relaxed`,
    nav: `fixed top-0 left-0 right-0 z-30 px-5 md:px-8 lg:px-12 pt-6 md:pt-6 pb-4 md:pb-5 flex items-center justify-between border-b border-black/5 transition-all backdrop-blur-sm`,
  }), [design.backgroundColor, design.fontColor]);

  // ============================================
  // RENDER FUNCTIONS
  // ============================================
  // RENDER FUNCTIONS
  // ============================================

  const renderHomePage = () => (
    <div className="space-y-8 md:space-y-16 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* ✅ Hero Component - Ersetzt inline Hero-Section */}
      <Hero
        slogan={business.slogan && business.slogan.trim() !== "" ? business.slogan : undefined} // ✅ FIX 4: Nur echten Slogan zeigen
        description={business.uniqueDescription || "Willkommen in unserem Geschäft!"}
        primaryColor={design.primaryColor}
        fontColor={design.fontColor}
        backgroundColor={design.backgroundColor}
        onlineOrdering={features.onlineOrderingEnabled}

        onOrderClick={() => navigateToPage("menu")}

        isPreview={false}
      />

      {/* Highlights Section - NUTZT DishCard Shared Component */}
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
              className="text-[10px] md:text-xs font-bold opacity-60 cursor-pointer hover:opacity-100 flex items-center gap-1 transition-opacity"
              onClick={() => navigateToPage("menu")}
            >
              Alle anzeigen <ArrowRight className="w-3 h-3 md:w-4 md:h-4" />
            </span>
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
              ));
            })()}
          </div>
        </div>
      )}

      {/* Reservierungsbuttonn */}
      {features.reservationsEnabled && (
        <div className="mt-8 md:mt-12 mb-6 md:mb-10 max-w-md mx-auto">
          <button
            className="w-full py-3 md:py-4 rounded-xl font-bold shadow-lg transition-transform active:scale-[0.98] hover:shadow-xl hover:scale-105"
            style={{
              backgroundColor: features.reservationButtonColor || design.primaryColor,
              color: features.reservationButtonTextColor || "#FFFFFF",
              borderRadius: features.reservationButtonShape === "pill" ? "9999px" : features.reservationButtonShape === "square" ? "0.5rem" : "0.75rem",
            }}
            onClick={() => navigateToPage("reservations")}
          >
            Tisch reservieren
          </button>
        </div>
      )}

      {/* Öffnungszeiten & Location - NUTZT OpeningHours Shared Component */}
      <OpeningHours
        hours={content.openingHours as OpeningHoursType}
        location={business.location}
        fontColor={design.fontColor}
        expanded={hoursExpanded}
        onExpandChange={setHoursExpanded}
        isPreview={false}
      />
    </div>
  );

  // ✅ ORIGINAL MENU PAGE (Fallback)
  const renderMenuPage = () => (
    <div className="space-y-6 md:space-y-10 animate-in fade-in duration-300">
      <h2 className={styles.titleClass}>Speisekarte</h2>

      {/* ✅ CategoryFilter Component - Shared Component statt inline Code */}
      {allCategories.length > 0 && (
        <CategoryFilter
          categories={allCategories}
          activeCategory={activeMenuCategory}
          onCategoryChange={setActiveMenuCategory}
          fontColor={design.fontColor}
          backgroundColor={design.backgroundColor}
          allLabel="Alle"
          isPreview={false}
          className="md:justify-center"
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
    <div className="space-y-8 md:space-y-12 animate-in fade-in duration-300">
      <h2 className={styles.titleClass}>Kontakt</h2>

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
      default: return <div className="p-10 text-center opacity-50 pt-20">404 - Seite nicht gefunden</div>;
    }
  };

  return (
    <div
      className="h-screen relative flex flex-col transition-colors duration-300 overflow-hidden"
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
        backgroundColor={design.backgroundColor}
        fontColor={design.fontColor}
        menuItems={navigationMenu}
        onClose={closeMenu}
        onNavigate={navigateToPage}
        isPreview={false}
      />

      {/* MAIN CONTENT - Scrollable Container */}
      <main
        className="flex-1 overflow-y-auto scroll-smooth relative z-10"
        style={{
          WebkitOverflowScrolling: "touch",
          overscrollBehaviorY: "contain"
        }}
      >
        <div className={styles.page}>{renderContent()}</div>
        <div className="h-12 w-full" />

        {/* FOOTER - Inside scroll container */}
        <footer className="text-center py-6 opacity-30 text-[10px] font-bold uppercase tracking-widest border-t border-current/5">
          © {new Date().getFullYear()} {business.name} | Maitr Website Builder
        </footer>
      </main>

      {/* ✅ DISH MODAL - Shared Component statt Inline Code */}
      <DishModal
        dish={selectedDish}
        currentImageIndex={currentImageIndex}
        fontColor={design.fontColor}
        backgroundColor={design.backgroundColor}
        priceColor={design.priceColor}
        primaryColor={design.primaryColor}
        onlineOrdering={features.onlineOrderingEnabled}
        onClose={closeDishModal}
        onPrevImage={prevImage}
        onNextImage={nextImage}
        onSetImageIndex={setCurrentImageIndex}
        onAddToCart={addToCart}
        isPreview={false}
      />
    </div>
  );
};

export default AppRenderer;