/**
 * Schriften der Landingpage und des Konfigurators — selbst gehostet.
 *
 * Poppins (Tailwind `font-sans`) und Space Grotesk (`font-display`) kamen bis
 * hierher per <link> aus index.html von Google-Servern. Die
 * Datenschutzerklärung (client/pages/Datenschutz.tsx, „Google Fonts“)
 * verspricht aber seit jeher: „werden lokal eingebunden – es findet keine
 * Verbindung zu Google-Servern beim Seitenaufruf statt“. Jetzt stimmt das:
 * Die @font-face-Regeln kommen aus den fontsource-Paketen ins Bundle, die
 * woff2-Dateien liegen unter /fonts auf unserem Host. Dieselben Gewichte wie
 * vorher (400–700), dieselben Familiennamen — tailwind.config.ts bleibt.
 *
 * Die Papier-Templates bringen ihre Schriften getrennt mit
 * (client/lib/templateFonts.ts), damit die Landingpage sie nicht lädt.
 *
 * Importiert von client/App.tsx, gleich nach global.css.
 */
import "@fontsource/poppins/400.css";
import "@fontsource/poppins/500.css";
import "@fontsource/poppins/600.css";
import "@fontsource/poppins/700.css";
import "@fontsource/space-grotesk/400.css";
import "@fontsource/space-grotesk/500.css";
import "@fontsource/space-grotesk/600.css";
import "@fontsource/space-grotesk/700.css";
