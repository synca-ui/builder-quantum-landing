# Aufgaben — Stand 6. August 2026

Aus dem Feedback vom 6.8. Reihenfolge ist die vorgegebene Priorität:
**Autokonfigurator → Speisekartenerkennung → App mit Schnittstellen → Rest.**

Jede Aufgabe hat eine Nummer, damit man sie beim Namen nennen kann. `[?]` heißt:
Machbarkeit ist noch nicht geprüft — das passiert vor dem Bauen, nicht danach.

---

## A · Autokonfigurator (höchste Priorität)

### A1 — Speisekartenerkennung. **Der Kern.**
- **A1.1** Hauptspeisen sicher erkennen, richtige Kategorien zuordnen
- **A1.2** Zusatzpunkte einer Speise (Beilagen, Varianten, „dazu…") als **Teil des
  Gerichts** darstellen, nicht als eigenes Gericht
- **A1.3** Labels und Allergene je Gericht erkennen — Erkennung darauf trainieren
- **A1.4** Foto-Modus im Schritt „Speisekarte": Foto hochladen → Karte wird erkannt
  und übernommen
- **A1.5** Kein Bild anzeigen, wenn keins vorhanden ist. Die Detailkarte eines
  Gerichts darf keinen leeren Bildrahmen zeigen

> **Stand 7.8.2026 — die Erkennung strukturiert jetzt mit einem Modell.**
> Gemessen auf der Prüfmenge (13 Karten, gegen die nie optimiert wurde):
>
> | | gefunden | erfunden | Varianten falsch | Kennzeichnung |
> |---|---|---|---|---|
> | Regeln allein | 54 % | 39 % | 71/122 | 9 % |
> | **Haiku 4.5** | **98 %** | **1 %** | **31/122** | 101 % |
> | Sonnet 5 | 99 % | 2 % | 53/122 | 100 % |
>
> Das trägt A1.1, A1.2 und A1.3 gemeinsam — Varianten und Kennzeichnungen waren
> die beiden teuersten Einzelposten. Umgesetzt in
> `server/services/menuStructure.ts`; die Regeln bleiben als Rückfall ohne
> Schlüssel. Kosten rund 0,03 US-Dollar je Karte.
>
> **Offen:** Der Bildpfad schreibt weiter mit Opus 5 ab
> (`server/services/ocr/anthropic.ts`). Seit die Strukturierung dahinter liegt,
> muss die Abschrift nur noch richtige Zeichen liefern — ein günstigeres Modell
> genügt vermutlich. Nicht umgestellt, weil nicht gemessen: Die Messung betraf
> das Strukturieren von Text, nicht das Abschreiben von Bildern.

### A2 — Bedienbarkeit des Ergebnisses
- **A2.1** Alle Kategorien einblendbar — aktuell steht „6 mehr", nicht anklickbar
- **A2.2** Menü direkt im Konfigurator anpassbar
- **A2.3** Farben direkt anpassbar

### A3 — Erkennungsqualität außerhalb der Karte
- **A3.1** Restaurantname korrekt erkennen (Fehlerfall: erkannt als „Herzlich" —
  vermutlich aus „Herzlich willkommen" der Startseite)
- **A3.2** Öffnungszeiten korrekt in die App übernehmen
- **A3.3** Social-Media-Konten korrekt übernehmen

### A4 — Gestaltung
- **A4.1** Hintergrundfarbe nie grell — immer eine weiche Farbe. Als Regel im
  Code, nicht als Zufall
- **A4.2** „Weniger ist mehr" — Ergebnisseiten entschlacken

### A5 — Reservierung
- **A5.1** Reservierung funktioniert nicht. Gemeint ist **nicht** das eigene
  System: Fremdanbieter müssen anbindbar sein `[?]` welche, und ob deren
  Schnittstellen das hergeben

### A6 — Die 15 Schritte
- **A6.1** Jeden der 15 Schritte einzeln auf **Funktion** prüfen
- **A6.2** Jeden auf **Sinnhaftigkeit** prüfen — welche Schritte kann man
  streichen oder zusammenlegen?

### A7 — Kosten
- **A7.1** Automodus so überarbeiten, dass er wirklich gut wird, nicht
  mittelmäßig
- **A7.2** Möglichst wenig Geld verbrennen. `[?]` Was lässt sich **lokal**
  rechnen statt über ein bezahltes Modell? Kandidaten: PDF-Textextraktion,
  Kategoriezuordnung nach Regeln, Allergen-Erkennung über Wortlisten. Erst
  messen, welcher Schritt wirklich ein Sprachmodell braucht

---

## B · Website

- **B1** Clerk-Login ist nicht mehr erkennbar — statt des Icons steht „Mein
  Bereich". Der Clerk-Login soll zurück
- **B2** Favicon und Logo im Header auf das aktuelle Maitr-Logo

---

## C · App

### C1 — Onboarding. **erledigt 7.8.**
- **C1.1** ~~Reiner Platzhalter~~ Der Kern war nicht der Bildschirm, sondern die
  Weiche: `app/index.tsx` schickte **jeden** Angemeldeten nach `/start`. Ein
  neuer Wirt landete in den Beispieldaten von „Café Goldstück", das Onboarding
  war von der Oberfläche aus gar nicht erreichbar. Jetzt entscheidet
  `einstiegsWeiche()` — mit einem **Wartezustand**, statt bei noch laufender
  `GET /venues`-Abfrage zu raten
- **C1.2** ~~Prüfen und zum Laufen bringen~~ Vier Schritte, jeder gegen echte
  Endpunkte: Betrieb (`POST /venues`), Google (echte OAuth-URL, Beleg über
  `GET /integrations` — dem `status=connected` im Rücksprung wird **nicht**
  geglaubt), Zeiten (`PATCH /venues/:venueId`), Abschluss mit Häkchen nur für
  serverseitig Belegtes
- **C1.3** ~~Eventuell mehr Schritte~~ Im Gegenteil: von sieben erfundenen auf
  vier echte. Die alte Journey ist **gelöscht**, nicht repariert — sie rief am
  Ende `signIn()` ohne Clerk-Sitzung und hinterließ ein Konto, das keines war
- **Neu dabei behoben:** `PATCH /venues/:venueId` gab es nicht; `openingHours`
  war unbegrenzt und trat über die **unangemeldete** Route wieder aus (gemessen:
  509 KB); Öffnung über Mitternacht war unmöglich gemacht; für „sonntags
  geschlossen" mussten zwei Uhrzeiten erfunden werden

### C2 — Anmeldung. **erledigt 7.8.**
- **C2.1** ~~Der Weg nach der Anmeldung ist ungeprüft~~ Beim Prüfen ein Loch in
  C1 gefunden: `login.tsx` navigierte nach erfolgreichem Clerk-Login **direkt**
  nach `/start` — an allen drei Stellen. Die Weiche in `app/index.tsx` läuft aber
  nur, wenn jemand auf `/` landet. Ein frisch angemeldeter Wirt sah damit trotz
  fertigem Onboarding weiterhin „Café Goldstück" — durch eine andere Tür.
  Alle drei Wege gehen jetzt über `/`, die Weiche entscheidet.
  **Die Lehre, größer als der Fehler:** Eine Weiche taugt nur, wenn *jeder* Weg
  durch sie führt. Wer neben ihr einen zweiten Eingang stehen lässt, hat sie
  nicht gebaut, sondern nur hingestellt.
- **`[?]` Bleibt offen und ist nicht durch Code lösbar:** Ein echter Durchlauf
  Anmeldung → Betrieb → Start ist erst möglich, wenn in Produktion ein Konto
  existiert. `Business` hat dort weiterhin 0 Zeilen

### C3 — Navigation. **erledigt 7.8., eine Prüfung am Gerät offen**
- **C3.1** ~~Zurück-Buttons prüfen~~ Ursache gefunden und behoben.
  `app/_layout.tsx` setzt `unstable_settings.initialRouteName: "(tabs)"` — das
  ist ein **Anker**: Öffnet die App direkt auf einem gepushten Bildschirm
  (Deep-Link, Kaltstart, Benachrichtigung), legt expo-router `(tabs)` darunter,
  und `(tabs)` ankert auf `start`. `canGoBack()` meldet dann `true`, `back()`
  landet auf der **Startseite**, und der an den Bildschirmen gepflegte
  `fallback` wurde **nie** gefragt — er galt nur für den `false`-Fall.
  Die Entscheidung liegt jetzt in `components/ui/rueckweg.ts` und ist geprüft
  (6 Fälle, Gegenprobe gefahren): Ankerfall → Elternbildschirm, echter Verlauf
  behält Vorrang, unbekannte Stapeltiefe verhält sich wie bisher.
  Nebenbefund mit behoben: sechs Bildschirme überschrieben den Rückweg mit
  `onBack={() => router.back()}` — das ist die Vorgabe *minus* Ankerprüfung und
  Elternbildschirm, also strikt schlechter. Drei weitere hatten gar keinen
  Elternbildschirm hinterlegt.
- **`[?]` Offen:** Dass die Stapeltiefe im Ankerfall wirklich 2 ist, ist aus dem
  Verhalten von expo-router abgeleitet, **nicht am Gerät gemessen**. Ein
  Deep-Link-Test auf `/stempelkarte/<id>` und `/kanal/<id>` bestätigt oder
  widerlegt es in fünf Minuten

### C4 — Zweck schärfen
- **C4.1** Übernimmt die App wirklich alle Aufgaben des Google Business Profiles
  und von Instagram? Lücken benennen
- **C4.2** Was ist für Gastronomen sonst wichtig zu verwalten?
- **C4.3** Leitsatz für jede Entscheidung: **Die App nimmt dem Wirt die Arbeit
  mit dem GBP ab — sie macht keine zusätzliche.** Jede Funktion, die dem
  widerspricht, gehört gestrichen

### C5 — Datenbank
- **C5.1** Audit von Struktur **und** Sicherheit. Keine Überschneidungen
  zwischen Kunden — jede Zeile gehört genau einem Betrieb

### C6 — Kanalverbindung trennen. **Blockiert den Google-Antrag.**
Es gibt **keinen** Endpunkt zum Trennen einer Verbindung. In
`server/maitr/routes.ts` steht dazu nur ein Kommentar. Wer im Client
„Verbindung trennen" drückt, lässt die Token serverseitig aktiv.

Das ist nicht bloß unschön: **Google fragt im OAuth-Antrag ausdrücklich, wie
Nutzer den Zugriff widerrufen.** Diese Frage ist derzeit nicht wahrheitsgemäß
zu beantworten — der Endpunkt gehört gebaut, *bevor* der Antrag rausgeht.

- **C6.1** `DELETE /integrations/:provider` — Token löschen, Status auf
  `REVOKED`, hinter `ownerGuard`
- **C6.2** Beim Anbieter mit-widerrufen, nicht nur lokal vergessen
  (Google `oauth2/revoke`, Meta `DELETE /{user-id}/permissions`)
- **C6.3** Client verdrahten — der Knopf existiert, sein Gegenstück nicht
- **C6.4** `[?]` Was passiert mit bereits geholten Bewertungen und
  Reichweitendaten? Löschen oder behalten ist eine Entscheidung, keine
  Programmierfrage

### C7 — Das 30-Tage-Löschversprechen einlösen
`client/pages/AGB.tsx` verspricht **öffentlich**, alle Nutzerdaten würden
30 Tage nach Kündigung unwiderruflich gelöscht. Einen Job, der das tut, gibt es
nicht — kein Treffer auf `purge`, `retention` oder `Aufbewahrung` im gesamten
Serverbestand.

- **C7.1** Entweder den Job bauen oder das Versprechen in der AGB ändern.
  Beides ist vertretbar, der jetzige Zustand nicht
- **C7.2** Falls Job: `server/maitr/scheduler.ts` ist der Ort. Achtung — er
  läuft nur, wenn genau **eine** Instanz aktiv ist

### C8 — Gesundheitsdaten im Personalmodul
`Absence` mit `SICK_LEAVE` und `attachments` — das sind Atteste. Sie fallen
unter Art. 9 DSGVO und brauchen besondere Schutzmaßnahmen nach § 22 Abs. 2
BDSG. Im Code bisher nicht vorgesehen.

- **C8.1** `[?]` Braucht das Produkt Krankmeldungen überhaupt? Die
  billigste Lösung wäre, die Kategorie zu streichen
- **C8.2** Falls ja: Zugriff einschränken, Anhänge getrennt und
  verschlüsselt ablegen, Löschfrist festlegen

*C6–C8 stammen aus dem Schreiben der Rechtstexte am 6.8. — sie fielen auf,
weil der Text behaupten sollte, was der Code nicht tut.*

---

## D · Aufräumen

- **D1** Unnütze Dateien: 39 Doku-Dateien, 5,5 MB. Zusammenlegen und ausdünnen
- **D2** ~~99 MB Agenten-Arbeitskopien~~ **erledigt 6.8.**
- **D3** `recharts` steht in `devDependencies`, wird aber ausgeliefert
  (`InsightsPage.tsx:30`) — verfälscht jede Sicherheitsprüfung
- **D4** Systemdokument: [SYSTEM.md](SYSTEM.md) **erledigt 6.8.**

---

## E · Aus früherer Arbeit offen, nicht aus diesem Feedback

- **E1** Rechtstexte (Datenschutz + AGB) — **blockiert den Google-Antrag mit
  60 Tagen Vorlauf.** Lauf ist am Sitzungslimit gescheitert
- **E2** Meta-Bewertungen: `/{page-id}/ratings` gibt es seit Graph v22.0 nicht
  mehr. **Produktentscheidung offen.** Solange sie offen ist, kann v21.0 nicht
  angehoben werden — die läuft am 21.01.2027 ab
- **E3** `meta.ts:95` schickt die Facebook-Page-ID an den Instagram-Endpunkt —
  Reichweite kann so nicht funktionieren
- **E4** Google Wallet: Loyalty statt Generic — **Entscheidung offen**, später
  ändern heißt alle Karten ersetzen
- **E5** Abo-Preise — siehe [OFFENE_ENTSCHEIDUNGEN.md](OFFENE_ENTSCHEIDUNGEN.md)
- **E6** Store-Screenshots aus einem Release-Build

---

## Was nur der Betreiber kann

| | Wirkung |
|---|---|
| `MAITR_*` in Railway setzen | Ohne sie kein Kanal, keine Wallet-Karte |
| Google „Business Profile API access" | ~60 Tage, braucht vorher E1 |
| Apple Developer Program (99 $) | Blockiert Store **und** Apple Wallet |
| Google Cloud Service-Account | Entblockt Google Wallet **sofort** |
| Stempelzahl + Prämie festlegen | Blockiert den Design-Prompt |
