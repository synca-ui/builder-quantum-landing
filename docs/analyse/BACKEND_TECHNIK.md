# Backend-Technik: Ist-Stand und Beurteilung

Stand: 2026-08-04, Branch `chore/maitr-backend-und-sicherheitsfixes`.

Jede Aussage über den Code ist mit `datei:zeile` belegt, jede Aussage über fremde
Dienste mit einer Quelle, die ich abgerufen habe. Wo ich etwas nicht prüfen
konnte, steht das im Abschnitt „Was ich nicht prüfen konnte".

Gemessen wurde mit: `npx tsc --noEmit`, `npx vitest run server/__tests__/apiContract.spec.ts`,
`npm view <paket> version`, einem Skript, das die Express-Routing-Tabelle aus
`createServer()` ausliest, und einer Probe gegen das installierte Express 4.22.1.
Kein `npm run build`, kein voller Testlauf, keine Änderung am Quellcode.

---

## 1. Ist-Stand

### 1.1 Laufzeit, Framework, Datenbank, ORM

| Sache | Was | Beleg |
|---|---|---|
| Laufzeit | Node ≥ 22.12 (`engines`), CI pinnt 22.12.0 | `package.json:5-8`, `.github/workflows/ci.yml:19-20` |
| Framework | Express **4.22.1** | `package.json:38` |
| Datenbank | PostgreSQL auf Neon | `prisma/schema.prisma:6-9`, `server/db/prisma.ts:16-20` |
| ORM | Prisma **5.22.0** (Client + CLI) | `package.json:34`, `package.json:127` |
| Paketmanager | pnpm 10.14.0 | `package.json:130` |
| Validierung | Zod 3.25 | `package.json:64` |
| Sprache | TypeScript 5.9, `strict: false` | `package.json:141`, `tsconfig.json:20-25` |

Aktuelle Fassungen auf npm zum Messzeitpunkt: `prisma` 7.9.1, `@prisma/client` 7.9.1,
`express` 5.2.1 (`npm view`). Wir liegen bei Prisma zwei Hauptversionen, bei
Express eine zurück. Das ist für sich genommen kein Fehler — die Folge des
Express-Rückstands ist aber konkret, siehe 2.2.1.

Das Prisma-Schema hat 816 Zeilen, 30 Modelle und 12 Enums
(`prisma/schema.prisma:11-830`). Roh-SQL kommt im Serverquellcode nicht vor
(`grep queryRaw|executeRaw server/` → keine Treffer), der Zugriff läuft
vollständig über den generierten Client.

`server/db/prisma.ts:9-13` wirft beim **Import**, wenn `DATABASE_URL` fehlt. Das
ist der Grund, warum die CI einen Dummy-Wert setzt (`.github/workflows/ci.yml:57-58`) —
verbunden wird dabei nie.

Nicht benutzte Datenbank-Abhängigkeiten: `@neondatabase/serverless`, `@netlify/neon`
und `pg` stehen in `package.json:33,35,58`, kommen aber in keiner Quelldatei
außerhalb von `node_modules` vor (repoweite Suche, keine Treffer). Sie ziehen bei
jedem Deploy Installationszeit und Angriffsfläche.

### 1.2 Deploy

Zwei Ziele, ein Repository:

- **Netlify** baut die SPA. `netlify.toml:2` ruft `scripts/netlify-build.sh`,
  das seinerseits `npm run build` startet (`scripts/netlify-build.sh:13`).
  Veröffentlicht wird `dist/spa` (`netlify.toml:8`).
- **Railway** hält die API. Netlify leitet `/api/*` per Rewrite mit Status 200 an
  `https://builder-quantum-landing-production.up.railway.app/api/:splat`
  weiter (`netlify.toml:74-79`). Gestartet wird dort `node dist/server/node-build.mjs`
  (`package.json:22`).

Im Repository liegt **keine** Railway-Konfiguration (kein `railway.json`, kein
`nixpacks.toml`, kein `Dockerfile`, kein `Procfile`). Die Bau- und Startbefehle
für Railway sind also nur im Railway-Dashboard hinterlegt und im Repo nicht
nachvollziehbar.

CI (`.github/workflows/ci.yml`): drei Jobs auf jedem Push.
`build` (Pflicht), `test` (Pflicht, ohne Datenbank),
`typecheck` mit `continue-on-error: true` (`ci.yml:74`) — also informativ.
Der Kommentar dort nennt 98 Fehler zum 28.07.2026. Heute gemessen: **122**
(`npx tsc --noEmit`, 51 in `server/`, 66 in `client/`, 5 in `shared/`).
Der informative Job ist in einer Woche um 24 Fehler gewachsen.

Bemerkenswert: **null** dieser Fehler liegen in `server/maitr/` oder
`packages/core/`. Die 14 Serverfehler in `server/webhooks/stripe.ts` sind die
größte Einzelquelle im Backend.

### 1.3 Fremddienste, einzeln geprüft

| Dienst | Wofür | Wie eingebunden | Wie kritisch |
|---|---|---|---|
| **Clerk** | Die gesamte Authentifizierung | `@clerk/clerk-sdk-node` in `server/utils/clerk.ts:1`; `requireAuth` in `server/middleware/auth.ts:19-60`; Webhook mit svix-Signatur `server/index.ts:93` → `server/webhooks/clerk.ts` | **Maximal.** Ohne `CLERK_SECRET_KEY` bricht der Start ab (`server/node-build.ts:32-36`). Jede geschützte Route hängt daran. |
| **Neon (Postgres)** | Einzige Datenhaltung | Über Prisma, `DATABASE_URL` | **Maximal.** Ohne DB startet der Prozess nicht (`server/node-build.ts:22-26`). |
| **Supabase Storage** | Bild-Uploads | Nackte REST-API über `fetch`, bewusst **ohne** SDK (`server/services/supabaseStorage.ts:1-12`) | Mittel. Fehlt die Konfiguration, antwortet `/api/media/upload` mit 503 (`server/node-build.ts:49-56`), der Rest läuft. |
| **n8n** | Analyse-Flow für den Konfigurator | Dünner Proxy `server/routes/n8nProxy.ts:3-43`, registriert mit `strictLimiter` in `server/index.ts:107` | Mittel. Nur eine Warnung beim Start (`server/node-build.ts:41-45`). |
| **Gemini** | OCR der Speisekarte, erster Anbieter | `server/services/ocr/gemini.ts`, Kette in `server/services/ocr/index.ts:23-46` | Mittel, aber abgesichert: die Kette schaltet weiter. |
| **Anthropic** | OCR, zweiter Anbieter | `server/services/ocr/anthropic.ts`, `@anthropic-ai/sdk` (`package.json:24`) | Gering. Rückfallebene. |
| **Resend** | E-Mail (Reservierungsbestätigung) | `server/utils/email.ts` | Gering. |
| **Netlify API** | Wildcard-Alias `*.maitr.de` einmalig eintragen | `server/services/NetlifyPublishService.ts:33-36`, optional | Gering. |
| **Google / Meta** | Präsenzkanäle (Bewertungen, Reichweite) | `packages/core/src/integrations/{google,meta}.ts`, Server-Anbindung `server/maitr/sync.ts:10-11`, OAuth `server/maitr/routes.ts:11` | Noch keine. Ohne `MAITR_*`-Variablen bleibt der Zweig inaktiv, `maitrEnv()` wird erst beim Zugriff ausgewertet (`server/maitr/env.ts:28-39`). |
| **Stripe** | Nominell Abrechnung | **Nicht verdrahtet.** `handleStripeWebhook` ist in `server/webhooks/stripe.ts:459` exportiert und wird nirgends registriert (repoweite Suche: nur die Definition selbst). Der Checkout ist ein Platzhalter, der Stripe-Aufruf steht auskommentiert da und die Antwort liefert `checkoutUrl: null` (`server/routes/subscriptions.ts:233-260`). | Null — es gibt keine funktionierende Zahlungsstrecke. |

Das heißt: von zehn genannten Diensten sind zwei unverzichtbar (Clerk, Neon),
fünf nützlich, zwei schlafen bis zur Google-/Meta-Freigabe, und einer existiert
nur als Code, nicht als Funktion.

**Lücke in der Dokumentation:** `.env.example` listet weder `CLERK_SECRET_KEY`
(nur ein Verweis darauf im Kommentar, `.env.example:11`) noch `GEMINI_API_KEY`,
`ANTHROPIC_API_KEY`, `OCR_PROVIDER_ORDER`, `RESEND_API_KEY`,
`MAITR_SYNC_INTERVAL_MINUTES` oder eine der neun `MAITR_*`-Variablen aus
`server/maitr/env.ts:11-24`. Tatsächlich liest der Servercode 27 verschiedene
`process.env`-Namen; `.env.example` beschreibt 11 davon. Für die
`MAITR_*`-Variablen gibt es eine zweite Vorlage in `server/maitr/.env.example` —
zwei Dateien, die man beide kennen muss.

### 1.4 Aufbau des Servers

`createServer()` in `server/index.ts:69-151` baut die App in dieser Reihenfolge:
Helmet (CSP abgeschaltet, `server/index.ts:75-80`) → globaler Rate-Limiter →
CORS auf `*.maitr.de` und localhost (`server/index.ts:54-67`) → **zwei
Rohbody-Webhooks vor dem JSON-Parser** (Clerk `:93`, Meta `:100`) → JSON-Parser
mit 5-MB-Grenze → Einzelrouten → `apiRouter` unter `/api` (`:117`) →
Subdomain-Fallback als letztes (`:148`).

Die beiden Webhook-Registrierungen vor `express.json()` sind richtig und im Code
ausführlich begründet (`server/index.ts:88-99`) — die HMAC-Prüfung braucht den
unveränderten Buffer.

`server/routes/index.ts` hängt **19 Router** ein (18 verschiedene Präfixe,
`/webapps` zweimal für den geschützten und den öffentlichen Teil,
`server/routes/index.ts:155-196`). Dazu drei Einzelrouten (`:219-226`).

Gesamtzahl konkreter Routen, ausgelesen aus der echten Express-Routing-Tabelle:
**105**. Verteilung: 8 unter `/api/maitr`, 4 Demo-Routen mit erfundenen Daten
(`/api/demo/dashboard/*`, definiert **inline** in `server/routes/index.ts:29-149`),
der Rest gehört zum Baukasten.

**Wo liegt Geschäftslogik?** Uneinheitlich:

- In den Routen. Die Route-Dateien enthalten zusammen 7 946 Zeilen; die vier
  größten sind `configurations.ts` (752), `scraper.ts` (762), `webapps.ts` (563)
  und `admin.ts` (563). Prisma-Aufrufe stehen direkt in ihnen — 20 in
  `configurations.ts`, 16 in `creative-studio.ts`, 12 in `insights.ts`.
  `server/routes/insights.ts:57-90` rechnet Kennzahlen unmittelbar im Handler.
- In `server/services/` (12 Dateien). Nur vier davon werden von Routen
  importiert: `schemaGenerator` (`server/routes/schema.ts:7`), `TemplateEngine`
  (`server/routes/templates.ts:19`), `menuExtraction` und `menuJobs`
  (`server/routes/menu.ts:34-39`). Der Rest wird über andere Services oder gar
  nicht erreicht.
- In `packages/core/src/analytics/`, aufgerufen aus `server/maitr/briefing.ts:8-10`.

`server/maitr/` (1 055 Zeilen, 9 Module) ist die einzige Ecke mit einer klaren
Schichtung: `routes.ts` nimmt entgegen und validiert, `dataset.ts` sammelt aus
der DB, `briefing.ts` ruft die reinen Funktionen aus dem Kernpaket,
`security.ts` kapselt Krypto, `env.ts` validiert die Umgebung mit Zod.
Die Absicht steht in `server/maitr/README.md:11-16`: „Der Server rechnet nicht
selbst."

**Doppelte Fachlichkeit:** Reservierungen gibt es an drei Stellen —
`server/routes/reservations.ts` (Dashboard, 3 Routen),
`server/routes/publicReservations.ts` (öffentlich, 4 Routen) und
`server/maitr/routes.ts:59-108` (App, 2 Routen). Alle drei schreiben auf dasselbe
Prisma-Modell `Reservation` (`prisma/schema.prisma:121`). Auswertungen ebenso:
`server/routes/insights.ts` neben `server/maitr/briefing.ts`.

### 1.5 `packages/core`

1 895 Zeilen in sechs Bereichen: `analytics` (9 Dateien, 626 Zeilen),
`integrations` (Google/Meta-Connectors, 333), `types`, `api`, `auth`, `supabase`,
dazu `config.ts` und `http.ts`.

Zwei Entwurfsentscheidungen sind gut und ausdrücklich begründet:

1. Das Paket liest **nie selbst** aus `process.env` oder `import.meta.env`;
   Plattformen reichen alles über `configureCore()` herein
   (`packages/core/src/config.ts:1-8`, Aufruf mobil in
   `mobile/src/lib/bootstrap.ts:16-26`).
2. Es importiert `@supabase/supabase-js` nicht selbst, sondern nimmt eine Factory
   entgegen — sonst zwänge Metro die Mobile-App zur Installation
   (`packages/core/src/supabase/index.ts:3-11`).

**Wer nutzt es?** Server: nur `server/maitr/` (4 Dateien), und dort nur
`@maitr/core/analytics`, `/integrations` und `/types`. Mobile: 15 Dateien.
Web-Client: keine einzige. Der Web-Baukasten hat mit dem Kernpaket nichts zu tun.

**Die Aufteilung trägt technisch, aber sie kostet.** Es gibt keine
npm-Workspaces und kein installiertes Paket; die Auflösung läuft rein über
Aliase. Sechs Stellen müssen denselben Alias kennen:

| Stelle | Zweck | Beleg |
|---|---|---|
| `tsconfig.json:36-37` | Typprüfung Web/Server | zwei Einträge (`@maitr/core` + `/*`) |
| `vite.config.ts:115` | Dev-Server | |
| `vite.config.server.ts:59` | Server-Build | |
| `vitest.config.ts:19` | Tests | |
| `mobile/tsconfig.json:6-7` | Typprüfung Mobile | |
| `mobile/metro.config.js:22-42` | Mobile-Bundling | eigener `resolveRequest`, 20 Zeilen |

Der Kommentar in `vitest.config.ts:12-19` spricht von „vier Stellen" und meint
die vier im Web-Baum; mit der Mobile-App sind es sechs.

---

## 2. Beurteilung

### 2.1 Was trägt

**Express + Prisma + Postgres bei dieser Größe.** Der Zielnutzer ist ein Wirt,
die Last ist ein Dashboard-Aufruf pro Tag und Betrieb. 105 Routen in einem
Prozess mit einem Prisma-Singleton (`server/db/prisma.ts:23-31`) sind bei
zehnfacher Last unauffällig — die teuren Vorgänge (OCR, Scrape) laufen ohnehin
gegen fremde Dienste, nicht gegen die eigene CPU. Kein Grund, hier etwas zu
ändern.

**Die Auslagerung der Analytik in reine Funktionen.** `computeBriefing`
(`server/maitr/briefing.ts:8`) ruft dieselben Funktionen wie die Demo in der App.
Bei zehnfachem Funktionsumfang ist das der Unterschied zwischen „eine Kennzahl
ändern" und „eine Kennzahl an zwei Stellen ändern und hoffen, dass beide gleich
bleiben". Getestet ist es zwar noch nicht (siehe 2.2.5), aber die Form stimmt.

**Der Mandantenschnitt in `requireVenueAccess`** (`server/maitr/middleware.ts:50-67`).
Die Kennung wird aus genau einer Quelle gelesen; widersprechen sich Pfad, Query
und Rumpf, wird abgewiesen (`:35-43`). Der Kommentar dokumentiert den Angriff,
der vorher möglich war. Das ist die Art von Baustein, die bei zehnfacher
Nutzerzahl trägt, weil sie nicht pro Route neu erfunden wird.

**Die Krypto-Grundlagen des Maitr-Zweigs.** AES-256-GCM für Tokens at rest
(`server/maitr/security.ts:20-34`), HMAC-signierter, kurzlebiger OAuth-`state`
mit Ablauf und Nonce (`:39-79`), Meta-Webhook-HMAC über den Rohbody
(`server/maitr/index.ts:48-54`). Alles mit Node-`crypto`, ohne zusätzliche
Abhängigkeit. Das ist richtig gebaut und skaliert unverändert.

**Die Zwei-Stufen-Erkennung der Speisekarte.** `POST` legt einen Auftrag an und
antwortet sofort, `GET` fragt ab (`server/routes/menu.ts:1-13`). Der Grund ist
messbar und in der Quelle des Anbieters nachlesbar: Netlifys Proxy-Rewrites
brechen nach 26 Sekunden ab, und Netlify empfiehlt für längere Vorgänge
ausdrücklich, asynchron zu arbeiten
([docs.netlify.com](https://docs.netlify.com/manage/routing/redirects/rewrites-proxies/)).
Die Erkennung braucht 40 bis 90. Der Zuschnitt ist korrekt; nur die Ablage des
Auftrags ist es nicht (2.2.2).

**Die OCR-Rückfallkette.** Zwei Anbieter, Reihenfolge über
`OCR_PROVIDER_ORDER` steuerbar, unbekannte Namen werden gemeldet statt
verschluckt (`server/services/ocr/index.ts:33-47`). Das ist die richtige Antwort
auf ein Freikontingent, das mitten im ersten echten Lauf endet.

**Der Vertragstest gegen die echte Routing-Tabelle**
(`server/__tests__/apiContract.spec.ts:16-45`). Er prüft jeden Pfad aus
`client/lib/apiPaths.ts` gegen den tatsächlich gebauten Router-Stack. Läuft in
3 ms, ohne Netz, ohne DB, und hätte den 404 gefunden, der das Veröffentlichen
komplett kaputt gemacht hatte. Diese Bauart ist übertragbar — siehe 2.3.

**Die Startvalidierung.** `validateEnvironment()` (`server/node-build.ts:17-72`)
trennt sauber zwischen „ohne das startet nichts" und „das fehlt, ein Feature
ruht". Ein halb konfigurierter Prozess fällt beim Deploy auf, nicht beim Wirt.

### 2.2 Was zum Problem wird

Sortiert nach dem, was am ehesten wehtut.

#### 2.2.1 Async-Handler ohne `try/catch` unter Express 4 — der Prozess stirbt

Express 4 leitet abgelehnte Promises aus Handlern **nicht** an eine
Fehler-Middleware weiter; das ist eine Neuerung von Express 5
([expressjs.com, Migration 4→5](https://expressjs.com/en/guide/migrating-5.html):
„Request middleware and handlers that return rejected promises are now handled by
forwarding the rejected value as an `Error` to the error handling middleware").

Wir laufen auf Express 4.22.1 (`package.json:38`), und in `server/maitr/routes.ts`
gibt es genau **einen** `try`-Block (Zeile 175, im OAuth-Callback). Sechs
async-Handler haben keinen: Zeilen 25, 45, 61, 83, 115, 147. Jeder davon
`await`et Prisma.

Es gibt außerdem keine Fehler-Middleware (`(err, req, res, next)`) und keinen
`process.on("unhandledRejection")` im ganzen Serverbaum (repoweite Suche, keine
Treffer).

Gemessen, mit dem installierten Express und dem installierten Node:

```
express 4.22.1
Prozess endet mit Code 1
Error: DB weg
    at Layer.handle [as handle_request] (…/express/lib/router/layer.js:95:5)
Node.js v22.21.1
```

Der Client bekam keine Antwort, weil der Prozess vorher endete. Eine einzelne
abgelehnte Prisma-Abfrage in `GET /api/maitr/venues` beendet also die gesamte
Railway-Instanz und reißt alle gleichzeitigen Anfragen mit. Kein Datenverlust,
aber ein Neustart bei jedem DB-Schluckauf.

Das ist kein hypothetisches Risiko: `server/maitr/sync.ts:136` fragt dieselbe
Datenbank ab, und der Zeitgeber ist genau für den Fall gebaut, dass Tabellen
fehlen (`server/maitr/scheduler.ts:46-50`) — dort ist der Fehler gefangen, in den
Routen nicht.

#### 2.2.2 Vier Zustände liegen im Prozessspeicher

| Was | Wo | Folge bei zwei Instanzen |
|---|---|---|
| Aufträge der Speisekarten-Erkennung | `server/services/menuJobs.ts:46` (`Map`) | Der `GET` landet womöglich auf der Instanz ohne den Auftrag → „nicht gefunden", obwohl er läuft |
| Verbrauchte OAuth-`state`-Nonces | `server/maitr/security.ts:66` | Replay-Schutz fällt aus: derselbe signierte `state` ist auf der zweiten Instanz noch einlösbar |
| Refresh-Sperre je Verbindung | `server/maitr/sync.ts:24` | Zwei gleichzeitige Google-Refreshes; einer der beiden Tokens wird überschrieben |
| Rate-Limiting | `server/middleware/rateLimit.ts` (Default-Store) | Das Limit vervielfacht sich mit der Instanzzahl |

Der letzte Punkt ist vom Hersteller so dokumentiert: der Standardspeicher „does
not share state when app has multiple processes or servers"
([express-rate-limit, Stores](https://express-rate-limit.mintlify.app/reference/stores)).

Drei dieser vier Stellen sind im Code offen als Einschränkung benannt
(`menuJobs.ts:12-18`, `security.ts:62-65`, `scheduler.ts:20-24`). Das ist
ehrlich und für **eine** Instanz auch die richtige Wahl — eine Tabelle für
Aufträge, die 15 Minuten leben, wäre heute Ballast. Der Punkt ist nur: sobald
jemand in Railway die Replikatzahl von 1 auf 2 stellt, brechen vier Dinge
gleichzeitig und lautlos. Railway unterstützt das ausdrücklich per Klick im
Service-Setting ([docs.railway.com, Scaling](https://docs.railway.com/reference/scaling)).
Es braucht also nur eine gut gemeinte Handlung im Dashboard.

#### 2.2.3 Der Zeitgeber gehört nicht in den Webprozess

`startMaitrScheduler()` (`server/maitr/scheduler.ts:60-82`) setzt ein
`setInterval` im API-Prozess, standardmäßig aus, aktiv nur mit
`MAITR_SYNC_INTERVAL_MINUTES`. Der Kommentar (`:20-24`) beschreibt das Problem
korrekt: bei mehreren Instanzen tickt er in jeder, und die prozessinterne Sperre
(`:33`) hilft nicht über Prozessgrenzen.

Railway hat dafür einen eigenen Mechanismus: eine Cron-Zeitplanung im
Service-Setting, die den Startbefehl nach Crontab-Ausdruck ausführt; kürzeste
Taktung 5 Minuten, und läuft eine Ausführung noch, wird die nächste übersprungen
([docs.railway.com, Cron Jobs](https://docs.railway.com/reference/cron-jobs)).
Unsere Mindesttaktung ist bereits 5 Minuten (`scheduler.ts:29`) — die beiden
passen also exakt zusammen. Der Grund im Kommentar („es gibt im Projekt keine
Cron-Infrastruktur", `:16-18`) stimmt für den Code, aber nicht für die Plattform,
auf der er läuft.

Zusätzlich: `syncAll()` läuft die aktiven Verbindungen **seriell** durch
(`server/maitr/sync.ts:139-151`), jede mit zwei Netzabrufen und je einem
`upsert` pro Bewertung (`:91-105`). Bei zehn Betrieben ist das unerheblich, bei
hundert ist es ein Lauf, der die nächste Taktung überholt — dann greift die
Sperre und Läufe fallen aus (`scheduler.ts:36-39`).

#### 2.2.4 `prisma/migrations` ist keine gültige Prisma-Historie

Prisma erwartet unter `prisma/migrations` Ordner der Form `YYYYMMDDhhmmss_name`
mit je einer `migration.sql`, dazu eine `migration_lock.toml`, die
mitversioniert wird, und die Tabelle `_prisma_migrations` in der Datenbank
([prisma.io, Migration histories](https://www.prisma.io/docs/orm/prisma-migrate/understanding-prisma-migrate/migration-histories)).

Vorhanden ist:

- `prisma/migrations/20260129_add_menu_item_highlight.sql` — lose Datei, kein Ordner
- `prisma/migrations/add_configuration_table/migration.sql` — Ordner ohne Zeitstempel
- `prisma/migrations/20260803_add_maitr_channel_models/migration.sql` (+ `rollback.sql`) — 8-stelliger Zeitstempel statt 14
- **keine** `migration_lock.toml`

`prisma migrate deploy` läuft damit nicht. Die Datei sagt das selbst
(`prisma/migrations/20260803_add_maitr_channel_models/migration.sql:17-21`), und
Commit `0344b2b` bestätigt es: die Migration wurde mit `prisma db execute`
von Hand eingespielt und danach mit `prisma migrate diff` gegengeprüft.

Das Vorgehen war für diesen einen Fall sorgfältig — geprüft vorher, geprüft
nachher, Rückweg daneben. Als Dauerzustand ist es das nicht: Es gibt keine
Instanz, die weiß, welche Migrationen auf Produktion angewandt sind. Der Beweis,
dass Schema und Datenbank übereinstimmen, ist ein Commit-Text, kein Zustand in
der Datenbank. Bei der nächsten Änderung, die nicht rein additiv ist, gibt es
weder eine Reihenfolge noch eine Prüfung.

Weder CI noch Build noch `postinstall` (`package.json:20`, nur `prisma generate`)
wenden Migrationen an. Das ist konsequent, macht aber sichtbar, dass der
Datenbankstand ausschließlich von Hand geführt wird.

#### 2.2.5 Beobachtbarkeit: es gibt keine

Repoweite Suche nach `pino`, `winston`, `Sentry`, `opentelemetry`, `prom-client`:
**kein Treffer**, weder im Code noch in `package.json`.

Was es stattdessen gibt:

- 243 `console.*`-Aufrufe in `server/` — unstrukturierter Text, teils mit Emoji
  (`server/routes/n8nProxy.ts:17,28,37`). In Railways Log-Ansicht durchsuchbar,
  aber nicht auswertbar: keine Anfrage-Kennung, keine Nutzer-Kennung, kein
  einheitliches Feldformat. Zwei Anfragen, die sich überlappen, sind im Protokoll
  nicht auseinanderzuhalten.
- Kein Zugriffsprotokoll (kein `morgan` o. ä.).
- Keine Fehlersammlung. Ein 500er in Produktion hinterlässt eine Zeile im
  Railway-Log und sonst nichts. Niemand erfährt davon, außer der Wirt ruft an.
- Kein Health-Endpunkt, der etwas prüft. `GET /api/ping` gibt eine Konstante
  zurück (`server/routes/index.ts:223-226`) und sagt nichts über die
  Datenbankverbindung. `/api/media/health` und `/api/menu/health` melden nur, ob
  Umgebungsvariablen gesetzt sind (`server/routes/media.ts:35-44`,
  `server/routes/menu.ts:69-75`).
- `server/node-build.ts:80` behandelt `/health` als API-Pfad und antwortet mit
  404 — die Route existiert nicht.

Immerhin: `AuditLog` (`prisma/schema.prisma:631`) mit `createAuditLogger`
(`server/utils/audit.ts:15-35`) protokolliert fachliche Vorgänge in der
Datenbank. Das ist wertvoll für Nachvollziehbarkeit, ersetzt aber keine
technische Beobachtbarkeit.

Bei zehnfacher Nutzerzahl heißt das: Fehler werden nicht bemerkt, sondern
gemeldet. Das ist genau das Gegenteil dessen, was ein Produkt für Leute braucht,
die keine Zeit haben, Fehler zu melden.

#### 2.2.6 Der Kernvertrag hat Löcher, und niemand merkt es

`packages/core/src/api/index.ts` definiert zehn Endpunkt-Aufrufe. Vier davon
haben in der Routing-Tabelle **keine** Entsprechung:

| Aufruf im Kernpaket | Erwarteter Pfad | Vorhanden? |
|---|---|---|
| `briefing.approveTask` (`:16`) | `POST /briefing/tasks/:id/approve` | nein |
| `briefing.updateDraft` (`:21`) | `PATCH /briefing/tasks/:id` | nein |
| `reservations.walkIn` (`:46`) | `POST /reservations/walk-in` | nein |
| `reservations.cancel` (`:50`) | `DELETE /reservations/:id` | nein |

Der Server hat unter `/api/maitr` genau acht Routen (ausgelesen aus der
Routing-Tabelle), darunter keine dieser vier. `server/maitr/routes.ts` enthält
weder „approve" noch „walk-in" noch ein `delete`.

`approveTask` ist dabei nicht irgendein Aufruf — es ist die Handlung, um die das
ganze Produkt gebaut ist: der Wirt gibt eine vorbereitete Antwort frei. Sie ist
im Vertrag beschrieben und serverseitig nicht vorhanden.

Der Vertragstest greift hier nicht: `server/__tests__/apiContract.spec.ts:17`
prüft ausschließlich `client/lib/apiPaths.ts`, also den Web-Baukasten. Für
`packages/core/src/api` gibt es kein Gegenstück.

Dazu passt: der Meta-Webhook nimmt Ereignisse an, prüft die Signatur korrekt und
tut dann nichts. `server/maitr/index.ts:52` steht als Kommentar da, wo das
Einreihen zum Pull hingehörte.

#### 2.2.7 Zwei Identitäten, eine Schranke

Die Web-Seite authentifiziert über Clerk (`server/middleware/auth.ts:33`), und
`requireAuth` kennt nur Clerk-Tokens. Die Mobile-App bringt einen
Platzhalter-Adapter mit, der ein Token aus AsyncStorage liest
(`mobile/src/lib/auth.ts:14-19`); der Kommentar sagt offen, dass die Entscheidung
„Clerk Expo vs. Supabase Auth" noch offen ist (`:9-12`). `persistSession`
(`:41`) wird nirgends aufgerufen — im gesamten `mobile/`-Baum gibt es keinen
Aufruf.

`mobile/eas.json:23` zeigt die App auf `https://maitr.de/api/maitr`. Zusammen
heißt das: Der Produktionsbuild der App würde jede geschützte Route ohne Token
aufrufen und 401 bekommen. Der Maitr-Zweig ist serverseitig fertig und für die
App zurzeit nicht erreichbar.

Zusätzlich läuft die App über den Netlify-Rewrite (`netlify.toml:74-79`), also
über den 26-Sekunden-Proxy und einen zusätzlichen Netzsprung, statt direkt gegen
Railway. Für kurze JSON-Antworten ist das unerheblich, für alles Längere nicht.

#### 2.2.8 Kleinere, aber belegte Punkte

- **IPv6-Umgehung im Site-Limiter.** Der eigene `keyGenerator` in
  `server/index.ts:35-38` streift Klammern von der IP ab. `express-rate-limit`
  8.2.1 meldet dazu beim Start `ValidationError … ERR_ERL_KEY_GEN_IPV6:
  „Custom keyGenerator appears to use request IP without calling the
  ipKeyGenerator helper function for IPv6 addresses. This could allow IPv6 users
  to bypass limits."` (reproduzierbar bei jedem Serverstart und in
  `npx vitest run server/__tests__/apiContract.spec.ts`). Die Bibliothek verlangt
  `ipKeyGenerator(req.ip)`, damit IPv6-Adressen auf ihr Subnetz zusammengefasst
  werden; ohne das kann ein Nutzer mit IPv6-Präfix durch Adresswechsel beliebig
  weiterprobieren ([express-rate-limit, Error Codes](https://express-rate-limit.mintlify.app/reference/error-codes)).
  Der Kommentar im Code (`server/index.ts:34`) hält den Fall für erledigt — er
  ist es nicht.
- **Clerk-SDK außerhalb des Supports.** Wir nutzen `@clerk/clerk-sdk-node`
  (`server/utils/clerk.ts:1`, `package.json:26`). Beim Import gibt das Paket
  selbst aus, es sei in einer Kündigungsfrist. Clerk nennt als Nachfolger
  `@clerk/express` und als Ende des Supports den 8. Januar 2025
  ([clerk.com Changelog](https://clerk.com/changelog/2024-10-08-express-sdk)).
  Das liegt gut 19 Monate zurück. Für die Komponente, an der die gesamte
  Authentifizierung hängt, ist das der unangenehmste Einzelbefund dieser Liste.
- **Vier ungenutzte Abhängigkeiten** mit Datenbank-Bezug (1.1) und ein
  auskommentierter Stripe-Zweig, der 14 der 51 Server-Typfehler stellt.
- **Demo-Daten im Produktionsrouter.** `/api/demo/dashboard/*` liefert
  `Math.random()`-Umsätze aus dem Hauptprozess (`server/routes/index.ts:52-68`),
  ohne Auth, ohne Kennzeichnung in der Antwort.
- **CSP im Backend abgeschaltet** (`server/index.ts:77`), während Netlify für die
  Auslieferung eine ausführliche CSP setzt (`netlify.toml:26`). Für eine reine
  JSON-API ist das vertretbar, sollte aber eine bewusste Entscheidung bleiben
  und nicht in dem Moment vergessen werden, in dem der Railway-Prozess wieder
  HTML ausliefert — was er tut (`server/node-build.ts:75-85`).

### 2.3 Was ich als Nächstes ändern würde

Sortiert nach Nutzen je Aufwand. Alle drei folgen aus diesem Code, nicht aus
einer Technologiepräferenz.

---

**1. Async-Fehler auffangen: Wrapper + Fehler-Middleware + Prozesswächter**
*Nutzen: hoch. Aufwand: 2–3 Stunden.*

Warum zuerst: Es ist der einzige Befund, bei dem ein einzelner, gewöhnlicher
Fehler (DB kurz weg) den gesamten Dienst beendet — belegt durch die Messung in
2.2.1, nicht vermutet. Und es ist der billigste Befund der Liste.

Was konkret:
- Ein `asyncHandler(fn)` in `server/maitr/` (fünf Zeilen), um die sechs Handler
  in `server/maitr/routes.ts` (Zeilen 25, 45, 61, 83, 115, 147). Alternativ ein
  `router.use` mit `Promise.resolve(fn(...)).catch(next)`.
- Eine Fehler-Middleware `(err, req, res, next)` als letztes in
  `createServer()` (`server/index.ts:148`), die 500 mit einer neutralen Meldung
  antwortet und den Fehler protokolliert.
- `process.on("unhandledRejection")` in `server/node-build.ts`, das protokolliert
  statt zu beenden — als Netz für alles, was durchrutscht.

Warum nicht gleich auf Express 5 gehen: Express 5 löst genau dieses Problem an
der Wurzel ([Migrationsleitfaden](https://expressjs.com/en/guide/migrating-5.html)),
zieht aber Änderungen an Routing-Mustern, `req.query` und Middleware-Verhalten
nach sich — bei 105 Routen und 122 offenen Typfehlern ist das kein Nebenbei.
Es gehört auf die Liste, nicht an ihren Anfang.

---

**2. Beobachtbarkeit: strukturierte Logs, echter Health-Check, Fehlersammlung**
*Nutzen: hoch. Aufwand: 1 Tag für die ersten beiden Teile, plus Einrichtung für den dritten.*

Warum: Nach Punkt 1 stürzt der Prozess nicht mehr ab — dann muss man aber
erfahren, dass etwas schiefging. Heute erfährt es niemand (2.2.5). Für einen
Nutzer, der bei einem Fehler nicht anruft, sondern die App weglegt, ist das der
teuerste Zustand von allen.

Was konkret, in dieser Reihenfolge:
- **Anfrage-Kennung und ein Log-Format.** Eine schmale eigene Funktion genügt
  zunächst: eine Zeile JSON je Anfrage mit Methode, Pfad, Status, Dauer,
  `userId`, Anfrage-ID. Die 243 `console.*`-Aufrufe kann man schrittweise
  nachziehen; wichtig ist zuerst, dass überhaupt jede Anfrage eine Zeile hat.
- **`GET /api/health`, der die Datenbank anfasst** — `SELECT 1` über Prisma,
  mit Zeitgrenze. Heute gibt es keinen Endpunkt, der beantwortet, ob der Dienst
  arbeitsfähig ist (`server/routes/index.ts:223-226`). Nebenbei verschwindet der
  tote `/health`-Zweig in `server/node-build.ts:80`.
- **Fehlersammlung** (Sentry o. ä.), angebunden an die Fehler-Middleware aus
  Punkt 1. Erst danach, weil sie ohne diese Middleware nur die Hälfte sieht.

Keine Metrik-Infrastruktur, kein OpenTelemetry: Bei einem Prozess und dieser
Nutzerzahl wäre das Aufwand ohne Erkenntnisgewinn.

---

**3. Den Maitr-Vertrag schließen und absichern**
*Nutzen: hoch, aber später wirksam. Aufwand: 2–3 Tage für die vier Endpunkte, 2 Stunden für den Test.*

Warum: Der Maitr-Zweig ist der Teil, der das Produktversprechen einlöst, und er
ist sauber gebaut (2.1). Aber vier von zehn Vertragsfunktionen haben keine Route
(2.2.6), darunter `approveTask` — die eine Handlung, die der Wirt überhaupt
ausführt. Solange die fehlt, ist das Backend fertig für alles außer für den Zweck.

Was konkret:
- Den Vertragstest aus `server/__tests__/apiContract.spec.ts` auf
  `packages/core/src/api` erweitern (**zuerst**, er kostet zwei Stunden und
  macht die Lücke dauerhaft sichtbar statt einmalig).
- Die vier fehlenden Routen bauen: `POST /briefing/tasks/:id/approve`,
  `PATCH /briefing/tasks/:id`, `POST /reservations/walk-in`,
  `DELETE /reservations/:id`. Voraussetzung: ein Modell für Aufgaben — heute
  entstehen `DailyTask`s nur berechnet in `server/maitr/briefing.ts`, es gibt
  keine Tabelle, an der eine Freigabe hängen könnte. Das ist der eigentliche
  Aufwand, nicht das Routing.
- Den leeren Meta-Webhook füllen (`server/maitr/index.ts:52`).

**Nicht** in dieser Reihenfolge, obwohl naheliegend: den Zeitgeber auf Railway-Cron
umstellen (2.2.3) und die vier In-Memory-Zustände verlagern (2.2.2). Beides ist
richtig, aber beides wird erst wirksam, wenn es eine zweite Instanz gibt — und
die gibt es nicht. Was ich stattdessen sofort täte, weil es Minuten kostet: einen
Satz in `docs/deployment/` und einen Kommentar an der Replikat-Einstellung, dass
das Hochsetzen der Replikatzahl vier Dinge gleichzeitig bricht. Eine Warnung an
der Stelle, an der der Fehler passiert, ist hier mehr wert als eine Umbauaktion
auf Vorrat.

Ebenfalls nicht auf die Liste, aber terminiert gehörend: der Wechsel von
`@clerk/clerk-sdk-node` auf `@clerk/express` (2.2.8). Kein aktuelles Problem,
aber ein Paket ohne Support unter der gesamten Authentifizierung ist nichts, was
man vergessen darf.

---

## 3. Was für diese Größe genügt

Damit die Liste oben nicht falsch gelesen wird — Folgendes ist bewusst einfach
und soll so bleiben:

- **Ein Prozess, ein Express, ein Prisma-Client.** Keine Warteschlange, kein
  Redis, kein Message-Bus. Bei einem Betrieb pro Wirt und einem Dashboard-Aufruf
  pro Tag wäre alles davon Ballast.
- **Der In-Memory-Auftragsspeicher für die Speisekarte**
  (`server/services/menuJobs.ts`). Aufträge leben 15 Minuten
  (`:37`), sind nutzergebunden (`:123-128`) und begrenzt (`:44`). Eine Tabelle
  dafür wäre heute reiner Aufwand — die Einschränkung ist an Ort und Stelle
  notiert.
- **Supabase Storage über die rohe REST-API statt über das SDK**
  (`server/services/supabaseStorage.ts:1-12`). Drei Operationen, `fetch` reicht,
  das Bundle bleibt klein.
- **Krypto mit Node-`crypto` statt einer Bibliothek**
  (`server/maitr/security.ts:1-10`). Weniger Fläche, und AES-256-GCM ist
  Standardkost.
- **Kein Cron-Paket für einen Zeitgeber.** Die Begründung in
  `server/maitr/scheduler.ts:16-18` stimmt — nur ist Railway-Cron die bessere
  Lösung als beide Alternativen, sobald es eine zweite Instanz gibt.
- **`typecheck` informativ statt blockierend** (`.github/workflows/ci.yml:74`).
  Bei 122 Altfehlern wäre ein blockierender Job nur ein Job, den alle
  überspringen. Der Weg — Zahl senken, dann scharfstellen — ist richtig. Nur
  wächst die Zahl gerade (98 → 122 in einer Woche), und ohne eine Regel „keine
  neuen Fehler" wird sie das weiter tun.

---

## 4. Was ich nicht prüfen konnte

- **Railway-Konfiguration.** Bau- und Startbefehl, Replikatzahl, gesetzte
  Umgebungsvariablen, ob ein Cron eingerichtet ist: nichts davon liegt im Repo.
  Alle Aussagen zur Instanzzahl in diesem Dokument sind Bedingungssätze
  („bei mehreren Instanzen …"), keine Feststellungen über den Live-Zustand.
- **Ob der Maitr-Zweig in Produktion läuft.** Er ist im Code gemountet
  (`server/routes/index.ts:196`), aber ob die neun `MAITR_*`-Variablen auf
  Railway gesetzt sind, kann ich von hier nicht sehen. Ohne sie antworten die
  OAuth-Routen mit einem Fehler (`server/maitr/env.ts:33-36`), der Rest läuft.
- **Ob die Migration wirklich auf Produktion liegt.** Commit `0344b2b`
  dokumentiert es sorgfältig; ich habe die Datenbank nicht angefasst.
- **Laufzeitverhalten unter Last.** Keine Messung, keine Zahl. Die Aussagen zur
  Skalierung in 2.1 sind Argumente aus der Codeform, keine Lastmessung.
- **Ob `syncAll` je gegen echte Google-/Meta-Konten gelaufen ist.** Der
  Zeitgeber ist standardmäßig aus (`server/maitr/scheduler.ts:62`), und
  `server/__tests__/maitrScheduler.spec.ts` prüft den Zeitgeber, nicht die
  Anbindung.
- **Testabdeckung in Zahlen.** Es gibt 25 Testdateien im Repo, davon 12 unter
  `server/__tests__/`. Für `packages/core/` habe ich keine gefunden — also keine
  Tests für die Analytik, die laut Entwurf die einzige Quelle der Kennzahlen ist.
  Eine Abdeckungsmessung habe ich nicht gemacht (das hieße voller Testlauf).

---

## 5. Gegenprobe (unabhängig nachgemessen, 2026-08-04)

Die Abschnitte 1–4 stammen aus einem früheren Durchlauf. Ich habe die tragenden
Aussagen unabhängig nachgemessen, statt den Bericht neu zu schreiben. Ergebnis:
Sie halten, mit zwei Korrekturen. Was ich zusätzlich gefunden habe, steht in 5.3.

### 5.1 Bestätigt

| Behauptung | Fundstelle im Bericht | Wie nachgeprüft | Ergebnis |
|---|---|---|---|
| Express 4 beendet bei abgelehntem Promise im Handler den Prozess | 2.2.1 | `node -e` mit dem installierten `express` aus `node_modules`, ein `async`-Handler, der wirft | `express 4.22.1` · `Prozess endet mit Code 1` · `Error: DB weg` · **keine HTTP-Antwort** |
| 122 Typfehler, 51 davon in `server/` | 1.2 | `npx tsc --noEmit`, Treffer gezählt | 122 gesamt: 66 `client`, 51 `server`, 5 `shared` — exakt |
| `ERR_ERL_KEY_GEN_IPV6` tritt wirklich auf | 2.2.8 | `npx vitest run server/__tests__/apiContract.spec.ts` | `ValidationError: Custom keyGenerator appears to use request IP without calling the ipKeyGenerator helper function for IPv6 addresses.` — reproduziert |
| `prisma/migrations` ist keine gültige Prisma-Historie | 2.2.4 | `ls prisma/migrations` | Keine `migration_lock.toml`; eine lose `.sql`, ein Ordner ohne Zeitstempel, ein Ordner mit 8-stelligem statt 14-stelligem Zeitstempel |
| Stripe-Webhook ist nirgends registriert | 1.3 | Repoweite Suche nach `handleStripeWebhook` | Nur zwei Treffer, beide in `server/webhooks/stripe.ts` (Definition Zeile 459, Default-Export Zeile 584) |
| Vier Vertragsfunktionen ohne Route | 2.2.6 | `packages/core/src/api/index.ts` gegen `server/maitr/routes.ts` gelesen | `approveTask:16`, `updateDraft:21`, `walkIn:46`, `cancel:50` — im Server-Router kommt keiner der vier Pfade vor |
| Rückstand bei Prisma und Express | 1.1 | `npm view prisma version` / `npm view express version` | `7.9.1` bzw. `5.2.1`, installiert sind 5.22.0 bzw. 4.22.1 |
| Railway-Cron passt zur Mindesttaktung | 2.2.3 | [docs.railway.com/reference/cron-jobs](https://docs.railway.com/reference/cron-jobs) abgerufen | „The shortest time between successive executions of a cron job cannot be less than 5 minutes"; überlappende Läufe werden übersprungen — deckt sich mit `scheduler.ts:29` |
| Replikate sind ein Klick im Dashboard | 2.2.2 | [docs.railway.com/reference/scaling](https://docs.railway.com/reference/scaling) abgerufen | Horizontale Skalierung ist eine Einstellung je Dienst; Anfragen werden zufällig auf die Replikate verteilt |
| Kein Roh-SQL im Serverquellcode | 1.1 | Suche nach `$queryRaw` / `$executeRaw` in `server/` | Null Treffer |

Zum Zeitgeber zusätzlich: `npx vitest run server/__tests__/maitrScheduler.spec.ts`
läuft grün (8 Tests). Der Test prüft die Taktung, die Überhol-Sperre und das
Überleben eines fehlgeschlagenen Laufs — nicht die Google-/Meta-Anbindung.

### 5.2 Korrekturen

1. **Größte Einzelquelle der Server-Typfehler ist nicht Stripe.** Der Bericht
   nennt in 1.2 `server/webhooks/stripe.ts` mit 14 Fehlern als größte Quelle.
   Gemessen führt `server/routes/configurations.ts` mit **18**, danach
   `stripe.ts` mit 14 und `server/routes/templates.ts` mit 11. Die Aussage in
   2.2.8, der Stripe-Zweig stelle „14 der 51 Server-Typfehler", stimmt; die
   Einordnung als größte Quelle nicht.
2. **`.env.example` beschreibt 12, nicht 11 der gelesenen Variablen.** Die Datei
   nennt 15 Namen; zwölf davon liest auch der Servercode (`DATABASE_URL`,
   `N8N_WEBHOOK_URL`, `NETLIFY_PAT`, `NETLIFY_SITE_ID`, `NODE_ENV`, `PORT`,
   `PUBLIC_BASE_DOMAIN`, `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`,
   `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_URL`, `VITE_SUPABASE_URL`). Drei sind
   rein clientseitig oder für den Netlify-Build. Der Befund bleibt: von 27
   serverseitig gelesenen Namen sind 15 nirgends in der Hauptvorlage erklärt,
   darunter `CLERK_SECRET_KEY`, ohne den der Prozess gar nicht startet.

### 5.3 Ergänzungen

- **Die Express-Typen beschreiben eine andere Hauptversion als die installierte.**
  `@types/express` ist **5.0.6**, `express` ist **4.22.1** (beide aus
  `node_modules` gelesen; `package.json:83` bzw. `package.json:38`). Die
  Typprüfung validiert damit gegen eine API, die zur Laufzeit nicht läuft. Das
  ist mit ein Grund, warum der Typecheck-Job überhaupt nur informativ sein kann,
  und es verdeckt genau den Unterschied, um den es in 2.2.1 geht: In der
  Typwelt reicht Express Promise-Ablehnungen weiter, in der laufenden Version
  nicht. Beim Umstieg auf Express 5 (2.3, Punkt 1) fällt dieser Punkt weg —
  bis dahin sollte man wissen, dass er da ist.
- **Transaktionen gibt es, aber nur an drei Stellen.** `prisma.$transaction`
  steht in `server/routes/users.ts:180`, `server/routes/webapps.ts:384` und
  `server/services/BusinessService.ts:48`. Alle übrigen mehrstufigen Schreibwege
  — etwa der Sync in `server/maitr/sync.ts:90-120`, der je Bewertung und je
  Reichweitenpunkt einzeln `upsert`t — laufen ohne. Für idempotente `upsert`s
  ist das vertretbar; für den Veröffentlichungsweg wäre es einen zweiten Blick
  wert. Ich habe nicht geprüft, ob dort ein Teilfehler tatsächlich einen
  halben Zustand hinterlässt.
- **`disconnectPrisma` wird nirgends aufgerufen.** Die Funktion steht in
  `server/db/prisma.ts:42-45`; repoweit gibt es keinen Aufrufer. Beim
  SIGTERM-Shutdown (`server/node-build.ts:100-107`) wird der Zeitgeber gestoppt
  und sofort `process.exit(0)` gerufen — offene Datenbankverbindungen werden
  nicht geordnet geschlossen. Auf Railway mit einer Instanz ist das folgenlos;
  es ist eine tote Funktion, die aussieht, als würde sie benutzt.
- **Der Neon-Zugang läuft über den Pooler, ohne Feineinstellung.** Die
  `DATABASE_URL` in der lokalen `.env` verweist auf einen `-pooler`-Host
  (geprüft, ohne den Wert auszugeben). Neon nennt `connection_limit`,
  `pool_timeout` und `connect_timeout` als optionale Stellschrauben, wenn es zu
  Zeitüberschreitungen im Verbindungspool kommt
  ([neon.com/docs/guides/prisma](https://neon.com/docs/guides/prisma)); gesetzt
  ist keine davon. Das ist kein Fehler — die Vorgabewerte reichen bei einem
  Prozess. Es ist der erste Hebel, falls unter Last Pool-Zeitüberschreitungen
  auftauchen, und deshalb hier notiert.

### 5.4 Was auch die Gegenprobe nicht prüfen konnte

Die Liste in Abschnitt 4 gilt unverändert. Ich habe die Produktionsdatenbank
nicht angefasst und kann daher weiterhin nicht sagen, ob `_prisma_migrations`
dort existiert oder welche Migrationen als angewandt vermerkt sind — das ist
der Kern von 2.2.4 und bleibt offen. Ebenso ungeprüft: die Railway-Einstellungen
(Replikatzahl, Cron, gesetzte Variablen), weil sie nicht im Repository liegen.
