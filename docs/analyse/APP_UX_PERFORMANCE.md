# Mobile App: UI/UX und Geschwindigkeit

Stand: 4. August 2026 · Branch `chore/maitr-backend-und-sicherheitsfixes` · Gegenstand: `mobile/`

## Wie diese Erhebung entstanden ist, und was sie nicht ist

Grundlage ist der vollstaendig gelesene Quellcode unter `mobile/app/`, `mobile/src/` und der
mitbenutzte Rechenkern `packages/core/src/analytics/`. Dazu ein Screenshot des laufenden
Simulators (iPhone 16 Pro Max, `233AE651-D95A-40DC-8E86-DF16F400D8FC`) zur Kontrolle des
Start-Screens.

Was **gemessen** wurde: die Kosten der Analytics-Rechnung und die Groesse des persistierten
Zustands — beides in Node 22 / V8 auf dem Mac, **nicht** in Hermes auf einem Geraet. Diese
Zahlen zeigen Groessenordnungen, keine Geraetewerte. Auf Hermes ohne JIT ist mit einem
Vielfachen zu rechnen; wie viel, ist hier nicht belegt.

Was **nicht** gemessen wurde: Frame-Zeiten, Startzeit, Speicherverbrauch. Es lief kein
Profiler, die App durfte nicht neu gestartet werden. Alle Aussagen zu Rendern und Ruckeln
unten sind aus dem Code abgeleitet und als solche gekennzeichnet.

Kontrastwerte sind mit der WCAG-2-Formel aus den Hex-Werten in `mobile/src/theme/colors.ts`
gerechnet und exakt.

---

## 1. Navigation

### Umfang

39 Route-Dateien plus zwei Layouts (`mobile/app/_layout.tsx`, `mobile/app/(tabs)/_layout.tsx`).
Eine davon (`mobile/app/index.tsx:11`) ist nur eine Weiche, bleiben 38 Bildschirme.

| Gruppe | Anzahl | Dateien |
|---|---|---|
| Tab-Leiste sichtbar | 5 | `start`, `bewertungen`, `beitraege`, `wachstum`, `konto` |
| Tab-Gruppe, ohne Eintrag (`href: null`) | 4 | `profil-check`, `kanaele`, `tische`, `gaeste` |
| Anbindungs-Journey | 8 | `mobile/app/journey/*` |
| Gastansicht | 3 | `mobile/app/gast/*` |
| Detail-/Modal-Screens | 12 | `abo`, `autopilot`, `benchmark`, `concierge`, `inbox`, `kampagne`, `konto-loeschen`, `loyalty`, `profil`, `schnell-posten`, `speisekarte`, `onboarding` |
| Dynamische Routen | 4 | `aufgabe/[id]`, `beitrag/[id]`, `kanal/[id]`, `kennzahl/[key]` |
| Login | 1 | `mobile/app/login.tsx` |
| Demo-Verzeichnis | 1 | `mobile/app/demo.tsx` |

### Verschachtelung

Flach. Genau eine Navigator-Ebene (Stack) mit einem Tabs-Navigator darin
(`mobile/app/_layout.tsx:79-92`). Alles andere wird auf denselben Stack gepusht.

Der tiefste Weg im Betreiber-Teil ist drei Schritte von einer Tab-Wurzel:
`konto` → `/kanaele` (`mobile/src/features/account/AccountScreen.tsx:238`) →
`/kanal/[id]` (`mobile/src/features/growth/ChannelsScreen.tsx:53`) →
`/profil` (`mobile/src/features/growth/ChannelDetailScreen.tsx:91`).

Die Journey ist mit sieben Schritten plus Abschluss die einzige lange Kette
(`mobile/src/features/journey/screens.tsx:35,94,159,202,248,389,429`).

### Kernaufgabe „Bewertung beantworten": gezaehlt

Die App startet auf `start` (`mobile/app/(tabs)/_layout.tsx:8`).

**Weg A — Vorschlag vom Start-Screen freigeben: 1 Tipper.**
Die oberste Aufgabenkarte traegt „Freigeben" (`mobile/src/features/start/fixtures.ts:39`,
gerendert in `mobile/src/features/start/StartScreen.tsx:158`). Ein Tipper startet die
Warteschlange; die Antwort geht erst nach 7 s wirklich raus, im Barrierefrei-Modus nach 15 s
(`mobile/src/features/start/StartScreen.tsx:61`).

**Weg B — ueber den Bewertungen-Tab: 2 Tipper.**
Tab „Bewertungen" → „Freigeben" auf der Karte
(`mobile/src/features/reviews/ReviewsScreen.tsx:226`). Wirkt sofort, mit Toast.

**Weg C — Antwort anpassen: 3 bis 4 Tipper.**
Tab oder Start → „Anpassen"/„Bearbeiten" (`ReviewsScreen.tsx:227`,
`mobile/src/features/start/components/TaskCard.tsx:56-61`) → optional ein Ton-Chip
(`mobile/src/features/reviews/ReplyEditorScreen.tsx:87`) → „Auf Google veroeffentlichen"
(`ReplyEditorScreen.tsx:163`).

Das ist kurz. Der Weg ist nicht das Problem.

### Das Problem an dieser Kernaufgabe: zwei Wahrheiten

Weg A und Weg B schreiben in **verschiedene** Zustandsfelder.

- Start-Screen: `commit: () => completeTask(task.id)` (`StartScreen.tsx:68`).
  `completeTask` setzt ausschliesslich `taskDone` (`mobile/src/lib/store.tsx:574-577`).
- Bewertungsliste: `answerReview(review.id, review.author)`
  (`ReviewsScreen.tsx:78`), setzt ausschliesslich `reviewAnswered`
  (`mobile/src/lib/store.tsx:578-589`).

Es gibt keine Verbindung zwischen beiden. Die einzige abgeleitete Kopplung im Store betrifft
die Speisekarte (`mobile/src/lib/store.tsx:1000-1007`).

Folge: Wer auf dem Start-Screen „Freigeben" tippt, sieht die Aufgabe verschwinden — und im
Bewertungen-Tab steht weiterhin „1 wartet auf Antwort" (`ReviewsScreen.tsx:110-116`) mit
demselben unbeantworteten Eintrag. Umgekehrt genauso: Wer im Tab antwortet, findet die
Aufgabe morgen frueh unveraendert auf dem Start-Screen.

Zusatz aus derselben Ecke: `/aufgabe/[id]` bekommt vom Start-Screen eine **Task**-ID
(`StartScreen.tsx:76`, `task_review_marion`), von der Bewertungsliste eine **Review**-ID
(`ReviewsScreen.tsx:149`, `rev_marion`). Der Editor sucht nur nach Review-IDs und faellt
sonst auf den ersten Eintrag zurueck (`ReplyEditorScreen.tsx:45`). Heute steht dort zufaellig
die richtige Bewertung. Bei einer zweiten Bewertungsaufgabe oeffnet der Editor still die
falsche.

---

## 2. Rueckwege und Sackgassen

`<NavHeader />` steht an 23 Stellen im Code — eine davon ist das gemeinsame Journey-Geruest
(`mobile/src/features/journey/JourneyFrame.tsx:57`), das acht Routen bedient. Die fuenf
Tab-Wurzeln brauchen keinen.

**Eine echte Falle: `/tische`.**
Von den vier Unter-Screens der Tab-Gruppe (`profil-check`, `kanaele`, `tische`, `gaeste`) ist
`mobile/src/features/reservations/ReservationsScreen.tsx` der einzige **ohne** `NavHeader`
(zum Vergleich: `GuestsScreen.tsx:58`,
`ProfileCheckScreen.tsx:40`, `ChannelsScreen.tsx:31` haben je einen mit `fallback`).
Gleichzeitig markiert die Tab-Leiste waehrenddessen „Start" als aktiv
(`mobile/src/components/MaitrTabBar.tsx:38-43,64-65`), und ein Tipper auf einen als aktiv
geltenden Tab wird verworfen:

```
const focused = index === activeIndex;
...
if (!focused && !event.defaultPrevented) navigation.navigate(route.name);
```
(`mobile/src/components/MaitrTabBar.tsx:79,88-90`)

Wer aus dem Posteingang auf `/tische` landet (`mobile/src/lib/store.tsx:100`), kommt also
weder ueber einen Zurueck-Pfeil noch ueber die leuchtende Start-Kachel zurueck. Nur ueber
einen der vier anderen Tabs. Dasselbe Muster (aktiver Elterntab reagiert nicht) gilt auch auf
`/gaeste`, `/profil-check` und `/kanaele` — dort fangen die Zurueck-Pfeile es ab.

Kein Dead-End, aber nah dran: `journey/fertig` hat bewusst keinen Rueckweg
(`mobile/src/features/journey/JourneyFrame.tsx:53`), fuehrt aber nach vorn zu `/start`
(`mobile/src/features/journey/screens.tsx:490-496`).

---

## 3. Geschwindigkeit — was im Code sichtbar ist

### 3.1 Listen-Virtualisierung: gar keine

`FlatList`, `SectionList`, `VirtualizedList`, `FlashList`: **null Treffer** in `mobile/`.
Es gibt genau zwei `ScrollView` (`mobile/src/components/ui/Screen.tsx:72`,
`mobile/src/features/start/StartScreen.tsx:138`), alles darin per `.map()`.

Fuer die meisten Listen ist das in Ordnung — 2 Bewertungen, 3 Beitraege, 5 Gaeste, 5
Posteingangseintraege. **Eine** Liste ist unbegrenzt:

`mobile/src/features/menu/MenuScreen.tsx:72-109` rendert die komplette Speisekarte.
Eine reale Karte hat 60 bis 120 Positionen; jede Zeile sind drei `Text` plus ein `Pressable`.
Verschaerfend: die Eingabefelder fuer neues Gericht liegen in derselben Komponente
(`MenuScreen.tsx:32-34`) — jeder Tastendruck rendert die gesamte Liste neu.

Auch `activityLog` waechst unbegrenzt (`mobile/src/lib/store.tsx:539-541`, kein `slice`),
wird aber derzeit nirgends in voller Laenge gerendert.

### 3.2 Animationen: eine laeuft auf dem falschen Thread

| Ort | Treiber | Bewertung |
|---|---|---|
| `mobile/src/components/ui/AnimatedBackground.tsx:52-64` | Reanimated, UI-Thread | in Ordnung; `subtle`-Screens stehen still (`Screen.tsx:52`) |
| `mobile/src/components/OpeningAnimation.tsx:33,34,41` | `useNativeDriver: true` | in Ordnung |
| `mobile/src/components/ui/SwipeToDelete.tsx:41,44,48` | `useNativeDriver: true` | in Ordnung |
| `mobile/src/lib/toast.tsx:31,33` | `useNativeDriver: true` | in Ordnung |
| **`mobile/src/features/start/components/CountdownRing.tsx:34`** | **`useNativeDriver: false`** | **Problem** |

Der Countdown-Ring interpoliert `strokeDashoffset` eines SVG-Kreises ueber die volle
Wartezeit — 7 000 ms, im Barrierefrei-Modus 15 000 ms (`StartScreen.tsx:61,88`). Bei 60 Hz
sind das rund 420 bzw. 900 Zustandsschritte ueber die JS-Bruecke, genau in dem Moment, in dem
der Wirt die naechste Karte antippt oder weiterscrollt. Der Kommentar in Zeile 34 nennt den
Grund richtig (SVG-Props koennen den Native-Driver nicht nutzen) — die Konsequenz ist
trotzdem, dass die einzige Dauer-Animation der App auf dem JS-Thread liegt.

### 3.3 Der Store: eine Aenderung, alle rendern neu

`mobile/src/lib/store.tsx` ist ein einziger React-Context mit rund 50 Feldern. Der Wert wird
in einem `useMemo` gebaut, dessen Abhaengigkeitsliste **jeden** Zustands-Slice enthaelt
(`store.tsx:1009-1113`). Jede Aenderung — ein Haekchen, eine gelesene Nachricht, ein Zeichen
in einem Feld — erzeugt ein neues Kontext-Objekt und rendert alle Verbraucher neu.

Verbraucher: **31 Dateien** rufen `useStore()` (ohne die Definition selbst). Und es gibt
**kein einziges `React.memo`** in `mobile/` — die Neurender laufen ungebremst bis in die
Blaetter durch.

Das schlimmste konkrete Beispiel steht in der Oeffnungszeiten-Zeile:

```
onChangeText={(t) => { setText(t); onChange(id, t, false); }}
```
(`mobile/src/features/growth/ProfileManagementScreen.tsx:168-172` → `updateHour`,
`store.tsx:641-648`)

Jeder Tastendruck: neues `venueProfile` → neuer Kontext-Wert → alle montierten Verbraucher rendern
→ **und** der Persistenz-Effekt laeuft (`store.tsx:955-992`) und schreibt den kompletten
Schnappschuss nach AsyncStorage.

Gemessene Schnappschuss-Groesse im Seed-Zustand: **4 704 Zeichen / 4 762 Bytes**;
`JSON.stringify` selbst kostet 0,009 ms (V8, n=1000) und ist damit nicht das Problem — der
Bruecken- und Plattenzugriff pro Tastendruck ist es. Der Schnappschuss waechst mit der
Nutzung, weil `activityLog`, `posts` und `guests` nur wachsen.

Die anderen Textfelder sind sauber gebaut (lokaler State, Schreiben erst beim Speichern:
`ProfileManagementScreen.tsx:32-40`) — nur die Oeffnungszeiten nicht.

### 3.4 Teure Berechnungen ohne Memoisierung

`mobile/src/lib/analytics.ts:163-185` baut bei jeder Aenderung von `guests`,
`reviewAnswered`, `profileDone`, `menu` oder `venueProfile` ein Dataset neu: 280
Reichweite-Punkte (56 Tage × 5 Stunden, `analytics.ts:97-111`), 62 Reservierungen
(`analytics.ts:115-131`), 8 Bewertungen. Jeder Punkt erzeugt ein `Date` und einen
`toISOString()`-Aufruf (`analytics.ts:32-36`).

Zwei Stellen darauf sind unguenstig:

1. **Doppelbau auf dem Wachstum-Screen.** `GrowthScreen.tsx:36` und die darin gerenderte
   `InsightsSection.tsx:25` rufen beide `useVenueDataset()` — zwei getrennte `useMemo`,
   also zweimal dieselbe Rechnung.
2. **`buildInsights` ganz ohne Memo.** `InsightsSection.tsx:29-32` ruft
   `analytics.buildInsights(dataset)` bei **jedem** Render auf, auch wenn sich nur
   `collapsed` oder `dismissed` geaendert hat.

Messung (Node 22 / V8, MacBook — nicht Hermes):

```
engagement-Punkte: 280, reservations: 62
buildDataset:                 0,256 ms/Aufruf (n=200)
analytics.buildInsights:      0,254 ms/Aufruf (n=200)
beides zusammen:              0,517 ms/Aufruf (n=200)
```

Auf dem Desktop ist das nichts. Auf Hermes ohne JIT liegt der Faktor erfahrungsgemaess bei
5 bis 20 — das waere ein halbes bis ganzes Frame-Budget pro Render, mal zwei wegen des
Doppelbaus. Gemessen ist das hier nicht.

### 3.5 Bilder

Es gibt keine `<Image>`-Komponente in der App. Alle Bildflaechen sind SVG-Verlaeufe mit
fester Groesse oder `flex: 1` (`mobile/src/components/ui/Media.tsx:36-81`). Kein
Layout-Sprung durch nachladende Bilder — aber auch noch keine echten Fotos. Sobald echte
Bilder kommen, muss `PhotoTile` seine Masse behalten, sonst entsteht genau hier der Sprung.

### 3.6 Kleinere Punkte

- `AnimatedBackground` baut sein `clouds`-Array bei jedem Render neu
  (`AnimatedBackground.tsx:67-71`), also den kompletten SVG-Baum. Betrifft nur Screens mit
  `animated` (Login, Journey, Onboarding, `subtle`-Unterseiten) — die fuenf Tab-Wurzeln sind
  ausgenommen (`Screen.tsx:47`, `surface="canvas"`).
- `Screen.tsx:57-62` haengt den SVG-Hintergrund erst nach der Navigations-Transition ein.
  Das ist gut geloest und sollte so bleiben.

---

## 4. Wahrgenommene Geschwindigkeit

### 4.1 Der Kaltstart kostet ~2,3 Sekunden Blindzeit

`mobile/src/components/OpeningAnimation.tsx:8-10`: 700 ms Einblenden + 1 800 ms Standzeit +
460 ms Ausblenden = **2 260 ms**, in denen ein deckendes Overlay ueber der App liegt.

Das Overlay traegt `pointerEvents="none"` (`OpeningAnimation.tsx:56`). Es blockiert also
**nicht** die Eingabe — es verdeckt sie nur. Wer waehrend der Animation tippt, loest blind
etwas auf dem Start-Screen darunter aus.

Fuer einen Wirt, der zehnmal am Tag kurz reinschaut, sind das rund 23 Sekunden Wartezeit
pro Tag fuer eine Animation, die er nach dem dritten Mal kennt.

### 4.2 Es gibt keine Ladezustaende — und keinen Sprung, den man sieht

`useDailyBriefing` liefert `loading`, `error` und `refresh`
(`mobile/src/features/start/useDailyBriefing.ts:70`). Der Start-Screen nimmt davon **nichts**:

```
const { briefing, source } = useDailyBriefing(VENUE_ID);
```
(`mobile/src/features/start/StartScreen.tsx:43`)

Was der Nutzer waehrend des Ladens sieht: **sofort die Beispieldaten**
(`useDailyBriefing.ts:24`, Startwert ist `briefingFixture`). Kein Spinner, kein Skeleton.
`ActivityIndicator` kommt in der ganzen App genau einmal vor, und zwar in der
OAuth-Simulation (`mobile/src/features/growth/ChannelDetailScreen.tsx:124`).
`RefreshControl`/`onRefresh`: **null Treffer** — es gibt kein Pull-to-Refresh, und `refresh`
aus dem Hook wird nirgends aufgerufen.

Was der Nutzer danach saehe, wenn die API antwortete: Begruessung, Kennzahlen und
Aufgabenliste tauschen unangekuendigt aus (`useDailyBriefing.ts:49-54`) — moeglicherweise
waehrend der Finger schon ueber „Freigeben" steht.

Heute tritt der Tausch nicht ein, weil nie ein Token gespeichert wird: `persistSession`
(`mobile/src/lib/auth.ts:41`) wird nirgends aufgerufen, der Login setzt nur ein Flag im Store
(`mobile/app/login.tsx:27-30`). Der Request geht also unauthentifiziert an
`/briefing/today` (`packages/core/src/api/index.ts:12`, Route existiert:
`server/maitr/routes.ts:115`) und scheitert. Das Ergebnis steht im Screenshot als
„BEISPIELDATEN · API NICHT VERBUNDEN" (`StartScreen.tsx:198-202`).

Bis dahin laeuft aber ein Request mit 15 s Standard-Timeout
(`packages/core/src/config.ts:53`) — im Simulator gegen `localhost:8080` scheitert er sofort,
gegen eine langsame Railway-Adresse kann er lange offen bleiben, ohne dass der Nutzer je
etwas davon sieht.

### 4.3 Der Start-Screen zeigt ein falsches Datum

`mobile/src/features/start/fixtures.ts:22` setzt `now: "2025-07-16T09:41:00+02:00"`;
`StartScreen.tsx:115` formatiert daraus die Dachzeile. Der Screenshot vom 4. August 2026
zeigt entsprechend „MITTWOCH, 16. JULI". Das Erste, was der Wirt jeden Morgen sieht, ist
ein Datum aus dem Vorjahr.

### 4.4 Was gut geloest ist

- Der Splash bleibt stehen, bis die Schriften geladen sind (`mobile/app/_layout.tsx:19,33`) —
  kein Typografie-Sprung.
- Vor der Hydration wird gar nicht geroutet (`_layout.tsx:78`), sonst blitzte der Login auf.
- Der Fortschrittsbalken zaehlt eine laufende Aktion sofort mit
  (`StartScreen.tsx:102-103`) — die Rueckmeldung kommt vor dem Ergebnis.
- Der Fade am unteren Rand deutet weitere Karten an, statt hart abzuschneiden
  (`StartScreen.tsx:207-217`).

---

## 5. Ueberfluessiges

Gemessen am Produktziel — Google-Profil und Instagram pflegen, Bewertungen beantworten —
tragen die folgenden Routen nichts bei:

| Route | Datei | Warum ueberfluessig |
|---|---|---|
| `/demo` | `mobile/app/demo.tsx` (151 Zeilen) | Screen-Verzeichnis fuer Vorfuehrungen. Einstieg sitzt im Konto (`AccountScreen.tsx:272-278`), also im Produkt sichtbar. |
| `/gast/profil`, `/gast/reservieren`, `/gast/bestaetigung` | `mobile/app/gast/*` (3 Screens, ~570 Zeilen) | Die **Gast**-Ansicht in der **Betreiber**-App. Von ausserhalb der Demo nur ueber `/demo` erreichbar (einziger Verweis: `demo.tsx:44-46`). Gehoert auf die Web-Seite. |
| `/onboarding` | `mobile/app/onboarding.tsx` | Verwaist. Einziger eingehender Verweis ist `demo.tsx:38`. Inhaltlich eine zweite, kuerzere Einrichtung neben der siebenteiligen Journey. |
| `/loyalty` | `mobile/src/features/guests/LoyaltyScreen.tsx` | „Stammgast-Pass". Ergebnis der Hauptaktion ist ein Toast (`LoyaltyScreen.tsx:45`). |
| `/kampagne` | `mobile/src/features/growth/CampaignScreen.tsx` | „Auslastung fuellen". Ergebnis: Toast (`CampaignScreen.tsx:49`). |
| `/benchmark` | `mobile/src/features/growth/BenchmarkScreen.tsx` | „Koeln-Index". Vergleichszahlen ohne Handlung. |
| `/tische`, `/gaeste` + `Timeline` | `ReservationsScreen.tsx` (202), `GuestsScreen.tsx` (236), `Timeline.tsx` (231), `Hatch.tsx`, `fixtures.ts` (161) | Reservierungsverwaltung. Rund 900 Zeilen — nach dem Start-Screen der zweitgroesste Block der App — fuer eine Aufgabe, die im Produktziel nicht vorkommt. Der Kommentar in `mobile/app/(tabs)/_layout.tsx:23-26` begruendet, warum die Route bleibt: sie haengt an Posteingang, Demo und Gast-Flow. |

Dazu Attrappen innerhalb bleibender Screens:

- `mobile/src/features/account/AccountScreen.tsx:19-22` und `110-178`: erfundene Rechnungen
  („Juli 2026 · 29,00 €") und eine Visa-Karte „•••• 4242". Ein Wirt, der das sieht, glaubt
  es — oder verliert das Vertrauen, wenn er merkt, dass es erfunden ist.
- `AccountScreen.tsx:202-211`: Schalter „Push taeglich 7:00", lokaler `useState`
  (`AccountScreen.tsx:45`) ohne jede Wirkung.
- 31 Stellen loesen einen Toast als einzige Wirkung aus (`grep toast.show`), darunter
  „Wunsch gesendet — danke!" (`ChannelsScreen.tsx:73`), „Route in Karten oeffnen"
  (`PublicProfileScreen.tsx:128`), „Rechnung als PDF" (`AccountScreen.tsx:170`).
- Der Nachtbar-Modus kostet einen eigenen Screen (`EveningScreen.tsx`, 147 Zeilen), einen
  Knopf im Start-Kopf (`GreetingHeader.tsx:66`) und einen Schalter im Konto
  (`AccountScreen.tsx:181-190`) — sein Zustand wird nicht persistiert
  (`mobile/src/lib/appearance.tsx:30`).

---

## 6. Barrierefreiheit

### Was da ist

141 Zeilen mit `accessibilityLabel`/`Role`/`Hint`/`State`; `accessibilityLabel` allein steht
in 35 Dateien. Die
Basis-Bausteine sind sauber: `PillButton` und `LinkAction` setzen Rolle, Label und
`minHeight: 44` (`mobile/src/components/ui/PillButton.tsx:67-77,110-122`), `ListRow`
ebenfalls (`ListCard.tsx:81,112-116`), `Toggle` traegt `accessibilityRole="switch"` mit
`checked` (`Toggle.tsx:24-26`), `ScoreRing` und `StepDots` sind als `progressbar` mit Werten
ausgezeichnet (`DataDisplay.tsx:113-115`, `Progress.tsx:20-22`).

Dynamic Type: `Text` setzt `allowFontScaling` mit Deckel 1.8
(`mobile/src/components/ui/Text.tsx:46-47`) — der Text waechst also mit der Systemgroesse.

### Kontraste (WCAG 2, aus `mobile/src/theme/colors.ts` gerechnet)

| Paarung | Verhaeltnis | AA (4,5:1) |
|---|---|---|
| hell `textPrimary` auf `canvas` | 12,72:1 | ja |
| hell `textSecondary` auf `canvas` | 4,89:1 | ja |
| **hell `textMuted` auf `canvas`** | **3,78:1** | **nein** |
| hell `textMuted` auf `surface` | 4,24:1 | nein |
| **hell `textFaint` auf `canvas`** | **2,57:1** | **nein, auch unter 3:1** |
| hell `textFaint` auf `surface` | 2,89:1 | nein, auch unter 3:1 |
| **hell `success` auf `canvas`** | **2,84:1** | **nein, auch unter 3:1** |
| hell `primary` auf `canvas` | 4,48:1 | knapp nein |
| weiss auf `primary` | 5,14:1 | ja |
| `ratingStar` auf `surface` | 2,09:1 | nein (dekorativ, hat Label) |
| Media-Bildunterschrift `#B0A490` auf `honey` | 1,80:1 | nein |
| dunkel `textMuted` auf `surface` | 4,28:1 | nein |
| dunkel `textMuted` auf `surfaceSunken` | 3,84:1 | nein |
| dunkel `primary` (Mint) auf `canvas` | 8,47:1 | ja |

Zur Einordnung:

- `textMuted` ist die **Standardfarbe von `Eyebrow`** (`mobile/src/components/ui/Eyebrow.tsx:8`),
  also fast jeder kleinen Metazeile der App, bei 10,5 px
  (`mobile/src/theme/typography.ts:102-108`). Bei dieser Groesse gilt die 4,5:1-Schwelle,
  nicht die 3:1-Schwelle fuer grossen Text.
- `textFaint` (2,57:1) traegt u. a. den Hinweis „BEISPIELDATEN · API NICHT VERBUNDEN"
  (`StartScreen.tsx:198`), die Zeitangaben im Posteingang (`InboxScreen.tsx:100`) und alle
  Chevrons (`GrowthScreen.tsx:187`).
- `success` (2,84:1) traegt die Veraenderungszeile „▲ +18 % vs. Juni" in den Kennzahlkacheln
  bei 10 px (`DataDisplay.tsx:29-35`).
- Der Barrierefrei-Modus hebt `textMuted` auf `textSecondary` und `textFaint` auf den alten
  `textMuted` (`mobile/src/theme/ThemeProvider.tsx:53-55`). Damit erreicht `textMuted` AA —
  `textFaint` landet bei 3,78:1 und bleibt **auch dann unter AA**.

### Tippziele

Ueberwiegend in Ordnung: `PillButton` 44 (`PillButton.tsx:77`), `LinkAction` 44
(`PillButton.tsx:118`), `ListRow` 44 (`ListCard.tsx:81`), Kennzahlkachel 58
(`StatRow.tsx:88`), Toggle 44×26 mit `hitSlop: 10` (`Toggle.tsx:26-29`), Tab 64 hoch
(`MaitrTabBar.tsx:142,153`), Zurueck-Pfeil 40×40 mit `hitSlop: 12` (`NavHeader.tsx:53-59`).

Zu klein: die Blaetter-Pfeile in `ScreenHeader` — 26 breit × 38 hoch mit `hitSlop: 8`, macht
42 × 54 effektiv (`mobile/src/components/ui/ScreenHeader.tsx:92-95`). Zwei Pixel unter der
Norm, und sie stehen direkt nebeneinander.

### Weitere Befunde

1. **Der Barrierefrei-Modus ueberlebt den Neustart nicht.** `accessibleMode` liegt in einem
   lokalen `useState` (`mobile/src/lib/appearance.tsx:31`) und steht nicht im persistierten
   Schnappschuss (`store.tsx:958-974`). Wer erhoehten Kontrast braucht, muss ihn nach jedem
   Kaltstart neu einschalten. Dasselbe gilt fuer den Nachtbar-Modus.
2. **Rohe `TextInput` skalieren unbegrenzt.** `mobile/app/login.tsx:73`,
   `MenuScreen.tsx:121,129`, `ReplyEditorScreen.tsx:129`,
   `ProfileManagementScreen.tsx:76,81` uebernehmen `theme.text.body` ohne
   `maxFontSizeMultiplier`. Bei grosser Systemschrift sprengen sie ihre Rahmen, waehrend
   alles daneben bei 1.8 gedeckelt ist.
3. **Tab-Beschriftungen brechen bei grosser Schrift ab.** `numberOfLines={1}` bei 9,5 px
   (`MaitrTabBar.tsx:120,163`). Der Kommentar in Zeile 116-119 nennt den Grund; VoiceOver
   liest weiterhin das volle Label, sehende Nutzer mit 200 % Systemschrift sehen
   „Bewertunge…".
4. **Zwei identische Knopfbeschriftungen ohne Kontext.** In `ReviewsScreen.tsx:226-227`
   traegt jede Karte „Freigeben" und „Anpassen" ohne `accessibilityHint`. VoiceOver liest
   viermal dasselbe, ohne zu sagen, um wessen Bewertung es geht. Die Aufgabenkarten auf dem
   Start-Screen machen es richtig vor (`TaskCard.tsx:53,59`).
5. `ReviewsScreen.tsx`, `ReservationsScreen.tsx` und `PostsScreen.tsx` setzen kein einziges
   eigenes `accessibilityLabel` (je 0 Treffer). Das ist meist unschaedlich, weil die
   Basis-Bausteine ihre eigenen mitbringen — ausser im Fall aus Punkt 4.

---

## 7. Was zu tun waere, nach Wirkung sortiert

Reihenfolge: was der Wirt zuerst merkt, steht oben.

### 1. Start-Freigabe und Bewertungsliste auf eine Wahrheit legen · Aufwand klein

Das ist kein Geschwindigkeitsproblem, sondern das groesste Erlebnisproblem der Kernaufgabe.
`StartScreen.tsx:68` ruft nur `completeTask`. Die `DailyTask` braucht eine Referenz auf die
Bewertung (Feld `entityId` in `packages/core/src/types`), und der Store eine Aktion, die
beides setzt — analog zur bestehenden Ableitung fuer die Speisekarte
(`store.tsx:1000-1007`). Damit verschwindet gleichzeitig der Zufallsfall in
`ReplyEditorScreen.tsx:45`.

**Betroffen:** `mobile/src/features/start/StartScreen.tsx`, `mobile/src/lib/store.tsx`,
`packages/core/src/types/index.ts`, `mobile/src/features/reviews/ReplyEditorScreen.tsx`.

### 2. Eroeffnungsanimation kuerzen · Aufwand klein

`OpeningAnimation.tsx:8-10`: `HOLD` von 1 800 ms auf 400 ms, `ENTER` auf 350 ms, `FADE_OUT`
auf 250 ms — macht rund 600 ms statt 2 260 ms. Alternativ: nur beim ersten Start nach
Installation abspielen (Flag im gleichen `AsyncStorage`-Schluessel wie der Store).
Zusaetzlich `pointerEvents` auf `"auto"` setzen, solange das Overlay deckend ist, damit
Blindtipper nicht durchgehen (`OpeningAnimation.tsx:56`).

### 3. Countdown-Ring vom JS-Thread nehmen · Aufwand mittel

`CountdownRing.tsx` durch eine Reanimated-Variante ersetzen: entweder `useAnimatedProps` auf
den SVG-Kreis (wie es `AnimatedBackground.tsx:113-116` schon vormacht) oder — einfacher — den
Ring durch einen kurzen Balken mit `transform: scaleX` ersetzen, der ueber
`useAnimatedStyle` laeuft. Reanimated ist bereits Abhaengigkeit. Danach kostet die 7- bis
15-Sekunden-Animation keine JS-Frames mehr, genau waehrend der Wirt weiterarbeitet.

### 4. Ladezustand und Aktualisieren am Start-Screen · Aufwand klein

`StartScreen.tsx:43` auf `const { briefing, source, loading, refresh } = useDailyBriefing(...)`
erweitern und:
- bei `loading && source === "fixture"` drei graue Platzhalterkarten statt der Fixture-Karten
  zeigen (die Karten haben feste Hoehen, ein Skeleton springt also nicht),
- `refresh` an einen `RefreshControl` des `ScrollView` (`StartScreen.tsx:138`) haengen,
- das Datum bei `source === "fixture"` aus `new Date()` statt aus `briefing.now`
  formatieren (`StartScreen.tsx:115,286`), damit nicht „16. Juli 2025" im Kopf steht.

### 5. Analytics einmal rechnen statt zweimal, und memoisiert · Aufwand klein

- `analytics.buildInsights(dataset)` in `InsightsSection.tsx:29` in ein
  `useMemo([dataset, limit])` legen.
- `useVenueDataset` hinter einen eigenen kleinen Provider legen (oder im `AppStateProvider`
  mitliefern), damit `GrowthScreen` und `InsightsSection` dasselbe Objekt bekommen statt
  zweier `useMemo`-Instanzen. Betrifft ausserdem `QuickPostScreen.tsx:43`,
  `CampaignScreen.tsx:29`, `GuestsScreen.tsx:37`, `AbonnementScreen.tsx:70`.

Gemessene Ersparnis auf V8: ~0,77 ms pro Wachstum-Render. Auf Hermes vermutlich deutlich
mehr — ungemessen.

### 6. Persistenz entprellen und Oeffnungszeiten lokal halten · Aufwand klein

- `store.tsx:955-992`: den `AsyncStorage.setItem`-Aufruf mit 300–500 ms `setTimeout`
  entprellen (Timer im `useRef`, beim naechsten Lauf loeschen). Dann werden aus 20
  Tastendruecken ein Schreibvorgang statt 20.
- `ProfileManagementScreen.tsx:168-172`: `onChange` nicht bei jedem Zeichen rufen, sondern
  in `onBlur` — dieselbe Datei macht es bei Name/Bio/Tagline bereits so
  (`ProfileManagementScreen.tsx:32-40`).
- `store.tsx:539-541`: `activityLog` auf die letzten 50 Eintraege deckeln, damit der
  Schnappschuss nicht unbegrenzt waechst.

### 7. Speisekarte virtualisieren und Eingabe entkoppeln · Aufwand mittel

`MenuScreen.tsx` ist die einzige Stelle mit einer unbegrenzten Liste. Zwei Schritte:
- das Formular („Neues Gericht", `MenuScreen.tsx:112-143`) in eine eigene Komponente ziehen,
  damit Tastendruecke nicht die Liste neu rendern;
- die Liste auf `FlatList` mit `ListHeaderComponent`/`ListFooterComponent` umstellen, statt
  sie in den `ScrollView` von `Screen.tsx:72` zu haengen. Das erfordert, `Screen` in diesem
  einen Fall mit `scroll={false}` zu verwenden — genau so, wie es `StartScreen.tsx:113`
  schon tut.

### 8. Sackgasse `/tische` schliessen · Aufwand klein

Zwei unabhaengige Fixes, beide sinnvoll:
- `ReservationsScreen.tsx` einen `<NavHeader fallback="/start" />` geben, wie ihn
  `GuestsScreen.tsx:58` hat.
- In `MaitrTabBar.tsx:79,88-90` `focused` (Darstellung) von „ist der aktuelle Screen"
  (Navigation) trennen: der Elterntab darf leuchten, muss aber trotzdem navigieren, wenn der
  aktuelle Screen ein Unter-Screen ist.

### 9. Barrierefreiheit nachziehen · Aufwand klein bis mittel

- `accessibleMode` und `nightMode` in den persistierten Schnappschuss aufnehmen
  (`appearance.tsx` + `store.tsx:958-974`). Klein, und die Wirkung fuer Betroffene ist gross.
- `textFaint` im Barrierefrei-Modus auf `textSecondary` heben statt auf `textMuted`
  (`ThemeProvider.tsx:53-55`) — dann erreicht auch die schwaechste Rolle AA.
- `success` fuer die 10-px-Deltazeile abdunkeln oder die Zeile auf `textSecondary` mit
  gruenem Pfeil umstellen (`DataDisplay.tsx:29-35`).
- `maxFontSizeMultiplier={1.8}` auf alle rohen `TextInput` setzen (6 Stellen, siehe oben).
- `accessibilityHint` in `ReviewsScreen.tsx:226-227` nachziehen (der Autor steht im Objekt).
- `ScreenHeader`-Pfeile auf 44 breit oder `hitSlop: 10` (`ScreenHeader.tsx:92-95`).

### 10. Store aufteilen · Aufwand gross

Der grosse Umbau, bewusst zuletzt: solange Punkt 6 die Schreiblast nimmt und Punkt 5 die
Rechenlast, ist der Einzel-Context ertraeglich. Wenn die Screens wachsen, wird er es nicht
bleiben — 31 Verbraucher-Dateien, kein `React.memo`, ein Objekt fuer alles
(`store.tsx:1009-1113`). Zwei Wege:
- (a) Slices in getrennte Contexts trennen: Session / Inhalte (Posts, Reviews, Profil) /
  Reservierungen / Einstellungen. Screens abonnieren nur, was sie brauchen.
- (b) `useSyncExternalStore` mit Selektoren, dann rendert nur, wessen Selektor sich aendert.

Vorher lohnt sich eine echte Messung mit dem React-Profiler auf dem Geraet — die Zahlen
hier reichen fuer die Diagnose, nicht fuer die Priorisierung dieses Umbaus.

### 11. Ausduennen · Aufwand klein, Entscheidung nicht

Ausserhalb der Technik, aber der Nutzer hat „keine unnoetigen Sachen" verlangt: `/demo` +
Einstieg im Konto, die drei `/gast/*`-Screens, `/onboarding`, `/loyalty`, `/kampagne`,
`/benchmark` — acht von 39 Routen, keine davon berührt Google-Profil, Instagram oder
Bewertungen. Dazu die erfundenen Rechnungen und die Visa-Karte in
`AccountScreen.tsx:19-22,110-178` und der wirkungslose Push-Schalter
(`AccountScreen.tsx:202-211`). Das Loeschen selbst ist trivial; die Frage, was davon fuer
Vorfuehrungen gebraucht wird, ist eine Produktentscheidung und keine technische.

---

## Offene Punkte

- Alle Perf-Aussagen sind aus dem Code abgeleitet. Es lief kein React-Profiler und kein
  Hermes-Sampling. Die beiden Messungen (Analytics, Schnappschuss) stammen aus Node 22 auf
  dem Mac und uebertragen sich nicht 1:1 auf das Geraet.
- Ob der Countdown-Ring auf einem realen aelteren iPhone tatsaechlich Frames verliert, ist
  nicht nachgewiesen — nur, dass er der einzige Kandidat dafuer ist.
- Die Sackgasse `/tische` ist aus `MaitrTabBar.tsx:79,88-90` hergeleitet, nicht im Simulator
  nachgetippt (die App durfte nicht angefasst werden).
- Ob `expo-router/js-tabs` die Unter-Screens der Gruppe montiert haelt, wenn man den Tab
  wechselt (und damit wie viele Screens gleichzeitig auf Store-Aenderungen reagieren), ist
  nicht geprueft. Das entscheidet mit, wie schwer Punkt 10 wiegt.
