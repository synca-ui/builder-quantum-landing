/**
 * Shared DishCard Component
 *
 * Karte für Menü-Items (Highlights und Speisekarte)
 *
 * WICHTIG: Nutzt CSS-Variablen für Rundungen und Schatten!
 * - borderRadius: 'var(--radius-card)'
 * - boxShadow: 'var(--shadow-card)'
 *
 * Templates mit eigenem Layout (templateLayout.ts) rendern hier eigene
 * Zeilenformen: Punktlinie zum Preis (presse), numeriertes Register (kiosk),
 * Rahmenkasten (izakaya), Linienzeile (morgen) — und seit der zweiten Runde
 * Fotokachel (vitrine), Sticker (gelato), Strichlinie (brauhaus), Haarlinie
 * (ramen), Schild (imbiss), Mittelachse (konditorei), Etikett (roesterei),
 * Preisschild (markt), Kreisbild (aperitivo), Karteikarte (hofladen). Die
 * Bestands-Templates behalten das Kachel-Markup weiter unten — alle Formen
 * bekommen Vorschau und Live-Seite über dieselbe DishList mit denselben
 * Props. Welche Form gilt, sagt ausschließlich `layout.dish`.
 *
 * Wird verwendet in:
 * - TemplatePreviewContent.tsx (Editor)
 * - AppRenderer.tsx (Live-Seite)
 * - DishList.tsx (beide, für Templates mit eigenem Layout)
 */

import React, { memo } from "react";
import { Plus } from "lucide-react";
import type { MenuItem } from "@/types/domain";
import {
  formatPreis,
  getTemplateLayout,
  initiale,
  kategorieVon,
  laufendeNummer,
  mische,
  mitAlpha,
  OHNE_KATEGORIE,
  textAufFarbe,
  textAufFlaeche,
} from "@/lib/templateLayout";
import { kuerzelAnzeige, labelText } from "@/lib/kennzeichnung";

// ============================================
// TYPES
// ============================================

export interface DishCardProps {
  /** Menu Item Daten */
  item: MenuItem;
  /** Schriftfarbe */
  fontColor: string;
  /** Preisfarbe (unabhängig von Primary) */
  priceColor: string;
  /** Primärfarbe für Add-Button */
  primaryColor: string;
  /** Hintergrundfarbe */
  backgroundColor: string;
  /** Sekundärfarbe — Bildplatzhalter im Zettel-Kasten (izakaya) */
  secondaryColor?: string;
  /** Template-ID für Style-Varianten */
  template?: string;
  /** Position in der gesamten Karte (0-basiert) — laufende Nummer */
  index?: number;
  /**
   * Fotokarte (vitrine): Kachel mit Bild — oder schlichte Zeile, wenn die
   * Karte gar keine Bilder hat. Entscheidet DishList für die ganze Seite,
   * damit nicht Kacheln und Zeilen im selben Raster stehen.
   */
  fotoForm?: "kachel" | "zeile";
  /** Online-Bestellung aktiviert? (zeigt Add-Button) */
  onlineOrdering?: boolean;
  /** Bilder auf Homepage anzeigen? */
  showImage?: boolean;
  /** Klick auf die Karte (öffnet Modal) */
  onClick?: () => void;
  /** Zum Warenkorb hinzufügen */
  onAddToCart?: (item: MenuItem) => void;
  /** Preview-Modus (Editor) */
  isPreview?: boolean;
  /** Zusätzliche CSS-Klassen */
  className?: string;
}

// ============================================
// HELPER: Bild-URL normalisieren
// ============================================

function normalizeImageSrc(img: unknown): string {
  if (!img) return "/placeholder.svg";
  if (typeof img === "string") return img;

  const imgObj = img as { url?: string; file?: File };
  if (imgObj.url) return imgObj.url;

  if (typeof File !== "undefined" && imgObj.file instanceof File) {
    return URL.createObjectURL(imgObj.file);
  }

  return "/placeholder.svg";
}

// ============================================
// HELPER: Template-spezifische Card-Styles
// ============================================

function getTemplateCardStyle(template: string): React.CSSProperties {
  switch (template) {
    case "modern":
      return {
        background: "rgba(255,255,255,0.1)",
        backdropFilter: "blur(12px)",
        WebkitBackdropFilter: "blur(12px)",
        border: "1px solid rgba(255,255,255,0.2)",
      };
    case "stylish":
      return {
        background: "#FFFFFF",
        border: "1px solid rgba(0,0,0,0.05)",
      };
    case "cozy":
      return {
        background: "rgba(255,255,255,0.9)",
        border: "1px solid rgba(245,158,11,0.1)",
      };
    case "nocturne":
      // Dunkle, leicht erhabene Karte; Messing wirkt über priceColor.
      return {
        background: "rgba(255,255,255,0.05)",
        border: "1px solid rgba(255,255,255,0.09)",
        backdropFilter: "blur(8px)",
        WebkitBackdropFilter: "blur(8px)",
      };
    case "riviera":
      // Weiße Karte mit feiner Adriablau-Kante auf Sandton.
      return {
        background: "#FFFFFF",
        border: "1px solid rgba(30,90,126,0.16)",
      };
    case "verde":
      // Weiße Karte mit feiner Blattgrün-Kante auf Papierton.
      return {
        background: "#FFFFFF",
        border: "1px solid rgba(47,94,67,0.14)",
      };
    case "minimalist":
    default:
      return {
        background: "transparent",
        borderBottom: "1px solid currentColor",
        borderBottomColor: "rgba(0,0,0,0.1)",
      };
  }
}

/** Diagonale Schraffur als Bildplatzhalter (Zettel-Optik). */
function schraffur(farbe: string): React.CSSProperties {
  return {
    backgroundColor: `${farbe}66`,
    backgroundImage: `repeating-linear-gradient(135deg, ${farbe} 0 5px, transparent 5px 11px)`,
  };
}

// ============================================
// COMPONENT
// ============================================

export const DishCard = memo(function DishCard({
  item,
  fontColor,
  priceColor,
  primaryColor,
  backgroundColor,
  secondaryColor = "#D8CFBE",
  template = "minimalist",
  index,
  fotoForm = "kachel",
  onlineOrdering = false,
  showImage = false,
  onClick,
  onAddToCart,
  isPreview = false,
  className = "",
}: DishCardProps) {
  const handleClick = () => {
    if (onClick) onClick();
  };

  const handleAddToCart = (e: React.MouseEvent) => {
    e.stopPropagation(); // Verhindere Card-Click
    if (onAddToCart) onAddToCart(item);
  };

  const layout = getTemplateLayout(template);
  const templateStyle = getTemplateCardStyle(template);
  const isMinimalist = template === "minimalist";

  // Preis formatieren — Schreibweise folgt dem Template (templateLayout.ts).
  const formattedPrice = formatPreis(item.price, layout.preis);

  // Bild-URL. normalizeImageSrc gibt "/placeholder.svg" zurück, wenn es aus
  // dem Wert nichts machen kann — das ist KEIN Bild und darf hier nicht als
  // eines durchgehen, sonst steht in der Karte ein leerer Rahmen. Bei einer
  // automatisch erkannten Speisekarte hat fast kein Gericht ein Bild.
  const roh = item.imageUrl || (item.image ? normalizeImageSrc(item.image) : null);
  const imageUrl = roh && roh !== "/placeholder.svg" ? roh : null;

  // ---- Kennzeichnung (client/lib/kennzeichnung.ts) — für JEDE Form gleich ----
  // Allergen-/Zusatzstoff-Kürzel klein hinter dem Namen, wie auf gedruckten
  // Karten („Wiener Schnitzel A, C, G“). Die Erklärung steht in der Legende
  // unten auf der Speisekarte (DishList) — Kürzel ohne Legende sind für den
  // Gast wertlos, aber besser sichtbar als versteckt.
  const kuerzelListe = Array.isArray(item.allergens)
    ? item.allergens.map(kuerzelAnzeige).filter(Boolean)
    : [];
  const kuerzel = kuerzelListe.length ? (
    <span
      className="ml-1.5 text-[11px] font-medium tracking-[0.1em] opacity-80 whitespace-nowrap align-middle"
      // Fließtextschrift, nicht die Display-Schrift der Überschrift: In
      // Cormorant wären 11 px Kapitälchen zu dünn, um „gut lesbar“ zu sein.
      style={{ fontFamily: "var(--font-template, inherit)" }}
      data-kuerzel
      title={`Kennzeichnung: ${kuerzelListe.join(", ")}`}
    >
      {kuerzelListe.join(", ")}
    </span>
  ) : null;
  // Ernährungs-Labels als gesperrte Zeile unter der Beschreibung: „VEGAN ·
  // GLUTENFREI“. Ausgeschrieben, damit sie keine eigene Legende brauchen.
  const labelListe = Array.isArray(item.labels)
    ? item.labels.map(labelText).filter(Boolean)
    : [];
  const kennzeichnung = labelListe.length ? (
    <p
      className="mt-1 text-[10px] uppercase tracking-[0.14em] font-semibold opacity-70"
      data-labels
    >
      {labelListe.join(" · ")}
    </p>
  ) : null;
  // Keine Emojis — in keiner Form. Das Feld `emoji` bleibt im Datenmodell
  // (Altbestand, Musterdaten), aber eine gesetzte Karte zeigt es nicht:
  // Entscheidung des Nutzers (10.09.2026), nachdem „🍗Karaage“ in jeder
  // Textform stand. Platzhalter ohne Bild tragen den Anfangsbuchstaben.

  // ==========================================
  // Templates mit eigenem Layout
  // ==========================================
  if (layout.eigen) {
    const display = { fontFamily: "var(--font-template-display)" };
    const mono = { fontFamily: "var(--font-template-mono)" };
    const nummer =
      layout.nummeriert && typeof index === "number"
        ? laufendeNummer(index)
        : null;
    const haarlinie = `1px solid ${fontColor}26`;
    const rahmen = `1.5px solid ${fontColor}`;

    const hinzufuegen = onlineOrdering ? (
      <button
        onClick={handleAddToCart}
        className="w-7 h-7 flex items-center justify-center transition-transform active:scale-90 shrink-0"
        style={{
          backgroundColor: primaryColor,
          // Schwarz auf Kiosk-Orange, Weiß auf Tomatenrot — was mehr Kontrast hat.
          color: textAufFarbe(primaryColor),
          borderRadius: "var(--radius-button, 0px)",
        }}
        aria-label={`${item.name} zum Warenkorb hinzufügen`}
      >
        <Plus className="w-3.5 h-3.5" />
      </button>
    ) : null;

    const hinweis =
      item.available === false ? (
        <span className="block mt-1 text-[10px] uppercase tracking-[0.14em] opacity-60">
          Aktuell nicht verfügbar
        </span>
      ) : null;

    const gemeinsam = {
      onClick: handleClick,
      role: "button" as const,
      tabIndex: 0,
      "aria-label": `${item.name} - ${formattedPrice}`,
      "data-dish-variant": layout.dish,
    };

    // presse: Name ······ Preis, Beschreibung kursiv darunter.
    if (layout.dish === "leader") {
      return (
        <article
          {...gemeinsam}
          className={`cursor-pointer py-2 ${className}`}
          style={{ color: fontColor }}
        >
          <div className="flex items-baseline gap-2">
            <h3
              className="text-[15px] font-medium leading-snug max-w-[72%]"
              style={{ ...display, color: fontColor }}
            >
              {item.name}
              {kuerzel}
            </h3>
            <span
              aria-hidden
              className="flex-1 border-b border-dotted mb-[5px] opacity-50"
              style={{ borderColor: fontColor }}
            />
            <span
              className="text-[15px] tabular-nums shrink-0"
              style={{ ...display, color: priceColor }}
            >
              {formattedPrice}
            </span>
            {hinzufuegen}
          </div>
          {item.description && (
            <p
              className="text-xs italic opacity-70 mt-0.5 leading-snug"
              style={{ ...display, color: fontColor }}
            >
              {item.description}
            </p>
          )}
          {kennzeichnung}
          {hinweis}
        </article>
      );
    }

    // kiosk: Nummer · Name/Beschreibung · Preis in der Ziffernspalte.
    if (layout.dish === "register") {
      return (
        <article
          {...gemeinsam}
          className={`cursor-pointer flex items-start gap-3 py-3 ${className}`}
          style={{ color: fontColor, borderBottom: haarlinie }}
        >
          {nummer && (
            <span
              className="text-[10px] font-bold tabular-nums pt-1 w-5 shrink-0"
              style={{ ...mono, color: primaryColor }}
            >
              {nummer}
            </span>
          )}
          <div className="flex-1 min-w-0">
            <h3 className="text-[15px] font-bold leading-tight" style={{ color: fontColor }}>
              {item.name}
              {kuerzel}
            </h3>
            {item.description && (
              <p className="text-xs opacity-70 mt-0.5 leading-snug line-clamp-2">
                {item.description}
              </p>
            )}
            {kennzeichnung}
            {hinweis}
          </div>
          <div className="flex flex-col items-end gap-2 shrink-0">
            <span
              className="text-[15px] font-medium tabular-nums"
              style={{ ...mono, color: priceColor }}
            >
              {formattedPrice}
            </span>
            {hinzufuegen}
          </div>
        </article>
      );
    }

    // izakaya: Rahmenkasten mit Nummer oben links, Bild oben rechts,
    // Name, dann Beschreibung und Preis am Kastenboden.
    if (layout.dish === "box") {
      return (
        <article
          {...gemeinsam}
          className={`cursor-pointer flex flex-col p-3 min-h-[150px] ${className}`}
          style={{ color: fontColor, borderRight: rahmen, borderBottom: rahmen }}
        >
          <div className="flex items-start justify-between gap-2">
            <span
              className="text-[10px] font-bold tabular-nums"
              style={{ ...mono, color: primaryColor }}
            >
              {nummer ?? ""}
            </span>
            {showImage &&
              (imageUrl ? (
                <img
                  src={imageUrl}
                  alt={item.name}
                  className="w-14 h-14 object-cover shrink-0"
                  loading="lazy"
                />
              ) : (
                <div
                  aria-hidden
                  className="w-14 h-14 shrink-0"
                  style={schraffur(secondaryColor)}
                />
              ))}
          </div>
          <h3
            className="text-[15px] font-bold leading-tight mt-2"
            style={{ ...display, color: fontColor }}
          >
            {item.name}
            {kuerzel}
          </h3>
          {kennzeichnung}
          <div className="mt-auto flex items-end justify-between gap-2 pt-3">
            <p className="text-[11px] opacity-70 leading-snug line-clamp-2 flex-1 min-w-0">
              {item.description}
            </p>
            <span
              className="text-[15px] font-bold tabular-nums shrink-0"
              style={{ color: priceColor }}
            >
              {formattedPrice}
            </span>
          </div>
          {(hinzufuegen || hinweis) && (
            <div className="flex items-center justify-between gap-2 mt-2">
              {hinweis ?? <span />}
              {hinzufuegen}
            </div>
          )}
        </article>
      );
    }

    // ------------------------------------------------------------------
    // Zweite Runde
    // ------------------------------------------------------------------
    /**
     * Bild oder Zeichen: das Foto des Gerichts, wenn es eines gibt und Bilder
     * an sind — sonst Emoji oder Anfangsbuchstabe auf einer Fläche. Nie ein
     * leerer Rahmen, nie „/placeholder.svg“.
     */
    const bildOderZeichen = (
      klasse: string,
      zeichenKlasse: string,
      style?: React.CSSProperties,
    ) =>
      showImage && imageUrl ? (
        <img
          src={imageUrl}
          alt={item.name}
          className={`${klasse} object-cover`}
          loading="lazy"
        />
      ) : (
        <div
          aria-hidden
          className={`${klasse} flex items-center justify-center ${zeichenKlasse}`}
          style={style}
        >
          {initiale(item.name)}
        </div>
      );

    // vitrine (foto): Bildkachel 4:3 mit Name und Preis darunter — oder, wenn
    // die Karte keine Bilder hat, eine schlichte Zeile mit kleinem Zeichen.
    // Ein Raster aus leeren Kacheln wäre der unehrliche Zustand.
    if (layout.dish === "foto") {
      const platzhalterText = textAufFlaeche(secondaryColor, fontColor);
      if (fotoForm === "zeile") {
        return (
          <article
            {...gemeinsam}
            data-form="zeile"
            className={`cursor-pointer flex items-center gap-3 py-3 ${className}`}
            style={{ color: fontColor, borderBottom: haarlinie }}
          >
            {bildOderZeichen("w-12 h-12 shrink-0", "text-lg font-bold", {
              ...display,
              backgroundColor: secondaryColor,
              color: platzhalterText,
              borderRadius: "var(--radius-card, 14px)",
            })}
            <div className="flex-1 min-w-0">
              <h3
                className="text-[15px] font-semibold leading-snug"
                style={{ ...display, color: fontColor }}
              >
                {item.name}
                {kuerzel}
              </h3>
              {item.description && (
                <p className="text-xs opacity-60 mt-0.5 leading-snug line-clamp-2">
                  {item.description}
                </p>
              )}
              {kennzeichnung}
              {hinweis}
            </div>
            <div className="flex flex-col items-end gap-2 shrink-0">
              <span
                className="text-[15px] font-bold tabular-nums"
                style={{ color: priceColor }}
              >
                {formattedPrice}
              </span>
              {hinzufuegen}
            </div>
          </article>
        );
      }
      return (
        <article
          {...gemeinsam}
          data-form="kachel"
          className={`cursor-pointer flex flex-col ${className}`}
          style={{ color: fontColor }}
        >
          <div
            className="relative aspect-[4/3] w-full overflow-hidden"
            style={{
              borderRadius: "var(--radius-card, 14px)",
              backgroundColor: secondaryColor,
            }}
          >
            {showImage && imageUrl ? (
              <img
                src={imageUrl}
                alt={item.name}
                className="absolute inset-0 w-full h-full object-cover"
                loading="lazy"
              />
            ) : (
              <div
                aria-hidden
                className="absolute inset-0 flex items-center justify-center text-3xl font-bold opacity-40"
                style={{ ...display, color: platzhalterText }}
              >
                {initiale(item.name)}
              </div>
            )}
            {hinzufuegen && (
              <div className="absolute bottom-2 right-2">{hinzufuegen}</div>
            )}
          </div>
          <div className="flex items-start justify-between gap-2 mt-2">
            <h3
              className="text-[14px] font-semibold leading-snug"
              style={{ ...display, color: fontColor }}
            >
              {item.name}
              {kuerzel}
            </h3>
            <span
              className="text-[14px] font-bold tabular-nums shrink-0"
              style={{ color: priceColor }}
            >
              {formattedPrice}
            </span>
          </div>
          {item.description && (
            <p className="text-[11px] opacity-60 mt-0.5 leading-snug line-clamp-2">
              {item.description}
            </p>
          )}
          {kennzeichnung}
          {hinweis}
        </article>
      );
    }

    // gelato (sticker): getönte runde Karte, Kreisbild, Preis in der Pille.
    // Die Fläche ist die Sekundärfarbe zu 55 % über dem Hintergrund — der
    // Text darauf wird gegen genau diese Mischfarbe gerechnet, damit auch eine
    // dunkle Nutzer-Sekundärfarbe lesbar bleibt.
    if (layout.dish === "sticker") {
      const flaeche = mische(secondaryColor, backgroundColor, 0.55);
      const text = textAufFlaeche(flaeche, fontColor);
      return (
        <article
          {...gemeinsam}
          className={`cursor-pointer flex items-center gap-3 p-3 ${className}`}
          style={{
            color: text,
            backgroundColor: mitAlpha(secondaryColor, 0.55),
            borderRadius: "var(--radius-card, 18px)",
          }}
        >
          {bildOderZeichen("w-12 h-12 rounded-full shrink-0", "text-2xl", {
            backgroundColor,
          })}
          <div className="flex-1 min-w-0">
            <h3
              className="text-[15px] font-semibold leading-tight"
              style={{ ...display, color: text }}
            >
              {item.name}
              {kuerzel}
            </h3>
            {item.description && (
              <p className="text-xs opacity-70 mt-0.5 leading-snug line-clamp-2">
                {item.description}
              </p>
            )}
            {kennzeichnung}
            {hinweis}
          </div>
          <div className="flex flex-col items-end gap-2 shrink-0">
            <span
              className="px-2.5 py-1 rounded-full text-[13px] font-bold tabular-nums"
              style={{ backgroundColor: priceColor, color: textAufFarbe(priceColor) }}
            >
              {formattedPrice}
            </span>
            {hinzufuegen}
          </div>
        </article>
      );
    }

    // brauhaus (strich): Name – – – Preis in der Egyptienne.
    if (layout.dish === "strich") {
      return (
        <article
          {...gemeinsam}
          className={`cursor-pointer py-2.5 ${className}`}
          style={{ color: fontColor }}
        >
          <div className="flex items-baseline gap-2">
            <h3
              className="text-[15px] font-bold leading-snug max-w-[70%]"
              style={{ ...display, color: fontColor }}
            >
              {item.name}
              {kuerzel}
            </h3>
            <span
              aria-hidden
              className="flex-1 border-b border-dashed mb-[5px] opacity-40"
              style={{ borderColor: fontColor }}
            />
            <span
              className="text-[15px] font-bold tabular-nums shrink-0"
              style={{ ...display, color: priceColor }}
            >
              {formattedPrice}
            </span>
            {hinzufuegen}
          </div>
          {item.description && (
            <p className="text-xs opacity-70 mt-0.5 leading-snug">{item.description}</p>
          )}
          {kennzeichnung}
          {hinweis}
        </article>
      );
    }

    // ramen (hairline): Haarlinie, kurzer roter Strich unterm Namen.
    if (layout.dish === "hairline") {
      return (
        <article
          {...gemeinsam}
          className={`cursor-pointer flex items-start justify-between gap-4 py-3.5 ${className}`}
          style={{ color: fontColor, borderBottom: `1px solid ${fontColor}1A` }}
        >
          <div className="flex-1 min-w-0">
            <h3
              className="text-[15px] font-medium leading-snug tracking-tight"
              style={{ color: fontColor }}
            >
              {item.name}
              {kuerzel}
            </h3>
            {item.description && (
              <p className="text-[12px] opacity-60 mt-1 leading-snug">{item.description}</p>
            )}
            {kennzeichnung}
            <span
              aria-hidden
              className="block w-4 h-px mt-2"
              style={{ backgroundColor: primaryColor }}
            />
            {hinweis}
          </div>
          <div className="flex flex-col items-end gap-2 shrink-0">
            <span
              className="text-[15px] font-normal tabular-nums"
              style={{ color: priceColor }}
            >
              {formattedPrice}
            </span>
            {hinzufuegen}
          </div>
        </article>
      );
    }

    // imbiss (schild): dicke Linie über der Zeile, Preis als gefülltes Schild.
    if (layout.dish === "schild") {
      return (
        <article
          {...gemeinsam}
          className={`cursor-pointer flex items-center gap-3 py-3 ${className}`}
          style={{ color: fontColor, borderTop: `2px solid ${fontColor}` }}
        >
          <div className="flex-1 min-w-0">
            <h3
              className="text-[15px] font-bold uppercase tracking-[0.04em] leading-tight"
              style={{ color: fontColor }}
            >
              {item.name}
              {kuerzel}
            </h3>
            {item.description && (
              <p className="text-xs opacity-70 mt-0.5 leading-snug line-clamp-2">
                {item.description}
              </p>
            )}
            {kennzeichnung}
            {hinweis}
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <span
              className="px-2 py-1 text-[13px] font-bold tabular-nums"
              style={{ backgroundColor: priceColor, color: textAufFarbe(priceColor) }}
            >
              {formattedPrice}
            </span>
            {hinzufuegen}
          </div>
        </article>
      );
    }

    // konditorei (zentriert): Mittelachse. Der Preis ist Information, kein
    // Ornament — 16 px in der Serife, nicht gesperrte Kapitälchen. Die
    // Beschreibung läuft in Cormorant 500 bei 15 px; leichter wäre sie auf
    // dem Handy zu dünn.
    if (layout.dish === "zentriert") {
      return (
        <article
          {...gemeinsam}
          className={`cursor-pointer flex flex-col items-center text-center py-4 ${className}`}
          style={{ color: fontColor, borderBottom: `1px solid ${fontColor}14` }}
        >
          <h3
            className="text-[19px] leading-tight"
            style={{ ...display, color: fontColor }}
          >
            {item.name}
            {kuerzel}
          </h3>
          {item.description && (
            <p
              className="text-[15px] italic opacity-80 mt-1 leading-snug max-w-[85%]"
              style={{ ...display, fontWeight: 500 }}
            >
              {item.description}
            </p>
          )}
          {kennzeichnung}
          <span
            className="mt-2 text-[16px] font-medium tabular-nums leading-none"
            style={{ ...display, color: priceColor }}
          >
            {formattedPrice}
          </span>
          {hinzufuegen && <div className="mt-2">{hinzufuegen}</div>}
          {hinweis}
        </article>
      );
    }

    // roesterei (etikett): Rahmenkarte, Monospace-Kopfzeile mit Nummer und Rubrik.
    if (layout.dish === "etikett") {
      return (
        <article
          {...gemeinsam}
          className={`cursor-pointer flex flex-col p-3 h-full ${className}`}
          style={{
            color: fontColor,
            border: `1px solid ${fontColor}33`,
            borderRadius: "var(--radius-card, 6px)",
          }}
        >
          <div
            className="flex items-center justify-between gap-2 text-[10px] uppercase tracking-[0.14em] opacity-60"
            style={mono}
          >
            <span>{nummer ? `N° ${nummer}` : ""}</span>
            <span className="truncate">{kategorieVon(item)}</span>
          </div>
          <h3 className="text-[15px] font-bold mt-1.5 leading-tight" style={{ color: fontColor }}>
            {item.name}
            {kuerzel}
          </h3>
          {item.description && (
            <p className="text-xs opacity-70 mt-0.5 leading-snug line-clamp-2">
              {item.description}
            </p>
          )}
          {kennzeichnung}
          <div className="mt-auto pt-3 flex items-center justify-between gap-2">
            <span
              className="text-[14px] font-bold tabular-nums"
              style={{ ...mono, color: priceColor }}
            >
              {formattedPrice}
            </span>
            {hinzufuegen}
          </div>
          {hinweis}
        </article>
      );
    }

    // markt (preisschild): Preis zuerst, als gefülltes Schild — dann das Gericht.
    if (layout.dish === "preisschild") {
      return (
        <article
          {...gemeinsam}
          className={`cursor-pointer flex items-center gap-3 py-3 ${className}`}
          style={{ color: fontColor, borderBottom: haarlinie }}
        >
          <span
            className="px-2 py-1 min-w-[52px] text-center text-[13px] font-extrabold tabular-nums shrink-0"
            style={{
              backgroundColor: priceColor,
              color: textAufFarbe(priceColor),
              borderRadius: "var(--radius-button, 6px)",
            }}
          >
            {formattedPrice}
          </span>
          <div className="flex-1 min-w-0">
            <h3 className="text-[15px] font-bold leading-tight" style={{ color: fontColor }}>
              {item.name}
              {kuerzel}
            </h3>
            {item.description && (
              <p className="text-xs opacity-70 mt-0.5 leading-snug line-clamp-2">
                {item.description}
              </p>
            )}
            {kennzeichnung}
            {hinweis}
          </div>
          {hinzufuegen}
        </article>
      );
    }

    // aperitivo (kreis): getönte Karte im Raster, Kreisbild in der Primärfarbe.
    // Fläche = Sekundärfarbe zu 40 % über dem Hintergrund; Text und Preis
    // werden gegen die Mischfarbe gerechnet.
    if (layout.dish === "kreis") {
      const flaeche = mische(secondaryColor, backgroundColor, 0.4);
      const text = textAufFlaeche(flaeche, fontColor);
      const preis = textAufFlaeche(flaeche, priceColor);
      return (
        <article
          {...gemeinsam}
          className={`cursor-pointer flex flex-col p-3 h-full ${className}`}
          style={{
            color: text,
            backgroundColor: mitAlpha(secondaryColor, 0.4),
            borderRadius: "var(--radius-card, 16px)",
          }}
        >
          {bildOderZeichen("w-11 h-11 rounded-full shrink-0", "text-lg font-bold", {
            ...display,
            backgroundColor: primaryColor,
            color: textAufFarbe(primaryColor),
          })}
          <h3
            className="text-[15px] font-bold leading-tight mt-3"
            style={{ ...display, color: text }}
          >
            {item.name}
            {kuerzel}
          </h3>
          {item.description && (
            <p className="text-[11px] opacity-70 mt-1 leading-snug line-clamp-2">
              {item.description}
            </p>
          )}
          {kennzeichnung}
          <div className="mt-auto pt-3 flex items-center justify-between gap-2">
            <span
              className="text-[15px] font-bold tabular-nums"
              style={{ color: preis }}
            >
              {formattedPrice}
            </span>
            {hinzufuegen}
          </div>
          {hinweis}
        </article>
      );
    }

    // hofladen (karteikarte): gestrichelte Karte, Serife für Name und Preis.
    if (layout.dish === "karteikarte") {
      return (
        <article
          {...gemeinsam}
          className={`cursor-pointer flex items-start gap-3 p-3 ${className}`}
          style={{
            color: fontColor,
            border: `1px dashed ${fontColor}66`,
            borderRadius: "var(--radius-card, 6px)",
          }}
        >
          <div className="flex-1 min-w-0">
            <h3
              className="text-[16px] font-medium leading-snug"
              style={{ ...display, color: fontColor }}
            >
              {item.name}
              {kuerzel}
            </h3>
            {item.description && (
              <p className="text-xs opacity-70 mt-0.5 leading-snug">{item.description}</p>
            )}
            {kennzeichnung}
            {hinweis}
          </div>
          <div className="flex flex-col items-end gap-2 shrink-0">
            <span
              className="text-[16px] tabular-nums"
              style={{ ...display, color: priceColor }}
            >
              {formattedPrice}
            </span>
            {hinzufuegen}
          </div>
        </article>
      );
    }

    // morgen (ruled): Name, kursive Serifen-Beschreibung, Preis in Kobalt.
    return (
      <article
        {...gemeinsam}
        className={`cursor-pointer flex items-start justify-between gap-3 py-3 ${className}`}
        style={{ color: fontColor, borderBottom: haarlinie }}
      >
        <div className="flex-1 min-w-0">
          <h3 className="text-[15px] font-medium leading-snug" style={{ color: fontColor }}>
            {item.name}
            {kuerzel}
          </h3>
          {item.description && (
            <p
              // Fließtext bleibt Grotesk — die Serife trägt nur Titel,
              // Überschriften und Preise (Entwurf Frühstückskarte).
              className="text-[13px] italic opacity-70 mt-0.5 leading-snug"
              style={{ color: fontColor }}
            >
              {item.description}
            </p>
          )}
          {kennzeichnung}
          {hinweis}
        </div>
        <div className="flex flex-col items-end gap-2 shrink-0">
          <span
            className="text-[17px] tabular-nums leading-none pt-0.5"
            style={{ ...display, color: priceColor }}
          >
            {formattedPrice}
          </span>
          {hinzufuegen}
        </div>
      </article>
    );
  }

  // ==========================================
  // Bestands-Templates: Kachel bzw. minimalistische Zeile. Die Form ist die
  // bisherige; neu ist nur, dass Vorschau UND Live-Seite sie mit denselben
  // Props aufrufen (DishList) — vorher gab die Vorschau `showImage` mit und
  // die veröffentlichte Seite nicht.
  // ==========================================
  return (
    <article
      className={`
        cursor-pointer transition-transform active:scale-[0.98]
        ${isMinimalist ? "py-5 last:border-0" : "p-4 mb-4"}
        ${className}
      `}
      style={{
        ...templateStyle,
        borderRadius: isMinimalist ? "0" : "var(--radius-card, 16px)",
        boxShadow: isMinimalist
          ? "none"
          : "var(--shadow-card, 0 4px 12px rgba(0,0,0,0.08))",
        color: fontColor,
      }}
      onClick={handleClick}
      role="button"
      tabIndex={0}
      aria-label={`${item.name} - ${formattedPrice}`}
    >
      <div className="flex justify-between items-start gap-3">
        {/* Left: Image (optional) */}
        {showImage && imageUrl && (
          <div
            className="w-16 h-16 shrink-0 overflow-hidden"
            style={{ borderRadius: "var(--radius-card, 12px)" }}
          >
            <img
              src={imageUrl}
              alt={item.name}
              className="w-full h-full object-cover"
              loading="lazy"
            />
          </div>
        )}

        {/* Center: Name + Description */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            {/* Name — mit Allergen-Kürzeln, wie in jeder anderen Form */}
            <h3
              className="text-base font-bold leading-tight truncate"
              style={{ color: fontColor }}
            >
              {item.name}
              {kuerzel}
            </h3>
          </div>

          {/* Description */}
          {item.description && (
            <p
              className="text-xs opacity-70 mt-1 leading-snug line-clamp-2"
              style={{ color: fontColor }}
            >
              {item.description}
            </p>
          )}
          {kennzeichnung}

          {/* Rubrik-Marke. Die Sammelrubrik bleibt stumm: normalizeConfig
              schreibt Gerichten ohne Kategorie live „Sonstiges“ ins Feld, der
              Konfigurator-Store lässt es leer — eine Marke, die nur die
              veröffentlichte Seite trägt, ist genau die Abweichung, die hier
              verschwinden soll. */}
          {kategorieVon(item) !== OHNE_KATEGORIE && !isMinimalist && (
            <span
              className="inline-block mt-2 px-2 py-0.5 text-[10px] font-medium opacity-60"
              style={{
                backgroundColor: `${fontColor}10`,
                borderRadius: "var(--radius-button, 4px)",
              }}
            >
              {kategorieVon(item)}
            </span>
          )}
        </div>

        {/* Right: Price + Add Button */}
        <div className="flex flex-col items-end gap-2 pl-2 shrink-0">
          {/* Price */}
          <span
            className="text-lg font-bold whitespace-nowrap"
            style={{ color: priceColor }}
          >
            {formattedPrice}
          </span>

          {/* Add to Cart Button */}
          {onlineOrdering && (
            <button
              onClick={handleAddToCart}
              className="w-8 h-8 flex items-center justify-center transition-transform active:scale-90"
              style={{
                backgroundColor: primaryColor,
                color: "#FFFFFF",
                borderRadius: "var(--radius-button, 50%)",
                boxShadow: "var(--shadow-button, 0 2px 8px rgba(0,0,0,0.15))",
              }}
              aria-label={`${item.name} zum Warenkorb hinzufügen`}
            >
              <Plus className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Availability Badge */}
      {item.available === false && (
        <div
          className="mt-2 px-2 py-1 text-xs font-medium text-center"
          style={{
            backgroundColor: "rgba(239,68,68,0.1)",
            color: "#EF4444",
            borderRadius: "var(--radius-button, 4px)",
          }}
        >
          Aktuell nicht verfügbar
        </div>
      )}
    </article>
  );
});

export default DishCard;
