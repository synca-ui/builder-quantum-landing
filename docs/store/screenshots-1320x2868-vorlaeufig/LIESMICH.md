# Vorläufige Screenshots — NICHT einreichbar

Aufgenommen am 04.08.2026 auf iPhone 16 Pro Max (UDID
`233AE651-D95A-40DC-8E86-DF16F400D8FC`, iOS 18.1) aus einem **Dev-Client-Build**.

**Auflösung: 1320 × 2868** — das ist die von Apple geforderte 6,9″-Größe. Die
Aufnahmen unter `../screenshots/` sind 1206 × 2622 (6,3″) und damit falsch.

## Warum sie trotzdem nicht eingereicht werden dürfen

1. **Der Expo-Zahnrad-Knopf klebt oben rechts in jeder Aufnahme.** Das ist der
   Werkzeug-Knopf des Dev-Clients, kein Teil der App. Er verschwindet nicht durch
   Zuschneiden — er gehört in einem Release-Build gar nicht erst dorthin.
   Nötig ist ein Build ohne `expo-dev-client`, also ein `preview`- oder
   `production`-Profil aus `eas.json`.

2. **Der Konto-Bildschirm zeigt ein aktives Abo für 29 €/Monat, eine VISA-Karte
   und zwei bezahlte Rechnungen.** Die Abrechnung ist derzeit eine Attrappe:
   `server/routes/subscriptions.ts` gibt beim Checkout `success: true` und
   `checkoutUrl: null` zurück, `handleStripeWebhook` hat keinen Aufrufer. Apple
   prüft Screenshots gegen die tatsächliche Funktion; ein vorgetäuschtes
   Abonnement im Bildmaterial ist ein vermeidbarer Ablehnungsgrund.
   Entweder die Abrechnung wird echt, oder dieser Bildschirm gehört nicht ins Set.

3. Alle Inhalte sind Demodaten („Café Goldstück", Sofia Brandt). Das ist für
   Store-Screenshots zulässig und üblich — aber es sollte eine bewusste
   Entscheidung sein, keine Nebenwirkung des fehlenden Backends.

## Was das Set abdeckt

| Datei | Bildschirm |
|---|---|
| `01-start.png` | Start — die drei Entscheidungen des Tages |
| `02-bewertungen.png` | Bewertungen mit Antwortvorschlag |
| `03-beitraege.png` | Beiträge |
| `04-wachstum.png` | Wachstum |
| `05-konto.png` | Konto *(siehe Punkt 2)* |

Der frühere Bildschirm „Tische" ist entfallen — die Tab-Leiste führt seit
`482fe6a` Bewertungen an seiner Stelle. `../screenshots/04-tische.png` zeigt
damit einen Bereich, den es nicht mehr gibt.

## So entsteht das endgültige Set

```bash
cd mobile
eas build --profile preview --platform ios --local   # ohne dev-client
xcrun simctl install 233AE651-D95A-40DC-8E86-DF16F400D8FC <pfad>.app
xcrun simctl launch 233AE651-D95A-40DC-8E86-DF16F400D8FC app.maitr.mobile
xcrun simctl io 233AE651-D95A-40DC-8E86-DF16F400D8FC screenshot 01-start.png
```

Die Navigation zwischen den Bildschirmen ist nicht skriptierbar — die Tab-Leiste
liegt bei y ≈ 903 pt, die fünf Symbole bei x ≈ 63 / 141 / 220 / 299 / 377 pt.
