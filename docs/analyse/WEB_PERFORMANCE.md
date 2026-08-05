# Web-Performance: maitr.de und erzeugte Kunden-Seiten

Stand: 2026-08-04. Alle Zahlen in diesem Dokument sind selbst gemessen (curl,
Dateigrößen, Code-Lektüre mit Datei:Zeile-Beleg) — keine Schätzungen, kein
Lighthouse/PageSpeed (Werkzeug stand in dieser Umgebung nicht zur Verfügung).
Wo etwas nicht geprüft werden konnte, steht das explizit dabei statt einer
Vermutung.

**Methodischer Hinweis:** Ein erster Messdurchlauf für `<link>`-Tags nutzte
`grep -o` mit einem einzeiligen Pattern und übersah dadurch mehrzeilig
formatierte `<link>`-Tags (z. B. das Font-`preload`, dessen `href` in der
Zeile nach `rel="preload"` steht). Alle `<link>`/`<script>`-Zählungen in
diesem Dokument sind mit einem Python-Regex (`re.DOTALL`, tag-übergreifend)
gegengeprüft; die Zahlen unten sind die korrigierten.

## Methodik

- Live-HTML: `curl -s -o /tmp/maitr_live.html https://www.maitr.de/`
  (04.08.2026, HTTP 200, `cache-status: "Netlify Edge"; hit`).
- Übertragene Größen: `curl -s -H "Accept-Encoding: br" -o /dev/null -w
  "%{size_download}"` gegen die jeweilige Live-URL — sowohl für `/` als auch
  für jede einzelne JS/CSS-Datei einzeln (`https://www.maitr.de/js/chunk-....js`
  usw.), also echte Netlify-Brotli-Auslieferung, keine Simulation.
- `<link>`/`<script>`-Struktur: Python `re.findall(r'<link\b[^>]*>', html,
  re.DOTALL)` bzw. analog für `<script>`, gegen live UND lokal geprüft.
- Lokaler Build: bereits vorhandener Ordner `dist/spa/` (Zeitstempel
  04.08.2026, 10:24) — **nicht** neu gebaut, Vorgabe war kein `npm run build`.
  Dieser Build enthält den Prerender-Fix aus diesem Branch, der auf `main`
  und damit live noch fehlt (Details unter 2.2).

## 1. Ausgelieferte Startseite (live, https://www.maitr.de/)

| Metrik | Wert |
|---|---|
| HTML, unkomprimiert | 59.442 Bytes |
| HTML, Brotli (Draht, `Accept-Encoding: br`) | 10.852 Bytes |
| HTML, Gzip (zum Vergleich) | 16.018 Bytes |
| `<script>`-Tags gesamt | 4: 1× JSON-LD (2.557 B), 1× `<script type="module" src="/assets/index-Dwd7VbS3.js">`, 1× Inline-Skript (188 B, räumt beim Direktaufruf einer Unterseite den Root-Container leer für den Ladespinner), 1× Inline-Skript (203 B, Service-Worker-Registrierung) |
| `<link rel="stylesheet">` | **5**: 2× Google-Fonts (Poppins, Space Grotesk) über den Print-Swap-Trick (`media="print" onload="this.media='all'"`, damit nicht render-blockierend), 2× dieselben zwei Fonts nochmal in einem `<noscript>`-Block (Fallback ohne JS), 1× `/css/index-Dfr0XpNF.css` (das eigentliche App-CSS, render-blockierend) |
| `<link rel="preload">` | **1** — `as="style"` auf die Space-Grotesk-Google-Fonts-URL. Poppins bekommt keinen Preload, nur den Print-Swap-Trick |
| `<link rel="modulepreload">` | 7 JS-Chunks |
| `<img>`-Tags im HTML | 1 (App-Mockup-Bild, dazu mehr unter 2.3) |

JS/CSS für den Erstaufruf der Startseite, **live einzeln abgerufen** (nicht
simuliert):

| Datei | roh | Brotli (live gemessen) |
|---|---:|---:|
| `/assets/index-Dwd7VbS3.js` (Haupteinstieg) | 135.350 B | 39.424 B |
| `/js/chunk-BwL_5thK.js` | 221.948 B | 72.228 B |
| `/js/chunk-DJPcoK6t.js` | 81.277 B | 20.906 B |
| `/js/chunk-tgZbSMdc.js` | 47.938 B | 15.829 B |
| `/js/chunk-skKD_gDv.js` | 26.457 B | 8.116 B |
| `/js/chunk-Cu_IcRx-.js` | 24.279 B | 8.279 B |
| `/js/chunk-CKV240FE.js` | 20.857 B | 7.849 B |
| `/js/chunk-DeRmtv56.js` | 20.256 B | 6.504 B |
| `/css/index-Dfr0XpNF.css` | 129.534 B | 17.467 B |
| **Summe** | **707.896 B (≈ 691 KB)** | **196.602 B (≈ 192 KB)** |

Dazu kommen die beiden Google-Fonts-CSS-Antworten (Poppins, Space Grotesk),
deren Größe hier nicht separat gemessen wurde (typischerweise wenige KB pro
Font-CSS plus die eigentlichen `.woff2`-Dateien, die Google Fonts selbst
ausliefert — außerhalb der maitr.de-Infrastruktur, daher nicht Teil dieser
Messung).

Zum Vergleich, ungenutzt auf der Startseite (nur bei Bedarf per Route-Splitting
geladen): `ModeSelection-DnGQfpC9.js` 344 KB, `Configurator-Ma_mAw60.js` 203 KB,
`DemoDashboardHome-fTLn8wry.js` 98 KB roh.

**Chunk-Inhalt**, per Grep nach lesbaren Strings in den minifizierten Dateien
identifiziert (kein Bundle-Analyzer/Sourcemap zur Verfügung, daher Näherung):

- `chunk-BwL_5thK.js` (221.948 B / 72.228 B Brotli, größter Chunk): 41×
  `radix`/`Radix`, dazu React-Signaturen (20× `createElement`, 33×
  `useState`, 46× `useEffect`, 41× `forwardRef`, 3× `react.element`) —
  vermutlich der gemeinsame React+Radix-UI-Vendor-Chunk.
- `chunk-DJPcoK6t.js` (81.277 B / 20.906 B Brotli): 321× `clerk`, 65×
  `Clerk` — das Auth-SDK Clerk. Dazu mehr unter Punkt 4, Maßnahme 1.
- Für die übrigen Chunks (`tgZbSMdc`, `skKD_gDv`, `Cu_IcRx-`, `CKV240FE`,
  `DeRmtv56`) fand sich keine eindeutig zuordenbare Bibliotheks-Signatur bei
  Stichproben-Greps — nicht identifiziert.

## 2. Nachprüfung der bekannten offenen Punkte

### 2.1 Drei ungelöste Suspense-Grenzen — bestätigt, live UND lokal

Live: `data-msg=` kommt **3**-mal vor (Python-Zählung, deckungsgleich mit
grep). Die drei Stellen laut `client/pages/Index.tsx`:

- `Index.tsx:269-271` — `<Suspense><LazyAuthSection /></Suspense>` im
  Desktop-Header, Fallback `<div class="w-32 h-9 bg-gray-100 animate-pulse
  rounded-lg">` — klein, unkritisch.
- `Index.tsx:336-338` — dieselbe Komponente im Mobilmenü, Fallback `null`,
  im geschlossenen Menü ohnehin unsichtbar.
- `Index.tsx:660-671` — `<Suspense><MaitrWorkflowAnimation /></Suspense>` in
  der Sektion "So funktioniert Maitr". Fallback: ein **850px hoher** leerer
  Kasten mit Spinner (`h-[850px] md:h-[850px]`, `Index.tsx:665`, Klasse
  bestätigt per Grep sowohl live als auch lokal).

Kommentar direkt am Fallback (`Index.tsx:662-664`): Die 850px sind bewusst
exakt auf die Höhe der geladenen Animation abgestimmt, um Layout-Shift zu
vermeiden ("sonst springt das Layout ... um 150px"). Kein CLS-Problem also,
aber ein 850px hoher inhaltsleerer Bereich direkt unterhalb des Hero-Bereichs,
bis JS geladen und ausgeführt ist.

**Lokaler Build (nach dem Fix in diesem Branch) zeigt exakt dasselbe:** 0×
`data-msg`, aber weiterhin 3× leeres `<template></template>` und derselbe
850px-Kasten — das Suspense-Problem selbst ist durch den Fix **nicht**
behoben, nur die Diagnostik-Bytes sind weg (siehe 2.2).

Ursache laut Code-Kommentar `vite.config.prerender.ts:12-18`:
`renderToString` in `client/prerender/entry.tsx` rendert synchron und kann
grundsätzlich nicht auf ein `lazy()`-Promise warten.

Geprüft, ob `MaitrWorkflowAnimation` zwingend clientseitige Daten braucht, die
das `lazy()` rechtfertigen: `client/components/MaitrWorkflowAnimation.tsx`
holt keine Daten, sondern startet mit festem Anfangszustand und steuert sich
über `setTimeout`-Ketten. Sie importiert aber `motion, AnimatePresence` aus
`framer-motion` (`MaitrWorkflowAnimation.tsx:2`), das sonst nirgends
synchron in `Index.tsx` importiert wird (0 Treffer für `from "framer-motion"`
dort). Der aktuelle Lazy-Chunk `MaitrWorkflowAnimation-4qpS9oNJ.js` wiegt live
gemessen 18.681 B roh / 4.619 B Brotli — das wäre ungefähr die Zusatzlast im
Hauptbündel, würde man den `lazy()`-Import entfernen.

### 2.2 React-Development-Diagnostik im HTML — live vorhanden, lokal (nach Fix) weg, noch nicht deployed

Live-HTML enthält an den drei Suspense-Stellen `data-msg`- und
`data-stck`-Attribute mit vollem React-Fehlertext sowie absoluten Pfaden des
Netlify-Build-Containers (4 unterschiedliche `file://`-Pfade, 11 Vorkommen
insgesamt), u. a.:

```
file:///opt/build/repo/dist/prerender/entry.mjs:634:5
file:///opt/build/repo/node_modules/.pnpm/react-router-dom@6.30.3_react-dom@18.3.1_react@18.3.1__react@18.3.1/node_modules/react-router-dom/server.mjs:11:3
```

Das legt Interna der Build-Umgebung offen (Verzeichnisstruktur, exakte
pnpm-Paketversionen). Lokaler Build (dieser Branch): 0 Treffer für
`data-msg`, `data-stck`, `file://`. Größendifferenz HTML live (59.442 B)
minus lokal (55.240 B) = **4.202 Bytes**, passend zur entfernten Diagnostik.

Ursache: `vite.config.prerender.ts:41-43` fixiert `process.env.NODE_ENV` zur
Build-Zeit auf `"production"`, `vite.config.prerender.ts:60` bündelt mit
`noExternal: true` statt nur `react-helmet-async`. Ohne das lief
`react-dom/server` im Prerender-Prozess in der Development-Fassung, weil
`NODE_ENV` dort nie gesetzt wurde.

Dieser Fix existiert nur auf dem aktuellen Branch: `git show
main:vite.config.prerender.ts` zeigt die alte Fassung (`noExternal:
["react-helmet-async"]`, kein `define`-Block). Laut Projektwissen deployt
`main` automatisch nach Netlify — ob der Merge nach `main` bereits ansteht
oder wann er erfolgt, wurde hier nicht geprüft (kein Zugriff auf
GitHub-PR-Status oder Netlify-Deploy-Verlauf).

### 2.3 Bilder ohne reservierte Größe — auf der Startseite kein Problem

Die Startseite hat genau **ein** `<img>`-Tag (App-Mockup mit `srcset` für
800/1200/1600px). Es hat `width="1600" height="1200"`, `loading="lazy"` und
`decoding="async"` — vollständig korrekt ausgezeichnet. Für die Kunden-Web-Apps
liegt der Befund differenzierter, siehe Abschnitt 3.

### 2.4 Genau ein `<link rel="preload">` — bestätigt

Siehe Tabelle in Abschnitt 1: Es gibt exakt 1 `<link rel="preload" as="style">`,
und zwar für die Space-Grotesk-Google-Fonts-CSS-URL. Poppins — die zweite auf
der Seite verwendete Schrift laut `tailwind.config.ts` — bekommt keinen
Preload, nur den nicht-blockierenden Print-Swap-Trick. Ob das beabsichtigt ist
(z. B. weil Space Grotesk für den LCP-relevanten Text gebraucht wird, Poppins
nicht), wurde hier nicht weiter geprüft.

Zusätzlich liegt eine `dist/spa/critical.css` (1.692 Bytes) im Build-Output,
wird im HTML aber nirgends referenziert (0 Treffer für `critical.css` in
`index.html`). Ihr Inhalt steckt bereits inline im `<head>` als
`<style>`-Block (1.135 Bytes). Die Datei im Output ist toter, aber minimaler
Ballast (1,7 KB, wird nie geladen).

## 3. Erzeugte Kunden-Seiten

Zwei getrennte Rendering-Pfade sind im Code registriert:

**A. Subdomain-Pfad** (`kunde.maitr.de`) → `client/pages/HostAwareRoot.tsx` →
`client/components/dynamic/AppRenderer.tsx`.

**B. Pfad-basiert** (`maitr.de/:id/:name`, `maitr.de/site/:subdomain`) →
`client/pages/Site.tsx`, geroutet in `client/App.tsx:234-235`.

Geprüft, welcher Pfad im aktiven Publish-Flow erzeugt wird:
`server/routes/webapps.ts:276`, `server/routes/webapps.ts:491` und
`server/services/NetlifyPublishService.ts:168` erzeugen die `publishedUrl`
durchgängig als `` `https://${subdomain}.${baseDomain}` `` — also Pfad A.
Eine Suche nach `"/site/"` und dem `/:id/:name`-Muster im übrigen `server/`-
und `client/`-Code findet keine Stelle außerhalb von `Site.tsx` selbst, die
aktiv eine solche URL erzeugt oder verlinkt. Das deutet auf einen
Reserve-/Altpfad hin, der nicht mehr aktiv verlinkt wird — beweist aber nicht,
dass er nicht über alte, bereits verteilte Links noch aufgerufen wird. Beide
Routen sind live erreichbar.

### 3.1 Ladezeit-relevante Unterschiede

**Pfad A ist deutlich durchdachter:**
- `netlify/edge-functions/inject-site-config.ts:1-19` läuft am Netlify-Edge
  für jede `*.maitr.de`-Subdomain (außer Hauptdomain/`.netlify.app`/reservierte
  Namen, Zeilen 23-36, 47-50) und injiziert die vom Railway-Backend geholte
  Konfiguration (Zeilen 62-69) direkt als `window.__MAITR_CONFIG__` ins HTML —
  kein client-seitiger Fetch nötig. Der Datei-Kommentar selbst beziffert den
  erwarteten FCP-Effekt auf "~300-400ms" (`inject-site-config.ts:16`) — eine
  Angabe der Autoren im Code, hier nicht selbst nachgemessen.
- `HostAwareRoot.tsx:38-43`: Bundle-Download für `AppRenderer` startet
  parallel, nicht nach der Konfiguration.
- `HostAwareRoot.tsx:62-70`: Edge-injizierte Config bzw. In-Memory-
  Session-Cache werden zuerst genutzt, bevor überhaupt `fetch()` in Frage
  kommt.
- Fällt beides aus: `fetch` und Bundle-Download laufen in einem `Promise.all`
  parallel (`HostAwareRoot.tsx:88-91`), inklusive ETag/304-Unterstützung
  (`HostAwareRoot.tsx:82-86, 94-97`).

**Pfad B hat nichts davon:** `Site.tsx:722-743` — ein `useEffect`, das erst
nach dem Mount `configurationApi.getPublishedSite(...)` aufruft; bis zur
Antwort steht "Loading Site..." (`Site.tsx:745-754`). Kein Edge-Inject
(die Edge-Function bricht für die Hauptdomain sofort ab,
`inject-site-config.ts:48-50`), kein Parallel-Start (das Bundle muss ohnehin
erst geladen sein, damit der `useEffect` läuft), kein Cache.

### 3.2 Bilder: Lazy-Loading und reservierte Größe

| Datei:Zeile | Kontext | `loading="lazy"`? | Größe reserviert? |
|---|---|---|---|
| `AppRenderer.tsx:622-626` | Galerie-Grid | nein | ja, `aspect-square`-Container (`AppRenderer.tsx:619`) |
| `DishCard.tsx:170-175` | Gericht-Karten | ja | ja, `w-16 h-16`-Container |
| `Navigation.tsx:173-183` | Logo | nein (unkritisch, immer sichtbar) | ja, `w-8 h-8`-Container |
| `DishModal.tsx:241-249` | Detail-Modal-Bild | nein (unkritisch, on-demand gemountet) | ja, `h-48`-Container |
| `Site.tsx:128-132` | Angebots-Banner | nein | teilweise (`h-48` fix, kein `width`/`height`-Attribut) |
| `Site.tsx:324-329` | Homepage-Dish-Thumbnails | nein | teilweise (`h-20` fix) |
| `Site.tsx:405-409` | Menü-Grid | nein | teilweise |
| `Site.tsx:642-646` | Produkt-Modal | nein (unkritisch, on-demand) | teilweise |
| `GalleryGrid.tsx:110-114` | Galerie (von `Site.tsx:449` genutzt) | nein | ja, `aspect-square`-Container |

Layout-Shift-Risiko ist strukturell gering: fast überall reservieren feste
Tailwind-Container (`aspect-square`, `h-20`, `h-48`, `w-16 h-16`) den Platz
schon vor dem Laden des Bildes — nur eben über CSS, nicht über native
`width`/`height`-Attribute. Der reale Kostenpunkt ist fehlendes
Lazy-Loading: In `AppRenderer.tsx` und `GalleryGrid.tsx` laden Galerie-Bilder
ohne `loading="lazy"` — bei einer Galerie mit z. B. 20 Fotos lädt der Browser
potenziell alle 20 beim Öffnen der Galerie-Seite statt nur die sichtbaren.
Typische Bildanzahl pro Kunden-Galerie wurde hier nicht an Produktionsdaten
geprüft.

**Zusatzbefund, nicht explizit gefragt, aber die Bild-Frage direkt
betreffend:** `AppRenderer.tsx` ruft `DishCard` sowohl für die
Homepage-Highlights (`AppRenderer.tsx:362-376`) als auch für die Speisekarte
(`AppRenderer.tsx:470-486`) auf, **ohne** die Prop `showImage` zu setzen.
Deren Default ist `false` (`DishCard.tsx:113`), der Bild-Block
(`DishCard.tsx:165-177`, inkl. des einzigen `loading="lazy"` im gesamten
Kunden-Renderer) wird also auf veröffentlichten Seiten aktuell nie gerendert.
`showImage={true}` wird ausschließlich im Editor-Preview gesetzt
(`client/components/configurator/preview/TemplatePreviewContent.tsx:490,510`).
Reine Tatsachenfeststellung aus dem Code — keine Aussage, ob das beabsichtigt
ist.

### 3.3 Feste Seitenverhältnisse / Code-Splitting

`AppRenderer.tsx` ist eine einzelne Komponente ohne eigenes Route-Splitting
pro Unterseite (`switch` in `renderContent()`, `AppRenderer.tsx:736-755`).
Lokal gemessene Chunk-Größe für `AppRenderer-*.js`: nicht gesondert isoliert
in dieser Erhebung (der Chunk wird zusammen mit `Configurator`-Code gebündelt
laut `HostAwareRoot.tsx:40`-Import; eine trennscharfe Einzelmessung war mit
den hier verfügbaren Mitteln nicht möglich). Bei den beobachteten
Chunk-Größenordnungen (siehe Abschnitt 1) ist zusätzliches Splitting
innerhalb von `AppRenderer` vermutlich kein großer Hebel, wurde aber nicht
quantifiziert.

## 4. Die drei wirksamsten Maßnahmen

Nach Reichweite (wie viele Aufrufe betroffen sind) und Sichtbarkeit des
Effekts, mit Aufwandseinschätzung aus der Code-Lage — keine der drei wurde
umgesetzt oder gebaut, das war nicht Teil des Auftrags.

### 1. Clerk-Chunk nicht beim ersten Render der Startseite laden

**Befund:** `client/pages/Index.tsx:49` trägt den Kommentar `// Clerk removed
from landing page for performance (~700KB JS saving)`. Tatsächlich
importiert `client/components/LazyAuthSection.tsx:2` `useAuth` aus
`@clerk/clerk-react` als normalen (nicht lazy) Import. `LazyAuthSection`
selbst hängt an zwei `<Suspense>`-Grenzen, die beim allerersten Render der
Startseite sofort ausgelöst werden (`Index.tsx:269-271`, im Header, ab dem
ersten Frame sichtbar) — React startet den `import()` einer
Suspense-Grenze beim ersten Rendern, nicht erst bei Interaktion. Der daraus
resultierende Chunk `chunk-DJPcoK6t.js` (81.277 B roh / 20.906 B Brotli,
live gemessen, nachweislich Clerk-haltig) steht deshalb bereits als `<link
rel="modulepreload">` im Live-HTML — wird also unmittelbar beim Seitenaufruf
mitgeladen, nicht erst bei Klick auf Login. Die im Kommentar behauptete
Einsparung greift in der jetzigen Verdrahtung nicht.

**Effekt:** rund 21 KB Brotli weniger im kritischen Ladepfad jedes
Erstaufrufs, plus die Clerk-Initialisierung selbst fällt aus dem kritischen
Pfad. Nicht mit einem Ladezeit-Tool gemessen — Aussage beruht auf
Bundle-Größe, nicht auf gemessener Zeitersparnis.

**Aufwand:** gering bis mittel. Der Login-Zustand müsste ohne sofortigen
Clerk-Import ermittelbar sein, oder das Laden müsste an eine echte
Nutzerhandlung gekoppelt werden statt an den ersten Render.

### 2. "So funktioniert Maitr" ohne leeren 850px-Kasten für Erstbesucher

**Befund:** siehe 2.1. Direkt unterhalb des Hero-Bereichs steht bis zum Laden
und Ausführen von `MaitrWorkflowAnimation` ein 850px hoher leerer Kasten mit
Spinner statt Inhalt — live UND im bereits gefixten lokalen Build (der Fix
aus Punkt 2.2 behebt nur die Diagnostik-Bytes, nicht diesen Kasten; das steht
so im Code-Kommentar `vite.config.prerender.ts:12-18`).

**Effekt:** groß für den wahrgenommenen ersten Eindruck — 850px ist mehr als
eine Bildschirmhöhe auf vielen Mobilgeräten, direkt im Bereich, den ein
Erstbesucher nach dem Hero als Nächstes sieht. Kein CLS-Effekt (Höhe ist
reserviert), aber ein dominanter leerer Bereich bis zur Hydration. Nicht mit
LCP/FCP-Messung quantifiziert.

**Aufwand:** klein bis mittel. Zwei Stoßrichtungen, ohne dass hier eine davon
umgesetzt oder getestet wurde: a) `MaitrWorkflowAnimation` im Prerender-Pfad
nicht lazy, sondern synchron importieren — laut Code-Lektüre hat die
Komponente keine Datenabhängigkeit, die `lazy()` rechtfertigen würde; Preis
wäre, dass `framer-motion` (aktuell nur im Lazy-Chunk, 4.619 B Brotli) neu
ins Hauptbündel wandert. b) Wie im Code-Kommentar selbst vorgeschlagen
(`vite.config.prerender.ts:16`) den Prerenderer von `renderToString` auf
`renderToPipeableStream`/`renderToReadableStream` umstellen, was Suspense im
SSR grundsätzlich unterstützt — größerer Umbau, da `scripts/prerender.mjs`
aktuell synchron auf einem fertigen String arbeitet statt einem Stream.

### 3. Vorhandenen Prerender-Fix nach `main` mergen und deployen

**Befund:** siehe 2.2. Der Fix liegt fertig auf diesem Branch
(`vite.config.prerender.ts`), lokal verifiziert (0 Diagnostik-Treffer im
Build), aber `main` hat noch die alte Fassung und ist damit vermutlich auch
das, was live läuft.

**Effekt:** klein, aber gemessen: 4.202 Bytes weniger HTML pro Seitenaufruf
(unkomprimiert), dazu verschwinden interne Serverpfade
(`file:///opt/build/repo/...`, pnpm-Versions-Hashes) aus der Auslieferung.

**Aufwand:** sehr gering, sofern nur Merge und Deploy fehlen — keine neue
Entwicklung nötig. Ob ein Merge/Deploy bereits läuft oder aussteht, wurde
hier nicht geprüft (kein Zugriff auf PR- oder Netlify-Deploy-Status).

**Nicht in die Top 3, aber im Code belegt:** `loading="lazy"` bei den
Galerie-Bildern in `AppRenderer.tsx:622` und `GalleryGrid.tsx:110` nachrüsten
— ein Attribut pro Stelle, Effekt proportional zur (hier unbekannten)
Galeriegröße typischer Kunden-Setups. Ebenfalls draußen gelassen: der
fehlende Edge-Inject/Parallel-Fetch für den pfadbasierten Kunden-Renderer
(`Site.tsx`, Abschnitt 3.1) — potenziell ein großer Hebel, aber laut
Publish-URL-Schema (Abschnitt 3) vermutlich kein aktiv beworbener Pfad mehr.

## Nicht geprüft / offene Punkte

- Keine Lighthouse-, PageSpeed- oder WebPageTest-Messung durchgeführt. Alle
  Aussagen zu wahrgenommener Ladezeit sind aus Bundle-Größen und
  Code-Struktur abgeleitet, nicht aus echten Feld-/Labor-Metriken (LCP, INP,
  CLS als Zahl).
- Kein Test unter gedrosselter Netzwerkverbindung (3G/4G-Simulation).
- Keine Prüfung, wie viele echte Kundenseiten aktuell über `Site.tsx` vs.
  `AppRenderer` aufgerufen werden — nur Code-Indizien zum Publish-URL-Schema
  (Abschnitt 3).
- Keine Prüfung des Netlify-Deploy-Status/-Verlaufs, ob der lokale
  Prerender-Fix bereits unterwegs nach live ist.
- Chunk-Inhalte nur über Grep nach lesbaren Strings in minifizierten Dateien
  identifiziert, nicht über einen echten Bundle-Analyzer/Sourcemap —
  genaue Zusammensetzung und Tree-Shaking-Potenzial bleiben offen.
- Ob das Fehlen von Speisekarten-/Highlight-Bildern in `AppRenderer.tsx`
  (Abschnitt 3.2, `showImage` nie gesetzt) beabsichtigt ist oder eine
  Regression, wurde nicht geklärt — nur der Code-Zustand ist belegt.
- Keine Messung an echten Kunden-Konfigurationen (Bildanzahl in Galerien,
  Menügröße) — Aussagen zur Bildlast sind strukturell, nicht an
  Produktionsdaten gemessen.
