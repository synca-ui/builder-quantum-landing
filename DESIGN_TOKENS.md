# Design-Tokens maitr.de

Vollständige Extraktion der Farb- und Gestaltungswerte aus der Website-Codebasis,
zur Übertragung in die Mobile-App.

Quellen: `client/global.css` (CSS-Custom-Properties), `tailwind.config.ts`
(Mapping auf Tailwind-Klassen), `public/manifest.json` und `index.html`
(PWA-/Browser-Chrome), `scripts/gen-icons.mjs` (App-Icon).

Alle Hex-Werte unten sind aus den HSL-Tripeln in `global.css` berechnet, nicht
geschätzt. Stichprobe gegengeprüft: Lighthouse hat für `text-teal-600` auf der
Live-Seite `#178c71` gemessen — exakt der hier berechnete Wert.

---

## 1. Zuerst lesen: es gibt drei verschiedene Türkis

Das ist der wichtigste Befund dieser Extraktion, weil er direkt bestimmt, welchen
Wert die App übernehmen soll.

| Wo | Wert | Rolle |
|---|---|---|
| `public/manifest.json` → `theme_color` | `#0d9488` | PWA-/Browser-Chrome |
| `index.html` → `<meta name="theme-color">` | `#0d9488` | Adressleiste mobil |
| `scripts/gen-icons.mjs` (Verlaufsanfang) | `rgb(13,148,136)` = `#0d9488` | App-Icon |
| `client/global.css` → `--teal-600` | `#178c71` | **das, was die Oberfläche tatsächlich rendert** |
| `client/global.css` → `--teal-500` | `#1daf8d` | Buttons, Verläufe |
| `client/global.css` → `.text-gradient` | `#14b8a6` | Wortmarke, Überschriften |

`#0d9488` ist als Markenfarbe deklariert, wird von der Website aber **an keiner
Stelle als Text- oder Flächenfarbe gerendert**. `tailwind.config.ts` mappt
`teal.500`/`teal.600` auf die CSS-Variablen und überschreibt damit Tailwinds
Standardwerte — und Tailwinds Standard-`teal-600` *ist* `#0d9488`. Die Klasse
`text-teal-600` erzeugt hier also `#178c71`, nicht `#0d9488`.

Zum Vergleich: `#0d9488` hat Farbton 175°, `#178c71` hat 166° — ein sichtbarer
Unterschied (ΔE ≈ 9,5), das eine wirkt blaustichiger, das andere grüner.

**Empfehlung für die App:** `#0d9488` als kanonische Markenfarbe setzen, weil das
der Wert ist, den Icon, Manifest und Adressleiste bereits tragen. Die Abweichung
in `global.css` ist offenbar unbeabsichtigt und sollte separat auf der Website
angeglichen werden — das ist ein sichtbarer Eingriff und war nicht Teil dieses
Auftrags, siehe offene Punkte im Abschlussbericht.

**Wichtige Einschränkung:** `#0d9488` erreicht auf Weiß nur **3,74:1** und
verfehlt damit WCAG AA (4,5:1) für Text unter 18,66px. Als Textfarbe für kleine
Schrift auf hellem Grund ist die Markenfarbe unbrauchbar — dafür `#0f766e`
(5,47:1) verwenden. Genau diese Umstellung war auf der Website nötig, um den
Kontrastfehler im Cookie-Banner zu beheben.

---

## 2. Empfohlene Kernpalette für die App

| Zweck | Hex | Kontrast auf Weiß | Anmerkung |
|---|---|---|---|
| Markenfarbe / Akzent | `#0d9488` | 3,74:1 | Flächen, Icons, große Schrift ab 24px |
| Akzent für kleine Schrift | `#0f766e` | 5,47:1 | Links, Labels, Buttons mit 12–16px |
| Akzent gedrückt / Hover | `#115e59` | 7,58:1 | |
| Akzentfläche hell | `#f2fdfa` | — | Hinterlegungen, Chips |
| Hintergrund | `#ffffff` | — | |
| Text primär | `#020817` | 20,01:1 | |
| Text sekundär | `#64748b` | 4,76:1 | knapp über AA — nicht weiter aufhellen |
| Rahmen / Trenner | `#e2e8f0` | — | |
| Fehler | `#ef4444` | 3,76:1 | nur für Flächen/Icons, nicht für kleine Schrift |
| Sekundärakzent Violett | `#912ef5` | 5,37:1 | |
| Sekundärakzent Orange | `#e05d06` | 3,66:1 | nicht für kleine Schrift |

---

## 3. Vollständige Token-Tabelle

Hell = `:root`, Dunkel = `.dark` in `client/global.css`.

| Token | HSL (hell) | Hex hell | Hex dunkel | Kontrast auf Weiß |
|---|---|---|---|---|
| `--background` | `0 0% 100%` | `#ffffff` | `#020817` | 1,00:1 |
| `--foreground` | `222.2 84% 4.9%` | `#020817` | `#f8fafc` | 20,01:1 |
| `--card` | `0 0% 100%` | `#ffffff` | `#020817` | 1,00:1 |
| `--card-foreground` | `222.2 84% 4.9%` | `#020817` | `#f8fafc` | 20,01:1 |
| `--popover` | `0 0% 100%` | `#ffffff` | `#020817` | 1,00:1 |
| `--popover-foreground` | `222.2 84% 4.9%` | `#020817` | `#f8fafc` | 20,01:1 |
| `--primary` | `222.2 47.4% 11.2%` | `#0f172a` | `#f8fafc` | 17,85:1 |
| `--primary-foreground` | `210 40% 98%` | `#f8fafc` | `#0f172a` | 1,05:1 |
| `--secondary` | `210 40% 96.1%` | `#f1f5f9` | `#1e293b` | 1,10:1 |
| `--secondary-foreground` | `222.2 47.4% 11.2%` | `#0f172a` | `#f8fafc` | 17,85:1 |
| `--muted` | `210 40% 96.1%` | `#f1f5f9` | `#1e293b` | 1,10:1 |
| `--muted-foreground` | `215.4 16.3% 46.9%` | `#64748b` | `#94a3b8` | 4,76:1 |
| `--accent` | `210 40% 96.1%` | `#f1f5f9` | `#1e293b` | 1,10:1 |
| `--accent-foreground` | `222.2 47.4% 11.2%` | `#0f172a` | `#f8fafc` | 17,85:1 |
| `--destructive` | `0 84.2% 60.2%` | `#ef4444` | `#7f1d1d` | 3,76:1 |
| `--destructive-foreground` | `210 40% 98%` | `#f8fafc` | `#f8fafc` | 1,05:1 |
| `--border` | `214.3 31.8% 91.4%` | `#e2e8f0` | `#1e293b` | 1,23:1 |
| `--input` | `214.3 31.8% 91.4%` | `#e2e8f0` | `#1e293b` | 1,23:1 |
| `--ring` | `222.2 84% 4.9%` | `#020817` | `#cbd5e1` | 20,01:1 |
| `--teal-50` | `166 76% 97%` | `#f2fdfa` | `#031612` | 1,04:1 |
| `--teal-500` | `166 72% 40%` | `#1daf8d` | `#50e2c0` | 2,77:1 |
| `--teal-600` | `166 72% 32%` | `#178c71` | `#73e8cd` | 4,18:1 |
| `--orange-50` | `24 100% 97%` | `#fff6f0` | `#190a00` | 1,07:1 |
| `--orange-500` | `24 95% 53%` | `#f97015` | `#fb9551` | 2,85:1 |
| `--orange-600` | `24 95% 45%` | `#e05d06` | `#fcad79` | 3,66:1 |
| `--purple-50` | `270 100% 98%` | `#faf5ff` | `#0d0019` | 1,07:1 |
| `--purple-500` | `270 91% 65%` | `#a655f7` | `#bf85f9` | 3,99:1 |
| `--purple-600` | `270 91% 57%` | `#912ef5` | `#d4acfb` | 5,37:1 |
| `--sidebar-background` | `0 0% 98%` | `#fafafa` | `#18181b` | 1,04:1 |
| `--sidebar-foreground` | `240 5.3% 26.1%` | `#3f3f46` | `#f4f4f5` | 10,44:1 |
| `--sidebar-primary` | `240 5.9% 10%` | `#18181b` | `#1d4ed8` | 17,72:1 |
| `--sidebar-primary-foreground` | `0 0% 98%` | `#fafafa` | `#ffffff` | 1,04:1 |
| `--sidebar-accent` | `240 4.8% 95.9%` | `#f4f4f5` | `#27272a` | 1,10:1 |
| `--sidebar-accent-foreground` | `240 5.9% 10%` | `#18181b` | `#f4f4f5` | 17,72:1 |
| `--sidebar-border` | `220 13% 91%` | `#e5e7eb` | `#27272a` | 1,24:1 |
| `--sidebar-ring` | `217.2 91.2% 59.8%` | `#3b82f6` | `#3b82f6` | 3,68:1 |

### Welche Tailwind-Stufen überschrieben sind

`tailwind.config.ts` nutzt `theme.extend.colors`, und `extend` mischt tief in die
Standardpalette. Überschrieben sind ausschließlich:

- `teal`: **50, 500, 600**
- `orange`: **50, 500, 600**
- `purple`: **50, 500, 600**

Alle anderen Stufen (`teal-100`…`teal-400`, `teal-700`…`teal-950` usw.) liefern
weiterhin Tailwinds Standardwerte. Praktische Folge: `teal-600` = `#178c71`
(überschrieben), `teal-700` = `#0f766e` (Tailwind-Standard). Wer die Palette in
die App überträgt, muss beide Quellen berücksichtigen, sonst entstehen Sprünge
innerhalb derselben Farbskala.

---

## 4. Marken-Verläufe

Fest im Code hinterlegt, nicht als Token abgelegt:

| Verwendung | Definition | Fundort |
|---|---|---|
| Wortmarke, Hauptüberschriften | `linear-gradient(45deg, #14b8a6, #8b5cf6, #f97316)`, animiert über 6s | `client/global.css` → `.text-gradient` |
| Primärer Button / CTA | `from-teal-500 to-purple-500` = `#1daf8d` → `#a655f7` | `client/pages/Index.tsx` |
| Hero-Zweizeiler | `from-teal-600 via-purple-600 to-orange-600` = `#178c71` → `#912ef5` → `#e05d06` | `client/pages/Index.tsx` |
| App-Icon | `#0d9488` → `#7c3aed`, horizontal | `scripts/gen-icons.mjs` |
| Glow-Effekt | `rgba(20,184,166,0.3)` → `rgba(20,184,166,0.6)` | `client/global.css` → `@keyframes fade-glow` |

Beachten: `.text-gradient` verwendet `#14b8a6` (Tailwind-Standard-`teal-500`),
während die Buttons `#1daf8d` (überschriebener Wert) verwenden. Auch das ist eine
unbeabsichtigte Abweichung innerhalb der Website.

---

## 5. Nicht-farbliche Tokens

| Token | Wert | Fundort |
|---|---|---|
| Schrift Fließtext | `Poppins`, Fallback `system-ui, sans-serif` | `tailwind.config.ts` → `fontFamily.sans` |
| Schrift Display | `Space Grotesk`, Fallback `system-ui, sans-serif` | `tailwind.config.ts` → `fontFamily.display` |
| Eckenradius Basis | `--radius: 0.5rem` (8px) | `client/global.css` |
| Radius `lg` / `md` / `sm` | `8px` / `6px` / `4px` | abgeleitet aus `--radius` |
| Container maximal | `1400px`, zentriert, `2rem` Innenabstand | `tailwind.config.ts` → `container` |
| Seitenraster | `max-w-7xl` (1280px), `px-4 sm:px-6 lg:px-8` | durchgängig in `client/pages` |
| Hintergrund PWA | `#ffffff` | `public/manifest.json` → `background_color` |

Hinweis zur Typografie: Die Mobile-App verwendet laut Repositorium bereits
**Familjen Grotesk** (SIL OFL). Die Website nutzt Poppins und Space Grotesk aus
Google Fonts. Eine Angleichung der Schriften war nicht Teil des Auftrags — die
Lizenzlage unterscheidet sich, und Familjen Grotesk wurde in der App bewusst aus
Lizenzgründen gewählt.

---

## 6. Was beim Übertragen zu prüfen ist

1. **Auf einen Türkis-Wert festlegen.** Empfehlung `#0d9488`; die Website weicht
   aktuell an drei Stellen davon ab (siehe Abschnitt 1).
2. **Kontrast nicht aus der Website übernehmen, sondern neu prüfen.** Mehrere
   Tokens liegen unter AA: `--teal-500` (2,77:1), `--orange-500` (2,85:1),
   `--purple-500` (3,99:1). Auf hellem Grund taugen sie nicht für Fließtext.
3. **Dunkelmodus.** Die `.dark`-Werte existieren vollständig, werden auf der
   Website aber nicht aktiv geschaltet (`darkMode: ["class"]`, die Klasse wird
   nirgends gesetzt). Für die App sind sie ungeprüft — vor Übernahme testen.
4. **Eine gemeinsame Quelle statt zweier Kopien.** Solange Website und App in
   getrennten Repositorien bzw. Branches liegen, ist diese Datei die Brücke.
   Liegen beide einmal in einem Workspace, gehören die Werte in ein geteiltes
   Paket (z.B. `packages/tokens`), aus dem `global.css` und das App-Theme
   generiert werden — dann entfällt der manuelle Abgleich.
