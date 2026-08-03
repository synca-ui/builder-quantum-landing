/**
 * Schriftdateien der App.
 *
 * WARUM HIER KEINE MARKENSCHRIFT STEHT
 * ------------------------------------
 * Die App war auf "PP Frama" / "PP Frama Text" (Pangram Pangram) gestaltet. Uns liegt
 * davon nur die Fassung "Free for Personal Use" vor. Dieses Repository ist OEFFENTLICH -
 * eingecheckte Schriftdateien waeren damit Weiterverteilung an Dritte, und genau das
 * deckt diese Lizenz nicht. Die vier OTF-Dateien wurden deshalb aus der Versionskontrolle
 * genommen und in der `.gitignore` im Repo-Wurzelverzeichnis gesperrt - dort steht ein
 * Muster ohne Pfadpraefix, damit es in jedem Verzeichnis greift: `expo prebuild` kopiert
 * Schriften zusaetzlich nach mobile/android und mobile/ios.
 *
 * Folge: `fontAssets` ist leer, `BRAND_FONT_ENABLED` ist dadurch false, und die App
 * rendert in der System-Grotesk (iOS: SF Pro, Android: Roboto). Sie startet und
 * funktioniert vollstaendig - nur die Anmutung fehlt. Bewusst kein `require()` auf die
 * OTF-Dateien mehr: ein `require()` auf eine fehlende Datei bricht den Metro-Bundler,
 * die App liesse sich dann gar nicht mehr starten.
 *
 * MARKENSCHRIFT ZURUECKHOLEN - zwei Wege, danach dieselben Schritte
 * -----------------------------------------------------------------
 * Weg A: kommerzielle Lizenz fuer PP Frama kaufen (Pangram Pangram, App-Embedding-
 *        Lizenz). Die Dateien bleiben trotzdem aus dem oeffentlichen Repo draussen -
 *        eine gekaufte Lizenz erlaubt das Einbetten in die App, nicht das oeffentliche
 *        Hosten der Schriftdatei. Also lokal ablegen bzw. ueber ein privates Artefakt
 *        in den Build reichen.
 * Weg B: eine offene Schrift waehlen (SIL Open Font License, z. B. Familjen Grotesk,
 *        Bricolage Grotesque, Inter, Manrope, Space Grotesk). Die OFL erlaubt
 *        ausdruecklich auch das Mitliefern im Repo - dann darf die Datei eingecheckt
 *        werden, und die `.gitignore` steht dem nicht im Weg: die Sperre dort ist eng auf
 *        die Dateinamen der Pangram-Pangram-Schrift zugeschnitten, nicht auf Schriften
 *        allgemein.
 *
 * Schritte in beiden Faellen:
 *   1. Dateien nach `mobile/assets/fonts/` legen.
 *   2. Hier in `fontAssets` eintragen (Schluessel = Name, unter dem `fontFamily` sie
 *      spaeter anspricht). Sobald der erste Eintrag steht, schaltet sich
 *      `BRAND_FONT_ENABLED` von selbst wieder ein.
 *   3. In `typography.ts` die vier Namen in `fontFamily` auf diese Schluessel setzen
 *      (sie sind aktuell absichtlich leer) - sonst bleibt es bei der Systemschrift.
 *   4. Optional fuer native Builds: in `mobile/app.json` den `expo-font`-Plugin-Eintrag
 *      wieder aufnehmen, damit die Dateien fest in die App gebacken werden:
 *        ["expo-font", { "fonts": ["./assets/fonts/<Datei>", ...] }]
 *      Er wurde entfernt, weil er ohne Dateien nichts tut (der Plugin-Code ueberspringt
 *      leere Listen) und nur vortaeuschen wuerde, es sei eine Schrift konfiguriert.
 *      Zur Laufzeit braucht `useFonts()` das Plugin nicht.
 */

/**
 * Schriften, die `useFonts()` in `app/_layout.tsx` zur Laufzeit laedt.
 * Leer = keine Markenschrift (siehe Dateikopf). Ein leeres Objekt ist fuer `useFonts()`
 * unbedenklich: es meldet sofort "geladen", der Splash haengt also nicht.
 */
export const fontAssets: Record<string, number> = {};

/**
 * Schalter fuer die Markenschrift.
 *
 * Zwei Bedingungen, beide muessen erfuellt sein:
 *  - `EXPO_PUBLIC_BRAND_FONT` steht nicht auf `"off"` - erlaubt es, die Markenschrift
 *    per `.env` abzuschalten, ohne Code anzufassen.
 *  - Es sind ueberhaupt Schriften registriert. Diese zweite Bedingung ist der Grund,
 *    warum ohne Dateien nichts kaputtgeht: `typography.ts` faellt automatisch auf die
 *    Systemschrift zurueck, statt auf einen Font-Namen zu zeigen, den es nicht gibt.
 */
export const BRAND_FONT_ENABLED =
  process.env.EXPO_PUBLIC_BRAND_FONT !== "off" && Object.keys(fontAssets).length > 0;
