/**
 * Prerender der öffentlichen Seiten.
 *
 * Läuft nach `vite build` und schreibt je Route eine statische Datei:
 *   /              -> dist/spa/index.html
 *   /impressum     -> dist/spa/impressum/index.html
 *   ...
 * Netlify liefert vorhandene Dateien aus, bevor die catch-all-Weiterleitung aus
 * netlify.toml greift. Dadurch bekommt jede Seite ihren eigenen <title>,
 * <meta description> und <link rel="canonical"> schon im rohen HTML.
 *
 * Warum das nötig ist: Ohne eigene Datei je Route sieht Googlebot im ersten,
 * JavaScript-losen Durchgang für JEDE Unterseite den Canonical der Startseite –
 * jede Seite meldet sich damit selbst als deren Dublette.
 *
 * Für "/" gilt zusätzlich: Der Google-Abschnitt (#google-profil) muss ohne
 * JavaScript im rohen HTML stehen (OAuth-Prüfung, Scope business.manage). Diese
 * Route ist deshalb PFLICHT – schlägt sie fehl, bricht der Build ab. Die übrigen
 * Routen sind best effort: Scheitert eine, wird sie übersprungen und deutlich
 * gemeldet, statt den ganzen Build zu blockieren. Netlify liefert dann für sie
 * wie bisher die SPA-Hülle aus.
 *
 * Der Client mountet weiterhin mit createRoot (nicht hydrateRoot): App.tsx
 * rendert Toaster/Sonner/Router um die Seite herum, das Markup wäre also nicht
 * deckungsgleich und Hydration würde fehlschlagen.
 */
import { readFileSync, writeFileSync, existsSync, mkdirSync } from "node:fs";
import { pathToFileURL } from "node:url";
import path from "node:path";

const ROOT = process.cwd();
const SPA_DIR = path.join(ROOT, "dist/spa");
const HTML_PATH = path.join(SPA_DIR, "index.html");
const ENTRY_PATH = path.join(ROOT, "dist/prerender/entry.mjs");

for (const [label, p] of [
  ["dist/spa/index.html (vite build)", HTML_PATH],
  ["dist/prerender/entry.mjs (vite build --config vite.config.prerender.ts)", ENTRY_PATH],
]) {
  if (!existsSync(p)) {
    console.error(`[prerender] FEHLT: ${label}`);
    process.exit(1);
  }
}

const { render, ROUTE_PATHS } = await import(pathToFileURL(ENTRY_PATH).href);

/**
 * Setzt eine bereits vorgerenderte index.html auf die Ausgangshülle zurück.
 *
 * Ohne das ist das Skript nicht idempotent: Läuft `build:prerender` ohne
 * vorheriges `vite build`, ist dist/spa/index.html schon die vorgerenderte
 * Startseite. Die würde dann als Vorlage dienen und das Markup verschachtelte
 * sich bei jedem Lauf weiter (beobachtet: /demo-dashboard wuchs von 24,8 KB auf
 * 146,6 KB). Im normalen Build fällt das nicht auf, weil `vite build` die Datei
 * vorher neu schreibt – verlassen sollte man sich darauf aber nicht.
 */
const ROOT_OPEN = '<div id="root">';
// Endanker bewusst der Service-Worker-Kommentar und nicht das schliessende
// </div>: Das vorgerenderte Markup enthält beliebig verschachtelte <div> und
// zusätzlich die <!-- --> Trennmarken, die React beim SSR zwischen Text und
// Ausdruck setzt. Ein Regex über </div> oder <!-- trifft dort die falsche
// Stelle. Der Kommentar kommt im App-Markup nicht vor.
const ROOT_END = "<!-- Service Worker Registration -->";

function rootBounds(html) {
  const start = html.indexOf(ROOT_OPEN);
  const end = html.indexOf(ROOT_END);
  if (start === -1 || end === -1 || end < start) return null;
  return { start, end };
}

function pristine(html) {
  const b = rootBounds(html);
  if (!b) return html;
  return (
    html.slice(0, b.start) +
    `${ROOT_OPEN}\n    <div class="loading-spinner"></div>\n  </div>\n\n  ` +
    html.slice(b.end)
  );
}

// Vorlage EINMAL lesen, bevor irgendetwas geschrieben wird – sonst würde die
// zweite Route auf dem bereits injizierten Markup der ersten aufsetzen.
const TEMPLATE = pristine(readFileSync(HTML_PATH, "utf8"));

const plain = (s) =>
  s.replace(/<[^>]+>/g, " ").replace(/&amp;/g, "&").replace(/&nbsp;/g, " ").replace(/\s+/g, " ").trim();

/**
 * Entfernt die statischen Platzhalter, die react-helmet-async sonst zur Laufzeit
 * ersetzt (sie tragen data-rh="true"), sowie den <title>. An ihre Stelle treten
 * die von Helmet für DIESE Route erzeugten Tags.
 */
function baseTemplateFor(route) {
  // \b[^>]* statt nur "<title>": Helmet gibt <title data-rh="true"> aus. Ohne
  // die Attribut-Behandlung bliebe dessen Tag stehen und bei jedem weiteren
  // Lauf käme ein zusätzliches <title> hinzu. Global, damit auch mehrere
  // Altbestände verschwinden.
  let html = TEMPLATE.replace(/<(?:meta|link)\b[^>]*data-rh="true"[^>]*>\s*/g, "")
    .replace(/<title\b[^>]*>[\s\S]*?<\/title>\s*/g, "");

  // Der <noscript>-Block beschreibt den Google-Abschnitt und gehört nur auf die
  // Startseite. Auf Unterseiten stünde er sonst zusätzlich zum echten Inhalt.
  if (route !== "/") {
    html = html.replace(/<noscript>[\s\S]*?<\/noscript>\s*/g, (m) =>
      m.includes("google-profil") ? "" : m,
    );
  }
  return html;
}

/**
 * Netlify liefert dist/spa/index.html auch für unbekannte Pfade aus. Dieses
 * inline-Script entfernt vorgerendertes Markup, wenn der aufgerufene Pfad nicht
 * der ist, für den die Datei erzeugt wurde – sonst blitzte auf /irgendwas kurz
 * die Startseite auf. Es läuft synchron beim Parsen, also vor dem ersten Paint.
 */
const guardFor = (route) =>
  `<script>(function(){var p=location.pathname.replace(/\\/+$/,"")||"/";` +
  `if(p!==${JSON.stringify(route)}){var r=document.getElementById("root");` +
  `if(r)r.innerHTML='<div class="loading-spinner"></div>';}})();</script>`;

const outPathFor = (route) =>
  route === "/" ? HTML_PATH : path.join(SPA_DIR, route.replace(/^\//, ""), "index.html");


function buildRoute(route) {
  const { html: appHtml, head } = render(route);

  if (!appHtml || appHtml.length < 500) {
    throw new Error(`Ergebnis unplausibel kurz (${appHtml?.length ?? 0} Zeichen)`);
  }

  // Reihenfolge beachten: Erst den <head> ergänzen, DANN die Anker suchen –
  // die Ersetzung verschiebt sonst alle nachfolgenden Indizes.
  let html = baseTemplateFor(route).replace("</head>", `  ${head}\n</head>`);

  const b = rootBounds(html);
  if (!b) {
    throw new Error(`Anker ${ROOT_OPEN} / ${ROOT_END} nicht in index.html gefunden`);
  }

  html =
    html.slice(0, b.start) +
    `${ROOT_OPEN}${appHtml}</div>\n  ${guardFor(route)}\n\n  ` +
    html.slice(b.end);

  const out = outPathFor(route);
  mkdirSync(path.dirname(out), { recursive: true });
  writeFileSync(out, html, "utf8");

  return { appHtml, html, out, bytes: Buffer.byteLength(html) };
}

// ── Startseite: Pflicht ──────────────────────────────────────────────────────
let home;
try {
  home = buildRoute("/");
} catch (err) {
  console.error(`[prerender] Startseite fehlgeschlagen: ${err.message}`);
  process.exit(1);
}

const REQUIRED = [
  'id="google-profil"',
  "Maitr – dein digitaler Gastgeber für Google",
  "Jede Aktion wird vor der Veröffentlichung vom Inhaber freigegeben.",
];
for (const needle of REQUIRED) {
  if (!home.appHtml.includes(needle)) {
    console.error(`[prerender] Pflichtinhalt fehlt im gerenderten HTML: ${needle}`);
    process.exit(1);
  }
}

// Der <noscript>-Block ist die Fassung, die ein Abruf OHNE JavaScript sieht.
// Läuft sie gegen den sichtbaren Abschnitt auseinander, steht in der Quelle
// etwas anderes als auf der Seite – das sieht nach Cloaking aus.
const srcHtml = readFileSync(path.join(ROOT, "index.html"), "utf8");
const googleNoscript = [...srcHtml.matchAll(/<noscript>([\s\S]*?)<\/noscript>/g)]
  .map((m) => m[1])
  .find((b) => b.includes("google-profil"));
if (!googleNoscript) {
  console.error("[prerender] Kein <noscript>-Block mit google-profil in index.html gefunden.");
  process.exit(1);
}
const bodyMatch = plain(home.appHtml).match(
  /Maitr hilft Cafés und Restaurants.*?vom Inhaber freigegeben\./,
);
if (!bodyMatch) {
  console.error("[prerender] Fließtext des Google-Abschnitts im Markup nicht gefunden.");
  process.exit(1);
}
if (!plain(googleNoscript).includes(bodyMatch[0])) {
  console.error(
    "[prerender] <noscript> in index.html weicht vom sichtbaren Abschnitt ab.\n" +
      `  gerendert  : ${bodyMatch[0]}\n` +
      `  <noscript> : ${plain(googleNoscript)}\n` +
      "  Bitte den <noscript>-Block in index.html wortgleich nachziehen.",
  );
  process.exit(1);
}

console.log(`[prerender] /  ->  ${(home.bytes / 1024).toFixed(1)} KB`);

// ── Übrige Routen: best effort ───────────────────────────────────────────────
const skipped = [];
for (const route of ROUTE_PATHS.filter((r) => r !== "/")) {
  try {
    const r = buildRoute(route);
    console.log(`[prerender] ${route.padEnd(18)} ->  ${(r.bytes / 1024).toFixed(1)} KB`);
  } catch (err) {
    skipped.push({ route, reason: err.message });
  }
}

// ── Abgleich mit netlify.toml und sitemap.xml ────────────────────────────────
// Die Routenliste steht an drei Stellen: hier (über entry.tsx), in netlify.toml
// und in public/sitemap.xml. Läuft sie auseinander, fällt das sonst erst in der
// Search Console auf – deshalb hart im Build prüfen.
const built = ROUTE_PATHS.filter((r) => !skipped.some((s) => s.route === r));
const problems = [];

const netlifyToml = readFileSync(path.join(ROOT, "netlify.toml"), "utf8");
for (const route of built.filter((r) => r !== "/")) {
  if (!netlifyToml.includes(`from = "${route}"`)) {
    problems.push(
      `netlify.toml: Regel für "${route}" fehlt. Netlify antwortet sonst mit 301 auf ` +
        `"${route}/" – Sitemap und Canonical zeigen aber auf die Fassung ohne Schrägstrich.`,
    );
  }
}

const sitemap = readFileSync(path.join(ROOT, "public/sitemap.xml"), "utf8");
const sitemapPaths = [...sitemap.matchAll(/<loc>https:\/\/www\.maitr\.de(\/[^<]*)?<\/loc>/g)].map(
  (m) => (m[1] || "/").replace(/\/$/, "") || "/",
);
for (const route of built) {
  if (!sitemapPaths.includes(route)) {
    problems.push(`public/sitemap.xml: "${route}" wird vorgerendert, fehlt aber in der Sitemap.`);
  }
}
for (const p of sitemapPaths) {
  if (!built.includes(p)) {
    problems.push(`public/sitemap.xml: "${p}" steht in der Sitemap, wird aber nicht vorgerendert.`);
  }
}

if (problems.length) {
  console.error("\n[prerender] Routenlisten laufen auseinander:");
  for (const p of problems) console.error(`  - ${p}`);
  process.exit(1);
}

if (skipped.length) {
  console.warn(
    `\n[prerender] ${skipped.length} Route(n) NICHT vorgerendert – sie werden weiterhin\n` +
      "            als SPA-Hülle ausgeliefert und melden dadurch den Canonical der\n" +
      "            Startseite an Suchmaschinen:",
  );
  for (const s of skipped) console.warn(`              ${s.route}: ${s.reason}`);
}
