/**
 * Der Katalog der Vorlagen — EINE Liste für Picker, Seed, Registry und API.
 *
 * Anlass: Die vier Stellen liefen auseinander. Der Konfigurator-Picker bot
 * minimalist, modern, presse, kiosk, izakaya, morgen an; prisma/seed.ts,
 * das (nirgends aufgerufene) prisma/seed-templates.ts, die TemplateRegistry
 * und damit auch GET /api/templates kannten dagegen nur minimalist, modern,
 * stylish, cozy. Das war nicht bloß unsauber, sondern kaputt:
 *
 *   - server/routes/configurations.ts lehnt einen Speichervorgang mit
 *     400 "Invalid template" ab, wenn `selectedTemplate` keine Zeile in
 *     Template hat. Wer im Picker "Bistrokarte" wählte, konnte seine
 *     bestehende Konfiguration nicht mehr speichern.
 *   - BusinessService.ensureUserBusiness legt den Betrieb bei unbekannter
 *     Vorlage ohne Bezug an (bewusst, damit das Veröffentlichen nicht
 *     scheitert) — der Bezug fehlte also für sechs von elf Vorlagen.
 *   - Das Demo-Dashboard zeigte eine Vorlagenliste, die es so nicht gibt.
 *
 * Deshalb steht hier, WELCHE Vorlagen es gibt und welche davon zur Wahl
 * stehen. Was eine Vorlage AUSSIEHT, steht weiterhin woanders und wird von
 * hier nur gelesen, nie kopiert:
 *
 *   - Palette, Abstände, Schriftgrößen -> client/lib/templateTokens.ts
 *   - Layoutformen (Punktlinie, Register, Rahmen) -> client/lib/templateLayout.ts
 *   - Anzeigenamen in der Oberfläche -> client/i18n/locales/*.json
 *
 * Der Vertragstest shared/templateCatalog.spec.ts hält die Stellen zusammen.
 *
 * Relativer Import statt "@"-Alias: Diese Datei wird auch von prisma/seed.ts
 * (tsx) und vom Server-Bündel geladen. Gleiche Begründung wie bei
 * shared/suggestedConfig.ts. client/lib/templateTokens.ts ist reines
 * TypeScript ohne React- oder DOM-Bezug und deshalb überall ladbar.
 */
import {
  getTemplateIntent,
  getTemplateTokens,
  type TemplateIntent,
  type TemplateTokens,
} from "../client/lib/templateTokens";
import { getTemplateLayout } from "../client/lib/templateLayout";

export interface TemplateKatalogEintrag {
  id: string;
  /**
   * Steht die Vorlage im Konfigurator zur Wahl?
   *
   * `false` heißt Alt-Bestand: Die Vorlage rendert weiter und bleibt in
   * bestehenden Konfigurationen erhalten, wird aber niemandem mehr
   * angeboten. Sie muss trotzdem in der Datenbank stehen, sonst kann
   * niemand mehr speichern, der sie noch benutzt.
   */
  imPicker: boolean;
  /** Englischer Name für Datenbank und API. Oberfläche nimmt i18n. */
  name: string;
  /** Englische Beschreibung für Datenbank und API. */
  description: string;
  /** Betriebsarten, für die die Vorlage gedacht ist. */
  businessTypes: string[];
  /** Kurze Merkmale — Demo-Dashboard und `preview.features` in der DB. */
  features: string[];
  /** Tailwind-Verlauf der Vorschaukachel im Demo-Dashboard. */
  vorschauKachel: string;
  /** Tailwind-Farbpunkt der Karte im Konfigurator-Picker. */
  punkt: string;
  /** Tailwind-Rahmen und -Fläche der gewählten Karte im Picker. */
  auswahl: string;
}

/**
 * Reihenfolge = Reihenfolge im Picker. Die Alt-Bestands-Vorlagen stehen
 * hinten; sie erscheinen nirgends, müssen aber vollständig beschrieben
 * sein, damit Seed und API sie weiter führen.
 */
export const TEMPLATE_KATALOG: TemplateKatalogEintrag[] = [
  {
    id: "minimalist",
    imPicker: true,
    name: "Minimalist",
    description:
      "Narrative, minimal design guiding users through full-screen sections.",
    businessTypes: ["cafe", "restaurant", "bar"],
    features: ["Ultra Clean", "Fast Loading", "Content Focus"],
    vorschauKachel: "bg-gradient-to-br from-white to-gray-100",
    punkt: "bg-emerald-500",
    auswahl: "border-emerald-400 bg-emerald-50/30",
  },
  {
    id: "modern",
    imPicker: true,
    name: "Modern",
    description: "Contemporary design with bold colors and sleek animations.",
    businessTypes: ["cafe", "restaurant", "bar"],
    features: ["Gradient Backgrounds", "Glass Effects", "Bold Typography"],
    vorschauKachel: "bg-gradient-to-br from-blue-500 to-purple-600",
    punkt: "bg-indigo-500",
    auswahl: "border-indigo-400 bg-indigo-50/30",
  },
  {
    id: "presse",
    imPicker: true,
    name: "Bistro card",
    description:
      "Paper white, serif headings, prices led by dotted rules — for bistros, wine bars and houses with a signature.",
    businessTypes: ["restaurant", "bar"],
    features: ["Dotted Price Rules", "Serif Headings", "No Dish Photos"],
    vorschauKachel: "bg-gradient-to-br from-amber-50 to-red-100",
    punkt: "bg-red-800",
    auswahl: "border-red-700 bg-amber-50/40",
  },
  {
    id: "kiosk",
    imPicker: true,
    name: "Notice board",
    description:
      "A strict grid, one image band, a numbered index — for shops with a short, changing menu.",
    businessTypes: ["cafe", "restaurant"],
    features: ["Strict Grid", "Numbered Index", "Monospace Prices"],
    vorschauKachel: "bg-gradient-to-br from-neutral-100 to-orange-200",
    punkt: "bg-orange-600",
    auswahl: "border-neutral-800 bg-neutral-100/60",
  },
  {
    id: "izakaya",
    imPicker: true,
    name: "Ticket",
    description:
      "Dishes in framed boxes like an order ticket — for izakayas, tapas bars and sharing kitchens.",
    businessTypes: ["restaurant", "bar"],
    features: ["Framed Boxes", "Two-Column Grid", "Numbered Dishes"],
    vorschauKachel: "bg-gradient-to-br from-stone-100 to-red-200",
    punkt: "bg-red-900",
    auswahl: "border-stone-800 bg-stone-100/60",
  },
  {
    id: "morgen",
    imPicker: true,
    name: "Breakfast card",
    description:
      "A quiet ruled card in cobalt and ivory, arranged by time of day — for cafés whose menu changes with the clock.",
    businessTypes: ["cafe", "restaurant"],
    features: ["Ruled Card", "By Time of Day", "Cobalt and Ivory"],
    vorschauKachel: "bg-gradient-to-br from-stone-50 to-blue-200",
    punkt: "bg-blue-900",
    auswahl: "border-blue-800 bg-stone-50",
  },

  // ---- Alt-Bestand: rendert weiter, wird aber nicht mehr angeboten. ----

  {
    id: "stylish",
    imPicker: false,
    name: "Stylish",
    description:
      "Visual-first design with overlays, mixed sections, and motion.",
    businessTypes: ["cafe", "restaurant", "bar"],
    features: ["Overlapping Visuals", "Mixed Sections", "Animated Hovers"],
    vorschauKachel: "bg-gradient-to-br from-amber-50 to-stone-800",
    punkt: "bg-amber-600",
    auswahl: "border-amber-500 bg-amber-50/30",
  },
  {
    id: "cozy",
    imPicker: false,
    name: "Cozy",
    description:
      "Warm, friendly aesthetic with rounded elements and authentic photography.",
    businessTypes: ["cafe", "restaurant", "bar"],
    features: ["Warm Colors", "Rounded Corners", "Community Feel"],
    vorschauKachel: "bg-gradient-to-br from-amber-100 via-orange-50 to-rose-50",
    punkt: "bg-orange-500",
    auswahl: "border-orange-400 bg-orange-50/30",
  },
  {
    id: "nocturne",
    imPicker: false,
    name: "Midnight",
    description: "Dark and refined — for bars, wine bars and evening dining.",
    businessTypes: ["bar", "restaurant"],
    features: ["Dark Palette", "Brass Accents", "Evening Dining"],
    vorschauKachel: "bg-gradient-to-br from-slate-900 to-amber-700",
    punkt: "bg-amber-500",
    auswahl: "border-amber-400 bg-slate-100/40",
  },
  {
    id: "riviera",
    imPicker: false,
    name: "Riviera",
    description:
      "Mediterranean and light — for coastal cuisine, seafood and summer terraces.",
    businessTypes: ["restaurant", "bar"],
    features: ["Adriatic Blue", "Light Sections", "Summer Terraces"],
    vorschauKachel: "bg-gradient-to-br from-sky-100 to-sky-700",
    punkt: "bg-sky-700",
    auswahl: "border-sky-600 bg-sky-50/40",
  },
  {
    id: "verde",
    imPicker: false,
    name: "Verde",
    description: "Fresh and botanical — for cafés, brunch and green cuisine.",
    businessTypes: ["cafe", "restaurant"],
    features: ["Botanical Palette", "Quiet Serif", "Brunch Friendly"],
    vorschauKachel: "bg-gradient-to-br from-lime-50 to-emerald-800",
    punkt: "bg-emerald-700",
    auswahl: "border-emerald-600 bg-lime-50/40",
  },
];

/** Alle bekannten Vorlagen-IDs — auch der Alt-Bestand. */
export const ALLE_TEMPLATE_IDS: string[] = TEMPLATE_KATALOG.map((e) => e.id);

/** Die Vorlagen, die der Konfigurator zur Wahl stellt, in Picker-Reihenfolge. */
export const PICKER_TEMPLATES: TemplateKatalogEintrag[] =
  TEMPLATE_KATALOG.filter((e) => e.imPicker);

/** Vorlage, die greift, wenn keine gewählt oder eine unbekannte gespeichert ist. */
export const STANDARD_TEMPLATE_ID = "modern";

export function katalogEintrag(
  id: string | null | undefined,
): TemplateKatalogEintrag | undefined {
  return TEMPLATE_KATALOG.find((e) => e.id === id);
}

export function istBekanntesTemplate(id: string | null | undefined): boolean {
  return !!katalogEintrag(id);
}

/** i18n-Schlüssel des Anzeigenamens (client/i18n/locales/*.json). */
export function templateNameKey(id: string): string {
  return `templates.${id}`;
}

/** i18n-Schlüssel der Beschreibung. */
export function templateBeschreibungsKey(id: string): string {
  return `templates.${id}Desc`;
}

// ============================================================
// Abgeleitete Formen — Registry, Datenbank, API
// ============================================================

/**
 * Die Form, die client/pages/Site.tsx und die Demo-Studios lesen.
 *
 * Bis hierher lag sie als handgepflegte Liste in
 * client/components/template/TemplateRegistry.tsx und hatte eigene, von
 * templateTokens.ts abweichende Farben — die Vorschau zeigte also andere
 * Rückfallfarben als der Konfigurator anwandte. Jetzt kommt die Palette
 * aus derselben Quelle wie überall.
 *
 * `accent` ist die Primärfarbe: Site.tsx benutzt das Feld als Rückfall für
 * `userPrimary`, nicht als Zierfarbe.
 */
export interface TemplateStyle {
  background: string;
  accent: string;
  text: string;
  secondary: string;
  /** Erzählform der Vorlage — "narrative" | "commercial" | "visual". */
  layout: string;
  /** Kopfzeilenform aus templateLayout.ts. */
  navigation: string;
  /** Auszeichnungsschrift aus templateLayout.ts. */
  typography: string;
}

export interface TemplateRegistryEintrag {
  id: string;
  name: string;
  description: string;
  /** Tailwind-Klasse der Vorschaukachel. */
  preview: string;
  businessTypes: string[];
  style: TemplateStyle;
  features: string[];
}

/** Erste benannte Familie eines Schriftstapels, ohne Anführungszeichen. */
function schriftName(stapel: string): string {
  const erste = stapel.split(",")[0]?.trim() ?? "";
  return erste.replace(/^["']|["']$/g, "").replace(/ Variable$/, "");
}

export function templateStyle(id: string): TemplateStyle {
  const tokens: TemplateTokens = getTemplateTokens(id);
  const layout = getTemplateLayout(id);
  return {
    background: tokens.colors.background,
    accent: tokens.colors.primary,
    text: tokens.colors.text,
    secondary: tokens.colors.secondary,
    layout: getTemplateIntent(id).toLowerCase(),
    navigation: layout.nav,
    typography: schriftName(layout.schrift.display),
  };
}

/** Ersetzt defaultTemplates aus der früheren TemplateRegistry. */
export const TEMPLATE_REGISTRY: TemplateRegistryEintrag[] =
  TEMPLATE_KATALOG.map((eintrag) => ({
    id: eintrag.id,
    name: eintrag.name,
    description: eintrag.description,
    preview: eintrag.vorschauKachel,
    businessTypes: eintrag.businessTypes,
    style: templateStyle(eintrag.id),
    features: eintrag.features,
  }));

/**
 * Eine Zeile der Tabelle `Template` (prisma/schema.prisma).
 *
 * `preview.thumbnail` trug früher Pfade wie "/templates/modern-thumb.png".
 * Diese Dateien hat es nie gegeben; die Verbraucher behandeln das Feld
 * ohnehin als CSS-Klasse. Deshalb steht hier der Tailwind-Verlauf.
 */
export interface TemplateDatenbankZeile {
  id: string;
  name: string;
  description: string;
  category: string;
  isPremium: boolean;
  creator: string;
  version: string;
  layout: {
    intent: string;
    navigation: string;
    businessTypes: string[];
    typography: { headingFont: string; bodyFont: string };
  };
  tokens: TemplateTokens;
  preview: { thumbnail: string; features: string[] };
}

export function templateDatenbankZeile(
  eintrag: TemplateKatalogEintrag,
): TemplateDatenbankZeile {
  const layout = getTemplateLayout(eintrag.id);
  return {
    id: eintrag.id,
    name: eintrag.name,
    description: eintrag.description,
    category: "GASTRONOMY",
    isPremium: false,
    creator: "maitr",
    version: "1.0.0",
    layout: {
      intent: getTemplateIntent(eintrag.id).toLowerCase(),
      navigation: layout.nav,
      businessTypes: eintrag.businessTypes,
      typography: {
        headingFont: schriftName(layout.schrift.display),
        bodyFont: schriftName(layout.schrift.sans),
      },
    },
    tokens: getTemplateTokens(eintrag.id),
    preview: {
      thumbnail: eintrag.vorschauKachel,
      features: eintrag.features,
    },
  };
}

/** Alle Zeilen für prisma/seed.ts. */
export const TEMPLATE_DATENBANK_ZEILEN: TemplateDatenbankZeile[] =
  TEMPLATE_KATALOG.map(templateDatenbankZeile);

export type { TemplateIntent, TemplateTokens };
