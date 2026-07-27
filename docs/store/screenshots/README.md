# Store-Screenshots

_Erzeugt am 26.07.2026 aus dem iOS-Simulator (iPhone 16 Pro), Demo-Betrieb „Café Goldstück"._

| Datei | Screen |
|---|---|
| `01-start.png` | Start – Tagesbriefing „Drei Entscheidungen" |
| `02-wachstum.png` | Wachstum – „Dein Juli", KPIs, 6-Monats-Chart, „gespart"-Panel |
| `03-bewertungen.png` | Bewertungen |
| `04-tische.png` | Tische / Reservierungen |
| `05-beitraege.png` | Beiträge |
| `06-konto.png` | Konto |

## ⚠️ Status: ENTWÜRFE, noch nicht submission-fertig

Auflösung dieser Dateien: **1206 × 2622 px** (iPhone 16 Pro, 6,3"). Der App Store
**akzeptiert diese Größe nicht** als Pflicht-Set. Erforderlich ist mindestens **eines** von:

- **6,9"** – 1320 × 2868 px (iPhone 16 Pro Max) — empfohlen, deckt am meisten ab
- **6,7"** – 1290 × 2796 px (iPhone 15 Pro Max)

### So entstehen die finalen Dateien
Denselben Aufnahme-Weg auf einem **iPhone 16 Pro Max / 15 Pro Max Simulator** wiederholen:
1. Max-Simulator booten, App darauf installieren (`expo run:ios --device <max-udid>`),
2. `xcrun simctl io <udid> screenshot <pfad>` je Screen (Skript:
   `scratchpad/capture_screens.sh` analog anpassen).

Diese Entwürfe eignen sich schon jetzt für Marketing/Previews und um die Bildauswahl
(welche Screens, welche Reihenfolge) festzulegen.
