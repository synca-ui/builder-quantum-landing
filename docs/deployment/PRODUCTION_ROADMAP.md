# Maitr — Gesamt-Fahrplan „produktiv"

_Stand: 26.07.2026 · Master-Plan, der die bestehenden Runbooks in eine priorisierte
Reihenfolge bringt. Verweist auf Detail-Docs statt sie zu wiederholen._

## Wo wir stehen

- **App:** voll funktionierende Demo (`mobile/`, Expo SDK 57), läuft offline aus
  `AsyncStorage` + Fixtures. Läuft nativ auf dem physischen iPhone (Free-Team-Signing,
  7-Tage-Limit). Siehe Memory `maitr-native-build`.
- **Backend:** existiert (`server/maitr/`, `@maitr/core`), ist aber **nicht live**
  (3 Wiring-Schritte + `prisma migrate` offen; App ruft das API noch nicht).
- **Store-Config:** `eas.json` + `app.json` (v1.0.0) fertig, `expo-doctor` 18/18 grün,
  Icon 1024² ohne Alpha. Runbook: `docs/deployment/APP_STORE_SUBMISSION.md`.

„Produktiv" hat **zwei unabhängige Dimensionen**, die man getrennt takten kann:

- **Weg A — Distribution:** Wie kommt die App zu Nutzern? (TestFlight → App Store → Play)
- **Weg B — Echte Daten & Funktionen:** Aus der Demo ein echtes Produkt (Backend, echte
  Integrationen, Zahlung, DSGVO).

## Die eine Weichenstellung, die alles bestimmt

**Wie viel echte Funktion muss vor dem *öffentlichen* Store-Release stehen?**
Apple prüft „Minimum Functionality" (Richtlinie 2.1 / 4.2). Die App zeigt heute
Beispieldaten, Login ist ein Demo-Toggle, „Freigeben"/„Senden"/Zahlung tun nichts Echtes.

- **TestFlight** (interne + externe Tester): Demo ist **ok** — schnellster Weg auf echte
  Geräte. Nur der Apple-Developer-Beitritt nötig.
- **Öffentlicher App Store:** reine Demo → **hohes Ablehnungsrisiko**. Es braucht
  entweder (a) echte Kernfunktion (Weg B) **oder** (b) eine ehrliche Positionierung als
  Offline-/Planungs-App mit entschärften Zahlungs-Claims. → Entscheidung in Phase 2.

---

## Phasen (empfohlene Reihenfolge)

### ✅ Phase 0 — Lokal lauffähig _(erledigt)_
Device-Build + Signing + Leerzeichen-Pfad-Fixes (Config-Plugins, selbstheilend),
UI-Feinschliff (Start-Kacseln: Icon + klare Labels, 4,8 konsistent).

### Phase 1 — TestFlight (Weg A, minimal) · **schnellster echter Fortschritt**
Ziel: App per TestFlight auf beliebige Testgeräte, ohne öffentliche Review.

| Schritt | Wer | Aufwand |
|---|---|---|
| Apple Developer Program beitreten (99 $/Jahr) | **du** | ~1 Tag Freischaltung |
| `eas login` + `eas init` (schreibt projectId/owner in app.json) | du (1 Befehl) | 5 Min |
| EAS **aus dem Repo-Root** bauen (Monorepo-Fallstrick, s. u.) | ich richte ein | — |
| `eas build --profile production -p ios` | du startest | ~20–40 Min Cloud |
| App-Datensatz in App Store Connect anlegen (Bundle `app.maitr.mobile`) | **du** | 15 Min |
| `eas submit --profile production -p ios` → TestFlight | du startest | ~15 Min |
| Tester einladen (E-Mail) | du | 10 Min |

**Blocker:** nur der bezahlte Apple-Account. **Kosten:** 99 $/Jahr. EAS-Free-Tier reicht
zum Start. **Was ich vorbereite:** EAS-Root-Build verifizieren, `eas.json` härten,
Build-Profile testen (soweit ohne Account möglich).

### Phase 2 — Entscheidungen & Recht _(vor öffentlichem Release, parallel zu Phase 1)_
Zwei Blocker aus `maitr-store-readiness`:
1. **Schrift-Lizenz PPFrama** (Pangram Pangram, kommerziell). App-Embedding braucht eine
   Lizenz **oder** Umstieg auf eine offene Grotesk (kostenlos). → Kostenentscheidung.
2. **Minimum-Functionality-Positionierung** (die Weichenstellung oben): Offline-App vs.
   echtes Backend. Bestimmt, ob Phase 3–5 vor dem Store nötig sind.
3. Bei echten Accounts: **In-App-Kontolöschung** (Apple 5.1.1v) ist Pflicht.

### Phase 3 — Backend live (Weg B, Fundament)
Aus Memory `maitr-backend` — 3 Wiring-Schritte + Migration:
- `apiRouter.use("/maitr", maitrRouter)`,
- `@maitr/core`-Alias in `vite.config.server.ts`,
- `registerMaitrWebhooks(app)` **vor** `express.json` in `server/index.ts`,
- `prisma migrate` gegen die DB.
Dann App anbinden: `configureCore({ apiBaseUrl })` + `useVenueDataset` auf echte Daten
(EAS-Prod-URL steht schon: `https://maitr.de/api/maitr`).
**Aufwand:** mittel; Detail in `server/maitr/README.md` + `docs/deployment/PRODUCTION_DEPLOYMENT_GUIDE.md`.

### Phase 4 — Echte Integrationen
- **Google Business / Meta** OAuth live (echte Bewertungen/Reichweite) —
  `docs/integrations/GOOGLE_META_API_ACCESS.md`. ⚠️ Google/Meta-App-Review kann Wochen dauern → **früh beantragen**.
- **Echtes Senden** (Google-Antworten, WhatsApp) statt In-Memory-Belege.
- **Stripe-Checkout** statt reinem `currentPlan`-Toggle — `docs/integrations/STRIPE_SETUP.md`.

### Phase 5 — DSGVO / Compliance
Consent für Gäste-PII, Retention/Erasure, Token-Revoke bei Disconnect, `expo-secure-store`
für Auth-Token (statt AsyncStorage), RBAC. Offene Punkte aus dem Security-Audit
(`maitr-backend`, `docs/audits/`).

### Phase 6 — Öffentlicher Launch
App Store Review einreichen (Screenshots **fehlen noch** → müssen erstellt werden),
danach **Google Play** analog (25 $ einmalig, `android`-Config steht schon).

---

## Kritischer Pfad (Empfehlung)

```
Phase 1 (TestFlight)  ──►  echte Tester, sofort
        │
        ├─ parallel: Phase 2 (Entscheidungen) + Google/Meta-Review früh beantragen
        │
        ▼
Phase 3 → 4 → 5 (Backend + Integrationen + DSGVO)   ──►  Phase 6 (öffentlicher Store)
```

**Sofort möglich (ohne Kosten/Accounts):** EAS-Root-Build absichern (Phase-1-Vorbereitung),
Store-Screenshots erzeugen, Font-Entscheidung vorbereiten (offene Alternative ein­bauen).

## Kosten-Überblick
| Posten | Kosten |
|---|---|
| Apple Developer Program | 99 $/Jahr |
| Google Play | 25 $ einmalig |
| EAS Build | Free-Tier zum Start; später ggf. Abo |
| PPFrama-Lizenz | variabel (oder 0 $ mit offener Schrift) |
| Google/Meta/Stripe | nutzungsabhängig |

## Monorepo-Fallstrick (wichtig für EAS)
`@maitr/core` liegt in `packages/core` **außerhalb** von `mobile/` und wird per
Custom-Metro-Resolver gebündelt. EAS muss deshalb **aus dem Git-Repo-Root** bauen, nicht
nur aus `mobile/`. Vor dem ersten Cloud-Build verifizieren.

## Phase-1-Prep — Status (26.07.2026)

Erledigt, ohne Accounts/Kosten:

- **EAS-Bündelung verifiziert.** `npx expo export -p ios` erzeugt ein sauberes
  iOS-Bundle (4,7 MB Hermes) — `@maitr/core` wird über den Custom-Metro-Resolver
  korrekt mitgebündelt. Der EAS-Bundle-Schritt nutzt denselben Metro und wird
  funktionieren.
  - ⚠️ **Echter EAS-Blocker #1: Das Projekt ist nicht committet.** `git status` zeigt
    `mobile/` und `packages/` als **untracked** (`??`). EAS Build lädt nur getrackte
    Dateien hoch → ohne Commit hätte EAS nichts zu bauen. **Vor dem ersten `eas build`:
    `mobile/` UND `packages/` committen.**
  - ⚠️ **Blocker #2: Monorepo.** `@maitr/core` liegt außerhalb `mobile/`. EAS muss aus
    dem **Repo-Root** bauen, damit `packages/core` im Upload ist (nicht nur `mobile/`).
- **Store-Screenshots (Entwürfe).** 6 Screens in `docs/store/screenshots/` (1206×2622,
  iPhone 16 Pro). **Noch nicht submission-fertig** — Apple braucht 6,9" (1320×2868) oder
  6,7" (1290×2796); dafür auf einem Pro-Max-Simulator neu aufnehmen. Details:
  `docs/store/screenshots/README.md`.
- **Font-Alternative eingebaut.** Schalter `EXPO_PUBLIC_BRAND_FONT=off` (`mobile/.env`)
  liefert die App mit der lizenzfreien System-Grotesk aus statt der lizenzpflichtigen
  PP Frama — ein Wort, kein Code-Umbau (`src/theme/fonts.ts` → `BRAND_FONT_ENABLED`).
  Für eine spezifische offene Grotesk (Inter/Manrope/Space Grotesk, OFL): `.ttf` in
  `assets/fonts/`, in `fontAssets` + `typography.ts` eintragen.

## Verwandte Docs
- `docs/deployment/APP_STORE_SUBMISSION.md` — Submit-Runbook
- `docs/deployment/PRODUCTION_DEPLOYMENT_GUIDE.md` — Backend-Deployment
- `docs/product/APP_STORE_METADATA.md` — Store-Texte
- `docs/integrations/GOOGLE_META_API_ACCESS.md`, `STRIPE_SETUP.md`
- `docs/legal/PRIVACY.md` · `docs/audits/CTO_AUDIT_2026.md`
