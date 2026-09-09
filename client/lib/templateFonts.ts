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
 * Familiennamen (aus den Paketen): "Newsreader Variable", "Manrope
 * Variable", "Bricolage Grotesque Variable" — so stehen sie in den Stapeln
 * von templateLayout.ts. Space Grotesk und Poppins lädt index.html.
 *
 * Importiert von styleInjector.ts, damit jeder Renderer, der Template-
 * Styles injiziert, die Schriften automatisch mitbringt.
 */
import "@fontsource-variable/newsreader/wght.css";
import "@fontsource-variable/newsreader/wght-italic.css";
import "@fontsource-variable/manrope/index.css";
import "@fontsource-variable/bricolage-grotesque/index.css";
