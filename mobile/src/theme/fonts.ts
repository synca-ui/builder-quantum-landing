/**
 * Schriftdateien der App.
 *
 * Lizenzhinweis: PP Frama liegt hier in der Version "Free for Personal Use" vor
 * (Pangram Pangram). Für den kommerziellen Release muss eine Lizenz erworben und
 * die Dateien ersetzt werden - die Dateinamen können dabei gleich bleiben.
 */
export const fontAssets = {
  "PPFrama-Regular": require("../../assets/fonts/PPFrama-Regular.otf"),
  "PPFrama-RegularItalic": require("../../assets/fonts/PPFrama-RegularItalic.otf"),
  "PPFramaText-Regular": require("../../assets/fonts/PPFramaText-Regular.otf"),
  "PPFramaText-RegularItalic": require("../../assets/fonts/PPFramaText-RegularItalic.otf"),
} as const;

/**
 * Schalter für die Markenschrift. Steht `EXPO_PUBLIC_BRAND_FONT` auf `"off"`, lädt die
 * App die (lizenzpflichtige) PP Frama NICHT und nutzt die lizenzfreie System-Grotesk
 * (iOS: SF Pro, Android: Roboto) - so lässt sich ohne PPFrama-Lizenz ausliefern, ein
 * Wort in `.env` genügt, kein Code-Umbau.
 *
 * Für eine SPEZIFISCHE offene Grotesk (z. B. Inter, Manrope oder Space Grotesk - alle
 * unter SIL Open Font License, kommerziell frei): die `.ttf` in `assets/fonts/` legen,
 * hier in `fontAssets` aufnehmen und in `typography.ts` `fontFamily` darauf zeigen lassen.
 * Die Fallback-Kette in `resolveFont` bleibt unverändert.
 */
export const BRAND_FONT_ENABLED = process.env.EXPO_PUBLIC_BRAND_FONT !== "off";
