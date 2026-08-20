# Manueller Konfigurator — Prüfung, Korrekturen, Publish-Vergleich

Stand: 20.08.2026 · Durchlauf auf **www.maitr.de** (angemeldet) und lokal ·
alle 15 Schritte einzeln bedient · am Ende echt veröffentlicht auf
**https://trattoriabellavista.maitr.de** und mit dem Konfigurator verglichen.

Legende: **[BEHOBEN]** = korrigiert und nachgewiesen (lokal, Tests grün) ·
**[OFFEN]** = dokumentiert, bewusst nicht angefasst.
Alle Behebungen liegen im Arbeitsstand des Branches `mobile/testflight-1.0.0`
und wirken erst nach Deploy auf Produktion.

---

## 1. Die zwei Blocker — Konfigurator war nicht abschließbar

### B1 · „Weiter" auf Schritt 2 war tot **[BEHOBEN]**
`BusinessInfoStep.tsx` — `useCallback` mit `[nextStep]`, liest aber `isValid`.
Der Callback fror auf dem Erstzustand ein (leeres Formular = ungültig), der
aktive Button tat nichts. Beweis: nach Reload funktionierte derselbe Button.
Fix: `isValid` in die Dependencies.

### B2 · „Domain wählen" wurde übersprungen **[BEHOBEN]**
`FeatureConfigStep.tsx` — ein `useEffect` blätterte selbst weiter, zusätzlich
zum regulären `nextStep()`. Folge vorwärts: Sprung 11→13, Schritt 12 nie
sichtbar. Folge rückwärts: von 12 zurück → sofort wieder vorgeschoben,
„Zurück" wirkte tot. Endfolge: `selectedDomain` blieb leer, Schritt 15 stand
bei 88 %, **„Web-App veröffentlichen" war dauerhaft ausgegraut** — der
manuelle Weg konnte nie abgeschlossen werden.
Fix: Effect entfernt; das Überspringen der Feature-Detailansicht macht jetzt
die Navigation in `Configurator.tsx`, in beide Richtungen. Nachgewiesen:
11→12→13, Zurück 12→10, und Veröffentlichen wird wieder möglich (real
durchgeführt, siehe Abschnitt 5).

---

## 2. Weitere Korrekturen (alle **[BEHOBEN]**, Tests 64/64 grün)

| Bereich | Fund | Fix |
|---|---|---|
| Vorschau-Navigation | `useMemo` ohne `selectedPages/menuItems/gallery` — Seitenauswahl wirkte nie auf das Vorschau-Menü | Dependencies vervollständigt |
| Kontaktseite (Vorschau) | Telefon + E-Mail (aus `contact.phone/.email`) wurden nie angezeigt; Adresse bekam Brief-Icon | zusammengeführt, MapPin für `address` |
| Wochentage | „Monday, Tuesday…" auf deutscher Seite — **in Vorschau UND auf der veröffentlichten Seite** | gemeinsame Quelle `client/lib/weekdays.ts`, in beiden Renderern |
| Header-Schriftgröße | Vorschau hardcodete `"2xl"` — Einstellung wirkte nur live, nie in der Vorschau | Store-Wert wird durchgereicht |
| Standort-Feld | MapPin-Icon überdeckte den Text (`pl-10` von tailwind-merge verworfen) | Klassenreihenfolge |
| Öffnungszeiten-Schalter | Labels abgeschnitten („Geö", „Ge") | `.slice()` entfernt |
| Gericht anlegen | Name/Beschreibung blieben nach dem Hinzufügen stehen (Debounce-Rückkopplung) | Vergleich gegen zuletzt gemeldeten Wert |
| Subdomain-Prüfung | API-Ausfall wurde als „ungültig" gemeldet und sperrte „Weiter" | neuer Status `unknown`, blockiert nicht |
| Teamliste | Mitglieder landeten unsichtbar im Store; „+ chef" erzeugte stille Duplikate | sichtbare Liste mit Entfernen, Dedupe |
| Social-Links (Vorschau) | „Facebook" erschien auch mit leerem Feld | nur gepflegte Kanäle |
| Schritt 11 | komplett englisch | vollständig deutsch (Bestellung, Zahlungsarten, Bestellwege, Team, Angebote) |
| Schritt 13 | rohe `seo.*`-Schlüssel, englische Blöcke, **„$49/month"**, englische Meta-Beschreibung | i18n-Schlüssel ergänzt (de+en), deutsch, **„49 €/Monat"**, deutsche Vorlage |
| Schritt 5 | „Text color"-Block englisch | deutsch |
| Kontakt-Platzhalter | US-Formate (+1 (555)…, 123 Main St) | deutsche Beispiele |
| Farbthemen | Preis blieb grün, Reservieren-Button blieb blau — Thema wirkte nicht auf beide | Preset setzt `priceColor` + Buttonfarben mit, Textfarbe kontrastberechnet |
| Farbthema „Purple" | fast identisch mit „Ocean" | kräftiges Violett `#7C3AED/#C084FC` |
| Kontrast | schwarz auf dunkelgrau einstellbar, ohne Warnung | WCAG-Warnung (< 4,5:1) bei Text/Hintergrund und Header |
| Schriftart „Display" | war in Wahrheit Monospace | ehrlich benannt: „Monospace · Technisch & Klar" |

## 3. Templates: Paletten wirken jetzt wirklich

**Vorher:** `updateTemplate` schrieb nur die ID — alle vier Templates starteten
mit denselben Farben und sahen fast gleich aus.

**Jetzt** (`getTemplateDesignDefaults` in `templateTokens.ts`, ein Ort für
Vorschau UND Live-Seite, plus Unit-Tests):

| Template | Charakter | Primär | Hintergrund | Schrift | Seitenhintergrund |
|---|---|---|---|---|---|
| Modern | unverändert = bekannter Ausgangszustand | `#4F46E5` | `#FFFFFF` | Sans | Verlauf bg→sekundär |
| Minimalistisch | Editorial, monochrom | `#171717` | `#FAFAFA` | Sans | flach |
| Stilvoll | Boutique: Gold auf Creme | `#B08D57` | `#FBF7F0` | Serif | dunkler Schleier oben |
| Gemütlich | Terrakotta/Aprikose, warm | `#B4633A` | `#FDF4E7` | Serif | radialer Lichtschein |

Regeln: Preisfarbe folgt der Primärfarbe (außer Modern), Header erbt
Hintergrund/Textfarbe, **eigene Farbentscheidungen überleben den
Template-Wechsel** (überschrieben wird nur, was noch auf einem Default stand
— per Test abgesichert, `client/store/__tests__/templateWechsel.test.ts`).

Für **zwei zusätzliche Templates** liegt ein fertiger Design-Prompt bereit:
`docs/PROMPT-NEUE-TEMPLATES.md` (alle sechs Integrationspunkte, harte Regeln,
Abnahmekriterien; empfohlene Lücken: dunkles Bar-Template, frisches Grün).

## 4. Veröffentlichung real durchgeführt

Mit dem (noch alten) Produktionscode: Domain-Schritt über den Rückwärtsweg
erreicht, Subdomain gesetzt, Checkliste 8/8, veröffentlicht:
**https://trattoriabellavista.maitr.de** — Testseite, kann gelöscht werden.

## 5. Vergleich Konfigurator ↔ veröffentlichte Seite

### Stimmt überein ✅
- Hero: Slogan + Beschreibung wortgleich
- Highlights: markiertes Gericht zuerst, Titel/Beschreibung/Preise exakt (€)
- Farben/Verlauf der Startseite (Template Modern, `#FFF7ED→#F59E0B`), Preisfarbe
- Öffnungszeiten-Logik inkl. „Heute … Offen"-Badge, Standortzeile
- Kontakt: Telefon + E-Mail (live vorhanden — es fehlte nur die Vorschau)
- Reservierungsseite: Stil „Klassisch", Buttonfarbe/-form aus dem Store
- Navigation: gewählte Seiten inkl. „Über uns"

### Abweichungen ❌ (Stand Produktion, vor Deploy der Fixes)

| # | Abweichung | Status |
|---|---|---|
| P1 | **Galerie-Bild kaputt:** Foto wurde als `blob:`-URL veröffentlicht — existiert nur in der Browser-Sitzung des Betreibers, jeder Gast sieht ein leeres Bild (`naturalWidth: 0`). Upload-Schritt lädt nie auf einen Server hoch. | **[OFFEN — serverseitig]** Braucht echten Upload (Endpoint + Storage) beim Veröffentlichen |
| P2 | **Titel/SEO:** Live stand `Maitr – Restaurant-Web-App …` als Seitentitel und Maitrs Marketing-Meta-Description — nicht „Trattoria Bella Vista – …" wie die SEO-Vorschau versprach | **[BEHOBEN]** AppRenderer setzt Titel + Description des Betriebs (SEO-Schritt-Werte, sonst Name+Slogan). Für Crawler zusätzlich Edge-Injection empfohlen **[OFFEN]** |
| P3 | **Hero-CTA:** Vorschau zeigt bei aktivierter Online-Bestellung „Jetzt bestellen" (Primärfarbe) — live existierte dieser Knopf nicht (nur „Tisch reservieren") | **[BEHOBEN]** Live-Seite erhält denselben Knopf |
| P4 | **Wochentage englisch** auch live | **[BEHOBEN]** gemeinsame Quelle |
| P5 | **Straßenadresse fehlte live** (lag nur in `contactMethods`) | **[BEHOBEN]** AppRenderer zeigt sie unter „Adresse" |
| P6 | „Galerie" erscheint in der Navigation, obwohl im Schritt „Seiten auswählen" **abgewählt** — Auto-Discovery gewinnt, sobald ein Bild existiert (in beiden Renderern identisch) | **[OFFEN — Produktentscheidung]** Soll Abwahl die Auto-Discovery übersteuern? |

## 6. Noch offen (aus dem ersten Durchgang)

1. **P1 Bild-Upload beim Veröffentlichen** — wichtigster offener Punkt: ohne
   ihn ist die Galerie auf jeder veröffentlichten Seite kaputt.
2. Reload springt auf Schritt 1 zurück (Daten bleiben erhalten);
   Vorschau-Reservierungsformular zeigt ohne `configId` „Keine Zeitslots"
   (wirkt kaputt); Kopfzeilen-„Zurück" ist eigentlich Undo;
   `document.title` im Konfigurator bleibt „Modus auswählen";
   `console.log` der Debounce-Inputs läuft in Produktion mit;
   „Verfügbare Zeitfenster" richtet sich nicht nach den Öffnungszeiten.
3. Zwei neue Templates: Prompt fertig, Design-Session ausstehend.

## 7. Verifikation

- `npx tsc --noEmit`: keine neuen Fehler in angefassten Dateien
  (vorbestehend, unberührt: `WelcomePage.tsx`, `staff.ts`, `autoPublish.spec.ts` u. a.)
- `npx vitest run client/` auf **Node 22.21** (mit System-Node 22.11 läuft
  nur ein Teil der Suite!): **64 Tests / 10 Dateien, alle grün** — inkl.
  neuer Tests für Template-Wechsel und Wrapper-Stile
- Lokal im Dev-Server Schritt für Schritt nachgestellt: beide Blocker,
  Template-Paletten (4 Screenshots), Header-Größe, Preset-Kopplung,
  Kontrast-Warnung, deutsche Schritte 11/13, Teamliste mit Dedupe,
  Kontaktseite mit Telefon/E-Mail/deutschen Wochentagen
- Produktion: kompletter Publish-Durchlauf + Live-Audit aller Seiten

---

# Runde 2 — Blob-Fix, Zusatzfunktionen, neue Templates (20.08.2026, nachmittags)

## 1. Bilder überleben jetzt das Veröffentlichen **[BEHOBEN]**

Der Server hatte mit `POST /api/media/upload` (Supabase Storage, auf
Produktion konfiguriert) längst den richtigen Endpunkt — es fehlte die
Client-Anbindung. Jetzt laden **alle** Bildstellen dauerhaft hoch:
Galerie, Gericht-Bilder, Logo (sofortige Blob-Vorschau, im Hintergrund
ersetzt durch die Storage-URL), Angebotsbilder und das Social-Media-Bild
(das vorher als File-Objekt gespeichert wurde und beim Veröffentlichen zu
`{}` serialisierte). Rückfallebene ohne Storage: clientseitig verkleinertes
data:-URL-Bild (max. 1600px, JPEG) — größer, aber es überlebt das
Veröffentlichen, im Gegensatz zu `blob:`.
Zentrale Stelle: `client/lib/mediaUpload.ts`.

## 2. Zusatzfunktionen: Angebote & Team waren dreifach kaputt **[BEHOBEN]**

1. **Schema-Falle:** Das Speichern-Schema verlangte bei Angeboten ein
   Pflichtfeld `title` — der Konfigurator erzeugt `{name, price, image}`.
   **Eine Konfiguration mit einem einzigen Angebot fiel beim Cloud-Speichern
   komplett mit 400 durch** (Fehler wurde nur geloggt). Schema akzeptiert
   jetzt beide Formen; abgesichert durch `server/__tests__/angeboteSchema.spec.ts`.
2. **Toter Schalter:** „Angebote-Tab anzeigen" schrieb `offerPageEnabled`,
   die Navigation beider Renderer las aber nur `offerBanner.enabled` —
   der Tab konnte nie erscheinen. Beide hören jetzt auf beide Felder.
3. **404-Seiten:** „Angebote" und „Über uns" standen in der Navigation,
   die Seiten existierten in keinem Renderer (404 für jeden Gast). Beide
   gibt es jetzt als GETEILTE Komponenten (`OffersSection`, `AboutSection`)
   — Angebots-Karten mit €-Preis, und die Über-uns-Seite zeigt endlich auch
   das Team (Avatare, deutsche Rollen), das bisher unsichtbar im Store lag.

## 3. Zwei neue Templates: „Mitternacht" und „Verde" **[NEU]**

Ersetzen „Stilvoll" und „Gemütlich" im Picker (Alt-IDs bleiben als
Bestand lauffähig):

| | Mitternacht (`nocturne`) | Verde (`verde`) |
|---|---|---|
| Für wen | Bars, Weinbars, Abendküche | Cafés, Brunch, grüne Küche |
| Look | Messing `#C89B3C` auf Nachtblau `#10151B`, gedämpftes Licht von oben, dunkle Glaskarten | Blattgrün `#2F5E43` auf Papier `#F7F5EC`, Salbei-Schleier, weiße Karten mit grüner Kante, Serifen |

Beide bestehen den neuen **Kontrast-Wächter-Test**
(`templateKontrast.test.ts`: Text ≥ 4,5:1, Header ≥ 4,5:1, Preis ≥ 3:1,
nur 6-stellige Hexfarben — für alle Picker-Templates). Der
Reservieren-Button folgt jetzt ebenfalls der Template-Primärfarbe
(gleiche „nur wenn unverändert"-Regel wie alle Farben).
Visuell abgenommen: dunkle Startseite mit Bar-Speisekarte, Menü-Overlay,
Angebote- und Über-uns-Seite auf dunkel, Desktop-Modus.

## 4. Weiß-Block unter kurzen Seiten **[BEHOBEN]**

Ursache gefunden: Die Transition-Hülle im Telefon-Portal hatte keine Höhe —
der Seitenhintergrund endete mit dem Inhalt, darunter schien der weiße
Geräterahmen durch (auf Mitternacht wirkte das wie ein Renderfehler).
Flex-Kette repariert; Hintergrund füllt jetzt immer das ganze Telefon.

## 5. Desktop-Wirkung der Web-App

Auf voller Breite (1440px, veröffentlichte Seite + Desktop-Vorschau
geprüft): `max-w-7xl`-Zentrierung, Highlights dreispaltig, Galerie bis
vier Spalten, Formulare mit `max-w-md` zentriert — **wirkt wie eine
gestaltete Website, nicht wie eine gestreckte Handy-App.** Keine
Layout-Brüche gefunden. Geschmackssache, kein Fehler: Der Hero lässt auf
Desktop viel Luft; ein Hero-Bild des Betriebs (sobald Bild-Upload deployt
ist) würde das füllen.

## 6. Prüfstand

- `vitest`: **82 Tests / 12 Dateien grün** (inkl. neuer Tests:
  Angebote-Schema, Kontrast-Wächter, Template-Wechsel)
- `tsc`: keine Fehler in angefassten Dateien (105 vorbestehende an anderer
  Stelle, unverändert)
- Alles weiterhin **uncommitted auf `mobile/testflight-1.0.0`** — wirkt
  erst nach Merge/Deploy auf main.

---

# Runde 3 — Helle Templates, Angebots-Banner, Lieferbarkeits-Audit (20.08.2026)

## 1. Kein dunkles Template mehr **[UMGESETZT]**

Produktentscheidung: Der Picker bietet nur helle Templates — dunkel stellt
man über die freien Farben selbst ein. „Mitternacht" wurde durch **„Riviera"**
ersetzt (Adriablau `#1E5A7E` auf Sandton `#F9F6EF`, Azur-Schimmer am unteren
Rand, Serifen, weiße Karten mit blauer Kante — Küstenküche, Fisch,
Sommerterrassen). Lineup: **Minimalistisch · Modern · Riviera · Verde.**
Alt-IDs (`stylish`, `cozy`, `nocturne`) bleiben im Renderer lauffähig.
Kontrast-Wächter-Test auf das neue Lineup aktualisiert.

## 2. Angebots-Banner auf der Startseite **[NEU]**

Geteilte Komponente `OfferBanner` (Vorschau = Live), zwischen Hero und
Highlights, Klick führt zur Angebote-Seite. Im Angebote-Schritt konfigurierbar:

- **Schalter** „Banner auf der Startseite anzeigen" (`offerBanner.enabled`)
- **Größe**: Klein (schmale Pill: Icon · Name · Preis) · Mittel (Karte mit
  Beschreibung) · Groß (Karte mit Bild, Bannertext und CTA-Knopf)
- **Bannertext** (optional) und die bestehenden Farben (Hintergrund/Text/Knopf,
  Labels jetzt deutsch)
- Schema um `offerBanner.size` erweitert; im Test abgesichert

Alle drei Größen visuell abgenommen (Riviera, „Pranzo di Mare · 16,90 €").

Dabei gefixt: **Viewport-Falle in geteilten Seiten** — `md:grid-cols-2`
richtet sich nach dem Browserfenster, nicht nach dem 360px-Telefonrahmen der
Vorschau; die Angebots-Karten wurden dort auf 126px zusammengequetscht.
Jetzt containerbasiertes Grid (`auto-fit, minmax(240px, 1fr)`).

## 3. Lieferbarkeits-Audit der Zusatzfunktionen

Neue eine Quelle: `client/lib/featureAvailability.ts` — was dort auf `false`
steht, zeigt der Feature-Schritt als **„Bald verfügbar"** (nicht aktivierbar,
Deaktivieren von Alt-Configs bleibt möglich) und beide Renderer spielen es
nicht aus. Sobald ein Feature end-to-end steht: ein Flag-Wechsel.

| Feature | Befund | Status |
|---|---|---|
| **Aktuelle Angebote** | Seite + Banner + Tab, Schema repariert | ✅ lieferbar |
| **Team-Bereich** | Über-uns-Seite zeigt das Team | ✅ lieferbar |
| **Online-Bestellung** | Gäste konnten in einen Warenkorb legen, aber es gibt **keinen Checkout und keinen Gast-Bestell-Endpunkt** (`POST /api/orders/create` ist Betreiber-seitig/requireAuth, nur Social-Proof) — Sackgasse mitten im Gast-Erlebnis | ⛔ „Bald verfügbar"; Bestell-Controls (+, Warenkorb, „Jetzt bestellen") werden nicht mehr ausgespielt |
| **Online-Shop** | kein Rendering auf der Live-Seite | ⛔ „Bald verfügbar" |
| **Stempelkarte/Treue** | keine Stempel-Logik für Gäste | ⛔ „Bald verfügbar" |
| **Gutscheine/Voucher** | keine Einlöse-Logik für Gäste | ⛔ „Bald verfügbar" |

Verifiziert: Klick auf gesperrtes Feature aktiviert nichts und navigiert
nicht; Angebote-Flow läuft komplett durch.

## 4. Prüfstand Runde 3

- `vitest`: **82 Tests / 12 Dateien grün** (Kontrast-Wächter auf neues
  Lineup, Angebote-Schema inkl. `size`)
- `tsc`: keine Fehler in angefassten Dateien
- Weiterhin **uncommitted auf `mobile/testflight-1.0.0`**

---

# Runde 4 — Reservierung fertig verdrahtet, App-Schnittstelle, Wallet-Kette (20.08.2026, abends)

## 1. Reservierung: Anfrage → Bestätigung ist jetzt komplett **[UMGESETZT]**

Der Flow war zu ~80 % gebaut (Formular → `POST /api/public/reservations`,
Mails, Betreiber-Dashboard). Ergänzt wurde das fehlende Fünftel:

1. **One-Click aus der Betreiber-Mail:** „✓ Bestätigen" / „✕ Ablehnen" —
   signierte Links (HMAC über Reservierungs-ID + Aktion,
   `GET /api/public/reservations/:id/action`), idempotent, deutsche
   Antwortseite. Ohne Signatur-Secret (`RESERVATION_ACTION_SECRET`,
   Fallback `MAITR_OAUTH_STATE_SECRET`) degradiert die Mail auf den
   Dashboard-Knopf wie bisher.
2. **Absage-Mail an den Gast** (`sendReservationDeclined`) — hängt an allen
   drei Wegen (One-Click, Web-Dashboard, App). Vorher erfuhr ein Gast von
   einer Ablehnung nichts.
3. **Zeitfenster × Öffnungszeiten:** `GET /slots` bot Slots auch an
   Ruhetagen an. Geteilte Logik `@maitr/core/reservierungsSlots` (Server
   UND Vorschau; Sperrstunde nach Mitternacht; leere Alt-Öffnungszeiten
   filtern bewusst nicht). 10 neue Unit-Tests.
4. **Vorschau zeigt echte Zeitfenster** statt „Keine Zeitslots verfügbar"
   (Store-Slots + dieselbe Filterlogik; verifiziert: Do 09–17 → 12:00/13:00).

## 2. Schnittstelle zur Maitr-App **[UMGESETZT]**

Neu: `PATCH /api/maitr/reservations/:id/status` — venue-gescoped
(businessId aus geprüfter Mitgliedschaft), Status `confirmed`/`cancelled`,
Gast-Mails nur beim echten Übergang aus PENDING, Antwort im API-Vertrag
der App. **Push bei neuer Anfrage [OFFEN]:** kein Push-Kanal im Repo;
empfohlener Schnitt: PushToken-Modell + Registrierungs-Endpunkt + Versand
in `POST /api/public/reservations` (braucht Migration + App-Release).

## 3. Wallet-Pass: Konto-Verknüpfung geprüft ✓

Stempelkarte serverseitig bereits weit gebaut (`server/maitr/stempelkarte.ts`,
Hauptbuch-Prinzip). Kette geschlossen:
`WalletDeviceRegistration → StampCard (businessId, guestId) → MaitrGuest
(Telefon E.164 — dieselbe Kartei wie Reservierungen) → Business ←
BusinessMember ← User (Clerk)`. Jede Abfrage erzwingt businessId aus der
geprüften Venue-Mitgliedschaft. Für Wallet fehlen noch Passbau
(.pkpass-Signierung), APNs-Versand, Google-Wallet-REST; `walletReadiness()`
(ENV-Prüfung) existiert.

## 4. Bekanntes Vorschau-Detail **[OFFEN]**

Klicks auf die Datums-Kacheln des modernen Reservierungsformulars kommen im
Telefonrahmen nicht am React-Handler an (per Fiber-State nachgewiesen:
`setSelectedDateISO` feuert nicht; der Rahmen schluckt die Events nativ).
Nur Vorschau-Interaktion — die veröffentlichte Seite hat kein Portal.

## 5. Prüfstand Runde 4

- `vitest`: **92 Tests / 13 Dateien grün** (10 neue für Slot-Logik)
- `tsc`: keine Fehler in angefassten Dateien
- Weiterhin **uncommitted auf `mobile/testflight-1.0.0`**

---

# Runde 5 — Stempelkarte Stufe 1: der Gast sieht seinen Stand (20.08.2026)

Die Betreiber-Seite war bereits vollständig (Programm, Karte ausgeben,
stempeln, einlösen, DSGVO-Anonymisierung; App-Screens vorhanden; Migrationen
liegen im Repo und laufen beim nächsten Deploy). Es fehlte der Gast-Zugang —
jetzt geschlossen:

1. **Signierter Gast-Link** statt Telefonnummern-Suche: `/karte/<cardId>?t=<hmac>`.
   Die uuid allein öffnet nichts (Modul-Regel: Kennung im Pfad ist kein
   Geheimnis); erst die HMAC-Signatur (`STAMPCARD_LINK_SECRET`, Fallback
   `MAITR_OAUTH_STATE_SECRET`) macht den Link zum Schlüssel. Bewusst KEIN
   Nummern-Lookup — das wäre ein Enumerations-Orakel.
2. **Öffentliche Lese-Route** `GET /api/public/stampcards/:cardId?t=…`
   (rate-limitiert wie Reservierungen; ungültig = 404, kein Existenz-Leak).
   Fachlogik `karteFuerGastLesen()` in stempelkarte.ts — Stand aus dem
   Hauptbuch, Antwort ohne Personendaten (nur Betrieb, Stand, Ziel, Prämie).
3. **Gast-Seite im Web** (`/karte/:cardId`, wie `/r/:id` leichtgewichtig,
   ohne Login): Stempel-Raster wie auf Pappe, „7 / 10", Prämien-Hinweis,
   Voll-/Eingelöst-Zustände. Visuell abgenommen (Erfolg + Fehlerfall).
4. **App: „Gast-Link teilen"** im Kartendetail — der Server bildet die URL
   (Secret bleibt serverseitig, neuer venue-gescopeter Endpoint
   `GET /api/maitr/loyalty/cards/:cardId/gast-link`), die App öffnet den
   System-Teilen-Dialog. API-Client (`@maitr/core`) um `loyalty.guestLink`
   ergänzt.

Damit ist Stufe 1 komplett: Betreiber stempelt in der App, der Gast sieht
seinen Stand über QR/Link. **Stufe 2 (Wallet-Pass)** setzt exakt hierauf auf
(gleiche Karte, gleiche Kette) und braucht noch Passbau/.pkpass-Signierung,
APNs-Versand und Google-Wallet-REST; `walletReadiness()` und die
Registrierungs-Modelle existieren bereits.

## Prüfstand Runde 5
- `vitest`: **96 Tests / 14 Dateien grün** (neu: Signatur-Token-Spec)
- `tsc` Haupt-Workspace UND `mobile/`: 0 Fehler
- Weiterhin **uncommitted auf `mobile/testflight-1.0.0`**

---

# Runde 6 — Push-Kanal: Reservierungsanfrage → Betreiber-App (20.08.2026)

Der komplette Kanal, Ende zu Ende:

1. **Datenmodell** `PushToken` (userId → User/Clerk, token unique, platform)
   mit Migration `20260820_add_push_token` (per `prisma migrate diff` ohne
   DB-Verbindung erzeugt, inkl. rollback.sql; läuft beim nächsten Deploy).
   Das Token gehört dem KONTO, nicht dem Betrieb — wer in mehreren Betrieben
   Mitglied ist, bekommt auf einem Gerät die Anfragen aller seiner Betriebe.
   Unique-Upsert: Wechselt auf einem Gerät das Konto, wandert das Token mit.
2. **Server:** `server/services/push.ts` — Versand direkt gegen Expos
   HTTP-API (bewusst ohne expo-server-sdk), Blöcke à 100, `DeviceNotRegistered`
   → Token wird sofort gelöscht. `pushAnBetrieb()` löst zur Sendezeit
   Betrieb → BusinessMember → Geräte auf. Registrierung:
   `POST /api/maitr/push/register|unregister` (user-scoped, Expo-Token-Form
   validiert, unregister nur fürs eigene Token).
3. **Auslöser:** `POST /api/public/reservations` sendet nach dem Anlegen
   „Neue Reservierungsanfrage — <Gast> · <n> Personen · <Termin>" —
   fire-and-forget: Der Gast wartet nie auf Expo, Fehler landen im Log.
4. **App:** `usePushRegistrierung()` im Tab-Layout — nur echtes Gerät, nur
   echter Server (kein Demo-Genöle), einmalige Permission-Frage ohne
   Wiederholungs-Nag, Android-Channel, Tap auf die Push → Tische-Screen.
   `api.push.register/unregister` im geteilten Client; `expo-notifications`
   + `expo-device` installiert, Plugin in app.json.

**Wichtig fürs Ausrollen:** expo-notifications ist ein NATIVER Baustein —
wirkt erst mit dem nächsten EAS-/TestFlight-Build (kein OTA-Update). Beim
iOS-Build das Push-Entitlement bestätigen (EAS setzt es mit dem Plugin
normalerweise selbst). Optional später: EXPO_ACCESS_TOKEN für gesicherten
Versand.

## Prüfstand Runde 6
- `vitest`: **100 Tests / 15 Dateien grün** (neu: Push-Service-Spec)
- `tsc` Haupt-Workspace und `mobile/`: 0 Fehler
- Weiterhin **uncommitted auf `mobile/testflight-1.0.0`**

---

# Runde 7 — Wallet Stufe 2: echte Pässe (20.08.2026, spät)

Aufgesetzt auf die vorhandene Kette (WalletDeviceRegistration → StampCard →
MaitrGuest → Business ← BusinessMember ← Clerk) und die vorbereiteten
Spalten (serialNumber, encAuthToken AES-256-GCM, passUpdateSeq-Sequenz,
contentChangedAt). Alles Neue liegt in `server/wallet/`:

1. **Apple-Pass (.pkpass)**: `applePass.ts` — pass.json (storeCard mit
   Stempelstand, Prämie, Rückseiten-Link), SHA-1-Manifest, PKCS#7-Detached-
   Signatur (node-forge, P12 + WWDR aus der validierten Env), ZIP (jszip).
   Bildmarken base64-eingebettet (bundling-sicher).
2. **PassKit-Web-Service** (`appleWebService.ts`, gemountet unter
   `/api/wallet`): Registrieren/Abmelden, „welche Pässe änderten sich?"
   (passesUpdatedSince über die Sequenz), Passauslieferung mit ehrlichem
   Last-Modified aus contentChangedAt, Gerätelog. Auth je Karte über das
   ApplePass-Token (in der DB nur verschlüsselt); falsche Serial und
   falsches Token antworten identisch.
3. **APNs-Updates** (`apns.ts`): ES256-Provider-JWT mit node:crypto
   (ieee-p1363 → JOSE, kein SDK), http2 an sandbox/production je APNS_ENV,
   Token-Cache gegen TooManyProviderTokenUpdates. `update.ts` schreibt den
   Änderungs-Tag atomar (nextval nur bei vorhandener serialNumber — exakt
   die im Schema dokumentierte Vorsicht) und räumt tote Registrierungen auf.
   Angestoßen aus den Buchungsrouten NACH der Transaktion (stempeln,
   einlösen, entwerten) — die Fachlogik bleibt frei von Sendepfaden.
4. **Google Wallet** (`googleWallet.ts`): „Save to Google Wallet"-Link als
   Fat-JWT (Klasse+Objekt eingebettet, RS256 mit node:crypto — kein REST,
   keine Dependency), deterministische IDs gegen Duplikate.
5. **Gast-Zugang**: Die Karten-Seite `/karte/:cardId` zeigt die Wallet-
   Knöpfe nur, wenn die Env sie trägt (`wallet`-Flags in der public-Antwort).
   `GET /api/public/stampcards/:cardId/apple.pkpass|google-wallet` hinter
   derselben Gast-HMAC; der Erst-Abruf stattet die Karte mit Serial +
   verschlüsseltem authenticationToken aus.
6. `PASSAUSGABE_GEBAUT = true` — der App-Bildschirm zeigt den Zustand ab
   jetzt über `walletReadiness()` ehrlich an.

**Rollout-Voraussetzungen (menschliche Schritte):** Apple: Pass Type ID +
Zertifikat (.p12), WWDR-PEM, APNs-.p8 → `APPLE_*`/`APNS_*`-Variablen.
Google: Wallet-Issuer + Dienstkonto → `GOOGLE_WALLET_*`. Ohne sie: Knöpfe
erscheinen nicht, Routen antworten 503 — nichts bricht.

## Prüfstand Runde 7
- `vitest` (VOLLE Suite inkl. aller Server-Specs): **701 Tests / 52 Dateien grün**
- `tsc`: 0 Fehler in angefassten Dateien
- Neue Dependencies: jszip, node-forge (+types) — **per pnpm** (das Projekt
  ist pnpm-verwaltet; npm-Arborist bricht am .pnpm-Baum ab)
