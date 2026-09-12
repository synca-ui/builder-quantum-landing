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
 * Kobalt-Wort (morgen) — und aus der zweiten Runde Bildkarte (vitrine),
 * Pastellblock (gelato), Doppelrahmen (brauhaus), Siegel (ramen), Schild
 * mit Schlagschatten (imbiss), Mittelachse mit Zierlinie (konditorei),
 * Monospace-Kicker (roesterei), Preisschild-Kicker (markt), Pfirsichkreis
 * (aperitivo), Stempel mit Betriebsart (hofladen). Die Bestands-Templates
 * behalten ihre zentrierte Form — sie kommt auch in der Vorschau von hier,
 * die vorher ein eigenes Inline-Markup mit anderen Größen und Abständen
 * rendete.
 */

import React, { memo } from "react";
import { heroTitel, heroUntertitel, typLabel } from "@/lib/heroFallback";
import {
  getTemplateLayout,
  initiale,
  mische,
  mitAlpha,
  teileLetztesWort,
  textAufFarbe,
  textAufFlaeche,
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
  /** Sekundärfarbe — Schraffur des Bildbands ohne Bild (kiosk), Flächen (gelato, imbiss, aperitivo) */
  secondaryColor?: string;
  /** Template-ID für Layout-Varianten */
  template?: string;
  /** Bild für den Bildband (kiosk) bzw. die Bildkarte (vitrine) — erstes Galeriebild */
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
    const mono = "var(--font-template-mono)";
    const kiosk = layout.hero === "kiosk";
    // Versal-Titel: Aushang und Imbissbude schreiben groß.
    const versal = kiosk || layout.hero === "imbiss";
    const label = typLabel(businessType);
    const zeichen = initiale(businessName);

    const kickerZeile = kicker ? (
      <p
        className="text-[10px] uppercase tracking-[0.22em] font-bold mb-3"
        style={{ color: primaryColor }}
      >
        {kicker}
      </p>
    ) : null;

    // Überschrift und Unterzeile als Funktion der Textfarbe: Auf Flächen in
    // der Sekundärfarbe (gelato, imbiss) wird die Farbe gegen die Fläche
    // gerechnet, sonst ist es die Textfarbe des Designs.
    const ueberschriftIn = (farbe: string) => (
      <h1
        className="mb-3 max-w-full"
        style={{
          color: farbe,
          fontFamily: display,
          fontSize: "var(--font-h1-size, 2rem)",
          fontWeight: "var(--font-h1-weight, 700)",
          lineHeight: "var(--font-h1-line, 1.05)",
          letterSpacing: versal ? "-0.01em" : undefined,
          textTransform: versal ? "uppercase" : undefined,
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
    const ueberschrift = ueberschriftIn(fontColor);

    const unterzeileIn = (farbe: string) =>
      untertitel ? (
        <p
          className="opacity-75 leading-relaxed"
          style={{
            color: farbe,
            fontSize: "var(--font-body-size, 1rem)",
            lineHeight: "var(--font-body-line, 1.6)",
          }}
        >
          {untertitel}
        </p>
      ) : null;
    const unterzeile = unterzeileIn(fontColor);

    // Knopfschrift: gesperrte Versalien auf Papier, normale Fette bei den
    // runden Templates (vitrine, gelato, markt, aperitivo).
    const knopfSchrift =
      layout.knopf === "versal"
        ? "py-3 px-6 text-[11px] uppercase tracking-[0.2em] font-bold"
        : "py-3 px-6 text-[14px] font-bold";

    const bestellen = onlineOrdering ? (
      <button
        onClick={handleOrderClick}
        className={`mt-5 w-full ${knopfSchrift} transition-opacity hover:opacity-90 active:opacity-80`}
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
        className={`mt-3 w-full ${knopfSchrift} transition-opacity hover:opacity-90 active:opacity-80`}
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

    // ---- Zweite Runde ----

    // vitrine: Bildkarte mit Rundung, darunter Titel und Unterzeile.
    if (layout.hero === "vitrine") {
      return (
        <section
          className={`pb-2 text-left ${className}`}
          style={{ color: fontColor }}
          data-template-hero={template}
        >
          {bandImage && (
            <div
              className="aspect-[16/10] overflow-hidden mb-5"
              style={{ borderRadius: "var(--radius-card, 18px)" }}
            >
              <img src={bandImage} alt="" className="w-full h-full object-cover" />
            </div>
          )}
          {kickerZeile}
          {ueberschrift}
          {unterzeile}
          {bestellen}
          {reservieren}
        </section>
      );
    }

    // gelato: Pastellblock mit großer Rundung, Kicker als helle Pille. Die
    // Fläche ist die Sekundärfarbe zu 60 % über dem Hintergrund; Titel und
    // Unterzeile werden gegen diese Mischfarbe gerechnet.
    if (layout.hero === "gelato") {
      const flaeche = mische(secondaryColor, backgroundColor, 0.6);
      const text = textAufFlaeche(flaeche, fontColor);
      return (
        <section
          className={`pb-2 ${className}`}
          style={{ color: text }}
          data-template-hero={template}
        >
          <div
            className="p-5 text-left"
            style={{
              backgroundColor: mitAlpha(secondaryColor, 0.6),
              borderRadius: "var(--radius-card, 28px)",
            }}
          >
            {kicker && (
              <span
                className="inline-block px-2.5 py-1 mb-3 text-[11px] font-bold rounded-full"
                style={{ backgroundColor, color: textAufFlaeche(backgroundColor, primaryColor) }}
              >
                {kicker}
              </span>
            )}
            {ueberschriftIn(text)}
            {unterzeileIn(text)}
            {bestellen}
            {reservieren}
          </div>
        </section>
      );
    }

    // brauhaus: Doppelrahmen mit innerer Haarlinie, alles auf der Mittelachse.
    if (layout.hero === "brauhaus") {
      return (
        <section
          className={`pb-2 ${className}`}
          style={{ color: fontColor }}
          data-template-hero={template}
        >
          <div className="p-1" style={{ border: `3px double ${fontColor}` }}>
            <div
              className="px-4 py-5 flex flex-col items-center text-center"
              style={{ border: `1px solid ${fontColor}` }}
            >
              {kickerZeile}
              {ueberschrift}
              {unterzeile}
              {bestellen}
              {reservieren}
            </div>
          </div>
        </section>
      );
    }

    // ramen: rotes Siegel mit Anfangsbuchstaben, daneben Titel und Unterzeile.
    if (layout.hero === "ramen") {
      return (
        <section
          className={`pt-1 pb-2 text-left ${className}`}
          style={{ color: fontColor }}
          data-template-hero={template}
        >
          <div className="flex items-start gap-4">
            <div
              aria-hidden
              className="w-10 h-10 shrink-0 flex items-center justify-center text-base font-bold"
              style={{
                backgroundColor: primaryColor,
                color: textAufFarbe(primaryColor),
                fontFamily: display,
              }}
            >
              {zeichen}
            </div>
            <div className="flex-1 min-w-0">
              {kickerZeile}
              {ueberschrift}
              {unterzeile}
            </div>
          </div>
          {bestellen}
          {reservieren}
        </section>
      );
    }

    // imbiss: Schild in der Sekundärfarbe mit dickem Rahmen und hartem
    // Schlagschatten. Der Text auf dem Schild wird gegen die Sekundärfarbe
    // gerechnet, der Kicker-Chip gegen die Textfarbe.
    if (layout.hero === "imbiss") {
      const text = textAufFlaeche(secondaryColor, fontColor);
      return (
        <section
          className={`pb-2 ${className}`}
          style={{ color: text }}
          data-template-hero={template}
        >
          <div
            className="p-5 mr-1.5 mb-1.5 text-left"
            style={{
              backgroundColor: secondaryColor,
              border: `3px solid ${fontColor}`,
              boxShadow: `6px 6px 0 ${fontColor}`,
            }}
          >
            {kicker && (
              <span
                className="inline-block px-2 py-1 mb-3 text-[10px] font-bold uppercase tracking-[0.18em]"
                style={{
                  backgroundColor: fontColor,
                  color: textAufFlaeche(fontColor, secondaryColor),
                }}
              >
                {kicker}
              </span>
            )}
            {ueberschriftIn(text)}
            {unterzeileIn(text)}
            {bestellen}
            {reservieren}
          </div>
        </section>
      );
    }

    // konditorei: Mittelachse, kurze Zierlinie in der Primärfarbe unterm Titel.
    if (layout.hero === "konditorei") {
      return (
        <section
          className={`pt-2 pb-2 flex flex-col items-center text-center px-2 ${className}`}
          style={{ color: fontColor }}
          data-template-hero={template}
        >
          {kickerZeile}
          {ueberschrift}
          <span
            aria-hidden
            className="w-8 h-px mb-3"
            style={{ backgroundColor: primaryColor }}
          />
          {unterzeile}
          {bestellen}
          {reservieren}
        </section>
      );
    }

    // roesterei: Kicker in eckigen Klammern, Monospace.
    if (layout.hero === "roesterei") {
      return (
        <section
          className={`pt-1 pb-2 text-left ${className}`}
          style={{ color: fontColor }}
          data-template-hero={template}
        >
          {kicker && (
            <p
              className="text-[11px] uppercase tracking-[0.14em] mb-3"
              style={{ fontFamily: mono, color: primaryColor }}
            >
              [ {kicker} ]
            </p>
          )}
          {ueberschrift}
          {unterzeile}
          {bestellen}
          {reservieren}
        </section>
      );
    }

    // markt: Kicker als gefülltes Preisschild.
    if (layout.hero === "markt") {
      return (
        <section
          className={`pt-1 pb-2 text-left ${className}`}
          style={{ color: fontColor }}
          data-template-hero={template}
        >
          {kicker && (
            <span
              className="inline-block px-2 py-0.5 mb-3 text-[10px] font-bold uppercase tracking-[0.16em]"
              style={{
                backgroundColor: primaryColor,
                color: textAufFarbe(primaryColor),
                borderRadius: "var(--radius-button, 6px)",
              }}
            >
              {kicker}
            </span>
          )}
          {ueberschrift}
          {unterzeile}
          {bestellen}
          {reservieren}
        </section>
      );
    }

    // aperitivo: Pfirsichkreis hinter dem Titel, oben rechts angeschnitten.
    if (layout.hero === "aperitivo") {
      return (
        <section
          className={`relative pt-4 pb-2 text-left overflow-hidden ${className}`}
          style={{ color: fontColor }}
          data-template-hero={template}
        >
          <div
            aria-hidden
            className="absolute -top-10 -right-10 w-40 h-40 rounded-full"
            style={{ backgroundColor: secondaryColor }}
          />
          <div className="relative">
            {kickerZeile}
            {ueberschrift}
            {unterzeile}
            {bestellen}
            {reservieren}
          </div>
        </section>
      );
    }

    // hofladen: Titel links, gestrichelter Stempel mit der Betriebsart rechts.
    if (layout.hero === "hofladen") {
      return (
        <section
          className={`pt-2 pb-2 text-left ${className}`}
          style={{ color: fontColor }}
          data-template-hero={template}
        >
          <div className="flex items-start gap-4">
            <div className="flex-1 min-w-0">
              {kickerZeile}
              {ueberschrift}
              {unterzeile}
            </div>
            {label && (
              <div
                aria-hidden
                className="w-16 h-16 shrink-0 rounded-full flex items-center justify-center text-center text-[9px] uppercase tracking-[0.16em] font-bold leading-tight px-1"
                style={{ border: `1.5px dashed ${primaryColor}`, color: primaryColor }}
              >
                {label}
              </div>
            )}
          </div>
          {bestellen}
          {reservieren}
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
  // Bestands-Templates — Kachel-Optik, gleiche Komponente
  // ==========================================
  return (
    <section
      className={`text-center py-8 px-4 flex flex-col items-center ${className}`}
      style={{ color: fontColor }}
      data-template-hero={template || "standard"}
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
