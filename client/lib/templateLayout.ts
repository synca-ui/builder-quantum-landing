/**
 * Layout eines Templates — EINE Quelle für Konfigurator-Vorschau
 * (TemplatePreviewContent) und veröffentlichte Seite (AppRenderer).
 *
 * Bis hierher war ein Template nur ein Bündel aus Palette, Schriftfamilie,
 * Seitenhintergrund (templateWrapperStyle) und Kartenstil (DishCard). Die
 * vier Papier-Templates presse, kiosk, izakaya und morgen brauchen mehr:
 * eine Punktlinie zum Preis, eine laufende Nummer, Rahmenkästen im Raster,
 * Kategorie-Überschriften mit Linie. Alles, was davon in BEIDEN Renderern
 * gleich aussehen muss, steht hier — und nur hier. Wer einen Wert ändert,
 * ändert Vorschau und Live-Seite gemeinsam; das ist der ganze Zweck.
 *
 * `eigen: true` heißt: das Template bringt eigene Papierformen mit —
 * Punktlinie, Register, Rahmenkasten. `eigen: false` ist die Kachel-Optik
 * der Bestands-Templates (minimalist, modern, stylish, cozy, nocturne,
 * riviera, verde). Beide gehen durch DIESELBEN Komponenten (DishList,
 * DishCard, Hero, Navigation, CategoryFilter, ReservationCta); `eigen`
 * wählt nur die Form, nicht den Codepfad. Vorher hatte der Bestand eigene
 * Codepfade in Vorschau UND Live-Seite, und die wichen voneinander ab:
 * Bilder nur im Konfigurator, Kategorien einmal gepflegt und einmal aus den
 * Gerichten abgeleitet, zwei verschiedene Reservieren-Knöpfe.
 */
import type { MenuItem, OpeningHours } from "@/types/domain";
import { typLabel } from "./heroFallback";

export type DishVariant = "tile" | "leader" | "register" | "box" | "ruled";
export type PreisFormat = "euro" | "komma" | "kommaKurz";

export interface TemplateSchrift {
  /** Fließtext, je nachdem was der Nutzer im Design-Schritt wählt. */
  sans: string;
  serif: string;
  monospace: string;
  /** Überschriften und Auszeichnung — folgt dem Template, nicht der Nutzerwahl. */
  display: string;
  /** Ziffernspalten: laufende Nummern, Preise im Register. */
  mono: string;
}

export interface TemplateLayout {
  /** Bringt das Template eigene Layoutformen mit? (false = Bestand) */
  eigen: boolean;
  /** Form einer Gericht-Zeile in DishCard. */
  dish: DishVariant;
  /** Laufende Nummer vor dem Gericht (Position in der ganzen Karte). */
  nummeriert: boolean;
  /** Preisdarstellung. */
  preis: PreisFormat;
  /** Wie viele Gerichte die Startseite als Highlights zeigt. */
  highlights: number;
  /** Anordnung der Gerichte. */
  raster: "gestapelt" | "liste" | "kacheln2";
  /** Form der Kategorie-Überschrift. */
  ueberschrift:
    | "unterstrichen"
    | "kapitaelchen"
    | "kursivLinie"
    | "registerLeiste"
    | "zettelLeiste";
  /** Hero der Startseite. */
  hero: "standard" | "presse" | "kiosk" | "izakaya" | "morgen";
  /** Kopfzeile. */
  nav: "standard" | "doppellinie" | "versal" | "stempel" | "serif";
  /** Kategorie-Filter auf der Speisekarte. */
  filter: "chips" | "tabs" | "eckig";
  /** Reservieren-Aufruf auf der Startseite. */
  cta: "standard" | "geteilt" | "block" | "textlink";
  /** Linienstärke von Leisten, Rahmen und Trennern. */
  linie: "haar" | "kraeftig";
  /** Letztes Wort der Hero-Überschrift kursiv setzen (gesetzte Karte). */
  kursivesLetztesWort: boolean;
  /**
   * Bilder an den Gerichten zeigen? Die Papierformen tragen keine (presse,
   * kiosk, morgen), Kachel und Zettel schon. Der Betreiber kann sie über
   * content.homepageDishImageVisibility ganz abschalten — beides zusammen
   * beantwortet `zeigeBilder`, und zwar für Vorschau und Live-Seite gleich.
   */
  bilder: "kein" | "kachel";
  schrift: TemplateSchrift;
}

// Schriftstapel. Poppins und Space Grotesk lädt index.html global; Newsreader,
// Manrope und Bricolage Grotesque kommen selbst gehostet aus den fontsource-
// Paketen (client/lib/templateFonts.ts) — kein Aufruf an Google-Server.
const POPPINS = '"Poppins", system-ui, sans-serif';
const SYSTEM_SERIF = 'ui-serif, Georgia, Cambria, "Times New Roman", Times, serif';
const SYSTEM_MONO =
  'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", monospace';
const NEWSREADER =
  '"Newsreader Variable", "Newsreader", "Iowan Old Style", "Palatino Linotype", Georgia, serif';
const MANROPE = '"Manrope Variable", "Manrope", "Helvetica Neue", Arial, sans-serif';
const BRICOLAGE =
  '"Bricolage Grotesque Variable", "Bricolage Grotesque", "Helvetica Neue", Arial, sans-serif';
const SPACE_GROTESK = '"Space Grotesk", "Helvetica Neue", Arial, sans-serif';

const STANDARD: TemplateLayout = {
  eigen: false,
  dish: "tile",
  nummeriert: false,
  preis: "euro",
  highlights: 3,
  raster: "gestapelt",
  ueberschrift: "unterstrichen",
  hero: "standard",
  nav: "standard",
  filter: "chips",
  cta: "standard",
  linie: "haar",
  kursivesLetztesWort: false,
  bilder: "kachel",
  schrift: {
    sans: POPPINS,
    serif: SYSTEM_SERIF,
    monospace: SYSTEM_MONO,
    display: POPPINS,
    mono: SYSTEM_MONO,
  },
};

const LAYOUTS: Record<string, TemplateLayout> = {
  /** Bistrokarte: Punktlinien, Serife, keine Bilder. */
  presse: {
    eigen: true,
    dish: "leader",
    nummeriert: false,
    preis: "kommaKurz",
    highlights: 3,
    raster: "liste",
    ueberschrift: "kapitaelchen",
    hero: "presse",
    nav: "doppellinie",
    filter: "tabs",
    cta: "geteilt",
    linie: "haar",
    kursivesLetztesWort: true,
    bilder: "kein",
    schrift: {
      sans: MANROPE,
      serif: NEWSREADER,
      monospace: SYSTEM_MONO,
      display: NEWSREADER,
      mono: SYSTEM_MONO,
    },
  },
  /** Aushang: Bildband, numeriertes Register, Monospace-Preise. */
  kiosk: {
    eigen: true,
    dish: "register",
    nummeriert: true,
    preis: "komma",
    highlights: 3,
    raster: "liste",
    ueberschrift: "registerLeiste",
    hero: "kiosk",
    nav: "versal",
    filter: "eckig",
    cta: "geteilt",
    linie: "kraeftig",
    kursivesLetztesWort: false,
    bilder: "kein",
    schrift: {
      sans: SPACE_GROTESK,
      serif: SYSTEM_SERIF,
      monospace: SYSTEM_MONO,
      display: SPACE_GROTESK,
      mono: SYSTEM_MONO,
    },
  },
  /** Zettel: Rahmenkästen 2×2 mit Nummer, Bild und Preis. */
  izakaya: {
    eigen: true,
    dish: "box",
    nummeriert: true,
    preis: "komma",
    highlights: 4,
    raster: "kacheln2",
    ueberschrift: "zettelLeiste",
    hero: "izakaya",
    nav: "stempel",
    filter: "eckig",
    cta: "block",
    linie: "kraeftig",
    kursivesLetztesWort: false,
    bilder: "kachel",
    schrift: {
      sans: BRICOLAGE,
      serif: SYSTEM_SERIF,
      monospace: SYSTEM_MONO,
      display: BRICOLAGE,
      mono: SYSTEM_MONO,
    },
  },
  /** Frühstückskarte: Linien, kursive Kobalt-Serife für Zeitfenster und Preise. */
  morgen: {
    eigen: true,
    dish: "ruled",
    nummeriert: false,
    preis: "komma",
    highlights: 3,
    raster: "liste",
    ueberschrift: "kursivLinie",
    hero: "morgen",
    nav: "serif",
    filter: "tabs",
    cta: "textlink",
    linie: "haar",
    kursivesLetztesWort: true,
    bilder: "kein",
    schrift: {
      sans: MANROPE,
      serif: NEWSREADER,
      monospace: SYSTEM_MONO,
      display: NEWSREADER,
      mono: SYSTEM_MONO,
    },
  },
};

export function getTemplateLayout(template?: string | null): TemplateLayout {
  return (template && LAYOUTS[template]) || STANDARD;
}

/** IDs der Templates mit eigenem Layout — für Tests und den Picker-Wächter. */
export const EIGENE_TEMPLATES = Object.keys(LAYOUTS);

/**
 * Fließtext-Stapel für die im Design-Schritt gewählte Schriftfamilie.
 * "serif" auf einem Template mit Grotesk-Vorgabe liefert dessen Serife,
 * nicht irgendeine — der Nutzer wechselt die Gattung, das Template die Wahl.
 */
export function templateSchriftFuer(
  template: string | null | undefined,
  fontFamily: string | null | undefined,
): string {
  const s = getTemplateLayout(template).schrift;
  const k = String(fontFamily ?? "").trim().toLowerCase();
  if (k === "serif") return s.serif;
  if (k === "monospace" || k === "mono") return s.monospace;
  return s.sans;
}

/**
 * Zeigt dieses Template Bilder an den Gerichten? EINE Regel für Vorschau und
 * veröffentlichte Seite. Vorher gab die Vorschau der Speisekarte
 * `showImage={true}` mit und die Live-Seite nie: Der Betreiber lud Fotos hoch,
 * sah sie im Konfigurator und seine Gäste bekamen eine Karte ohne Bilder.
 *
 * `sichtbarkeit` ist content.homepageDishImageVisibility — „hidden“ schaltet
 * die Bilder überall ab, jeder andere Wert (Vorgabe „visible“) lässt sie zu.
 */
export function zeigeBilder(
  template: string | null | undefined,
  sichtbarkeit?: string | null,
): boolean {
  if (getTemplateLayout(template).bilder !== "kachel") return false;
  return String(sichtbarkeit ?? "visible").trim().toLowerCase() !== "hidden";
}

// ---------------------------------------------------------------------------
// Preis, Nummer, Auswahl — Rechenhelfer, die beide Renderer teilen
// ---------------------------------------------------------------------------

/**
 * Preis in der Schreibweise des Templates.
 *   euro:      "8.50€"  (Bestand — unverändert, damit keine Live-Seite kippt)
 *   komma:     "8,50"   (gesetzte Karte: Komma, kein Währungszeichen)
 *   kommaKurz: "9" / "8,50" (ganze Beträge ohne Nachkommastellen)
 */
export function formatPreis(
  price: MenuItem["price"],
  format: PreisFormat,
): string {
  if (price === undefined || price === null || price === "") return "";

  if (format === "euro") {
    return typeof price === "number" ? `${price.toFixed(2)}€` : `${price}€`;
  }

  const zahl =
    typeof price === "number"
      ? price
      : Number(String(price).replace(/[€\s]/g, "").replace(",", "."));

  if (!Number.isFinite(zahl)) {
    // Freitext wie "ab 12" bleibt Freitext — nur ohne Währungszeichen.
    return String(price).replace(/€/g, "").trim();
  }

  const ganz = Math.abs(zahl - Math.round(zahl)) < 0.005;
  if (format === "kommaKurz" && ganz) return String(Math.round(zahl));
  return zahl.toFixed(2).replace(".", ",");
}

/** Laufende Nummer „01“, „02“ … aus dem 0-basierten Index. */
export function laufendeNummer(index: number): string {
  return String(index + 1).padStart(2, "0");
}

/**
 * Highlights der Startseite: markierte Gerichte zuerst, dann in Karten-
 * Reihenfolge aufgefüllt. KEIN Zufall — die Live-Seite würfelte früher bei
 * jedem Render neu, die Vorschau nicht; so sahen Betreiber etwas anderes
 * als ihre Gäste.
 */
export function waehleHighlights<T extends { isHighlight?: boolean }>(
  items: T[],
  anzahl: number,
): T[] {
  const markiert = items.filter((i) => i.isHighlight);
  const rest = items.filter((i) => !i.isHighlight);
  return [...markiert, ...rest].slice(0, anzahl);
}

/**
 * Rubrik für Gerichte ohne Kategorie. Die Live-Seite erfindet sie über
 * normalizeConfig („Sonstiges“), der Konfigurator-Store lässt das Feld leer —
 * ohne eine gemeinsame Regel zeigte die veröffentlichte Seite eine
 * Überschrift und einen Reiter, die die Vorschau nie hatte.
 */
export const OHNE_KATEGORIE = "Sonstiges";

/** Kategorie eines Gerichts, wie Filter und Liste sie in BEIDEN Renderern sehen. */
export function kategorieVon(item: Pick<MenuItem, "category">): string {
  return item.category?.trim() || OHNE_KATEGORIE;
}

/**
 * Kategorienreihenfolge für Filter und Liste — EINE Regel für beide
 * Renderer: erst die gepflegte Liste (content.categories), dann alles, was
 * nur an Gerichten hängt, in Auftrittsfolge; „Sonstiges“ zuletzt. Nur
 * Kategorien mit mindestens einem Gericht: Die Typ-Vorgaben legen „Suppen“
 * oder „Wein“ an, bevor je ein Gericht dort steht — ein Reiter, hinter dem
 * „Keine Artikel“ wartet, ist kein Reiter. Vorher las die Live-Seite die
 * Kategorien aus den Gerichten, die Vorschau aus der gepflegten Liste —
 * Reiter und Gruppen standen in verschiedener Reihenfolge.
 */
export function kategorienReihenfolge(
  gepflegt: (string | undefined | null)[] | undefined,
  items: MenuItem[],
): string[] {
  const belegt = new Set(items.map(kategorieVon));
  const liste = (gepflegt ?? [])
    .map((k) => (typeof k === "string" ? k.trim() : ""))
    .filter((k) => k !== "" && k !== OHNE_KATEGORIE && belegt.has(k));
  const extra: string[] = [];
  items.forEach((it) => {
    const k = kategorieVon(it);
    if (k !== OHNE_KATEGORIE && !liste.includes(k) && !extra.includes(k)) {
      extra.push(k);
    }
  });
  return [...liste, ...extra, ...(belegt.has(OHNE_KATEGORIE) ? [OHNE_KATEGORIE] : [])];
}

/**
 * Schwarz oder Weiß auf einer Füllfarbe — je nachdem, was den höheren
 * WCAG-Kontrast liefert. Kiosk-Orange (#E8541F) trägt Weiß nur mit 3,7:1,
 * Schwarz mit 5,7:1; Tomatenrot und Kobalt tragen Weiß.
 */
export function textAufFarbe(hex: string): "#000000" | "#FFFFFF" {
  const m = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (!m) return "#FFFFFF";
  const lin = (c: string) => {
    const v = parseInt(c, 16) / 255;
    return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
  };
  const L = 0.2126 * lin(m[1]) + 0.7152 * lin(m[2]) + 0.0722 * lin(m[3]);
  const weiss = 1.05 / (L + 0.05);
  const schwarz = (L + 0.05) / 0.05;
  return weiss >= schwarz ? "#FFFFFF" : "#000000";
}

export interface Kategoriegruppe {
  /** Immer belegt — Gerichte ohne Kategorie stehen unter OHNE_KATEGORIE. */
  kategorie: string;
  items: MenuItem[];
}

/**
 * Gerichte nach Kategorie gruppieren. Reihenfolge: erst die gepflegte
 * Kategorienliste, dann alles, was nur an Gerichten hängt, in Auftrittsfolge.
 * Gerichte ohne Kategorie stehen zuletzt unter `kategorie: null`.
 */
export function gruppiereNachKategorie(
  items: MenuItem[],
  categories: string[] = [],
): Kategoriegruppe[] {
  const gruppen = new Map<string, MenuItem[]>();
  items.forEach((item) => {
    const k = kategorieVon(item);
    if (!gruppen.has(k)) gruppen.set(k, []);
    gruppen.get(k)!.push(item);
  });
  // Reihenfolge wie die Reiter: gepflegt, dann Auftritt, „Sonstiges“ zuletzt.
  return kategorienReihenfolge(categories, items)
    .filter((k) => gruppen.has(k))
    .map((k) => ({ kategorie: k, items: gruppen.get(k)! }));
}

/**
 * Überschrift in Kopf und kursives letztes Wort teilen: „Der Tag beginnt
 * langsam hier.“ → ["Der Tag beginnt langsam", "hier."]. Ein einzelnes
 * Wort bleibt ganz aufrecht — ein kursiver Betriebsname wäre Zufall.
 */
export function teileLetztesWort(text: string): [string, string | null] {
  const woerter = text.trim().split(/\s+/);
  if (woerter.length < 2) return [text.trim(), null];
  const letztes = woerter.pop()!;
  return [woerter.join(" "), letztes];
}

const TAGE = [
  "sunday",
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
];

/**
 * Kurzer Tageshinweis für Kicker und Bildband: „bis 23 Uhr“ oder „heute
 * geschlossen“. Ohne Öffnungszeiten (oder ohne Eintrag für heute) nichts —
 * lieber keine Zeile als eine erfundene.
 */
export function heuteHinweis(
  hours?: OpeningHours | null,
  jetzt: Date = new Date(),
): string | null {
  if (!hours) return null;
  const heute = hours[TAGE[jetzt.getDay()]];
  if (!heute) return null;
  if (heute.closed) return "heute geschlossen";
  const m = /^(\d{1,2}):(\d{2})$/.exec(heute.close ?? "");
  if (!m) return null;
  // „00:00“ heißt Mitternacht — „bis 0 Uhr“ liest niemand richtig.
  const stunde = m[1] === "00" && m[2] === "00" ? "24" : String(Number(m[1]));
  return m[2] === "00" ? `bis ${stunde} Uhr` : `bis ${stunde}:${m[2]} Uhr`;
}

/**
 * Kicker über der Hero-Überschrift — EIN Rechenweg für beide Renderer.
 *   kiosk:    nur der Tageshinweis, als Marke im Bildband
 *   izakaya:  nur der Tageshinweis — die Betriebsart steht schon im
 *             vertikalen Seitenlabel des Rahmens
 *   presse:   „Restaurant · bis 23 Uhr“, aber die Betriebsart nur, wenn eine
 *             eigene Beschreibung da ist — sonst nennt die Unterzeile sie
 *             bereits („Restaurant in Leipzig“, heroFallback.ts) und sie
 *             stünde zweimal untereinander
 *   morgen, Bestand: nichts
 */
export function heroKicker(
  template: string | null | undefined,
  businessType?: string,
  hours?: OpeningHours | null,
  jetzt: Date = new Date(),
  beschreibung?: string | null,
): string | null {
  const layout = getTemplateLayout(template);
  if (!layout.eigen || layout.hero === "morgen") return null;
  const hinweis = heuteHinweis(hours, jetzt);
  if (layout.hero === "kiosk" || layout.hero === "izakaya") return hinweis;
  const typ = beschreibung?.trim() ? typLabel(businessType) : undefined;
  const teile = [typ, hinweis].filter(Boolean);
  return teile.length ? teile.join(" · ") : null;
}
