> **Erhoben am 15.09.2026** per Workflow: je App-Bereich ein Prüfer, je Bereich ein
> Gegenprüfer, der jede Behauptung am Code zu widerlegen versuchte. Szenario: Ein
> Wirt meldet sich mit seinem Web-App-Konto an und hat Google Business Profile
> NICHT freigegeben. Der Bericht beschreibt den Arbeitsstand VOR den Fixes, die am
> selben Tag folgten (Speisekarte sichtbar, Kontolöschung, Abmelden räumt, echter
> Kanalstatus, Präsenz in Start/Profil-Check/Bewertungen) - siehe
> docs/product/PRAESENZ_WORKFLOW.md und die Commits danach.

# Integrationsprüfung Maitr-App: Anmeldung mit dem Web-App-Konto, ohne GBP-Freigabe

## 1. Kurzfazit

Nein, nicht jede Funktion ist integriert. Von 322 geprüften Anzeigen sind 84 echt (26 %), 172 Attrappe (53 %), 36 nur lokal gespeichert (11 %) und 30 ehrlich leer (9 %).

Wirklich an den Server angebunden sind nur wenige Bereiche:
- Login, Einstiegsweiche und Onboarding
- die Stempelkarte
- die Profil-Stammdaten und die Speisekarte aus der Web-App
- im noch nicht committeten Arbeitsstand: Präsenzscore, Profil-Check und der Google-Bewertungen-Tab

21 der echten Einträge zeigen erst Werte, wenn der Code deployt ist, die Migration eingespielt ist und ein gültiger `GOOGLE_PLACES_API_KEY` gesetzt ist.

Andere Bereiche zeigen dem echten Wirt weiter die Beispieldaten von „Café Goldstück“:
- Wachstum, Kennzahlen, Kanäle, Benchmark und Kampagne: 49 von 53 Anzeigen sind Attrappe
- Tische, Gäste und Gastbuchung: 35 von 49
- Beiträge: 25 von 33, dazu kein einziger echter Wert
- Abend, Posteingang und WhatsApp-Concierge

Die meisten Lücken brauchen keine GBP-Freigabe. Es fehlen /api/maitr-Routen oder Schreibwege, oft werden auch nur Daten nicht gelesen, die schon im Store liegen.

*Zählweise:* Jeder Prüfeintrag zählt einmal, die Klasse gilt nach der Gegenprüfung. 8 Einträge ohne sichtbare Anzeige sind nicht mitgezählt (reine Code-Befunde, Karten, die nie gerendert werden). Antwort-Editor, öffentliches Profil und Start-Score wurden in zwei Bereichen geprüft und stehen deshalb doppelt. Die Bereiche 1–6 gelten für den Arbeitsstand vom 15.09., Bereich 7 für HEAD `cba5108`. \* = echt nur mit Places-Schlüssel.

## 2. Ergebnis je Bereich

| Bereich | echt | Attrappe | lokal | leer-ehrlich | Summe |
|---|---|---|---|---|---|
| Start, Abend, Posteingang, Concierge, /aufgabe | 12 (2\*) | 30 | 4 | 6 | 52 |
| Bewertungen, Antwort-Editor | 12 (10\*) | 8 | 3 | 12 | 35 |
| Profil, Präsenzscore, Profil-Check, öffentliches Profil | 30 (7\*) | 5 | 8 | 3 | 46 |
| Wachstum, Kennzahlen, Erkenntnisse, Kanäle, Benchmark, Kampagne | 2 | 49 | 1 | 1 | 53 |
| Tische, Gäste, Gastbuchung | 6 (2\*) | 35 | 7 | 1 | 49 |
| Beiträge, Schnell posten, Beitrags-Editor | 0 | 25 | 8 | 0 | 33 |
| Speisekarte, Stempelkarte, Konto, Abo, Autopilot, Onboarding, Login, Demo (HEAD) | 22 | 20 | 5 | 7 | 54 |
| **Summe** | **84 (21\*)** | **172** | **36** | **30** | **322** |

### Start, Abend, Posteingang, Concierge, /aufgabe/[id]

| Klasse | Anzeigen |
|---|---|
| echt (12) | **Start:** Datumszeile, Begrüßung (die Stunde wird aber in Server-Zeit gerechnet), Betriebsname, Fortschritt „N Entscheidungen“, „Du hast alles im Griff“, Kachel Bewertung\* (sonst „–“), Kachel Präsenz (presenceScore), Profil-Aufgabe (ohne GBP die einzige realistische Karte), Vorlesetexte für Präsenz und Bewertung\*, „Freigabe läuft“ samt Fehlerzeilen. **Außerhalb der Liste:** Push „Neue Reservierungsanfrage“ |
| Attrappe (30) | **Start:** Unterzeile „Drei Entscheidungen“, Glocken-Badge (INBOX_SEED), „Erledigt heute · Veröffentlicht“, Fixture-Briefing beim Laden und bei jedem Fehler, Kachelwerte beim Laden (64 + Häkchen, 4,8, 4.812). **Abend:** alle 8 Anzeigen (Datum, Name, Tische, nächste Ankunft, Walk-ins, Beitragsvorschlag, Freigeben, Nachtbar). **Posteingang:** Liste, WhatsApp-Eintrag, Neue Reservierung, Beitragsvorschlag, „Präsenzscore steigt · +12“, 5★-Bewertung Marion, Zeitangaben. **Concierge:** alle 4. **Editor:** Bewertung, Ton-Chips, Neu vorschlagen, „Auf Google veröffentlichen“, Fußzeile „Wird öffentlich…“, Chronik-Eintrag |
| lokal (4) | taskDone, Wischen-Löschen (nur Sitzungszustand), Gelesen-Status, bearbeiteter Antworttext |
| leer-ehrlich (6) | Bewertungs-, Beitrags- und ROI-Aufgabe, Gäste-/No-Show-/Auslastungs-Aufgaben, Kachel Aufrufe („–“), Hinweis „Beispieldaten · API nicht verbunden“ (erscheint auch beim normalen Laden, der Text stimmt dann nicht) |

### Bewertungen und Antwort-Editor

| Klasse | Anzeigen |
|---|---|
| echt (12) | **Tab:** Schnitt\*, Anzahl\*, Kartenliste (höchstens 5)\*, Autor\*, Initialen\*, Sterne\*, Text\*, Zeitangabe\*, Themen-Tags\*, Maps-Links\*, Stand-Zeile mit „Aktualisieren“, Knopf „Google verbinden“ (echter OAuth-Ablauf) |
| Attrappe (8) | **Editor:** Titel „Antwort an Marion“, Sterne, Zitat, Ton-Entwürfe, „Neu vorschlagen“, „Wird öffentlich unter deinem Profil angezeigt“, stiller Rückfall auf die Fixture-Bewertung. **Tab:** Panel-Versprechen „Antworten und die vollständige Liste kommen mit der Google-Freigabe“ |
| lokal (3) | Entwurfstext, Zeichenzähler, „Auf Google veröffentlichen“ (setzt nur reviewAnswered und schreibt einen Chronik-Eintrag) |
| leer-ehrlich (12) | Offen-Zähler, Akzentkreis, Ø Antwortzeit, „Top 10 %“, Beantwortet-Status und -Zustand, Vorschlagskopf, Vorschlagstext, Freigeben (ersetzt durch „Bei Google ansehen“), Link „Anpassen“, Hinweis- und Leerkarten, Ladefläche BewertungenLaden |

### Profil, Präsenzscore, Profil-Check, öffentliches Profil

| Klasse | Anzeigen |
|---|---|
| echt (30) | **Profil verwalten (Anzeige):** Name, Kurzbeschreibung, Beschreibung, Tags (im Szenario immer leer), Öffnungszeiten. **Öffentliches Profil:** Name, Kurzbeschreibung, Ort, Tags, Aktion Speisekarte, „Jetzt geöffnet“, „bis 22:00“, Bewertungsplakette\*, Bewertungsanzahl\*, Titelbild\*. **Profil-Check:** Score-Ring, offene Punkte, Auswahl der Hebel, Punktwerte, Speisekarten-Hebel, Außenplätze-Hebel\*, Fotos-Hebel\*, Google-Maps-Karte\*, Faktorenliste, Website-Abschnitt, Themen\*, Stand-Zeile. **Übergreifend:** Start-Score-Kachel, Vorlese-Ansage, Wachstum-Zeile „Profil Check“ |
| Attrappe (5) | Kanal-Avatare G/Ig, Kartentitel „Google Business“, Instagram-Bio, Schnellaktion „Route“ (nur Toast), Hebel-Begründungen („53 % der Gäste…“) |
| lokal (8) | Speichern von Name, Kurzbeschreibung, Beschreibung, Öffnungszeiten und Instagram-Bio, Toast „Profil gespeichert“, „Tisch reservieren“, Tipp-Ziele der Hebel |
| leer-ehrlich (3) | „Besser als 58 % der Cafés“, Feiertagszeiten, Lade- und Fehlerzustand im Profil-Check |

### Wachstum, Kennzahlen, Erkenntnisse, Kanäle, Benchmark, Kampagne

| Klasse | Anzeigen |
|---|---|
| echt (2) | „Verbindung trennen“ (DELETE /integrations/:provider), Wachstum-Zeile „Profil Check“ (mit Rückfall auf 64) |
| Attrappe (49) | **Wachstum:** alle vier Kacheln (Aufrufe, Bewertungen, Routen, Reservierungen), Monatskopf, 6-Monats-Chart, „Ø +15 %“, ROI-Panel und ROI-Zeile, Kanäle-Zeile, Empfehlungs-Panel, Köln-Index-Zeile. **Erkenntnisse:** Liste, Rückholen, Auslastung, Timing, Bewertung, Profil-Hebel, ROI. **MetricDetail:** komplett (5). **Kanäle:** Zähler, Google/Instagram „Verbunden“, Facebook/TheFork, Yelp, „Wunsch senden“. **ChannelDetail:** Konto „Sofia Brandt“, Synchronisation, „Maitr darf“, simuliertes Verbinden, „Profil & Öffnungszeiten“. **Benchmark:** komplett (7) plus „Top 12 %“. **Kampagne:** komplett (6) |
| lokal (1) | Erkenntnis wegwischen |
| leer-ehrlich (1) | Eyebrow „Beispielwerte · echte Kennzahlen folgen mit der Google-Freigabe“ (stimmt nur teilweise, steht nur über den Kacheln) |

### Tische, Gäste, Gastbuchung

| Klasse | Anzeigen |
|---|---|
| echt (6) | Knopf „Stempelkarte ›“. **Gast-Profil:** Name und Slogan, „Jetzt geöffnet“, Bewertungsplakette\*, Titelbild\*, Schnellaktion Speisekarte |
| Attrappe (35) | **Tische:** komplett (12): Tag, Servicefenster, Buchungsbalken, Puffer, Banner, Sperre, nächste Ankunft, leerer Tag, Buchungslink, „3 von 8 Plätzen“, Tischzeilen, Ausgebucht. **Gäste:** komplett (10). **Gastbuchung:** Kopf, Tage, Personen, Uhrzeiten, Name, Telefon. **Bestätigung:** „Wo“, SMS, Kalender, „Tag ausgebucht“. **Profil:** Route, „Tisch reservieren“ (führt in die Fixture-Strecke). Posteingang-Einstieg nach /tische |
| lokal (7) | Tisch sperren, No-Show, Walk-in, Knopf „Reservieren“, Bestätigung (Name, Wann, Personen) |
| leer-ehrlich (1) | Merkmal-Tags (vom Server immer []) |

### Beiträge, Schnell posten, Beitrags-Editor

| Klasse | Anzeigen |
|---|---|
| echt (0) | – |
| Attrappe (25) | **Beiträge:** KW, Liste, Live-Karte, Live-Kennzahl, Vorschlagskarte, Begründung, eingeplante Karte, Kanalangabe, Slot-Zeile, „Jetzt veröffentlichen“, Fußzeile, Beitragsbild, doppeltes „Live“. **Editor:** Kanal-Chips, Zeit-Chips, Vorschaubild. **Schnell posten:** Untertitel, Vorschläge, Rückfall auf Zimtschnecken, „stärkste Stunde“, Kanäle, Zeitpunkt „Maitr plant“, Foto-Stimmungen. Instagram ohne Kontobezug, Start-Link „Erledigt heute → Ansehen“ |
| lokal (8) | Einplanen, Editor-Text, Kanal-Auswahl, Zeit-Auswahl, „Speichern & einplanen“, Schnell-Textfeld, „Beitrag planen“, Aktivitätseintrag |
| leer-ehrlich (0) | – |

### Speisekarte, Stempelkarte, Konto, Abo, Autopilot, Onboarding, Login, Demo (Stand HEAD)

| Klasse | Anzeigen |
|---|---|
| echt (22) | **Speisekarte:** Preis, Gerichtnamen (Datenweg echt, auf HEAD durch den Kategorie-Filter praktisch unsichtbar, im Arbeitsbaum behoben). **Stempelkarte:** 11 Anzeigen (Prämien, Kacheln, Einstellungen, Rollen-Sperre, Wallet-Block, Liste, Karte ausgeben, Detailkopf, Verlauf, Aktionen, Gast-Link). **Konto:** Abmelden. **Onboarding:** Betrieb angelegt, Google-Status, „Mit Google verbinden“, Zeiten anzeigen, Zeiten speichern, Fertig. **Login, Einstiegsweiche** |
| Attrappe (20) | **Speisekarte:** Kategorie-Chips, Leerzustand „53 % … +12“. **Konto:** Betrieb · Stadtteil, Name/Initialen „Sofia Brandt“, Plan-Panel, „Visa 4242“, „Ändern“, „Push 7:00“, Demo-Knopf. **Löschen:** E-Mail im Warntext, „Konto endgültig löschen“ (404 auf HEAD), Toast bei Token null. **Abo:** „Aktuell Pro“, Features und Fußzeile, ROI-Panel. **Autopilot:** Zähler, Chronik, Sofortmeldung „zurückgeholt“. Onboarding-Zeitvorschlag (als Vorschlag gekennzeichnet), Demo-Verzeichnis |
| lokal (5) | Gericht hinzufügen/entfernen, Menü-Aufgabe gilt als erledigt, Schalter Nachtbar/Barrierefrei (nur Arbeitsspeicher), Plan wählen, Autopilot-Regler |
| leer-ehrlich (7) | Beschreibung und Bild der Gerichte, „Noch keine Gerichte“, Stempel-Vorbelegung, „Preise stehen noch nicht fest“, Rechnungen, Preisspalte, Showcase-Knopf |

## 3. Ohne GBP-Freigabe ladbar, aber noch nicht geladen

### Aufwand klein, Route oder Daten schon vorhanden

1. **Konto und Löschwarnung zeigen den echten Inhaber.** Heute nennt die Warnung vor der Löschung ein fremdes Konto.
   - Quelle: Clerk-Sitzung (`mobileAuthAdapter.getUser`, auth.ts:202-216) sowie Business.name und contactInfo über GET /api/maitr/venues.
   - Ändern: `mobile/src/features/account/AccountScreen.tsx:92-98`, `mobile/src/features/account/DeleteAccountScreen.tsx:142-146`.
2. **Kanalstatus überall aus der Verbindungstabelle** (Zähler, „Verbunden“, Konto, Beitragskanäle).
   - Quelle: Maitr-DB `ChannelConnection` (provider, status, accountId) über GET /api/maitr/integrations (`api.integrations.list`). Einen Store-Effekt dafür gibt es laut jüngstem Stand schon (store.tsx:959-1000).
   - Ändern: `GrowthScreen.tsx:50-51`, `ChannelsScreen.tsx:25-27,46`, `ChannelDetailScreen.tsx:93-101` (echter OAuth-Ablauf wie in `onboarding/screens.tsx:365-401`), `ProfileManagementScreen.tsx:56-62`, `PostsScreen.tsx:83`, `PostEditorScreen.tsx:17`, `QuickPostScreen.tsx:51`. signOut in `store.tsx:771-782` darf nicht auf CHANNELS_SEED zurücksetzen.
3. **Abend-Screen mit Stammdaten.**
   - Quelle: Business.name und Business.openingHours (GET /api/maitr/venues → venueProfile) sowie `briefing.now`.
   - Ändern: `mobile/src/features/start/EveningScreen.tsx:15-16,44,51`.
4. **Gastbuchung und Bestätigung: Kopf und „Wo“.**
   - Quelle: venueProfile.name, street, city (GET /venues).
   - Ändern: `mobile/src/features/reservations/GuestBookingScreen.tsx:60-64`, `GuestConfirmationScreen.tsx:86`.
5. **Öffentliches Profil: Schnellaktion „Route“.**
   - Quelle: Google Places `googleMapsUri` (praesenz.google.mapsUrl, liegt schon im Store) oder contactInfo.address.
   - Ändern: `mobile/src/features/publicProfile/PublicProfileScreen.tsx:205-209`.
6. **Verworfene Serverfelder übernehmen.** Das sind socialLinks, logoUrl, phone und website aus GET /venues sowie description und imageUrl der Gerichte aus GET /venues/:venueId/menu.
   - Nutzen: Instagram lässt sich ehrlich als „@konto verlinkt, nicht verbunden“ zeigen, Gerichtbilder und Logo taugen als Beitragsbild und Foto-Auswahl.
   - Vorbehalt: logoUrl und imageUrl können noch auf das Hosting der Quellwebsite zeigen, weil Stage 3 vor Stage 3.5 läuft.
   - Ändern: `mobile/src/lib/venueAdopt.ts:102-113` (profilAusVenue) und `:132-147` (menuZeilenAusServer), `store.tsx:376-381`. Anzeige in `MenuScreen.tsx`, `PostsScreen.tsx`, `PostEditorScreen.tsx:53`, `QuickPostScreen.tsx:19-23`.
7. **Speisekarten-Kategorien aus MenuCategory.name.** Im Arbeitsbaum über kategorienDerKarte gelöst, das muss noch committet werden.
   - Ändern: `mobile/src/features/menu/MenuScreen.tsx:17,44-46`.
8. **„Profil speichern“ an den Server.** name und tagline gehen per PATCH /api/maitr/venues/:venueId (`api.venues.update` existiert). Für description das Schema erweitern, dann lässt sich der Hebel „Beschreibung ergänzen“ erledigen.
   - Ändern: `ProfileManagementScreen.tsx:37-41`, `server/maitr/routes.ts:1176-1200` (patchVenueSchema), `packages/core/src/types/index.ts:139-145`.
9. **Antwort-Editor auf Places-Bewertungen umstellen.** Titel, Sterne und Zitat kommen aus `praesenz.google.bewertungen`. Ehrlicher Abschluss: Entwurf kopieren und `OeffentlicheBewertung.url` öffnen, statt „veröffentlicht“ zu melden.
   - Quelle: Google Places (places.ts:291-299).
   - Ändern: `mobile/src/features/reviews/ReplyEditorScreen.tsx:16,44-47,58-62,78-81,164-166`, außerdem den Chronik-Eintrag in `answerReview` entfernen (`store.tsx:804-815`).
10. **Tische: nächste Ankunft und Servicefenster.**
    - Quelle: Reservation über GET /api/maitr/reservations/day, Business.openingHours.
    - Ändern: `mobile/src/features/reservations/ReservationsScreen.tsx:87-93,124-142`, `EveningScreen.tsx:18`. Serverseitig die Antwortform auf ServiceDay abbilden und die Tagesgrenze in Europe/Berlin ziehen (`server/maitr/routes.ts:612-621`).
11. **ROI zählt Web-App-Buchungen.**
    - Quelle: Reservation.source „website“.
    - Ändern: mapSource in `server/maitr/dataset.ts:50-54`, Ziel der roi-Aufgabe in `StartScreen.tsx:179-181`.
    - Vorbehalt: Business.averageCheck steht immer auf der Vorgabe 9, und reservationRoi hat keinen Monatsfilter (`roi.ts:26-28`).
12. **Start-Unterzeile aus der Aufgabenzahl.**
    - Quelle: briefing.tasks.
    - Ändern: `server/maitr/briefing.ts:225,239`.
13. **Benchmark-Kopf mit echtem Ort.**
    - Quelle: city und postalCode aus GET /venues.
    - Ändern: `mobile/src/features/growth/BenchmarkScreen.tsx:40,43`.
14. **„Google Business“-Karte in Profil verwalten mit dem Google-Stand (nur lesend).**
    - Quelle: Places displayName und editorialSummary (places.ts:308,321).
    - Ändern: `ProfileManagementScreen.tsx:64-72`.

### Aufwand klein, Route fehlt

15. **Wegwischen dauerhaft speichern** als TaskDecision DISMISSED. Heute gibt es nur approve und PATCH.
    - Ändern: `server/maitr/routes.ts` (neben :1017/:1058), `StartScreen.tsx:46,206-218`, `InsightsSection.tsx:27-32` (dort außerdem slice erst nach dem Filter).
16. **No-Show setzen:** PATCH-Status um NO_SHOW erweitern und einen Client-Wrapper anlegen.
    - Ändern: `server/maitr/routes.ts:663-666,693-697`, `packages/core/src/api/index.ts`, `ReservationsScreen.tsx:145-153`.
17. **Buchungslink und Reservierungsstatus:** Configuration.publishedUrl und reservationsEnabled in toOwnerVenue aufnehmen. Ergänzend ohne DB: Website-Prüfung `detectReservation` (website.ts:60) und Places `reservable`.
    - Ändern: `server/maitr/routes.ts:172-186`, `ReservationsScreen.tsx:161-199`, `PublicProfileScreen.tsx:227-233`.
18. **Rechnungen:** BillingEvent unter /api/maitr lesbar machen.
    - Ändern: `server/maitr/index.ts` (heute nur `/api/subscriptions/billing-events`, subscriptions.ts:432), `AccountScreen.tsx:28`.

### Aufwand mittel

19. **Ereignis-Feed für Posteingang und Glocke.**
    - Quelle: Reservation.createdAt (Web-App-Buchungen, PENDING), Anstieg von PresenceSnapshot `userRatingCount` („N neue Google-Bewertungen“, ohne Autor und Text), Präsenz-Hebel statt „+12“, TaskDecision.decidedAt. Die Zeitangaben kommen aus createdAt.
    - Ändern: neue Route in `server/maitr/routes.ts`, Vergleich in `aktualisiere()` (`server/maitr/praesenz/index.ts`), `store.tsx:114-155,721,1610`, `InboxScreen.tsx:33,52`, `GreetingHeader.tsx:58-64`.
20. **Tische-Tagesansicht auf Serverdaten.** `api.reservations.day` aufrufen, reservierte Plätze als Summe von guestCount, Tage blättern. Monatswerte (Wachstum-Kachel, MetricDetail) brauchen eine Monatsroute.
    - Ändern: `ReservationsScreen.tsx:29-57`, `store.tsx:627-635`, `server/maitr/routes.ts:607-623`, `packages/core/src/types/index.ts:244-252`.
21. **Erkenntnisse aus dem Server-Briefing** statt aus dem Fixture-Datensatz. DailyTask braucht dafür detail, severity und mehr als 3 Einträge.
    - Ändern: `mobile/src/features/growth/InsightsSection.tsx:22,29-33`, `mobile/src/lib/analytics.ts:163-184`, `server/maitr/briefing.ts:39-49,239`.
22. **Gäste-Route.** MaitrGuest entsteht schon über die Stempelkarte. Nötig sind zusätzlich ein Besuchszähler und eine Verknüpfung Reservation↔Gast, sonst entstehen Rückhol-, Auslastungs- und No-Show-Aufgaben nie.
    - Ändern: `server/maitr/stempelkarte.ts:1421-1449`, `prisma/schema.prisma:190-210`, `server/maitr/dataset.ts:109-124`, `GuestsScreen.tsx`, `CampaignScreen.tsx:33-37,70-92`.
23. **Bewertungen im Wachstum.** Die Gesamtzahl und der Schnitt kommen sofort aus `praesenz.google` (Places). Das Delta zum Vormonat braucht eine Historie, denn PresenceSnapshot wird per upsert überschrieben.
    - Ändern: `GrowthScreen.tsx:75-88`, `MetricDetailScreen.tsx:43-45`, eigener Wert in `BenchmarkScreen.tsx:20-21`.
24. **Merkmal-Tags befüllen.** Quelle ist der Konfigurator beim Veröffentlichen oder Places `outdoorSeating`, `servesVegetarianFood` und `reservable` (places.ts:59-61). Tags zusätzlich in PATCH aufnehmen.
    - Ändern: `server/services/businessProfil.ts:121-187`, `server/maitr/routes.ts:1176-1200`.
25. **Öffnungszeiten aus Profil verwalten speichern.** Textzeile in OpeningHours zurückwandeln (`zeitenAusEntwurf` aus `ablauf.ts:254` wiederverwenden). Dazu der Hinweis, dass die nächste Veröffentlichung der Web-App die Zeiten überschreibt.
    - Ändern: `ProfileManagementScreen.tsx:181-188,225-233`.
26. **Gastbuchung an POST /api/maitr/reservations.** Die Route antwortet heute roh statt über toApiReservation. Slots, Tage und Personenzahl (Configuration.timeSlots, maxGuests) sind unter /api/maitr nicht erreichbar.
    - Ändern: `GuestBookingScreen.tsx:41-55`, `server/maitr/routes.ts:633-661`.
27. **Walk-in ohne Tisch** (source walk_in, Status ARRIVED).
    - Ändern: `server/maitr/routes.ts:800-847`.
28. **Schreibweg für Tische.** Heute sind die floor-plan-Routen Mock. Erst danach funktionieren Kapazität, Sperren, „3 von 8“ und Ausgebucht.
    - Ändern: `server/routes/floor-plan.ts:290-423` bzw. eine neue Route unter /api/maitr.
29. **Speisekarte schreiben** statt Gerichte nur auf dem Gerät anzulegen. Die Menü-Aufgabe soll nur noch aus Server-MenuItem abgeleitet werden.
    - Ändern: `MenuScreen.tsx`, `store.tsx:1398-1411`, `analytics.ts:175`, neue Route in `server/maitr/routes.ts`.
30. **Antwortentwürfe per LLM-Endpunkt** aus dem Places-Text und dem Business-Profil, Ablage in TaskDecision.draft. `TASK_ID_PATTERN` muss dafür Places-IDs mit „/“ zulassen, und resolveTask darf ohne MaitrReview nicht 404 liefern.
    - Ändern: `server/maitr/routes.ts:971,1070`, `ReplyEditorScreen.tsx:21-29,146-158`.
31. **Grundgerüst für Beiträge.** Post-Tabelle, GET/POST/PATCH `/api/maitr/venues/:venueId/posts`, Client-Aufrufe, Vorschlagstext per LLM aus MenuItem und Business. Ehrlicher Veröffentlichungsweg ohne Freigabe: über Share an die Instagram-App übergeben (wie `StampCardDetailScreen.tsx:206`).
    - Ändern: `prisma/schema.prisma`, `server/maitr/routes.ts`, `packages/core/src/api/index.ts`, `store.tsx:226-253,816-861`, `PostsScreen.tsx`, `PostEditorScreen.tsx`, `QuickPostScreen.tsx`.
32. **Abo-Stand unter /api/maitr.** Das Planvokabular free/basic/pro/enterprise weicht von start/pro/autopilot ab.
    - Ändern: `server/maitr/index.ts`, `AccountScreen.tsx:34-38,105-106`, `AbonnementScreen.tsx:87-94`.
33. **Autopilot-Chronik** aus TaskDecision und AuditLog (Leseroute fehlt).
    - Ändern: `AutopilotScreen.tsx:77-84`.
34. **„Push täglich 7:00“:** Präferenz und Tagesversand fehlen, PushToken ist vorhanden.
    - Ändern: `AccountScreen.tsx:254-263`, `server/maitr/scheduler.ts`.
35. **Empfehlungsprogramm:** Es fehlen Modell und Route.
    - Ändern: `GrowthScreen.tsx:175-192`.
36. **Zeitvorschlag im Onboarding** aus Places `regularOpeningHours` (places.ts:53,303). Die Website liefert nur ein Ja/Nein. Den Aufwand hat die Prüfung nicht beziffert.
    - Ändern: `mobile/src/features/onboarding/ablauf.ts:140-148`.

### Aufwand groß

37. **Köln-Index und Benchmark über Places Nearby- oder Text-Suche.** Das ergibt nur eine Umkreis-Stichprobe (20 bzw. 60 Treffer), kein stadtweites Perzentil. Die Suchen kosten zusätzlich, und die Nutzungsbedingungen sind vorher zu klären.
    - Ändern: `server/maitr/praesenz/places.ts` (Such-Endpunkt fehlt), `GrowthScreen.tsx:167-172`, `BenchmarkScreen.tsx`.
38. **Reservierungs-Vergleich aus der Maitr-Kohorte:** BenchmarkSnapshot braucht einen Schreiber, einen Job und eine Route (`prisma/schema.prisma:2032-2051`).
39. **Wöchentliche Beitragsvorschläge als Scheduler-Job** aus Gerichten und Galerie (`server/maitr/scheduler.ts`).

### Ohne Datenquelle, nur ehrlich machen

- Monat, Jahr und KW aus der Gerätezeit rechnen (`GrowthScreen.tsx:37,64-69`, `MetricDetailScreen.tsx:13,52`, `PostsScreen.tsx:28`).
- „Beitrag planen“ ohne Text sperren (`QuickPostScreen.tsx:54`).
- Die Nachtbar tatsächlich automatisch schalten oder den Text ändern (`EveningScreen.tsx:113`).
- Seeds für Posteingang, Abend, Concierge, Tische, Gäste, Beiträge und Autopilot hinter `hasRealVenue` stellen.

## 4. Braucht Freigabe oder externen Dienst

| Funktion in der App | Nötig | Stand im Code |
|---|---|---|
| Bewertungen beantworten, „Auf Google veröffentlichen“, „Wird öffentlich…“ | GBP-Freigabe (OAuth business.manage), reviews.updateReply | Connector nur lesend (`briefing.ts:64-67`), auch mit Freigabe nicht gebaut |
| Antwortstatus, Offen-Zähler, Ø Antwortzeit, eigene Antwortquote | GBP-Freigabe (repliedAt per Sync) | Places liefert keine Inhaberantworten |
| Vollständige Bewertungsliste mit Autor | GBP-Freigabe | Keine App-Route listet MaitrReview, sync schreibt `author` nie |
| Aufrufe (Kachel, Chart, MetricDetail) | GBP Performance API oder Meta Insights | Google holt nur Maps-Impressions, Tageswerte |
| Routen-Kachel | GBP Performance API | BUSINESS_DIRECTION_REQUESTS nicht abgefragt, actions fest 0 |
| Beiträge auf Google veröffentlichen | GBP-Freigabe, localPosts | Nicht gebaut |
| Feiertags- und Sonderzeiten | GBP specialHours | Places liefert nur 7 Tage, nicht in der Feldmaske |
| Profil und Attribute (z. B. Außenplätze) nach Google schreiben | GBP locations.patch | Nicht gebaut |
| Reichweite je Beitrag, Live-Kennzahl | Meta-Freigabe, instagram_manage_insights | Nicht gebaut |
| „Stärkste Stunde“ (Start, Beiträge, Schnell posten, Erkenntnisse) | Meta Insights mit `online_followers` | Connector fragt period=day ab; GBP liefert grundsätzlich keine Stundenwerte |
| Beiträge auf Instagram oder Facebook posten | Meta App Review: instagram_content_publish, pages_manage_posts | Fehlen in META_SCOPES |
| Instagram-Bio | Meta-Freigabe nur zum Lesen (biography) | Setzen geht auch mit Freigabe nicht |
| WhatsApp-Concierge, Posteingang-Eintrag, Kampagne senden, „Zurückholen · Per WhatsApp“, Autopilot-Rückholung, „Antworten landen im Gäste-CRM“ | WhatsApp Cloud API (Meta, verifizierte Nummer, Opt-in der Gäste) | Schema vorhanden, kein Router; der Webhook prüft nur die Signatur |
| Autopilot-Regler (Wirkung) | GBP, Meta und WhatsApp | Spalte und Route für die Einstellung fehlen zusätzlich |
| Zahlungsmittel, „Ändern“, Plan wählen, Checkout | Stripe (Customer Portal, Checkout) | Price-IDs sind Platzhalter, Route liegt außerhalb /api/maitr |
| „Bestätigung per SMS“ | SMS-Anbieter | Server kennt nur E-Mail |
| TheFork, Yelp, Facebook als Kanal | Partnerzugänge (Yelp Partner-API laut Wissensstand, nicht am Code belegt), Facebook über Meta-OAuth | Connector-Registry kennt nur google und meta |
| „+14 % Nachfrage im Viertel“, Antwortquote und Aufrufe fremder Betriebe, Autopilot-Zähler „von Maitr erledigt“, „53 % der Gäste…“ | Nicht beschaffbar | Anzeigen streichen oder ausblenden |

## 5. Querschnittsbefunde

1. **Stand und Voraussetzungen.**
   - Die Bereiche 1–6 gelten für den nicht committeten Arbeitsstand. Mehrere Dateien wurden während der Prüfung weiter geändert, die Zeilenangaben sind Momentaufnahmen. Bereich 7 gilt für HEAD.
   - Der Live-Server hat keine /presence-Route. Die App zeigt dort BewertungenLaden und schiebt den Fehler auf Google.
   - „Echt“ gilt für die Präsenz nur mit Deploy, von Hand eingespielter Migration `20260915_add_presence_snapshot` und `GOOGLE_PLACES_API_KEY`. Der Schlüssel steht nur auskommentiert in `.env.example:71`.
   - Ohne Schlüssel beruht der Score allein auf Profil-Vollständigkeit (1 von 5 Faktoren). Kommt der Schlüssel dazu, springt der Score auf eine andere Grundlage.
   - Ohne Tabelle löst jedes Öffnen einen Refresh aus, die 10-Minuten-Drossel greift nicht (`praesenz/index.ts:376`). Mit Schlüssel kostet dann jeder Start einen bezahlten Places-Abruf plus bis zu 5 Fotos.

2. **Keine Unterscheidung zwischen echtem Betrieb und Demo.**
   - Weder hasRealVenue noch showcase prüfen: Abend, Posteingang mit Glocke, Concierge, Antwort-Editor, Profil verwalten, MetricDetail, Kanäle, Kampagne, Erkenntnisse, Benchmark, Tische, Gäste, Gastbuchung und Bestätigung, Beiträge, Abo, Autopilot, Konto, Konto löschen, dazu die Speisekarte auf HEAD.
   - GrowthScreen liest hasRealVenue nur für die Kennzeichnung und die Profil-Check-Zeile.
   - Das Demo-Verzeichnis ist aus dem Konto erreichbar.
   - Scheitert GET /venues ohne gespeicherte venueId, fällt auch der Profil-Check auf die Demo zurück.

3. **Beispieldaten überleben den Kontowechsel.**
   - signOut setzt channels und channelMeta auf den Seed zurück, also wieder „Verbunden“ und „Sofia Brandt“.
   - posts, activityLog, guests, days, reviewAnswered, currentPlan und autopilot bleiben stehen.
   - Beim Abmelden aus dem Showcase ist `showcaseRef.current` noch true, dadurch greift der Aufräum-Fix nicht. Showcase-Gerichte blockieren dann die Server-Karte des nächsten Kontos.
   - deleteLocalData setzt google:true, und PROFILE_DONE_SEED ist nicht an eine venueId gebunden.

4. **Beispieldaten statt Ladezustand.**
   - Das Briefing startet mit der Fixture und fällt bei jedem Fehler darauf zurück (`useDailyBriefing.ts:24-26,65-68`). So bleibt der Attrappen-Editor über `task_review_marion` im Szenario erreichbar.
   - Die Kacheln zeigen dann 64 + Häkchen, 4,8 und 4.812. „API nicht verbunden“ erscheint auch beim normalen Laden.
   - Die Wachstum-Zeile „Profil Check“ fällt ungekennzeichnet auf 64 zurück.
   - Kein Nachladen nach Freigabe oder Fokuswechsel, dazu ein 15-Minuten-Cache.
   - Scheitert GET /venues, bleibt die Einstiegsweiche dauerhaft leer, ohne erneuten Versuch.

5. **Erfolgsmeldungen ohne Mechanik.** Betroffen sind:
   - „Erledigt heute · Veröffentlicht“ (approve speichert nur eine TaskDecision)
   - „Auf Google veröffentlicht“ mit dauerhaftem Chronik-Eintrag
   - „Eingeplant ✓“ und „Beitrag veröffentlicht“
   - „3 Einladungen gesendet“, „N Gäste zurückgeholt“, Autopilot „K. Sommer zurückgeholt“
   - „Wunsch gesendet“, „Einladungslink kopiert“, „Buchungslink kopiert“, „Zum Kalender hinzufügen“
   - „Profil gespeichert“ und das per setTimeout simulierte Verbinden eines Kanals
   - „Konto gelöscht“ bei Token null
   - „Schaltet abends automatisch um“ (der Schalter ist manuell und nicht gespeichert)

   Code-Kommentare behaupten das Gegenteil: `PostsScreen.tsx:21` („Nichts ist mehr Attrappe“), `PostEditorScreen.tsx:22`, `QuickPostScreen.tsx:35`. Der Kommentar in `PublicProfileScreen.tsx:57-58` ist veraltet.

6. **Präsenz-Hebel lassen sich in der App nicht erledigen.**
   - Hebel und ihre Ziele: „Beschreibung ergänzen“ und „Öffnungszeiten weichen ab“ führen nach /profil, „Speisekarte“ nach /speisekarte, „Instagram verlinken“ nach /kanaele, „Online-Reservierung“ nach /tische.
   - Keines dieser Ziele schreibt die Spalte, die der Server misst. Profil speichert lokal, PATCH kennt keine description, Gerichte landen nur auf dem Gerät, Kanäle schreiben keine socialLinks.
   - Umgekehrt hakt ein nur lokal angelegtes Gericht die Menü-Aufgabe ab.

7. **Schreibwege und Überschreiben.**
   - PATCH /venues ist `.strict()` und kennt nur name, tagline, timezone und openingHours.
   - Jeder Kaltstart (adoptVenue) überschreibt lokale Profiländerungen. Bis dahin gibt das öffentliche Profil lokalen Zeiten Vorrang (`PublicProfileScreen.tsx:335`).
   - Jede Veröffentlichung der Web-App überschreibt Business.openingHours, ohne Hinweis in der App.
   - Eine Veröffentlichung ohne Karte leert die alte DB-Karte nicht (`BusinessService.ts:295-302`).
   - Das Onboarding verwirft die PATCH-Antwort.
   - Wettlauf zwischen Hydrierung und GET /venues: am Code nachvollzogen, nicht gemessen.

8. **Die App verwirft Serverfelder.**
   - Nicht übernommen: logoUrl, phone, website, socialLinks, slug, timezone, Beschreibung und Bild der Gerichte.
   - Business.tags setzt die Veröffentlichung nie. Business.averageCheck und maitrScore haben keinen Schreiber.
   - Das öffentliche Profil ruft GET /venues/:slug/public nie auf und ist deshalb keine Gastsicht.

9. **Zeitzonen.**
   - daypart wird in der Server-Zeitzone gerechnet (`briefing.ts:213`, TZ ist nirgends gesetzt).
   - reservations/day schneidet Tage in UTC.
   - Die Slot-Route speichert die lokale Uhrzeit als „Z“. Ein 18:00-Slot erscheint in Push und Mails im Sommer als 20:00 (`publicReservations.ts:248,308-312`).
   - Das öffentliche Profil rechnet in Gerätezeit statt in Business.timezone.

10. **Reservierungen und Tische.**
    - Die App ruft keine einzige Reservierungsroute auf.
    - GET /day liefert Prisma-Rohzeilen statt ServiceDay, POST antwortet roh.
    - `api.reservations.cancel` schickt keine venueId und endet in 400 (`api/index.ts:122-124`).
    - NO_SHOW ist nicht setzbar.
    - Eine Web-Buchung löst den Push aus, fehlt aber in Posteingang und Tische.
    - Kein Code legt Table-Zeilen an. Deshalb antwortet Walk-in für jeden Betrieb mit 404, und eine Kapazität gibt es nirgends. Configuration.maxGuests ist nur die Höchstzahl je Buchung.

11. **ROI und Gäste.**
    - Web-App-Buchungen werden auf walk_in abgebildet, der ROI zählt nur source „maitr“. Außerdem gibt es keinen Monatsfilter, der Durchschnittsbon steht fest auf 9 €, und PENDING zählt als bestätigt.
    - MaitrGuest entsteht nur über die Stempelkarte. visits und noShows pflegt niemand, und an Reservation hängt keine guestId. Rückhol-, Auslastungs- und No-Show-Aufgaben entstehen deshalb nie.

12. **Die Briefing-Aufgaben passen nicht zur Kartenlogik.**
    - insightToTask setzt weder draft, rating noch secondaryAction, deshalb erscheint „Bearbeiten“ nie auf Serverkarten.
    - handlePrimary ignoriert endpoint. Die roi-Aufgabe öffnet /profil-check, Reservierungs-Aufgaben tragen das Label „Beitrag wird eingeplant“.
    - Der Name wird aus dem ersten Titelwort gebildet („Antwort an Kritische geht raus“).
    - TASK_ID_PATTERN lässt kein „/“ zu, damit passen Places-Bewertungen nicht.
    - DISMISSED hat keine Route, der lokale taskDone überstimmt reopenAt, und `api.briefing.updateDraft` ist ungenutzt.

13. **Widersprüchliche Zahlen.**
    - Hat Google einen Eintrag ohne Bewertungen, gilt rating als gemessen mit 0. Das Briefing sagt dann „Bewertungsschnitt anheben · +43“, der Bericht „Erste Google-Bewertungen sammeln“.
    - Start rechnet mit dem gespeicherten Snapshot, der Profil-Check mit dem frischen Abruf.
    - Im Wachstum steht der gemessene Score neben der Fixture-Erkenntnis „+20 Präsenzpunkte“.
    - Der Posteingang meldet „+12“, obwohl die Karte vorhanden ist.
    - Stärkste Stunde: +42 % gegenüber +41 % im Seed. ROI-Zeile 62 Reservierungen gegenüber Kachel 61. Benchmark: „Top 12 %“ gegenüber „Besser als 58 %“.
    - Ohne Google-Eintrag prüft die Website-Prüfung die Maitr-Web-App selbst (contactInfo.website = publishedUrl).
    - Unbelegte Prozentsätze stehen als Hebel-Detail neben Messwerten.

14. **Darstellungsfehler.**
    - Öffnungszeiten werden über fehlende Tage hinweg zusammengefasst („Mo bis Do“ ohne Mittwoch, dann „Jetzt geöffnet“ an einem unbekannten Tag).
    - `${tagline} · ${city}` ergibt „ · Köln“ bzw. „Slogan · “, und city enthält die PLZ.
    - KW-Pfeile laufen ohne Grenze.
    - Der Beitrags-Editor fällt auf posts[0] zurück und stürzt bei leerer Liste ab. Der Antwort-Editor fällt still auf Marion zurück, MetricDetail auf die erste Kennzahl.
    - Die Notiz „Von dir · schnell gepostet“ wird nie gerendert.

15. **Auch mit Freigabe unvollständig.**
    - Die Connectoren können nur lesen (fetchReviews, fetchEngagement, revokeAccess).
    - Google holt weder Search-Impressions noch Routen oder Anrufe, beide Anbieter liefern nur Tageswerte.
    - Das Panel-Versprechen „Antworten und die vollständige Liste kommen mit der Google-Freigabe“ trifft deshalb nicht zu.
    - „Google verbinden“ im Bewertungen-Tab endet im Onboarding-Schritt, und „Weiter“ führt nach /onboarding/zeiten.

16. **Konto löschen (Apple 5.1.1(v)).**
    - Auf HEAD und in Produktion antwortet DELETE /api/maitr/users/me mit 404.
    - Im Arbeitsbaum ist usersRouter eingehängt (`server/maitr/index.ts:44-49`), aber nicht deployt.
    - Ist das Token null, meldet die App „Konto gelöscht“ ohne Serveraufruf.
    - Ein Vertragstest für den Pfad, den die App wirklich baut, fehlt.

17. **Speisekarte auf HEAD.** Der Filter lässt nur Kaffee, Gebäck, Frühstück und Getränke durch, und die Kategorie „Speisekarte“ aus der Veröffentlichung fällt ebenfalls heraus. Eine echte Karte bleibt damit unsichtbar, und auch der Leerzustand erscheint nicht. Im Arbeitsbaum ist das behoben.

18. **Google-Places-Bedingungen (rechtlich klären, am Code nicht prüfbar).**
    - Bewertungstexte und photoUri liegen dauerhaft in PresenceSnapshot und im AsyncStorage.
    - Ohne Schlüssel bleibt ein alter Eintrag unbegrenzt stehen.
    - Die Autorenangaben für Rezensenten und Fotos werden verworfen (`places.ts:122,343-365`), und photoUri ist kurzlebig.
    - Historie für Deltas, Benchmark-Aggregation und Places-Fotos als Beitragsbild vor dem Bau klären.
    - Der Leertext „die neuesten“ ist irreführend, weil Places die 5 relevantesten Bewertungen liefert.

19. **Stempelkarte.** Der einzige durchgängig echte Bereich. Kleinbefunde:
    - `StampCardDetailScreen.tsx:57` prüft nur hasRealAuth.
    - Der Wallet-Kommentar „Passbau: NEIN“ widerspricht dem Wert true (`stempelkarte.ts:396-411`).
    - Ohne STAMPCARD_LINK_SECRET antwortet der Server mit 503, die App zeigt einen Toast.

20. **Widersprüche zwischen den Gegenprüfungen** (verschiedene Momentaufnahmen):
    - **Kanalstatus:** Die Wachstums-Prüfung sah den Seed. Die spätere Profil-Prüfung fand einen neuen Store-Effekt (`store.tsx:959-1000`), der channels aus GET /integrations setzt, ohne GBP also google=false. Zähler und „Verbunden“ können im neuesten Stand schon stimmen. Die festen G/Ig-Avatare und der Seed-Reset in signOut bleiben.
    - **Merkmal-Tags:** „echt, immer []“ gegenüber „leer-ehrlich“, in der Sache identisch.
    - **„Auf Google veröffentlichen“:** Attrappe gegenüber lokal. In beiden Fällen gibt es keinen Netzaufruf und einen falschen Chronik-Eintrag.
    - **PATCH /briefing/tasks/:taskId für Editor-Entwürfe:** „Route da“ gegenüber „fehlt“. Für Places-Bewertungen gilt die engere Aussage: 404 ohne MaitrReview.

21. **Kleinigkeiten.**
    - Der Schema-Kommentar „Gecachtes Analytics-Ergebnis…“ hängt jetzt über PresenceSnapshot (`prisma/schema.prisma:1047`).
    - /kanaele ist kein sichtbarer Tab.
    - „Maitr übernimmt, was sich automatisieren lässt“ im Onboarding hat keine Mechanik.
    - `if (s.posts)` übernimmt auch eine leere Liste.