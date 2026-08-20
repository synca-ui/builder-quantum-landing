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

## Die vier bestehenden Templates (davon musst du dich absetzen)

| ID | Charakter | Primär | Sekundär | Hintergrund | Schrift |
|----|-----------|--------|----------|-------------|---------|
| `modern` | Kräftig, kommerziell, Verlauf über die ganze Seite | `#4F46E5` | `#7C3AED` | `#FFFFFF` | sans-serif |
| `minimalist` | Editorial, monochrom, flache Liste statt Karten | `#171717` | `#525252` | `#FAFAFA` | sans-serif |
| `riviera` | Mediterran & leicht, Adriablau auf Sand — Küstenküche, Fisch | `#1E5A7E` | `#7FB6D9` | `#F9F6EF` | serif |
| `verde` | Frisch & botanisch, Blattgrün auf Papier — Cafés, Brunch | `#2F5E43` | `#9DBD9C` | `#F7F5EC` | serif |

(„Riviera" und „Verde" haben „Stilvoll" und „Gemütlich" ersetzt; deren IDs
`stylish`/`cozy` sowie das dunkle `nocturne` existieren nur noch als
Alt-Bestand im Renderer.)

**Produktentscheidung: KEINE dunklen Templates im Picker** — dunkel stellt
sich der Betrieb über die freien Farben selbst ein. Neue Templates müssen
hell sein.

**Noch offene Richtungen im Sortiment:** Verspielt/Familiär (Eisdiele,
Imbiss), Puristisch-Japanisch (Sushi, Ramen), Rustikal/Brauhaus.
Das sind Vorschläge, keine Pflicht — begründe deine Wahl aus Gastro-Sicht.

## Harte Regeln

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
