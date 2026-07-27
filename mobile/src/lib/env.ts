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
   * Basis-URL der Express-API. Auf dem Simulator zeigt `localhost` auf den Simulator
   * selbst, nicht auf den Mac - daher im lokalen Betrieb die LAN-IP eintragen.
   */
  apiBaseUrl: process.env.EXPO_PUBLIC_API_URL ?? "http://localhost:8080/api",
  supabaseUrl: process.env.EXPO_PUBLIC_SUPABASE_URL,
  supabaseAnonKey: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY,
  clerkPublishableKey: process.env.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY,
} as const;
