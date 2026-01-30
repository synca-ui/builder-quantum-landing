/**
 * Shared HeroSection Component
 *
 * Erweiterte Hero-Component mit Business-spezifischen Features
 * Integration von Name, Beschreibung, Hero-Image und CTA-Buttons
 *
 * Wird verwendet in:
 * - TemplatePreviewContent.tsx (Editor)
 * - AppRenderer.tsx (Live-Seite)
 */

import React, { memo } from 'react';
import { ArrowRight, MapPin, Clock } from 'lucide-react';

// ============================================
// TYPES
// ============================================

export interface HeroSectionProps {
  /** Geschäftsname */
  name: string;
  /** Hauptslogan/Überschrift */
  slogan?: string;
  /** Beschreibungstext */
  description?: string;
  /** Hero-Hintergrundbild */
  heroImage?: string;
  /** Standort */
  location?: string;
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
  /** Button-Farbe */
  buttonColor?: string;
  /** Button-Textfarbe */
  buttonTextColor?: string;
  /** Handler für "Bestellen" Button */
  onOrderClick?: () => void;
  /** Handler für "Reservieren" Button */
  onReservationClick?: () => void;
  /** Handler für "Mehr erfahren" */
  onLearnMoreClick?: () => void;
  /** Preview-Modus (Editor) */
  isPreview?: boolean;
  /** Zusätzliche CSS-Klassen */
  className?: string;
}

// ============================================
// HELPERS
// ============================================

const getButtonShapeClass = (shape: string = 'rounded') => {
  switch (shape) {
    case 'pill':
      return 'rounded-full';
    case 'square':
      return 'rounded-none';
    case 'rounded':
    default:
      return 'rounded-lg';
  }
};

// ============================================
// MAIN COMPONENT
// ============================================

export const HeroSection = memo(({
  name,
  slogan,
  description,
  heroImage,
  location,
  primaryColor,
  fontColor,
  backgroundColor,
  onlineOrdering = false,
  reservationsEnabled = false,
  reservationButtonColor,
  reservationButtonTextColor = '#ffffff',
  reservationButtonShape = 'rounded',
  buttonColor,
  buttonTextColor = '#ffffff',
  onOrderClick,
  onReservationClick,
  onLearnMoreClick,
  isPreview = false,
  className = ''
}: HeroSectionProps) => {
  // Button-Farben bestimmen
  const primaryButtonColor = buttonColor || primaryColor;
  const reservationColor = reservationButtonColor || primaryColor;

  return (
    <section
      className={`relative ${isPreview ? 'min-h-[40vh] py-8' : 'min-h-[80vh] py-16'} flex items-center justify-center px-4 ${className}`}
      style={{ backgroundColor, color: fontColor }}
    >
      {/* Hero Background Image */}
      {heroImage && (
        <div className="absolute inset-0 z-0">
          <img
            src={heroImage}
            alt={name}
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-black/40"></div>
        </div>
      )}

      {/* Content */}
      <div className="relative z-10 max-w-4xl mx-auto text-center">
        {/* Business Name */}
        <h1 className="text-5xl md:text-7xl font-bold mb-6 text-white drop-shadow-lg">
          {name}
        </h1>

        {/* Slogan */}
        {slogan && (
          <h2 className="text-2xl md:text-3xl font-light mb-6 text-white/90 drop-shadow-lg">
            {slogan}
          </h2>
        )}

        {/* Description */}
        {description && (
          <p className="text-lg md:text-xl mb-8 max-w-2xl mx-auto text-white/80 drop-shadow-lg leading-relaxed">
            {description}
          </p>
        )}

        {/* Location */}
        {location && (
          <div className="flex items-center justify-center mb-8 text-white/70">
            <MapPin className="w-5 h-5 mr-2" />
            <span className="text-lg">{location}</span>
          </div>
        )}

        {/* Call-to-Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
          {/* Reservation Button */}
          {reservationsEnabled && (
            <button
              onClick={onReservationClick}
              disabled={isPreview}
              className={`px-8 py-3 font-semibold text-lg transition-all duration-200 hover:scale-105 disabled:cursor-not-allowed shadow-lg ${getButtonShapeClass(reservationButtonShape)}`}
              style={{
                backgroundColor: reservationColor,
                color: reservationButtonTextColor
              }}
            >
              Tisch reservieren
            </button>
          )}

          {/* Order Button */}
          {onlineOrdering && (
            <button
              onClick={onOrderClick}
              disabled={isPreview}
              className={`px-8 py-3 font-semibold text-lg transition-all duration-200 hover:scale-105 disabled:cursor-not-allowed shadow-lg ${getButtonShapeClass('rounded')}`}
              style={{
                backgroundColor: primaryButtonColor,
                color: buttonTextColor
              }}
            >
              Jetzt bestellen
            </button>
          )}

          {/* Learn More Button */}
          {onLearnMoreClick && (
            <button
              onClick={onLearnMoreClick}
              disabled={isPreview}
              className="px-8 py-3 font-semibold text-lg bg-white/20 text-white rounded-lg transition-all duration-200 hover:bg-white/30 backdrop-blur-sm border border-white/30 disabled:cursor-not-allowed shadow-lg flex items-center"
            >
              Mehr erfahren
              <ArrowRight className="w-5 h-5 ml-2" />
            </button>
          )}
        </div>

        {/* Quick Info */}
        {!isPreview && (
          <div className="mt-12 flex flex-col sm:flex-row gap-6 justify-center items-center text-white/60 text-sm">
            <div className="flex items-center">
              <Clock className="w-4 h-4 mr-2" />
              <span>Täglich geöffnet</span>
            </div>
            <div className="flex items-center">
              <MapPin className="w-4 h-4 mr-2" />
              <span>Vor Ort & Lieferung</span>
            </div>
          </div>
        )}
      </div>

      {/* Scroll Indicator */}
      {!isPreview && (
        <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2 animate-bounce">
          <div className="w-6 h-10 border-2 border-white/50 rounded-full flex justify-center">
            <div className="w-1 h-3 bg-white/50 rounded-full mt-2"></div>
          </div>
        </div>
      )}
    </section>
  );
});

HeroSection.displayName = 'HeroSection';
