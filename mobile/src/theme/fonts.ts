/**
 * Schriftdateien der App.
 *
 * Markenschrift (aktuell in Erprobung): **Bricolage Grotesque** (SIL Open Font
 * License 1.1, kommerziell frei) - eine charaktervolle Grotesk mit echten optischen
 * Größen. Aus der Variable-Font-Quelle wurden zwei statische Schnitte instanziert:
 *   - „Text" (opsz 14) für Fließtext
 *   - „Display" (opsz 36) für Überschriften - engere, ausdrucksstärkere Formen
 * beide im Gewicht 400. Die OFL erlaubt das Mitliefern im (öffentlichen) Repo; die
 * Lizenz liegt daneben: `BricolageGrotesque-OFL.txt`.
 *
 * Kursiv (Hybrid): Bricolage Grotesque hat KEINE eigene Kursive (keine ital-Achse) und
 * iOS neigt Custom-Fonts nicht synthetisch. Damit die Signatur-Schrägstellung erhalten
 * bleibt („Café Goldstück", zitierte KI-Entwürfe), nutzen die kursiven Rollen weiterhin
 * **Familjen Grotesk Italic** (echte Kursive, SIL OFL). Aufrechte Rollen = Bricolage.
 *
 * Familjen-Regular bleibt zum kompletten Zurückwechseln im Repo (`FamiljenGrotesk-*.ttf`).
 * Davor PP Frama (nur „Free for Personal Use", NICHT ins öffentliche Repo).
 */
export const fontAssets = {
  "BricolageGrotesque-Display": require("../../assets/fonts/BricolageGrotesque-Display.ttf"),
  "BricolageGrotesque-Text": require("../../assets/fonts/BricolageGrotesque-Text.ttf"),
  "FamiljenGrotesk-Italic": require("../../assets/fonts/FamiljenGrotesk-Italic.ttf"),
} as const;

/**
 * Schalter für die Markenschrift. Steht `EXPO_PUBLIC_BRAND_FONT` auf `"off"`, lädt die
 * App die Markenschrift NICHT und nutzt die System-Grotesk (iOS: SF Pro, Android:
 * Roboto). Nützlich für Tests/Barrierefreiheit; ein Wort in `.env`, kein Code-Umbau.
 */
export const BRAND_FONT_ENABLED = process.env.EXPO_PUBLIC_BRAND_FONT !== "off";
