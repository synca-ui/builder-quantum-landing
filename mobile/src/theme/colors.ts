/**
 * Farbtokens aus "Maitr App-Screens.dc.html" / "Maitr Design System.dc.html".
 *
 * Die Web-App arbeitet mit HSL-CSS-Variablen (`client/global.css`). React Native kennt
 * keine CSS-Variablen, deshalb liegen die Werte hier als flache Hex-Konstanten vor -
 * dieselben Werte, andere Transportform.
 */

/** Rohe Markenfarben. Nur über `lightPalette` / `darkPalette` verwenden. */
const brand = {
  /** Primärton, Buttons und aktive Zustände im Hellmodus. */
  teal: "#1F7A72",
  tealDeep: "#175E58",
  /** Akzent-/Spotfarbe, im Dunkelmodus der Primärton. */
  mint: "#6FBFAE",
  /** Tiefes Petrol, nur in Verläufen. */
  petrol: "#268494",
  /** Kühles Blau, nur in Verläufen. */
  slate: "#5480C4",
  ink: "#212B27",
} as const;

export const lightPalette = {
  /** Bildschirmhintergrund der meisten Screens. */
  canvas: "#EAF1EE",
  /** Ruhigere Variante für den Start-Screen. */
  canvasQuiet: "#F4F7F4",
  /** Screens mit Verlaufsstimmung (Login, Journey). */
  canvasDeep: "#DCE7E4",
  /** Karten und Blöcke. */
  surface: "#FBFDFC",
  /** Eingelassene Flächen in Karten, Chips. */
  surfaceSunken: "#ECF3F0",
  /** Leere Zeitschienen-Slots. */
  surfaceTrack: "#DCE7E1",

  textPrimary: brand.ink,
  textSecondary: "#5C6B65",
  /**
   * Eyebrows, Labels, Metadaten. Gegenüber dem Design (#83958D, ~2,8:1) abgedunkelt,
   * damit die vielen 10-11px-Labels besser lesbar sind - bleibt aber sichtbar heller
   * als `textSecondary`, um die Hierarchie zu wahren. Volles WCAG-AA liefert der
   * Barrierefrei-Modus (hebt diesen Ton auf `textSecondary`).
   */
  textMuted: "#6E7D74",
  /** Deaktivierte oder rein dekorative Schrift. */
  textFaint: "#8A9A92",
  /** Schrift auf `surfaceSunken`-Chips. */
  textOnSunken: "#3B4741",

  border: "#D8E2DD",
  borderStrong: "#C7D3CC",
  borderSoft: "#E1E9E5",

  primary: brand.teal,
  primaryPressed: brand.tealDeep,
  onPrimary: "#FFFFFF",
  accent: brand.mint,
  /** Sekundäre, dunkle Aktionsfläche ("Einplanen"). */
  inkAction: brand.ink,
  onInkAction: "#FFFFFF",

  success: "#4E9F5C",
  successSurface: "#E7F3E8",
  /** Gesperrte Tische, Warnhinweise. */
  destructive: "#B4443A",
  /** Google-Sterne in Bewertungslisten - wärmer als der Markenakzent. */
  ratingStar: "#E0A83E",
  /** Puffer-Schraffur zwischen Reservierungen. */
  hatch: "#C2D2CB",

  tabBarBackground: "rgba(251,253,252,0.72)",
  tabBarBorder: "rgba(255,255,255,0.7)",
  /** Inaktiver Fortschrittsbalken in der Journey. */
  trackInactive: "rgba(33,43,39,0.12)",
} as const;

export const darkPalette = {
  canvas: "#141518",
  canvasQuiet: "#141518",
  canvasDeep: "#141518",
  surface: "#202A26",
  surfaceSunken: "#28322D",
  surfaceTrack: "#28322D",

  textPrimary: "#ECF3F0",
  textSecondary: "#A9B7B0",
  textMuted: "#7D8E86",
  textFaint: "#7D8E86",
  textOnSunken: "#ECF3F0",

  border: "rgba(255,255,255,0.10)",
  borderStrong: "rgba(255,255,255,0.16)",
  borderSoft: "rgba(255,255,255,0.06)",

  /** Im Nachtbar-Modus trägt Mint die Primärrolle - Teal hat zu wenig Kontrast. */
  primary: brand.mint,
  primaryPressed: "#5AA898",
  onPrimary: "#10201B",
  accent: brand.mint,
  inkAction: "#ECF3F0",
  onInkAction: "#141518",

  success: "#6FBF83",
  successSurface: "#1D2B21",
  destructive: "#E0776B",
  ratingStar: "#E8BA5C",
  hatch: "#3A4741",

  tabBarBackground: "rgba(32,42,38,0.72)",
  tabBarBorder: "rgba(255,255,255,0.08)",
  trackInactive: "rgba(236,243,240,0.14)",
} as const;

/** Radiale Verlaufsstimmungen der Screens, als lineare Näherung für RN. */
export const glow = {
  petrol: "rgba(38,132,148,0.20)",
  slate: "rgba(84,128,196,0.16)",
  mint: "rgba(74,186,158,0.24)",
} as const;

/**
 * Farbrollen mit `string`-Werten (nicht den Hex-Literalen). Sonst ließen sich
 * einzelne Töne nicht überschreiben - z. B. die Kontrast-Anhebung im Barrierefrei-Modus.
 */
export type Palette = Record<keyof typeof lightPalette, string>;
export type ColorScheme = "light" | "dark";

export const palettes: Record<ColorScheme, Palette> = {
  light: lightPalette,
  dark: darkPalette as unknown as Palette,
};
