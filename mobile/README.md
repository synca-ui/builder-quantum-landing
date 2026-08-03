# Maitr Mobile

Eigenständige Expo-/React-Native-App im selben Repository wie der Web-Generator.
Sie hat ein eigenes `package.json`, eigenes `node_modules` und eigene Build-Kette –
es gibt keine gemeinsamen Build-Skripte mit `/client`.

## Start

```bash
cd mobile
cp .env.example .env
npm install
npx expo start
```

Danach `i` für den iOS-Simulator, `a` für Android oder den QR-Code mit Expo Go scannen.

Auf einem echten Gerät zeigt `localhost` nicht auf den Mac – dann in `.env` die LAN-IP
eintragen (`EXPO_PUBLIC_API_URL=http://192.168.x.y:8080/api`).

## Struktur

```
mobile/
  app/                    Routen (expo-router, dateibasiert)
    _layout.tsx           Fonts, Theme, Core-Bootstrap, Stack
    (tabs)/               Die fünf Bereiche der Tabbar
      start.tsx           04 · Start (16 · Nachtbar als Abendfassung)
      tische.tsx          05–07 · Reservierung, drei Tageszustände
      beitraege.tsx       08
      wachstum.tsx        09
      konto.tsx           12
      profil-check.tsx    10 · in der Gruppe, aber nicht in der Leiste
      kanaele.tsx         11 · dito
      bewertungen.tsx     13 · dito
    login.tsx             01
    onboarding.tsx        15
    aufgabe/[id].tsx      14, modal
    gast/                 02 · 03 · 17
    journey/              18–25, die siebenteilige Anbindung
    demo.tsx              Verzeichnis aller Screens zum Vorführen
  src/
    theme/                Design-Tokens: Farben, Typografie, Abstände, Schatten
    components/ui/        Primitive: Screen, Card, PillButton, Chip, ListCard,
                          Timeline, Toggle, Progress, DataDisplay, Media, Hatch
    components/           Zusammengesetzt: MaitrTabBar, MaitrWordmark, icons
    features/<domäne>/    Screen-Logik und ihre Bausteine
    lib/                  Plattform-Adapter: env, auth, supabase, bootstrap,
                          appearance (Nachtbar-Modus)
  assets/fonts/           PP Frama (Display) und PP Frama Text (Fließtext)
```

**Trennlinie:** `app/` enthält nur Routing – jeder Screen ist ein Einzeiler, der aus
`src/features/` importiert. Damit hängt die Bildschirmlogik nicht am Router und lässt
sich isoliert testen.

## Vorführen

`/demo` listet alle 25 Screens gruppiert wie im Design-Dokument, jeder einen Tap
entfernt. In der App führt der Weg über **Konto → Alle Screens · Demo**; im Browser
direkt über `http://localhost:8082/demo`.

Drei Screens sind Zustände, keine eigenen Routen:

| Screen | Wie erreichbar |
| --- | --- |
| 06 · Ausgebucht | Im Tische-Screen ein Datum weiter |
| 07 · Leerer Tag | Zwei Daten weiter |
| 16 · Nachtbar | Nachtbar-Schalter im Konto oder im Demo-Verzeichnis |

## Geteilte Logik

Alles, was Web und Mobile gemeinsam haben, liegt in [`../packages/core`](../packages/core):
API-Aufrufe, Domain-Typen, der Auth-Vertrag und der Supabase-Zugriff.

Das Paket kennt keine Plattform. Storage, Auth-Token, API-Adresse und der
Supabase-Client werden ihm beim Start übergeben – siehe `src/lib/bootstrap.ts`.
Metro bündelt die TypeScript-Quellen direkt (`metro.config.js`), es gibt keinen
Build-Schritt.

```ts
import { api } from "@maitr/core";

const briefing = await api.briefing.today(venueId);
```

## Design

Die Screens kommen aus dem Claude-Design-Projekt
(`Maitr App-Screens.dc.html`, 25 Screens). Übersetzt wird nach nativen Komponenten,
nicht nach CSS: Die HSL-CSS-Variablen aus `client/global.css` liegen hier als flache
Hex-Tokens in `src/theme/colors.ts`, `em`-Laufweiten sind in Punkte umgerechnet.

Alle 25 Screens sind gebaut. Zwei bewusste Abweichungen vom Design-Dokument:

- **Keine Tabbar in der Journey.** Das Dokument zeigt sie auf jedem Artboard, weil dort
  dieselbe Komponente eingebettet ist. Während der Einrichtung gibt es aber nichts zu
  wechseln, und eine nicht bedienbare Leiste führt in die Irre.
- **Pfeile sind echte Tap-Flächen.** Im Dokument sind `‹ ›` Teil des Textes; hier sind
  es Buttons mit Screenreader-Label, sonst gäbe es nichts zum Antippen.

Die Screens arbeiten auf Design-Fixtures (`src/features/*/fixtures.ts`, im Start-Screen
sichtbar als „Beispieldaten · API nicht verbunden"). Sobald die Endpunkte stehen,
ersetzt `@maitr/core` sie Stück für Stück.

## Schriftlizenz

`assets/fonts/` enthält PP Frama in der Fassung **Free for Personal Use**
(Pangram Pangram). Für einen kommerziellen Release muss eine Lizenz erworben und
die Dateien ersetzt werden; die Dateinamen können bleiben.

## Befehle

| Befehl | Zweck |
| --- | --- |
| `npx expo start` | Dev-Server |
| `npm run typecheck` | TypeScript über App **und** `packages/core` |
| `npx expo export --platform ios` | Bundle bauen, ohne Xcode |
| `npx expo-doctor` | Versionskonflikte im SDK prüfen |
