# Entscheidungsvorlage: `chore/track-mobile-app-and-security-fixes`

**Stand:** 04.08.2026 · **Status:** nur Analyse, am Branch wurde nichts verändert
**Bezugspunkt:** `chore/maitr-backend-und-sicherheitsfixes` (= `main` + 5 Commits, 0 dahinter)

Nachgerechnet mit `git rev-list --left-right --count main...HEAD` → `0 5`. Die fünf sind
`0344b2b`, `3bf689e`, `94237a3`, `6a4dc10`, `a235db7`. (Eine frühere Fassung dieser Vorlage
nannte hier vier — `0344b2b` ist seitdem dazugekommen. Inhaltlich ändert das nichts an der
Analyse: `0344b2b` legt genau eine neue Datei an,
`prisma/migrations/20260803_add_maitr_channel_models/rollback.sql`, +32 Zeilen, und
berührt keine Datei, die einer der offenen Branch-Commits anfasst.)

Diese Vorlage beantwortet eine einzige Frage: Was von dem alten Branch soll noch auf
`main` — und was nicht. Sie ist so geschrieben, dass man sie ohne Vorwissen lesen kann.
Alle Zahlen sind mit `git merge-tree` gegen den aktuellen Stand nachgerechnet, nicht
geschätzt.

> **Lesehinweis zu Zustandsangaben.** Während diese Vorlage entstand, liefen parallele
> Arbeitspakete im selben Arbeitsbaum — unter anderem eines, das die PP-Frama-Schriftdateien
> entfernt (Abschnitt 1.3). Wo eine Aussage von einem Zustand abhängt, der sich gerade
> ändert, steht deshalb das Prüfkommando dabei. Bitte nachprüfen statt der Vorlage glauben.

---

## 0. Lage in drei Sätzen

Der Branch zweigte am **24.07.2026** bei `fb4e683` ab und bekam am 27.07. sieben Commits.
Danach lief die Arbeit auf `main` weiter — inzwischen liegt `main` **51 Commits** vor dem
Abzweigpunkt, der Branch nur 7. Der wichtigste dieser sieben (`c00fe53`) wurde am
03.08. bereits per Cherry-Pick übernommen (`a235db7`); **sechs Commits sind noch offen**,
und sie sind deutlich kleiner und harmloser, als der Branch von außen aussieht.

> Nebenbemerkung zur Zahl 50 vs. 51: In der Commit-Message von `a235db7` steht „50
> Commits voraus". Das stimmte beim Schreiben; seitdem ist `2361f9a` auf `main` gelandet.
> Kein inhaltlicher Unterschied.

---

## 1. Was liegt auf dem Branch, das es nirgendwo sonst gibt?

### 1.0 `c00fe53` — Backend/Kernpaket/App + zwei Sicherheitsfixes (196 Dateien) — ERLEDIGT

Vollständig übernommen als `a235db7` (198 Dateien: dieselben 196 plus `tsconfig.json`
und die Löschung von `mobile/app/index.js`). Nachgeprüft: Der Baumvergleich zwischen
`c00fe53` und dem heutigen HEAD zeigt auf den 196 Pfaden nur noch vier abweichende
Dateien — `.gitignore`, `prisma/schema.prisma`, `server/index.ts`,
`server/routes/index.ts` —, und diese Abweichungen sind exakt die drei dokumentierten
Konfliktauflösungen plus die drei Folge-Commits (`6a4dc10`, `94237a3`, `3bf689e`).
**Hier ist nichts mehr offen.**

### 1.1 `03b3e56` — Billing ehrlich deaktivieren (5 Dateien, +88/−37)

Der einzige Commit mit einem belegbaren Live-Defekt, der **heute noch auf `main` steht**.
Nachgeprüft auf HEAD, `server/routes/subscriptions.ts`:

```
253:    await audit("checkout_initiated", planId, true);
257:      message: "Checkout session created",
259:      checkoutUrl: null, // TODO: Update when Stripe is configured
```

`createCheckoutSession` meldet also weiterhin Erfolg und protokolliert einen
„eingeleiteten Checkout", obwohl gar keine Stripe-Session existiert. Der Commit dreht
das auf ein ehrliches `501`. Dazu:

- **`cancelSubscription`** setzt heute den lokalen Datensatz auf `free`, auch wenn eine
  `stripeSubscriptionId` existiert — der Kunde verliert den Zugang, Stripe rechnet
  weiter ab. Der Commit blockt diesen Pfad.
- **`client/pages/Index.tsx`**: Der „Jetzt starten"-Button der Preiskarten hat weder
  `onClick` noch `href`, ist also wirkungslos. Der Commit verlinkt ihn auf
  `/mode-selection`. Dazu ein Hinweisbanner „Abrechnung noch nicht freigeschaltet".
- **`client/pages/AGB.tsx`**: Hinweis, dass §§ 6–8 (Preise, Zahlung, Widerruf) erst mit
  freigeschalteter Zahlung greifen.
- **`docs/product/V2_IMPLEMENTATION_STATUS.md`**: korrigiert die falsche Behauptung
  „[x] Stripe webhook registration in server / Stripe Integration — COMPLETE".
  Nachgeprüft: `handleStripeWebhook` in `server/webhooks/stripe.ts` hat auf HEAD nach wie
  vor **keinen Aufrufer**; die Doku ist also weiterhin falsch.

**Wert: hoch.** Rechtlich (AGB/Preisseite behaupten ein Angebot, das nicht existiert)
und operativ (die Kündigungslücke ist der schlimmste denkbare Fehlerfall).

### 1.2 `1851367` + `076de13` — CI-Pipeline (1 bzw. 2 Dateien)

Von `1851367` ist **fast alles überholt**: `main` hat seit `d09ddbe` (28.07.) eine eigene,
inhaltlich bessere `.github/workflows/ci.yml` — mit gepinnter Node-Version 22.12.0
(begründet: `require(ESM)`, sonst stirbt jsdom), mit einem echten Test-Job inklusive
Dummy-`DATABASE_URL`, und mit demselben `continue-on-error` beim Root-Typecheck.

**Was `main` nicht hat: den Job `mobile-typecheck`** (`npm ci` + `npx tsc --noEmit` in
`mobile/`). Das ist der einzige neue Wert — und er zählt jetzt mehr als am 27.07., weil
seit `a235db7` überhaupt erst echter App-Quellcode unter `mobile/` liegt.

Von `076de13` sind die CI-Änderungen ebenfalls überholt (`main` hat den
`pnpm/action-setup`-Fix bereits). **Übrig bleibt ein echter, heute noch vorhandener Bug:**

```
HEAD:mobile/src/features/inbox/InboxScreen.tsx:15
const KIND_ICON: Record<InboxKind, (p: IconProps) => JSX.Element> = {
```

Der globale `JSX`-Namespace existiert unter React 19 / neuen `@types/react` nicht mehr.
Lokal löst `tsc` ihn noch aus dem Root-`node_modules` auf, in einem frischen Mobile-only-
Install nicht — TS2503. Ein Ein-Zeilen-Fix (`ReactElement`).

**Wert: mittel.** Nicht als Commits, sondern als zwei Rosinen: der Mobile-CI-Job und die
eine Zeile in `InboxScreen.tsx`.

### 1.3 `b2c6a2d` — Familjen Grotesk (6 Dateien, +119/−28)

Der wichtigste Fund dieser Analyse.

Der Branch ersetzt PP Frama („Free for Personal Use", Pangram Pangram) durch **Familjen
Grotesk unter SIL OFL 1.1**, samt Lizenzdatei neben den Schriftdateien. Nachgeprüft über
alle Refs — lokal wie auf `origin` — trägt **ausschließlich dieser Branch** die
Familjen-Dateien:

```
chore/track-mobile-app-and-security-fixes: 3 Familjen-Dateien
origin/chore/track-mobile-app-and-security-fixes: 3
main / origin/main:                        0
alle übrigen 13 Refs:                      0
```

Gleichzeitig kamen die **PP-Frama-OTFs mit `c91c261` (28.07.) auf `main`**, committet in
einem öffentlichen Repo. Und zwar **nicht vier, sondern acht Dateien in zwei Verzeichnissen** —
dieselben vier Schriften liegen ein zweites Mal im Android-Asset-Ordner:

```
mobile/assets/fonts/PPFrama-Regular.otf
mobile/assets/fonts/PPFrama-RegularItalic.otf
mobile/assets/fonts/PPFramaText-Regular.otf
mobile/assets/fonts/PPFramaText-RegularItalic.otf
mobile/android/app/src/main/assets/fonts/PPFrama-Regular.otf
mobile/android/app/src/main/assets/fonts/PPFrama-RegularItalic.otf
mobile/android/app/src/main/assets/fonts/PPFramaText-Regular.otf
mobile/android/app/src/main/assets/fonts/PPFramaText-RegularItalic.otf
```

Beide Vierergruppen wurden von `c91c261` hinzugefügt (`git log --diff-filter=A` je Pfad).

> **Achtung, zwei verschiedene Fragen — und derzeit zwei verschiedene Antworten.**
>
> | Frage | Kommando | Stand beim Schreiben |
> |---|---|---|
> | Liegen sie im **Commit**? | `git ls-tree -r --name-only main \| grep -i ppframa` | 8 Treffer |
> | Liegen sie im **Index**? | `git ls-files \| grep -i ppframa` | 0 Treffer |
>
> Das ist kein Widerspruch, sondern der laufende Umbau: Ein paralleles Arbeitspaket hat
> die Löschung aller acht Dateien **vorgemerkt, aber noch nicht committet**
> (`git status --short` zeigt sie als `D `). Solange nichts committet ist, sind die Dateien
> auf `main` und auf `HEAD` unverändert vorhanden — und damit auch im öffentlichen Repo
> abrufbar. Erst der Commit löst das Lizenzproblem, nicht der Arbeitsbaum.
>
> Beim Lesen dieser Vorlage bitte beide Kommandos ausführen und danach einordnen:
>
> - **8 im Commit** → das Lizenzproblem ist offen, egal was der Arbeitsbaum sagt.
> - **0 im Commit** → erledigt; der Rest dieses Abschnitts ist Hintergrund, keine Aufgabe.
> - **4 im Commit** → halbe Arbeit. Wahrscheinlich ist jemand einer älteren Fassung dieser
>   Vorlage gefolgt, die nur `git rm mobile/assets/fonts/PPFrama*.otf` nannte, und hat den
>   Android-Pfad übersehen. Die Lizenzlage ist dann **nicht** halb gelöst, sondern
>   unverändert schlecht: Dieselben vier Schriften sind weiter öffentlich abrufbar.

Im Commit-Stand verweist `mobile/src/theme/fonts.ts` mit vier `require(…)` auf den
Expo-Pfad, samt dem alten Kommentar „für den kommerziellen Release muss eine Lizenz
erworben werden" (`git show HEAD:mobile/src/theme/fonts.ts`).

**Warum die `.gitignore` das nicht verhindert hat**, in der richtigen Reihenfolge —
das ist wichtig, weil es zwei getrennte Ursachen sind und man sonst die falsche behebt:

1. Die Font-Regeln der Wurzel-`.gitignore` im Commit-Stand lauten
   `mobile/assets/fonts/*.otf` und `mobile/assets/fonts/*.ttf`. Beide tragen ein
   Pfadpräfix und können den Android-Ordner deshalb **prinzipbedingt nie** erfassen.
   Dieselbe Schwäche hat die Fassung aus `b2c6a2d` (`mobile/assets/fonts/PPFrama*.otf`).
   Weder `git show HEAD:.gitignore` noch `git show b2c6a2d:.gitignore` enthält eine Zeile
   mit „android".
2. `mobile/.gitignore` **hat** eine Regel `/android` (Zeile 41) — aber sie kam mit
   `a235db7` am 03.08. und damit **nach** `c91c261` vom 28.07., das die Dateien eingecheckt
   hat. Ignore-Regeln gelten nicht für bereits getrackte Dateien; deshalb liegen unter
   `mobile/android/` trotz dieser Regel 58 getrackte Dateien im HEAD-Baum.

> **Fallstrick beim Nachprüfen:** `git check-ignore -v <pfad>` schweigt bei einer
> **getrackten** Datei grundsätzlich — es überspringt getrackte Pfade und meldet „keine
> Regel", auch wenn eine passende Regel existiert. Wer daraus „es gibt keine Regel"
> schließt, liegt falsch; eine frühere Fassung dieses Abschnitts tat genau das.
> Richtig: `git check-ignore -v --no-index <pfad>` prüft die Regelabdeckung unabhängig vom
> Tracking-Status, `git ls-tree` beantwortet die davon getrennte Frage, ob die Datei im
> Repo liegt. Für `mobile/android/app/src/main/assets/fonts/PPFrama-Regular.otf` liefern
> beide Kommandos gegensätzlich klingende, aber beide zutreffende Antworten: eine Regel
> greift (`mobile/.gitignore:41:/android`) **und** die Datei ist trotzdem im Commit —
> weil die Regel zu spät kam.

**Wer die acht Dateien entfernt, muss vier weitere Stellen mitnehmen.** Sie nennen die
Dateinamen und laufen sonst ins Leere:

| Datei | Was drinsteht |
|---|---|
| `mobile/src/theme/fonts.ts` | vier `require("../../assets/fonts/PPFrama*.otf")` |
| `mobile/src/theme/typography.ts` | `fontFamily` zeigt auf die PP-Frama-Namen |
| `mobile/ios/Maitr/Info.plist` | `UIAppFonts` listet die vier OTF-Dateinamen |
| `mobile/ios/Maitr.xcodeproj/project.pbxproj` | `PBXFileReference` mit `path = "../assets/fonts/PPFrama-*.otf"` |

Die beiden iOS-Dateien sind getrackt (`git ls-files mobile/ios` → 23 Dateien) und beim
Schreiben dieser Vorlage vom laufenden Umbau **nicht** angefasst worden — sie tauchen in
`git status` nicht auf, `grep -rl -i ppframa mobile/ios` findet sie aber weiterhin. Vor dem
Commit also prüfen, ob das gewollt ist oder ob `ios/` ohnehin per `expo prebuild` neu
erzeugt wird.

**Wert: hoch, und zeitkritisch.** Die Notiz „Font-Lizenz gelöst, EAS entblockt" gilt
faktisch nur für diesen Branch. Auf `main` ist sie nicht gelöst.

### 1.4 `e8b6954` — i18n + Bricolage Grotesque (56 Dateien, +1379/−542)

Drei Dinge in einem Commit:

1. **Zweisprachigkeit DE/EN** (`mobile/src/lib/i18n.tsx`, 122 Zeilen). Bewusst ohne
   externe Bibliothek: ein `Localized<T>`-Typ, der entweder ein einfacher Wert oder ein
   `{ de, en }`-Paar ist, plus `useT()`. Die Übersetzung steht an der Verwendungsstelle.
   Der Kommentar im Code benennt ausdrücklich die Falle: Werte, auf denen `analytics.ts`
   per String-Vergleich rechnet (`tags.includes("Außenplätze")`), bleiben kanonisch
   deutsch; übersetzt wird nur die Anzeige. Das ist durchdacht.
2. **Typografie-Umstellung** auf Bricolage Grotesque (siehe Abschnitt 5).
3. **Nebenbei: Assets.** `mobile/assets/icon.png` schrumpft von 393.493 auf 24.680 Byte, dazu
   ein neues `maitr-icon-nacht.svg`. Sachlich gut, aber im Commit-Titel nicht erwähnt.

Die restlichen ~50 Dateien sind das Durchreichen von `t({de, en})` durch alle Screens.
Keine Tests — der Branch bringt unter `mobile/` keine einzige Testdatei mit.
`@react-native-async-storage/async-storage` (von `i18n.tsx` benötigt) liegt bereits in
`mobile/package.json` auf HEAD; der Commit ändert keine Abhängigkeiten.

**Wert: mittel bis hoch, aber es ist ein Produktentscheid, kein Fix.** Die Frage lautet
nicht „übernehmen oder nicht", sondern „soll die App zweisprachig sein". Wenn ja: Der
Commit ist ordentlich gemacht und konfliktfrei.

### 1.5 `66c254d` — Datenschutzerklärung (1 Datei, +477/−212)

Hier liegt die eigentliche Falle. Beide Seiten haben dieselbe Datei aus demselben
223-Zeilen-Ausgangsstand heraus **auf fast identische Weise** neu geschrieben:

| | Zeilen | wann | Commit |
|---|---|---|---|
| Ausgangsstand `fb4e683` | 223 | 24.07. | — |
| `main` / HEAD | 460 | 28.07. | `c91c261` |
| Branch | 488 | 27.07. | `66c254d` |

Beide Fassungen haben dieselbe Gliederung, dieselben acht Abschnitte, dieselben
Anbieteradressen, denselben `UPDATED = "27.07.2026"`. Der Unterschied ist zu 90 %
redaktionell. Das ist kein Zufall: `c91c261` ist ein „chore: sync"-Commit, der einen
lokalen Arbeitsstand auf `main` gespült hat — vermutlich eine spätere Fassung derselben
Textarbeit.

**Nur im Branch (inhaltlich, nicht kosmetisch):**

- Abschnitt „Datenschutzbeauftragter" — dass keine Bestellpflicht besteht und wohin man
  sich stattdessen wendet. Fehlt auf `main` komplett.
- Meta-Pixel: die ausdrückliche Rechtsgrundlage „Art. 6 Abs. 1 lit. a DSGVO
  (Einwilligung)". `main` nennt an dieser Stelle gar keine.
- Instagram: „Eine Nutzung des offiziellen Instagram-Graph-API findet derzeit nicht statt."
- Server-Logs: berechtigtes Interesse ausformuliert („an Betriebssicherheit").
- Beschwerderecht als vollständiger Satz statt als Adresszeile.

**Nur auf `main`:**

- `canonicalPath="/datenschutz"` an `PageSEO` — Teil der SEO-Arbeit vom 28.07.
- `<a href="/">` statt `<Link to="/">`. Das ist auf `main` **konsistent über alle drei
  Rechtsseiten**: `<Link>` kommt in keiner der drei Dateien vor (`grep -o '<Link'` → 0/0/0).
  Zu den Zahlen, weil eine frühere Fassung dieser Vorlage sie falsch etikettiert hat:

  | Datei | `<a>`-Elemente | davon interne Route `href="/…"` | Sprungmarke `#` | mailto/tel | extern |
  |---|---|---|---|---|---|
  | `Impressum.tsx` | 6 | 2 | 0 | 2 | 2 |
  | `AGB.tsx` | 5 | 3 | 1 | 0 | 1 |
  | `Datenschutz.tsx` | 13 | 5 | 1 | 2 | 5 |

  Die Spalte „`<a>`-Elemente" ist dreifach gegengezählt und stimmt jeweils überein:
  `grep -o 'href='`, `grep -oE '<a[[:space:]]|<a$'` und `grep -o '</a>'` liefern alle
  6 / 5 / 13. Die naheliegende Suche `grep -o '<a href'` liefert dagegen nur **5 / 3 / 3** —
  sie unterschlägt jedes Tag, bei dem `href` in einer eigenen Zeile steht (mehrzeilige
  JSX-Formatierung, z. B. `Impressum.tsx:23–24`). Wer diese Zahl als Anzahl der Links
  meldet, zählt zu niedrig.

  Für die Frage „`<a>` statt `<Link>`" zählt allein die dritte Spalte: **2 / 3 / 5** interne
  Routenlinks, die auch `<Link to>` sein könnten. Die übrigen sind mailto, tel, externe
  Ziele und Sprungmarken innerhalb der Seite — die gehören ohnehin auf `<a>`.
  Ob der Verzicht auf `<Link>` für das Prerendering so gewollt ist, konnte ich nicht
  belegen — die Konsistenz ist aber Fakt.
- Etwas ausführlichere Meta-Pixel-Aufzählung.

**Wert: gering als Commit, hoch als Textbaustein.** Fünf Absätze sind es wert, per Hand
nachgetragen zu werden. Die Datei als Ganzes zu übernehmen wäre ein Rückschritt.

---

## 2. Konfliktanalyse je verbleibendem Commit

**Methode:** `git merge-tree --write-tree --merge-base=<commit>^ HEAD <commit>` —
ein echter Dreiwege-Merge im Objektspeicher, ohne Arbeitsbaum, ohne Ref-Änderung.
Zusätzlich ein kumulativer Durchlauf in der vorgeschlagenen Reihenfolge
(jeder Zwischenstand per `git commit-tree` festgehalten). Der Arbeitsbaum wurde nicht
angefasst.

Ausgangspunkt war die Feststellung, dass **neun Dateien von beiden Seiten geändert
wurden**. Fünf davon sind durch `a235db7` bereits erledigt:

| Datei | Status |
|---|---|
| `prisma/schema.prisma` | in `a235db7` aufgelöst |
| `server/index.ts` | in `a235db7` aufgelöst |
| `server/routes/index.ts` | in `a235db7` aufgelöst |
| `mobile/package.json` | in `a235db7` aufgelöst (Branch-Fassung gewann) |
| `.gitignore` | teils aufgelöst, siehe `b2c6a2d` unten |
| `client/pages/AGB.tsx` | **kein Konflikt** (siehe unten) |
| `client/pages/Index.tsx` | **kein Konflikt** |
| `.github/workflows/ci.yml` | **echter Konflikt** |
| `client/pages/Datenschutz.tsx` | **echter Konflikt, schwer** |

### `03b3e56` (Billing) — konfliktfrei

`exit=0`. Die von `main` an `Index.tsx` und `AGB.tsx` vorgenommenen Änderungen liegen an
anderen Stellen der Dateien. `server/routes/subscriptions.ts` hat `main` seit dem Abzweig
gar nicht angefasst. **Aufwand: null.**

### `1851367` (CI-Pipeline) — echter Konflikt, aber trivial aufzulösen

`CONFLICT (add/add)` auf `.github/workflows/ci.yml`: Beide Seiten haben die Datei
unabhängig **neu angelegt**, deshalb gibt es keine gemeinsame Basis und Git meldet die
ganze Datei als Konflikt. Das sieht schlimmer aus, als es ist — inhaltlich überschneiden
sich die Dateien fast vollständig (`build`, informativer Root-Typecheck, dieselbe
`concurrency`-Gruppe, derselbe pnpm-Kommentar).

**Kein echter inhaltlicher Konflikt, sondern eine Doppelung.** `main`s Fassung ist die
bessere. Richtige Auflösung: `main`s Datei behalten und den Job `mobile-typecheck`
(15 Zeilen) anhängen. `git cherry-pick` ist dafür das falsche Werkzeug.

### `076de13` (CI-Fix + JSX-Bug) — Konflikt nur im CI-Teil

Einzeln gegen HEAD: `exit=0` (weil `main` denselben pnpm-Fix schon hat, mergt Git das
zusammen). In der Kette nach `1851367`: erneut Konflikt in `ci.yml`, weil dort schon
Marker stehen. **Der Mobile-Teil ist in beiden Fällen konfliktfrei.**

### `b2c6a2d` (Familjen Grotesk) — konfliktfrei, aber mit zwei Nachrichten

`exit=0`, der Merge selbst ist sauber. Zwei Dinge löst er trotzdem nicht.

**Erstens: acht Schriftdateien bleiben liegen.** `.gitignore` entfernt keine bereits
getrackten Dateien, und der Branch hat die OTFs nie gesehen — sie kamen nach dem Abzweig
mit `c91c261` auf `main`. Simuliert mit
`git merge-tree --write-tree --merge-base=b2c6a2d^ HEAD b2c6a2d` und den Ergebnisbaum
mit `git ls-tree` ausgelesen:

```
mobile/assets/fonts/                          mobile/android/app/src/main/assets/fonts/
  FamiljenGrotesk-Italic.ttf   (neu)            PPFrama-Regular.otf
  FamiljenGrotesk-OFL.txt      (neu)            PPFrama-RegularItalic.otf
  FamiljenGrotesk-Regular.ttf  (neu)            PPFramaText-Regular.otf
  PPFrama-Regular.otf                           PPFramaText-RegularItalic.otf
  PPFrama-RegularItalic.otf
  PPFramaText-Regular.otf
  PPFramaText-RegularItalic.otf
```

Dieselbe Rechnung kumulativ über `03b3e56 → b2c6a2d → e8b6954` (dreimal `exit=0`) ergibt
im Endstand zusätzlich die drei Bricolage-Dateien unter `mobile/assets/fonts/` — und
weiterhin **alle acht** PP-Frama-OTFs in beiden Verzeichnissen.

**Der Cherry-Pick allein löst das Lizenzproblem also nicht** — es braucht zusätzlich ein
`git rm` über **beide** Pfade. Das ist ein bewusster Handgriff, kein Automatismus.

**Zweitens: die `.gitignore` aus `b2c6a2d` verkleinert die Abdeckung.** Sie mergt
konfliktfrei, aber inhaltlich ist sie enger als das, was heute auf HEAD steht:

| Fassung | Font-Regeln in der Wurzel-`.gitignore` |
|---|---|
| HEAD (Commit-Stand) | `mobile/assets/fonts/*.otf` **und** `mobile/assets/fonts/*.ttf` |
| `b2c6a2d` | nur `mobile/assets/fonts/PPFrama*.otf` |

Der Wegfall von `*.ttf` ist beabsichtigt — die OFL-Schriften *sollen* committet werden.
Der Wegfall von `*.otf` zugunsten von `PPFrama*.otf` ist dagegen ein Rückschritt: Danach
rutscht jede künftige, anders benannte OTF unbemerkt in ein öffentliches Repo.

Vor allem aber: **beide Fassungen tragen ein Pfadpräfix** und können den Android-Ordner
damit nie erfassen (Begründung und Nachweis in Abschnitt 1.3). Wer `b2c6a2d` übernimmt,
sollte die `.gitignore` deshalb nicht blind die Branch-Fassung werden lassen, sondern ein
Muster **ohne** Schrägstrich setzen — Muster ohne Pfadtrenner greifen in jedem
Verzeichnis, also auch in den von `expo prebuild` erzeugten Kopien.

> **Stand beim Schreiben:** Genau diese Korrektur liegt bereits im Arbeitsbaum — die
> aktuelle (noch **nicht** committete, `git status` zeigt ` M .gitignore`) Fassung nutzt
> `PPFrama*.otf` ohne Pfadpräfix und begründet das im Kommentar. Vor Schritt 2b also erst
> `git show HEAD:.gitignore` gegen die Arbeitskopie halten; womöglich ist nichts mehr zu tun.

### `e8b6954` (i18n + Bricolage) — konfliktfrei, **wenn** `b2c6a2d` davor liegt

Einzeln gegen HEAD: drei Konflikte (`fonts.ts`, `typography.ts`, `AbonnementScreen.tsx`).
In der Kette nach `03b3e56` und `b2c6a2d`: `exit=0`, null Konflikte.

Das ist **reine Reihenfolge-Abhängigkeit, kein Konflikt mit `main`**:
`AbonnementScreen.tsx` baut auf dem Text aus `03b3e56` auf, `fonts.ts`/`typography.ts` auf
`b2c6a2d`. Wer die Reihenfolge einhält, sieht keinen einzigen Konfliktmarker.

### `66c254d` (Datenschutzerklärung) — schwerster Konflikt der Liste

`CONFLICT (content)` mit **38 Konfliktblöcken** in einer einzigen Datei. Nachgezählt in
der aus der Simulation erzeugten Datei:

```
grep -c "^<<<<<<<" → 38
```

Der Grund ist die Doppelarbeit aus Abschnitt 1.5: Beide Seiten haben nahezu jede Zeile
angefasst, also kollidiert nahezu jede Zeile. **Formal Textnähe, praktisch unbrauchbar** —
selbst ignoriert man Leerzeichen und Leerzeilen (`git diff --ignore-all-space
--ignore-blank-lines`), bleiben 121 eingefügte und 101 entfernte Zeilen. Eine sinnvolle Auflösung besteht nicht darin, 38 Blöcke durchzugehen, sondern
darin, sich für `main`s Datei zu entscheiden und die fünf fehlenden Absätze nachzutragen.

Ein zusätzlicher, harter Grund gegen die Branch-Fassung: Sie übergibt kein
`canonicalPath`. In `client/components/seo/PageSEO.tsx` ist die Prop **nicht optional**
(`canonicalPath: string;`). Die Branch-Datei würde also einen Typfehler erzeugen und
nebenbei das Canonical-Tag der Datenschutzseite verlieren — mitten in einer Woche, in der
`main` sechs SEO-Commits gemacht hat.

---

## 3. Was ginge beim Verwerfen verloren?

Konkret, ohne Pauschalen:

1. **Die einzige gelöste Font-Lizenz.** Familjen Grotesk und Bricolage Grotesque (beide
   SIL OFL, beide mit Lizenzdatei) existieren in keinem anderen Ref. `main` behält
   stattdessen **acht** PP-Frama-OTFs im öffentlichen Repo (vier unter
   `mobile/assets/fonts/`, dieselben vier unter
   `mobile/android/app/src/main/assets/fonts/`), die dort nicht liegen dürfen, und ein
   `fonts.ts`, das auf sie zeigt. Das ist die einzige Position mit Rechtsrisiko.
2. **Die ehrliche Billing-Abschaltung.** Ohne sie meldet `createCheckoutSession` weiter
   Erfolg ohne Session, und `cancelSubscription` kann einem Kunden den Zugang nehmen,
   während Stripe weiter abrechnet.
3. **Die DE/EN-Zweisprachigkeit** der App inklusive der sauber begründeten Trennung von
   Anzeige- und Rechenwerten — rund 1.400 Zeilen Arbeit über 56 Dateien.
4. **Der Mobile-Typecheck in der CI.** Ohne ihn merkt niemand, wenn App-Code bricht:
   `tsconfig.json` auf HEAD hat als `include` nur `client/**`, `server/**`, `shared/**`
   und die zwei Vite-Configs — `mobile/` wird von `pnpm run typecheck` schlicht nicht
   erfasst. Der `JSX.Element`-Fehler in `InboxScreen.tsx` ist der lebende Beweis: Er
   steht seit dem 27.07. unbemerkt auf HEAD.
5. **Fünf Absätze Datenschutztext**, darunter der komplett fehlende Abschnitt
   „Datenschutzbeauftragter" und die Rechtsgrundlage zum Meta-Pixel.
6. **Ein 393-KB-Icon**, das auf 25 KB schrumpfen würde.

Was **nicht** verloren ginge: `c00fe53` in Gänze (schon drin) und die CI-Grundstruktur
(`main` hat eine bessere).

---

## 4. Was bricht beim Mergen?

Ein vollständiger `git merge` des Branches ist die schlechteste aller Optionen. Konkret:

1. **`client/pages/Datenschutz.tsx`**: 38 Konfliktblöcke; bei falscher Auflösung fehlt
   `canonicalPath` → Typfehler gegen `PageSEO` und ein verlorenes Canonical-Tag.
2. **`.github/workflows/ci.yml`**: add/add über die ganze Datei. Nimmt man versehentlich
   die Branch-Fassung, verliert man den Test-Job, die begründete Node-Pinnung auf 22.12.0
   und die Dummy-`DATABASE_URL` — die CI liefe wieder ohne Tests.
3. **`mobile/src/theme/fonts.ts` und `typography.ts`**: nur bei falscher Reihenfolge.
   Wird `e8b6954` vor `b2c6a2d` angewandt, verweist `fonts.ts` auf
   `FamiljenGrotesk-Italic.ttf`, das dann nicht existiert → die App lädt die Schrift nicht.
4. **Die acht PP-Frama-OTFs bleiben liegen.** Nicht vier — dieselben vier Schriften liegen
   ein zweites Mal unter `mobile/android/app/src/main/assets/fonts/`. Kein Merge und kein
   Cherry-Pick entfernt sie; das muss von Hand passieren, und zwar über beide Pfade. Wer
   nur `mobile/assets/fonts/PPFrama*.otf` löscht, hat danach immer noch vier Dateien mit
   „Free for Personal Use"-Lizenz im öffentlichen Repo — das Lizenzproblem ist dann nicht
   halb gelöst, sondern gar nicht.
5. **Die `.gitignore` schrumpft.** Die Fassung aus `b2c6a2d` ersetzt
   `mobile/assets/fonts/*.otf` + `*.ttf` durch das einzelne Muster
   `mobile/assets/fonts/PPFrama*.otf`. Der TTF-Teil ist gewollt (die OFL-Schriften sollen
   committet werden), der OTF-Teil nicht: Künftige, anders benannte OTFs sind danach nicht
   mehr abgedeckt. Und alle drei Muster tragen ein Pfadpräfix, erfassen den
   Android-Font-Ordner also **prinzipbedingt nicht** — genau die Lücke, durch die die vier
   Android-Kopien überhaupt erst ins Repo kamen. Ein Merge verlängert sie.
6. **`c00fe53` würde ein zweites Mal auftauchen.** Der Cherry-Pick hat eine neue
   Commit-ID; Git erkennt die Gleichheit beim Merge nicht automatisch. Ein Merge
   bedeutete also, 196 Dateien noch einmal gegen ihre eigene, bereits konfliktbereinigte
   Fassung zu mergen — darunter `server/routes/index.ts`, wo `main` `GET /config/:slug`
   bewusst entfernt hat. Genau diese Entfernung würde wieder in Frage gestellt.

**Nicht** brechen würden: `03b3e56`, `b2c6a2d`, `e8b6954` — nachgerechnet, in dieser
Reihenfolge, null Konflikte.

---

## 5. Der Font-Widerspruch: zwei Schritte oder ein Rückschritt?

Die Frage lautete, ob `b2c6a2d` (Familjen Grotesk) und `e8b6954` (Bricolage Grotesque)
einander widersprechen. Der Blick in `mobile/src/theme/fonts.ts` auf dem Branch beantwortet
das eindeutig: **Es sind zwei Schritte derselben Entscheidung, und der zweite baut auf dem
ersten auf.**

Der Stand nach `e8b6954`:

```ts
export const fontAssets = {
  "BricolageGrotesque-Display": require("../../assets/fonts/BricolageGrotesque-Display.ttf"),
  "BricolageGrotesque-Text":    require("../../assets/fonts/BricolageGrotesque-Text.ttf"),
  "FamiljenGrotesk-Italic":     require("../../assets/fonts/FamiljenGrotesk-Italic.ttf"),
} as const;
```

Und in `typography.ts`:

```ts
export const fontFamily = {
  display:       "BricolageGrotesque-Display",
  displayItalic: "FamiljenGrotesk-Italic",
  text:          "BricolageGrotesque-Text",
  textItalic:    "FamiljenGrotesk-Italic",
} as const;
```

Es ist ein **Hybrid**. Die Begründung steht im Code und ist stichhaltig: Bricolage
Grotesque hat echte optische Größen (Display opsz 36 / Text opsz 14), aber **keine
Kursive** und keine `ital`-Achse — und iOS neigt Custom-Fonts nicht synthetisch. Damit die
Signatur-Schrägstellung erhalten bleibt („Café Goldstück", zitierte KI-Entwürfe), bleiben
die kursiven Rollen bei Familjen Grotesk Italic.

Daraus folgen drei Dinge:

- **`b2c6a2d` ist Voraussetzung für `e8b6954`**, nicht sein Vorgänger im Sinne von
  „überholt". Die Datei `FamiljenGrotesk-Italic.ttf` kommt aus `b2c6a2d` und wird nach
  `e8b6954` weiterhin gebraucht. Wer nur `e8b6954` nimmt, bekommt eine kaputte Referenz.
- **Die eigentliche Entscheidung ist dieselbe**: weg von der nicht redistributierbaren
  PP Frama, hin zu SIL-OFL-Schriften. `e8b6954` verfeinert nur das Ergebnis.
- **`FamiljenGrotesk-Regular.ttf` bleibt absichtlich liegen** — der Kommentar sagt, wozu:
  „Zurück zu Familjen: alle vier Namen unten auf `FamiljenGrotesk-Regular`/`-Italic`."
  Ein bewusst offen gelassener Rückweg, kein vergessener Rest.

Einziger Vorbehalt: Der Kommentar nennt Bricolage „aktuell in Erprobung". Ob die Erprobung
abgeschlossen ist, kann ich nicht feststellen — das weiß nur der Autor. Falls nicht:
`b2c6a2d` allein ist ein vollständiger, in sich geschlossener Stand.

---

## 6. Empfehlung, Commit für Commit

| Commit | Empfehlung | Begründung in einem Satz |
|---|---|---|
| `c00fe53` | **erledigt** | Vollständig als `a235db7` übernommen, nichts offen. |
| `03b3e56` Billing | **übernehmen** | Behebt einen heute noch auf `main` stehenden Defekt mit Geld- und Rechtsbezug, konfliktfrei. |
| `1851367` CI | **verwerfen — eine Rosine herauspicken** | `main`s CI ist besser; wertvoll ist allein der Job `mobile-typecheck` (15 Zeilen, von Hand anhängen). |
| `076de13` CI-Fix | **verwerfen — eine Rosine herauspicken** | CI-Teil überholt; wertvoll ist allein `JSX.Element` → `ReactElement` in `InboxScreen.tsx` (eine Zeile). |
| `b2c6a2d` Familjen | **übernehmen, mit Nacharbeit** | Einzige Auflösung der Font-Lizenz; danach die **acht** PP-Frama-OTFs aus **beiden** Verzeichnissen per `git rm` entfernen und die `.gitignore` nicht schrumpfen lassen. |
| `e8b6954` i18n + Bricolage | **gesondert entscheiden** | Technisch konfliktfrei und sauber gemacht; die Frage ist eine Produktfrage („soll die App DE/EN können, soll Bricolage bleiben"), keine Merge-Frage. |
| `66c254d` Datenschutz | **verwerfen — Text von Hand nachtragen** | 38 Konfliktblöcke für fünf fehlende Absätze, und die Branch-Fassung verlöre `canonicalPath`. |

**Der Branch selbst kann nach dieser Übernahme gelöscht werden** — dann steckt alles
Wertvolle auf `main`. Solange das nicht passiert ist, sollte er stehen bleiben: Er ist der
einzige Ort, an dem die OFL-Schriftdateien existieren.

---

## 7. Reihenfolge und erwarteter Aufwand

Die Reihenfolge ist nicht beliebig — siehe Abschnitt 5.

| # | Schritt | Wie | Konflikte | Aufwand |
|---|---|---|---|---|
| 1 | `03b3e56` Billing | `git cherry-pick 03b3e56` | keine (nachgerechnet) | Minuten |
| 2 | `b2c6a2d` Familjen | `git cherry-pick b2c6a2d` | keine (nachgerechnet) | Minuten |
| 2a | PP-Frama-OTFs entfernen — **alle acht, beide Pfade** | `git ls-files -z '*PPFrama*.otf' \| xargs -0 git rm` (siehe Kasten unten) | — | Minuten; erst nach Schritt 3, falls dieser kommt |
| 2b | `.gitignore` nicht schrumpfen lassen | Muster **ohne** Pfadpräfix setzen (greift dann auch in `mobile/android/…` und `mobile/ios/…`), nicht `mobile/assets/fonts/PPFrama*.otf`. Vorher prüfen — im Arbeitsbaum ist das beim Schreiben bereits so gelöst, nur noch nicht committet | — | Minuten |
| 3 | `e8b6954` i18n + Bricolage | `git cherry-pick e8b6954` | keine, **nur nach 1 und 2** | Minuten für den Pick, aber vorher die Produktentscheidung |
| 4 | JSX-Fix | eine Zeile in `mobile/src/features/inbox/InboxScreen.tsx`, dazu `import type { ReactElement }` | — | Minuten |
| 5 | Mobile-CI-Job | Job `mobile-typecheck` aus `076de13:.github/workflows/ci.yml` in `main`s `ci.yml` einfügen | keine, wenn kein Cherry-Pick | ~15 Minuten |
| 6 | Datenschutz-Absätze | fünf Absätze aus `66c254d:client/pages/Datenschutz.tsx` per Hand in die Datei auf `main` | — | ~30 Minuten, rechtlicher Blick empfohlen |

**Nachgerechnete Grundlage für die Schritte 1–3:** Der kumulative Dreiwege-Merge
`03b3e56 → b2c6a2d → e8b6954` gegen HEAD ergab dreimal `exit=0`. Der resultierende Baum
enthält alle drei benötigten Schriftdateien (`BricolageGrotesque-Display.ttf`,
`BricolageGrotesque-Text.ttf`, `FamiljenGrotesk-Italic.ttf`); `fonts.ts` zeigt auf
existierende Pfade.

> **Zu Schritt 2a — erst zählen, dann löschen.**
>
> ```
> git ls-tree -r --name-only main | grep -i ppframa   # was ist committet?
> git ls-files                    | grep -i ppframa   # was liegt im Index?
> ```
>
> Diese Vorlage entstand, während ein **paralleles Arbeitspaket genau diese Dateien
> entfernt**. Beim Schreiben stand die Löschung im Index (0 Treffer), im Commit aber
> weiterhin alle acht — siehe Kasten in Abschnitt 1.3. Der Stand kann jetzt ein anderer
> sein, deshalb vor dem Handgriff zählen:
>
> - **8 committet** → Schritt 2a ist offen und muss beide Verzeichnisse räumen.
> - **0 committet** → Schritt 2a ist erledigt, nichts zu tun.
> - **4 committet** → halbe Arbeit; welche Hälfte fehlt, zeigt die Ausgabe selbst.
>
> Deshalb oben `git ls-files … | xargs git rm` statt eines fest verdrahteten Pfadmusters:
> Das Kommando räumt genau das, was noch da ist, und tut nichts, wenn nichts mehr da ist.
> Der führende `*` im Pathspec ist der Punkt — er greift über Verzeichnisgrenzen hinweg und
> erwischt damit den Android-Pfad mit (gegengeprüft an `git ls-files '*.plist'`, das
> ebenfalls Treffer aus mehreren Verzeichnissen liefert). Ein Muster, das mit
> `mobile/assets/…` beginnt, kann das prinzipbedingt nicht.
> Anschließend die vier Referenzstellen aus Abschnitt 1.3 nachziehen (`fonts.ts`,
> `typography.ts`, `Info.plist`, `project.pbxproj`) — sonst zeigt der Code auf Dateien,
> die es nicht mehr gibt.

**Reihenfolge-Fallen:**

- `e8b6954` **vor** `b2c6a2d` → `fonts.ts` verweist auf fehlende Datei.
- `e8b6954` **vor** `03b3e56` → Konflikt in `AbonnementScreen.tsx`.
- Schritt 2a **vor** Schritt 3 ausführen ist ungefährlich, aber unnötig riskant, falls
  Schritt 3 wegfällt und man doch noch zu Familjen Regular zurück will. Reihenfolge
  einhalten.

**Nach Abschluss zwingend prüfen** (konnte ich hier nicht laufen lassen, weil parallele
Läufe im Gange sind — siehe Abschnitt 8):

- `pnpm run build` — `03b3e56` fasst `Index.tsx` an, und `scripts/prerender.mjs` prüft
  gerenderte Inhalte.
- `pnpm test` — `client/pages/__tests__/ModeSelection.test.tsx` ist der einzige Test, der
  „checkout"/„subscription" überhaupt erwähnt; ein Blick darauf genügt vermutlich.
- `cd mobile && npx tsc --noEmit` — der Test für Schritt 4, und der Grund für Schritt 5.

---

## 8. Parallele Fremdänderungen im Arbeitsbaum

Diese Analyse entstand nicht in einem ruhigen Arbeitsbaum. Mehrere Arbeitspakete liefen
gleichzeitig auf demselben Checkout. Das ist für die Vorlage aus zwei Gründen wichtig: Es
erklärt, warum ich keinen vollen Build und keinen vollen Testlauf gemacht habe, und es
verschiebt die Konfliktrechnung aus Abschnitt 2, sobald diese Änderungen committet sind.

**Momentaufnahme `git status --porcelain`, 04.08.2026, 01:27** — bis auf diese Datei selbst
stammt nichts davon aus der Branch-Analyse:

| Zustand | Dateien |
|---|---|
| geändert (`M`) | `.gitignore` · `check/src/CheckPage.tsx` · `client/pages/CheckLanding.tsx` · `mobile/app.json` · `mobile/app/(tabs)/_layout.tsx` · `mobile/src/components/MaitrTabBar.tsx` · `mobile/src/features/account/AccountScreen.tsx` · `mobile/src/features/reviews/ReviewsScreen.tsx` · **`mobile/src/lib/store.tsx`** · `mobile/src/theme/fonts.ts` · `mobile/src/theme/typography.ts` · `server/routes/users.ts` · `server/services/supabaseStorage.ts` · `vite.config.prerender.ts` |
| gelöscht, vorgemerkt (`D `) | die acht `PPFrama*.otf` aus beiden Font-Verzeichnissen |
| neu (`??`) | `PROGRESS.md` · `docs/BRANCH_ENTSCHEIDUNG.md` (diese Datei) · `docs/store/SCREENSHOTS.md` · `mobile/app/konto-loeschen.tsx` · `mobile/src/features/account/DeleteAccountScreen.tsx` · `server/__tests__/accountDeletion.spec.ts` |

`mobile/src/lib/store.tsx` steht hier fett, weil eine frühere Fassung dieser Vorlage die
Datei in der Aufzählung schlicht vergessen hatte — und sie ist einer der Überschneidungsfälle.

**Sieben dieser Dateien fasst auch einer der offenen Branch-Commits an.** Ermittelt durch
Schnittmenge von `git status --porcelain` mit
`git show --name-only --format="" 03b3e56 1851367 076de13 b2c6a2d e8b6954 66c254d`:

| Datei | wird auch geändert von |
|---|---|
| `.gitignore` | `b2c6a2d` |
| `mobile/src/theme/fonts.ts` | `b2c6a2d` **und** `e8b6954` |
| `mobile/src/theme/typography.ts` | `b2c6a2d` **und** `e8b6954` |
| `mobile/app/(tabs)/_layout.tsx` | `e8b6954` |
| `mobile/src/features/account/AccountScreen.tsx` | `e8b6954` |
| `mobile/src/features/reviews/ReviewsScreen.tsx` | `e8b6954` |
| `mobile/src/lib/store.tsx` | `e8b6954` |

**Was daraus folgt:** Die „null Konflikte" aus Abschnitt 2 und 7 sind gegen den
**Commit-Stand HEAD** gerechnet, nicht gegen diesen Arbeitsbaum. Sobald die obigen
Änderungen committet sind, ist die Rechnung für `b2c6a2d` und `e8b6954` hinfällig und
muss wiederholt werden — die parallele Font-Arbeit fasst mit `fonts.ts` und
`typography.ts` genau die zwei Dateien an, die auch `b2c6a2d` umbaut. Das Kommando ist
dasselbe wie in Abschnitt 2:

```
git merge-tree --write-tree --merge-base=<commit>^ HEAD <commit>
```

Vor jedem Cherry-Pick also erst `git status` leeren (oder abwarten), dann neu rechnen.
Praktisch heißt das: nicht cherry-picken, solange diese Liste nicht leer ist — bei
Überschneidung mit einer der sieben Dateien bräche der Pick sonst mitten im Arbeitsbaum ab.
