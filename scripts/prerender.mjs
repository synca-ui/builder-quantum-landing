/**
 * Prerender der Startseite.
 *
 * Läuft nach `vite build` und schreibt das statisch gerenderte Markup von
 * <Index /> in dist/spa/index.html.
 *
 * Warum:
 *  - Der Google-Abschnitt (#google-profil) muss ohne JavaScript im rohen HTML
 *    stehen (Google-OAuth-Prüfung, Scope "business.manage").
 *  - Behebt die Hauptursache des gemessenen CLS von 0,5: Vorher zeigte der
 *    erste Paint nur den Spinner (100vh), den React danach durch die 8232px
 *    hohe Seite ersetzte – ein einziger Layout-Shift des <body>.
 *
 * WICHTIG – Fallback-Route:
 * Netlify liefert dist/spa/index.html für JEDEN Pfad aus (catch-all rewrite in
 * netlify.toml). Das vorgerenderte Markup gilt aber nur für "/". Damit auf
 * z.B. /login nicht kurz die Startseite aufblitzt, entfernt ein inline-Script
 * den vorgerenderten Inhalt auf allen anderen Pfaden wieder und stellt den
 * bisherigen Spinner her. Das Script läuft synchron beim Parsen, also vor dem
 * ersten Paint – es ist dort kein Flackern sichtbar.
 *
 * Der Client mountet weiterhin mit createRoot (nicht hydrateRoot): App.tsx
 * rendert zusätzlich Toaster/Sonner/Router um <Index /> herum, das Markup wäre
 * also nicht deckungsgleich und Hydration würde fehlschlagen. createRoot
 * ersetzt den Inhalt in einem einzigen Commit; da das vorgerenderte Layout dem
 * ersten Client-Render entspricht, entsteht dabei kein sichtbarer Sprung.
 */
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { pathToFileURL } from "node:url";
import path from "node:path";

const ROOT = process.cwd();
const HTML_PATH = path.join(ROOT, "dist/spa/index.html");
const ENTRY_PATH = path.join(ROOT, "dist/prerender/entry.mjs");

// Bei fehlenden Artefakten bewusst hart abbrechen: ein stillschweigend
// nicht-vorgerendertes index.html würde die Google-Prüfung gefährden.
for (const [label, p] of [
  ["dist/spa/index.html (vite build)", HTML_PATH],
  ["dist/prerender/entry.mjs (vite build --config vite.config.prerender.ts)", ENTRY_PATH],
]) {
  if (!existsSync(p)) {
    console.error(`[prerender] FEHLT: ${label}`);
    process.exit(1);
  }
}

const { render } = await import(pathToFileURL(ENTRY_PATH).href);
const { html: appHtml } = render("/");

if (!appHtml || appHtml.length < 1000) {
  console.error(
    `[prerender] Ergebnis unplausibel kurz (${appHtml?.length ?? 0} Zeichen) – Abbruch.`,
  );
  process.exit(1);
}

let html = readFileSync(HTML_PATH, "utf8");

// Sichtbaren Text mit Markup-Rauschen entfernen, damit sich der gerenderte
// Abschnitt und der <noscript>-Block in index.html vergleichen lassen.
const plain = (s) =>
  s
    .replace(/<[^>]+>/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&nbsp;/g, " ")
    .replace(/\s+/g, " ")
    .trim();

const renderedText = plain(appHtml);

// Bewusst die QUELL-index.html lesen, nicht dist/spa/index.html: Letztere
// enthält nach der Injektion bereits das gerenderte Markup, der Vergleich fände
// dann seinen eigenen Text wieder und ginge immer gut aus. Zusätzlich nur den
// <noscript>-Block betrachten, nicht die ganze Datei.
const srcHtml = readFileSync(path.join(ROOT, "index.html"), "utf8");
const googleNoscript = [...srcHtml.matchAll(/<noscript>([\s\S]*?)<\/noscript>/g)]
  .map((m) => m[1])
  .find((b) => b.includes("google-profil"));

if (!googleNoscript) {
  console.error("[prerender] Kein <noscript>-Block mit google-profil in index.html gefunden.");
  process.exit(1);
}
const noscriptText = plain(googleNoscript);

// Pflichttexte für die Google-OAuth-Prüfung. Bricht der Build hier ab, ist der
// Abschnitt aus dem Markup verschwunden – das darf nicht unbemerkt passieren.
const REQUIRED = [
  'id="google-profil"',
  "Maitr – dein digitaler Gastgeber für Google",
  "Jede Aktion wird vor der Veröffentlichung vom Inhaber freigegeben.",
];
for (const needle of REQUIRED) {
  if (!appHtml.includes(needle)) {
    console.error(`[prerender] Pflichtinhalt fehlt im gerenderten HTML: ${needle}`);
    process.exit(1);
  }
}

// Der <noscript>-Block in index.html ist die Fassung, die ein Abruf OHNE
// JavaScript zu sehen bekommt – etwa bei der Google-OAuth-Prüfung. Läuft sie
// gegen den sichtbaren Abschnitt auseinander, steht in der HTML-Quelle etwas
// anderes als auf der gerenderten Seite. Das sieht nach Cloaking aus, auch wenn
// es nur Unachtsamkeit war. Deshalb hier hart absichern statt dokumentieren.
const bodyMatch = renderedText.match(
  /Maitr hilft Cafés und Restaurants.*?vom Inhaber freigegeben\./,
);
if (!bodyMatch) {
  console.error("[prerender] Fließtext des Google-Abschnitts im Markup nicht gefunden.");
  process.exit(1);
}
if (!noscriptText.includes(bodyMatch[0])) {
  console.error(
    "[prerender] <noscript> in index.html weicht vom sichtbaren Abschnitt ab.\n" +
      `  gerendert  : ${bodyMatch[0]}\n` +
      `  <noscript> : ${noscriptText}\n` +
      "  Bitte den <noscript>-Block in index.html wortgleich nachziehen.",
  );
  process.exit(1);
}

const GUARD = `<script>(function(){if(location.pathname!=="/"){var r=document.getElementById("root");if(r)r.innerHTML='<div class="loading-spinner"></div>';}})();</script>`;

const rootRe = /<div id="root">[\s\S]*?<\/div>\s*(?=<!--|<script)/;
if (!rootRe.test(html)) {
  console.error("[prerender] <div id=\"root\"> nicht wie erwartet in index.html gefunden.");
  process.exit(1);
}

html = html.replace(rootRe, `<div id="root">${appHtml}</div>\n  ${GUARD}\n  `);

writeFileSync(HTML_PATH, html, "utf8");

console.log(
  `[prerender] OK – ${appHtml.length} Zeichen Markup in dist/spa/index.html eingesetzt.`,
);
