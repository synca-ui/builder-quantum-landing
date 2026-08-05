/**
 * Umgebungsvariablen der Mobile-App.
 *
 * Expo inlined nur Variablen mit dem Präfix `EXPO_PUBLIC_` ins Bundle. Alles, was
 * geheim bleiben muss (Service-Keys, Stripe-Secrets), gehört deshalb hinter die
 * Express-API - nicht hierher.
 *
 * Werte kommen aus `mobile/.env` (siehe `.env.example`).
 */
export const env = {
  /**
   * Basis-URL der Maitr-API.
   *
   * Zwei Dinge waren hier vorher falsch, beide belegt:
   * - Der Pfad ist `/api/maitr`, nicht `/api`. Der Maitr-Router hängt in
   *   `server/maitr/index.ts` unter diesem Präfix, und `eas.json` setzt für den
   *   Produktionsbau genau `https://www.maitr.de/api/maitr`.
   *
   * MIT www, und das ist kein Schoenheitsfehler: `maitr.de` antwortet mit 301 auf
   * `www.maitr.de`. Ein Host-Wechsel laesst viele HTTP-Klienten den
   * `Authorization`-Header fallen - aus Sicherheitsgruenden, damit ein Token
   * nicht versehentlich an eine fremde Domain geht. Ohne www haette also JEDE
   * angemeldete Anfrage 401 ergeben, und der Fehler haette wie ein Auth-Problem
   * ausgesehen statt wie eine falsche Adresse. Live nachgemessen:
   *   https://maitr.de/api/maitr/venues      -> 301
   *   https://www.maitr.de/api/maitr/venues  -> 401 {"error":"Missing token"}
   * - Der Dev-Port ist 8081, nicht 8080. Express läuft im Entwicklungsbetrieb im
   *   Vite-Server (`vite.config.ts`, `port: 8081`); erst der eigenständige
   *   Produktionsstart nutzt `PORT` bzw. 3000 (`server/node-build.ts`).
   *
   * `localhost` funktioniert nur im iOS-Simulator, der sich den Netzwerk-Stack mit
   * dem Mac teilt. Im Android-Emulator ist der Mac `10.0.2.2`, auf einem echten
   * Gerät braucht es die LAN-IP - siehe `.env.example`.
   */
  // Vorgabe ist die PRODUKTIONS-URL, nicht localhost. Grund, im Simulator
  // gemessen: Ein localhost-Vorgabewert traf Port 8081 — und dort lauscht Metro,
  // nicht die API. Metro antwortete mit 200 auf einen unbekannten Pfad, der
  // Erfolgszweig in useDailyBriefing griff, `briefing.tasks` blieb undefiniert
  // und der Startbildschirm stürzte mit „Cannot read property 'filter' of
  // undefined" ab. Ein Vorgabewert, der auf einen fremden Dienst zeigt, ist
  // schlimmer als gar keiner: Er scheitert nicht, er lügt.
  //
  // Für die lokale Entwicklung EXPO_PUBLIC_API_URL setzen (siehe .env.example).
  apiBaseUrl: process.env.EXPO_PUBLIC_API_URL ?? "https://www.maitr.de/api/maitr",
  supabaseUrl: process.env.EXPO_PUBLIC_SUPABASE_URL,
  supabaseAnonKey: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY,
  /**
   * Clerk-Schlüssel. Ist er leer, startet die App im Demomodus - das ist der
   * ausdrückliche Rückfall, kein Fehlerfall (siehe `lib/auth.ts`).
   */
  clerkPublishableKey: process.env.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY,
} as const;
