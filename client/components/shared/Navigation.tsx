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

import React, { memo } from 'react';
import { Menu, X, ShoppingBag, Coffee, Utensils } from 'lucide-react';

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
}

// ============================================
// HELPER: Font Size Mapping
// ============================================

function getHeaderFontClass(size: string): string {
  const sizeMap: Record<string, string> = {
    'xs': 'text-[10px]',
    'small': 'text-xs',
    'medium': 'text-sm',
    'large': 'text-base',
    'xl': 'text-lg',
    '2xl': 'text-xl',
    '3xl': 'text-2xl',
    '4xl': 'text-[28px]',
    '5xl': 'text-[32px]',
  };
  return sizeMap[size] || 'text-sm';
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
  onlineOrdering = false,
  cartCount = 0,
  menuOpen,
  onToggleMenu,
  onNavigateHome,
  onCartClick,
  isPreview = false,
  className = '',
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

  // Business-Type Icon
  const BusinessIcon = businessType === 'cafe' ? Coffee : Utensils;

  return (
    <nav
      className={`
        absolute top-0 left-0 right-0 z-30 
        px-5 pt-6 pb-4 
        flex items-center justify-between 
        border-b transition-all
        ${className}
      `}
      style={{
        backgroundColor: headerBackgroundColor,
        color: headerFontColor,
        borderColor: `${headerFontColor}10`,
        // CSS-Variable für Backdrop-Blur (Template-abhängig)
        backdropFilter: 'var(--nav-backdrop, none)',
        WebkitBackdropFilter: 'var(--nav-backdrop, none)',
      }}
    >
      {/* Left: Logo + Business Name */}
      <div className="flex items-center gap-2 overflow-hidden">
        {logo ? (
          <img
            src={logo}
            alt={`${businessName} Logo`}
            className="w-8 h-8 shrink-0 object-cover"
            style={{ borderRadius: 'var(--radius-button, 8px)' }}
          />
        ) : (
          <div
            className="w-8 h-8 shrink-0 flex items-center justify-center"
            style={{
              backgroundColor: `${headerFontColor}15`,
              borderRadius: 'var(--radius-button, 8px)',
            }}
          >
            <BusinessIcon className="w-4 h-4" />
          </div>
        )}
        <span
          className={`font-bold cursor-pointer truncate ${fontClass}`}
          onClick={handleHomeClick}
          style={{ color: headerFontColor }}
        >
          {businessName || 'Mein Restaurant'}
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
            className="relative cursor-pointer p-1 transition-transform active:scale-90"
            aria-label="Warenkorb"
          >
            <ShoppingBag className="w-5 h-5 opacity-90" />
            {cartCount > 0 && (
              <span
                className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-red-500 text-white text-[9px] flex items-center justify-center rounded-full font-bold"
                style={{ boxShadow: 'var(--shadow-button, 0 2px 4px rgba(0,0,0,0.1))' }}
              >
                {cartCount}
              </span>
            )}
          </button>
        )}

        {/* Hamburger Menu Toggle */}
        <button
          onClick={handleMenuToggle}
          className="p-1 active:scale-90 transition-transform"
          aria-label={menuOpen ? 'Menü schließen' : 'Menü öffnen'}
          aria-expanded={menuOpen}
        >
          {menuOpen ? (
            <X className="w-6 h-6" />
          ) : (
            <Menu className="w-6 h-6" />
          )}
        </button>
      </div>
    </nav>
  );
});

export default Navigation;

