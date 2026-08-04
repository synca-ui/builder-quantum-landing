# Machbarkeitspruefung: die fuenf naheliegenden Feature-Vorschlaege

Stand: 2026-08-04. Branch `chore/maitr-backend-und-sicherheitsfixes`.
Geprueft wurde, ob die technischen Behauptungen hinter den fuenf Vorschlaegen heute
noch stimmen — nicht, ob die Vorschlaege gut sind.

## Methode und Grenzen

Belegt wurde auf drei Wegen, in absteigender Belastbarkeit:

1. **Googles maschinenlesbare Discovery-Dokumente**, von mir am 2026-08-04 direkt
   per `curl` abgerufen. Das sind die versionierten Vertraege, die Google selbst
   ausliefert:
   - `https://mybusinessbusinessinformation.googleapis.com/$discovery/rest?version=v1`
     → HTTP 200, `revision: 20260803`
   - `https://businessprofileperformance.googleapis.com/$discovery/rest?version=v1`
     → HTTP 200, `revision: 20260802`
   - `https://mybusinessqanda.googleapis.com/$discovery/rest?version=v1`
     → HTTP 200, `revision: 20260803`
   - `https://mybusiness.googleapis.com/$discovery/rest?version=v4`
     → **HTTP 404** (`"Method not found."`). Fuer v4 gibt es kein oeffentliches
     Schema; alles zu v4 stuetzt sich daher nur auf Doku-Seiten.
2. **Live-Aufrufe der offenen Feiertags-/Ferien-APIs** — mit Statuscodes unten.
3. **Doku-Seiten von Google und Meta.** URLs stehen jeweils am Ort der Aussage und
   gesammelt am Ende.

**Was ich nicht konnte:** kein einziger authentifizierter Aufruf gegen Google oder
Meta. Der Zugriff auf die Business Profile API ist antragspflichtig
(`docs/integrations/GOOGLE_META_API_ACCESS.md:20`), Meta verlangt App Review
(`packages/core/src/integrations/meta.ts:12-13`). Jede Aussage zum Laufzeitverhalten
— liefert ein Endpunkt Daten, ist ein Feld befuellt, scheitert ein Aufruf — ist aus
der Spezifikation abgeleitet, nicht gemessen. Wo das den Unterschied macht, steht es
im Abschnitt.

Kein Build, kein voller Testlauf, kein Quellcode geaendert.

## Ergebnis in einer Zeile pro Vorschlag

| # | Vorschlag | Urteil | Der Punkt, an dem es haengt |
|---|---|---|---|
| 1 | Bewertungs-Akquise per QR | **MACHBAR** | Google liefert den fertigen Link als `metadata.newReviewUri` — kein Places-Lookup, keine Kosten. Google bietet Link und QR aber selbst schon an. |
| 2 | Oeffnungszeiten-Waechter | **MACHBAR** | `specialHours` existiert und ist schreibbar; Feiertage und Schulferien gibt es als offene API, live geprueft. |
| 3 | Google Q&A-Antworten | **NICHT MACHBAR** | Die API wurde am 2025-11-03 abgeschaltet. Kein Ersatz. |
| 4 | Wochenbericht | **MACHBAR** | Zwoelf Tagesmetriken inkl. Routenanfragen — der vorhandene Aufruf im Code passt aber nicht zur Spezifikation. |
| 5 | Foto-Pflege | **EINGESCHRAENKT** | Google ja; Instagram technisch ja, aber die Publish-Berechtigung wird gar nicht angefragt. |

---

## 1. Bewertungs-Akquise per QR — MACHBAR

### Gibt es einen offiziellen, stabilen Review-Deeplink?

Ja, und zwar besser als die kursierende Bastelloesung.

**Der offizielle Weg ueber die API.** Das `Metadata`-Objekt der Location-Ressource
traegt drei Ausgabefelder. Woertlich aus dem Discovery-Dokument
`mybusinessbusinessinformation` v1, revision 20260803:

- `newReviewUri` — "Output only. A link to the page on Google Search where a customer
  can leave a review for the location."
- `placeId` — "Output only. If this location appears on Google Maps, this field is
  populated with the place ID for the location. This ID can be used in various Places
  APIs. This field can be set during Create calls, but not for Update."
- `mapsUri` — "Output only. A link to the location on Maps."

Google liefert den fertigen Bewertungslink also selbst mit, sobald ein Standort
verbunden ist. Man muss nichts zusammensetzen.

Abruf ueber `GET .../v1/accounts/{accountId}/locations` mit `readMask` (Pflicht);
damit `metadata` zurueckkommt, muss es in der `readMask` stehen.
Quelle: <https://developers.google.com/my-business/reference/businessinformation/rest/v1/accounts.locations/list>

Gedeckt ist das vom Scope `https://www.googleapis.com/auth/business.manage`, den
`packages/core/src/integrations/google.ts:18-20` bereits anfragt. **Kein neuer Scope.**

**Was NICHT offiziell ist.** Das verbreitete Format
`https://search.google.com/local/writereview?placeid=…` habe ich in keiner
offiziellen Google-Seite gefunden, die ich abgerufen habe — nur in Agenturblogs und
Foren. Es funktioniert vermutlich, aber ohne Bestandszusage. `newReviewUri` ersetzt es.

**Nicht mehr nutzbar:** `g.page/…`-Kurzlinks. Googles Hilfeseite sagt woertlich:
"Kurznamen können nicht mehr erstellt oder bearbeitet werden. Bereits vorhandene
Kurznamen und ‑URLs funktionieren weiterhin, werden Kunden aber nicht mehr im
Unternehmensprofil angezeigt."
Quelle: <https://support.google.com/business/answer/9273900?hl=de>

### Braucht man die Place-ID? Kostet ein Lookup?

**Fuer verbundene Betriebe: nein.** `newReviewUri` und `placeId` kommen mit dem
Location-Abruf. Kein Places-Aufruf, keine Kosten.

Nur wenn man Betriebe **ohne** OAuth-Verbindung adressieren wollte — etwa ein
QR-Poster fuer einen Interessenten vor Vertragsabschluss — braucht es die Places API:

- Die reine ID-Ermittlung steht in der Preisliste als SKU "Places API Place Details
  Essentials (IDs Only)" (SKU-Code 5C36-E272-E88F) mit "Unlimited" ohne Kosten.
  Quelle: <https://developers.google.com/maps/billing-and-pricing/pricing>
- Die Places-Dokumentation formuliert es so: Place IDs lassen sich "at no charge"
  auffrischen, wenn man ein Place-Details-Request stellt und **nur** das ID-Feld
  anfordert; ein erneuter Suchaufruf wird "billed at the appropriate SKU".
  Quelle: <https://developers.google.com/maps/documentation/places/web-service/place-id>
- *Vorbehalt:* Die Preistabelle habe ich ueber einen Markdown-Konverter gelesen, nicht
  gerendert im Browser. Vor einer Kalkulation gegenpruefen. Ebenso ungeprueft: dass
  das pauschale 200-USD-Monatsguthaben im Maerz 2025 durch Freikontingente **pro SKU**
  abgeloest wurde (nur Sekundaerquellen; Google-FAQ unter
  <https://developers.google.com/maps/billing-and-pricing/faq> nicht im Volltext
  gelesen).

### Was im Repo schon liegt

- `qrcode` ist bereits Root-Abhaengigkeit (`package.json:52`). Die QR-Erzeugung ist
  kein neuer Baustein.
- Eine oeffentliche Bildablage existiert serverseitig: `uploadImageToStorage` gibt eine
  oeffentliche CDN-URL zurueck (`server/services/supabaseStorage.ts:56`, Rueckgabe in
  `:88`), benutzt in `server/routes/media.ts:87`. Ein erzeugtes QR-PNG hat damit
  sofort eine teilbare URL.
- Was fehlt: `resolveAccountId` fragt heute nur `readMask=name`
  (`server/maitr/routes.ts:311`). Ohne `metadata` in der `readMask` kommt
  `newReviewUri` nie an.

### Der ehrliche Vorbehalt

Google gibt dem Wirt Link **und** QR-Code heute schon selbst: Unternehmensprofil →
"Rezensionen lesen" → "Mehr Rezensionen erhalten", dort Link kopieren oder QR-Code als
Bild speichern. Die Hilfeseite vermerkt dabei, dass QR-Codes fuer Rezensionen "nur in
einem Computerbrowser und nicht auf Mobilgeraeten generiert werden" koennen.
Quelle: <https://support.google.com/business/answer/16816815?hl=de>

Der Mehrwert von maitr liegt also nicht im QR-Code, sondern darin, dass der Wirt ihn
nicht suchen muss, ihn vom Telefon aus bekommt, und dass maitr misst, ob danach mehr
Bewertungen eintreffen. Wer das Feature als "Google kann das nicht" verkauft, sagt die
Unwahrheit.

### Urteil

**MACHBAR**, und der billigste der fuenf: ein zusaetzliches Feld in einer bestehenden
Leseabfrage, kein neuer Scope, kein neues Freigabeverfahren, keine laufenden Kosten.

---

## 2. Oeffnungszeiten-Waechter — MACHBAR

### Existiert `specialHours`?

Ja. Feldname exakt `specialHours` in der Location-Ressource der **Business Information
API v1**. Woertlich aus dem Discovery-Dokument (revision 20260803):

> Optional. Special hours for the business. This typically includes holiday hours, and
> other times outside of regular operating hours. **These override regular business
> hours. This field cannot be set without regular hours.**

Der letzte Satz ist eine harte Vorbedingung: Ein Betrieb ohne gepflegte `regularHours`
kann keine Sonderzeiten bekommen. Der Waechter muss das zuerst pruefen und
gegebenenfalls die regulaeren Zeiten anmahnen, statt am Feiertag zu scheitern.

Struktur:

```
SpecialHours
  specialHourPeriods[] : SpecialHourPeriod   "A list of exceptions to the business's regular hours."

SpecialHourPeriod
  startDate : Date       "The calendar date this special hour period starts on."
  endDate   : Date       "If set, this field must be equal to or at most 1 day after startDate."
  openTime  : TimeOfDay  "Valid values are 00:00-24:00 … Must be specified if closed is false."
  closeTime : TimeOfDay  "Valid values are 00:00-24:00 … Must be specified if closed is false."
  closed    : boolean    "If true, endDate, openTime, and closeTime are ignored …"
```

Quelle: <https://developers.google.com/my-business/reference/businessinformation/rest/v1/accounts.locations>

Praktische Folge aus der `endDate`-Regel: Ein mehrtaegiger Betriebsurlaub ist **nicht**
ein Eintrag, sondern einer pro Tag. Zwei Wochen Sommerpause sind 14 Perioden.

Daneben: `regularHours` (`BusinessHours` → `periods[]`) und `moreHours` (fuer
Abteilungen wie Kueche vs. Bar).

### Welcher Endpunkt?

Woertlich aus dem Discovery-Dokument, Methode `mybusinessbusinessinformation.locations.patch`:

```
httpMethod : PATCH
path       : v1/{+name}
name       : pattern ^locations/[^/]+$   required: true
             "Google identifier for this location in the form: locations/{location_id}."
updateMask : "Required. The specific fields to update."
validateOnly (optional)
```

Volle URL:
`PATCH https://mybusinessbusinessinformation.googleapis.com/v1/locations/{locationId}?updateMask=specialHours`
Scope: `https://www.googleapis.com/auth/business.manage` — **derselbe, der schon
angefragt wird** (`packages/core/src/integrations/google.ts:18-20`).
Quelle: <https://developers.google.com/my-business/reference/businessinformation/rest/v1/locations/patch>

Zwei Dinge zum Mitnehmen:

1. Der Ressourcenname ist `locations/*`, **nicht** `accounts/*/locations/*`. Genau
   dieselbe Falle wie bei der Performance API, siehe Abschnitt 4. Gespeichert wird bei
   maitr die lange Form (`server/maitr/routes.ts:317`,
   `packages/core/src/integrations/google.ts:87`) — sie muss fuer diesen Aufruf
   gekuerzt werden.
2. `validateOnly=true` erlaubt einen Trockenlauf. Bei einem Feature, das erstmals
   schreibend in ein fremdes Profil eingreift, ist das kein Feinschliff.

Kontingent: 300 QPM fuer die Business Information API.
Quelle: <https://developers.google.com/my-business/content/limits>

### Offene Datenquellen fuer deutsche Feiertage und Schulferien

Alle am 2026-08-04 selbst abgerufen, ohne Schluessel, ohne Registrierung.

**OpenHolidays API** — die einzige der drei, die *beides* liefert, bundeslandgenau.

```
GET https://openholidaysapi.org/PublicHolidays?countryIsoCode=DE&languageIsoCode=DE
    &subdivisionCode=DE-BY&validFrom=2026-08-01&validTo=2026-12-31        → HTTP 200
GET https://openholidaysapi.org/SchoolHolidays?countryIsoCode=DE&languageIsoCode=DE
    &subdivisionCode=DE-BY&validFrom=2026-08-01&validTo=2026-12-31        → HTTP 200
```

Echte Antwortauszuege:

```json
{"startDate":"2026-08-15","endDate":"2026-08-15","type":"Public",
 "name":[{"language":"DE","text":"Mariä Himmelfahrt"}],
 "regionalScope":"Regional","nationwide":false,
 "subdivisions":[{"code":"DE-SL"},{"code":"DE-BY"}]}

{"startDate":"2026-08-03","endDate":"2026-09-14","type":"School",
 "name":[{"language":"DE","text":"Sommerferien"}],
 "subdivisions":[{"code":"DE-BY"}]}
```

Fuer Gastronomie direkt relevant: die API kennt auch *lokale* Feiertage. Fuer
2026-08-08 liefert sie "Friedensfest" mit `"regionalScope":"Local"` und
`"subdivisions":[{"code":"DE-BY-AU"}]` — nur Stadtgebiet Augsburg. Ein Waechter, der
nur auf Bundesland-Ebene arbeitet, gibt einem Augsburger Wirt falsche Ansagen.

Grenze selbst nachgemessen: Eine Spanne ueber fuenf Jahre
(`validFrom=2022-01-01&validTo=2026-12-31`) wird mit **HTTP 400** abgelehnt. Die vom
Anbieter genannte Maximalspanne von drei Jahren ist damit real, nicht nur dokumentiert.
Quelle: <https://www.openholidaysapi.org/>

**feiertage-api.de** — nur Feiertage, dafuer mit Erlaeuterungstext:

```
GET https://feiertage-api.de/api/?jahr=2026&nur_land=BY                    → HTTP 200
→ {"Augsburger Friedensfest":{"datum":"2026-08-08",
   "hinweis":"Das Augsburger Friedensfest ist nur im Stadtgebiet Augsburg …"}}
```

**date.nager.at** — nur Feiertage, international, Bundeslaender als `counties`:

```
GET https://date.nager.at/api/v3/PublicHolidays/2026/DE                    → HTTP 200
→ {"date":"2026-01-06","localName":"Heilige Drei Könige","global":false,
   "counties":["DE-BW","DE-BY","DE-ST"],"types":["Public"]}
```

**ferien-api.de** — beim Test **HTTP 429** (Rate Limit), ohne vorherige Anfragen.
Als Quelle nicht empfehlenswert.

**Empfehlung:** OpenHolidays als einzige Quelle, Jahresdaten einmal jaehrlich abholen
und lokal ablegen statt bei jedem Lauf live fragen. Alle drei erreichbaren Dienste sind
Freiwilligenprojekte ohne zugesicherte Verfuegbarkeit — Lizenzbedingungen habe ich
nicht gelesen.

Nicht geprueft: die Ableitung des Bundeslandes aus der Location-Adresse
(`storefrontAddress.administrativeArea` → `DE-BY`). Das Mapping ist Handarbeit.

### Urteil

**MACHBAR**, und von den fuenf der mit dem klarsten Nutzen: Der Wirt vergisst die
Feiertagszeiten, nicht die regulaeren.

Die ehrliche Einschraenkung ist produktlich, nicht technisch. Automatisch
`closed: true` fuer jeden Feiertag zu schreiben, ist falsch — viele Gastronomen haben
gerade dann offen. Der Wert liegt im Hinweis ("Am 3.10. ist Feiertag, deine
Sonderzeiten fehlen") und in der Bestaetigung durch den Wirt, nicht im stillen
Schreiben.

---

## 3. Google Q&A-Antworten — NICHT MACHBAR

Der Vorschlag nennt das den "billigsten Ausbau ueberhaupt". Das ist falsch, und zwar
nicht knapp.

### Der Befund

Google hat die My Business Q&A API **am 3. November 2025 abgeschaltet**. Aus dem
offiziellen Aenderungsprotokoll, woertlich:

> "The My Business Q&A API was discontinued on November 3, 2025. You can no longer read
> or post questions and answers using the API."

Und der Eintrag vom 2025-09-15 davor:

> "On November 3, 2025, we will be discontinuing the My Business Q&A API as we are in
> the process of updating the Q&A functionality and user experience."

Quelle: <https://developers.google.com/my-business/content/qanda/change-log>

Betroffen war v1 unter `mybusinessqanda.googleapis.com`. Google nennt keinen
Nachfolger und keinen Termin, nur "updating the Q&A functionality and user experience".

### Zwei Fallen, die man kennen sollte

**Falle 1: Die Sunset-Seite zeigt es nicht.** Auf Googles Deprecation-Zeitplan
(<https://developers.google.com/my-business/content/sunset-dates>) steht die Q&A-API
**nicht**. Dort stehen nur aeltere Faelle: `reportInsights` (abgeschaltet 2023-03-30),
Business Calls API, `locations.associate`, Health-Provider-Methoden. Die Abschaltung
lief allein ueber das Change-Log der Q&A-API. Wer nur die Sunset-Seite prueft,
uebersieht sie.

**Falle 2: Das Discovery-Dokument lebt weiter.** Mein Abruf von
`https://mybusinessqanda.googleapis.com/$discovery/rest?version=v1` am 2026-08-04
antwortet mit **HTTP 200**, `revision: 20260803`, und listet alle sieben Methoden:

```
locations.questions.list / .create / .patch / .delete
locations.questions.answers.list / .upsert / .delete
```

Wer nur das prueft, haelt die API fuer lebendig. Google liefert das Vertragsdokument
weiter aus, die Endpunkte sind laut eigenem Aenderungsprotokoll abgeschaltet. Ohne
gueltiges Token konnte ich nicht nachmessen, was ein echter Aufruf zurueckgibt — das
Aenderungsprotokoll ist hier aber die staerkere Quelle als ein weitergepflegtes Schema.

### Urteil

**NICHT MACHBAR.** Streichen — nicht "spaeter", nicht "wenn die Freigabe da ist".
Auch mit mehr Aufwand geht es nicht: ohne API bliebe nur Scraping der oeffentlichen
Profilseite, und das ist als Produktbestandteil nicht tragbar.

Wenn die Gesamteinschaetzung der fuenf Vorschlaege auf diesem Punkt mitruht, kippt sie.

---

## 4. Wochenbericht — MACHBAR (aber der vorhandene Aufruf stimmt nicht)

### Welche Kennzahlen liefert die Performance API tatsaechlich?

Vollstaendige `dailyMetrics`-Aufzaehlung, woertlich aus dem Discovery-Dokument
`businessprofileperformance` v1, revision 20260802:

```
DAILY_METRIC_UNKNOWN
BUSINESS_IMPRESSIONS_DESKTOP_MAPS
BUSINESS_IMPRESSIONS_DESKTOP_SEARCH
BUSINESS_IMPRESSIONS_MOBILE_MAPS
BUSINESS_IMPRESSIONS_MOBILE_SEARCH
BUSINESS_CONVERSATIONS
BUSINESS_DIRECTION_REQUESTS
CALL_CLICKS
WEBSITE_CLICKS
BUSINESS_BOOKINGS
BUSINESS_FOOD_ORDERS
BUSINESS_FOOD_MENU_CLICKS
```

Zwoelf Werte, elf davon nutzbar. Beschreibungen woertlich aus der Referenz
(<https://developers.google.com/my-business/reference/performance/rest/v1/DailyMetric>):

| Metrik | Beschreibung |
|---|---|
| `BUSINESS_DIRECTION_REQUESTS` | "The number of times a direction request was requested to the business location." |
| `CALL_CLICKS` | "The number of times the business profile call button was clicked." |
| `WEBSITE_CLICKS` | "The number of times the business profile website was clicked." |
| `BUSINESS_FOOD_MENU_CLICKS` | "The number of clicks to view or interact with the menu content on the business profile." |
| `BUSINESS_FOOD_ORDERS` | "The number of food orders received from the business profile." |
| `BUSINESS_BOOKINGS` | "The number of bookings made from the business profile via Reserve with Google." |
| `BUSINESS_CONVERSATIONS` | "The number of message conversations received on the business profile." |
| `BUSINESS_IMPRESSIONS_*` (4×) | "Business impressions on Google Maps/Search on Desktop/Mobile devices. Multiple impressions by a unique user within a single day are counted as a single impression." |

**Sind Routenanfragen dabei? Ja** — `BUSINESS_DIRECTION_REQUESTS`. Zusammen mit
`CALL_CLICKS` und `BUSINESS_FOOD_MENU_CLICKS` ist das der fuer einen Wirt
interessanteste Teil; Impressions allein sagen ihm wenig.

Ein Rechenfehler, den man dabei nicht machen sollte: Die vier Impressions-Metriken sind
laut Beschreibung **Tages-Unique-Werte**. Der Code addiert sie heute ueber alle
Metriken hinweg (`packages/core/src/integrations/google.ts:118-124`) und zaehlt damit
einen Nutzer, der Maps *und* Suche benutzt hat, doppelt. Fuer einen Trend reicht das,
als absolute Zahl im Wochenbericht ist es irrefuehrend.

Zusaetzlich verfuegbar: `locations.searchkeywords.impressions.monthly.list` — die
Suchbegriffe, ueber die Leute den Betrieb finden, monatlich.
Quelle: <https://developers.google.com/my-business/content/performance/change-log>

### Wie weit reicht die Historie zurueck?

**Hier muss ich einschraenken.** Fuer die aktive v1 habe ich *keine* offizielle Angabe
zur Historientiefe gefunden — weder in der `DailyMetric`-Referenz, noch auf der
Methodenseite, noch auf der Limits-Seite
(<https://developers.google.com/my-business/content/limits>, die spricht nur ueber
300 QPM), noch im Discovery-Dokument.

Die verbreitete 18-Monats-Zahl stammt aus der **Vorgaenger-API v4**
(`BasicMetricsRequest`), dort woertlich:

> "The maximum range is 18 months from the request date."

Quelle: <https://developers.google.com/my-business/reference/rest/v4/BasicMetricsRequest>
Diese Struktur gehoert zu `reportInsights`, und das ist laut Sunset-Seite bereits am
2023-03-30 abgeschaltet worden. Ob die Angabe fuer v1 unveraendert gilt, ist **nicht
belegt**; zahlreiche Drittquellen behaupten es, keine offizielle.

Praktisch ist die Frage fuer maitr zweitrangig: `pullChannel` persistiert die Werte
ohnehin selbst (`server/maitr/sync.ts:108-120`, Upsert in `MaitrEngagementPoint`). Der
Wochenbericht sollte aus der eigenen Tabelle rechnen. Relevant waere die Historientiefe
nur beim allerersten Abzug und bei einem Jahresvergleich — und dann muesste sie an
einem echten Konto gemessen werden.

### Der vorhandene Aufruf im Code stimmt nicht mit der Spezifikation ueberein

Das ist der wichtigste Befund dieses Abschnitts. Er betrifft nicht nur den
Wochenbericht, sondern die Reichweitendaten insgesamt.

Aus dem Discovery-Dokument, Methode `fetchMultiDailyMetricsTimeSeries`:

```
path       : v1/{+location}:fetchMultiDailyMetricsTimeSeries
location   : pattern ^locations/[^/]+$   required: true
parameter  : dailyMetrics,
             dailyRange.startDate.{year,month,day},
             dailyRange.endDate.{year,month,day}
```

Was der Code baut (`packages/core/src/integrations/google.ts:72-75`):

```
`${PERFORMANCE_BASE}/${account}:fetchMultiDailyMetricsTimeSeries`
  + `?dailyMetrics=BUSINESS_IMPRESSIONS_DESKTOP_MAPS`
  + `&dailyMetrics=BUSINESS_IMPRESSIONS_MOBILE_MAPS`
```

**a) Falscher Ressourcenpfad.** `account` wird gegen
`/^accounts\/[A-Za-z0-9_-]+\/locations\/[A-Za-z0-9_-]+$/` geprueft
(`packages/core/src/integrations/google.ts:87`) und genau so befuellt: `resolveAccountId`
setzt Konto und Standort zusammen (`server/maitr/routes.ts:317`). Die URL wird damit zu
`…/v1/accounts/X/locations/Y:fetchMulti…`, wo `…/v1/locations/Y:fetchMulti…` erwartet
wird. Die Reviews-API v4 verlangt umgekehrt tatsaechlich die lange Form
(`packages/core/src/integrations/google.ts:61`) — beide Endpunkte teilen sich in
`packages/core/src/integrations/types.ts:41` aber dasselbe Feld `accountId`.

**b) Fehlender Zeitraum.** `dailyRange` wird nicht gesetzt.
*Einschraenkung:* Im Discovery-Dokument ist nur `location` explizit
`required: true`; bei `dailyRange.*` und `dailyMetrics` fehlt das Flag. Die
Referenzseite bezeichnet beide dagegen als Required
(<https://developers.google.com/my-business/reference/performance/rest/v1/locations/fetchMultiDailyMetricsTimeSeries>).
Ob ein Aufruf ohne `dailyRange` einen Fehler oder eine leere Antwort erzeugt, konnte
ich ohne Token nicht messen.

Fuer den Pfad-Fehler gilt das nicht: der ist eindeutig.

Warum das operativ zaehlt: Ein Fehler in `fetchEngagement` landet in `syncAll` und
markiert die Verbindung als `EXPIRED` (`server/maitr/sync.ts:143-150`). Die Diagnose
zeigt dann auf ein Token-Problem, wo in Wahrheit die URL falsch ist. Und
`stats.impressions` im heutigen Tagesbriefing (`server/maitr/briefing.ts:47-49`, `:64`)
rechnet ueber eine leere Tabelle.

### Nebenbefund zur Instagram-Seite des Berichts

Wenn der Wochenbericht auch Instagram-Zahlen enthalten soll, ist die zweite Haelfte des
Datenpfads ebenfalls defekt. Hier gibt es inzwischen eine **offizielle** Quelle.

`packages/core/src/integrations/meta.ts:67` fragt `metric=impressions,reach,profile_views`.
Aus Metas eigenem Graph-API-Changelog v22.0, woertlich:

> "Introducing the following metrics field for media and user insights: `views`"
>
> Deprecating: "`impressions` on media and user insights" — "Applies to v22.0+. Will
> apply to all versions April 21, 2025."
>
> "API requests with the impressions metric will continue to return data for media
> created on or before July 1, 2024 for v21.0 and older. API requests made after
> April 21, 2025 for media created on or after July 2, 2024 will return an error."

Quelle: <https://developers.facebook.com/docs/graph-api/changelog/version22.0/>

Der Code laeuft gegen `v21.0` (`packages/core/src/integrations/meta.ts:35`), aber der
Stichtag gilt laut Changelog fuer alle Versionen. Der Ersatz heisst `views`.

Zwei weitere Punkte auf derselben Seite:

- In der aktuellen Metriktabelle der Instagram-Referenz, die ich abgerufen habe, steht
  `impressions` nur noch als deprecated; enthalten sind u.a. `views`, `reach`,
  `profile_links_taps`, `accounts_engaged`, `total_interactions`. **`profile_views`
  steht dort nicht** — eine Suche findet es aber weiter in aelteren Referenzseiten.
  Das konnte ich nicht sauber aufloesen; es gehoert am echten Endpunkt geprueft.
  Quelle: <https://developers.facebook.com/docs/instagram-platform/api-reference/instagram-user/insights>
- **`accountId` ist bei Meta eine Facebook-Page-ID** (`server/maitr/routes.ts:320-324`,
  erste Seite aus `/me/accounts`), wird in `fetchEngagement` aber als
  Instagram-User-ID in `/{ig-user-id}/insights` eingesetzt
  (`packages/core/src/integrations/meta.ts:66-67`). Das sind verschiedene IDs. Fuer
  `/ratings` ist die Page-ID richtig (`packages/core/src/integrations/meta.ts:56`), fuer
  Instagram-Insights nicht. Der Kommentar in
  `packages/core/src/integrations/types.ts:40` beschreibt das Feld als "Location bzw.
  IG-User-ID" — die Implementierung haelt sich nicht daran. Auch das ist ein Abgleich,
  kein Messwert.

### Urteil

**MACHBAR.** Die Metriken sind da und decken die Gastro-Fragen gut ab. Der
Wochenbericht ist aber nicht "nur eine Aggregation ueber vorhandene Daten" — die Daten
kommen so heute nicht herein. Der Aufwand steckt im Geraderuecken des Pfads darunter.

---

## 5. Foto-Pflege — EINGESCHRAENKT

### Google: ja

Zwei dokumentierte Wege.

**Aus einer URL** (der einfache):

```
POST https://mybusiness.googleapis.com/v4/accounts/{accountId}/locations/{locationId}/media
{
  "mediaFormat": "PHOTO",
  "locationAssociation": { "category": "FOOD_AND_DRINK" },
  "sourceUrl": "https://…/bild.jpg"
}
```

**Aus Bytes** (dreistufig):

```
1. POST .../v4/accounts/{a}/locations/{l}/media:startUpload
2. POST https://mybusiness.googleapis.com/upload/v1/media/{GoogleProvidedValue}?upload_type=media
3. POST .../v4/accounts/{a}/locations/{l}/media   mit dataRef
```

Quellen: <https://developers.google.com/my-business/content/upload-photos>,
<https://developers.google.com/my-business/reference/rest/v4/accounts.locations.media/create>

Aus der `MediaItem`-Referenz woertlich: `sourceUrl` — "A publicly accessible URL where
the media item can be retrieved from"; und "When creating a media item, either
`sourceUrl` or `dataRef` must be set." `mediaFormat` kennt `PHOTO` und `VIDEO`. Die
Kategorien enthalten fuer Gastronomie direkt passende Werte: `FOOD_AND_DRINK`, `MENU`,
`INTERIOR`, `EXTERIOR`, `COVER`, `LOGO`, `PRODUCT`, `AT_WORK`, `TEAMS`, `COMMON_AREA`,
`ADDITIONAL`.
Quelle: <https://developers.google.com/my-business/reference/rest/v4/accounts.locations.media>

Scope: `https://www.googleapis.com/auth/business.manage` — schon vorhanden. Der Pfad
ist hier `accounts/*/locations/*`, also genau das Format, das `assertGoogleAccountId`
bereits erzwingt. **Kein Umbau des `accountId`.**

Auf der Upload-Seite steht **kein Abkuendigungshinweis**. Einschraenkung: Fuer v4 gibt
es kein oeffentliches Discovery-Dokument (mein Abruf: HTTP 404, "Method not found."),
der Vertrag ist also nur ueber Doku-Seiten belegt. Da `fetchReviews`
(`packages/core/src/integrations/google.ts:59-67`) schon gegen dieselbe v4-Basis laeuft,
ist die API im Projekt bereits in Gebrauch.

### Instagram: technisch ja, per Berechtigung heute nein

Zwei Aufrufe:

```
POST /<IG_ID>/media          — Container anlegen
POST /<IG_ID>/media_publish  — veroeffentlichen
```

Erforderliche Berechtigungen laut Meta:

- Instagram API mit Facebook Login: `instagram_basic`, `instagram_content_publish`,
  `pages_read_engagement` (bei Page-Rolle ueber Business Manager zusaetzlich
  `ads_management`, `ads_read`)
- Instagram API mit Instagram Login: `instagram_business_basic`,
  `instagram_business_content_publish`

Limit: "100 API-published posts within a 24-hour moving period". Bilder muessen
"hosted on a publicly accessible server at the time of the attempt" sein.
Quelle: <https://developers.facebook.com/docs/instagram-platform/content-publishing>

**Was maitr heute anfragt** (`packages/core/src/integrations/meta.ts:19-26`):

```
instagram_basic
instagram_manage_insights
pages_show_list
pages_read_engagement
pages_read_user_content
business_management
```

**`instagram_content_publish` ist nicht dabei.** Die Liste enthaelt ausschliesslich
Lese-Berechtigungen. Veroeffentlichen ist mit dem heutigen Scope-Satz nicht moeglich —
nicht wegen eines fehlenden Codepfads, sondern weil die Berechtigung nie angefragt
wurde.

Drei Folgen, die man zusammen sehen muss:

1. **App Review waechst.** `instagram_content_publish` ist eine Schreib-Berechtigung
   und wird gesondert geprueft. Der Meta-Antrag ist laut
   `docs/integrations/GOOGLE_META_API_ACCESS.md:59` ohnehin noch offen; ihn jetzt zu
   erweitern ist billiger, als ihn zweimal zu stellen.
   *(Die Meta-Berechtigungsreferenz zu `instagram_content_publish` konnte ich nicht
   sauber abrufen — der Abruf lieferte den Inhalt einer anderen Berechtigungsseite
   zurueck. Die Angaben hier stammen daher nur aus der Content-Publishing-Seite.)*
2. **Alle bestehenden Verbindungen muessten neu autorisiert werden.** Der Scope-Satz
   wird pro Verbindung gespeichert (`prisma/schema.prisma:800`, gesetzt in
   `server/maitr/routes.ts:256` bzw. `:293`); ein nachtraeglich erweiterter Scope gilt
   fuer alte Tokens nicht.
3. **Die ID stimmt nicht.** `/<IG_ID>/media` braucht die
   Instagram-Business-Account-ID, gespeichert ist die Facebook-Page-ID
   (`server/maitr/routes.ts:322`). Siehe Abschnitt 4.

### Was im Repo schon passt

Die "public URL"-Anforderung **beider** Anbieter ist bereits erfuellt:
`uploadImageToStorage` liefert eine oeffentliche CDN-URL
(`server/services/supabaseStorage.ts:56`, Rueckgabe `:88`), der Upload-Weg steht in
`server/routes/media.ts:87`. Ein Foto, das der Wirt in maitr hochlaedt, hat sofort eine
URL, die als `sourceUrl` bei Google und als `image_url` bei Instagram taugt.

Das ist wichtig, weil der Byte-Weg versperrt ist: `FetchLike`
(`packages/core/src/integrations/types.ts:45-48`) definiert `body` als `string`.
Binaerdaten gehen durch diesen Vertrag nicht. Der `sourceUrl`-Weg umgeht das
vollstaendig — er sendet nur JSON. Das spricht klar dafuer, Fotos ueber oeffentliche
URLs zu fahren statt ueber Bytes.

### Urteil

**EINGESCHRAENKT.** Google-Haelfte machbar und geradlinig, mit vorhandener
Bildablage. Instagram-Haelfte haengt an einem Freigabeverfahren, das man anstossen,
aber nicht beschleunigen kann. Wer "Foto-Pflege" als Ganzes verkauft, verkauft einen
Termin, den er nicht kennt.

---

## Was sich mit dem vorhandenen Code am schnellsten bauen laesst

### Was heute da ist

`packages/core/src/integrations/` besteht aus vier Dateien: `types.ts` (Vertraege),
`google.ts`, `meta.ts`, `index.ts` (Registry, `index.ts:18-21`). Benutzt wird das in
`server/maitr/sync.ts:84-88`: Provider aufloesen, `fetchReviews` und `fetchEngagement`
parallel, dann idempotenter Upsert. Der Zeitgeber steht in
`server/maitr/scheduler.ts:60-82` und ist standardmaessig aus. Das Tagesbriefing rechnet
in `server/maitr/briefing.ts:41-66` aus der Datenbank.

### Die eine Grenze des Geruests

**Der `ChannelConnector` ist ein reiner Lese-Vertrag.**
`packages/core/src/integrations/types.ts:51-59` kennt genau drei Faehigkeiten:
`buildAuthorizationUrl`, `fetchReviews`, `fetchEngagement`. Vorschlag 2 (Zeiten
schreiben) und Vorschlag 5 (Fotos hochladen) passen in keine davon.

Der saubere Schnitt waere ein zweiter, optionaler Vertrag daneben — etwa
`ChannelWriter` mit optionalen Methoden, damit `metaConnector` ihn teilweise erfuellen
darf. Sonst muss `google.ts` Methoden implementieren, die `meta.ts` nur werfen kann.

### Reihenfolge nach Aufwand, aufsteigend

**0. Vorab, kein Feature: die Performance-URL geradeziehen.**
`packages/core/src/integrations/google.ts:72-75` — Pfad auf `locations/*` kuerzen,
`dailyRange` ergaenzen. Dazu die ID-Frage in
`packages/core/src/integrations/types.ts:41`: v4 will `accounts/*/locations/*`, die
Performance API und `locations.patch` wollen `locations/*`. Ein Feld fuer beides ist
die Ursache. Voraussetzung fuer Vorschlag 2 und 4.
*Ich habe das nicht geaendert — Auftrag war Pruefung, kein Quellcode.*

**1. Bewertungslink + QR (Vorschlag 1) — geringster Aufwand.**
- `server/maitr/routes.ts:311` — `readMask=name` um `metadata` erweitern; damit kommen
  `newReviewUri` und `placeId` schon beim Verbinden herein.
- `prisma/schema.prisma:792-807` — ein Feld `reviewUri String?` auf
  `ChannelConnection` (Migration noetig).
- Neue Datei, etwa `server/maitr/reviewLink.ts` — QR-PNG mit `qrcode`
  (`package.json:52`) erzeugen, ueber `uploadImageToStorage`
  (`server/services/supabaseStorage.ts:56`) ablegen, URL zurueckgeben.
- `server/maitr/routes.ts` — eine Route `GET /review-link`.
- Kein neuer Scope, kein neues Freigabeverfahren, keine Aenderung am Connector-Vertrag.

**2. Wochenbericht (Vorschlag 4) — gering, nach Punkt 0.**
- `packages/core/src/integrations/google.ts:72-75` — Metrikliste um
  `BUSINESS_DIRECTION_REQUESTS`, `CALL_CLICKS`, `WEBSITE_CLICKS`,
  `BUSINESS_FOOD_MENU_CLICKS` erweitern.
- `packages/core/src/analytics/types.ts` — `EngagementPoint` hat heute nur
  `impressions` und `actions` (befuellt in
  `packages/core/src/integrations/google.ts:127-132`). Routenanfragen und Anrufe
  brauchen eigene Felder, sonst fallen sie in denselben `actions`-Topf und der Bericht
  kann sie nicht auseinanderhalten.
- `prisma/schema.prisma` — `MaitrEngagementPoint` entsprechend erweitern (Migration).
- Neue Datei `server/maitr/weekly.ts` neben `briefing.ts`, gleiche Bauart: aus der
  Datenbank rechnen, Ergebnis cachen.
- Kein neuer Scope.

**3. Oeffnungszeiten-Waechter (Vorschlag 2) — mittel, hoechster Nutzen.**
- Neue Datei `server/maitr/holidays.ts` — OpenHolidays abfragen, Jahresdaten cachen,
  Bundesland aus der Location-Adresse ableiten. Braucht **keinen** Fremd-Scope und
  laesst sich ohne Google-Zugang testen; der Hinweis-Teil ist also baubar, bevor die
  Freigabe da ist.
- `packages/core/src/integrations/types.ts:51-59` — Vertragserweiterung fuer
  schreibende Faehigkeiten.
- `packages/core/src/integrations/google.ts` — `PATCH .../v1/locations/{id}` mit
  `updateMask=specialHours`, moeglichst mit `validateOnly=true` als Vorstufe. Vorher
  pruefen, ob `regularHours` gesetzt sind — ohne sie nimmt Google `specialHours` nicht
  an.
- Empfehlung: erst nur Hinweis im Briefing, Schreiben spaeter und immer mit
  Bestaetigung.

**4. Foto-Pflege Google (Teil von Vorschlag 5) — mittel.**
- `packages/core/src/integrations/google.ts` — `POST v4 …/media` mit `sourceUrl` aus
  `server/services/supabaseStorage.ts:88`. Nicht der Byte-Weg, siehe `FetchLike`.
- Braucht dieselbe Vertragserweiterung wie Punkt 3.

**5. Foto-Pflege Instagram — nicht durch Code begrenzt.**
- `packages/core/src/integrations/meta.ts:19-26` um `instagram_content_publish`
  erweitern, dann App Review, dann Reconnect aller bestehenden Verbindungen, dazu die
  IG-User-ID sauber aufloesen (`server/maitr/routes.ts:322`). Der Codeteil ist der
  kleinste Teil davon.

**Nicht bauen: Q&A (Vorschlag 3).** Siehe Abschnitt 3.

---

## Offene Punkte

Ungeprueft — sollte niemanden zu einer Zusage verleiten:

1. **Kein einziger authentifizierter Aufruf.** Ob `newReviewUri` bei einem echten
   deutschen Gastro-Profil befuellt ist, ob der Performance-Aufruf ohne `dailyRange`
   scheitert, ob die Q&A-Endpunkte einen Fehler liefern — alles offen. Der
   `FetchLike`-Vertrag (`packages/core/src/integrations/types.ts:45-48`) gibt die Naht
   her, um wenigstens die URL-Form gegen einen Fake-Fetch festzunageln.
2. **Historientiefe der Performance API v1** — offiziell nicht dokumentiert. Die
   18 Monate stammen aus der abgeschalteten Vorgaenger-API.
3. **`profile_views` bei Instagram** — in der aktuellen Metriktabelle nicht gefunden,
   in aelteren Seiten schon. Ungeklaert.
4. **Metas Berechtigungsreferenz zu `instagram_content_publish`** — Abruf lieferte den
   Inhalt einer anderen Seite. Nicht belegt.
5. **Ob der Google-Zugang Schreibrechte einschliesst.** Die Antragsseite kennt nur
   "Application for Basic API Access"; ob damit `locations.patch` und `media.create`
   freigeschaltet sind, steht dort nicht. Ein 300-QPM-Kontingent in der Cloud Console
   zeigt die Freigabe an, 0 QPM heisst offen.
   Quelle: <https://developers.google.com/my-business/content/prereqs>
6. **Lizenz und Verfuegbarkeit der Feiertags-APIs.** Abgerufen ja, Bedingungen nicht
   gelesen. Alle drei sind Freiwilligenprojekte ohne SLA.
7. **Bundesland-Mapping** aus `storefrontAddress.administrativeArea` auf `DE-BY` usw. —
   nicht angesehen.
8. **`packages/core/src/analytics/`** — nur `types.ts` gestreift. Aussagen zu
   vorhandenen Auswertungsbausteinen stuetzen sich auf Dateinamen und die Aufrufe in
   `server/maitr/briefing.ts:8`.
9. **Places-Preise** — ueber einen Markdown-Konverter gelesen, nicht in der gerenderten
   Tabelle geprueft. Fuer maitr irrelevant, solange `newReviewUri` genutzt wird.

---

## Quellen

Alle am 2026-08-04 abgerufen.

**Discovery-Dokumente, direkt per `curl`:**
- `https://mybusinessbusinessinformation.googleapis.com/$discovery/rest?version=v1` — HTTP 200, revision 20260803
- `https://businessprofileperformance.googleapis.com/$discovery/rest?version=v1` — HTTP 200, revision 20260802
- `https://mybusinessqanda.googleapis.com/$discovery/rest?version=v1` — HTTP 200, revision 20260803
- `https://mybusiness.googleapis.com/$discovery/rest?version=v4` — HTTP 404

**Google Business Profile:**
- <https://developers.google.com/my-business/ref_overview>
- <https://developers.google.com/my-business/content/prereqs>
- <https://developers.google.com/my-business/content/limits>
- <https://developers.google.com/my-business/content/sunset-dates>
- <https://developers.google.com/my-business/content/qanda/change-log>
- <https://developers.google.com/my-business/content/performance/change-log>
- <https://developers.google.com/my-business/content/upload-photos>
- <https://developers.google.com/my-business/reference/businessinformation/rest/v1/accounts.locations>
- <https://developers.google.com/my-business/reference/businessinformation/rest/v1/accounts.locations/list>
- <https://developers.google.com/my-business/reference/businessinformation/rest/v1/locations/patch>
- <https://developers.google.com/my-business/reference/performance/rest/v1/DailyMetric>
- <https://developers.google.com/my-business/reference/performance/rest/v1/locations/fetchMultiDailyMetricsTimeSeries>
- <https://developers.google.com/my-business/reference/rest/v4/BasicMetricsRequest>
- <https://developers.google.com/my-business/reference/rest/v4/accounts.locations.media>
- <https://developers.google.com/my-business/reference/rest/v4/accounts.locations.media/create>
- <https://support.google.com/business/answer/16816815?hl=de> (Link und QR-Code fuer Bewertungen)
- <https://support.google.com/business/answer/9273900?hl=de> (Kurznamen eingestellt)

**Google Maps Platform:**
- <https://developers.google.com/maps/documentation/places/web-service/place-id>
- <https://developers.google.com/maps/billing-and-pricing/pricing>

**Meta:**
- <https://developers.facebook.com/docs/graph-api/changelog/version22.0/>
- <https://developers.facebook.com/docs/instagram-platform/content-publishing>
- <https://developers.facebook.com/docs/instagram-platform/api-reference/instagram-user/insights>

**Offene Daten, live abgerufen:**
- <https://www.openholidaysapi.org/> — `PublicHolidays` und `SchoolHolidays` DE/DE-BY, HTTP 200; Spanne >3 Jahre → HTTP 400
- `https://feiertage-api.de/api/?jahr=2026&nur_land=BY` — HTTP 200
- `https://date.nager.at/api/v3/PublicHolidays/2026/DE` — HTTP 200
- `https://ferien-api.de/api/v1/holidays/BY/2026` — HTTP 429
