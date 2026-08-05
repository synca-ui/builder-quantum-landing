# Machbarkeitsprüfung: weitergehende Feature-Ideen

Geprüft am 2026-08-04, Branch `chore/maitr-backend-und-sicherheitsfixes`.

Gegenstand ist ausschließlich die **technische Machbarkeit**, nicht die Produktidee.
Jede Aussage über den Code ist mit `datei:zeile` belegt, jede Aussage über fremde APIs
mit der Quelle, die ich dafür abgerufen habe. Wo ich etwas nicht prüfen konnte, steht
das im Abschnitt „Nicht geprüft" beim jeweiligen Punkt — nicht als Vermutung im Fließtext.

Es wurde kein Quellcode geändert und kein Build ausgeführt.

## Ergebnis auf einen Blick

| # | Idee | Urteil | Hauptgrund |
|---|------|--------|-----------|
| 1 | Wallet-Stempelkarte | EINGESCHRÄNKT | Zwei getrennte Infrastrukturen; Apple verlangt kostenpflichtiges Programm + eigenen Push-Dienst |
| 2 | Nachfrageprognose | EINGESCHRÄNKT | Kein offizieller Popular-Times-Zugang; GBP liefert nur Tageswerte; Zielgröße „Gästezahl" fehlt |
| 3 | Speisekarten-Sync | EINGESCHRÄNKT | Google-Food-Menu-API existiert und lebt, gilt aber nur für freigeschaltete Standorte; Instagram kann keine strukturierte Karte |
| 4 | Aktions-Posts | MACHBAR | Endpunkt existiert, `OFFER` ist ein gültiger Post-Typ — aber keine Erfolgsmessung mehr |
| 5 | Multi-Plattform-Bewertungen | NICHT MACHBAR | Tripadvisor und Yelp haben keine Antwort-Schnittstelle; Yelp hat keinen kostenlosen Tarif mehr |
| 6 | Android-App | MACHBAR | Natives Projekt liegt vor, Code ist plattformneutral; ~3–7 Personentage + 14 Kalendertage Play-Test |

Gemeinsame Vorbedingung für 2, 3 und 4: die Google-Business-Profile-APIs sind nicht frei
nutzbar. Das ist im Repo bereits dokumentiert
(`docs/integrations/GOOGLE_META_API_ACCESS.md:35-39`: „Ohne diese Freigabe ist die Quota
0. Bearbeitungszeit: Tage bis wenige Wochen") und im Connector als Kommentar vermerkt
(`packages/core/src/integrations/google.ts:9-11`). Ob die Freigabe inzwischen vorliegt,
konnte ich aus dem Repo nicht feststellen.

---

## 1. Wallet-Stempelkarte (Apple PassKit + Google Wallet)

**Urteil: EINGESCHRÄNKT.** Beides ist machbar, aber es sind zwei unterschiedlich teure
Systeme mit unterschiedlicher Update-Mechanik. Eine Behauptung des Vorschlags ist in
der vorliegenden Form falsch (siehe unten).

### Ausgangslage im Code

Es gibt keinen Wallet-Code. Weder in `mobile/package.json:15-39` (keine Pass-bezogene
Abhängigkeit) noch serverseitig (`server/maitr/` enthält `routes.ts`, `sync.ts`,
`briefing.ts`, `scheduler.ts`, `security.ts` — nichts zu Pässen). Das Feature startet bei
null.

### Apple: kostenpflichtiges Programm und eigenes Zertifikat — ja

Bestätigt. Ein Pass wird über einen **Pass Type Identifier** und ein darauf ausgestelltes
**Pass Type ID Certificate** signiert; beides wird in *Certificates, Identifiers &
Profiles* angelegt, erforderliche Rolle „Account Holder or Admin"
([Apple: Create Wallet identifiers and certificates](https://developer.apple.com/help/account/capabilities/create-wallet-identifiers-and-certificates/)).
Die Apple-Dokumentation sagt dazu: „Signing a pass requires a signing certificate for the
pass type identifier", und der Wert von `passTypeIdentifier` in `pass.json` muss zum
Zertifikat passen, der von `teamIdentifier` zum Apple-Developer-Account
([Apple: Building a Pass](https://developer.apple.com/documentation/walletpasses/building-a-pass)).
Die Mitgliedschaft im Apple Developer Program kostet **99 USD pro Jahr**
([Apple: Compare Memberships](https://developer.apple.com/support/compare-memberships/)).

Einschränkung meiner Prüfung: Apple schreibt auf keiner der von mir abgerufenen Seiten
den Satz „ein kostenloses Konto kann keine Pass Type IDs anlegen". Belegt ist nur, dass
der Vorgang im Programm-Portal stattfindet und Account-Holder-/Admin-Rolle verlangt. Das
Repo arbeitet iOS-seitig heute mit einem **kostenlosen Personal Team**
(`mobile/plugins/withLocalSigningTeam.js:17-19`: „Personal/Free Team mit lokalem
Zertifikat"), also wäre eine Programm-Mitgliedschaft in jedem Fall zusätzlich nötig — für
den App-Store-Versand ohnehin.

### Apple: „Feldänderung löst die Push-Aktualisierung aus" — so nicht richtig

Der Vorschlag verkürzt hier zu stark. Tatsächlich gilt:

1. Der Server muss einen **Web Service** mit vier Operationen bereitstellen:
   Pass registrieren, Liste aktualisierter Seriennummern liefern, aktualisierten Pass
   ausliefern, Registrierung löschen. Die Apple-Doku benennt sie als
   `Register-a-Pass-for-Update-Notifications`, `Get-the-List-of-Updatable-Passes`,
   `Send-an-Updated-Pass`, `Unregister-a-Pass-for-Update-Notifications`
   ([Apple: Adding a Web Service to Update Passes](https://developer.apple.com/documentation/walletpasses/adding-a-web-service-to-update-passes)).
2. Der Server muss **selbst eine APNs-Push-Nachricht senden**, und zwar „using the same
   certificate and private key that the creator of the pass used to sign the original,
   the push token registered by the device, and an empty JSON dictionary for the payload"
   (gleiche Quelle). Das Pass-Zertifikat ist also zugleich die APNs-Anmeldung.
3. Push funktioniert **nur produktiv**: „A push notification for a pass update works only
   in the production environment" (gleiche Quelle). Es gibt keine Sandbox-Abkürzung.
4. Erst nach dem Push holt das Gerät den neuen Pass ab. Ob der Nutzer davon *etwas
   sieht*, hängt am Feld `changeMessage`: „A format string for the alert text to display
   when the pass updates … You need to provide a value for the system to show a change
   notification"
   ([Apple: PassFieldContent](https://developer.apple.com/documentation/walletpasses/passfieldcontent)).

Kurz: die Feldänderung allein löst gar nichts aus. Der Auslöser ist ein selbst gesendeter
APNs-Push; `changeMessage` bestimmt nur den Text der Meldung.

Positiv für den Anwendungsfall: der Gast braucht **keine App**. Pässe dürfen per Download
auf einer Webseite oder als E-Mail-Anhang verteilt werden; für ein Bündel gilt der MIME-Typ
`application/vnd.apple.pkpasses` und die Grenze „up to 10 passes or 150 MB for a bundle of
passes"
([Apple: Distributing and updating a pass](https://developer.apple.com/documentation/walletpasses/distributing-and-updating-a-pass)).

### Google Wallet: Kontotyp und Freigabe

- **Kontotyp:** ein Issuer-Konto in der **Google Pay & Wallet Console**, dazu mindestens
  **ein Google-Cloud-Projekt und eine Dienstkonto-Anmeldung**
  ([Google Wallet FAQ](https://developers.google.com/wallet/retail/loyalty-cards/resources/faq)).
- **Freigabe:** neue Konten stehen im **Demo-Modus**: „In demo mode, you can create passes,
  but you won't have publishing access. The passes you create can only be issued to users
  who have the 'Admin' or 'Developer' role, or who have been added as a test account"
  ([Google: Setting up a Google Wallet API Issuer account](https://developers.google.com/wallet/retail/loyalty-cards/getting-started/issuer-onboarding)).
  Für den Regelbetrieb ist ein Antrag auf Publishing-Zugang nötig, dafür ein
  vollständiges Business-Profil samt Zahlungsprofil (gleiche Quelle).
- **Update-Mechanik — hier ist Google deutlich einfacher:** Es genügt ein
  `UPDATE`/`PATCH` auf das Objekt. Für eine Benachrichtigung setzt man zusätzlich
  `notifyPreference` auf `notifyOnUpdate`. Eigene Push-Infrastruktur entfällt.
- **Grenzen:** Benachrichtigt wird nur bei bestimmten Feldern — Klasse: `rewardsTier`,
  `secondaryRewardsTier`, `programName`; Objekt: `loyaltyPoints.balance`,
  `secondaryLoyaltyPoints.balance`. Und: „You may send a maximum of 3 updates that trigger
  a push notification in a 24 hour period", `notifyPreference` ist ein „transient field"
  und muss bei jedem Aufruf neu gesetzt werden
  ([Google: Trigger Push Notifications](https://developers.google.com/wallet/retail/loyalty-cards/use-cases/trigger-push-notifications)).
  Der Punktestand ist eines der benachrichtigungsfähigen Felder — für eine Stempelkarte
  also brauchbar, aber höchstens drei Stempel-Meldungen pro Tag und Karte.
- **Ratenlimit:** „Calls to the Google Wallet API are rate limited to 20 requests per
  second" ([FAQ](https://developers.google.com/wallet/retail/loyalty-cards/resources/faq)).

### Nicht geprüft

- Kosten der Google-Wallet-API (die FAQ nennt keine Gebühr; ich habe keine Preisseite
  gefunden und behaupte deshalb nicht, sie sei kostenlos).
- Länderverfügbarkeit von Google Wallet für deutsche Aussteller.
- Ob Apple eine Obergrenze für ausgestellte Pässe je Zertifikat hat.
- DSGVO-Bewertung (Stempelkarte ist personenbezogen) — nicht Gegenstand dieses Strangs.

---

## 2. Nachfrageprognose

**Urteil: EINGESCHRÄNKT.** Die Datenbeschaffung für Wetter und Ferien ist unproblematisch.
Das Problem liegt bei der Zielgröße: es gibt weder Stoßzeiten noch Gästezahlen.

### Die Behauptung „Popular Times sind nicht offiziell verfügbar" stimmt

Geprüft und bestätigt. Die Feldliste der Places API enthält über alle Preisstufen hinweg
(Essentials, Pro, Enterprise, Enterprise + Atmosphere) **kein Feld für Popular Times,
Busyness oder Auslastung**
([Google: Places API Data Fields](https://developers.google.com/maps/documentation/places/web-service/data-fields)).
Die Freigabe wird seit Jahren im öffentlichen Issue-Tracker gefordert
([Issue 35827550 „Expose Popular Times API"](https://issuetracker.google.com/issues/35827550)),
ohne dass ein offizieller Endpunkt existiert. Ich habe keinen offiziellen Weg gefunden.

### Was die GBP-Performance-API stattdessen liefert

- **Auflösung: nur täglich.** Der `DailyMetric`-Enum hat neben `DAILY_METRIC_UNKNOWN`
  zwölf Werte: Impressionen getrennt nach Desktop/Mobil × Maps/Suche,
  `BUSINESS_CONVERSATIONS`, `BUSINESS_DIRECTION_REQUESTS`, `CALL_CLICKS`,
  `WEBSITE_CLICKS`, `BUSINESS_BOOKINGS`, `BUSINESS_FOOD_ORDERS`,
  `BUSINESS_FOOD_MENU_CLICKS`. **Stundenwerte gibt es nicht**
  ([Google: DailyMetric](https://developers.google.com/my-business/reference/performance/rest/v1/DailyMetric)).
  Mehrere Aufrufe desselben Nutzers am selben Tag zählen als eine Impression.
- **Monatlich** gibt es zusätzlich die Suchbegriffe:
  `locations.searchkeywords.impressions.monthly` — „aggregated on a monthly basis",
  maximal 100 Ergebnisse pro Seite
  ([Google: searchkeywords.impressions.monthly.list](https://developers.google.com/my-business/reference/performance/rest/v1/locations.searchkeywords.impressions.monthly/list)).
- **Rückblick:** Dokumentiert sind 18 Monate — „The maximum range is 18 months from the
  request date. In some cases, the data may still be missing for days close to the request
  date"
  ([Google: BasicMetricsRequest](https://developers.google.com/my-business/reference/rest/v4/BasicMetricsRequest)).
  **Wichtige Einschränkung:** dieser Satz steht auf der Seite des **v4**-Anfragetyps, und
  die zugehörige Methode `accounts.locations.reportInsights` ist seit **30.03.2023
  abgeschaltet**
  ([Google: Deprecation schedule](https://developers.google.com/my-business/content/sunset-dates)).
  Für die heute genutzte v1-Performance-API habe ich **keine dokumentierte
  Rückblickgrenze gefunden** — weder auf der Methodenseite noch auf der Limits-Seite
  ([Usage limits](https://developers.google.com/my-business/content/limits), dort nur
  Ratenlimits: „Most APIs have a default of 300 QPM", „Edits: 10 per minute per Google
  Business Profile (cannot be increased)"). Die 18 Monate sind also ein plausibler, aber
  für die aktive API **nicht belegter** Wert.
- **Quota-Vorbehalt:** ohne die beantragte Freigabe ist die Quota 0
  (`docs/integrations/GOOGLE_META_API_ACCESS.md:35-39`).

### Korrektur an einer Stelle im eigenen Code

`packages/core/src/integrations/google.ts:115` trägt den Kommentar „Tages-Zeitreihen
(mehrere Metriken) auf **stündliche** Reichweite-Punkte falten". Das ist irreführend: die
Funktion erzeugt pro Tag genau einen Punkt und setzt ihn hart auf 12:00 UTC
(`google.ts:122`: `new Date(Date.UTC(year, month - 1, day, 12))`). Es entstehen keine
Stundenwerte und können auch keine entstehen — die Quelle liefert sie nicht. Wer auf
Basis dieses Kommentars eine Tagesverlaufsprognose plant, plant auf einer Datenquelle,
die es nicht gibt.

### DWD-Wetterdaten: ja, offen — mit Vorbehalt

- **Konkreter Endpunkt:** `https://opendata.dwd.de`. Rechtsgrundlage laut DWD: „According
  to a change in the Deutscher Wetterdienst Act, which has come into effect on 25.7.17,
  the DWD has been given the legal mandate to make its weather and climate information
  available mostly free of charge"
  ([DWD Open Data](https://www.dwd.de/EN/ourservices/opendata/opendata.html)).
  Ausdrücklicher Vorbehalt derselben Seite: „service and availability levels cannot be
  guaranteed for this service".
- **Für Ortsprognosen konkret:** `https://opendata.dwd.de/weather/local_forecasts/mos/` —
  Verzeichnis abgerufen, enthält `MOSMIX_L/`, `MOSMIX_S/`, `MOSMIX-SNOW_S/`. Das sind
  KMZ/GRIB-Dateien, **kein JSON**. Für einen Node-Server heißt das: eigener Parser.
- **Praktikablere Variante:** Bright Sky, ein offener JSON-Aufsatz auf DWD-Daten. Ich habe
  `https://api.brightsky.dev/current_weather?lat=52.52&lon=13.4` abgerufen; die Antwort
  kam mit Temperatur, Bedingung und den Quellstationen (`Berlin-Tempelhof`,
  `dwd_station_id: "00433"`). Das ist ein **Drittanbieter**, nicht der DWD selbst — die
  Verfügbarkeitszusage des DWD gilt dafür nicht.

### Ferien und Feiertage: ja, konkrete offene Quelle

**OpenHolidaysAPI**, „a small Open Data project that collects public holiday and school
holiday data and makes it available via an open REST API interface"
([openholidaysapi.org](https://www.openholidaysapi.org/en/)). Ich habe beide benötigten
Endpunkte live abgerufen, ohne Schlüssel:

- Feiertage: `https://openholidaysapi.org/PublicHolidays?countryIsoCode=DE&languageIsoCode=DE&validFrom=…&validTo=…&subdivisionCode=DE-BY`
  → lieferte u. a. Mariä Himmelfahrt (regional), Tag der Deutschen Einheit (national),
  Allerheiligen.
- Schulferien: `https://openholidaysapi.org/SchoolHolidays?countryIsoCode=DE&subdivisionCode=DE-BY&…`
  → lieferte sieben Ferienzeiträume mit Start-/Enddatum, u. a. Sommerferien
  03.08.–14.09.2026.

Offen: Lizenz und Betreiberzusagen. Auf der von mir abgerufenen Seite steht keine
Lizenzangabe; im Fußbereich erscheint „STÜBER SYSTEMS GmbH". Für den produktiven Einsatz
wäre das zu klären oder die Daten wären zu cachen.

### Der eigentliche Haken

Alle verfügbaren Signale sind **Sichtbarkeits-** und **Absichtsdaten** (Impressionen,
Klicks, Wegbeschreibungen), keine Gästezahlen. `BUSINESS_BOOKINGS` zählt nur Reservierungen
über „Reserve with Google". Eine Prognose braucht eine Zielgröße; die müsste maitr selbst
erheben (Reservierungen, Kassendaten). Im Repo gibt es serverseitig ein `Reservation`-Modell
(`prisma/schema.prisma:121`), aber das gehört zum Web-Baukasten (`Business`), nicht zu den
maitr-Modellen (`MaitrGuest`, `MaitrReview`, `MaitrEngagementPoint`, `ChannelConnection` ab
`prisma/schema.prisma:741`). Ohne eigene Zielgröße bleibt jede „Prognose" eine Heuristik
aus Wetter und Ferien.

---

## 3. Speisekarten-Sync

**Urteil: EINGESCHRÄNKT.** Bei Google ja, aber nicht für jeden Standort. Bei Instagram nein.

### Google: Die „Food Menu API" existiert, heißt so und lebt

- **Name und Ort:** `accounts.locations.getFoodMenus` und `accounts.locations.updateFoodMenus`,
  Host `mybusiness.googleapis.com`, Version **v4**
  ([Google: Update Food Menus](https://developers.google.com/my-business/content/update-food-menus)).
- **Aktiv?** Ja. Sie steht nicht auf der Abschaltliste
  ([Deprecation schedule](https://developers.google.com/my-business/content/sunset-dates) —
  dort nur `reportInsights`, Media-/Post-Insights, Health-Attribute, Business Calls API),
  und der Änderungsverlauf hat unter **2026-04-07** einen Eintrag, dass Food Menus auf
  200 Gerichtsfotos erweitert wurden
  ([Change Log](https://developers.google.com/my-business/content/change-log)).
  Umgekehrt sind `priceLists` „deprecated in favor of FoodMenus and Services"
  ([Add structured offering data](https://developers.google.com/my-business/content/offering-data)).
- **Für alle Betriebe?** Nein. „Not all locations are eligible to upload Food Menus";
  man muss `locations.get` aufrufen und prüfen, ob im `Metadata`-Feld `canHaveFoodMenus`
  auf `true` steht. Welche Kategorien oder Länder das erfüllen, **sagt Google nicht** —
  die Doku nennt ausschließlich das Flag. Das heißt für die Umsetzung: Eignung ist pro
  Standort zur Laufzeit abzufragen, eine Zusage an den Wirt vorab ist nicht möglich.
- **Datenmodell ist anspruchsvoller als das eigene:** Pflicht sind mindestens ein Menü mit
  mindestens einem Abschnitt mit mindestens einem Gericht, jeweils mit sprachmarkierten
  `labels` (`displayName` + `languageCode`), und je Gericht `attributes.price` als
  `Money`-Objekt mit Währung. Allergene, Ernährungsangaben und Küchenarten sind „highly
  recommended"
  ([Google: FoodMenus](https://developers.google.com/my-business/reference/rest/v4/FoodMenus)).

**Lücke im eigenen Code:** die Karte in der App ist ein reiner Client-Zustand.
`MenuItem` besteht aus `id`, `name`, `price: string` (Zeile 342), `category`
(`mobile/src/lib/store.tsx:339-344`), gepflegt in `mobile/src/features/menu/MenuScreen.tsx:26-40`.
Der Preis ist also **Text**, nicht Betrag+Währung, es gibt keine Sprachmarkierung und
keine Abschnittsstruktur im Google-Sinn. Serverseitig existiert zwar ein sauberes Modell
mit `price Decimal @db.Decimal(10,2)` (`prisma/schema.prisma:479-491`), das hängt aber an
`Business` (Web-Baukasten), nicht an den maitr-Modellen. Vor einem Sync stünde also:
Datenmodell serverseitig anlegen bzw. anbinden, Preise typisieren, Kategorien auf
Menü/Abschnitt abbilden.

### Instagram: strukturierte Speisekarte gibt es nicht

Die Veröffentlichungs-API kennt nur Medien: einzelne Bilder, Videos, Reels, Stories und
Karussells; JPEG als einziges Bildformat, Konto-Limit „100 API-published posts within a
24-hour moving period"
([Meta: Publish Content using the Instagram Platform](https://developers.facebook.com/docs/instagram-platform/content-publishing/)).
Ein Objekt für Speisekarten existiert dort nicht. Was Instagram an Menü-Funktion hat, sind
**Aktionsschaltflächen im App-Profil**, die über Partnerdienste (u. a. OpenTable, Resy,
ChowNow, GrubHub) eingerichtet werden und ein bestehendes Konto beim Partner voraussetzen
([Instagram-Hilfe: Aktionsschaltflächen](https://help.instagram.com/122793804938499),
[Aktionsschaltflächen-Partner](https://help.instagram.com/313280685976255)).
Die Aussage des Vorschlags „nur als Bild/Link" ist damit **richtig**.

Nicht geprüft: ob es einen API-Endpunkt gibt, um Bio-Text oder Website-Link eines
Instagram-Profils zu ändern (etwa um einen Karten-Link umzuhängen). In der
Content-Publishing-Dokumentation kommt so etwas nicht vor; ich habe die übrigen
Referenzseiten nicht durchsucht.

---

## 4. Aktions-Posts (Offer Posts)

**Urteil: MACHBAR** — mit einer Einschränkung, die im Vorschlag fehlt.

- **Der Endpunkt existiert:** `POST https://mybusiness.googleapis.com/v4/{parent=accounts/*/locations/*}/localPosts`
  ([Google: accounts.locations.localPosts.create](https://developers.google.com/my-business/reference/rest/v4/accounts.locations.localPosts/create)).
- **`OFFER` ist ein gültiger Typ:** `LocalPostTopicType` kennt `STANDARD`, `EVENT`,
  `OFFER` („Post contains basic information, an event and offer related content (e.g.
  coupon code)") und `ALERT`. Die Ressource hat `create`, `get`, `list`, `patch`, `delete`
  ([Google: accounts.locations.localPosts](https://developers.google.com/my-business/reference/rest/v4/accounts.locations.localPosts)).
- **Nicht abgeschaltet:** localPosts steht als Ressource nicht auf der Abschaltliste.
- **Aber:** `accounts.locations.localPosts.reportInsights` ist **seit 20.02.2023 tot, ohne
  Ersatz** („No direct replacement available",
  [Deprecation schedule](https://developers.google.com/my-business/content/sunset-dates)).
  Man kann Aktions-Posts also erstellen, aber **nicht mehr über die API messen, ob sie
  etwas gebracht haben**. Ein Wirkungsnachweis im Produkt („dein Angebot hatte X Aufrufe")
  ist über diesen Weg nicht mehr möglich; bleiben nur die tagesgenauen
  Standort-Gesamtmetriken aus Punkt 2.
- **Ratenlimit beachten:** „Edits: 10 per minute per Google Business Profile (cannot be
  increased)" ([Usage limits](https://developers.google.com/my-business/content/limits)).

Nicht geprüft: die genauen Pflichtfelder von `LocalPostOffer` (Gutscheincode,
Einlöse-URL, Bedingungen) — die Detailseite habe ich nicht vollständig auswerten können.

---

## 5. Multi-Plattform-Bewertungen (Tripadvisor, Yelp)

**Urteil: NICHT MACHBAR** für das, was maitr verspricht (Bewertungen *beantworten*).
Für reines Anzeigen: eingeschränkt und bei Yelp teuer.

### Tripadvisor Content API

- **Öffentlich zugänglich, ja.** Erste 5.000 Aufrufe pro Monat frei — „We offer the first
  5000 API calls for free every month after you sign up" —, aber: „You do need a credit
  card to sign up as any overage will be charged to the billing account you provided"
  ([Tripadvisor Content API FAQ](https://tripadvisor-content-api.readme.io/reference/faq)).
- **Nur lesend.** Die API hat fünf Endpunkte, alle GET: Location Details, Location Photos,
  Location Reviews, Location Search, Nearby Location Search. **Kein Schreibendpunkt, keine
  Antwortfunktion**
  ([Content API Overview](https://tripadvisor-content-api.readme.io/reference/overview)).
- **Menge:** „up to 5 reviews and 5 photos per location" (gleiche Quelle). Für einen
  Posteingang „alle offenen Bewertungen" reicht das nicht.
- **Auflagen:** Attribution ist Pflicht — „You must credit Tripadvisor … using the
  attribution images (logo, bubbles ratings) that we are sending as a part of the JSON
  results" ([FAQ](https://tripadvisor-content-api.readme.io/reference/faq)).

### Yelp

- **Kein kostenloser Tarif mehr.** Die Preisliste nennt für die Places API: Base
  „$229 per month" + „$5.91 per additional 1,000 API calls", Enhanced „$299 per month" +
  „$6.57", Premium „$643 per month" + „$14.13". Testphase: „5,000 free API calls during
  the 30-day trial period"
  ([Yelp Data Licensing: Pricing](https://business.yelp.com/data/resources/pricing/)).
- **Bewertungen nur als Ausschnitt:** „Get up to three review excerpts for a business"
  ([Yelp Fusion Intro](https://docs.developer.yelp.com/docs/fusion-intro)); die
  Tarifübersicht zeigt Review-Excerpts erst ab „Enhanced", Base hat „no photos or review
  excerpts" ([Plans](https://docs.developer.yelp.com/docs/plans)).
- **Antworten:** in der Fusion-Dokumentation nicht vorgesehen.

**Bewertung für den Zielnutzer:** 229 USD im Monat für drei Bewertungsausschnitte, die man
nicht beantworten kann, ist für einen kleinen Gastronomiebetrieb keine Option. Tripadvisor
wäre bezahlbar, löst aber die Kernaufgabe nicht, weil es keine Antwort-Schnittstelle gibt.

Nicht geprüft: ob Tripadvisor oder Yelp separate, nicht öffentlich beworbene
Partner-Programme mit Antwortfunktion betreiben (etwa für Reputationsmanagement-Anbieter).
Solche Programme wären typischerweise vertraglich und nicht per Selbstregistrierung
zugänglich — belegen kann ich das nicht.

---

## 6. Android-App

**Urteil: MACHBAR.** Das ist die einzige Position, die fast vollständig im Repo zu
beantworten ist. Der Stand ist deutlich weiter, als „noch nicht gemacht" vermuten ließe.

### Was schon trägt

- **`mobile/android/` existiert und ist versioniert.** 54 Dateien sind in Git verfolgt
  (`git ls-files mobile/android`), darunter `app/build.gradle`,
  `app/src/main/AndroidManifest.xml`, `MainActivity.kt`, `MainApplication.kt` und der
  vollständige Icon-Satz. Kurios, aber unschädlich: `mobile/.gitignore:39-41` listet
  `/ios` und `/android` als ignoriert — bereits verfolgte Dateien bleiben davon
  unberührt.
- **`mobile/app.json:18-29` hat einen vollständigen Android-Block:** `package`
  `app.maitr.mobile`, `versionCode 1`, `permissions: []`, adaptives Icon mit
  Vorder-/Hintergrund- und Monochrom-Ebene, `predictiveBackGestureEnabled: false`. Die drei
  Icon-Dateien liegen in `mobile/assets/` (`android-icon-foreground.png`,
  `-background.png`, `-monochrome.png`).
- **Das Manifest ist erzeugt und plausibel** (`mobile/android/app/src/main/AndroidManifest.xml`):
  `INTERNET`-Berechtigung, Deep-Link-Schemata `maitr` und `exp+maitr` (Zeile 28-29),
  `screenOrientation="portrait"` passend zu `orientation: "portrait"` in `app.json:7`.
- **Gradle ist konfiguriert:** `newArchEnabled=true`, `hermesEnabled=true`,
  `edgeToEdgeEnabled=true`, alle vier Architekturen
  (`mobile/android/gradle.properties:31-47`), Wrapper auf Gradle 9.3.1.
- **Der App-Code ist plattformneutral.** In 123 TS/TSX-Dateien mit zusammen 11.716 Zeilen
  (`mobile/app` + `mobile/src`) gibt es genau **zwei** plattformabhängige Stellen, und
  beide behandeln Android bereits: die Systemschrift-Rückfallebene
  (`mobile/src/theme/typography.ts:29-33`, `android: "sans-serif"`) und die Schatten, die
  auf Android korrekt über `elevation` gehen (`mobile/src/theme/layout.ts:32-43`).
  Kein `BackHandler`, kein `<Modal>`, keine `.ios.tsx`-Dateien.
- **Die beiden Config-Plugins stören Android nicht.** `withSpacePathFix.js` arbeitet
  ausschließlich über `withDangerousMod(config, ["ios", …])` (Zeilen 31-33 und 72-74),
  `withLocalSigningTeam.js` über `withXcodeProject` (Zeile 23). Beides läuft bei einem
  Android-Prebuild gar nicht erst an.
- **Keine iOS-exklusive Abhängigkeit.** `mobile/package.json:15-39` enthält nur Pakete mit
  Android-Unterstützung (Expo-Module, Reanimated 4.5, Screens, SVG, Supabase,
  AsyncStorage).

### Die eine echte Code-Lücke, die ich gefunden habe

`expo-blur` verhält sich auf Android anders. In der installierten Version 57.0.2 steht in
`mobile/node_modules/expo-blur/build/BlurView.types.d.ts:59-65`: `blurMethod` hat auf
Android den **Standardwert `'none'`** — „Renders a semi-transparent view instead of
rendering a blur effect" (Zeile 6) —, und für echtes Blur braucht die `BlurView` zusätzlich
einen `blurTarget`, also eine Referenz auf eine `BlurTargetView` (Zeilen 22-27). Die
Expo-Dokumentation bestätigt das: seit SDK 55 ist Android stabil, „but some code changes
are required for the BlurView to work"
([Expo: BlurView](https://docs.expo.dev/versions/latest/sdk/blur-view/)).

Im Code wird weder das eine noch das andere gesetzt: `mobile/src/components/ui/Glass.tsx:30-34`
übergibt nur `intensity`, `tint` und `style`. Auf Android bliebe der Glaseffekt der
Tabbar also **eine schlichte halbtransparente Fläche**. Die Reparatur ist klein, weil
`Glass` nur an einer Stelle benutzt wird: `mobile/src/components/MaitrTabBar.tsx:68`.

### Was fehlt oder ungeprüft ist

- **Keine EAS-Verknüpfung im Repo.** `mobile/app.json` enthält weder `extra.eas.projectId`
  noch `owner`, während `mobile/eas.json:4` `"appVersionSource": "remote"` setzt. Ein
  `eas init` ist also Voraussetzung — betrifft iOS genauso.
- **Kein Android-Profil in `eas.json`.** In `mobile/eas.json:6-26` stehen nur
  `ios`-Schlüssel. EAS kann Android mit Standardwerten bauen, aber Keystore/Credentials
  und ein `submit`-Block für Play sind nicht hinterlegt (`"submit": { "production": {} }`,
  Zeile 27-29).
- **Release signiert derzeit mit dem Debug-Keystore.** `mobile/android/app/build.gradle:112-115`:
  im `release`-Block steht `signingConfig signingConfigs.debug`, direkt unter dem
  Warnkommentar „Caution! In production, you need to generate your own keystore file"
  (Zeile 113). Das ist die Expo-Standardvorlage. Bei einem EAS-Build übernimmt EAS die
  Signatur; bei einem lokalen Release-Build wäre das ein Fehler.
- **`channel` ohne `expo-updates`.** Alle drei Profile setzen einen `channel`
  (`mobile/eas.json:11,16,20`), aber `expo-updates` steht nicht in den Abhängigkeiten und
  das Manifest hat `expo.modules.updates.ENABLED=false`
  (`mobile/android/app/src/main/AndroidManifest.xml:15`). Die Kanalangaben laufen ins
  Leere. Plattformübergreifend, kein Android-Sonderfall.
- **Keine lokale Android-Werkzeugkette auf diesem Rechner.** `ANDROID_HOME` und
  `ANDROID_SDK_ROOT` sind leer, `~/Library/Android/sdk` existiert nicht, `adb` und
  `emulator` fehlen. Installiert ist nur **JDK 22** (Amazon Corretto 22.0.2), während
  Android-Gradle-Builds üblicherweise auf JDK 17 oder 21 laufen. Ein lokaler Build würde
  also erst Android Studio/SDK und vermutlich ein zweites JDK erfordern — oder man baut
  ausschließlich über EAS in der Cloud.
- **Leerzeichen im Projektpfad: ungeprüft.** Der Pfad enthält „Antigravity Projects", und
  genau dafür existiert der iOS-Fix. Für Android sehe ich in
  `mobile/android/settings.gradle:3-14` und `mobile/android/app/build.gradle:12-20`, dass
  externe Aufrufe über `providers.exec { commandLine(...) }` bzw. Groovys
  `String[].execute()` laufen — beides ohne Shell, also ohne Wortzerlegung am Leerzeichen.
  Das ist ein Indiz, **kein Beweis**: ohne SDK konnte ich keinen Build ausführen.
- **`mobile/android/build/generated/autolinking/` liegt vom 03.08.2026 vor**, es gibt aber
  **kein APK und kein AAB** im Baum. Es ist also höchstens eine Konfigurationsphase
  gelaufen, nie ein vollständiger Build.

### Aufwand — realistisch

Entwicklungsseitig, unter der Annahme, dass über EAS gebaut wird:

| Arbeit | Schätzung |
|---|---|
| EAS-Projekt verknüpfen, Android-Credentials, erster interner Build | 0,5–1 Tag |
| Blur-Reparatur (`Glass`/`MaitrTabBar`) + Sichtprüfung Tabbar, Schatten, Edge-to-Edge, Statusleiste, Zurück-Geste | 1–3 Tage |
| Test auf echten Geräten, mindestens zwei Android-Versionen | 1–2 Tage |
| Play-Console-Eintrag: Datensicherheits-Formular, Beschreibung, Screenshots in Android-Formaten | 1 Tag |
| **Summe Entwicklung** | **≈ 3–7 Personentage** |

Nicht verhandelbar ist dagegen der **Kalender**: Google Play kostet einmalig 25 USD
([Play Console: Erste Schritte](https://support.google.com/googleplay/android-developer/answer/6112435?hl=de)),
und für **private Entwicklerkonten, die nach dem 13.11.2023 erstellt wurden**, gilt: vor
dem Produktionszugang ist ein geschlossener Test „mit mindestens 12 Testern … die
mindestens während der letzten 14 Tage fortlaufend angemeldet waren" nachzuweisen; die
14 Tage müssen zusammenhängend sein
([Play Console: Testanforderungen](https://support.google.com/googleplay/android-developer/answer/14151465?hl=de)).
Ob das maitr-Konto darunter fällt (privat vs. Organisation, Erstellungsdatum), konnte ich
nicht prüfen.

**Also: Wochen an Wartezeit, aber nur Tage an Arbeit.** Von den sechs geprüften Positionen
ist Android die einzige, die von keiner fremden inhaltlichen Freigabe abhängt — Play prüft
die App, nicht den Datenzugang.

---

## Was ich generell nicht prüfen konnte

- **Kontostände und Freigaben.** Ob eine Apple-Developer-Program-Mitgliedschaft, ein
  Play-Konto, eine GBP-API-Freigabe oder ein Meta-App-Review vorliegen, steht nicht im
  Repo. Alle Zeitangaben oben sind deshalb reine Arbeitsaufwände plus dokumentierte
  Wartefristen, ohne Antragsdauern.
- **Kein Build, kein Emulator.** Weder iOS noch Android wurden gebaut (Vorgabe des
  Auftrags bzw. fehlendes SDK). Aussagen über Laufzeitverhalten auf Android sind aus dem
  Quelltext und den Paketdefinitionen abgeleitet, nicht beobachtet.
- **Preise fremder Dienste** habe ich nur zitiert, wo eine Anbieterseite sie nennt. Wo
  keine Seite gefunden wurde (Google Wallet), steht das ausdrücklich da statt einer
  Schätzung.
- **Rechtliches** (DSGVO bei Stempelkarten und Gästedaten, Nutzungsbedingungen von
  Tripadvisor beim Speichern von Bewertungen) ist nicht Gegenstand dieses Strangs.
