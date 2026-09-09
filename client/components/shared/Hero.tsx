/**
 * Shared Hero Component
 *
 * Hero-Bereich mit Slogan, Beschreibung und CTA-Buttons
 *
 * Wird verwendet in:
 * - TemplatePreviewContent.tsx (Editor)
 * - AppRenderer.tsx (Live-Seite)
 *
 * Templates mit eigenem Layout (templateLayout.ts) bekommen eigene Formen:
 * gesetzte Karte mit Kicker (presse), Bildband mit Versal-Titel (kiosk),
 * Rahmenkasten mit Seitenlabel (izakaya), Serifen-Titel mit kursivem
 * Kobalt-Wort (morgen). Bestands-Templates rendern unverändert.
 */

import React, { memo } from "react";
import { heroTitel, heroUntertitel, typLabel } from "@/lib/heroFallback";
import {
  getTemplateLayout,
  teileLetztesWort,
  textAufFarbe,
} from "@/lib/templateLayout";

// ============================================
// TYPES
// ============================================

export interface HeroProps {
  /** Hauptslogan/Überschrift */
  slogan?: string;
  /** Beschreibungstext */
  description?: string;
  /**
   * Für die Rückfalltexte (client/lib/heroFallback.ts): Ohne Slogan trägt
   * der Name die Überschrift, ohne Beschreibung wird „Café in Münster“
   * gezeigt — oder gar nichts, statt einer Floskel.
   */
  businessName?: string;
  businessType?: string;
  location?: string;
  /** Primärfarbe für Buttons */
  primaryColor: string;
  /** Schriftfarbe */
  fontColor: string;
  /** Hintergrundfarbe */
  backgroundColor: string;
  /** Sekundärfarbe — Schraffur des Bildbands ohne Bild (kiosk) */
  secondaryColor?: string;
  /** Template-ID für Layout-Varianten */
  template?: string;
  /** Bild für den Bildband (kiosk) — erstes Galeriebild */
  bandImage?: string | null;
  /** Kicker über dem Titel („bis 23 Uhr“, „Café · Münster“) */
  kicker?: string | null;
  /** Online-Bestellung aktiviert? */
  onlineOrdering?: boolean;
  /** Reservierungen aktiviert? */
  reservationsEnabled?: boolean;
  /** Reservierungs-Button Farbe */
  reservationButtonColor?: string;
  /** Reservierungs-Button Textfarbe */
  reservationButtonTextColor?: string;
  /** Reservierungs-Button Form */
  reservationButtonShape?: "rounded" | "pill" | "square";
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

function getButtonRadius(shape: "rounded" | "pill" | "square"): string {
  switch (shape) {
    case "pill":
      return "9999px";
    case "square":
      return "0px";
    case "rounded":
    default:
      return "var(--radius-button, 12px)";
  }
}

// ============================================
// COMPONENT
// ============================================

export const Hero = memo(function Hero({
  slogan,
  description,
  businessName,
  businessType,
  location,
  primaryColor,
  fontColor,
  backgroundColor,
  secondaryColor = "#D9D8D3",
  template,
  bandImage,
  kicker,
  onlineOrdering = false,
  reservationsEnabled = false,
  reservationButtonColor,
  reservationButtonTextColor = "#FFFFFF",
  reservationButtonShape = "rounded",
  onOrderClick,
  onReservationClick,
  isPreview = false,
  className = "",
}: HeroProps) {
  const handleOrderClick = () => {
    if (onOrderClick) onOrderClick();
  };

  const handleReservationClick = () => {
    if (onReservationClick) onReservationClick();
  };

  const buttonRadius = getButtonRadius(reservationButtonShape);
  const effectiveReservationColor = reservationButtonColor || primaryColor;

  // ==========================================
  // Templates mit eigenem Layout
  // ==========================================
  const layout = getTemplateLayout(template);
  if (layout.eigen) {
    const titel = heroTitel(slogan, businessName);
    const [kopf, letztes] = layout.kursivesLetztesWort
      ? teileLetztesWort(titel)
      : [titel, null];
    const untertitel = heroUntertitel(description, businessType, location);
    const display = "var(--font-template-display)";
    const kiosk = layout.hero === "kiosk";

    const kickerZeile = kicker ? (
      <p
        className="text-[10px] uppercase tracking-[0.22em] font-bold mb-3"
        style={{ color: primaryColor }}
      >
        {kicker}
      </p>
    ) : null;

    const ueberschrift = (
      <h1
        className="mb-3 max-w-full"
        style={{
          color: fontColor,
          fontFamily: display,
          fontSize: "var(--font-h1-size, 2rem)",
          fontWeight: "var(--font-h1-weight, 700)",
          lineHeight: "var(--font-h1-line, 1.05)",
          letterSpacing: kiosk ? "-0.01em" : undefined,
          textTransform: kiosk ? "uppercase" : undefined,
        }}
      >
        {kopf}
        {letztes && (
          <>
            {" "}
            <em
              style={{
                fontStyle: "italic",
                color: layout.hero === "morgen" ? primaryColor : undefined,
              }}
            >
              {letztes}
            </em>
          </>
        )}
      </h1>
    );

    const unterzeile = untertitel ? (
      <p
        className="opacity-75 leading-relaxed"
        style={{
          color: fontColor,
          fontSize: "var(--font-body-size, 1rem)",
          lineHeight: "var(--font-body-line, 1.6)",
        }}
      >
        {untertitel}
      </p>
    ) : null;

    const bestellen = onlineOrdering ? (
      <button
        onClick={handleOrderClick}
        className="mt-5 w-full py-3 px-6 text-[11px] uppercase tracking-[0.2em] font-bold transition-opacity hover:opacity-90 active:opacity-80"
        style={{
          backgroundColor: primaryColor,
          // Schwarz auf Kiosk-Orange (5,7:1), Weiß auf Tomatenrot/Kobalt.
          color: textAufFarbe(primaryColor),
          borderRadius: "var(--radius-button, 0px)",
        }}
      >
        Jetzt bestellen
      </button>
    ) : null;

    const reservieren = reservationsEnabled ? (
      <button
        onClick={handleReservationClick}
        className="mt-3 w-full py-3 px-6 text-[11px] uppercase tracking-[0.2em] font-bold transition-opacity hover:opacity-90 active:opacity-80"
        style={{
          backgroundColor: effectiveReservationColor,
          color: reservationButtonTextColor,
          borderRadius: buttonRadius,
        }}
      >
        Tisch reservieren
      </button>
    ) : null;

    if (layout.hero === "kiosk") {
      return (
        <section
          className={`pb-2 ${className}`}
          style={{ color: fontColor }}
          data-template-hero={template}
        >
          {/* Bildband — voll ausgeblutet gegen das Seitenpadding. */}
          <div
            className="relative -mx-5 md:-mx-8 lg:-mx-12 aspect-[16/9] overflow-hidden"
            style={
              bandImage
                ? undefined
                : {
                    backgroundColor: `${secondaryColor}66`,
                    backgroundImage: `repeating-linear-gradient(135deg, ${secondaryColor} 0 10px, transparent 10px 22px)`,
                  }
            }
          >
            {bandImage && (
              <img
                src={bandImage}
                alt=""
                className="absolute inset-0 w-full h-full object-cover"
              />
            )}
            {kicker && (
              <span
                className="absolute left-5 md:left-8 lg:left-12 bottom-4 px-2 py-1 text-[10px] uppercase tracking-[0.22em] font-bold"
                style={{ backgroundColor, color: fontColor }}
              >
                {kicker}
              </span>
            )}
          </div>
          <div className="pt-6 text-left">
            {ueberschrift}
            {unterzeile}
            {bestellen}
            {reservieren}
          </div>
        </section>
      );
    }

    if (layout.hero === "izakaya") {
      const label = typLabel(businessType);
      return (
        <section
          className={`pb-2 ${className}`}
          style={{ color: fontColor }}
          data-template-hero={template}
        >
          <div className="flex" style={{ border: `1.5px solid ${fontColor}` }}>
            <div className="flex-1 min-w-0 p-5 text-left">
              {kickerZeile}
              {ueberschrift}
              {unterzeile}
              {bestellen}
              {reservieren}
            </div>
            {label && (
              <div
                className="flex items-center justify-center px-2"
                style={{ borderLeft: `1.5px solid ${fontColor}` }}
                aria-hidden
              >
                <span
                  className="text-[10px] uppercase tracking-[0.3em] font-bold"
                  style={{ writingMode: "vertical-rl" }}
                >
                  {label}
                </span>
              </div>
            )}
          </div>
        </section>
      );
    }

    // presse (zentriert) und morgen (linksbündig)
    const zentriert = layout.hero === "presse";
    return (
      <section
        className={`pt-2 pb-2 flex flex-col ${
          zentriert ? "items-center text-center px-2" : "items-start text-left"
        } ${className}`}
        style={{ color: fontColor }}
        data-template-hero={template}
      >
        {kickerZeile}
        {ueberschrift}
        {unterzeile}
        {bestellen}
        {reservieren}
      </section>
    );
  }

  // ==========================================
  // Bestands-Templates — unverändert
  // ==========================================
  return (
    <section
      className={`text-center py-8 px-4 flex flex-col items-center ${className}`}
      style={{ color: fontColor }}
    >
      {/* Slogan / Headline — ohne Slogan trägt der Betriebsname den Hero. */}
      <h1
        className="text-3xl font-bold mb-4 leading-tight max-w-[90%]"
        style={{
          color: fontColor,
          fontSize: "var(--font-h1-size, 2rem)",
          fontWeight: "var(--font-h1-weight, 700)",
          lineHeight: "var(--font-h1-line, 1.2)",
        }}
      >
        {heroTitel(slogan, businessName)}
      </h1>

      {/* Description — Rückfall „Café in Münster“, sonst gar keine Zeile. */}
      {(() => {
        const untertitel = heroUntertitel(description, businessType, location);
        if (!untertitel) return null;
        return (
          <p
            className="max-w-[90%] text-center opacity-80 leading-relaxed"
            style={{
              color: fontColor,
              fontSize: "var(--font-body-size, 1rem)",
              lineHeight: "var(--font-body-line, 1.6)",
            }}
          >
            {untertitel}
          </p>
        );
      })()}

      {/* CTA Buttons */}
      <div className="mt-6 w-full px-4 space-y-3">
        {/* Primary CTA: Online Bestellen */}
        {onlineOrdering && (
          <button
            onClick={handleOrderClick}
            className="w-full py-3 px-6 font-bold text-base shadow-lg hover:scale-105 active:scale-95 transition-all text-white"
            style={{
              backgroundColor: primaryColor,
              borderRadius: "var(--radius-button, 9999px)",
              boxShadow: "var(--shadow-button, 0 4px 14px rgba(0,0,0,0.15))",
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
              boxShadow: "var(--shadow-button, 0 4px 14px rgba(0,0,0,0.15))",
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
