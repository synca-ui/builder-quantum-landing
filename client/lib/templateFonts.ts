/**
 * Schriften der Templates mit eigenem Layout — selbst gehostet.
 *
 * Die @font-face-Regeln kommen aus den fontsource-Paketen und landen im
 * Bundle; die woff2-Dateien liegen unter /assets und werden vom Browser
 * erst geladen, wenn ein Template die Familie tatsächlich verwendet. Kein
 * Aufruf an fonts.googleapis.com — die Datenschutzerklärung der Kunden-
 * seiten verspricht genau das (siehe client/pages/Datenschutz.tsx), und
 * die Live-Seite eines Restaurants darf keine IP an Google übertragen.
 *
 * Familiennamen (aus den Paketen) enden auf „Variable“ — so stehen sie in
 * den Stapeln von templateLayout.ts (SELBST_GEHOSTETE_FAMILIEN). Der
 * Wächtertest templateFonts.test.ts prüft, dass jede dort genannte Familie
 * hier ein Paket hat und das Paket genau diesen Namen deklariert; ein
 * Tippfehler fiele sonst still auf den Systemstapel zurück. Space Grotesk
 * und Poppins kommen über client/lib/siteFonts.ts.
 *
 * Kursive nur dort, wo ein Template sie setzt: Newsreader (presse, morgen),
 * Cormorant (konditorei), Lora (hofladen).
 *
 * Importiert von styleInjector.ts, damit jeder Renderer, der Template-
 * Styles injiziert, die Schriften automatisch mitbringt.
 */
// Erste Runde: Bistrokarte, Aushang, Zettel, Frühstückskarte
import "@fontsource-variable/newsreader/wght.css";
import "@fontsource-variable/newsreader/wght-italic.css";
import "@fontsource-variable/manrope/index.css";
import "@fontsource-variable/bricolage-grotesque/index.css";
// Zweite Runde: vitrine … hofladen
import "@fontsource-variable/plus-jakarta-sans/index.css";
import "@fontsource-variable/fredoka/index.css";
import "@fontsource-variable/bitter/index.css";
import "@fontsource-variable/instrument-sans/index.css";
import "@fontsource-variable/unbounded/index.css";
import "@fontsource-variable/cormorant/index.css";
import "@fontsource-variable/cormorant/wght-italic.css";
import "@fontsource-variable/jetbrains-mono/index.css";
import "@fontsource-variable/figtree/index.css";
import "@fontsource-variable/syne/index.css";
import "@fontsource-variable/lora/index.css";
import "@fontsource-variable/lora/wght-italic.css";
