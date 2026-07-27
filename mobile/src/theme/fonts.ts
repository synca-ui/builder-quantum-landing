/**
 * Schriftdateien der App.
 *
 * Markenschrift: **Familjen Grotesk** (SIL Open Font License 1.1, kommerziell frei) -
 * eine charaktervolle Grotesk mit echtem Kursiv. Die OFL erlaubt das Mitliefern im
 * (öffentlichen) Repo; die Lizenz liegt neben den Dateien: `FamiljenGrotesk-OFL.txt`.
 *
 * Zuvor: PP Frama (Pangram Pangram, „Free for Personal Use") - durfte NICHT ins
 * öffentliche Repo und hatte kein frei nutzbares Embedding. Ersetzt am 27.07.2026.
 *
 * Familjen Grotesk hat keine separaten optischen Größen (Display/Text), daher zeigen
 * in `typography.ts` sowohl `display` als auch `text` auf denselben Regular-Schnitt,
 * `displayItalic`/`textItalic` auf denselben Italic-Schnitt.
 */
export const fontAssets = {
  "FamiljenGrotesk-Regular": require("../../assets/fonts/FamiljenGrotesk-Regular.ttf"),
  "FamiljenGrotesk-Italic": require("../../assets/fonts/FamiljenGrotesk-Italic.ttf"),
} as const;

/**
 * Schalter für die Markenschrift. Steht `EXPO_PUBLIC_BRAND_FONT` auf `"off"`, lädt die
 * App Familjen Grotesk NICHT und nutzt die System-Grotesk (iOS: SF Pro, Android:
 * Roboto). Nützlich für Tests/Barrierefreiheit; ein Wort in `.env`, kein Code-Umbau.
 */
export const BRAND_FONT_ENABLED = process.env.EXPO_PUBLIC_BRAND_FONT !== "off";
