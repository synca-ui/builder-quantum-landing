/**
 * TemplatePreviewContent.tsx
 *
 * Hauptkomponente für die Vorschau im Editor/Konfigurator.
 * Nutzt die Shared Components aus /components/shared/ für konsistentes
 * Rendering zwischen Editor und Live-Seite.
 *
 * WICHTIG: isPreview=true wird an alle Shared Components übergeben,
 * um Editor-spezifisches Verhalten zu ermöglichen.
 */

import React, { useState, useMemo, useCallback } from "react";
import { useConfiguratorStore } from "@/store/configuratorStore";
import {
  MapPin,
  Phone,
  Mail,
  Clock,
  Camera,
  ArrowRight,
  Calendar,
  Users,
  CalendarCheck,
} from "lucide-react";

// ✅ Helper-Import aus zentraler Datei
import { normalizeImageSrc, getPageLabel } from "@/lib/helpers";

// Shared Components - werden im Editor UND auf der Live-Seite verwendet
import { Navigation } from "@/components/shared/Navigation";
import { MenuOverlay } from "@/components/shared/MenuOverlay";
import { DishCard } from "@/components/shared/DishCard";
import { DishModal } from "@/components/shared/DishModal";
import { OpeningHours } from "@/components/shared/OpeningHours";
import { CategoryFilter } from "@/components/shared/CategoryFilter";

import { ReservationButton } from "@/components/ui/ReservationButton";
import { getBusinessTypeDefaults } from "@/lib/businessTypeDefaults";
import type { MenuItem, OpeningHours as OpeningHoursType } from "@/types/domain";

// ============================================
// MAIN COMPONENT
// ============================================

export function TemplatePreviewContent() {
  // ==========================================
  // GRANULAR SELECTORS - select individual primitives to avoid reference issues
  // ==========================================

  // Business fields
  const businessName =
    useConfiguratorStore((s) => s.business.name) || "Dein Geschäft";
  const businessType =
    useConfiguratorStore((s) => s.business.type) || "restaurant";
  const location = useConfiguratorStore((s) => s.business.location);
  const slogan = useConfiguratorStore((s) => s.business.slogan);
  const uniqueDescription = useConfiguratorStore(
    (s) => s.business.uniqueDescription
  );
  const logo = useConfiguratorStore((s) => s.business.logo);

  // Design fields
  const template =
    useConfiguratorStore((s) => s.design.template) || "minimalist";
  const primaryColor =
    useConfiguratorStore((s) => s.design.primaryColor) || "#2563EB";
  const secondaryColor =
    useConfiguratorStore((s) => s.design.secondaryColor) || "#7C3AED";
  const fontFamily =
    useConfiguratorStore((s) => s.design.fontFamily) || "sans-serif";
  const backgroundColor =
    useConfiguratorStore((s) => s.design.backgroundColor) || "#FFFFFF";
  const fontColor =
    useConfiguratorStore((s) => s.design.fontColor) || "#000000";
  const priceColor =
    useConfiguratorStore((s) => (s.design as any).priceColor) || "#059669";
  const headerFontColor =
    useConfiguratorStore((s) => (s.design as any).headerFontColor) || fontColor;
  const headerFontSize =
    useConfiguratorStore((s) => (s.design as any).headerFontSize) || "medium";
  const headerBackgroundColor =
    useConfiguratorStore((s) => (s.design as any).headerBackgroundColor) ||
    backgroundColor;

  // Content fields
  const menuItems = useConfiguratorStore((s) => s.content.menuItems) || [];
  const categories = useConfiguratorStore((s) => s.content.categories) || [];
  const gallery = useConfiguratorStore((s) => s.content.gallery) || [];
  const openingHours =
    useConfiguratorStore((s) => s.content.openingHours) || {};

  // Contact fields
  const contactMethods =
    useConfiguratorStore((s) => s.contact.contactMethods) || [];

  // Typ-Definition für ContactMethod Objekte (Store speichert diese tatsächlich als Objekte)
  type ContactMethodObject = { type: "phone" | "email"; value: string };

  // Feature fields
  const onlineOrdering = useConfiguratorStore(
    (s) => s.features.onlineOrderingEnabled
  );
  const reservationsEnabled = useConfiguratorStore(
    (s) => s.features.reservationsEnabled
  );
  const reservationButtonColor =
    useConfiguratorStore((s) => s.features.reservationButtonColor) ||
    primaryColor;
  const reservationButtonTextColor =
    useConfiguratorStore((s) => s.features.reservationButtonTextColor) ||
    "#FFFFFF";
  const reservationButtonShape =
    useConfiguratorStore((s) => s.features.reservationButtonShape) || "rounded";

  // Pages fields
  const selectedPages =
    useConfiguratorStore((s) => s.pages.selectedPages) || [];

  // Payment/Offers fields
  const offerBannerEnabled =
    useConfiguratorStore((s) => s.payments?.offerBanner?.enabled) || false;

  // ==========================================
  // Build deduplicated menu with labels + AUTO-DISCOVERY
  // ==========================================
  const navigationMenu = useMemo(() => {
    const menuSet = new Set<string>();
    const menuArray: Array<{ id: string; label: string }> = [];

    // Immer Startseite als erstes
    menuArray.push({ id: "home", label: "Startseite" });
    menuSet.add("home");

    // Füge selectedPages hinzu (ohne Duplikate)
    selectedPages.forEach((pageId) => {
      if (!menuSet.has(pageId)) {
        menuArray.push({ id: pageId, label: getPageLabel(pageId) });
        menuSet.add(pageId);
      }
    });

    // AUTO-DISCOVERY: Zeige Seiten an, wenn Daten vorhanden sind
    // Speisekarte: Wenn Menü-Items existieren
    if (menuItems.length > 0 && !menuSet.has("menu")) {
      menuArray.push({ id: "menu", label: "Speisekarte" });
      menuSet.add("menu");
    }

    // Galerie: Wenn Bilder vorhanden sind
    if (gallery.length > 0 && !menuSet.has("gallery")) {
      menuArray.push({ id: "gallery", label: "Galerie" });
      menuSet.add("gallery");
    }

    // Kontakt: Wenn Kontaktmethoden oder Location vorhanden
    if ((contactMethods.length > 0 || location) && !menuSet.has("contact")) {
      menuArray.push({ id: "contact", label: "Kontakt" });
      menuSet.add("contact");
    }

    // Dynamisch: Reservierungen nur wenn aktiviert
    if (reservationsEnabled && !menuSet.has("reservations")) {
      menuArray.push({ id: "reservations", label: "Reservieren" });
      menuSet.add("reservations");
    }

    // Dynamisch: Angebote nur wenn Banner aktiviert
    if (offerBannerEnabled && !menuSet.has("offers")) {
      menuArray.push({ id: "offers", label: "Angebote" });
      menuSet.add("offers");
    }

    return menuArray;
  }, [location, reservationsEnabled]);

  // ==========================================
  // LOCAL STATE
  // ==========================================
  const [previewState, setPreviewState] = useState({
    menuOpen: false,
    activePage: "home",
  });
  const [cartItems, setCartItems] = useState<any[]>([]);
  const [activeMenuCategory, setActiveMenuCategory] = useState<string | null>(
    null
  );
  const [selectedDish, setSelectedDish] = useState<MenuItem | null>(null);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);

  // ==========================================
  // Scroll-Lock für Modal
  // ==========================================
  React.useEffect(() => {
    if (selectedDish) {
      document.body.style.overflow = "hidden";
      document.body.style.touchAction = "none";
    } else {
      document.body.style.overflow = "";
      document.body.style.touchAction = "";
    }

    return () => {
      document.body.style.overflow = "";
      document.body.style.touchAction = "";
    };
  }, [selectedDish]);

  // ==========================================
  // HANDLERS
  // ==========================================
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
    setCurrentImageIndex((prev) =>
      prev < selectedDish.images!.length - 1 ? prev + 1 : 0
    );
  }, [selectedDish?.images]);

  const prevImage = useCallback(() => {
    if (!selectedDish?.images) return;
    setCurrentImageIndex((prev) =>
      prev > 0 ? prev - 1 : selectedDish.images!.length - 1
    );
  }, [selectedDish?.images]);

  const toggleMenu = useCallback(() => {
    setPreviewState((p) => ({ ...p, menuOpen: !p.menuOpen }));
  }, []);

  const closeMenu = useCallback(() => {
    setPreviewState((p) => ({ ...p, menuOpen: false }));
  }, []);

  const navigateToPage = useCallback((page: string) => {
    setPreviewState((p) => ({ ...p, activePage: page, menuOpen: false }));

    // SCROLL-TO-TOP bei Seitenwechsel
    setTimeout(() => {
      const container = document.querySelector('[data-preview-scroll="true"]');
      if (container) {
        container.scrollTop = 0;
      }
      window.scrollTo({ top: 0, behavior: "instant" as ScrollBehavior });
    }, 0);
  }, []);

  const addToCart = useCallback((item: any) => {
    setCartItems((prev) => [...prev, item]);
  }, []);

  // ==========================================
  // STYLE HELPERS
  // ==========================================
  const fontClass =
    fontFamily === "serif"
      ? "font-serif"
      : fontFamily === "mono"
        ? "font-mono"
        : "font-sans";

  // Memoized styles
  const styles = useMemo(() => {
    const base = {
      wrapper: { backgroundColor, color: fontColor },
      page: `px-5 pt-24 pb-16 min-h-full ${fontClass}`,
      titleClass: `text-3xl font-bold mb-6 text-center leading-tight`,
      bodyClass: `text-sm opacity-90 leading-relaxed`,
      nav: `absolute top-0 left-0 right-0 z-30 px-5 pt-6 pb-4 flex items-center justify-between border-b border-black/5 transition-all`,
    };

    switch (template) {
      case "modern":
        return {
          ...base,
          wrapper: {
            background: `linear-gradient(135deg, ${backgroundColor} 0%, ${secondaryColor} 100%)`,
            color: fontColor,
          },
        };
      case "stylish":
      case "cozy":
      default:
        return base;
    }
  }, []);

  // ==========================================
  // CONTENT RENDERERS
  // ==========================================
  const renderHomePage = () => {
    const displayItems =
      menuItems.length > 0
        ? menuItems
        : getBusinessTypeDefaults(businessType).menuItems;

    return (
      <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
        {/* Hero Section */}
        <div className="text-center py-8 px-2 flex flex-col items-center">
          <h1 className={styles.titleClass} style={{ color: fontColor }}>
            {slogan || "Willkommen"}
          </h1>
          <p
            className={`${styles.bodyClass} max-w-[90%] text-center`}
            style={{ color: fontColor }}
          >
            {uniqueDescription ||
              "Wir bieten beste Qualität und eine tolle Atmosphäre."}
          </p>

          {onlineOrdering && (
            <div className="mt-6 w-full px-4">
              <button
                className="w-full py-3 px-6 font-bold text-base shadow-lg hover:scale-105 active:scale-95 transition-all text-white"
                style={{
                  backgroundColor: primaryColor,
                  borderRadius: "var(--radius-button, 9999px)",
                  boxShadow: "var(--shadow-button, 0 4px 14px rgba(0,0,0,0.15))",
                }}
                onClick={() => navigateToPage("menu")}
              >
                Jetzt bestellen
              </button>
            </div>
          )}
        </div>

        {/* Highlights Section - nutzt DishCard Shared Component */}
        <div>
          <div className="flex items-center justify-between mb-4 px-1">
            <h3
              className="uppercase tracking-widest font-bold opacity-60 text-[10px]"
              style={{ color: fontColor }}
            >
              Highlights
            </h3>
            <span
              className="text-[10px] font-bold opacity-60 cursor-pointer hover:opacity-100 flex items-center gap-1"
              onClick={() => navigateToPage("menu")}
            >
              Alle <ArrowRight className="w-3 h-3" />
            </span>
          </div>

          <div className="space-y-3">
            {displayItems.slice(0, 3).map((item: MenuItem, i: number) => (
              <DishCard
                key={item.id || i}
                item={item}
                fontColor={fontColor}
                priceColor={priceColor}
                primaryColor={primaryColor}
                backgroundColor={backgroundColor}
                template={template}
                onlineOrdering={onlineOrdering}
                onClick={() => openDishModal(item)}
                onAddToCart={addToCart}
                isPreview={true}
              />
            ))}
            {reservationsEnabled && (
              <div className="mt-4 w-full px-4">
                <ReservationButton
                  color={reservationButtonColor}
                  textColor={reservationButtonTextColor}
                  shape={reservationButtonShape as "rounded" | "pill" | "square"}
                  className="w-full shadow-lg"
                  onClick={() => navigateToPage("reservations")}
                >
                  Tisch reservieren
                </ReservationButton>
              </div>
            )}
          </div>
        </div>

        {/* Opening Hours - nutzt OpeningHours Shared Component */}
        <OpeningHours
          hours={openingHours as OpeningHoursType}
          location={location}
          fontColor={fontColor}
        />
      </div>
    );
  };

  const renderMenuPage = () => {
    const filteredItems = activeMenuCategory
      ? menuItems.filter(item => item.category === activeMenuCategory)
      : menuItems;

    return (
      <div className="space-y-6 animate-in fade-in duration-300">
        {/* Page Title */}
        <h2 className={styles.titleClass}>Speisekarte</h2>

        {/* Category Filter - NUR wenn Kategorien existieren */}
        {categories.length > 0 && (
          <div className="sticky top-0 z-20 pb-4 -mx-4 px-4">
            <CategoryFilter
              categories={categories}
              activeCategory={activeMenuCategory}
              onCategoryChange={(category) => {
                console.log('[MenuPage] Category changed:', category);
                setActiveMenuCategory(category);
              }}
              fontColor={fontColor}
              backgroundColor={backgroundColor}
              allLabel="Alle"
              maxVisible={5}
              isPreview={true}
            />
          </div>
        )}

        {/* Menu Items List */}
        <div className="space-y-3">
          {filteredItems.length > 0 ? (
            <>
              {/* Items nach Kategorie gruppieren (optional) */}
              {!activeMenuCategory && categories.length > 0 ? (
                // Gruppierte Ansicht wenn "Alle" ausgewählt
                categories.map(category => {
                  const categoryItems = menuItems.filter(item => item.category === category);
                  if (categoryItems.length === 0) return null;

                  return (
                    <div key={category} className="space-y-3">
                      <h3
                        className="text-lg font-bold mt-6 mb-3 pb-2 border-b"
                        style={{
                          color: fontColor,
                          borderColor: `${fontColor}20`
                        }}
                      >
                        {category}
                      </h3>
                      {categoryItems.map((item) => (
                        <DishCard
                          key={item.id}
                          item={item}
                          fontColor={fontColor}
                          priceColor={priceColor}
                          primaryColor={primaryColor}
                          backgroundColor={backgroundColor}
                          template={template}
                          onlineOrdering={onlineOrdering}
                          showImage={true}
                          onClick={() => openDishModal(item)}
                          onAddToCart={addToCart}
                          isPreview={true}
                        />
                      ))}
                    </div>
                  );
                })
              ) : (
                // Flache Liste wenn Kategorie ausgewählt
                filteredItems.map((item) => (
                  <DishCard
                    key={item.id}
                    item={item}
                    fontColor={fontColor}
                    priceColor={priceColor}
                    primaryColor={primaryColor}
                    backgroundColor={backgroundColor}
                    template={template}
                    onlineOrdering={onlineOrdering}
                    showImage={true}
                    onClick={() => openDishModal(item)}
                    onAddToCart={addToCart}
                    isPreview={true}
                  />
                ))
              )}
            </>
          ) : (
            // Empty State
            <div className="text-center py-16 opacity-50">
              <div className="text-5xl mb-4">🍽️</div>
              <p className="text-base font-medium mb-2" style={{ color: fontColor }}>
                {activeMenuCategory
                  ? `Keine Gerichte in "${activeMenuCategory}"`
                  : "Noch keine Gerichte hinzugefügt"
                }
              </p>
              {activeMenuCategory && (
                <button
                  onClick={() => setActiveMenuCategory(null)}
                  className="mt-4 px-4 py-2 text-sm font-medium rounded-lg border transition-colors"
                  style={{
                    borderColor: `${fontColor}30`,
                    color: fontColor,
                  }}
                >
                  Alle anzeigen
                </button>
              )}
            </div>
          )}
        </div>

        {/* Item Count Info */}
        {filteredItems.length > 0 && (
          <div className="text-center text-xs opacity-50 pt-4 border-t" style={{ borderColor: `${fontColor}10` }}>
            {filteredItems.length} {filteredItems.length === 1 ? 'Gericht' : 'Gerichte'}
            {activeMenuCategory && ` in "${activeMenuCategory}"`}
          </div>
        )}
      </div>
    );
  };

  const renderContactPage = () => {
    return (
      <div className="space-y-8 animate-in fade-in duration-300">
        <h2 className={styles.titleClass}>Kontakt</h2>
        <div
          className="p-6 border border-current/10 bg-white/5 space-y-6 backdrop-blur-sm shadow-sm"
          style={{ borderRadius: "var(--radius-card, 16px)" }}
        >
          <div className="space-y-6">
            {location && (
              <div className="flex items-start gap-4">
                <div className="mt-1 p-2 bg-current/5 rounded-full">
                  <MapPin className="w-4 h-4" />
                </div>
                <div>
                  <div className="font-bold text-sm mb-1 opacity-90">
                    Adresse
                  </div>
                  <div className={styles.bodyClass}>{location}</div>
                </div>
              </div>
            )}
            {(contactMethods as unknown as ContactMethodObject[]).map((m, i: number) => (
              <div key={i} className="flex items-center gap-4">
                <div className="p-2 bg-current/5 rounded-full">
                  {m.type === "phone" ? (
                    <Phone className="w-4 h-4" />
                  ) : (
                    <Mail className="w-4 h-4" />
                  )}
                </div>
                <div className={styles.bodyClass}>{m.value}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Opening Hours in Contact */}
        <div>
          <h3 className="font-bold text-lg mb-4 flex items-center gap-2">
            <Clock className="w-5 h-5 opacity-70" /> Öffnungszeiten
          </h3>
          <div className="space-y-2 opacity-90">
            {Object.keys(openingHours).length > 0 ? (
              Object.entries(openingHours).map(([day, hours]: [string, any]) => (
                <div
                  key={day}
                  className="flex justify-between text-xs py-2 border-b border-current/5 last:border-0"
                >
                  <span className="capitalize opacity-80 font-medium">
                    {day}
                  </span>
                  <span className="font-bold">
                    {hours.closed
                      ? "Geschlossen"
                      : `${hours.open} - ${hours.close}`}
                  </span>
                </div>
              ))
            ) : (
              <div className="text-xs opacity-60 italic">
                Keine Zeiten hinterlegt.
              </div>
            )}
          </div>
        </div>

        {/* Social Links - Platzhalter */}
        <div className="flex justify-center gap-6 py-6 opacity-80 text-sm">
          <span className="cursor-pointer hover:opacity-100 transition-all">
            Instagram
          </span>
          <span className="cursor-pointer hover:opacity-100 transition-all">
            Facebook
          </span>
        </div>
      </div>
    );
  };

  const renderGalleryPage = () => {
    return (
      <div className="space-y-6 animate-in fade-in duration-300">
        <h2 className={styles.titleClass}>Galerie</h2>
        <div className="grid grid-cols-2 gap-3">
          {(gallery.length > 0 ? gallery : [1, 2, 3, 4, 5, 6]).map(
            (img: any, i: number) => (
              <div
                key={i}
                className="aspect-square overflow-hidden bg-black/5 relative shadow-sm group"
                style={{ borderRadius: "var(--radius-card, 12px)" }}
              >
                {img.url ? (
                  <img
                    src={normalizeImageSrc(img)}
                    alt=""
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-current/20">
                    <Camera className="w-6 h-6" />
                  </div>
                )}
              </div>
            )
          )}
        </div>
      </div>
    );
  };

  const renderReservationsPage = () => {
    return (
      <div className="space-y-6 animate-in fade-in duration-300">
        <div className="text-center">
          <div
            className="w-16 h-16 mx-auto mb-4 rounded-full flex items-center justify-center"
            style={{ backgroundColor: `${primaryColor}20` }}
          >
            <CalendarCheck
              className="w-8 h-8"
              style={{ color: primaryColor }}
            />
          </div>
          <h2 className={styles.titleClass}>Reservierung</h2>
          <p className={`${styles.bodyClass} opacity-70`}>
            Buchen Sie Ihren Tisch online
          </p>
        </div>

        <div
          className="space-y-4 p-4 border border-current/10 bg-white/5"
          style={{ borderRadius: "var(--radius-card, 16px)" }}
        >
          {/* Form Fields (Preview Only) */}
          {[
            { label: "Datum", icon: Calendar, placeholder: "Datum wählen..." },
            { label: "Uhrzeit", icon: Clock, placeholder: "Zeit wählen..." },
            { label: "Anzahl Gäste", icon: Users, placeholder: "2 Personen" },
          ].map(({ label, icon: Icon, placeholder }) => (
            <div key={label}>
              <label className="block text-xs font-bold mb-2 opacity-70">
                {label}
              </label>
              <div
                className="flex items-center gap-2 p-3 border border-current/10 bg-white/50"
                style={{ borderRadius: "var(--radius-button, 12px)" }}
              >
                <Icon className="w-4 h-4 opacity-50" />
                <span className="text-sm opacity-70">{placeholder}</span>
              </div>
            </div>
          ))}

          <div>
            <label className="block text-xs font-bold mb-2 opacity-70">
              Name
            </label>
            <div
              className="p-3 border border-current/10 bg-white/50"
              style={{ borderRadius: "var(--radius-button, 12px)" }}
            >
              <span className="text-sm opacity-50">Ihr Name...</span>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold mb-2 opacity-70">
              Telefon / E-Mail
            </label>
            <div
              className="p-3 border border-current/10 bg-white/50"
              style={{ borderRadius: "var(--radius-button, 12px)" }}
            >
              <span className="text-sm opacity-50">
                Kontakt für Bestätigung...
              </span>
            </div>
          </div>
        </div>

        {reservationsEnabled && (
          <ReservationButton
            color={reservationButtonColor}
            textColor={reservationButtonTextColor}
            shape={reservationButtonShape as "rounded" | "pill" | "square"}
            className="w-full shadow-lg"
          >
            Reservierung anfragen
          </ReservationButton>
        )}

        <div className="text-center opacity-60 text-xs space-y-1">
          <p>Sie erhalten eine Bestätigung per E-Mail</p>
          <p className="flex items-center justify-center gap-1">
            <Phone className="w-3 h-3" />
            Oder rufen Sie uns an
          </p>
        </div>
      </div>
    );
  };

  const renderContent = () => {
    switch (previewState.activePage) {
      case "home":
        return renderHomePage();
      case "menu":
        return renderMenuPage();
      case "contact":
        return renderContactPage();
      case "gallery":
        return renderGalleryPage();
      case "reservations":
        return renderReservationsPage();
      default:
        return (
          <div className="p-10 text-center opacity-50 pt-20">
            Seite nicht gefunden
          </div>
        );
    }
  };

  // ==========================================
  // RENDER
  // ==========================================
  return (
    <div
      className="h-full w-full relative flex flex-col transition-colors duration-300 overflow-hidden pointer-events-auto select-none"
      style={styles.wrapper}
      onWheel={(e) => e.stopPropagation()}
    >
      {/* Navigation Header - SHARED COMPONENT */}
      <Navigation
        businessName={businessName}
        businessType={businessType}
        logo={logo?.url || null}
        headerFontColor={headerFontColor}
        headerFontSize={headerFontSize}
        headerBackgroundColor={headerBackgroundColor}
        onlineOrdering={onlineOrdering}
        cartCount={cartItems.length}
        menuOpen={previewState.menuOpen}
        onToggleMenu={toggleMenu}
        onNavigateHome={() => navigateToPage("home")}
        isPreview={true}
        className={styles.nav}
      />

      {/* Menu Overlay - SHARED COMPONENT */}
      <MenuOverlay
        isOpen={previewState.menuOpen}
        backgroundColor={backgroundColor}
        fontColor={fontColor}
        menuItems={navigationMenu}
        onClose={closeMenu}
        onNavigate={navigateToPage}
        isPreview={true}
      />

      {/* Scroll Container */}
      <div
        data-preview-scroll="true"
        className="flex-1 overflow-y-auto no-scrollbar scroll-smooth relative z-10"
        style={{
          WebkitOverflowScrolling: "touch",
          overscrollBehaviorY: "contain",
        }}
      >
        <div className={styles.page}>{renderContent()}</div>
        <div className="h-12 w-full" />
      </div>

      {/* Dish Modal - SHARED COMPONENT */}
      <DishModal
        dish={selectedDish}
        currentImageIndex={currentImageIndex}
        fontColor={fontColor}
        backgroundColor={backgroundColor}
        priceColor={priceColor}
        primaryColor={primaryColor}
        onlineOrdering={onlineOrdering}
        onClose={closeDishModal}
        onPrevImage={prevImage}
        onNextImage={nextImage}
        onSetImageIndex={setCurrentImageIndex}
        onAddToCart={addToCart}
        isPreview={true}
      />
    </div>
  );
}

