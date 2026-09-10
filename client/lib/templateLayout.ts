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
 * `eigen: true` heißt: das Template bringt eigene Formen mit —
 * Punktlinie, Register, Rahmenkasten, Fotokachel, Sticker, Preisschild.
 * `eigen: false` ist die Kachel-Optik der Bestands-Templates (minimalist,
 * modern, stylish, cozy, nocturne, riviera, verde). Beide gehen durch
 * DIESELBEN Komponenten (DishList, DishCard, Hero, Navigation,
 * CategoryFilter, ReservationCta); `eigen` wählt nur die Form, nicht den
 * Codepfad. Vorher hatte der Bestand eigene Codepfade in Vorschau UND
 * Live-Seite, und die wichen voneinander ab: Bilder nur im Konfigurator,
 * Kategorien einmal gepflegt und einmal aus den Gerichten abgeleitet, zwei
 * verschiedene Reservieren-Knöpfe.
 *
 * Seit den zehn Templates der zweiten Runde (vitrine … hofladen) sind die
 * Formen nicht mehr aus der Überschriftenform abgeleitet, sondern einzeln
 * benannt: Leiste, Gruppierung, Kicker, Knopfschrift, Raster der
 * Highlights. Ein neues Template ist damit ein Eintrag in LAYOUTS plus
 * die Formen, die es tatsächlich neu mitbringt — nichts davon steht in
 * einem Renderer.
 */
import type { MenuItem, OpeningHours } from "@/types/domain";
import { typLabel } from "./heroFallback";

export type DishVariant =
  // Bestand und die vier Papier-Templates
  | "tile"
  | "leader"
  | "register"
  | "box"
  | "ruled"
  // Zweite Runde
  | "foto" // vitrine: Bildkachel, Name und Preis darunter
  | "sticker" // gelato: runde, getönte Karte mit Kreisbild und Preis-Pille
  | "strich" // brauhaus: Strichlinie zum Preis, Egyptienne
  | "hairline" // ramen: Haarlinie, kurzer roter Strich unterm Namen
  | "schild" // imbiss: dicke Linie über der Zeile, Preis als Schild
  | "zentriert" // konditorei: Mittelachse, Preis in Kapitälchen
  | "etikett" // roesterei: Rahmenkarte mit Monospace-Kopfzeile
  | "preisschild" // markt: Preisschild zuerst, dann das Gericht
  | "kreis" // aperitivo: getönte Karte mit Kreisbild
  | "karteikarte"; // hofladen: gestrichelte Karte

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
  /** Anordnung der Gerichte auf der Speisekarte. */
  raster: "gestapelt" | "liste" | "kacheln2" | "kacheln2offen";
  /** Anordnung der Highlights auf der Startseite — „band“ ist ein Streifen zum Wischen. */
  rasterHighlights: "wieKarte" | "band";
  /** Form der Kategorie-Überschrift. */
  ueberschrift:
    | "unterstrichen"
    | "kapitaelchen"
    | "kursivLinie"
    | "registerLeiste"
    | "zettelLeiste"
    | "fett"
    | "rund"
    | "ornament"
    | "siegel"
    | "block"
    | "mittelachse"
    | "meta"
    | "schild"
    | "marker"
    | "blatt";
  /**
   * Leiste über den Highlights der Startseite. Jedes Template mit Leiste hat
   * seine eigene — die App-artigen Templates teilten sich zuerst eine
   * generische „Highlights / Alle ansehen“-Zeile, das war das Muster jeder
   * Liefer-App und nicht das der Papier-Templates.
   */
  leiste:
    | "keine"
    | "highlights" // Bestand
    | "register" // kiosk
    | "heute" // izakaya
    | "galerie" // vitrine
    | "lieblinge" // gelato
    | "schild" // imbiss
    | "meta" // roesterei
    | "tafel" // markt
    | "favoriten"; // aperitivo
  /** Highlights der Startseite unter Kategorie-Überschriften (wie die Karte)? */
  highlightsGruppiert: boolean;
  /** Textlink „Zur Karte“ unter den Highlights. */
  zurKarte: boolean;
  /** Hero der Startseite. */
  hero:
    | "standard"
    | "presse"
    | "kiosk"
    | "izakaya"
    | "morgen"
    | "vitrine"
    | "gelato"
    | "brauhaus"
    | "ramen"
    | "imbiss"
    | "konditorei"
    | "roesterei"
    | "markt"
    | "aperitivo"
    | "hofladen";
  /** Kopfzeile. */
  nav:
    | "standard"
    | "doppellinie"
    | "versal"
    | "stempel"
    | "serif"
    | "fett"
    | "pille"
    | "balken"
    | "siegel"
    | "schild"
    | "mitte"
    | "mono"
    | "streifen"
    | "kreis"
    | "gestrichelt";
  /** Kategorie-Filter auf der Speisekarte. */
  filter:
    | "chips"
    | "tabs"
    | "eckig"
    | "pillen"
    | "punkte"
    | "kursiv"
    | "monoEckig"
    | "pillenRahmen";
  /** Reservieren-Aufruf auf der Startseite. */
  cta:
    | "standard"
    | "geteilt"
    | "block"
    | "textlink"
    | "rund"
    | "rahmen"
    | "schild"
    | "zierlinie";
  /** Linienstärke von Leisten, Rahmen und Trennern. */
  linie: "haar" | "kraeftig" | "gestrichelt";
  /**
   * Kicker über der Hero-Überschrift: nichts, nur der Tageshinweis („bis
   * 23 Uhr“) oder Betriebsart · Tageshinweis. Was daraus wird, rechnet
   * heroKicker — in beiden Renderern gleich.
   */
  kicker: "keiner" | "hinweis" | "typHinweis";
  /** Schrift der Knöpfe im Hero: Versalien mit Sperrung (Papier) oder normal. */
  knopf: "versal" | "normal";
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

// Schriftstapel. Poppins und Space Grotesk kommen über client/lib/siteFonts.ts,
// alle anderen Familien selbst gehostet aus den fontsource-Paketen
// (client/lib/templateFonts.ts) — kein Aufruf an Google-Server. Die Namen
// mit „Variable“ sind die aus den @font-face-Regeln der Pakete; ein Tippfehler
// hier fällt still auf den Systemstapel zurück, deshalb prüft
// templateFonts.test.ts jede Familie gegen ihr Paket.
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
const PLUS_JAKARTA =
  '"Plus Jakarta Sans Variable", "Plus Jakarta Sans", "Helvetica Neue", Arial, sans-serif';
const FREDOKA = '"Fredoka Variable", "Fredoka", "Nunito", "Helvetica Neue", Arial, sans-serif';
const BITTER = '"Bitter Variable", "Bitter", "Roboto Slab", Georgia, serif';
const INSTRUMENT =
  '"Instrument Sans Variable", "Instrument Sans", "Helvetica Neue", Arial, sans-serif';
const UNBOUNDED = '"Unbounded Variable", "Unbounded", "Arial Black", Impact, sans-serif';
const CORMORANT =
  '"Cormorant Variable", "Cormorant", "Cormorant Garamond", Garamond, Georgia, serif';
const JETBRAINS =
  '"JetBrains Mono Variable", "JetBrains Mono", ui-monospace, SFMono-Regular, Menlo, monospace';
const FIGTREE = '"Figtree Variable", "Figtree", "Helvetica Neue", Arial, sans-serif';
const SYNE = '"Syne Variable", "Syne", "Helvetica Neue", Arial, sans-serif';
const LORA = '"Lora Variable", "Lora", Georgia, "Times New Roman", serif';

/** Familien, die templateFonts.ts einbinden muss — für den Wächtertest. */
export const SELBST_GEHOSTETE_FAMILIEN = [
  "Newsreader Variable",
  "Manrope Variable",
  "Bricolage Grotesque Variable",
  "Plus Jakarta Sans Variable",
  "Fredoka Variable",
  "Bitter Variable",
  "Instrument Sans Variable",
  "Unbounded Variable",
  "Cormorant Variable",
  "JetBrains Mono Variable",
  "Figtree Variable",
  "Syne Variable",
  "Lora Variable",
];

const STANDARD: TemplateLayout = {
  eigen: false,
  dish: "tile",
  nummeriert: false,
  preis: "euro",
  highlights: 3,
  raster: "gestapelt",
  rasterHighlights: "wieKarte",
  ueberschrift: "unterstrichen",
  leiste: "highlights",
  highlightsGruppiert: false,
  zurKarte: false,
  hero: "standard",
  nav: "standard",
  filter: "chips",
  cta: "standard",
  linie: "haar",
  kicker: "keiner",
  knopf: "normal",
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

/** Gemeinsame Vorgaben der eigenen Layouts — jedes Template überschreibt, was es anders macht. */
const EIGEN: Omit<TemplateLayout, "dish" | "hero" | "nav" | "schrift"> = {
  eigen: true,
  nummeriert: false,
  preis: "komma",
  highlights: 3,
  raster: "liste",
  rasterHighlights: "wieKarte",
  ueberschrift: "kapitaelchen",
  leiste: "keine",
  highlightsGruppiert: false,
  zurKarte: false,
  filter: "tabs",
  cta: "geteilt",
  linie: "haar",
  kicker: "hinweis",
  knopf: "versal",
  kursivesLetztesWort: false,
  bilder: "kein",
};

const LAYOUTS: Record<string, TemplateLayout> = {
  /** Bistrokarte: Punktlinien, Serife, keine Bilder. */
  presse: {
    ...EIGEN,
    dish: "leader",
    preis: "kommaKurz",
    ueberschrift: "kapitaelchen",
    highlightsGruppiert: true,
    zurKarte: true,
    hero: "presse",
    nav: "doppellinie",
    filter: "tabs",
    cta: "geteilt",
    kicker: "typHinweis",
    kursivesLetztesWort: true,
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
    ...EIGEN,
    dish: "register",
    nummeriert: true,
    ueberschrift: "registerLeiste",
    leiste: "register",
    hero: "kiosk",
    nav: "versal",
    filter: "eckig",
    cta: "geteilt",
    linie: "kraeftig",
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
    ...EIGEN,
    dish: "box",
    nummeriert: true,
    highlights: 4,
    raster: "kacheln2",
    ueberschrift: "zettelLeiste",
    leiste: "heute",
    hero: "izakaya",
    nav: "stempel",
    filter: "eckig",
    cta: "block",
    linie: "kraeftig",
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
    ...EIGEN,
    dish: "ruled",
    ueberschrift: "kursivLinie",
    highlightsGruppiert: true,
    zurKarte: true,
    hero: "morgen",
    nav: "serif",
    filter: "tabs",
    cta: "textlink",
    kicker: "keiner",
    kursivesLetztesWort: true,
    schrift: {
      sans: MANROPE,
      serif: NEWSREADER,
      monospace: SYSTEM_MONO,
      display: NEWSREADER,
      mono: SYSTEM_MONO,
    },
  },

  // -------------------------------------------------------------------------
  // Zweite Runde — zehn Templates, jedes für eine andere Art Betrieb
  // -------------------------------------------------------------------------

  /** Fotokarte: Bildkacheln in zwei Spalten — Küchen, die man zeigen kann. */
  vitrine: {
    ...EIGEN,
    dish: "foto",
    highlights: 4,
    raster: "kacheln2offen",
    ueberschrift: "fett",
    leiste: "galerie",
    hero: "vitrine",
    nav: "fett",
    filter: "pillen",
    cta: "rund",
    kicker: "keiner",
    knopf: "normal",
    bilder: "kachel",
    schrift: {
      sans: PLUS_JAKARTA,
      serif: SYSTEM_SERIF,
      monospace: SYSTEM_MONO,
      display: PLUS_JAKARTA,
      mono: SYSTEM_MONO,
    },
  },
  /** Eisdiele: Pastell, Sticker-Karten mit Kreisbild, Preis in der Pille. */
  gelato: {
    ...EIGEN,
    dish: "sticker",
    raster: "gestapelt",
    ueberschrift: "rund",
    leiste: "lieblinge",
    hero: "gelato",
    nav: "pille",
    filter: "pillen",
    cta: "rund",
    knopf: "normal",
    bilder: "kachel",
    schrift: {
      sans: MANROPE,
      serif: SYSTEM_SERIF,
      monospace: SYSTEM_MONO,
      display: FREDOKA,
      mono: SYSTEM_MONO,
    },
  },
  /** Gasthaus: Egyptienne, Doppelrahmen, Strichlinien, Ornament-Überschriften. */
  brauhaus: {
    ...EIGEN,
    dish: "strich",
    ueberschrift: "ornament",
    highlightsGruppiert: true,
    zurKarte: true,
    hero: "brauhaus",
    nav: "balken",
    filter: "eckig",
    cta: "rahmen",
    linie: "kraeftig",
    kicker: "typHinweis",
    schrift: {
      sans: MANROPE,
      serif: BITTER,
      monospace: SYSTEM_MONO,
      display: BITTER,
      mono: SYSTEM_MONO,
    },
  },
  /** Purist: Weißraum, Haarlinien, ein rotes Siegel. */
  ramen: {
    ...EIGEN,
    dish: "hairline",
    ueberschrift: "siegel",
    zurKarte: true,
    hero: "ramen",
    nav: "siegel",
    filter: "punkte",
    cta: "rahmen",
    schrift: {
      sans: INSTRUMENT,
      serif: SYSTEM_SERIF,
      monospace: SYSTEM_MONO,
      display: INSTRUMENT,
      mono: SYSTEM_MONO,
    },
  },
  /** Imbissbude: Schwarz auf Gelb, dicke Linien, Preis als Schild. */
  imbiss: {
    ...EIGEN,
    dish: "schild",
    ueberschrift: "block",
    leiste: "schild",
    hero: "imbiss",
    nav: "schild",
    filter: "eckig",
    cta: "schild",
    linie: "kraeftig",
    schrift: {
      sans: SPACE_GROTESK,
      serif: SYSTEM_SERIF,
      monospace: SYSTEM_MONO,
      display: UNBOUNDED,
      mono: SYSTEM_MONO,
    },
  },
  /** Kaffeehaus: Mittelachse, kursive Serife, Zierlinie. */
  konditorei: {
    ...EIGEN,
    dish: "zentriert",
    ueberschrift: "mittelachse",
    highlightsGruppiert: true,
    zurKarte: true,
    hero: "konditorei",
    nav: "mitte",
    filter: "kursiv",
    cta: "zierlinie",
    kicker: "typHinweis",
    kursivesLetztesWort: true,
    schrift: {
      sans: MANROPE,
      serif: CORMORANT,
      monospace: SYSTEM_MONO,
      display: CORMORANT,
      mono: SYSTEM_MONO,
    },
  },
  /** Rösterei: Monospace-Etiketten mit Nummer, Highlights als Band. */
  roesterei: {
    ...EIGEN,
    dish: "etikett",
    nummeriert: true,
    highlights: 4,
    rasterHighlights: "band",
    ueberschrift: "meta",
    leiste: "meta",
    hero: "roesterei",
    nav: "mono",
    filter: "monoEckig",
    cta: "geteilt",
    schrift: {
      sans: MANROPE,
      serif: SYSTEM_SERIF,
      monospace: JETBRAINS,
      display: JETBRAINS,
      mono: JETBRAINS,
    },
  },
  /** Markthalle: Preisschild zuerst, grüner Streifen oben. */
  markt: {
    ...EIGEN,
    dish: "preisschild",
    ueberschrift: "schild",
    leiste: "tafel",
    hero: "markt",
    nav: "streifen",
    filter: "pillen",
    cta: "geteilt",
    kicker: "typHinweis",
    knopf: "normal",
    schrift: {
      sans: FIGTREE,
      serif: SYSTEM_SERIF,
      monospace: SYSTEM_MONO,
      display: FIGTREE,
      mono: SYSTEM_MONO,
    },
  },
  /** Aperitivo: Koralle und Pfirsich, runde Karten mit Kreisbild. */
  aperitivo: {
    ...EIGEN,
    dish: "kreis",
    highlights: 4,
    raster: "kacheln2offen",
    ueberschrift: "marker",
    leiste: "favoriten",
    hero: "aperitivo",
    nav: "kreis",
    filter: "pillen",
    cta: "rund",
    knopf: "normal",
    bilder: "kachel",
    schrift: {
      sans: MANROPE,
      serif: SYSTEM_SERIF,
      monospace: SYSTEM_MONO,
      display: SYNE,
      mono: SYSTEM_MONO,
    },
  },
  /** Hofcafé: Leinen, gestrichelte Karteikarten, Stempel mit Betriebsart. */
  hofladen: {
    ...EIGEN,
    dish: "karteikarte",
    ueberschrift: "blatt",
    highlightsGruppiert: true,
    zurKarte: true,
    hero: "hofladen",
    nav: "gestrichelt",
    filter: "pillenRahmen",
    cta: "rahmen",
    linie: "gestrichelt",
    kursivesLetztesWort: true,
    schrift: {
      sans: MANROPE,
      serif: LORA,
      monospace: SYSTEM_MONO,
      display: LORA,
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

/** Anfangsbuchstabe für Siegel, Stempel und Bildplatzhalter — „?“ ohne Namen. */
export function initiale(name?: string | null): string {
  const t = (name ?? "").trim();
  return t ? t.charAt(0).toUpperCase() : "?";
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

/** WCAG-Kontrastverhältnis zweier 6-stelliger Hexfarben (1 … 21). */
export function kontrast(a: string, b: string): number {
  const lum = (hex: string): number | null => {
    const m = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    if (!m) return null;
    const lin = (c: string) => {
      const v = parseInt(c, 16) / 255;
      return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
    };
    return 0.2126 * lin(m[1]) + 0.7152 * lin(m[2]) + 0.0722 * lin(m[3]);
  };
  const la = lum(a);
  const lb = lum(b);
  if (la === null || lb === null) return 1;
  const [hi, lo] = la > lb ? [la, lb] : [lb, la];
  return (hi + 0.05) / (lo + 0.05);
}

/** 6-stellige Hexfarbe mit Alpha (0 … 1) als 8-stellige: „#BEE3C9“ + 0,55 → „#BEE3C98C“. */
export function mitAlpha(hex: string, alpha: number): string {
  const a = Math.round(Math.max(0, Math.min(1, alpha)) * 255)
    .toString(16)
    .padStart(2, "0")
    .toUpperCase();
  return `${hex}${a}`;
}

/**
 * Welche Farbe eine halbtransparente Fläche tatsächlich hat: `oben` mit
 * `alpha` über `unten`. Damit lässt sich der Kontrast eines Textes auf einer
 * getönten Karte rechnen, statt ihn zu raten.
 */
export function mische(oben: string, unten: string, alpha: number): string {
  const p = (hex: string) => {
    const m = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return m ? [parseInt(m[1], 16), parseInt(m[2], 16), parseInt(m[3], 16)] : null;
  };
  const o = p(oben);
  const u = p(unten);
  if (!o || !u) return unten;
  const a = Math.max(0, Math.min(1, alpha));
  return (
    "#" +
    o
      .map((c, i) =>
        Math.round(c * a + u[i] * (1 - a))
          .toString(16)
          .padStart(2, "0"),
      )
      .join("")
      .toUpperCase()
  );
}

/**
 * Textfarbe auf einer Fläche: die bevorzugte (meist die Textfarbe des
 * Designs), wenn sie darauf WCAG AA erreicht — sonst Schwarz oder Weiß, je
 * nachdem, was auf der Fläche besser liest. Die Flächen in der Sekundärfarbe
 * (Hero der Eisdiele und Imbissbude, Karten von Aperitivo und Eisdiele)
 * tragen sonst mit dunkler Nutzer-Sekundärfarbe unlesbaren Text.
 */
export function textAufFlaeche(
  flaeche: string,
  bevorzugt: string,
  mindestens = 4.5,
): string {
  return kontrast(bevorzugt, flaeche) >= mindestens
    ? bevorzugt
    : textAufFarbe(flaeche);
}

/**
 * Hat das Gericht ein Bild? Nur die Frage, keine Adresse — DishCard löst die
 * Adresse selbst auf (auch für Dateien aus dem Konfigurator). Die Fotokarte
 * entscheidet damit, ob sie ein Fotoraster oder eine schlichte Liste zeigt.
 */
export function hatBild(item: Pick<MenuItem, "imageUrl" | "image">): boolean {
  if (item.imageUrl) return true;
  const img = item.image as unknown;
  if (!img) return false;
  if (typeof img === "string") return img !== "" && img !== "/placeholder.svg";
  const o = img as { url?: string; file?: unknown };
  return Boolean(o.url && o.url !== "/placeholder.svg") || Boolean(o.file);
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
 * Kicker über der Hero-Überschrift — EIN Rechenweg für beide Renderer,
 * gesteuert über `layout.kicker`:
 *   hinweis:    nur der Tageshinweis (kiosk als Marke im Bildband, izakaya —
 *               die Betriebsart steht schon im vertikalen Seitenlabel —,
 *               gelato, ramen, imbiss, roesterei, aperitivo, hofladen)
 *   typHinweis: „Restaurant · bis 23 Uhr“, aber die Betriebsart nur, wenn
 *               eine eigene Beschreibung da ist — sonst nennt die Unterzeile
 *               sie bereits („Restaurant in Leipzig“, heroFallback.ts) und sie
 *               stünde zweimal untereinander (presse, brauhaus, konditorei, markt)
 *   keiner:     nichts (morgen, vitrine, Bestand)
 */
export function heroKicker(
  template: string | null | undefined,
  businessType?: string,
  hours?: OpeningHours | null,
  jetzt: Date = new Date(),
  beschreibung?: string | null,
): string | null {
  const layout = getTemplateLayout(template);
  if (layout.kicker === "keiner") return null;
  const hinweis = heuteHinweis(hours, jetzt);
  if (layout.kicker === "hinweis") return hinweis;
  const typ = beschreibung?.trim() ? typLabel(businessType) : undefined;
  const teile = [typ, hinweis].filter(Boolean);
  return teile.length ? teile.join(" · ") : null;
}
