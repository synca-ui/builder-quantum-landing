/**
 * Shared Navigation Component
 *
 * Wird verwendet in:
 * - TemplatePreviewContent.tsx (Editor)
 * - AppRenderer.tsx (Live-Seite)
 *
 * WICHTIG: Keine harten Tailwind-Klassen für Rundungen/Schatten!
 * Nutzt CSS-Variablen aus styleInjector.ts
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
} from "lucide-react";

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
}: NavigationProps) {
  const fontClass = getHeaderFontClass(headerFontSize);

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
      }}
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
          // ✅ FIX: Icon als Placeholder
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
        )}

        <span
          className={`font-bold cursor-pointer truncate ${fontClass} hover:opacity-80 transition-opacity`}
          onClick={handleHomeClick}
          style={{ color: headerFontColor }}
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
          className="p-1 active:scale-90 transition-transform hover:opacity-80"
          aria-label={menuOpen ? "Menü schließen" : "Menü öffnen"}
          aria-expanded={menuOpen}
        >
          {menuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>
      </div>
    </nav>
  );
});

export default Navigation;
