# Store-Screenshots – Anforderungen und Status

## Bestandsaufnahme (3. Aug 2026)

### Vorhandene Dateien

| Datei | Auflösung | Größe | Änderungsdatum | Screen |
|-------|-----------|-------|-------|--------|
| `01-start.png` | 1206 × 2622 px | 379 KB | 3. Aug 22:47 | Start – Tagesbriefing „Drei Entscheidungen" |
| `02-wachstum.png` | 1206 × 2622 px | 382 KB | 3. Aug 22:47 | Wachstum – „Dein Juli", KPIs, 6-Monats-Chart |
| `03-bewertungen.png` | 1206 × 2622 px | 339 KB | 3. Aug 22:47 | Bewertungen |
| `04-tische.png` | 1206 × 2622 px | 311 KB | 3. Aug 22:47 | Tische / Reservierungen |
| `05-beitraege.png` | 1206 × 2622 px | 530 KB | 3. Aug 22:47 | Beiträge |
| `06-konto.png` | 1206 × 2622 px | 391 KB | 3. Aug 22:47 | Konto |

Quelle: `docs/store/screenshots/README.md` dokumentiert, dass diese vom iPhone 16 Pro Simulator stammen.

### Anforderung (App Store)

Der App Store akzeptiert **1206 × 2622 px (iPhone 16 Pro, 6,3")** nicht als Pflicht-Set. Erforderlich ist mindestens eines von:

- **iPhone 15 Pro Max / 16 Pro Max** – 1290 × 2796 px oder 1320 × 2868 px (6,7" – 6,9")

Die aktuellen Dateien sind daher nicht submission-fertig.

---

## Was nötig wäre, um finale Screenshots zu erzeugen

### 1. Simulator-Geräte (auf dieser Maschine vorhanden)

```
xcrun simctl list devices available
```

Verfügbar für Pro-Max-Aufnahmen:
- **iPhone 16 Pro Max** `B894B0CA-55D6-47E6-A733-019EED9CBB46`
- **iPhone 14 Pro Max** `4ACA9DA2-EEA2-4B9C-B0F7-58E0622F4FDC`

Empfehlung: iPhone 16 Pro Max für maximale Kompatibilität zukunftssicher.

### 2. App starten und Screenshots aufnehmen

**Voraussetzungen:**

1. **Anmeldung braucht kein Backend, der Startbildschirm schon.** Diese Unterscheidung
   ist wichtig, und eine frühere Fassung dieser Datei hatte sie falsch:
   - Der Login (`mobile/app/login.tsx`) ruft nur lokal `signIn()` aus
     `mobile/src/lib/store.tsx` auf und leitet direkt zu `/start` weiter. Der Zustand
     ("Café Goldstück", Sofia Brandt) lebt im Speicher bzw. in AsyncStorage und wird aus
     den Design-Fixtures seed-befüllt. Supabase wird nirgends gebraucht
     (`mobile/src/lib/bootstrap.ts` bindet es nur bei gesetzter Konfiguration ein).
   - **Aber:** `mobile/src/features/start/useDailyBriefing.ts` setzt bei jedem Mount einen
     echten HTTP-Aufruf an `/briefing/today` ab. Antwortet niemand, fällt der Bildschirm
     auf Fixtures zurück **und blendet sichtbar den Hinweis ein**:
     „Beispieldaten · API nicht verbunden" (`StartScreen.tsx:200`).
     Genau dieser Bildschirm ist `01-start.png` — das erste Bild im Store-Set.
     Ohne Backend ist dieses eine Bild also unbrauchbar.

2. **Backend für `01-start.png`.** Der Endpunkt existiert inzwischen:
   `server/maitr/routes.ts` (`briefingRouter.get("/today", …)`), eingehängt unter
   `/api/maitr/briefing`. Start des Servers:
   ```bash
   npm run build:server && node dist/server/node-build.mjs
   ```
   Port kommt aus `process.env.PORT || 3000` (`server/node-build.ts:7`) — **nicht** 8080.
   Es gibt kein `server/package.json`; `cd server && npm run dev` fiele auf das
   Wurzel-Skript zurück und startete Vite auf 8081.

3. **`EXPO_PUBLIC_API_URL` setzen.** Ohne die Variable zeigt die App auf
   `http://localhost:8080/api` (`mobile/src/lib/env.ts:15`) — und auf dem Simulator
   meint `localhost` den Simulator selbst, nicht den Mac. Es braucht die LAN-IP des
   Rechners und den tatsächlichen Server-Port, der Kommentar in `env.ts:12-14` sagt das
   ausdrücklich. Beispiel: `EXPO_PUBLIC_API_URL=http://192.168.x.y:3000/api`.

4. Für die übrigen fünf Bildschirme genügt der Demomodus ohne Backend.

5. Simulator läuft: `xcrun simctl boot B894B0CA-55D6-47E6-A733-019EED9CBB46`
   (Achtung: `xcrun simctl list devices available` zeigt **zwei** Geräte namens
   „iPhone 16 Pro Max" — die UDID ist eindeutig, der Name nicht.)

**Schritte (manuell, da UI-Flows nicht skriptierbar sind):**

```bash
# 1. Simulator starten (falls noch nicht)
xcrun simctl boot B894B0CA-55D6-47E6-A733-019EED9CBB46

# 2. Mobile-App installieren und starten
cd mobile
export PATH="$HOME/.nvm/versions/node/v22.21.1/bin:$PATH"
npx expo run:ios --device B894B0CA-55D6-47E6-A733-019EED9CBB46

# 3. Screenshots aufnehmen – je einer pro Screen nach manueller Navigation
xcrun simctl io B894B0CA-55D6-47E6-A733-019EED9CBB46 screenshot docs/store/screenshots/01-start.png
xcrun simctl io B894B0CA-55D6-47E6-A733-019EED9CBB46 screenshot docs/store/screenshots/02-wachstum.png
# ... usw. für alle sechs Screens
```

Die App navigiert via Expo Router. Keine Automatisierung möglich ohne UI-Testing-Framework (detox, maestro).

### 3. Capture-Skript (noch zu erstellen)

Die README.md erwähnt ein Skript `scratchpad/capture_screens.sh`, das nicht existiert. 
Es würde folgendes tun:
- Simulator-UUID als Parameter akzeptieren
- 6× `xcrun simctl io <uuid> screenshot` aufrufen
- Dateien in `docs/store/screenshots/` speichern
- Optionaler Wert: Batch-Aufnahmen beschleunigen (< 30 Sekunden pro Satz), aber NICHT ohne manuelle UI-Navigation zwischen den Screenshots

---

## Was kann automatisiert werden; was nicht

| Aspekt | Automatisierbar? | Grund |
|--------|------------------|-------|
| **Simulator booten** | ✓ | `xcrun simctl boot` |
| **App installieren** | ✓ | `expo run:ios --device` |
| **Screenshots aufnehmen** | ✓ | `xcrun simctl io ... screenshot` |
| **UI navigieren** (z. B. Tab wechseln, scrollen) | ✗ | Keine Programm-API in Expo; erfordert detox oder maestro oder manuelle Bedienung |
| **Bildauswahl** (welche Screens, Reihenfolge) | ✗ | Geschäftsentscheidung: welche Features zeigen, wie sie wirken, Marketing-Narrative |
| **Demomodus aktivieren** | ✓ | Automatisch - `signIn()` in `mobile/src/lib/store.tsx` braucht weder Backend noch Supabase |
| **App-State sichern** | ✓ | AsyncStorage (kein Backend/Supabase im Spiel) |

**Ehrliche Einschätzung:**
- Das **Aufnehmen selbst** ist trivial (ein Shellskript).
- Der **Bottleneck** ist die **UI-Navigation**: Jede neue Bildschirm-Aufnahme erfordert manuelle Interaktion oder einen Test-Framework wie Maestro/detox. Das ist eine Investition, wenn Screenshots regelmäßig neu erzeugt werden sollen (z. B. bei jeder Version).
- Die **Reihenfolge und Auswahl** der Screens ist strategisch und braucht Mensch-Input.

---

## Nächste Schritte

**Priorisiert nach Aufwand:**

1. **Confirm Bildauswahl:** Welche Screens sind final? Reihenfolge passt für Store?  
   → Das bestimmen die Store/Marketing-Anforderungen, nicht die Technik.

2. **Screenshotting-Skript schreiben:**  
   - `scratchpad/capture_screens.sh` erstellen.
   - Parameter: Simulator-UDID, Ausgabeverzeichnis.
   - Benutzer navigiert manuell nach jedem Screenshot.
   - Alternativ: Maestro-Konfiguration für automatisierte Taps.

3. **Finale Screenshots erzeugen:**  
   - iPhone 16 Pro Max Simulator verwenden.
   - Skript ausführen (mit manuellen Nav-Pausen).
   - Dateien verifizieren (1320 × 2868 oder 1290 × 2796 px).

4. **App Store Submission:**  
   - Neue Screenshots hochladen.
   - Marketing-Text ggf. an neuen Screens anpassen.

---

## Tech-Kontext

- **App:** Expo 57, React 19.2.3
- **Start-Befehl:** `npx expo run:ios` in `mobile/` (kein `npm run build` - `mobile/package.json`
  kennt kein `build`-Skript; Expo-Skripte sind `start`, `android`, `ios`, `web`)
- **Backend:** Für diese Screenshots nicht nötig. Falls doch gebraucht (echte API statt Demo):
  Express-Server über `server/node-build.ts`, Port kommt aus `process.env.PORT || 3000` - nicht
  8080. Ein `server/package.json` existiert nicht; `cd server && npm run dev` würde auf das
  Wurzel-Skript `dev` zurückfallen, das aber `vite` (Port 8081 laut `vite.config.ts`) startet,
  nicht die Express-API.
- **Demo-Daten:** "Café Goldstück" / Sofia Brandt, fest verdrahtet in `mobile/src/lib/store.tsx`
  (`DEMO_USER`) und aus den Design-Fixtures seed-befüllt - kein Supabase, kein Backend.
  `bootstrapCore()` (`mobile/src/lib/bootstrap.ts`) konfiguriert nur `@maitr/core` für den Fall,
  dass ein Screen später echte API-Calls macht; für die sechs Screenshot-Screens passiert das
  nicht.
