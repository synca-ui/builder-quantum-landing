/**
 * Shared Navigation Component
 *
 * Wird verwendet in:
 * - TemplatePreviewContent.tsx (Editor)
 * - AppRenderer.tsx (Live-Seite)
 *
 * WICHTIG: Keine harten Tailwind-Klassen für Rundungen/Schatten!
 * Nutzt CSS-Variablen aus styleInjector.ts
 *
 * Kopfzeilen-Varianten kommen aus templateLayout.ts (`nav`): Doppellinie,
 * Versalien, Stempel, Serife für die Papier-Templates — Fett, Pille, Balken,
 * Siegel, Schild, Mitte, Mono, Streifen, Kreis, Gestrichelt für die zweite
 * Runde. „standard“ ist die Kachel-Kopfzeile des Bestands.
 */

import React, { memo } from "react";
import {
  Menu,
  X,
  ShoppingBag,
  Coffee,
  Utensils,
  Wine,
  Store,
  LayoutGrid,
} from "lucide-react";
import { getTemplateLayout, initiale, textAufFarbe } from "@/lib/templateLayout";

// ============================================
// TYPES
// ============================================

export interface NavigationProps {
  /** Restaurant/Business Name */
  businessName: string;
  /** Business Type für Icon-Auswahl */
  businessType: string;
  /** Logo URL oder null */
  logo: string | null;
  /** Header Schriftfarbe */
  headerFontColor: string;
  /** Header Schriftgröße */
  headerFontSize: string;
  /** Header Hintergrundfarbe */
  headerBackgroundColor: string;
  /** Online-Bestellung aktiviert? */
  onlineOrdering?: boolean;
  /** Anzahl Items im Warenkorb */
  cartCount?: number;
  /** Ist das Mobile-Menü offen? */
  menuOpen: boolean;
  /** Toggle Mobile-Menü */
  onToggleMenu: () => void;
  /** Navigation zur Startseite */
  onNavigateHome: () => void;
  /** Warenkorb-Klick Handler */
  onCartClick?: () => void;
  /**
   * Preview-Modus: Deaktiviert echte Interaktionen im Editor
   * Im Editor: true (Klicks werden abgefangen)
   * Auf Live-Seite: false (echte Navigation)
   */
  isPreview?: boolean;
  /** Zusätzliche CSS-Klassen */
  className?: string;
  /** Hintergrundfarbe der Seite (Fallback für Sticky Header) */
  backgroundColor?: string;
  /** Template-ID für Kopfzeilen-Varianten (templateLayout.ts) */
  template?: string;
  /** Akzentfarbe („Menü“-Label, Stempel-Logo, Streifen) — Primärfarbe des Designs */
  accentColor?: string;
}

// ============================================
// HELPER: Font Size Mapping
// ============================================

function getHeaderFontClass(size: string): string {
  const sizeMap: Record<string, string> = {
    xs: "text-[10px]",
    small: "text-xs",
    medium: "text-sm",
    large: "text-base",
    xl: "text-lg",
    "2xl": "text-xl",
    "3xl": "text-2xl",
    "4xl": "text-[28px]",
    "5xl": "text-[32px]",
  };
  return sizeMap[size] || "text-sm";
}

// ============================================
// COMPONENT
// ============================================

export const Navigation = memo(function Navigation({
  businessName,
  businessType,
  logo,
  headerFontColor,
  headerFontSize,
  headerBackgroundColor,
  backgroundColor = "#ffffff",
  onlineOrdering = false,
  cartCount = 0,
  menuOpen,
  onToggleMenu,
  onNavigateHome,
  onCartClick,
  isPreview = false,
  className = "",
  template,
  accentColor,
}: NavigationProps) {
  const fontClass = getHeaderFontClass(headerFontSize);

  // Kopfzeilen-Variante des Templates (Bestand: "standard" — dieselbe Form
  // wie bisher). Das Attribut steht bei jedem Template, damit der
  // Paritätstest Vorschau und Live-Seite überall vergleichen kann.
  const variante = getTemplateLayout(template).nav;
  const eigen = variante !== "standard";
  const akzent = accentColor || headerFontColor;
  const display: React.CSSProperties =
    variante === "mono"
      ? { fontFamily: "var(--font-template-mono)" }
      : eigen
        ? { fontFamily: "var(--font-template-display)" }
        : {};
  const unterkante: React.CSSProperties = (() => {
    switch (variante) {
      case "doppellinie":
        return { borderBottom: `3px double ${headerFontColor}` };
      case "versal":
      case "serif":
        return { borderBottom: `1px solid ${headerFontColor}` };
      case "stempel":
      case "fett":
      case "pille":
      case "kreis":
        return { borderBottom: "none" };
      case "balken":
      case "schild":
        return { borderBottom: `3px solid ${headerFontColor}` };
      case "siegel":
      case "mitte":
      case "mono":
        return { borderBottom: `1px solid ${headerFontColor}26` };
      case "streifen":
        return {
          borderBottom: `1px solid ${headerFontColor}26`,
          borderTop: `4px solid ${akzent}`,
        };
      case "gestrichelt":
        return { borderBottom: `1px dashed ${headerFontColor}66` };
      default:
        return {};
    }
  })();
  const nameKlasse = (() => {
    switch (variante) {
      case "versal":
        return "uppercase tracking-[0.22em] text-xs font-bold cursor-pointer truncate hover:opacity-80 transition-opacity";
      case "doppellinie":
      case "serif":
        return `font-medium cursor-pointer truncate ${fontClass} hover:opacity-80 transition-opacity`;
      case "stempel":
        return `font-extrabold cursor-pointer truncate ${fontClass} hover:opacity-80 transition-opacity`;
      case "fett":
      case "streifen":
      case "kreis":
        return `font-extrabold tracking-tight cursor-pointer truncate ${fontClass} hover:opacity-80 transition-opacity`;
      case "pille":
        return `font-bold cursor-pointer truncate px-3 py-1 rounded-full ${fontClass} hover:opacity-80 transition-opacity`;
      case "balken":
        return "uppercase tracking-[0.12em] text-xs font-bold cursor-pointer truncate hover:opacity-80 transition-opacity";
      case "schild":
        return "uppercase tracking-[0.08em] text-[11px] font-bold cursor-pointer truncate hover:opacity-80 transition-opacity";
      case "mono":
        return "uppercase tracking-[0.14em] text-xs font-bold cursor-pointer truncate hover:opacity-80 transition-opacity";
      case "siegel":
        return `font-medium tracking-tight cursor-pointer truncate ${fontClass} hover:opacity-80 transition-opacity`;
      case "mitte":
        return `font-medium cursor-pointer truncate ${fontClass} hover:opacity-80 transition-opacity absolute left-1/2 -translate-x-1/2 max-w-[55%]`;
      case "gestrichelt":
        return `font-medium cursor-pointer truncate ${fontClass} hover:opacity-80 transition-opacity`;
      default:
        return `font-bold cursor-pointer truncate ${fontClass} hover:opacity-80 transition-opacity`;
    }
  })();
  const nameStyle: React.CSSProperties =
    variante === "pille" ? { backgroundColor: `${akzent}1A` } : {};
  const MenuIcon =
    variante === "versal" || variante === "stempel" || variante === "schild"
      ? LayoutGrid
      : Menu;
  const zeichen = initiale(businessName || "M");

  // Im Preview-Modus: Klicks abfangen aber visuell darstellen
  const handleHomeClick = () => {
    if (!isPreview) {
      onNavigateHome();
    } else {
      // Im Preview trotzdem aufrufen für interne Navigation
      onNavigateHome();
    }
  };

  const handleCartClick = () => {
    if (!isPreview && onCartClick) {
      onCartClick();
    }
  };

  const handleMenuToggle = () => {
    onToggleMenu();
  };

  const getBusinessIcon = () => {
    const iconMap: Record<
      string,
      React.ComponentType<{ className?: string }>
    > = {
      cafe: Coffee,
      restaurant: Utensils,
      bar: Wine,
      shop: Store,
      default: ShoppingBag,
    };

    return iconMap[businessType?.toLowerCase()] || iconMap.default;
  };
  // Business-Type Icon
  const BusinessIcon = businessType === "cafe" ? Coffee : Utensils;

  /** Platzhalter links, wenn kein Logo da ist — je nach Kopfzeilen-Form. */
  const platzhalter = (() => {
    switch (variante) {
      // Zettel: Stempelkasten in der Akzentfarbe mit dem Anfangsbuchstaben.
      case "stempel":
        return (
          <div
            className="w-8 h-8 shrink-0 flex items-center justify-center font-extrabold text-sm"
            style={{
              ...display,
              backgroundColor: accentColor || headerFontColor,
              color: "#FFFFFF",
              borderRadius: 0,
            }}
            aria-hidden
          >
            {(businessName || "M").trim().charAt(0).toUpperCase()}
          </div>
        );
      // Imbissbude: schwarzer Kasten, Buchstabe in der Kopfzeilenfarbe.
      case "schild":
        return (
          <div
            className="w-8 h-8 shrink-0 flex items-center justify-center font-bold text-sm"
            style={{
              ...display,
              backgroundColor: headerFontColor,
              color: headerBackgroundColor || backgroundColor,
              borderRadius: 0,
            }}
            aria-hidden
          >
            {zeichen}
          </div>
        );
      // Aperitivo: Kreis in der Akzentfarbe.
      case "kreis":
        return (
          <div
            className="w-8 h-8 shrink-0 rounded-full flex items-center justify-center font-extrabold text-sm"
            style={{ ...display, backgroundColor: akzent, color: textAufFarbe(akzent) }}
            aria-hidden
          >
            {zeichen}
          </div>
        );
      // Kaffeehaus: dünner Kreis, Buchstabe in der Serife.
      case "mitte":
        return (
          <div
            className="w-8 h-8 shrink-0 rounded-full flex items-center justify-center text-base"
            style={{ ...display, border: `1px solid ${headerFontColor}`, color: headerFontColor }}
            aria-hidden
          >
            {zeichen}
          </div>
        );
      // Purist: nur ein kleines rotes Quadrat vor dem Namen.
      case "siegel":
        return (
          <span
            className="w-2 h-2 shrink-0"
            style={{ backgroundColor: akzent }}
            aria-hidden
          />
        );
      default:
        // ✅ FIX: Icon als Placeholder
        return (
          <div
            className="w-8 h-8 shrink-0 flex items-center justify-center transition-all hover:scale-110"
            style={{
              backgroundColor: `${headerFontColor}15`,
              borderRadius: "var(--radius-button, 8px)",
            }}
          >
            <BusinessIcon
              className="w-4 h-4"
              style={{ color: headerFontColor }}
            />
          </div>
        );
    }
  })();

  return (
    <nav
      className={
        className ||
        `
        absolute top-0 left-0 right-0 z-30 
        px-5 pt-6 pb-4 
        flex items-center justify-between 
        border-b transition-all
      `
      }
      style={{
        backgroundColor: headerBackgroundColor || backgroundColor, // Ensure fallback
        color: headerFontColor,
        borderColor: `${headerFontColor}10`,
        backdropFilter: "var(--nav-backdrop, blur(8px))", // Ensure blur is active
        WebkitBackdropFilter: "var(--nav-backdrop, blur(8px))",
        // Auf der echten Site (viewport-fit=cover) zieht sich der Header unter
        // die Notch: Padding um die Safe-Area aufstocken, damit die Header-
        // Farbe die Statusleiste füllt. In der Konfigurator-Vorschau gibt es
        // keine echte Notch — dort bleibt das Padding der className maßgeblich.
        ...(isPreview
          ? {}
          : { paddingTop: "calc(1rem + env(safe-area-inset-top, 0px))" }),
        ...unterkante,
      }}
      data-nav-variant={variante}
    >
      {/* Left: Logo + Business Name */}
      <div className="flex items-center gap-2 overflow-hidden">
        {logo ? (
          // ✅ Echtes Logo
          <img
            src={logo}
            alt={`${businessName} Logo`}
            className="w-8 h-8 shrink-0 object-cover"
            style={{ borderRadius: "var(--radius-button, 8px)" }}
            onError={(e) => {
              console.error("[Navigation] Logo load failed:", logo);
              // Fallback auf Icon
              e.currentTarget.style.display = "none";
            }}
          />
        ) : (
          platzhalter
        )}

        <span
          className={nameKlasse}
          onClick={handleHomeClick}
          style={{ ...display, ...nameStyle, color: headerFontColor }}
        >
          {businessName || "Mein Restaurant"}
        </span>
      </div>

      {/* Right: Cart + Menu Toggle */}
      <div
        className="flex items-center gap-3 shrink-0"
        style={{ color: headerFontColor }}
      >
        {/* Shopping Cart (nur wenn Online-Bestellung aktiv) */}
        {onlineOrdering && (
          <button
            onClick={handleCartClick}
            className="relative cursor-pointer p-1 transition-transform active:scale-90 hover:opacity-80"
            aria-label="Warenkorb"
          >
            <ShoppingBag className="w-5 h-5 opacity-90" />
            {cartCount > 0 && (
              <span
                className="absolute -top-1 -right-1 min-w-[14px] h-3.5 px-1 bg-red-500 text-white text-[9px] flex items-center justify-center rounded-full font-bold"
                style={{
                  boxShadow: "var(--shadow-button, 0 2px 4px rgba(0,0,0,0.1))",
                  lineHeight: 1,
                }}
              >
                {cartCount > 9 ? "9+" : cartCount}
              </span>
            )}
          </button>
        )}

        {/* Hamburger Menu Toggle */}
        <button
          onClick={handleMenuToggle}
          className={`p-1 active:scale-90 transition-transform hover:opacity-80${
            eigen ? " flex items-center gap-2" : ""
          }`}
          aria-label={menuOpen ? "Menü schließen" : "Menü öffnen"}
          aria-expanded={menuOpen}
        >
          {eigen && (
            // Gesetzte Karten schreiben „Menü“ dazu — wie auf dem Aushang.
            <span
              className="text-[10px] uppercase tracking-[0.22em] font-bold"
              style={{ ...(variante === "mono" ? display : {}), color: akzent }}
              aria-hidden
            >
              {menuOpen ? "Zu" : "Menü"}
            </span>
          )}
          {menuOpen ? (
            <X className={eigen ? "w-5 h-5" : "w-6 h-6"} />
          ) : (
            <MenuIcon className={eigen ? "w-5 h-5" : "w-6 h-6"} />
          )}
        </button>
      </div>
    </nav>
  );
});

export default Navigation;
