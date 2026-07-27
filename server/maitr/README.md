# Maitr Backend (`server/maitr`)

Das venue-zentrierte API-Modul für die Maitr-App. Es bedient den Vertrag aus
`@maitr/core/api` (`/briefing/today`, `/reservations`, `/venues`, `/integrations`)
und läuft **im bestehenden Express-Server** mit — es teilt sich Clerk-Auth, Prisma,
Rate-Limiting, CORS (bereits auf `maitr.de` beschränkt) und den Netlify-Deploy.

## Prinzip: Analytik „write once"

Der Server **rechnet nicht selbst**. Er assembliert aus der DB ein `VenueDataset`
(`dataset.ts`) und ruft dieselben reinen Funktionen aus `@maitr/core/analytics`
(`buildInsights`, `presenceScore`, `reservationRoi`) wie die Demo-App. Kein doppelter
Code, kein Auseinanderlaufen von Client- und Server-Ergebnis.

## Sicherheit (eingebaut)

- **Mandantentrennung:** `requireVenueAccess` (`middleware.ts`) prüft jede venue-
  scoped Route gegen `BusinessMember` — ein client-geliefertes `venueId` allein
  genügt nie. Verhindert Cross-Tenant-Leaks.
- **Token-Verschlüsselung at rest:** OAuth-Tokens werden mit AES-256-GCM
  verschlüsselt gespeichert (`security.ts` · `encryptToken`), nie im Klartext.
- **OAuth-CSRF:** signierter, kurzlebiger `state` (HMAC), im Callback geprüft.
- **Webhook-Verifikation:** Meta `X-Hub-Signature-256` (HMAC-SHA256) + Verify-Token.
- **Eingabevalidierung:** Zod an jeder schreibenden Route.
- **Kein Token im Client/Redirect:** Code-gegen-Token-Tausch rein serverseitig
  (confidential client mit `client_secret`); Callback leitet nur per Deep-Link zurück.

## Endpunkte

| Methode | Pfad | Auth |
|---|---|---|
| GET | `/venues` | Clerk |
| GET | `/venues/:slug/public` | — |
| GET | `/briefing/today?venueId` | Clerk + Venue |
| GET | `/reservations/day?venueId&date` | Clerk + Venue |
| POST | `/reservations` | Clerk + Venue |
| GET | `/integrations?venueId` | Clerk + Venue |
| GET | `/integrations/:provider/connect?venueId` | Clerk + Venue |
| GET | `/integrations/:provider/callback` | signierter `state` |
| GET/POST | `/webhooks/meta` | Verify-Token / HMAC |

## In 3 Schritten starten

1. **Env setzen** — `cp server/maitr/.env.example .env` und ausfüllen
   (`openssl rand -hex 32` für den Encryption-Key). Zugriff bei Google/Meta ist
   separat zu beantragen, siehe `docs/integrations/GOOGLE_META_API_ACCESS.md`.

2. **DB migrieren** — die neuen Modelle (`MaitrGuest`, `MaitrReview`,
   `MaitrEngagementPoint`, `ChannelConnection`, `InsightsCache`) stehen bereits in
   `prisma/schema.prisma`:
   ```bash
   npx prisma migrate dev --name maitr_presence
   ```

3. **Router mounten** — in `server/routes/index.ts`:
   ```ts
   import { maitrRouter } from "../maitr";
   apiRouter.use("/maitr", maitrRouter);
   ```
   Den Meta-Webhook **vor** `app.use(express.json())` in `server/index.ts`
   registrieren (Rohbody für die HMAC-Prüfung):
   ```ts
   import { registerMaitrWebhooks } from "./maitr";
   registerMaitrWebhooks(app); // vor express.json()
   ```
   Und in `vite.config.server.ts` den Alias ergänzen, damit der Server-Build
   `@maitr/core` auflöst:
   ```ts
   resolve: { alias: {
     "@maitr/core": path.resolve(__dirname, "packages/core/src"),
   } }
   ```
   Die Mobile-App zeigt dann per `configureCore({ apiBaseUrl: "https://…/api/maitr", getAuthToken })`
   auf dieses Backend; ohne Config bleibt sie im Demo-Modus (Fixtures).

## Sync (Scheduled Function)

`sync.ts` exportiert `syncAll()` — als Netlify Scheduled Function / cron aufrufen:
zieht pro aktiver `ChannelConnection` Bewertungen + Reichweite (idempotent) und
baut danach den `InsightsCache` neu.

## Typecheck (isoliert)

```bash
cd server/maitr && npx tsc -p tsconfig.json --noEmit
```
(setzt `npx prisma generate` voraus, damit der Client die neuen Modelle kennt.)
