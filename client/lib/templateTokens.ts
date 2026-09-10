/**
 * Template Tokens Extractor
 *
 * Diese Datei extrahiert die Design-Tokens aus der Template.csv
 * und macht sie für den Renderer verfügbar.
 *
 * WICHTIG: Diese Daten stammen aus der Template.csv (tokens-Feld)
 */

export type TemplateIntent = "VISUAL" | "NARRATIVE" | "COMMERCIAL";

export interface TemplateTokens {
  colors: {
    primary: string;
    secondary: string;
    background: string;
    text: string;
    accent: string;
    border: string;
  };
  spacing: {
    xs: string;
    sm: string;
    md: string;
    lg: string;
    xl: string;
  };
  typography: {
    h1: { size: string; weight: number; lineHeight: string };
    h2: { size: string; weight: number; lineHeight: string };
    body: { size: string; weight: number; lineHeight: string };
  };
}

/**
 * Template Tokens aus CSV
 * Diese Daten entsprechen dem "tokens"-Feld in Template.csv
 */
const TEMPLATE_TOKENS: Record<string, TemplateTokens> = {
  stylish: {
    colors: {
      // Boutique-Look: elegantes Gold auf warmem Creme, Charcoal als Kontrast.
      primary: "#B08D57",
      secondary: "#2C2620",
      background: "#FBF7F0",
      text: "#262019",
      accent: "#F4E4D7",
      border: "#E8DCC8",
    },
    spacing: {
      xs: "5px",
      sm: "10px",
      md: "18px",
      lg: "36px",
      xl: "72px",
    },
    typography: {
      h1: { size: "52px", weight: 700, lineHeight: "1.15" },
      h2: { size: "38px", weight: 600, lineHeight: "1.25" },
      body: { size: "15px", weight: 400, lineHeight: "1.7" },
    },
  },

  minimalist: {
    colors: {
      // Editorial-Look: monochrom, viel Weißraum, keine Buntfarbe.
      primary: "#171717",
      secondary: "#525252",
      background: "#FAFAFA",
      text: "#171717",
      accent: "#E8E8E8",
      border: "#D4D4D4",
    },
    spacing: {
      xs: "4px",
      sm: "8px",
      md: "16px",
      lg: "32px",
      xl: "64px",
    },
    typography: {
      h1: { size: "48px", weight: 400, lineHeight: "1.2" },
      h2: { size: "36px", weight: 400, lineHeight: "1.3" },
      body: { size: "16px", weight: 400, lineHeight: "1.6" },
    },
  },

  modern: {
    colors: {
      // Entspricht bewusst den globalen Design-Defaults (Indigo/Violett):
      // "modern" ist das Start-Template — wer es wählt, sieht exakt das,
      // was der Konfigurator ohnehin als Ausgangszustand zeigt.
      primary: "#4F46E5",
      secondary: "#7C3AED",
      background: "#FFFFFF",
      text: "#000000",
      accent: "#EEF2FF",
      border: "#E0E0E0",
    },
    spacing: {
      xs: "6px",
      sm: "12px",
      md: "20px",
      lg: "40px",
      xl: "80px",
    },
    typography: {
      h1: { size: "56px", weight: 700, lineHeight: "1.1" },
      h2: { size: "40px", weight: 600, lineHeight: "1.2" },
      body: { size: "16px", weight: 400, lineHeight: "1.5" },
    },
  },

  /**
   * "Mitternacht": dunkel und edel — Bars, Weinbars, Abendküche.
   * Tiefes Nachtblau mit Messing-Akzent; hoher Kontrast, ruhige Flächen.
   */
  nocturne: {
    colors: {
      primary: "#C89B3C",
      secondary: "#1B2733",
      background: "#10151B",
      text: "#F2EDE3",
      accent: "#2A3644",
      border: "#2E3947",
    },
    spacing: {
      xs: "4px",
      sm: "8px",
      md: "16px",
      lg: "32px",
      xl: "64px",
    },
    typography: {
      h1: { size: "46px", weight: 700, lineHeight: "1.15" },
      h2: { size: "34px", weight: 600, lineHeight: "1.25" },
      body: { size: "16px", weight: 400, lineHeight: "1.6" },
    },
  },

  /**
   * "Verde": frisch und botanisch — Cafés, Brunch, grüne Küche.
   * Tiefes Blattgrün auf warmem Papierton, Serifen für den ruhigen Auftritt.
   */
  verde: {
    colors: {
      primary: "#2F5E43",
      secondary: "#9DBD9C",
      background: "#F7F5EC",
      text: "#22301F",
      accent: "#E4EAD9",
      border: "#D9E0CD",
    },
    spacing: {
      xs: "4px",
      sm: "8px",
      md: "16px",
      lg: "32px",
      xl: "64px",
    },
    typography: {
      h1: { size: "46px", weight: 600, lineHeight: "1.2" },
      h2: { size: "34px", weight: 500, lineHeight: "1.3" },
      body: { size: "16px", weight: 400, lineHeight: "1.65" },
    },
  },

  /**
   * "Riviera": mediterran und leicht — Küstenküche, Fisch, Sommerterrassen.
   * Tiefes Adriablau auf sandigem Papierton, Azur als Lichtakzent.
   */
  riviera: {
    colors: {
      primary: "#1E5A7E",
      secondary: "#7FB6D9",
      background: "#F9F6EF",
      text: "#1F2E3D",
      accent: "#E7F0F6",
      border: "#D8E3EA",
    },
    spacing: {
      xs: "4px",
      sm: "8px",
      md: "16px",
      lg: "32px",
      xl: "64px",
    },
    typography: {
      h1: { size: "46px", weight: 600, lineHeight: "1.2" },
      h2: { size: "34px", weight: 500, lineHeight: "1.3" },
      body: { size: "16px", weight: 400, lineHeight: "1.6" },
    },
  },

  /**
   * "Bistrokarte" (presse): gesetzte Karte auf Papier — Bistros, Weinlokale,
   * Häuser mit Handschrift. Keine Kacheln, keine Bilder: Gerichte führen
   * über eine Punktlinie zu ihrem Preis. Rot trägt nur Auszeichnungen.
   */
  presse: {
    colors: {
      primary: "#A81E14",
      secondary: "#A79A85",
      background: "#FBF7F0",
      text: "#14110D",
      accent: "#1F5130",
      border: "#DED5C6",
    },
    spacing: {
      xs: "4px",
      sm: "8px",
      md: "18px",
      lg: "36px",
      xl: "72px",
    },
    typography: {
      h1: { size: "44px", weight: 400, lineHeight: "1.02" },
      h2: { size: "30px", weight: 400, lineHeight: "1.15" },
      body: { size: "16px", weight: 400, lineHeight: "1.6" },
    },
  },

  /**
   * "Aushang" (kiosk): strenges Raster auf Graupapier — kleine, wechselnde
   * Karten. Ein Bildband oben, danach ein numeriertes Register auf
   * Haarlinien. Orange erreicht nur 3,2:1 auf dem Grund und trägt deshalb
   * ausschließlich Ziffern, Marker und Versalien — nie Fließtext.
   */
  kiosk: {
    colors: {
      primary: "#E8541F",
      secondary: "#D9D8D3",
      background: "#F1F0EC",
      text: "#17181A",
      accent: "#2F5DBE",
      border: "#D9D8D3",
    },
    spacing: {
      xs: "4px",
      sm: "8px",
      md: "14px",
      lg: "28px",
      xl: "56px",
    },
    typography: {
      h1: { size: "34px", weight: 700, lineHeight: "1.0" },
      h2: { size: "26px", weight: 700, lineHeight: "1.1" },
      body: { size: "15px", weight: 400, lineHeight: "1.55" },
    },
  },

  /**
   * "Zettel" (izakaya): Bestellzettel — Izakayas, Tapas-Bars, Sharing-Küchen.
   * Gerichte stehen in eckigen Rahmenkästen 2×2, jeder mit Nummer, Bild und
   * Preis. Tomatenrot nur für Nummern, Stempel und die Reservierung.
   */
  izakaya: {
    colors: {
      primary: "#9C2B22",
      secondary: "#D8CFBE",
      background: "#F5F0E6",
      text: "#1E1B16",
      accent: "#2C4A52",
      border: "#1E1B16",
    },
    spacing: {
      xs: "4px",
      sm: "8px",
      md: "14px",
      lg: "28px",
      xl: "56px",
    },
    typography: {
      h1: { size: "40px", weight: 800, lineHeight: "0.98" },
      h2: { size: "28px", weight: 700, lineHeight: "1.05" },
      body: { size: "15px", weight: 400, lineHeight: "1.55" },
    },
  },

  /**
   * "Frühstückskarte" (morgen): Tagescafés, deren Karte sich mit der Uhrzeit
   * ändert. Ruhige Grotesk auf Elfenbein, Kobalt-Serife kursiv für
   * Zeitfenster und Preise. Keine Flächen, nur Linien.
   */
  morgen: {
    colors: {
      primary: "#0F4C81",
      secondary: "#DAD6CC",
      background: "#F7F5EF",
      text: "#1A1F26",
      accent: "#D9A21B",
      border: "#DAD6CC",
    },
    spacing: {
      xs: "4px",
      sm: "8px",
      md: "16px",
      lg: "32px",
      xl: "64px",
    },
    typography: {
      h1: { size: "44px", weight: 400, lineHeight: "1.0" },
      h2: { size: "30px", weight: 400, lineHeight: "1.15" },
      body: { size: "16px", weight: 400, lineHeight: "1.6" },
    },
  },

  cozy: {
    colors: {
      // Warm & freundlich: Terrakotta mit Aprikose auf cremigem Grund.
      primary: "#B4633A",
      secondary: "#E8A66B",
      background: "#FDF4E7",
      text: "#4A3628",
      accent: "#D9C89E",
      border: "#E2D5C3",
    },
    spacing: {
      xs: "4px",
      sm: "8px",
      md: "16px",
      lg: "32px",
      xl: "64px",
    },
    typography: {
      h1: { size: "44px", weight: 400, lineHeight: "1.25" },
      h2: { size: "32px", weight: 400, lineHeight: "1.35" },
      body: { size: "16px", weight: 400, lineHeight: "1.65" },
    },
  },
};

/**
 * Template Intent Mapping aus CSV (layout.intent-Feld)
 */
const TEMPLATE_INTENT_MAP: Record<string, TemplateIntent> = {
  stylish: "VISUAL", // intent: "VISUAL" in CSV
  minimalist: "NARRATIVE", // intent: "NARRATIVE" in CSV
  cozy: "NARRATIVE", // intent: "NARRATIVE" in CSV
  modern: "COMMERCIAL", // intent: "COMMERCIAL" in CSV
  nocturne: "VISUAL",
  riviera: "VISUAL",
  verde: "NARRATIVE",
  // Die vier Papier-Templates: keine Schatten, kein Glas, keine Animationen.
  presse: "NARRATIVE",
  kiosk: "NARRATIVE",
  izakaya: "NARRATIVE",
  morgen: "NARRATIVE",
};

/**
 * Alle Template-IDs, die es gibt: die im Picker angebotenen und der
 * Alt-Bestand, dessen veröffentlichte Seiten weiterlaufen. Diese Registry ist
 * die Liste, gegen die der Paritätstest jedes Template prüft — ein neues
 * Template ist damit automatisch dabei, statt in einem zweiten Array zu
 * fehlen und ungeprüft zu bleiben.
 */
export const TEMPLATE_IDS = Object.keys(TEMPLATE_TOKENS);

/**
 * Gibt die Design-Tokens für ein Template zurück
 */
export function getTemplateTokens(templateId: string): TemplateTokens {
  return TEMPLATE_TOKENS[templateId] || TEMPLATE_TOKENS.minimalist;
}

/**
 * Gibt den Intent eines Templates zurück (VISUAL, NARRATIVE, COMMERCIAL)
 */
export function getTemplateIntent(templateId: string): TemplateIntent {
  return TEMPLATE_INTENT_MAP[templateId] || "NARRATIVE";
}

/**
 * Design-Defaults, die ein Template beim Auswählen in den Design-Store
 * schreibt. Vorher setzte updateTemplate nur design.template — die hier
 * hinterlegten Paletten wurden nie angewandt, und alle vier Templates
 * starteten mit denselben Standardfarben (in der Vorschau wie auf der
 * veröffentlichten Seite, beide lesen den Design-Store).
 *
 * priceColor folgt der Primärfarbe — außer bei "modern", das bewusst dem
 * bekannten Ausgangszustand des Konfigurators entspricht (grüne Preise).
 */
const TEMPLATE_FONT_FAMILY: Record<string, string> = {
  minimalist: "sans-serif",
  modern: "sans-serif",
  stylish: "serif",
  cozy: "serif",
  nocturne: "sans-serif",
  riviera: "serif",
  verde: "serif",
  presse: "serif",
  kiosk: "sans-serif",
  izakaya: "sans-serif",
  // morgen: Fließtext ist Grotesk (Manrope), die Serife trägt nur
  // Überschriften, Zeitfenster und Preise — das regelt templateLayout.ts.
  morgen: "sans-serif",
};

/**
 * Preise in der Textfarbe statt der Primärfarbe: Auf der gesetzten Karte
 * (presse), dem Aushang (kiosk) und dem Zettel (izakaya) ist die Buntfarbe
 * für Nummern, Marker und Auszeichnung reserviert — Preise sind Text.
 * Kiosk-Orange erreicht ohnehin nur 3,2:1 und dürfte keinen Preis tragen.
 */
const PREIS_IN_TEXTFARBE = new Set(["presse", "kiosk", "izakaya"]);

/**
 * Feature-Vorgaben eines Templates — heute nur die Form des Reservieren-
 * Knopfs. Die Papier-Templates sind eckig; ein abgerundeter Knopf darunter
 * sähe aus wie ein Fremdkörper. Der Store übernimmt den Wert nur, wenn der
 * Nutzer die Form nicht selbst verstellt hat (gleiche Regel wie bei den
 * Farben, siehe configuratorStore.updateTemplate).
 */
export type ReservationButtonShape = "rounded" | "pill" | "square";

const TEMPLATE_BUTTON_SHAPE: Record<string, ReservationButtonShape> = {
  presse: "square",
  kiosk: "square",
  izakaya: "square",
  morgen: "square",
};

export function getTemplateButtonShape(
  templateId: string,
): ReservationButtonShape {
  return TEMPLATE_BUTTON_SHAPE[templateId] || "rounded";
}

export interface TemplateDesignDefaults {
  primaryColor: string;
  secondaryColor: string;
  backgroundColor: string;
  fontColor: string;
  priceColor: string;
  headerFontColor: string;
  headerBackgroundColor: string;
  fontFamily: string;
}

export function getTemplateDesignDefaults(
  templateId: string,
): TemplateDesignDefaults {
  const { colors } = getTemplateTokens(templateId);
  return {
    primaryColor: colors.primary,
    secondaryColor: colors.secondary,
    backgroundColor: colors.background,
    fontColor: colors.text,
    priceColor:
      templateId === "modern"
        ? "#059669"
        : PREIS_IN_TEXTFARBE.has(templateId)
          ? colors.text
          : colors.primary,
    headerFontColor: colors.text,
    headerBackgroundColor: colors.background,
    fontFamily: TEMPLATE_FONT_FAMILY[templateId] || "sans-serif",
  };
}

/**
 * Hilfsfunktion: Hex zu RGB konvertieren (für Transparenz-Varianten)
 */
export function hexToRgb(hex: string): string {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result
    ? `${parseInt(result[1], 16)}, ${parseInt(result[2], 16)}, ${parseInt(result[3], 16)}`
    : "0, 0, 0";
}

/**
 * Visual Configuration basierend auf Template Intent
 */
export interface VisualConfig {
  glassmorphism: boolean;
  animations: boolean;
  shadows: boolean;
  borderRadius: "sm" | "md" | "lg" | "xl" | "2xl";
  overlays: boolean;
  hoverEffects: boolean;
}

/**
 * Generiert Visual Config basierend auf Template Intent
 */
export function getVisualConfig(templateId: string): VisualConfig {
  const intent = getTemplateIntent(templateId);

  if (intent === "VISUAL") {
    return {
      glassmorphism: true,
      animations: true,
      shadows: true,
      borderRadius: "2xl",
      overlays: true,
      hoverEffects: true,
    };
  }

  if (intent === "COMMERCIAL") {
    return {
      glassmorphism: false,
      animations: true,
      shadows: true,
      borderRadius: "xl",
      overlays: false,
      hoverEffects: true,
    };
  }

  // NARRATIVE
  return {
    glassmorphism: false,
    animations: false,
    shadows: false,
    borderRadius: "md",
    overlays: false,
    hoverEffects: false,
  };
}
