/**
 * Shared Hero Component
 *
 * Hero-Bereich mit Slogan, Beschreibung und CTA-Buttons
 *
 * Wird verwendet in:
 * - TemplatePreviewContent.tsx (Editor)
 * - AppRenderer.tsx (Live-Seite)
 */

import React, { memo } from 'react';
import { ArrowRight } from 'lucide-react';

// ============================================
// TYPES
// ============================================

export interface HeroProps {
  /** Hauptslogan/Überschrift */
  slogan?: string;
  /** Beschreibungstext */
  description?: string;
  /** Primärfarbe für Buttons */
  primaryColor: string;
  /** Schriftfarbe */
  fontColor: string;
  /** Hintergrundfarbe */
  backgroundColor: string;
  /** Online-Bestellung aktiviert? */
  onlineOrdering?: boolean;
  /** Reservierungen aktiviert? */
  reservationsEnabled?: boolean;
  /** Reservierungs-Button Farbe */
  reservationButtonColor?: string;
  /** Reservierungs-Button Textfarbe */
  reservationButtonTextColor?: string;
  /** Reservierungs-Button Form */
  reservationButtonShape?: 'rounded' | 'pill' | 'square';
  /** Handler für "Bestellen" Button */
  onOrderClick?: () => void;
  /** Handler für "Reservieren" Button */
  onReservationClick?: () => void;
  /** Preview-Modus (Editor) */
  isPreview?: boolean;
  /** Zusätzliche CSS-Klassen */
  className?: string;
}

// ============================================
// HELPER: Button Shape zu Border-Radius
// ============================================

function getButtonRadius(shape: 'rounded' | 'pill' | 'square'): string {
  switch (shape) {
    case 'pill': return '9999px';
    case 'square': return '0px';
    case 'rounded':
    default: return 'var(--radius-button, 12px)';
  }
}

// ============================================
// COMPONENT
// ============================================

export const Hero = memo(function Hero({
  slogan,
  description,
  primaryColor,
  fontColor,
  backgroundColor,
  onlineOrdering = false,
  reservationsEnabled = false,
  reservationButtonColor,
  reservationButtonTextColor = '#FFFFFF',
  reservationButtonShape = 'rounded',
  onOrderClick,
  onReservationClick,
  isPreview = false,
  className = '',
}: HeroProps) {

  const handleOrderClick = () => {
    if (onOrderClick) onOrderClick();
  };

  const handleReservationClick = () => {
    if (onReservationClick) onReservationClick();
  };

  const buttonRadius = getButtonRadius(reservationButtonShape);
  const effectiveReservationColor = reservationButtonColor || primaryColor;

  return (
    <section
      className={`text-center py-8 px-4 flex flex-col items-center ${className}`}
      style={{ color: fontColor }}
    >
      {/* Slogan / Headline */}
      <h1
        className="text-3xl font-bold mb-4 leading-tight max-w-[90%]"
        style={{
          color: fontColor,
          fontSize: 'var(--font-h1-size, 2rem)',
          fontWeight: 'var(--font-h1-weight, 700)',
          lineHeight: 'var(--font-h1-line, 1.2)',
        }}
      >
        {slogan || 'Willkommen'}
      </h1>

      {/* Description */}
      <p
        className="max-w-[90%] text-center opacity-80 leading-relaxed"
        style={{
          color: fontColor,
          fontSize: 'var(--font-body-size, 1rem)',
          lineHeight: 'var(--font-body-line, 1.6)',
        }}
      >
        {description || 'Wir bieten beste Qualität und eine tolle Atmosphäre.'}
      </p>

      {/* CTA Buttons */}
      <div className="mt-6 w-full px-4 space-y-3">
        {/* Primary CTA: Online Bestellen */}
        {onlineOrdering && (
          <button
            onClick={handleOrderClick}
            className="w-full py-3 px-6 font-bold text-base shadow-lg hover:scale-105 active:scale-95 transition-all text-white"
            style={{
              backgroundColor: primaryColor,
              borderRadius: 'var(--radius-button, 9999px)',
              boxShadow: 'var(--shadow-button, 0 4px 14px rgba(0,0,0,0.15))',
            }}
          >
            Jetzt bestellen
          </button>
        )}

        {/* Secondary CTA: Reservieren */}
        {reservationsEnabled && (
          <button
            onClick={handleReservationClick}
            className="w-full py-3 px-6 font-bold text-base shadow-lg hover:scale-105 active:scale-95 transition-all flex items-center justify-center gap-2"
            style={{
              backgroundColor: effectiveReservationColor,
              color: reservationButtonTextColor,
              borderRadius: buttonRadius,
              boxShadow: 'var(--shadow-button, 0 4px 14px rgba(0,0,0,0.15))',
            }}
          >
            Tisch reservieren
          </button>
        )}
      </div>
    </section>
  );
});

export default Hero;

