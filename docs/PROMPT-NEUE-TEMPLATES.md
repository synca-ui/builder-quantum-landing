# Prompt: Zwei neue Maitr-Templates entwerfen

> Diesen Prompt komplett an eine Design-Session (z. B. Claude) geben.
> Er enthält alle Integrationspunkte, damit das Ergebnis ohne Umbau in
> Konfigurator **und** veröffentlichte Seite passt.

---

## Auftrag

Entwirf **zwei neue Templates** für Maitr, einen Web-App-Baukasten für
Restaurants, Cafés und Bars. Ein Template ist bei Maitr **keine eigene
Layout-Engine**, sondern ein kuratiertes Bündel aus:

1. einer **Farbpalette** (8 Design-Felder),
2. einer **Schriftentscheidung** (`sans-serif` | `serif` | `monospace` — mehr
   lässt das Server-Schema nicht zu),
3. einem **Seitenhintergrund-Stil** (CSS `background`, eine Funktion),
4. einem **Karten-Stil** für Gerichte (CSS-Objekt, eine Funktion),
5. Name + Beschreibung in Deutsch und Englisch.

Beide Renderer (Konfigurator-Vorschau `TemplatePreviewContent` und
veröffentlichte Seite `AppRenderer`) lesen dieselben geteilten Komponenten
und denselben Design-Store. Was du definierst, sieht der Gast später exakt so.

## Die sechzehn bestehenden Templates (davon musst du dich absetzen)

| ID | Charakter | Primär | Sekundär | Hintergrund | Schrift |
|----|-----------|--------|----------|-------------|---------|
| `modern` | Kräftig, kommerziell, Verlauf über die ganze Seite | `#4F46E5` | `#7C3AED` | `#FFFFFF` | sans-serif |
| `minimalist` | Editorial, monochrom, flache Liste statt Karten | `#171717` | `#525252` | `#FAFAFA` | sans-serif |
| `presse` | Bistrokarte: Serife, Punktlinien zum Preis, Doppellinie, keine Bilder | `#A81E14` | `#A79A85` | `#FBF7F0` | serif (Newsreader) |
| `kiosk` | Aushang: Bildband, numeriertes Register, Ziffernspalte; Orange nur an Ziffern | `#E8541F` | `#D9D8D3` | `#F1F0EC` | sans-serif (Space Grotesk) |
| `izakaya` | Zettel: Rahmenkästen 2×2 mit Nummer, Bild und Preis; Rot nur für Nummern/Stempel | `#9C2B22` | `#D8CFBE` | `#F5F0E6` | sans-serif (Bricolage Grotesque) |
| `morgen` | Frühstückskarte: Linien, kursive Kobalt-Serife für Zeitfenster und Preise | `#0F4C81` | `#DAD6CC` | `#F7F5EF` | sans-serif (Manrope) + Newsreader |
| `vitrine` | Fotokarte: Bildkacheln 4:3 in zwei Spalten, Name und Preis darunter; Pillen-Filter, Pillen-CTA | `#0F6E64` | `#E6F0EE` | `#FFFFFF` | sans-serif (Plus Jakarta Sans) |
| `gelato` | Eisdiele: Pastellblock-Hero, Sticker-Karten mit Kreisbild, Preis in der Pille | `#C93560` | `#BEE3C9` | `#FFF8F0` | sans-serif (Manrope) + Fredoka |
| `brauhaus` | Gasthaus: Doppelrahmen-Hero, Strichlinien zum Preis, Rauten-Ornament über Kategorien, Rahmen-CTA | `#8C4A1F` | `#D8B98A` | `#F6EFE2` | serif (Bitter) |
| `ramen` | Purist: rotes Siegel mit Initiale, Haarlinien, kurzer Strich unterm Namen, gepunktete Filter | `#C8102E` | `#ECEBE4` | `#FAFAF7` | sans-serif (Instrument Sans) |
| `imbiss` | Imbissbude: Schild-Hero mit hartem Schlagschatten, Kategorie-Balken, Preis als Schild | `#111111` | `#FFD23F` | `#FFFBEA` | sans-serif (Space Grotesk) + Unbounded |
| `konditorei` | Kaffeehaus: Mittelachse, Zierlinie, kursive Serife, Preise in Kapitälchen, Zierlinien-CTA | `#8A3B4A` | `#EBD6D8` | `#FBF6F3` | sans-serif (Manrope) + Cormorant |
| `roesterei` | Rösterei: Monospace-Kicker in Klammern, Etikett-Karten mit Nummer und Rubrik, Highlights als Band | `#B05532` | `#DDD5C7` | `#F4F1EA` | sans-serif (Manrope) + JetBrains Mono |
| `markt` | Markthalle: grüner Streifen über der Kopfzeile, Preisschild zuerst, Versal-Überschriften mit Zähler | `#1D7A46` | `#EAF3EC` | `#FFFFFF` | sans-serif (Figtree) |
| `aperitivo` | Aperitivo: Pfirsichkreis hinterm Titel, getönte Karten mit Kreisbild im 2er-Raster, Marker-Überschriften | `#CF4524` | `#FFD5C2` | `#FFF4EC` | sans-serif (Manrope) + Syne |
| `hofladen` | Hofcafé: Stempel mit Betriebsart, gestrichelte Karteikarten, kursive Überschriften mit kurzem Strich | `#4E7A3A` | `#E4E8D3` | `#F8F6EE` | serif (Lora) |

(„Riviera" und „Verde" sind aus dem Picker genommen; ihre IDs `riviera`/`verde`
existieren wie `stylish`/`cozy`/`nocturne` nur noch als Alt-Bestand im
Renderer, veröffentlichte Seiten ändern sich nicht.)

**Seit den Papier-Templates gibt es eine zweite Ebene:** Ein Template kann
über `client/lib/templateLayout.ts` eigene Layoutformen mitbringen (Zeilen-
form in `DishCard`, Listen-Leisten und Kategorie-Überschriften in `DishList`,
Hero-, Kopfzeilen-, Filter- und Reservieren-Varianten). Beide Renderer lesen
ausschließlich diese Quelle; `templateParitaet.test.tsx` vergleicht das
erzeugte HTML von Vorschau und Live-Seite — für JEDES Template in
`TEMPLATE_TOKENS`, automatisch. Ein neues Template ohne eigene Formen braucht
dort keinen Eintrag — es rendert wie die Bestands-Templates.

Seit der zweiten Runde (vitrine … hofladen, September 2026) sind alle Formen
einzeln benannte Felder des Layouts: `dish`, `ueberschrift`, `leiste`,
`highlightsGruppiert`, `zurKarte`, `raster`, `rasterHighlights`, `hero`,
`nav`, `filter`, `cta`, `linie`, `kicker`, `knopf`. Wer ein Template mit
eigenen Formen baut, ergänzt (1) den Eintrag in `LAYOUTS`, (2) je eine
Verzweigung in `DishCard`, `DishList`, `Hero`, `Navigation`,
`CategoryFilter`, `ReservationCta` für jede NEUE Form, (3) eine selbst
gehostete Schrift in `templateFonts.ts` (fontsource-Paket; der Wächter
`templateFonts.test.ts` prüft Paket, Import und Familiennamen), (4) die
Bausteine unten. `templateLayout.test.ts` verlangt, dass jedes Template der
zweiten Runde eine eigene Zeilenform, einen eigenen Hero und eine eigene
Kopfzeile hat — zwei Templates, die sich nur in der Palette unterscheiden,
sind ein Template mit zwei Paletten. Auch die Leiste über den Highlights ist
je Template eigen (`leiste`), keine gemeinsame „Highlights / Alle“-Zeile.

**Flächen in der Sekundärfarbe** (Hero-Blöcke, getönte Karten, Marker)
rechnen ihre Textfarbe gegen die tatsächliche Fläche
(`textAufFlaeche`, `mische` in templateLayout.ts) — der Betrieb darf jede
Farbe verstellen, und Text auf dunkler Sekundärfläche weicht dann auf Weiß
aus. `flaechenKontrast.test.tsx` prüft das mit Navy als Sekundärfarbe.

**Reservierungsseite:** Der klassische Auftritt liegt in
`client/components/shared/ReservationClassicForm.tsx` und bucht seit dem
10.09. über dieselbe Route wie das „modern“-Formular in
`ReservationFormModern.tsx`; beide lesen Rundungen aus
den Design-Tokens (`--radius-card`, `--radius-input`) und die Knopfform aus
dem Reservierungs-Schritt. Der Paritätstest vergleicht auch diese Seite.

**Kennzeichnung ist keine Gestaltungsfrage:** Jede Zeilenform zeigt die
Allergen-/Zusatzstoff-Kürzel klein hinter dem Namen und die Ernährungs-
Labels als gesperrte Zeile; die Speisekarte endet mit der Legende der
verwendeten und erklärten Kürzel (`client/lib/kennzeichnung.ts`, LMIDV § 2).
Wer eine neue Zeilenform baut, setzt `{kuerzel}` in die Überschrift und
`{kennzeichnung}` unter die Beschreibung — `dishListLayout.test.tsx` prüft
es für jede Form.

**Produktentscheidung: KEINE dunklen Templates im Picker** — dunkel stellt
sich der Betrieb über die freien Farben selbst ein. Neue Templates müssen
hell sein.

**Abgedeckte Richtungen:** Verspielt/Familiär (gelato), Imbiss/Street Food
(imbiss), Puristisch-Japanisch (ramen), Rustikal/Brauhaus (brauhaus),
Foto-orientiert (vitrine), Patisserie (konditorei), Specialty Coffee
(roesterei), Deli/Mittagstisch (markt), Cocktailbar bei Tag (aperitivo),
Hofcafé/Biergarten (hofladen). **Noch offen:** Pizzeria/Trattoria,
Weinbar/Vinothek, Bäckerei mit Wochenplan, Kantine/Mensa, Fine Dining mit
Menüfolge. Das sind Vorschläge, keine Pflicht — begründe deine Wahl aus
Gastro-Sicht.

## Harte Regeln

0. **Keine Emojis.** Kein Template rendert `item.emoji` — weder im Namen
   noch als Bildplatzhalter (dort steht der Anfangsbuchstabe). Das Feld
   bleibt im Datenmodell, wird aber nicht gezeigt.

1. **Nur 6-stellige Hex-Farben** (`#RRGGBB`). Der Seitenhintergrund hängt
   Alpha-Suffixe an (`${secondaryColor}1A`), 3-stellige oder benannte Farben
   brechen das.
2. **Kontrast:** `fontColor` auf `backgroundColor` ≥ 4,5:1 (WCAG AA).
   Ebenso `headerFontColor` auf `headerBackgroundColor`. Der Konfigurator
   warnt inzwischen bei Verstößen — ein Template darf nie selbst die Warnung
   auslösen.
3. **`priceColor`:** gut lesbar auf `backgroundColor` UND auf dem
   Karten-Hintergrund deines Karten-Stils.
4. **Schrift:** nur `sans-serif`, `serif` oder `monospace` (Zod-Enum im
   Server-Schema, `server/schemas/configuration.ts:37`).
5. **Template-ID:** kurzes englisches Kleinbuchstaben-Wort (`nocturne`,
   `garden`, …). Der Server akzeptiert jede ID (`z.string()`), aber sie muss
   in allen sechs Dateien unten konsistent auftauchen.
6. Der Seitenhintergrund muss mit **beliebigen Nutzerfarben** funktionieren —
   Nutzer dürfen jede Palette-Farbe später überschreiben. Keine Konstruktion,
   die nur mit deiner Palette gut aussieht (z. B. weißer Text fest verdrahtet).

## Liefergegenstand: exakt diese sechs Bausteine pro Template

### 1. `client/lib/templateTokens.ts` — Palette + Intent + Schrift

```ts
// In TEMPLATE_TOKENS ergänzen:
<id>: {
  colors: {
    primary: "#______",   // Buttons, CTAs, Preise
    secondary: "#______", // Verläufe, Akzente, Hintergrund-Stimmung
    background: "#______",
    text: "#______",
    accent: "#______",
    border: "#______",
  },
  spacing: { xs: "4px", sm: "8px", md: "16px", lg: "32px", xl: "64px" },
  typography: {
    h1: { size: "48px", weight: 700, lineHeight: "1.2" },
    h2: { size: "36px", weight: 600, lineHeight: "1.3" },
    body: { size: "16px", weight: 400, lineHeight: "1.6" },
  },
},

// In TEMPLATE_INTENT_MAP:  <id>: "VISUAL" | "NARRATIVE" | "COMMERCIAL"
// In TEMPLATE_FONT_FAMILY: <id>: "sans-serif" | "serif" | "monospace"
```

`getTemplateDesignDefaults()` leitet daraus automatisch die Design-Felder ab
(`priceColor` = `primary`, Header erbt `background`/`text`) — dafür musst du
nichts tun, aber deine Palette muss unter dieser Ableitung funktionieren.

### 2. `client/lib/templateWrapperStyle.ts` — Seitenhintergrund

Eine Verzweigung nach dem Muster der bestehenden:

```ts
if (template === "<id>") {
  return {
    background: `<CSS-background aus backgroundColor/secondaryColor>`,
    color: fontColor,
  };
}
```

Erlaubt: Verläufe, radiale Gradients, Layering mit Alpha-Suffixen.
Nicht erlaubt: Bilder/URLs, feste Farben, die Nutzerfarben ignorieren.

### 3. `client/components/shared/DishCard.tsx` — Karten-Stil

Ein `case "<id>":` in `getTemplateCardStyle()`; Rückgabe ist ein
`React.CSSProperties`-Objekt (Hintergrund, Border, ggf. backdropFilter).
Vorbild: `modern` nutzt Glassmorphism, `minimalist` eine flache Liste.

### 4. `client/lib/styleInjector.ts` — `TEMPLATE_DESIGN_TOKENS`

Eintrag analog zu den vorhandenen (borderRadius, shadow, spacing) —
bestimmt Rundungen und Schatten der veröffentlichten Seite.

### 5. `client/components/configurator/steps/TemplateStep.tsx` — Auswahlkachel

```ts
{
  id: "<id>",
  nameKey: "templates.<id>",
  descriptionKey: "templates.<id>Desc",
  color: "bg-…-500",          // Tailwind-Punktfarbe der Kachel
  previewColor: "border-…-400 bg-…-50/30",
},
```

### 6. `client/i18n/locales/de.json` + `en.json`

```json
"templates": {
  "<id>": "…",       // DE: Name, z. B. "Nachtblau"
  "<id>Desc": "…"    // DE: ein Satz Charakter, wie bei den bestehenden
}
```

## Qualitätsmaßstab (daran wird abgenommen)

- [ ] Beide Templates sind auf einen Blick von allen sechs unterscheidbar —
      auf der Startseite (Hero + 3 Gerichte-Karten) im Telefonrahmen.
- [ ] Alle Kontrastregeln eingehalten (nachrechnen, nicht schätzen —
      WCAG-Formel, relative Luminanz).
- [ ] Preise stechen heraus (das ist Gastronomie: der Preis ist Information,
      nicht Dekoration).
- [ ] Ein Satz pro Template, der einem Wirt erklärt, für wen es ist
      ("Für Bars und Abendbetriebe, die …").
- [ ] Ausgabe als fertige Code-Snippets für alle sechs Dateien, direkt
      einfügbar, plus eine kompakte Farbtabelle wie oben.

## Kontext, der hilft

- Zielgruppe: deutsche Einzelgastronomie, Web-App wird vor allem auf dem
  Handy des Gastes geöffnet (QR-Code auf dem Tisch).
- Die Vorschau rendert in einem 360×740-Telefonrahmen; Hero-Titel ist der
  Slogan des Betriebs, darunter „Highlights" mit Gerichte-Karten.
- Reservierungs-Button und Preisfarbe folgen der Primärfarbe des Themas.
- Templates setzen nur *Defaults*: Jede Farbe bleibt vom Nutzer übersteuerbar,
  eigene Änderungen überleben den Template-Wechsel.
