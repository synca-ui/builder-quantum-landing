/**
 * Shared DishList Component
 *
 * Gerichte-Liste ALLER Templates (templateLayout.ts): Leiste mit Zähler,
 * Kategorie-Überschriften, laufende Nummern, Raster 2×2 oder Spalte für die
 * Papierformen — gestapelte Kachel-Karten mit „Highlights / Alle“-Leiste für
 * den Bestand. Vorschau und veröffentlichte Seite rufen sie mit denselben
 * Daten auf, deshalb sehen beide dasselbe. Vorher hatte der Bestand zwei
 * getrennte Listen (Vorschau gruppiert mit Überschriften, Live-Seite ein
 * flaches Raster) — der Betreiber sah nicht, was seine Gäste bekamen.
 *
 * Wird verwendet in:
 * - TemplatePreviewContent.tsx (Editor)
 * - AppRenderer.tsx (Live-Seite)
 */

import React, { memo } from "react";
import { ArrowRight } from "lucide-react";
import type { MenuItem } from "@/types/domain";
import { DishCard } from "./DishCard";
import {
  getTemplateLayout,
  gruppiereNachKategorie,
  laufendeNummer,
  zeigeBilder,
  type Kategoriegruppe,
} from "@/lib/templateLayout";

export interface DishListProps {
  template: string;
  /** Vollständige Karte in Reihenfolge — Basis für Nummern und Zähler. */
  alle: MenuItem[];
  /** Was tatsächlich gezeigt wird: Highlights oder (gefilterte) Karte. */
  anzeigen: MenuItem[];
  /** Gepflegte Kategorienreihenfolge (content.categories). */
  categories?: string[];
  /** Nach Kategorie gruppieren — Karte ohne aktiven Filter. */
  gruppieren?: boolean;
  /** Startseite (Leiste, Zähler, „Zur Karte“) oder Speisekarte. */
  modus: "highlights" | "karte";
  /** Startseite: Sprung zur ganzen Karte. */
  onAlle?: () => void;
  /** content.homepageDishImageVisibility — „hidden“ nimmt die Bilder raus. */
  bildSichtbarkeit?: string | null;
  fontColor: string;
  priceColor: string;
  primaryColor: string;
  secondaryColor?: string;
  backgroundColor: string;
  onlineOrdering?: boolean;
  onItemClick?: (item: MenuItem) => void;
  onAddToCart?: (item: MenuItem) => void;
  isPreview?: boolean;
  className?: string;
}

/** Position eines Gerichts in der ganzen Karte — Referenz vor id vor Anzeige. */
function positionVon(item: MenuItem, alle: MenuItem[], anzeigen: MenuItem[]) {
  const i = alle.indexOf(item);
  if (i >= 0) return i;
  if (item.id) {
    const j = alle.findIndex((a) => a.id === item.id);
    if (j >= 0) return j;
  }
  return Math.max(0, anzeigen.indexOf(item));
}

export const DishList = memo(function DishList({
  template,
  alle,
  anzeigen,
  categories = [],
  gruppieren = false,
  modus,
  onAlle,
  bildSichtbarkeit,
  fontColor,
  priceColor,
  primaryColor,
  secondaryColor,
  backgroundColor,
  onlineOrdering = false,
  onItemClick,
  onAddToCart,
  isPreview = false,
  className = "",
}: DishListProps) {
  const layout = getTemplateLayout(template);
  const linie =
    layout.linie === "kraeftig"
      ? `1.5px solid ${fontColor}`
      : `1px solid ${fontColor}33`;
  const caps = "uppercase tracking-[0.2em] text-[10px] font-bold";
  const mono = { fontFamily: "var(--font-template-mono)" };
  const display = { fontFamily: "var(--font-template-display)" };

  // Startseite: Bistrokarte und Frühstückskarte zeigen ihre Highlights unter
  // Kategorie-Überschriften (wie die Karte selbst), Register und Zettel als
  // eine Leiste. Speisekarte: wie der Aufrufer es vorgibt (kein Filter aktiv).
  const gruppiert =
    modus === "highlights"
      ? layout.ueberschrift === "kapitaelchen" ||
        layout.ueberschrift === "kursivLinie"
      : gruppieren;
  const gruppen: Kategoriegruppe[] = gruppiert
    ? gruppiereNachKategorie(anzeigen, categories)
    : [{ kategorie: "", items: anzeigen }];

  const gesamt = alle.length;
  const positionen = anzeigen.map((it) => positionVon(it, alle, anzeigen));

  // ---- Leiste über den Highlights (kiosk: Register, izakaya: Heute) ----
  const leiste = (() => {
    if (modus !== "highlights") return null;
    // Bestand: die Leiste, die die Vorschau seit jeher über den Highlights
    // zeigt — „Alle“ ist jetzt ein Knopf, vorher ein <span> mit onClick, den
    // die Tastatur nicht erreichte.
    if (!layout.eigen) {
      return (
        <div className="flex items-center justify-between mb-4 px-1">
          <h3
            className="uppercase tracking-widest font-bold opacity-60 text-[10px]"
            style={{ color: fontColor }}
          >
            Highlights
          </h3>
          {onAlle && (
            <button
              type="button"
              onClick={onAlle}
              aria-label="Ganze Karte anzeigen"
              className="text-[10px] font-bold opacity-60 cursor-pointer hover:opacity-100 flex items-center gap-1"
            >
              Alle <ArrowRight className="w-3 h-3" />
            </button>
          )}
        </div>
      );
    }
    if (layout.ueberschrift === "registerLeiste") {
      const von = positionen.length ? laufendeNummer(Math.min(...positionen)) : "00";
      const bis = positionen.length ? laufendeNummer(Math.max(...positionen)) : "00";
      return (
        <div
          className={`flex items-center justify-between pb-2 mb-1 ${caps}`}
          style={{ borderBottom: `2px solid ${fontColor}`, color: fontColor }}
        >
          <span>Register</span>
          <button
            type="button"
            onClick={onAlle}
            className="opacity-60 hover:opacity-100 tabular-nums"
            style={mono}
            aria-label="Ganze Karte anzeigen"
          >
            {von} — {bis} / {String(gesamt).padStart(2, "0")}
          </button>
        </div>
      );
    }
    if (layout.ueberschrift === "zettelLeiste") {
      return (
        <div
          className={`flex items-center justify-between mb-2 ${caps}`}
          style={{ color: fontColor }}
        >
          <span>Heute</span>
          <button
            type="button"
            onClick={onAlle}
            className="opacity-60 hover:opacity-100"
            aria-label="Ganze Karte anzeigen"
          >
            {anzeigen.length} von {gesamt}
          </button>
        </div>
      );
    }
    return null;
  })();

  // ---- Kategorie-Überschrift ----
  const ueberschrift = (g: Kategoriegruppe, erste: boolean) => {
    if (!g.kategorie) return null;
    const abstand = erste ? "" : "mt-6";
    switch (layout.ueberschrift) {
      case "kursivLinie":
        return (
          <h3 className={`flex items-center gap-3 mb-1 ${abstand}`}>
            <span
              className="italic text-lg leading-none"
              style={{ ...display, color: primaryColor }}
            >
              {g.kategorie}
            </span>
            <span
              aria-hidden
              className="flex-1 h-px"
              style={{ backgroundColor: primaryColor, opacity: 0.6 }}
            />
          </h3>
        );
      case "registerLeiste":
        return (
          <h3
            className={`flex items-center justify-between pb-2 ${caps} ${abstand}`}
            style={{ borderBottom: `2px solid ${fontColor}`, color: fontColor }}
          >
            <span>{g.kategorie}</span>
            <span className="opacity-50 tabular-nums" style={mono}>
              {String(g.items.length).padStart(2, "0")}
            </span>
          </h3>
        );
      case "zettelLeiste":
        return (
          <h3
            className={`flex items-center justify-between mb-2 ${caps} ${abstand}`}
            style={{ color: fontColor }}
          >
            <span>{g.kategorie}</span>
            <span className="opacity-60">
              {g.items.length} von {gesamt}
            </span>
          </h3>
        );
      case "unterstrichen":
        // Bestand: fette Zeile mit feiner Linie, wie in der Vorschau.
        return (
          <h3
            className={`text-lg font-bold mb-3 pb-2 border-b ${erste ? "" : "mt-6"}`}
            style={{ color: fontColor, borderColor: `${fontColor}20` }}
          >
            {g.kategorie}
          </h3>
        );
      case "kapitaelchen":
      default:
        return (
          <h3
            className={`${caps} opacity-60 mb-1 ${abstand}`}
            style={{ color: fontColor }}
          >
            {g.kategorie}
          </h3>
        );
    }
  };

  // ---- Die Gerichte selbst ----
  const karten = (items: MenuItem[]) =>
    items.map((item, i) => (
      <DishCard
        key={item.id || `${i}`}
        item={item}
        index={positionVon(item, alle, anzeigen)}
        fontColor={fontColor}
        priceColor={priceColor}
        primaryColor={primaryColor}
        secondaryColor={secondaryColor}
        backgroundColor={backgroundColor}
        template={template}
        onlineOrdering={onlineOrdering}
        showImage={zeigeBilder(template, bildSichtbarkeit)}
        onClick={onItemClick ? () => onItemClick(item) : undefined}
        onAddToCart={onAddToCart}
        isPreview={isPreview}
      />
    ));

  const liste = (items: MenuItem[]) =>
    layout.raster === "gestapelt" ? (
      <div className="space-y-3">{karten(items)}</div>
    ) : layout.raster === "kacheln2" ? (
      <div
        className="grid grid-cols-2"
        style={{ borderTop: linie, borderLeft: linie }}
      >
        {karten(items)}
        {items.length % 2 === 1 && (
          <div aria-hidden style={{ borderRight: linie, borderBottom: linie }} />
        )}
      </div>
    ) : (
      <div className="flex flex-col">{karten(items)}</div>
    );

  const zurKarte =
    modus === "highlights" &&
    onAlle &&
    (layout.ueberschrift === "kapitaelchen" ||
      layout.ueberschrift === "kursivLinie") ? (
      <button
        type="button"
        onClick={onAlle}
        className={`mt-5 flex items-center gap-2 ${caps} hover:opacity-80`}
        style={{ color: primaryColor }}
      >
        <span>Zur Karte</span>
        <span aria-hidden>→</span>
      </button>
    ) : null;

  return (
    <section
      className={className}
      data-template-list={template}
      data-modus={modus}
      style={{ color: fontColor }}
    >
      {leiste}
      {gruppen.map((g, i) => (
        <div key={g.kategorie || "__ohne"}>
          {ueberschrift(g, i === 0)}
          {liste(g.items)}
        </div>
      ))}
      {zurKarte}
    </section>
  );
});

export default DishList;
