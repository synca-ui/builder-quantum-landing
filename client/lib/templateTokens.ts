/**
 * Template Tokens Extractor
 * 
 * Diese Datei extrahiert die Design-Tokens aus der Template.csv
 * und macht sie für den Renderer verfügbar.
 * 
 * WICHTIG: Diese Daten stammen aus der Template.csv (tokens-Feld)
 */

export type TemplateIntent = 'VISUAL' | 'NARRATIVE' | 'COMMERCIAL';

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
      primary: "#d4a574",
      secondary: "#2c2c2c",
      background: "#fefdfb",
      text: "#2c2c2c",
      accent: "#f4e4d7",
      border: "#e8dcc8",
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
      primary: "#000000",
      secondary: "#ffffff",
      background: "#fafafa",
      text: "#1a1a1a",
      accent: "#e8e8e8",
      border: "#d4d4d4",
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
      primary: "#0066ff",
      secondary: "#000000",
      background: "#ffffff",
      text: "#1a1a1a",
      accent: "#ff0066",
      border: "#e0e0e0",
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
  
  cozy: {
    colors: {
      primary: "#8b6f47",
      secondary: "#ffffff",
      background: "#fdf9f3",
      text: "#3d3d3d",
      accent: "#d9c89e",
      border: "#e2d5c3",
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
  stylish: 'VISUAL',     // intent: "VISUAL" in CSV
  minimalist: 'NARRATIVE', // intent: "NARRATIVE" in CSV
  cozy: 'NARRATIVE',      // intent: "NARRATIVE" in CSV
  modern: 'COMMERCIAL',   // intent: "COMMERCIAL" in CSV
};

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
  return TEMPLATE_INTENT_MAP[templateId] || 'NARRATIVE';
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
  borderRadius: 'sm' | 'md' | 'lg' | 'xl' | '2xl';
  overlays: boolean;
  hoverEffects: boolean;
}

/**
 * Generiert Visual Config basierend auf Template Intent
 */
export function getVisualConfig(templateId: string): VisualConfig {
  const intent = getTemplateIntent(templateId);
  
  if (intent === 'VISUAL') {
    return {
      glassmorphism: true,
      animations: true,
      shadows: true,
      borderRadius: '2xl',
      overlays: true,
      hoverEffects: true,
    };
  }
  
  if (intent === 'COMMERCIAL') {
    return {
      glassmorphism: false,
      animations: true,
      shadows: true,
      borderRadius: 'xl',
      overlays: false,
      hoverEffects: true,
    };
  }
  
  // NARRATIVE
  return {
    glassmorphism: false,
    animations: false,
    shadows: false,
    borderRadius: 'md',
    overlays: false,
    hoverEffects: false,
  };
}
