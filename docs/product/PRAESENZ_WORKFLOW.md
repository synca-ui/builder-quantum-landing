# Präsenz-Workflow: öffentliche Daten ohne Google-Freigabe

**Stand 15.09.2026.** Beschreibt, was die Maitr-App nach der Anmeldung über einen
Betrieb lädt, ohne dass der Wirt sein Google-Unternehmensprofil per OAuth freigibt,
und wie daraus der Präsenzscore entsteht.

## Wozu

Ein Wirt veröffentlicht über den Konfigurator seine Web-App und meldet sich danach
in der App mit demselben Konto an. Profil, Öffnungszeiten, Kontakt und Speisekarte
kamen schon an (siehe `server/services/businessProfil.ts`). Bewertungen und
Präsenzscore waren dagegen Attrappe: Der Score bestand aus vier lokal abgehakten
Kästchen, die Bewertung „4,8 · 128“ stand im Code.

Beides lässt sich ohne Freigabe messen. Google Places nennt öffentlich Schnitt,
Anzahl, fünf Bewertungen, Fotos, Zeiten, Telefon und Website. Die eigene Website
verrät, ob Speisekarte, Reservierung und mobile Darstellung stimmen.

## Ablauf

```
Auslöser ─┬─ App-Anmeldung: Stand fehlt oder ist älter als 24 h
          ├─ Veröffentlichung der Web-App (im Hintergrund)
          └─ Zeitgeber, täglich je Betrieb (nur mit MAITR_SYNC_INTERVAL_MINUTES)
             │
             ▼
  aktualisierePraesenz(venueId)          server/maitr/praesenz/index.ts
    1. Drossel: jünger als 10 min → gespeicherten Stand liefern
    2. Betrieb lesen (Name, Adresse, PLZ, Koordinaten, Karte, Social Links)
    3. Google Places suchen                places.ts
         Textsuche → Kandidat wählen (Name, PLZ, Nähe) → bis zu 5 Fotos auflösen
    4. Website bestimmen: Google > Analyse-Job des Konfigurators > Social Links
       (Maitr-eigene *.maitr.de-Adressen werden nicht per HTML geprüft)
    5. Website prüfen                      website.ts (über safeFetch)
    6. Rohdaten in PresenceSnapshot, Briefing-Cache verwerfen
             │
             ▼
  praesenzBericht(snapshot)               packages/core/src/analytics/oeffentlichePraesenz.ts
    Score (presenceScore mit Deckung), Hebel, Website-Befunde, Bewertungsthemen
```

Der Bericht wird bei jedem Lesen neu gerechnet. Legt der Wirt eine Speisekarte an,
ändert sich der Score sofort, ohne neuen Google-Abruf.

## Was ohne Freigabe geht und was nicht

| Wert | Quelle ohne Freigabe | Mit Freigabe zusätzlich |
|---|---|---|
| Bewertungsschnitt, Anzahl | Places | |
| Bewertungen | Places, nur die 5 relevantesten | vollständige Liste |
| Antwortstatus, Antworten schreiben | nicht verfügbar | Business Profile API |
| Fotos (Anzahl, bis 5 Bilder) | Places | |
| Öffnungszeiten, Telefon, Website, Status | Places | |
| Außenplätze, reservierbar, vegetarisch | Places | |
| Profilaufrufe, Routen, Anrufe | nicht verfügbar | Performance API |
| Speisekarte, Reservierung, mobil, schema.org | Website-Prüfung | |

## Der Score ohne Freigabe

Der Präsenzscore hat fünf gewichtete Faktoren. Ohne Freigabe fehlen zwei davon.

| Faktor | Gewicht | Ohne Freigabe |
|---|---|---|
| Bewertungsschnitt | 30 % | gemessen (Googles Gesamtschnitt) |
| Antwortquote | 20 % | unbekannt |
| Profil-Vollständigkeit | 25 % | gemessen |
| Aktivität | 15 % | geschätzt aus den 5 Bewertungen |
| Reichweite | 10 % | unbekannt |

Unbekannte Faktoren zählen nicht als Null. Sie fallen aus der Rechnung, und die
übrigen Gewichte werden auf 100 % hochgerechnet. Die App sagt dazu, worauf der
Score beruht, zum Beispiel „Beruht auf 3 von 5 Faktoren“. Aus Places-Bewertungen
entstehen im Tagesbriefing keine „Bewertung wartet auf Antwort“-Aufgaben, weil
niemand weiß, ob sie schon beantwortet sind.

## Einrichten

1. **Migration einspielen**, vor dem Deploy:
   `prisma/migrations/20260915_add_presence_snapshot/migration.sql`. Ohne Tabelle
   läuft der Abruf weiter, speichert aber nichts.
2. **Places-Schlüssel auf Railway setzen** als `GOOGLE_PLACES_API_KEY`. Im
   Google-Cloud-Projekt „Places API (New)“ aktivieren und den Schlüssel auf diese
   API beschränken. Kein Antrag nötig. Die bisherigen Google-Schlüssel der
   n8n-Instanz sind abgelaufen und taugen dafür nicht.
3. **Zeitgeber** optional über `MAITR_SYNC_INTERVAL_MINUTES` einschalten. Er frischt
   je Tick höchstens 20 Betriebe auf, deren Stand älter als 24 Stunden ist.

Ohne Schlüssel funktioniert alles außer dem Google-Teil. Die App zeigt dann
Maitr- und Website-Daten und den Hinweis, dass Google-Daten folgen.

## Kosten

Die Feldmaske fällt laut Google-Preisliste in die SKU „Text Search Enterprise +
Atmosphere“, dazu je Foto „Place Photos“. Die Preise vor dem Einschalten in der
Cloud Console prüfen; sie sind hier nicht gemessen.

Drei Bremsen halten die Zahl der Abrufe klein:

- Serverseitige Drossel: höchstens ein Abruf je Betrieb in 10 Minuten, egal wer fragt.
- Die App fragt nur beim Öffnen, wenn der Stand älter als 24 Stunden ist.
- Der Zeitgeber arbeitet höchstens 20 Betriebe je Tick ab.

## Verhältnis zum n8n-Flow

Der Places-Ast im Deep-Scrape-Flow hat nie Daten geliefert (toter Schlüssel,
Legacy-API). Er bleibt unberührt. Der Präsenz-Workflow läuft bewusst im Server:
typgeprüft, getestet und mit derselben Auswertung wie die App. Der Schlüssel steht
nur im Header, nie in einer gespeicherten URL.

## Dateien

- `packages/core/src/analytics/oeffentlichePraesenz.ts`: Typen und Bericht, rein
- `packages/core/src/analytics/presence.ts`: Score mit Deckung
- `server/maitr/praesenz/`: Places, Website-Prüfung, Ablauf
- `server/maitr/dataset.ts`: Briefing nutzt den Snapshot ohne Google-Verbindung
- `GET/POST /api/maitr/venues/:venueId/presence[/refresh]` in `server/maitr/routes.ts`
- `mobile/src/lib/store.tsx` und `mobile/src/lib/praesenz.ts`: Laden in der App

## Nachtrag: Uhrzeiten der Web-App-Reservierungen (15.09.2026)

Beim Einbau der echten Reservierungen in die App fiel ein älterer Fehler auf. Die
Web-App speicherte die gewählte Uhrzeit als UTC: Aus „19:00 in Köln“ wurde
`19:00 UTC`. Die Mails fielen nicht auf, weil sie in der Zone des Servers (UTC)
formatierten. Push und App rechnen korrekt in Europe/Berlin und zeigten die
Buchung im Sommer um zwei Stunden, im Winter um eine Stunde verschoben.

Seit dem Fix ist `reservationTime` auf allen Schreib- und Lesewegen ein echter
Zeitpunkt. Die Rechnung liegt einmal in `packages/core/src/zeitzone.ts`
(`@maitr/core/zeitzone`, `server/utils/zeitzone.ts` reicht sie nur durch):

- `GET /api/public/reservations/slots` baut die Zeitfenster und prüft die Belegung
  in der Zone des Betriebs (`Business.timezone`, sonst Europe/Berlin).
- Das Web-Dashboard (`client/pages/dashboard/ReservationsDashboard.tsx`) baut neue
  Reservierungen aus Datum und Uhrzeit in dieser Zone. Anzeige und Tagesfilter
  rechnen ebenfalls darin. Die Zone liefert `GET /api/dashboard/reservations` als
  `timezone` mit.
- Die Reservierungsformulare (`ReservationFormModern`, `ReservationClassicForm`)
  schicken den lokalen Kalendertag des Gastes. Vorher kam er aus `toISOString()`,
  in Berlin also der Vortag. Die Vorschau baut dieselben Zeitpunkte wie der Server.
- Die Gast-Verwaltungsseite `/r/:id` (`client/pages/ManageReservation.tsx`) zeigt
  und bearbeitet die Wanduhr des Betriebs. Die Uhrzeit schickt sie nur mit, wenn
  der Gast sie geändert hat. Die Zone steht dafür in der öffentlichen Antwort
  (`business.timezone`).
- Die Mails formatieren ausdrücklich in Europe/Berlin.

Der Slots-Fix und der Dashboard-Fix gehören in denselben Deploy. Allein
ausgeliefert macht der Slots-Fix jede Dashboard-Buchung um 19:00 zu einer um
21:00. Dann bleibt 19:00 für Web-Gäste frei, und die Bestätigungsmail nennt 21:00.

**Bestehende Zeilen sind davon nicht korrigiert.** Buchungen aus der Website
(`source = 'website'`) und aus dem Web-Dashboard (`source = 'dashboard'`), die vor
dem Deploy entstanden, stehen weiter als Wanduhr-als-UTC in der Datenbank. Nach dem
Deploy erscheinen sie zu spät. App-Buchungen (`maitr`, `walk_in`) waren nie
betroffen.

Die Korrektur ist ein einmaliges Update, das ein Mensch nach Prüfung einspielt.
Sie gilt **erst nach dem Deploy dieses Fixes** und **nur für Zeilen mit `createdAt`
vor dem Deploy**. Vorher eingespielt, liest der noch laufende alte Code (Belegung
über UTC-Stunden, Mails in UTC) die korrigierten Zeilen falsch, und neue Zeilen
entstehen weiter im alten Format. Zeilen, die nach dem Deploy entstehen, sind schon
echte Zeitpunkte, eine zweite Umrechnung verschöbe sie. Nicht ausgeführt:

```sql
-- Vorher prüfen: welche Zeilen betroffen sind.
SELECT r.id, r.source, r."guestName", r."reservationTime", r."createdAt", r."updatedAt", b.timezone
FROM "Reservation" r
JOIN "Business" b ON b.id = r."businessId"
WHERE r.source IN ('website', 'dashboard')
  AND r."createdAt" < '<Deploy-Zeitpunkt dieses Fixes in UTC>';

-- Wanduhr (als UTC gespeichert) in der Zone des Betriebs lesen und in echtes UTC wandeln.
UPDATE "Reservation" r
SET "reservationTime" = (r."reservationTime" AT TIME ZONE b.timezone) AT TIME ZONE 'UTC'
FROM "Business" b
WHERE b.id = r."businessId"
  AND r.source IN ('website', 'dashboard')
  AND r."createdAt" < '<Deploy-Zeitpunkt dieses Fixes in UTC>';
```

Eine Ausnahme lässt sich in der Datenbank nicht erkennen. Hat ein Gast eine
Website-Buchung vor dem Deploy auf `/r/:id` gespeichert, hat die alte Seite die
Uhrzeit im Browser gelesen und dabei zufällig schon in einen echten Zeitpunkt
gewandelt, bei einem Browser in Deutschland. Das Update verschöbe diese Zeile ein
zweites Mal. `updatedAt` hilft nicht, weil auch jede Statusänderung es setzt.
Deshalb vor dem Update die kommenden Zeilen der Liste mit der Uhrzeit abgleichen,
die der Gast in seiner Mail bekommen hat.
