# Was der Maitr-App zur Vollständigkeit fehlt

Erhebung vom 4. August 2026, Branch `chore/maitr-backend-und-sicherheitsfixes`.
Reine Bestandsaufnahme — an dieser Erhebung wurde kein Code geändert.

Jede Aussage unten ist an einer Datei und Zeile belegt. Wo ich etwas nicht
belegen konnte, steht das ausdrücklich dort, statt geschätzt zu werden.
Aufwandsangaben sind Schätzungen und als solche markiert; sie beruhen auf dem
gelesenen Umfang, nicht auf Erfahrungswerten aus diesem Projekt.

Ein Hinweis zur Haltbarkeit: Während der Erhebung wurde parallel an der
Schriftumstellung gearbeitet (`mobile/app.json`, `mobile/src/theme/fonts.ts`,
`mobile/src/theme/typography.ts`). Die Abschnitte **a7** und **c1** sind nach
dieser Änderung neu geprüft und tragen einen Zeitstempel. Alle übrigen
Abschnitte betreffen unveränderte Dateien.

---

## Das Lagebild in fünf Sätzen

Die App hat 39 Bildschirme (`mobile/app/`, ohne die beiden `_layout.tsx`) und
29 Feature-Screens (`mobile/src/features/`). Sie ist vollständig bedienbar,
typprüft fehlerfrei (`cd mobile && npx tsc --noEmit` läuft ohne Ausgabe durch)
und läuft ohne jeden Server.

Sie tut das, weil praktisch alles im Gerät stattfindet: **genau zwei
Netzwerkaufrufe** existieren in der gesamten App.

1. `api.briefing.today(venueId)` — `mobile/src/features/start/useDailyBriefing.ts:47`
2. `request("/users/me", { method: "DELETE" })` — `mobile/src/features/account/DeleteAccountScreen.tsx:92`

Alles andere — Reservierungen, Gäste, Bewertungen, Beiträge, Kanäle, Abo,
Speisekarte, Autopilot — läuft über `mobile/src/lib/store.tsx` (1128 Zeilen),
der sich in seinem eigenen Kopfkommentar (Zeile 20) als „Kein echtes Backend"
bezeichnet: In-Memory-Zustand, aus Design-Fixtures seed-befüllt, per
AsyncStorage über App-Starts hinweg gehalten.

Das Backend dagegen existiert und hängt: `apiRouter.use("/maitr", maitrRouter)`
in `server/routes/index.ts:196`. Es deckt aber nur einen Teil dessen ab, was der
Client-Vertrag verspricht, und die App ruft davon fast nichts auf.

---

# (a) Blockiert die Einreichung

## a1 — Die Anmeldung ist ein Schalter, kein Login

**Was fehlt.** `mobile/app/login.tsx:27-30`: alle drei Wege (Google, Apple,
E-Mail) rufen dieselbe Funktion `enter()` auf, die `signIn()` ausführt und zu
`/start` springt. `signIn` ist in `mobile/src/lib/store.tsx:558` definiert als
`setSignedIn(true)` — mehr passiert nicht. Es gibt keine Prüfung der E-Mail,
kein Passwort, keinen Token.

`mobile/src/lib/auth.ts` ist ein reiner AsyncStorage-Wrapper. Die Funktion
`persistSession(token, user)` (Zeile 41) ist der einzige Weg, einen Token
abzulegen — sie hat **null Aufrufer** in der App (`grep -rn "persistSession"
mobile/` findet nur die Definition und den Import in `DeleteAccountScreen.tsx`,
das sie nicht ruft). Der Token ist also immer `null`.

`mobile/package.json` enthält keine Clerk-Abhängigkeit — geprüft, die
Dependency-Liste umfasst 24 Pakete, kein `@clerk/*`.

**Warum das die Einreichung blockiert.** Zwei Gründe, unabhängig voneinander:

- Der Bildschirm behauptet unten (`login.tsx:95`) „Geschützt durch Clerk ·
  Magic Link & MFA". Nichts davon existiert. Eine App, deren Sicherheitszusage
  nachweislich nicht eingelöst wird, ist ein Review-Risiko und unabhängig davon
  eine falsche Angabe gegenüber dem Nutzer.
- Apple 2.1/4.2 „Minimum Functionality". Das steht als offene Entscheidung
  schon in `docs/deployment/APP_STORE_SUBMISSION.md:46-51`: entweder ehrlich
  als eigenständige Offline-App positionieren *und* die Zahlungs-/Clerk-Texte
  entschärfen, oder echt anbinden.

**Was zu tun ist.** Das Backend erwartet Clerk-Bearer-Token:
`server/middleware/auth.ts:24-25` liest `Authorization: Bearer …`,
`verifyClerkToken(token)` (Zeile 36) prüft ihn, `getOrCreateUser` legt bei
Bedarf den Prisma-Nutzer an. Ein Supabase-Token würde dort scheitern. Damit ist
die in `mobile/src/lib/auth.ts:10-12` offen gelassene Frage („Clerk Expo vs.
Supabase Auth") faktisch entschieden — wer Supabase wählt, muss zusätzlich die
Server-Middleware umbauen.

Konkret: `@clerk/clerk-expo` einbinden, `ClerkProvider` in
`mobile/app/_layout.tsx`, `login.tsx` auf echte Clerk-Screens umstellen,
`mobileAuthAdapter.getToken` auf Clerks `getToken()` umhängen (die
Adapter-Grenze dafür existiert bereits — `mobile/src/lib/bootstrap.ts:20`
reicht genau diese Funktion in den Core).
`EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY` ist in `mobile/src/lib/env.ts:18` und
`mobile/.env.example` bereits vorgesehen, aber nirgends gelesen.

**Aufwand (Schätzung).** 2–4 Tage. Der Adapter ist vorbereitet, die Arbeit
liegt in den Login-/Signup-Flüssen, Apple Sign-In (Pflicht, sobald Google
Sign-In angeboten wird) und dem Zusammenspiel mit der Onboarding-Journey.

**Wer.** Code. Braucht vorher aber vom Nutzer: ein Clerk-Projekt mit
konfigurierten Anbietern (siehe Abhakliste).

---

## a2 — Der Abo-Bildschirm zeigt Preise, kassiert aber nicht

**Was fehlt.** `mobile/src/features/account/AbonnementScreen.tsx` listet drei
Pläne mit „0 €" (Zeile 30), „29 €" (Zeile 37), „59 €" (Zeile 50). Der Button
ruft `choose(plan)` → `setPlan(plan.id)` (Zeile 80), was ausschließlich lokalen
Zustand setzt. Unter den Karten steht (Zeile 106): „Jederzeit kündbar ·
Abrechnung über Clerk & Stripe". Es gibt keinen Zahlungsanbieter in der App:
`mobile/package.json` enthält weder `expo-in-app-purchases` noch
`react-native-iap` noch ein Stripe-SDK.

**Wo es sichtbar wird.** Tab „Konto" → „Abo".

**Warum das blockiert.** Ein Bildschirm, der Preise und einen Abrechnungspartner
nennt und auf Knopfdruck den Plan wechselt, ohne dass irgendwo eine Zahlung
stattfindet, ist im Review schwer zu erklären. Zwei Wege stehen offen, und die
Entscheidung ist keine technische:

- **Preise raus.** Der Bildschirm wird zur Funktionsübersicht ohne Beträge und
  ohne „Abrechnung über …". Kleinste Änderung, kein Review-Risiko aus 3.1.1.
- **Echte Zahlung.** Digitale Abos in einer iOS-App müssen grundsätzlich über
  In-App-Purchase laufen. Ob Maitr als reines Geschäftskunden-Werkzeug unter
  eine der Ausnahmen fällt, kann ich nicht beurteilen — das ist eine Frage an
  Apples Richtlinien in ihrer aktuellen Fassung, nicht an den Code.

Ergänzend belegt: `mobile/src/features/account/DeleteAccountScreen.tsx:170-173`
hält fest, dass die Stripe-Kündigung serverseitig bis heute ein TODO in
`server/routes/subscriptions.ts` ist.

**Aufwand (Schätzung).** Variante „Preise raus": 1–2 Stunden. Variante „echte
Zahlung": Wochen, und der größere Teil davon ist nicht Code.

**Wer.** Die Entscheidung: nur der Nutzer. Die Umsetzung: Code.

---

## a3 — Store-Screenshots haben die falsche Auflösung

**Was fehlt.** `docs/store/SCREENSHOTS.md:9-24` dokumentiert sechs vorhandene
Bilder in 1206 × 2622 px (iPhone 16 Pro, 6,3") und stellt fest, dass der App
Store mindestens ein 6,7"-Set verlangt (1290 × 2796 oder 1320 × 2868 px). Die
Dateien liegen in `docs/store/screenshots/01-start.png` … `06-konto.png`.

Zusätzlich hält dasselbe Dokument (Zeile 53-58) fest, dass `01-start.png` ohne
laufendes Backend den sichtbaren Hinweis „Beispieldaten · API nicht verbunden"
trägt — belegt in `mobile/src/features/start/StartScreen.tsx:198-201`. Das
erste Bild des Sets zeigt also, dass keine Daten da sind.

**Aufwand (Schätzung).** Ein halber Tag, wenn das Backend läuft. Die Aufnahme
selbst ist trivial (`xcrun simctl io … screenshot`); der Engpass ist die
manuelle Navigation zwischen den Bildern — `SCREENSHOTS.md:119` stellt fest,
dass es dafür ohne Maestro/Detox keine Automatisierung gibt.

**Wer.** Code kann das Skript liefern; die Bildauswahl und das manuelle Tippen
im Simulator kann nur ein Mensch.

---

## a4 — Pflichtangaben in `app.json` und `eas.json` fehlen

Geprüft gegen die vorhandenen Dateien:

| Angabe | Status | Beleg |
|---|---|---|
| `extra.eas.projectId` | **fehlt** | `mobile/app.json` — kein `extra`-Block vorhanden |
| `owner` | **fehlt** | `mobile/app.json` — nicht gesetzt |
| `runtimeVersion` | fehlt | `mobile/app.json` — siehe Hinweis unten |
| `updates` | fehlt | `mobile/app.json` — siehe Hinweis unten |
| `submit.production` | **leer** (`{}`) | `mobile/eas.json` |
| `version` / `buildNumber` / `versionCode` | vorhanden | `app.json`: 1.0.0 / 1 / 1 |
| `ITSAppUsesNonExemptEncryption: false` | vorhanden | `app.json`, `ios.infoPlist` |
| `android.permissions: []` | vorhanden | `app.json` |
| Icon 1024×1024 ohne Alpha | **bestätigt** | `sips` auf `mobile/assets/icon.png`: 1024×1024, `hasAlpha: no` |

`projectId` und `owner` schreibt `eas init` selbst — das ist kein Handgriff im
Editor, sondern Folge des Kontos (siehe Abhakliste). So dokumentiert es auch
`docs/deployment/APP_STORE_SUBMISSION.md:27`.

`runtimeVersion` und `updates` sind **kein Blocker**: `mobile/package.json`
enthält kein `expo-updates`. Ohne OTA-Updates braucht es die Felder nicht. Sie
fehlen also nicht versehentlich, sondern konsequent. Wer OTA will, holt sich
beides zusammen ins Haus.

`submit.production: {}` ist für iOS ausreichend (Apple-ID und ASC-App-ID kann
`eas submit` interaktiv erfragen). Für Android braucht es dort den Pfad zum
Service-Account-JSON, sonst schlägt `eas submit -p android` fehl.

**Aufwand.** Minuten, sobald die Konten existieren.

**Wer.** Nur der Nutzer (Konten), danach Code/CLI.

---

## a5 — Der Demo-Einstieg ist im Produktivpfad verlinkt

**Was fehlt.** `mobile/src/features/account/AccountScreen.tsx:272-278` zeigt im
Tab „Konto" einen Button „Alle Screens · Demo", der auf `/demo` führt.
`mobile/app/demo.tsx:85` beschreibt sich selbst: „Kein Produkt-Screen, sondern
der Einstieg zum Vorführen".

**Warum das zählt.** Ein sichtbares Entwickler-/Vorführ-Verzeichnis im
ausgelieferten Build ist ein klassischer Anlass für Rückfragen im Review. Es
führt außerdem an jeder Navigationslogik vorbei in Bildschirme, die im
normalen Fluss unerreichbar sind.

**Aufwand.** Eine Stunde (hinter eine `__DEV__`-Bedingung legen oder entfernen).

**Wer.** Code.

---

## a6 — Datenschutzerklärung und Nutzungsbedingungen für die App

**Was existiert.**
- `docs/legal/PRIVACY.md` — 51 Zeilen, ausdrücklich als **Entwurf**
  gekennzeichnet (Zeile 3-5), mit Platzhaltern: „[Betreiber / Anschrift /
  Kontakt-E-Mail einsetzen]" (Zeile 7) und „[E-Mail einsetzen]" (Zeile 45).
  Nicht gehostet.
- Website-Seiten unter `/impressum`, `/datenschutz`, `/agb`
  (`client/App.tsx:126-128`). Diese beschreiben den Web-Dienst; ob sie den
  App-Betrieb mit abdecken, kann ich nicht beurteilen — das ist eine
  juristische Frage, keine Code-Frage.

**Was fehlt.**
- **Nutzungsbedingungen für die App gibt es nicht.** `client/pages/AGB.tsx`
  existiert für die Website; ein App-Pendant ist nirgends im Repo.
- **In der App steht kein einziger Rechtstext und kein Link darauf.** Belegt:
  `grep -rn -i "datenschutz\|nutzungsbedingung\|impressum\|agb\|privacy\|terms"
  mobile/src mobile/app` liefert **null Treffer**.
- Die Datenschutz-URL ist Pflichtfeld in App Store Connect und in der Play
  Console. Ohne öffentlich erreichbare, stabile URL geht die Einreichung nicht
  ab.

**Consent-Dialog.** Nach dem Code-Stand **nicht nötig**: kein
Analytics-/Tracking-SDK in `mobile/package.json`, keine Werbe-IDs, kein
`expo-tracking-transparency`. `mobile/src/lib/analytics.ts` ist trotz des
Namens keine Telemetrie — der Dateikopf (Zeile 2) beschreibt es als „Brücke
zwischen Demo-Store und der reinen Auswertungsschicht `@maitr/core/analytics`",
also eine reine Rechenschicht ohne Netzwerkverkehr. Das ändert sich, sobald ein
Analytics-SDK dazukommt.

**Berechtigungen.** `app.json` fordert **keine** an: `android.permissions: []`,
und `ios.infoPlist` enthält nur `ITSAppUsesNonExemptEncryption`. Es gibt auch
keinen Grund für eine Begründung — geprüft mit
`grep -rn "expo-camera\|expo-image-picker\|expo-location\|expo-notifications\|expo-contacts\|expo-media-library\|expo-tracking-transparency"`
über `mobile/package.json`, `mobile/src`, `mobile/app`: **null Treffer**. Es
fehlt also kein `NSCameraUsageDescription` — es wird keins gebraucht. Das ist
so beabsichtigt und in `docs/deployment/APP_STORE_SUBMISSION.md:17-18`
dokumentiert.

Nebenwirkung, die man wissen sollte: Ohne Kamera und Fotomediathek kann der
Betrieb **keine eigenen Bilder** in die App bringen. Siehe c3.

**Aufwand (Schätzung).** Entwurf finalisieren und hosten: ein Tag Code/Redaktion
plus juristische Prüfung, deren Dauer ich nicht einschätzen kann. Nutzungs-
bedingungen für die App: neu zu schreiben, ohne Vorlage im Repo.

**Wer.** Hosting und Verlinkung: Code. Inhalt und Freigabe: Nutzer bzw. Anwalt.

---

## a7 — Die Markenschrift wird per `require()` geladen, liegt aber nicht im Repo

*Dieser Abschnitt beschreibt einen Stand, der sich während der Erhebung
geändert hat: Die Schriftumstellung wurde parallel eingebaut. Nachgeprüft am
4. August 2026, nach der Änderung. Prüfbefehl steht unten — er dauert eine
Sekunde.*

Die Lizenzfrage aus `docs/deployment/APP_STORE_SUBMISSION.md:42-45` (PP Frama,
kommerziell) ist erledigt: Die Markenschrift ist jetzt Bricolage Grotesque +
Familjen Grotesk Italic, beide SIL OFL. `.gitignore:52-55` sperrt weiterhin
`PPFrama*`, und diese Dateien werden nicht mehr geladen.

**Der offene Punkt ist ein anderer.** `mobile/src/theme/fonts.ts:56-60` lädt
die drei Schriften per `require()`:

```
"BricolageGrotesque-Display": require("../../assets/fonts/BricolageGrotesque-Display.ttf"),
"BricolageGrotesque-Text":    require("../../assets/fonts/BricolageGrotesque-Text.ttf"),
"FamiljenGrotesk-Italic":     require("../../assets/fonts/FamiljenGrotesk-Italic.ttf"),
```

`mobile/app.json` listet dieselben drei Dateien zusätzlich im
`expo-font`-Plugin. **Die Dateien sind aber nicht versioniert:**

```
git ls-files mobile/assets/fonts/     # leer
git status --porcelain mobile/assets/ # ?? mobile/assets/fonts/
```

Der Kommentar in `.gitignore` behauptet inzwischen, sie lägen „bewusst
eingecheckt unter mobile/assets/fonts/". Zum Prüfzeitpunkt stimmt das nicht —
der Ordner ist unversioniert.

**Warum das die Einreichung blockiert.** Ein EAS-Cloud-Build zieht seinen
Quellstand aus dem Git-Repo, und
`docs/deployment/APP_STORE_SUBMISSION.md:57-60` schreibt ausdrücklich vor, aus
dem Repo-Wurzelverzeichnis zu bauen. Fehlen die Dateien dort, bricht der
Metro-Bundler am `require()` ab — genau der Fall, vor dem die frühere Fassung
von `fonts.ts` gewarnt hatte („ein `require()` auf eine fehlende Datei bricht
den Metro-Bundler, die App liesse sich dann gar nicht mehr starten"). Lokal
fällt das nicht auf, weil die Dateien auf dieser Maschine liegen.

**Was zu tun ist.** Die drei TTF-Dateien und die beiden `*-OFL.txt`-Lizenztexte
zur Versionskontrolle hinzufügen. Die OFL erlaubt das Mitverteilen
ausdrücklich, und `.gitignore` steht nicht im Weg — die Sperre ist eng auf
`PPFrama*` zugeschnitten.

Anzumerken: `FamiljenGrotesk-Regular.ttf` liegt im Ordner, wird aber weder in
`fonts.ts` noch in `app.json` referenziert. Ob das Absicht ist, kann ich nicht
beurteilen.

**Aufwand.** Minuten. **Wer.** Code.

---

# (b) Blockiert den echten Betrieb

## b1 — Die Basis-URL kann die beiden vorhandenen Aufrufe nicht gleichzeitig bedienen

Das ist der handfesteste Fehler in der Erhebung, und er trifft eine Funktion,
die als fertig gilt.

`packages/core/src/http.ts:56` baut jede URL als `apiBaseUrl + endpoint`. Es
gibt genau eine Basis-URL (`mobile/src/lib/env.ts:15`).

- Der Maitr-Router hängt unter **`/api/maitr`** (`server/routes/index.ts:196`).
  Damit `api.briefing.today` → `/briefing/today` trifft, muss `apiBaseUrl` auf
  `…/api/maitr` enden.
- `usersRouter` hängt unter **`/api/users`** (`server/index.ts:123`). Damit
  `request("/users/me")` trifft, muss `apiBaseUrl` auf `…/api` enden.

Beide Bedingungen schließen sich aus. Konkret in den vorhandenen Konfigurationen:

| Konfiguration | Wert | `/briefing/today` | `/users/me` |
|---|---|---|---|
| `mobile/.env.example` | `http://localhost:8080/api` | `→ /api/briefing/today` ❌ | `→ /api/users/me` ✅ |
| `mobile/eas.json` (production) | `https://maitr.de/api/maitr` | `→ /api/maitr/briefing/today` ✅ | `→ /api/maitr/users/me` ❌ (404) |
| Fallback in `env.ts:15` | `http://localhost:8080/api` | ❌ | ✅ |

**Wo es sichtbar wird — und wo noch nicht.** Wichtig für die Einordnung: Der
DELETE-Aufruf steht hinter einem Wächter. `DeleteAccountScreen.tsx:78` holt
zuerst ein Token, und nur `if (token)` geht die Anfrage überhaupt raus. Weil es
heute keine echte Anmeldung gibt (`persistSession()` wird nirgends aufgerufen,
siehe a2), liefert `getToken()` nichts — der Aufruf unterbleibt, und der
Bildschirm läuft in seinen lokalen Zweig. **Heute ist die Kontolöschung also
nicht kaputt, sie erreicht den Server nur nicht.**

Der Fehler schlägt in dem Moment durch, in dem a2 erledigt ist: Sobald ein echtes
Token existiert, geht die Anfrage im Produktionsprofil an
`/api/maitr/users/me` — dort gibt es keine Route, der Server antwortet 404, und
der Bildschirm zeigt die Fehlermeldung (`DeleteAccountScreen.tsx:107-111`),
ohne lokal etwas zu löschen. Dann wäre genau die Funktion tot, die Apple
5.1.1(v) verlangt.

Reihenfolge daher: **b1 muss vor oder mit a2 gelöst werden**, nicht danach.

Zusatzbefund: `mobile/.env` existiert nicht (`ls mobile/.env` → nicht
vorhanden). Lokal greift also immer der Fallback aus `env.ts:15` — und dort ist
`/briefing/today` falsch adressiert. Deshalb sieht man auf dem Startbildschirm
zuverlässig „Beispieldaten · API nicht verbunden", auch wenn ein Server läuft.
`docs/store/SCREENSHOTS.md:70-74` empfiehlt konsequenterweise
`http://192.168.x.y:3000/api` — was den Briefing-Aufruf ebenfalls nicht treffen
würde.

**Was zu tun ist.** Eine Entscheidung, drei Möglichkeiten: `/users/me` in den
Maitr-Router spiegeln; oder in `packages/core` zwei Basis-URLs führen; oder den
Löschaufruf als absolute URL bauen. Ich empfehle nichts davon ohne Rücksprache
— die Wahl betrifft auch die Web-App, die denselben Core nutzt.

**Aufwand (Schätzung).** 2–4 Stunden inklusive eines Tests, der beide Pfade
gegen einen laufenden Server prüft.

**Wer.** Code.

---

## b2 — Vier von neun Endpunkten des Client-Vertrags gibt es serverseitig nicht

Abgleich `packages/core/src/api/index.ts` gegen `server/maitr/routes.ts`
(alles unter `/api/maitr`):

| Client-Aufruf | definiert in | serverseitig |
|---|---|---|
| `GET /briefing/today` | `api/index.ts:12` | **ja** — `routes.ts:115` |
| `POST /briefing/tasks/:id/approve` | `api/index.ts:17` | **nein** |
| `PATCH /briefing/tasks/:id` | `api/index.ts:22` | **nein** |
| `GET /reservations/day` | `api/index.ts:32` | **ja** — `routes.ts:61` |
| `POST /reservations` | `api/index.ts:42` | **ja** — `routes.ts:83` |
| `POST /reservations/walk-in` | `api/index.ts:47` | **nein** |
| `DELETE /reservations/:id` | `api/index.ts:51` | **nein** |
| `GET /venues` | `api/index.ts:57` | **ja** — `routes.ts:25` |
| `GET /venues/:slug/public` | `api/index.ts:62` | **ja** — `routes.ts:45` |

Die vier fehlenden sind nicht beliebig. Sie sind genau die **schreibenden**
Operationen des Kerngeschäfts: eine Aufgabe freigeben, einen Entwurf ändern,
einen Walk-in eintragen, eine Reservierung stornieren. Ohne sie kann die App
lesen, aber nichts festhalten.

Umgekehrt gibt es serverseitig Routen ohne Client-Gegenstück:
`GET /integrations` (`routes.ts:147`), `GET /integrations/:provider/connect`
(`routes.ts:157`), der OAuth-Rücksprung (`routes.ts:171`) und die
Meta-Webhooks (`server/maitr/index.ts:41-55`). In `packages/core/src/api/`
existiert kein `integrations`-Modul — der Client-Vertrag kennt diese Routen
also gar nicht.

**Aufwand (Schätzung).** 1–2 Tage für die vier fehlenden Routen samt
Zugriffsprüfung und Tests. Die Muster stehen daneben: `requireVenueAccess` +
`validateBody` (`routes.ts:83`), inklusive der ausführlich kommentierten Lehre,
warum ausschließlich `req.venueId` und nie die Body-Kennung verwendet werden
darf (`routes.ts:86-93`).

**Wer.** Code.

---

## b3 — Die App ruft die vorhandenen Endpunkte gar nicht auf

Selbst dort, wo Server und Vertrag zusammenpassen, ruft niemand an. Von den
neun Vertragsfunktionen nutzt die App **eine**: `api.briefing.today`.

Was das je Bereich bedeutet:

- **Reservierungen.** `mobile/src/features/reservations/ReservationsScreen.tsx`
  liest aus `useStore()`, gefüttert aus `mobile/src/features/reservations/fixtures.ts:27`
  (`serviceDays`). `api.reservations.day` existiert und wird nicht gerufen. Eine
  Reservierung, die ein Gast über `mobile/app/gast/reservieren.tsx` anlegt,
  landet im Gerätespeicher — nicht in der Datenbank. Auf einem zweiten Gerät ist
  sie unsichtbar.
- **Kanäle.** `mobile/src/features/growth/ChannelDetailScreen.tsx:39-47`:
  ```
  // OAuth-Simulation: kurzer Moment, dann verbunden.
  setTimeout(() => { connectChannelAs(...); ... }, 1100);
  ```
  Ein `setTimeout` von 1,1 Sekunden. Der echte OAuth-Start (`GET
  /integrations/:provider/connect`) wird nicht aufgerufen. `expo-linking` ist
  installiert, wird aber nirgends verwendet — `grep -rn "expo-linking\|Linking\."
  mobile/src mobile/app` liefert null Treffer. Der Deep-Link-Rücksprung, den
  `MAITR_APP_DEEP_LINK` (`server/maitr/env.ts:19`) vorsieht, hat in der App
  keinen Empfänger.
- **Betriebsauswahl.** `mobile/src/features/start/StartScreen.tsx:28`:
  `const VENUE_ID = "venue_goldstueck";` — eine fest verdrahtete Zeichenkette.
  Serverseitig prüft `requireVenueAccess` die Mitgliedschaft, und
  `computeBriefing` macht `prisma.business.findUniqueOrThrow`
  (`server/maitr/briefing.ts:43`). Diese Kennung existiert in keiner echten
  Datenbank. Selbst mit gültigem Token und richtiger Basis-URL liefe der
  Startbildschirm in einen Fehler und fiele auf Fixtures zurück.
  `GET /venues` (`routes.ts:25`) gäbe die richtigen Kennungen zurück — es
  fehlt der Bildschirm, der sie holt und auswählen lässt.
- **WhatsApp-Concierge.** `mobile/app/concierge.tsx` →
  `ConciergeScreen.tsx:27` beschreibt „einen 24/7-Gastgeber im Kanal". Es gibt
  **keine WhatsApp-Anbindung**: `grep -rln -i "whatsapp" server/ packages/`
  liefert null Treffer. Der Bildschirm ist eine Darstellung, keine Funktion.
  Der Posteingang zeigt dazu den Eintrag „WhatsApp-Anfrage automatisch
  beantwortet" (`store.tsx:81`) — als Seed-Eintrag.

**Aufwand (Schätzung).** Das ist die größte Position der Erhebung. Store-Slice
für Store-Slice auf echte Endpunkte umzustellen — Reservierungen, Gäste,
Bewertungen, Beiträge, Kanäle, Speisekarte — heißt, für jeden Bereich
Endpunkte, Ladezustände, Fehlerbehandlung und Konfliktauflösung zu bauen.
Grobe Hausnummer: **mehrere Wochen**. Der Store selbst nennt den Weg in seinem
Kopfkommentar (`store.tsx:25-26`): „Sobald `@maitr/core` an echte Endpunkte
hängt, ersetzt dessen Datenfluss diesen Store Slice für Slice."

Für einen Pilotbetrieb muss nicht alles gleichzeitig fallen. Sinnvolle
Reihenfolge nach Nutzen: Betriebsauswahl → Reservierungen → Kanäle →
Bewertungen → Beiträge.

**Wer.** Code.

---

## b4 — Der Server läuft ohne Konfiguration, die Integrationen aber nicht

`server/maitr/env.ts:11-25` verlangt neun Variablen: `MAITR_ENCRYPTION_KEY`
(64 Hex-Zeichen), `MAITR_OAUTH_STATE_SECRET` (min. 32), `MAITR_API_BASE_URL`,
`MAITR_APP_DEEP_LINK`, `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`,
`META_APP_ID`, `META_APP_SECRET`, `META_WEBHOOK_VERIFY_TOKEN`.

**Keine einzige davon steht in `.env.example`** — geprüft mit
`grep -n "MAITR_\|GOOGLE_CLIENT\|META_APP\|META_WEBHOOK" .env.example`: null
Treffer. Wer das Backend in Railway aufsetzt, findet die Liste also nur im
Quelltext.

Die Auswertung ist bewusst lazy (`env.ts:31`), der Server startet ohne die
Variablen normal — nur die OAuth-Routen antworten dann mit einem Fehler, der
die fehlenden Namen nennt. Das ist gut gebaut und heißt zugleich: Der Ausfall
zeigt sich erst, wenn ein Nutzer einen Kanal verbinden will.

Ebenfalls aus: der Sync-Zeitgeber. `server/maitr/scheduler.ts:8-16` läuft nur
bei gesetztem `MAITR_SYNC_INTERVAL_MINUTES` — ausdrücklich standardmäßig aus,
mit nachvollziehbarer Begründung. Ohne ihn werden Bewertungen und
Reichweitenwerte nie abgeholt. Der Kommentar warnt außerdem (Zeile 21-25): bei
mehr als einer Railway-Instanz tickt der Zeitgeber in jeder.

**Aufwand.** `.env.example` ergänzen: eine Stunde. Werte erzeugen und in
Railway setzen: ein bis zwei Stunden, aber erst nach den Freigaben (siehe
Abhakliste).

**Wer.** `.env.example`: Code. Die Werte selbst: nur der Nutzer.

---

## b5 — Google- und Meta-Freigaben stehen aus

`docs/integrations/GOOGLE_META_API_ACCESS.md:5-7` ist eindeutig: Beide Anbieter
gatekeepen genau die Daten, um die es geht (fremde Bewertungen, Insights).
Ohne Freigabe antworten die Endpunkte mit `PERMISSION_DENIED` oder leer. Für
Google ist zusätzlich eine OAuth-Verifizierung des sensiblen Scopes
`business.manage` nötig (Zeile 44-46), inklusive Demo-Video und
Domain-Verifizierung.

Ob und wo Anträge laufen, lässt sich am Repo nicht ablesen — das kann ich nicht
beurteilen.

**Aufwand.** Tage bis Wochen, überwiegend Wartezeit.

**Wer.** Nur der Nutzer.

---

# (c) Macht die App gut statt nur lauffähig

## c1 — Markenschrift: erledigt, mit offener Flanke

Ursprünglich stand hier „Systemschrift statt Markenschrift". Das ist während
der Erhebung umgesetzt worden: `fontAssets` (`mobile/src/theme/fonts.ts:56-60`)
ist gefüllt, `typography.ts` zeigt auf die Schlüssel, `app.json` hat den
`expo-font`-Plugin-Eintrag. Bleibt der Punkt aus **a7** — die Dateien liegen
nicht im Repo. Bis dahin ist die Umstellung nur auf dieser Maschine wirksam.

---

## c2 — Bilder sind Farbverläufe

`mobile/src/components/ui/Media.tsx:8-13`: „Farbverlauf-Platzhalter für Bilder.
Das Design zeigt an diesen Stellen noch keine echten Fotos, sondern warme
Flächen." Betroffen sind unter anderem das öffentliche Gastprofil, die
Speisekarte und die Beitragsvorschauen.

**Aufwand.** Hängt an c3 — ohne Bildquelle keine Bilder.

---

## c3 — Es gibt keinen Weg, ein eigenes Bild in die App zu bekommen

Folge der leeren Berechtigungsliste (siehe a6): kein `expo-image-picker`, keine
Kamera, keine Fotomediathek. Ein Betrieb kann also weder ein Titelbild noch ein
Speisenfoto hochladen — obwohl der Einrichtungsschritt „Medien"
(`mobile/src/features/journey/screens.tsx:426`) genau das ankündigt: „Drei
Fotos und ein Ton, dann klingt Maitr wie du." Der Profil-Check hat „photos"
zudem als erledigt vorbelegt (`store.tsx:469`:
`PROFILE_DONE_SEED = { photos: true }`).

Serverseitig ist die Gegenseite vorhanden: `server/services/supabaseStorage.ts`
löscht bei der Kontolöschung alles unter `<userId>/` — belegt durch die
bestandenen Tests (siehe unten). Es fehlt also der Weg hinein, nicht hinaus.

Wichtig für die Reihenfolge: Sobald `expo-image-picker` dazukommt, braucht
`app.json` `NSPhotoLibraryUsageDescription` (und bei Kamera
`NSCameraUsageDescription`), und die Datenschutzerklärung muss den Upload
abdecken. Das schiebt Punkte aus (a) wieder auf.

**Aufwand (Schätzung).** 2–3 Tage inklusive Upload-Endpunkt und Fehlerfällen.

**Wer.** Code.

---

## c4 — Keine Benachrichtigungen

Kein `expo-notifications` in `mobile/package.json`. Der Store beschreibt den
Kernnutzen als „Der Beweis, dass Maitr nicht nur vorschlägt, sondern erledigt"
(`store.tsx:121`) — eine App mit diesem Anspruch erreicht den Nutzer bis auf
Weiteres nur, wenn er sie von selbst öffnet. Das ist eine Produktentscheidung,
kein Mangel — aber es ist der Unterschied zwischen einem Werkzeug und einem
Assistenten.

**Aufwand (Schätzung).** 3–5 Tage inklusive Server-seitigem Versand und
Berechtigungsdialog. Zieht dieselbe Nebenwirkung nach sich wie c3: neue
Berechtigung, neuer Datenschutzabschnitt.

**Wer.** Code.

---

## c5 — Kein automatisierter Test in der App

`mobile/package.json` kennt die Skripte `start`, `android`, `ios`, `web`,
`typecheck`, `lint`, `doctor` — **kein `test`**, und es gibt kein Testverzeichnis
unter `mobile/`. Serverseitig sieht es anders aus: Die Kontolöschung ist mit 14
Tests abgedeckt (`server/__tests__/accountDeletion.spec.ts`), die ich zur
Kontrolle laufen ließ — **14 von 14 bestanden**.

**Aufwand.** Offen; hängt daran, wie viel abgedeckt werden soll.

---

# Was nur der Nutzer tun kann — Abhakliste

**Apple**
- [ ] Apple Developer Program abschließen (99 $/Jahr)
- [ ] `eas login`, dann `eas init` — schreibt `projectId` und `owner` in `app.json` (siehe a4)
- [ ] App in App Store Connect anlegen, Bundle-ID `app.maitr.mobile` registrieren
- [ ] App-Privacy-Label ausfüllen, Altersfreigabe 4+, Preis festlegen
- [ ] Datenschutz-URL eintragen (setzt a6 voraus)
- [ ] Screenshots hochladen (setzt a3 voraus)

**Google Play**
- [ ] Play Developer Account (25 $ einmalig) + Identitätsprüfung — kann Tage dauern
- [ ] Service-Account-JSON erzeugen und in `eas.json` unter `submit.production.android` hinterlegen
- [ ] Data-Safety-Formular, Content-Rating, Zielgruppe, Datenschutz-URL, interne Testspur

**Clerk** (Voraussetzung für a1)
- [ ] Clerk-Projekt für die Mobile-App, Publishable Key beschaffen
- [ ] Google und Apple als Anmeldeanbieter konfigurieren
- [ ] Bestätigen, dass der Web- und der App-Mandant derselbe sein sollen — sonst kennen sich die Konten nicht

**Google Business Profile** (Voraussetzung für b5)
- [ ] Cloud-Projekt anlegen, die vier APIs aktivieren
- [ ] „Business Profile API access" beantragen — **ohne diese Freigabe ist die Quota 0**
- [ ] OAuth-Zustimmungsbildschirm, Domain-Verifizierung, Datenschutz-URL
- [ ] OAuth-Verifizierung für `business.manage` einreichen (Demo-Video nötig)

**Meta** (Voraussetzung für b5)
- [ ] App im Meta-Developer-Portal, App-Review für die Instagram-/Seiten-Berechtigungen
- [ ] Webhook-Verify-Token festlegen

**Railway** (Voraussetzung für b4)
- [ ] `MAITR_ENCRYPTION_KEY` — 32 Byte als Hex (`openssl rand -hex 32`)
- [ ] `MAITR_OAUTH_STATE_SECRET` — mindestens 32 Zeichen
- [ ] `MAITR_API_BASE_URL` — die öffentliche HTTPS-Adresse der API
- [ ] `MAITR_APP_DEEP_LINK` — z. B. `maitr://connected` (das Schema `maitr` ist in `app.json` gesetzt)
- [ ] `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`
- [ ] `META_APP_ID`, `META_APP_SECRET`, `META_WEBHOOK_VERIFY_TOKEN`
- [ ] Entscheiden, ob `MAITR_SYNC_INTERVAL_MINUTES` gesetzt wird — und falls ja, sicherstellen, dass genau **eine** Instanz läuft (`scheduler.ts:21-25`)

**Rechtliches**
- [ ] `docs/legal/PRIVACY.md` mit Betreiberdaten füllen, juristisch prüfen lassen, öffentlich hosten
- [ ] Nutzungsbedingungen für die App erstellen — es gibt keine Vorlage im Repo
- [ ] Entscheiden, ob der Abo-Bildschirm Preise zeigen soll (a2)

---

# Was ich nicht beurteilen konnte

- **Ob die Website-Rechtstexte den App-Betrieb mit abdecken.** Juristische
  Frage. `client/pages/Datenschutz.tsx` beschreibt Clerk und Google Sign-In,
  aber nicht die App als eigenes Produkt.
- **Ob Maitr unter eine IAP-Ausnahme fällt** (a2). Das hängt an Apples
  Richtlinien in ihrer heutigen Fassung, nicht am Code.
- **Ob und wo Anträge bei Google/Meta laufen.** Am Repo nicht ablesbar.
- **Wie zuverlässig meine Aufwandsangaben sind.** Sie beruhen auf dem gelesenen
  Umfang, nicht auf gemessenen Durchläufen. Die Wochen-Angabe bei b3 ist die
  unsicherste Zahl in diesem Dokument.
- **Ob `expo-doctor` und ein EAS-Cloud-Build durchlaufen.** Nicht ausgeführt —
  ein Cloud-Build setzt das Konto voraus, das noch fehlt.
  `docs/deployment/APP_STORE_SUBMISSION.md:57-60` weist auf eine Besonderheit
  hin, die dabei zuerst auffallen dürfte: `@maitr/core` liegt außerhalb von
  `mobile/` und wird per Custom-Metro-Resolver eingebunden
  (`mobile/metro.config.js:28-42`) — EAS muss deshalb aus dem Repo-Wurzel-
  verzeichnis bauen.

---

# Kürzester Weg zu einer einreichbaren App

Falls eine Reihenfolge gebraucht wird — die Positionen unten sind die, ohne die
gar nichts geht, nicht die, die das beste Produkt ergeben:

1. **a7** — Schriftdateien versionieren. Minuten, und ohne das schlägt jeder
   Cloud-Build fehl, bevor irgendetwas anderes geprüft werden kann.
2. **a2 entscheiden** (Preise raus oder echte Zahlung) — Stunden bis Wochen, je nach Antwort.
3. **b1 beheben** — die Basis-URL passt nicht für beide Endpunkt-Familien
   gleichzeitig. Heute merkt man es nicht, weil ohne Token gar keine Anfrage
   rausgeht; sobald a1 steht, wäre die Kontolöschung tot. Deshalb vor oder mit
   a1 erledigen, nicht danach. 2–4 Stunden.
4. **a1 bauen** — echte Clerk-Anmeldung. 2–4 Tage plus Kontoeinrichtung.
5. **a6 erledigen** — Datenschutz und Nutzungsbedingungen hosten und in der App verlinken.
6. **a5** — Demo-Verzeichnis aus dem Produktivpfad. 1 Stunde.
7. **b4** — Railway-Variablen setzen, Backend erreichbar machen.
8. **a3** — Screenshots neu aufnehmen, wenn das Backend antwortet.
9. **a4** — `eas init`, `eas build`, `eas submit`.

Was in dieser Liste **nicht** vorkommt: b2 und b3. Eine App, die aus dem
Gerätespeicher läuft, ist einreichbar — sie ist nur kein Dienst. Ob das für den
Pilotbetrieb reicht, ist die Entscheidung, die hinter allen anderen steht.
