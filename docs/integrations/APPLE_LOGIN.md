# Anmeldung mit Apple — Web und App

Stand 15. September 2026, gemessen statt geraten. Apple ist in der
Clerk-Instanz `clerk.maitr.de` aktiv; der Code für Web und App steht. Es fehlt
**ein** Handgriff im Clerk-Dashboard, damit auch der native Dialog der iOS-App
durchläuft.

## Was heute geht

| Weg | Stand |
|---|---|
| Web, `maitr.de/login` und `/signup` | Knopf „Apple“ ist da und führt zu `appleid.apple.com` mit „Verwende deinen Apple Account, um dich bei „Maitr“ anzumelden“. Services-ID und Return-URL stimmen also (15.9. im Browser geprüft). |
| App auf iOS, nativer Dialog | Dialog erscheint, Apple stellt das Token aus, Clerk weist es ab: `You are not authorized to perform this request`. Ursache: die Bundle-ID ist in Clerk nicht als native App registriert (siehe unten). |
| App auf iOS, Rückfall | Genau bei dieser Ablehnung öffnet derselbe Knopf den Browser-Weg (`useSSO`, `oauth_apple`), die Anmeldung gelingt. Ein Abbruch im Dialog bleibt ein Abbruch, da öffnet sich kein Safari. |
| App auf Android | Seit 15.9. derselbe Knopf, direkt über den Browser. Vorher gab es Apple dort gar nicht. |

Woran man den Rückfall erkennt: In der Metro- oder Xcode-Konsole steht
`[login] Nativer Apple-Weg abgelehnt (Bundle-ID fehlt in Clerk) - weiche auf den Browser aus`.
Sobald die Zeile ausbleibt, läuft der native Weg.

## Was im Code steht — hier ist nichts mehr zu tun

**Web.** `client/pages/Login.tsx` und `client/pages/Signup.tsx` binden Clerks
`<SignIn>`/`<SignUp>` ein. Die zeigen jeden Anbieter, der in der Instanz
aktiv ist; `GET https://clerk.maitr.de/v1/environment` liefert
`oauth_apple.enabled: true`. Die Route `/login/*` in `client/App.tsx` fängt den
`sso-callback` nach der Rückkehr von Apple. Es gibt keinen Apple-spezifischen
Code im Web, und es braucht keinen.

**App.** `mobile/app/login.tsx`, Komponente `AppleKnopf`: auf iOS zuerst
`useSignInWithApple()` (nativ, Face ID), bei Clerks „not authorized“ Rückfall
auf `useSSO().startSSOFlow({ strategy: "oauth_apple" })`; auf allen anderen
Plattformen direkt der Browser-Weg. Dazu gehören `expo-apple-authentication`
und `expo-crypto` in `mobile/package.json`, der Plugin-Eintrag in
`mobile/app.json` und das Entitlement `com.apple.developer.applesignin` in
`mobile/ios/Maitr/Maitr.entitlements`. Beide Wege enden in derselben
Clerk-Sitzung.

**Server.** `server/utils/clerk.ts`, `getOrCreateUser`: legt das Konto aus
`clerkId` und E-Mail an, holt die Adresse notfalls bei Clerk nach.
Apple-Relay-Adressen (`…@privaterelay.appleid.com`, „E-Mail verbergen“) sind
gewöhnliche, eindeutige Adressen und brauchen keine Sonderbehandlung. Apple-IDs
ohne E-Mail (kommt laut Clerk in China und Indien vor) scheitern mit
`Cannot create user without email`; die Instanz verlangt die Adresse aber
ohnehin beim Registrieren (`email_address.required: true`), Clerk fragt sie
dann nach.

## Der fehlende Schritt: iOS-App in Clerk registrieren

Das native Token trägt im Feld `aud` die **Bundle-ID** (`app.maitr.mobile`),
das Browser-Token die **Services-ID**. Clerk prüft `aud` gegen die Clients,
die es kennt. Die Services-ID ist eingetragen (deshalb läuft das Web), die
Bundle-ID nicht.

1. [dashboard.clerk.com](https://dashboard.clerk.com/~/native-applications) →
   Anwendung Maitr → Instanz **Production** → **Native applications**.
2. **iOS → Add application**:
   - **App ID Prefix** (die Team-ID): `3MX55UN8BD`. Das ist das Team, mit dem
     `mobile/ios/Maitr.xcodeproj` signiert (`DEVELOPMENT_TEAM`). Am 15.9. in
     der Developer-Konsole bestätigt: Das Konto zeigt oben rechts
     „Julian Heinrich - 3MX55UN8BD“. Das kostenlose Personal Team
     `Y9JZ2K33PM` aus `mobile/plugins/withLocalSigningTeam.js` ist es **nicht**.
   - **Bundle ID**: `app.maitr.mobile`.
3. Speichern. Kein Build, kein Deploy: Der Knopf versucht bei jedem Tippen
   zuerst den nativen Weg und braucht den Rückfall dann nicht mehr.

Das geht nur im Dashboard. Geprüft am 15.9.: Die Clerk-CLI
(`npx clerk@latest`) verlangt für `config patch` ein Browser-Login
(`clerk auth login`), und die Backend-API (`clerk api ls`) hat keinen
Endpunkt für native Anwendungen.

## Zwei Dinge, die man dabei gleich prüft

**„E-Mail verbergen“ muss zustellbar sein.** Erledigt am 15.9.: Die
Bounce-Adresse von Clerk ist bei Apple als Email Source eingetragen. Wer bei
Apple seine Adresse
verbirgt, bekommt eine Relay-Adresse. Apple stellt Post dorthin nur zu, wenn
der Absender registriert ist: [developer.apple.com](https://developer.apple.com/account/resources/services/list)
→ Services → **Sign in with Apple for Email Communication** → Email Sources.
Dort gehört die Adresse hinein, die Clerk in den Einstellungen der
Apple-Verbindung als „Email Source for Apple Private Email Relay“ zeigt. Fehlt
sie, kommen Clerks Einmalcodes bei diesen Nutzern nie an, und der
Code-Weg im Login ist für sie tot.

**Capability auf der App-ID.** Die App-ID `app.maitr.mobile` braucht in der
Developer-Konsole „Sign in with Apple“. EAS Build gleicht Capabilities beim
Bauen mit dem Entitlement ab, ein TestFlight-Build hat also bereits dafür
gesorgt. Personal Teams unterstützen diese Capability nicht — ein lokaler
Gerätebuild mit `Y9JZ2K33PM` kann daran scheitern; dann liegt es nicht am Code.

## Prüfen, dass es läuft

- **Web:** `/login` → „Apple“ → Apple-Seite mit „bei „Maitr“ anmelden“. Kein
  `invalid_client`, kein `invalid_request`. Nach der Anmeldung landet man auf
  `/` (`fallbackRedirectUrl`).
- **App (iOS):** Login → „Weiter mit Apple“ → Systemdialog → Face ID → direkt
  angemeldet, **ohne** Safari-Sheet. In der Konsole keine Zeile
  `[login] Nativer Apple-Weg abgelehnt …`.
- **Nachher:** Clerk-Dashboard → Users zeigt das Konto mit Apple-Verknüpfung;
  in der Datenbank steht eine `User`-Zeile mit `clerkId` und E-Mail
  (`[Lazy Sync] Creating new user` in den Railway-Logs).
