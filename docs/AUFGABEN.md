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

### C1 — Onboarding. **Kritisch.**
- **C1.1** Onboarding ist derzeit reiner Platzhalter ohne Funktion
- **C1.2** Vollständig prüfen und zum Laufen bringen
- **C1.3** Eventuell mehr Schritte einfügen

### C2 — Anmeldung
- **C2.1** Clerk-Login prüfen. *Teilweise erledigt: Native API ist an, der Login
  lädt ohne Fehler. Der Weg **nach** der Anmeldung ist ungeprüft, weil in
  Produktion noch kein Betrieb existiert*

### C3 — Navigation
- **C3.1** Zurück-Buttons prüfen — manche führen zur Startseite, obwohl sie es
  nicht sollten

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
