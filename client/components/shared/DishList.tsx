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
 * Welche Leiste, welche Überschrift, welches Raster: sagt ausschließlich
 * das Layout (leiste, ueberschrift, raster, rasterHighlights,
 * highlightsGruppiert, zurKarte). Nichts davon wird hier aus etwas anderem
 * abgeleitet — seit der zweiten Template-Runde hätte eine Ableitung aus der
 * Überschriftenform zehn Sonderfälle gebraucht.
 *
 * Unter der Speisekarte steht die Legende der Allergen- und Zusatzstoff-
 * Kürzel (client/lib/kennzeichnung.ts) — in jedem Template, weil das keine
 * Gestaltungsfrage ist, sondern LMIDV § 2.
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
  hatBild,
  laufendeNummer,
  mische,
  mitAlpha,
  textAufFlaeche,
  zeigeBilder,
  type Kategoriegruppe,
} from "@/lib/templateLayout";
import { kuerzelAnzeige, legendeZeilen } from "@/lib/kennzeichnung";

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
  /**
   * content.allergenLegend — Bedeutung der Kürzel, die an den Gerichten
   * stehen. Auf der Speisekarte steht sie als Legende unter der Liste
   * (LMIDV § 2: Kürzel nur mit Erklärung in derselben Karte).
   */
  allergenLegend?: Record<string, string> | null;
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
  allergenLegend,
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
      : layout.linie === "gestrichelt"
        ? `1px dashed ${fontColor}66`
        : `1px solid ${fontColor}33`;
  const haarlinie = `1px solid ${fontColor}26`;
  const caps = "uppercase tracking-[0.2em] text-[10px] font-bold";
  const mono = { fontFamily: "var(--font-template-mono)" };
  const display = { fontFamily: "var(--font-template-display)" };

  // Startseite: gruppiert, wenn das Layout es sagt (Bistrokarte, Frühstücks-
  // karte, Gasthaus, Kaffeehaus, Hofcafé zeigen ihre Highlights unter den
  // Kategorie-Überschriften der Karte). Speisekarte: wie der Aufrufer es
  // vorgibt (kein Filter aktiv).
  const gruppiert =
    modus === "highlights" ? layout.highlightsGruppiert : gruppieren;
  const gruppen: Kategoriegruppe[] = gruppiert
    ? gruppiereNachKategorie(anzeigen, categories)
    : [{ kategorie: "", items: anzeigen }];

  const gesamt = alle.length;
  const positionen = anzeigen.map((it) => positionVon(it, alle, anzeigen));
  const zweistellig = (n: number) => String(n).padStart(2, "0");

  // ---- Leiste über den Highlights ----
  const leiste = (() => {
    if (modus !== "highlights") return null;
    switch (layout.leiste) {
      // Bestand: die Leiste, die die Vorschau seit jeher über den Highlights
      // zeigt — „Alle“ ist jetzt ein Knopf, vorher ein <span> mit onClick,
      // den die Tastatur nicht erreichte.
      case "highlights":
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
      case "register": {
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
              {von} — {bis} / {zweistellig(gesamt)}
            </button>
          </div>
        );
      }
      case "heute":
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
      // ---- Zweite Runde: je Template eine eigene Leiste ----
      // vitrine: „Empfehlungen“ fett, rechts eine getönte Pille mit der Zahl
      // aller Gerichte — die Karte ist größer als das, was hier hängt.
      case "galerie":
        return (
          <div className="flex items-center justify-between mb-3">
            <h3
              className="text-[17px] font-bold leading-none"
              style={{ ...display, color: fontColor }}
            >
              Empfehlungen
            </h3>
            {onAlle && (
              <button
                type="button"
                onClick={onAlle}
                aria-label="Ganze Karte anzeigen"
                className="px-3 py-1 rounded-full text-[12px] font-semibold flex items-center gap-1 hover:opacity-80"
                style={{ backgroundColor: mitAlpha(primaryColor, 0.08), color: primaryColor }}
              >
                Alle {gesamt} <span aria-hidden>→</span>
              </button>
            )}
          </div>
        );
      // gelato: „Lieblinge“ in der Display-Schrift, davor zwei Kugeln in
      // Primär- und Sekundärfarbe; rechts eine Pille auf der Sekundärfläche.
      case "lieblinge": {
        const flaeche = mische(secondaryColor ?? backgroundColor, backgroundColor, 0.55);
        return (
          <div className="flex items-center justify-between mb-3">
            <h3
              className="flex items-center gap-2 text-[20px] font-semibold leading-none"
              style={{ ...display, color: fontColor }}
            >
              <span aria-hidden className="flex -space-x-1">
                <span className="w-3 h-3 rounded-full" style={{ backgroundColor: primaryColor }} />
                <span className="w-3 h-3 rounded-full" style={{ backgroundColor: secondaryColor ?? primaryColor }} />
              </span>
              <span>Lieblinge</span>
            </h3>
            {onAlle && (
              <button
                type="button"
                onClick={onAlle}
                aria-label="Ganze Karte anzeigen"
                className="px-3 py-1 rounded-full text-[12px] font-bold flex items-center gap-1 hover:opacity-80"
                style={{
                  backgroundColor: mitAlpha(secondaryColor ?? backgroundColor, 0.55),
                  color: textAufFlaeche(flaeche, fontColor),
                }}
              >
                Alle <span aria-hidden>→</span>
              </button>
            )}
          </div>
        );
      }
      // imbiss: schwarzer Balken wie die Kategorie-Balken der Karte —
      // „Highlights“ links, „Ganze Karte“ rechts, beides in Versalien.
      case "schild":
        return (
          <div
            className="flex items-center justify-between px-3 py-2 mb-3 text-[11px] font-bold uppercase tracking-[0.12em]"
            style={{ ...display, backgroundColor: fontColor, color: backgroundColor }}
          >
            <span>Highlights</span>
            {onAlle && (
              <button
                type="button"
                onClick={onAlle}
                aria-label="Ganze Karte anzeigen"
                className="flex items-center gap-1 hover:opacity-80"
              >
                Ganze Karte <span aria-hidden>→</span>
              </button>
            )}
          </div>
        );
      // markt: Versal-Zeile mit grüner Linie wie die Rubriken der Karte —
      // „Frisch heute“, rechts der Zähler „3 von 7“.
      case "tafel":
        return (
          <div
            className="flex items-center justify-between pb-1.5 mb-3 text-[13px] font-extrabold uppercase tracking-[0.06em]"
            style={{ ...display, borderBottom: `2px solid ${primaryColor}`, color: fontColor }}
          >
            <span>Frisch heute</span>
            {onAlle && (
              <button
                type="button"
                onClick={onAlle}
                aria-label="Ganze Karte anzeigen"
                className="text-[11px] font-bold flex items-center gap-1 hover:opacity-80"
                style={{ color: primaryColor }}
              >
                {anzeigen.length} von {gesamt} <span aria-hidden>→</span>
              </button>
            )}
          </div>
        );
      // aperitivo: „Unsere Favoriten“ im Textmarker der Sekundärfarbe,
      // rechts „Zur Karte“ in der Primärfarbe.
      case "favoriten":
        return (
          <div className="flex items-center justify-between mb-3">
            <h3>
              <span
                className="inline-block px-2 py-0.5 text-[15px] font-bold rounded-md"
                style={{
                  ...display,
                  backgroundColor: secondaryColor ?? backgroundColor,
                  color: textAufFlaeche(secondaryColor ?? backgroundColor, fontColor),
                }}
              >
                Unsere Favoriten
              </span>
            </h3>
            {onAlle && (
              <button
                type="button"
                onClick={onAlle}
                aria-label="Ganze Karte anzeigen"
                className="text-[12px] font-semibold flex items-center gap-1 hover:opacity-80"
                style={{ color: primaryColor }}
              >
                Zur Karte <span aria-hidden>→</span>
              </button>
            )}
          </div>
        );
      // roesterei: Monospace-Zeile „Auswahl — 04 / 12“.
      case "meta":
        return (
          <div
            className="flex items-center justify-between pb-2 mb-3 text-[10px] uppercase tracking-[0.14em]"
            style={{ ...mono, borderBottom: haarlinie, color: fontColor }}
          >
            <span>Auswahl</span>
            <button
              type="button"
              onClick={onAlle}
              className="opacity-60 hover:opacity-100 tabular-nums"
              aria-label="Ganze Karte anzeigen"
            >
              {zweistellig(anzeigen.length)} / {zweistellig(gesamt)} →
            </button>
          </div>
        );
      case "keine":
      default:
        return null;
    }
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
              {zweistellig(g.items.length)}
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

      // ---- Zweite Runde ----
      // vitrine: fette Zeile in der Display-Schrift.
      case "fett":
        return (
          <h3
            className={`text-[17px] font-bold mb-3 ${abstand}`}
            style={{ ...display, color: fontColor }}
          >
            {g.kategorie}
          </h3>
        );
      // gelato: Display-Schrift mit farbigem Punkt davor.
      case "rund":
        return (
          <h3
            className={`flex items-center gap-2 text-[18px] font-semibold mb-2 ${abstand}`}
            style={{ ...display, color: fontColor }}
          >
            <span
              aria-hidden
              className="w-2.5 h-2.5 rounded-full shrink-0"
              style={{ backgroundColor: primaryColor }}
            />
            <span>{g.kategorie}</span>
          </h3>
        );
      // brauhaus: Kapitälchen zwischen Linien, Rauten als Ornament.
      case "ornament":
        return (
          <h3
            className={`flex items-center gap-3 mb-2 ${caps} ${abstand}`}
            style={{ ...display, color: fontColor }}
          >
            <span aria-hidden className="flex-1 h-px" style={{ backgroundColor: fontColor, opacity: 0.4 }} />
            <span aria-hidden className="text-[8px]">◆</span>
            <span>{g.kategorie}</span>
            <span aria-hidden className="text-[8px]">◆</span>
            <span aria-hidden className="flex-1 h-px" style={{ backgroundColor: fontColor, opacity: 0.4 }} />
          </h3>
        );
      // ramen: kleines rotes Quadrat, Kapitälchen.
      case "siegel":
        return (
          <h3
            className={`flex items-center gap-2 mb-2 ${caps} ${abstand}`}
            style={{ color: fontColor }}
          >
            <span aria-hidden className="w-2 h-2 shrink-0" style={{ backgroundColor: primaryColor }} />
            <span>{g.kategorie}</span>
          </h3>
        );
      // imbiss: gefüllter Balken, Versalien in der Display-Schrift.
      case "block":
        return (
          <h3
            className={`px-3 py-1.5 text-[11px] font-bold uppercase tracking-[0.12em] ${abstand}`}
            style={{ ...display, backgroundColor: fontColor, color: backgroundColor }}
          >
            {g.kategorie}
          </h3>
        );
      // konditorei: kursive Serife auf der Mittelachse zwischen Haarlinien.
      case "mittelachse":
        return (
          <h3 className={`flex items-center gap-3 mb-1 ${abstand}`}>
            <span aria-hidden className="flex-1 h-px" style={{ backgroundColor: fontColor, opacity: 0.25 }} />
            <span
              className="italic text-[20px] leading-none"
              style={{ ...display, color: primaryColor }}
            >
              {g.kategorie}
            </span>
            <span aria-hidden className="flex-1 h-px" style={{ backgroundColor: fontColor, opacity: 0.25 }} />
          </h3>
        );
      // roesterei: Monospace-Zeile mit Zähler und Haarlinie.
      case "meta":
        return (
          <h3
            className={`flex items-center justify-between pb-1.5 mb-2 text-[10px] uppercase tracking-[0.14em] ${abstand}`}
            style={{ ...mono, borderBottom: haarlinie, color: fontColor }}
          >
            <span>{g.kategorie}</span>
            <span className="opacity-50 tabular-nums">{zweistellig(g.items.length)}</span>
          </h3>
        );
      // markt: fette Versalien, grüne Linie, Zähler rechts.
      case "schild":
        return (
          <h3
            className={`flex items-center justify-between pb-1.5 mb-1 text-[13px] font-extrabold uppercase tracking-[0.06em] ${abstand}`}
            style={{ ...display, borderBottom: `2px solid ${primaryColor}`, color: fontColor }}
          >
            <span>{g.kategorie}</span>
            <span className="text-[11px] font-bold opacity-50 tabular-nums">{g.items.length}</span>
          </h3>
        );
      // aperitivo: Textmarker in der Sekundärfarbe.
      case "marker":
        return (
          <h3 className={`mb-3 ${abstand}`}>
            <span
              className="inline-block px-2 py-0.5 text-[15px] font-bold rounded-md"
              style={{
                ...display,
                backgroundColor: secondaryColor ?? backgroundColor,
                color: textAufFlaeche(secondaryColor ?? backgroundColor, fontColor),
              }}
            >
              {g.kategorie}
            </span>
          </h3>
        );
      // hofladen: kursive Serife, kurzer grüner Strich darunter.
      case "blatt":
        return (
          <h3 className={`mb-2 ${abstand}`}>
            <span
              className="block italic text-[19px] leading-tight"
              style={{ ...display, color: fontColor }}
            >
              {g.kategorie}
            </span>
            <span
              aria-hidden
              className="block w-6 h-0.5 mt-1"
              style={{ backgroundColor: primaryColor }}
            />
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

  // ---- Fotokarte: Raster nur, wenn die Seite überhaupt Bilder hat ----
  // Ohne ein einziges Bild ist ein Raster aus Platzhalter-Kacheln der
  // unehrliche Zustand; dann zeigt die Fotokarte eine schlichte Liste.
  const bilderAn = zeigeBilder(template, bildSichtbarkeit);
  const fotoForm: "kachel" | "zeile" =
    layout.dish === "foto" && !(bilderAn && anzeigen.some(hatBild))
      ? "zeile"
      : "kachel";

  // ---- Die Gerichte selbst ----
  const karten = (items: MenuItem[], klasse?: string) =>
    items.map((item, i) => (
      <DishCard
        key={item.id || `${i}`}
        item={item}
        index={positionVon(item, alle, anzeigen)}
        fotoForm={fotoForm}
        fontColor={fontColor}
        priceColor={priceColor}
        primaryColor={primaryColor}
        secondaryColor={secondaryColor}
        backgroundColor={backgroundColor}
        template={template}
        onlineOrdering={onlineOrdering}
        showImage={bilderAn}
        onClick={onItemClick ? () => onItemClick(item) : undefined}
        onAddToCart={onAddToCart}
        isPreview={isPreview}
        className={klasse}
      />
    ));

  // Band: Highlights als Streifen zum Wischen (roesterei). Auf der Karte
  // gilt immer das normale Raster.
  const band = modus === "highlights" && layout.rasterHighlights === "band";
  // Karten mit eigenem Rahmen (Etikett, Karteikarte) brauchen Luft dazwischen.
  const luft = layout.dish === "etikett" || layout.dish === "karteikarte" ? "gap-2" : "";

  const liste = (items: MenuItem[]) =>
    band ? (
      <div className="flex gap-3 overflow-x-auto no-scrollbar -mx-5 px-5 pb-1 snap-x">
        {karten(items, "w-[220px] shrink-0 snap-start")}
      </div>
    ) : layout.raster === "gestapelt" ? (
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
    ) : layout.raster === "kacheln2offen" && fotoForm === "zeile" ? (
      <div className="flex flex-col">{karten(items)}</div>
    ) : layout.raster === "kacheln2offen" ? (
      <div className="grid grid-cols-2 gap-3">{karten(items)}</div>
    ) : layout.dish === "schild" ? (
      // Schild-Zeilen tragen ihre Linie oben — die letzte braucht eine unten.
      <div className="flex flex-col" style={{ borderBottom: `2px solid ${fontColor}` }}>
        {karten(items)}
      </div>
    ) : (
      <div className={`flex flex-col ${luft}`}>{karten(items)}</div>
    );

  const zurKarte =
    modus === "highlights" && onAlle && layout.zurKarte ? (
      <button
        type="button"
        onClick={onAlle}
        className={`mt-5 flex items-center gap-2 ${caps} hover:opacity-80${
          layout.ueberschrift === "mittelachse" ? " mx-auto" : ""
        }`}
        style={{ color: primaryColor }}
      >
        <span>Zur Karte</span>
        <span aria-hidden>→</span>
      </button>
    ) : null;

  // ---- Legende: Allergene und Zusatzstoffe ----
  // Nur auf der Speisekarte, nur für Kürzel, die an einem Gericht stehen UND
  // erklärt sind (client/lib/kennzeichnung.ts). LMIDV § 2 verlangt die
  // Erklärung „gut sichtbar, deutlich und gut lesbar“ in derselben Karte —
  // deshalb 12 px und volle Textfarbe, nicht 9 px in Grau.
  const legendeZeilenListe = modus === "karte" ? legendeZeilen(allergenLegend, alle) : [];
  const legende =
    legendeZeilenListe.length > 0 ? (
      <section
        className="mt-8 pt-4"
        style={{ borderTop: haarlinie, color: fontColor }}
        data-legende
        aria-label="Allergene und Zusatzstoffe"
      >
        <h3 className={`${caps} opacity-70 mb-2`} style={layout.eigen ? display : undefined}>
          Allergene und Zusatzstoffe
        </h3>
        <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-[12px] leading-snug">
          {legendeZeilenListe.map(([code, text]) => (
            <React.Fragment key={code}>
              <dt className="font-semibold tabular-nums" style={layout.eigen ? mono : undefined}>
                {kuerzelAnzeige(code)}
              </dt>
              <dd className="opacity-85">{text}</dd>
            </React.Fragment>
          ))}
        </dl>
      </section>
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
      {legende}
    </section>
  );
});

export default DishList;
