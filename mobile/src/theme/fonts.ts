/**
 * Schriftdateien der App.
 *
 * MARKENSCHRIFT: Bricolage Grotesque + Familjen Grotesk Italic (beide SIL OFL 1.1)
 * ---------------------------------------------------------------------------------
 * Aufrechte Schnitte: **Bricolage Grotesque**, eine Grotesk mit echten optischen Groessen.
 * Aus der Variable-Font-Quelle sind zwei statische Schnitte instanziert:
 *   - "Text" (opsz 14) fuer Fliesstext
 *   - "Display" (opsz 36) fuer Ueberschriften - engere, ausdrucksstaerkere Formen
 * beide im Gewicht 400.
 *
 * Kursive: Bricolage Grotesque hat KEINE eigene Kursive (keine ital-Achse), und iOS neigt
 * Custom-Fonts nicht synthetisch - ein blosses `fontStyle: "italic"` bliebe dort also ohne
 * Wirkung. Damit die Signatur-Schraegstellung erhalten bleibt ("Cafe Goldstueck", zitierte
 * KI-Entwuerfe), nutzen die kursiven Rollen **Familjen Grotesk Italic** (echte Kursive).
 *
 * WARUM DAS LIZENZRECHTLICH TRAEGT
 * --------------------------------
 * Dieses Repo ist OEFFENTLICH. Beide Schriften stehen unter der SIL Open Font License 1.1,
 * die das Weiterverteilen - auch das Mitliefern im Repo - ausdruecklich erlaubt. Die OFL
 * verlangt dafuer, dass der Lizenztext mitgeliefert wird; er liegt daneben als
 * `BricolageGrotesque-OFL.txt` und `FamiljenGrotesk-OFL.txt`. Diese beiden Dateien duerfen
 * NICHT geloescht werden, sonst waere die Weitergabe nicht mehr lizenzkonform.
 *
 * Die Vorgaengerschrift PP Frama (Pangram Pangram) lag uns nur als "Free for Personal Use"
 * vor - das deckt Weiterverteilung an Dritte nicht. Ihre Dateien wurden deshalb aus der
 * Versionskontrolle genommen und sind in der `.gitignore` im Wurzelverzeichnis gesperrt
 * (`PPFrama*.otf` u. a., bewusst ohne Pfadpraefix, weil `expo prebuild` Schriften zusaetzlich
 * nach mobile/android und mobile/ios kopiert). Diese Sperre bleibt bestehen; sie ist eng auf
 * die Pangram-Pangram-Dateinamen zugeschnitten und steht OFL-Schriften nicht im Weg.
 *
 * `FamiljenGrotesk-Regular.ttf` liegt weiterhin im Ordner, damit man komplett auf Familjen
 * zurueckwechseln kann (dann hier registrieren und in `typography.ts` alle vier Namen
 * umstellen). Geladen wird er derzeit bewusst NICHT - was nicht in `fontAssets` steht,
 * landet auch nicht im Speicher.
 */

/**
 * Schriften, die `useFonts()` in `app/_layout.tsx` zur Laufzeit laedt.
 *
 * Der Schluessel ist der Name, unter dem `fontFamily` in `typography.ts` den Schnitt
 * anspricht - beide Seiten muessen zeichengleich sein, sonst ignoriert React Native den
 * Schnitt stillschweigend und rendert in der Systemschrift weiter.
 *
 * Beim Aendern zu beachten: `require()` auf eine fehlende Datei bricht den Metro-Bundler,
 * die App liesse sich dann gar nicht mehr starten. Jeder Eintrag hier braucht also eine
 * Datei, die wirklich existiert - und umgekehrt gehoert jede Datei, die hier steht, auch in
 * den `expo-font`-Plugin-Eintrag in `mobile/app.json`, damit sie in native Builds fest
 * eingebacken wird.
 *
 * Der Typ ist absichtlich `Record<string, number>` und nicht `as const`: `require()` liefert
 * in React Native eine numerische Asset-ID, und der breite Typ haelt die Uebergabe an
 * `useFonts()` in `app/_layout.tsx` gueltig, wo je nach Schalter auch ein leeres Objekt
 * uebergeben wird.
 */
export const fontAssets: Record<string, number> = {
  "BricolageGrotesque-Display": require("../../assets/fonts/BricolageGrotesque-Display.ttf"),
  "BricolageGrotesque-Text": require("../../assets/fonts/BricolageGrotesque-Text.ttf"),
  "FamiljenGrotesk-Italic": require("../../assets/fonts/FamiljenGrotesk-Italic.ttf"),
};

/**
 * Schalter fuer die Markenschrift.
 *
 * Zwei Bedingungen, beide muessen erfuellt sein:
 *  - `EXPO_PUBLIC_BRAND_FONT` steht nicht auf `"off"` - erlaubt es, die Markenschrift per
 *    `.env` abzuschalten (Tests, Barrierefreiheit), ohne Code anzufassen.
 *  - Es sind ueberhaupt Schriften registriert. Diese zweite Bedingung ist der Sicherheitsgurt
 *    und bleibt erhalten, obwohl jetzt wieder Schriften eingetragen sind: wird `fontAssets`
 *    je erneut geleert (etwa weil eine Schrift lizenzrechtlich raus muss), faellt die App von
 *    selbst auf die System-Grotesk zurueck - iOS: SF Pro, Android: Roboto - statt auf einen
 *    Font-Namen zu zeigen, zu dem es keine geladene Datei gibt.
 */
export const BRAND_FONT_ENABLED =
  process.env.EXPO_PUBLIC_BRAND_FONT !== "off" && Object.keys(fontAssets).length > 0;
