# Technische Innovation: was ist hier wirklich eigenstaendig?

Stand: 2026-08-04, Branch `chore/maitr-backend-und-sicherheitsfixes`. Kein
Quellcode geaendert; nur gelesen, gezaehlt und einzelne Tests ausgefuehrt.

Die Frage ist nicht, ob der Code gut ist. Die Frage ist: Was koennte ein
Wettbewerber mit einem Entwickler **nicht** in zwei Wochen nachbauen?

---

## Kurzfassung

**Nichts im untersuchten Umfang ist in zwei Wochen unerreichbar.** Den
staerksten Beleg liefert die eigene Versionsgeschichte. Der gesamte
Auto-Konfigurator-Strang — `shared/menuParser.ts`, `shared/siteDetails.ts`,
`shared/openingHours.ts`, `shared/reservation.ts`,
`server/services/menuExtraction.ts` und `server/services/ocr/*`, zusammen
**2.380 Zeilen** — ist an drei Kalendertagen entstanden:

```
$ git log --format="%ad %h" --date=short -- shared/menuParser.ts
2026-07-31 8664190
2026-07-29 309d222
$ git log --format="%ad %h" --date=short -- shared/openingHours.ts shared/reservation.ts
2026-07-31 f34cd70
$ git log --format="%ad %h" --date=short -- server/services/ocr
2026-07-29 edb4330
2026-07-29 ee58797
2026-07-29 c4fd4de
```

29. bis 31. Juli 2026. Wer das in drei Tagen baut, dem baut es ein anderes Team
in zwei Wochen nach. Das ist keine Kritik am Code, sondern die Antwort auf die
gestellte Frage.

Was nicht in zwei Wochen zu haben ist, ist auch kein Code: das Wissen, woran
eine Erkennung an echten Karten scheitert. Davon steckt hier etwas drin — aber
weniger, als die Kommentare nahelegen. Es stammt nachweisbar aus **einem**
Betrieb (kleiner-kiepenkerl.de) und einem n8n-Lauf (Nr. 632, zitiert in
`shared/siteDetails.ts:3-12`). Alle Testeingaben sind von Hand nachgebaute
Beispiele, keine archivierten Echtausgaben.

Zweiter Befund, der die Innovationsfrage relativiert: Ein spuerbarer Teil der
Analytics-Schicht ist **gebaut, aber nicht angeschlossen**. Der Praesenzscore,
den `packages/core/src/analytics/presence.ts:1-7` ausdruecklich als Ersatz fuer
„die frueher feste 64" beschreibt, erscheint in der App nirgends; dort rechnet
weiterhin `64 + Punkte` (`mobile/src/features/growth/profileScore.ts:26,32-38`,
angewandt in `mobile/src/features/start/StartScreen.tsx:49`). Was nicht laeuft,
kann kein Vorsprung sein.

---

## Methode und ihre Grenzen

Gelesen: die genannten Dateien vollstaendig. Gezaehlt: Zeilen (mit/ohne
Kommentar), Tests, Aufrufer per repo-weitem `grep`, Entstehungsdaten per
`git log`. Ausgefuehrt (Einzelmessungen):

```
npx vitest run shared/menuParser.spec.ts shared/siteDetails.spec.ts \
    shared/openingHours.spec.ts shared/reservation.spec.ts
→ 4 Dateien, 111 Tests, alle gruen, 2,34 s

npx vitest run server/__tests__/ocrChain.spec.ts server/__tests__/menuExtraction.spec.ts
→ 2 Dateien, 43 Tests, alle gruen, 2,55 s
```

**Was ich nicht pruefen konnte:**

- Die Erkennungsguete an echten Karten. Es gibt keinen Pruefkorpus im Repo
  (`find` nach `fixtures` ausserhalb `node_modules` liefert nur die Demo-Daten
  der App). Jede Trefferquote waere erfunden.
- Ob die Analytics-Schicht je mit echten Google-/Meta-Daten gelaufen ist. Kein
  Datenbankzugriff, keine Produktionsmessung.
- Einzelne Anbieterangaben im OCR-Code (siehe Abschnitt 4 — dort steht
  ausdruecklich, was ich belegt habe und was nicht).

---

## 1. `packages/core/src/analytics/` — Formelsammlung, keine Methode

### Was da steht (gezaehlt)

| Datei | Zeilen | ohne Kommentar/Leerzeile | Inhalt |
|---|---:|---:|---|
| `insights.ts` | 152 | 122 | Auswahl und Texte der Erkenntnisse |
| `presence.ts` | 105 | 87 | fuenf gewichtete Faktoren, tabellengetrieben |
| `reviews.ts` | 77 | 55 | Schnitt, 30/30-Trend, Antwortquote, Themen |
| `math.ts` | 75 | 50 | Wilson-Schranke, lineare Regression, Helfer |
| `timing.ts` | 71 | 49 | Wochentag×Stunde-Matrix, Zwei-Stunden-Fenster |
| `guests.ts` | 78 | 46 | Segmente, Churn, No-Show, LTV |
| `text.ts` | 45 | 28 | sieben Themen-Stichwortlisten |
| `roi.ts` | 43 | 26 | Gedecke × Ø-Bon × Provisionssatz |
| `forecast.ts` | 30 | 17 | lineare Fortschreibung |
| `types.ts` | 208 | 136 | nur Typen |
| `index.ts` | 25 | 15 | Barrel-Export |
| **Summe** | **909** | **631** | |

Ohne `types.ts` und `index.ts` bleiben **480 Zeilen** ausfuehrbarer Code. Davon
tragen rund **70 Zeilen** etwas, das ueber Mittelwert, Sortierung und Dreisatz
hinausgeht:

- `math.ts:44-52` — `smoothedRate`, untere Wilson-Schranke mit z = 1. Verhindert,
  dass „1 von 1 No-Show" als 100 % Risiko durchschlaegt. Neun Zeilen, korrekt
  angewandt, richtig begruendet. Die einzige Stelle mit statistischem Anspruch.
- `math.ts:59-75` — kleinste Quadrate ueber eine gleichverteilte Reihe.
- `guests.ts:25-36` — der einzige eigene fachliche Gedanke: Das
  Abwanderungsrisiko misst nicht „lange nicht da", sondern ob ein Gast seinen
  **eigenen** Besuchsrhythmus reisst (`tenure / visits`, `guests.ts:28`). Wer
  woechentlich kam und 30 Tage weg ist, gilt als gefaehrdet; wer ohnehin nur
  monatlich kommt, nicht. Guter Gedanke, zwoelf Zeilen Dreisatz.
- `timing.ts:23-59` — Heatmap-Aufbau und Uplift gegen den Gesamtdurchschnitt.

Der Rest ist Tabelle und Formulierung. `insights.ts` besteht fast vollstaendig
aus acht Objektliteralen mit Titel-, Detail- und Wirkungstexten. `presence.ts:22-82`
ist eine Faktorentabelle mit handgesetzten Gewichten (0,3 / 0,2 / 0,25 / 0,15 /
0,1) und handgesetzten Schwellen: 3,0★ als Boden (`presence.ts:30-31`), vier
frische Bewertungen im Monat als „voll" (`presence.ts:66`), 5.000 Aufrufe als
starke Reichweite (`presence.ts:79`). Nichts davon ist validiert; andere Gewichte
waeren gleich gut begruendbar, und niemand koennte den Unterschied belegen.

`text.ts:20-28` ist Themenerkennung ueber sieben Schlagwortlisten mit
Substring-Treffer (`text.ts:40-42`). Die Datei sagt es selbst: „Kein echtes NLP"
(`text.ts:4`). Das Sentiment kommt nicht aus dem Text, sondern aus dem
Sterneschnitt der treffenden Bewertungen (`reviews.ts:22-24`) — ehrlich, aber es
heisst nur: „Bewertungen mit dem Wort Wartezeit haben im Schnitt weniger Sterne".

**Urteil: Formelsammlung.** Sauber getrennt, rein, abhaengigkeitsfrei, gut
kommentiert — und in einer Woche nachbaubar.

### Fuenf Befunde, die gegen die eigene Darstellung stehen

**a) Die Prioritaet ist keine „Wirkung × Dringlichkeit".**
`insights.ts:7` sagt das so. Im Code gibt es keine Multiplikation zweier
Groessen; alle acht Prioritaeten sind ein handgesetzter Sockel plus ein linearer
Term (Fundstellen in Abschnitt 2).

**b) Der Zeitfenster-Rechner ignoriert die Zeitzone des Betriebs.**
`VenueDataset` traegt ein Feld `timezone` (`types.ts:82`) — es wird von keiner
Analytics-Funktion gelesen; der Bezeichner kommt im ganzen Verzeichnis nur in
dieser einen Zeile vor. `timing.ts:33-34` bestimmt die Stunde ueber
`new Date(point.at).getHours()`, also in der lokalen Zeit des laufenden
Prozesses. Auf einem Server in UTC verschiebt sich „Do 9-11 Uhr" gegenueber
Europe/Berlin um ein bis zwei Stunden. In der App (Geraetezeit) stimmt es, im
Server-Briefing (`server/maitr/briefing.ts:65`) nicht.

**c) Die Themenanalyse wird gerechnet und nirgends gezeigt.**
`reviews.ts:1-8` verkauft das Themen-Extract als „den interessanten Teil"
(„Wartezeit wird 3× kritisch erwaehnt — hier liegt dein naechster Stern").
`extractThemes` hat repo-weit drei Fundstellen: Definition (`reviews.ts:15`),
Aufruf im selben Modul (`reviews.ts:75`), Re-Export (`index.ts:13`).
`reviewAnalytics` wird ausserhalb des Pakets genau einmal benutzt —
`server/maitr/briefing.ts:45`, und dort nur fuer `averageRating`. Kein
Bildschirm rendert Themen.

**d) Weitere unbenutzte Teile.** `forecastSeries` (`forecast.ts:10`) hat ausser
dem Re-Export in `index.ts:24` keinen Aufrufer — die ganze Datei ist tot.
`tokenize` (`text.ts:31`) hat repo-weit keine einzige Verwendung; `matchesTopic`
arbeitet direkt auf dem Rohtext (`text.ts:40-42`), die Stoppwortliste
`text.ts:11-17` ist damit wirkungslos.

**e) Kein einziger Test.** `find packages -name "*.spec.ts" -o -name "*.test.ts"`
liefert nichts. Die Schicht, die Euro-Betraege ausgibt, ist ungeprueft, waehrend
die Parser darunter 111 gruene Tests haben.

### Worauf die Zahlen in der App tatsaechlich beruhen

Alle Analytics-Bildschirme (`InsightsSection`, `GrowthScreen`, `GuestsScreen`,
`QuickPostScreen`, `AbonnementScreen`, `CampaignScreen`) ziehen ihr Dataset aus
`mobile/src/lib/analytics.ts:163-185` — also aus dem Demo-Store plus datierten
Fixtures. Die Reichweite-Zeitreihe kommt aus einer Gewichtsfunktion, deren
Kommentar den Zweck offen benennt (`mobile/src/lib/analytics.ts:89-91`):

> „Donnerstag-Vormittag als staerkstes Fenster - moderat gehalten, damit der
> errechnete Uplift glaubwuerdig bei ~+40 % landet".

Als Demo-Handwerk ist das in Ordnung und ehrlich kommentiert. Es heisst aber:
Das Zeitfenster-Versprechen der App ist ein Ergebnis, das in die Eingabe
hineingelegt wurde. An echten Google-Daten ist es nie gemessen worden.

Weitere Zahlen im Produkt ohne Quelle im Repo: „+35 % Profilaufrufe"
(`insights.ts:42`, feste Zeichenkette), „53 % der Gaeste schauen vorab" und
„Grund Nr. 1 fuer 1★-Bewertungen"
(`mobile/src/features/growth/profileScore.ts:19-20`), und der Provisionssatz von
2,5 % mit der Begruendung „TheFork & Co. nehmen ~2-5 %" (`roi.ts:5-7,14`).
Letzteres habe ich **nicht geprueft** — ich habe keine Quelle dazu abgerufen.
Die gesamte Euro-Ersparnis, mit der die App das Abo rechtfertigt
(`insights.ts:143`, `GrowthScreen`, `AbonnementScreen`), haengt an dieser einen
Konstante.

---

## 2. `server/maitr/briefing.ts` — die drei Entscheidungen

Die Auswahl ist eine Zeile: `buildInsights(dataset).slice(0, 3)`
(`briefing.ts:65`); `buildInsights` sortiert absteigend nach `priority`
(`insights.ts:151`).

**Es ist eine Heuristik mit handgesetzten Konstanten** — und der Wertebereich
macht sie im Alltag zu einer festen Reihenfolge:

| Erkenntnis | Formel | Fundstelle | Band |
|---|---|---|---:|
| Bewertung unbeantwortet | `(negativ ? 90 : 62) − min(alter,7) × (negativ ? 1 : 3)` | `insights.ts:44` | 83–90 / 41–62 |
| Rueckhol-Kandidat | `50 + churnRisk × 30` | `insights.ts:90` | 50–80 |
| No-Show heute | `55 + noShowRisk × 20` (ab 0,4) | `insights.ts:111` | 63–75 |
| Groesster Profil-Hebel | `40 + offenePunkte` (ab 4) | `insights.ts:60` | 44–70 |
| Ruhige Stunden fuellen | `64 + min(stammgaeste,6)` (ab 2) | `insights.ts:131` | 66–70 |
| Bester Beitrags-Slot | `45 + min(uplift,40)/2` (ab 15 %) | `insights.ts:75` | 53–65 |
| ROI des Monats | `30` (konstant) | `insights.ts:146` | 30 |

Daraus folgt: Eine unbeantwortete negative Bewertung steht **immer** oben (83–90
schlaegt jedes andere Maximum). Der ROI-Hinweis mit fester 30 erscheint nur,
wenn weniger als drei andere Kandidaten ausgeloest haben. Insgesamt gibt es
hoechstens neun Kandidaten (drei Bewertungen plus sechs Einzelfaelle) fuer drei
Plaetze. Die Daten verschieben nur innerhalb enger Baender.

Zwei weitere belegbare Punkte:

- Die Unterzeile „Drei Entscheidungen, dann uebernimmt Maitr" ist fest verdrahtet
  (`briefing.ts:63`), waehrend `tasks` null bis drei Eintraege haben kann. Ein neu
  angelegter Betrieb ohne Bewertungen, Gaeste und Reichweite loest nur den
  Profil-Hebel aus (`insights.ts:51`) — eine Aufgabe unter der Ueberschrift
  „Drei Entscheidungen".
- `estimatedMinutes: 2` gilt fuer jede Aufgabe gleich (`briefing.ts:32`), ob
  1★-Antwort oder Foto-Upload.

Handwerklich ist `briefing.ts` (67 Zeilen) richtig gebaut: eine Quelle fuer
Route (`routes.ts:115-131`) und Sync-Job (`sync.ts:124-132`), damit der
`InsightsCache` nicht auseinanderlaeuft. Gute Arbeit, keine Innovation.

**Urteil: Reihenfolge mit Nachkommastellen.** Fuer den Zielnutzer ist das
vermutlich die richtige Bauweise — ein Wirt braucht keine Modellunsicherheit.
Eigenstaendig ist es nicht; das haette man auch ohne Analytics-Schicht
hinschreiben koennen.

---

## 3. Der Auto-Konfigurator — der wertvollste Teil, und trotzdem in Reichweite

| Datei | Zeilen | Code | Tests |
|---|---:|---:|---:|
| `shared/menuParser.ts` | 527 | 302 | 42 |
| `shared/siteDetails.ts` | 377 | 227 | 34 |
| `shared/reservation.ts` | 239 | 146 | 14 |
| `shared/openingHours.ts` | 201 | 119 | 21 |
| `server/services/menuExtraction.ts` | 334 | 259 | 24 |
| `server/services/ocr/` (4 Dateien) | 702 | — | 19 |

154 dieser Tests habe ich ausgefuehrt, alle gruen (siehe Methode).

### Wie viele Sonderfaelle deckt der menuParser? — gezaehlt

42 Tests in acht Bloecken. Die abgedeckten Faelle mit Fundstelle:

| Sonderfall | Code | Test |
|---|---|---|
| „12,-" / „12,–" statt „12,00" | `menuParser.ts:140,154` | Z. 23 |
| Ganze Zahl nur mit Waehrung („€ 12") | `:142` | Z. 30 |
| Nackte Zahl ist **kein** Preis („4 Sorten Kaese") | `:132-134` | Z. 36 |
| Uhrzeit ist kein Preis | `:90,137` | Z. 42 |
| Telefonnummer / PLZ ist kein Preis | `:152-153` | Z. 47 |
| Preisbereich 0,50–300 € | `:34-35,176-179` | Z. 51 |
| Keine Doppelzaehlung mit Waehrungszeichen | `:144-147,164` | Z. 61 |
| Fuehrungspunkte „……… 12,50" | `:96,190` | Z. 68 |
| Allergen-Suffix „(1,2)", „¹²", „*" (3 Durchgaenge) | `:99,196-201` | Z. 73 |
| Mengenreste „0,3l 4,10 0,4l 5,10" | `:186,207-210` | Z. 144 |
| OCR verliest „l" als „1" | `:186` | Z. 144 |
| Zweispaltig: Preis in der Folgezeile | `:460-465` | Z. 251 |
| Beschreibung **zwischen** Name und Preis | `:442-445` | Z. 272 |
| Folgezeile nicht faelschlich als Beschreibung schlucken | `:480-486` | Z. 346 |
| Fliesstext kippt nicht die laufende Kategorie | `:251-271` | Z. 118 |
| Grossbuchstaben-Ueberschrift ohne Stichwort | `:275-282` | Z. 100 |
| Fusszeilen (MwSt., Allergene, Tel., Seitenzahl) | `:79-87` | Z. 306 |
| Doppelte Gerichte zusammenfuehren | `:472-474` | Z. 321 |
| Stabile IDs statt `Date.now()+Math.random()` | `:113-122` | Z. 336 |
| Kategorie am Namen korrigieren, nur ueber Gruppen | `:317-376` | Z. 159-198 |

Dazu 21 Kategoriemuster (`:46-70`), sieben Rauschmuster (`:79-87`), acht
Namensregeln (`:333-342`).

Der inhaltlich klügste Teil ist `refineCategories` (`:358-376`): Eingegriffen
wird nur **quer** ueber die Gruppen Essen / Dessert / Getraenke, nie innerhalb.
Begruendung im Kommentar (`:313-316`): Eine Tomatensuppe unter „Vorspeisen" ist
die Entscheidung des Wirts, ein Kaiserschmarrn unter „Weine" ist ein Fehler.
Diese Unterscheidung setzt voraus, dass jemand echte Karten gesehen hat.

### Wie robust ist die Erkennung wirklich? — offen

Ich kann es nicht sagen, und der Code kann es nicht belegen. Alle Testeingaben
sind **von Hand geschriebene Nachbauten**:

- `menuParser.spec.ts:254-262`: ein siebenzeiliger Textblock als Stellvertreter
  fuer „so sieht eine zweispaltige Karte nach der Texterkennung aus".
- `siteDetails.spec.ts:95-102`: ein selbst formuliertes JSON-LD mit den Daten des
  Kiepenkerl, nicht dessen echtes HTML.

Der einzige belegte Realbezug im ganzen Strang ist dieser eine Betrieb plus
n8n-Ausfuehrung 632 (`siteDetails.ts:3-12`). Die Kommentare in
`siteDetails.ts:132-135` und `:330-334` nennen „fuenf echte Gastronomie-Seiten"
als Messgrundlage — diese Messung ist im Repo nicht abgelegt; ich kann sie weder
bestaetigen noch widerlegen. Ein Parser, der an einer Karte haertet, ist gegen
die zweite ungeschuetzt.

Damit ist der oft behauptete Graben („die Sonderfaelle stammen aus echten
Karten") derzeit ein Graben von **einer** Karte.

### Was daran trotzdem schwer nachzubauen ist

Zwei Dinge, beide keine Algorithmen:

1. **Die Regel „nichts erfinden."** `openingHours.ts:19-22` und `:151-155`: ohne
   erkennbare Tagesangabe wird nichts gesetzt. `hoursQuality` (`:198-201`)
   verwirft Ergebnisse mit weniger als drei Tagen, angewandt in
   `siteDetails.ts:302,343`. `findAddressInText` gibt ohne erkennbare Strasse
   nichts zurueck (`siteDetails.ts:162-164,210-213`) — der Fehlfall „12345
   Gaesten empfangen wir" steht im Kommentar (`:174-176`). `detectReservation`
   liefert lieber `null` als einen Knopf ins Leere (`reservation.ts:214-217`).
   Der Anlass steht im Kopf von `openingHours.ts:1-17`: Der Vorgaenger fuellte
   12:00–22:00 als Standardwert ein und veroeffentlichte damit erfundene
   Oeffnungszeiten. Das ist die einzige Stelle im untersuchten Umfang, an der
   der Code nachweislich etwas besser macht als das, was er ersetzt hat.
2. **Die Reihenfolge in `reservation.ts:175-218`.** Findet die Seite eine
   OpenTable-Einbindung **und** einen Tischwunsch-Link, gewinnt die Einbindung —
   sie belegt das System, das der Gast tatsaechlich vor sich hat (`:176-184`).
   Das eigene Buchungsformular wird bei erkanntem Fremdsystem gar nicht erst
   angeboten (`:11-18`), weil sonst derselbe Tisch zweimal vergeben wird.

Beides ist in einer Stunde programmiert und in zwei Wochen nicht gedacht, wenn
niemand im Team Gastronomie kennt. Das ist der ehrliche Rest an Vorsprung, und
er ist klein.

### Die Einschraenkung, die alles relativiert

Der Auftrag an das Sprachmodell (`server/services/ocr/types.ts:70-75`) lautet:
„Transkribiere diese Speisekarte vollstaendig als reinen Text". Danach laeuft
der Regex-Parser darueber (`menuExtraction.ts:275,295`). Das Modell wird also
fuer die Texterkennung ohnehin bezahlt und koennte in derselben Anfrage
strukturiertes JSON liefern. Ein Wettbewerber, der genau das tut, ersetzt 527
Zeilen Parser und 42 Tests durch einen Prompt.

Was fuer den Parser spricht, und zwar ernsthaft:

- Der HTML-Weg (`menuExtraction.ts:243`) kommt ohne Modell aus. Dort ist der
  Parser nicht ersetzbar, sondern kostenlos.
- Determinismus: derselbe Text ergibt dieselben IDs (`menuParser.ts:113-122`).
  Ein Modell liefert bei jedem Lauf leicht andere Namen, und die
  Zusammenfuehrung beim erneuten Scrape bricht.
- Pruefbarkeit: 42 Tests laufen in 13 ms. Eine Prompt-Aenderung laesst sich so
  nicht absichern.

Das sind gute Gruende. Sie machen den Parser zu einer Kostenersparnis mit
Determinismus-Vorteil — nicht zu einem Graben.

---

## 4. Die OCR-Kette mit Anbieterwechsel

`server/services/ocr/index.ts`: 126 Zeilen, davon 80 Code. Kern ist eine
Schleife ueber `providerOrder()` (`:98-119`), die bei nicht eingerichtet, zu
gross, geworfenem Fehler oder leerem Ergebnis weiterschaltet und erst wirft,
wenn alle durch sind — mit allen Gruenden im Text (`:121-125`). 19 Tests, gruen.

**Loest sie ein echtes Problem? Ja, aber ein kleines und bekanntes.** Der Anlass
ist dokumentiert (`ocr/types.ts:1-13`, `ocr/index.ts:4-8`): Der erste echte Lauf
scheiterte an einem HTTP 429. Dass eine Kernfunktion nicht an einem einzelnen
Anbieterkontingent haengen darf, ist Standardarchitektur. Drei Details heben die
Umsetzung ueber die Pflichtuebung:

- Ein **leeres Ergebnis** gilt als Fehlschlag (`:110-113`). Das ist der Teil, den
  Erstfassungen auslassen — und der haeufigste Fall.
- Ein Tippfehler in `OCR_PROVIDER_ORDER` wird gewarnt statt still uebergangen
  (`:38-45`).
- `isOcrError` prueft die Form statt `instanceof` (`ocr/types.ts:37-53`), weil
  `instanceof` beim Doppelladen des Moduls bricht — und dann faellt genau die
  Angabe weg, an der die Kette entscheidet.

Zusammen etwa 20 Zeilen. Richtig, aber kein Wettbewerbsvorteil.

**Gegen die Anbieterdokumentation geprueft** (beide URLs von mir am 2026-08-04
abgerufen):

- `anthropic.ts:33` setzt 500 MB. Bestaetigt: „Maximum file size: 500 MB per
  file" — https://platform.claude.com/docs/en/build-with-claude/files. Auch der
  Beta-Header `files-api-2025-04-14` (`anthropic.ts:23`) stimmt mit der
  Dokumentation ueberein.
- `gemini.ts:39` setzt 2 GB als Files-API-Grenze. Bestaetigt: 2 GB pro Datei —
  https://ai.google.dev/gemini-api/docs/files.
- `gemini.ts:36` schaltet aber schon **ab 7 MB** auf die Files-API, begruendet
  damit, die eingebettete Anfrage sei „lange auf 20 MB begrenzt" gewesen.
  Dieselbe Dokumentation nennt heute: „Always use the Files API when the total
  request size … is larger than 100 MB. For PDF files, the limit is 50 MB." Die
  Schwelle ist damit deutlich konservativer als noetig — nicht falsch, aber die
  angegebene Begruendung deckt sie nicht.
- Das Warten auf Zustand `ACTIVE` (`gemini.ts:177-197`) konnte ich **nicht
  belegen**; die abgerufene Files-Dokumentation beschreibt keinen erforderlichen
  ACTIVE-Zustand vor der Nutzung. Die Schleife ist defensiv; ob sie noetig ist,
  weiss ich nicht.
- Die Angabe „eingebettete Anfrage auf 32 MB begrenzt" (`anthropic.ts:8-14`) und
  die Kostenfaktoren in `anthropic.ts:40-41` habe ich **nicht geprueft**.

Der eigentlich interessantere Teil steht daneben und wird selten so gebaut:
`menuExtraction.ts:252-283` versucht bei PDFs zuerst den eingebetteten Text
(kostenlos, ohne fremden Dienst, `extractPdfText` `:201-225`), misst das
Ergebnis mit `menuQuality` (`menuParser.ts:511-527`), ruft OCR nur bei zu wenig
Ausbeute und behaelt am Ende das bessere der beiden Ergebnisse (`:281-283`).
Das spart Geld und ist genau die Sorte Entscheidung, die man erst nach dem
ersten Rechnungslauf trifft.

**Urteil: Standard, sauber ausgefuehrt.** Der Wert liegt nicht in der Kette,
sondern darin, dass jemand den 429 gesehen und daraufhin gehandelt hat. Das ist
Betriebserfahrung — und die laesst sich in zwei Wochen selbst sammeln.

---

## 5. Was fehlt, um daraus etwas Eigenstaendiges zu machen

Drei Dinge, jedes aus dem Code begruendet.

### 5.1 Ein Rueckkanal von der Korrektur zum Parser

Heute geht verloren, was der Wirt am Vorschlag geaendert hat.
`ScraperJob.suggestedConfig` haelt den Vorschlag (`prisma/schema.prisma:579`),
die veroeffentlichte Fassung liegt in `WebApp.configData`
(`prisma/schema.prisma:498`). `WebApp` hat **kein** Feld, das auf den
`ScraperJob` zurueckzeigt (`schema.prisma:493-507`), und in
`server/routes/webapps.ts` kommen weder `scraperJob` noch `jobId` vor. Ein Diff
„vorgeschlagen vs. veroeffentlicht" ist damit nicht berechenbar.

Genau dieser Diff waere das einzige Datum, das ein Wettbewerber nicht kaufen
kann: Welche Kategorien sortiert der Wirt um? Welche Preise korrigiert er?
Welche Gerichte loescht er, weil sie gar keine waren? Mit ein paar hundert
veroeffentlichten Seiten liessen sich daraus Regeln ableiten, die niemand sonst
hat. Der Aufwand ist eine Fremdschluesselspalte und ein Vergleich.

### 5.2 Ein Pruefkorpus echter Karten statt beispielhafter Tests

`menuQuality` (`menuParser.ts:511-527`) beurteilt nur die eigene Ausgabe („≥ 3
Gerichte mit Preis = brauchbar"), nicht die Richtigkeit. Es gibt nichts, wogegen
sich eine Parser-Aenderung messen liesse: alle 42 Tests pruefen konstruierte
Beispiele. Folge: Jede Verschaerfung einer Regel — etwa die in
`menuParser.ts:241-249` beschriebene Strenge gegen OCR-Fliesstext — ist ein
Tausch ohne Zaehler. Man weiss, dass ein Fall besser wird; ob drei andere
schlechter werden, weiss man nicht.

Fuenfzig gespeicherte Kartentexte mit von Hand geprueftem Sollergebnis waeren in
wenigen Tagen angelegt und danach der Unterschied zwischen „funktioniert bei
uns" und „liest 84 % der Positionen korrekt, gemessen". Es waere auch die einzige
Grundlage, auf der sich die Frage „Parser oder Sprachmodell" (Abschnitt 3)
ueberhaupt entscheiden liesse. Zurzeit ist sie unentscheidbar.

### 5.3 Analytics, die auf echten Daten laufen und auch angezeigt werden

Der Weg von echten Daten zur Auswertung existiert vollstaendig:
`sync.ts:70-121` → `dataset.ts:35-91` → `insights.ts:24`. Angezeigt wird davon
in der App nur das Briefing (`useDailyBriefing.ts:47-53`), und dessen
Score-Kachel wird unmittelbar danach durch den lokalen 64er-Wert ueberschrieben
(`StartScreen.tsx:49`). Alle uebrigen Analytics-Bildschirme rechnen
ausschliesslich auf dem Demo-Dataset (`mobile/src/lib/analytics.ts:163-185`).
Dazu die drei unbenutzten Bausteine aus Abschnitt 1d.

Solange das so bleibt, ist die Analytics-Schicht kein Produktmerkmal, sondern
Vorarbeit — und es gibt auch keinen Rueckkanal, ob eine der drei Entscheidungen
je ausgefuehrt wurde: Der Briefing-Endpunkt ist nur lesend
(`server/maitr/routes.ts:115`), und `InsightsCache` speichert nur `result` und
`computedAt` (`prisma/schema.prisma:810-816`). Ohne diese
Schleife bleiben die Wirkungsangaben dauerhaft Behauptungen im Quelltext.

---

## Was hier ehrlicherweise Standard ist

Das meiste.

Die gesamte Analytics-Schicht ist Standardhandwerk: Mittelwert, Median, ein
gleitender 30/30-Vergleich, eine gewichtete Summe mit geratenen Gewichten, eine
lineare Regression, eine Wochentag-Stunden-Matrix, Segmentierung nach
Besuchszahl mit zwei Schwellen (`guests.ts:16-18`). 480 Zeilen, keine Tests,
keine Kalibrierung. Die einzige Stelle mit statistischem Anspruch sind neun
Zeilen Wilson-Schranke (`math.ts:44-52`). Die Normalisierung des
Abwanderungsrisikos auf den eigenen Rhythmus des Gastes (`guests.ts:25-36`) ist
der klügste Gedanke der Schicht und trotzdem Lehrbuch-RFM.

Die drei Entscheidungen sind acht `if`-Bloecke mit handgesetzten Prioritaeten
und ein `slice(0,3)`. Die Rangfolge zwischen den Kategorien ist durch die
Startwerte praktisch vorentschieden. Das ist keine Priorisierung, das ist eine
Reihenfolge mit Nachkommastellen.

Die OCR-Kette ist ein Anbieter-Interface mit einer `for`-Schleife und
`try/catch`. Die Typerkennung an Magic Bytes (`menuExtraction.ts:50-79`) steht in
jedem Handbuch. Das Auslesen des PDF-Textes (`:201-225`) ist absichtlich eine
Naeherung und wird als solche beschrieben. `dataset.ts` ist ein Mapper von
Prisma-Zeilen auf Analytics-Typen, `briefing.ts` eine geteilte Zusammenfassung,
`scheduler.ts` ein `setInterval` mit Sperre. All das ist gut gemacht und in
Tagen nachbaubar — und genau so ist es hier auch entstanden.

Auch die Parser sind als Code gewoehnlich: Regex, Zeilenschleifen,
Zustandsvariablen, keine Datenstruktur ueber ein Array hinaus. `siteDetails.ts`
ist eine Kette von Rueckfaellen — JSON-LD, dann Meta-Tags, dann
Markup-Heuristik, dann sichtbarer Text (`:279-345`). Genau so wuerde es jeder
bauen, der die Aufgabe kennt.

Was daran nicht gewoehnlich ist, ist die Liste der Faelle — und die ist kein
Code, sondern das Protokoll von Fehlschlaegen an echten Daten. Ein Wettbewerber
kann die 527 Zeilen in drei Tagen schreiben und weiss trotzdem nicht, dass
deutsche Karten „12,-" schreiben, dass OCR das „l" bei „0,3l" als „1" liest und
dass eine Beschreibungszeile mit dem Wort „Salat" die Kategorie kippt. Nur: Auch
dieses Protokoll umfasst hier bislang einen Betrieb, und ein Sprachmodell, das
direkt JSON liefert, umgeht es womoeglich ganz.

Bleibt die Haltung, im Zweifel nichts zu behaupten (`openingHours.ts:19-22`,
`siteDetails.ts:162-164`, `reservation.ts:214-217`), und die Kenntnis, dass ein
doppelt vergebener Tisch schlimmer ist als eine fehlende Reservierungsfunktion
(`reservation.ts:11-18`). Beides ist im Code sichtbar, beides ist richtig — und
beides ist mit einem einzigen Gespraech mit einem Wirt ebenfalls zu haben.

---

## Zusammengefasst

| Bereich | Urteil | Beleg |
|---|---|---|
| Analytics-Schicht | Formelsammlung; ~70 von 480 Zeilen rechnen wirklich; keine Tests | Zeilentabelle oben |
| Drei Entscheidungen | Heuristik, praktisch feste Reihenfolge | `insights.ts:44-146,151` |
| menuParser | Guter Sonderfall-Katalog (~20 Faelle), an 1 realer Karte gehaertet | Fall-Tabelle oben |
| siteDetails / openingHours / reservation | Standard mit einer wertvollen Regel: nichts erfinden | `openingHours.ts:19-22` |
| OCR-Kette | Pflichtuebung, sauber ausgefuehrt | `ocr/index.ts:98-125` |
| PDF-Text vor OCR | Kluge Kostenentscheidung, kein Graben | `menuExtraction.ts:252-283` |
| Nicht angeschlossen | Praesenzscore, Themen, Prognose, Tokenizer | `StartScreen.tsx:49`, `index.ts:13,24`, `text.ts:31` |
| Entstehungszeit des Strangs | 3 Kalendertage | `git log`, 29.–31.07.2026 |
