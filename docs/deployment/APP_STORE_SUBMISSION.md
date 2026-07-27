# Maitr — App-Store-Einreichung (Runbook)

Stand: v1.0.0. Die App ist so weit aufgebaut, dass nur noch die **konto-gebundenen
Schritte** (Apple/Google, Mensch) fehlen. Dieses Dokument ist die Checkliste.

Build-Workflow: **Expo CNG / EAS Build** (`ios/`, `android/` sind gitignored und werden
per Prebuild erzeugt). Repo-Pfad hat ein Leerzeichen — lokal deckt das
`plugins/withSpacePathFix.js` ab; auf EAS-Servern ist der Fix ein harmloser No-Op.

## ✅ Bereits erledigt (Code/Config)

- `mobile/eas.json` — Build-Profile `development` / `preview` / `production`
  (`appVersionSource: remote` + `autoIncrement` → EAS zählt Build-Nummern selbst hoch).
- `mobile/app.json` — `version 1.0.0`, `ios.buildNumber 1`, `android.versionCode 1`,
  `ios.infoPlist.ITSAppUsesNonExemptEncryption=false` (spart die Export-Compliance-Frage),
  `android.permissions: []` (nur INTERNET bleibt → sauberes Play-„Data safety").
- **Keine** Permission-Usage-Strings — verifiziert: keine Kamera/Standort/Kontakte/
  Benachrichtigungen im Code. (Unbegründete Permissions = App-Review-Reject; bewusst weggelassen.)
- Icon `assets/icon.png` = 1024×1024, **ohne Alpha** (iOS-konform). Splash + Adaptive-Icons vorhanden.
- Store-Metadaten-Entwurf → `docs/product/APP_STORE_METADATA.md`.
- Datenschutzerklärung (Entwurf) → `docs/legal/PRIVACY.md` (muss öffentlich gehostet werden).

## 👤 Nur mit Konto (Mensch)

**Apple:**
1. Apple Developer Program (99 $/Jahr).
2. `eas login` → `eas init` (schreibt `extra.eas.projectId` + `owner` in `app.json`).
3. App in App Store Connect anlegen, Bundle-ID `app.maitr.mobile` registrieren.
4. `eas build --platform ios --profile production` (Signing erzeugt EAS automatisch).
5. `eas submit --platform ios` → TestFlight → Review.
6. In App Store Connect: App-Privacy-Label, Altersfreigabe **4+**, Preis (kostenlos),
   Screenshots (6,7″ iPhone Pflicht). Export-Compliance ist vorbeantwortet.

**Google:**
1. Play Developer Account (25 $ einmalig) + Identitätsprüfung (kann Tage dauern).
2. Service-Account-JSON für `eas submit` hinterlegen.
3. `eas build -p android --profile production` (AAB) → `eas submit -p android`.
4. Data-Safety-Formular, Content-Rating, Zielgruppe, Datenschutz-URL, interne Testspur.

## ⚠️ Muss vor Release entschieden werden (nicht rein technisch)

1. **Schrift-Lizenz (rechtlicher Blocker).** `PPFrama*` (Pangram Pangram) ist kommerziell
   und wird in die App eingebettet. Das braucht eine App-Embedding-Lizenz — eine
   Desktop-Lizenz deckt das i. d. R. nicht. **Vor Release Lizenz klären oder Schrift durch
   eine offene Grotesk ersetzen** (nur `theme/typography` + `app.json expo-font` betroffen).
2. **„Minimum Functionality" (Apple 2.1 / 4.2).** Die App läuft heute eigenständig aus
   AsyncStorage + Fixtures (kein Live-Backend, Login ist ein Demo-Toggle). Für die
   Einreichung entweder (a) klar als eigenständige Offline-App positionieren und die
   „Abrechnung über Clerk & Stripe"-Texte entschärfen, oder (b) das Backend (`server/maitr`)
   live schalten + echte Anmeldung. Ein reiner Demo-Build mit Zahlungsversprechen riskiert
   Ablehnung. → Für den Pilot: Prod-`EXPO_PUBLIC_API_URL` (HTTPS) im `production`-Profil setzen.
3. **In-App-Kontolöschung (Apple 5.1.1v)** wird Pflicht, sobald echte Account-Erstellung (Clerk) live ist.

## 🔧 Vor dem ersten Cloud-Build prüfen

- `npx expo-doctor` grün + `npx expo install --check` (SDK-57-Versionsabgleich).
- **Monorepo:** `@maitr/core` liegt in `packages/core` (außerhalb `mobile/`) und wird per
  Custom-Metro-Resolver gebündelt. EAS muss `packages/core` mit hochladen → aus dem
  **Git-Repo-Root** bauen, nicht nur `mobile/` archivieren. Vorab lokal `npx expo export`
  gegenprüfen (tut der Kern-Resolver auch ohne Watcher).
- Nach `expo prebuild`: `PrivacyInfo.xcprivacy` vorhanden (AsyncStorage nutzt UserDefaults,
  Required-Reason-API) und ein echter **Release**-Build (nicht Dev-Client) auf Gerät testen
  (New Architecture).
