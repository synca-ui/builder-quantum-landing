/**
 * Shared BusinessHoursSection Component
 *
 * Wrapper um OpeningHours Component für bessere Sektion-Integration
 * Zeigt Öffnungszeiten als vollständige Sektion mit Titel und Styling
 *
 * Wird verwendet in:
 * - TemplatePreviewContent.tsx (Editor)
 * - AppRenderer.tsx (Live-Seite)
 */

import React, { memo } from "react";
import { Clock, MapPin } from "lucide-react";
import { OpeningHours } from "./OpeningHours";
import type { OpeningHours as OpeningHoursType } from "@/types/domain";

// ============================================
// TYPES
// ============================================

export interface BusinessHoursSectionProps {
  /** Öffnungszeiten-Daten */
  businessHours: OpeningHoursType;
  /** Standort/Adresse (optional) */
  location?: string;
  /** Geschäftsname */
  businessName?: string;
  /** Schriftfarbe */
  fontColor: string;
  /** Hintergrundfarbe */
  backgroundColor: string;
  /** Primärfarbe für Akzente */
  primaryColor?: string;
  /** Kompakter Modus (nur heute) */
  compact?: boolean;
  /** Initial erweitert anzeigen */
  initialExpanded?: boolean;
  /** Preview-Modus (Editor) */
  isPreview?: boolean;
  /** Zusätzliche CSS-Klassen */
  className?: string;
}

// ============================================
// MAIN COMPONENT
// ============================================

export const BusinessHoursSection = memo(
  ({
    businessHours,
    location,
    businessName,
    fontColor,
    backgroundColor,
    primaryColor = fontColor,
    compact = false,
    initialExpanded = false,
    isPreview = false,
    className = "",
  }: BusinessHoursSectionProps) => {
    // Prüfen ob Öffnungszeiten verfügbar sind
    const hasHours = businessHours && Object.keys(businessHours).length > 0;

    if (!hasHours) {
      return (
        <section
          className={`py-12 px-4 ${className}`}
          style={{ backgroundColor, color: fontColor }}
        >
          <div className="max-w-4xl mx-auto text-center">
            <div className="flex items-center justify-center mb-4">
              <Clock className="w-6 h-6 mr-2" style={{ color: primaryColor }} />
              <h2 className="text-2xl font-bold">Öffnungszeiten</h2>
            </div>
            <p className="text-lg opacity-60">
              Öffnungszeiten werden geladen...
            </p>
          </div>
        </section>
      );
    }

    return (
      <section
        className={`${isPreview ? "py-6" : "py-12"} px-4 ${className}`}
        style={{ backgroundColor, color: fontColor }}
      >
        <div className="max-w-4xl mx-auto">
          {/* Section Header */}
          <div className="text-center mb-8">
            <div className="flex items-center justify-center mb-4">
              <Clock className="w-8 h-8 mr-3" style={{ color: primaryColor }} />
              <h2 className="text-3xl font-bold">Öffnungszeiten</h2>
            </div>

            {businessName && (
              <p className="text-lg opacity-80 mb-2">
                Besuchen Sie {businessName}
              </p>
            )}

            {location && (
              <div className="flex items-center justify-center text-base opacity-70">
                <MapPin className="w-4 h-4 mr-2" />
                <span>{location}</span>
              </div>
            )}
          </div>

          {/* Opening Hours Content */}
          <div className="flex justify-center">
            <div className="w-full max-w-md">
              <OpeningHours
                hours={businessHours}
                location={location}
                fontColor={fontColor}
                compact={compact}
                initialExpanded={initialExpanded}
                isPreview={isPreview}
                className="bg-white/5 backdrop-blur-sm rounded-xl p-6 border border-white/10"
              />
            </div>
          </div>

          {/* Call to Action (optional) */}
          {!isPreview && (
            <div className="text-center mt-8">
              <p className="text-sm opacity-60">
                Haben Sie Fragen zu unseren Öffnungszeiten?{" "}
                <a
                  href="tel:+49"
                  className="underline hover:no-underline transition-all"
                  style={{ color: primaryColor }}
                >
                  Rufen Sie uns an
                </a>
              </p>
            </div>
          )}
        </div>
      </section>
    );
  },
);

BusinessHoursSection.displayName = "BusinessHoursSection";
