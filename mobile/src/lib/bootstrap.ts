import AsyncStorage from "@react-native-async-storage/async-storage";
import { configureCore, isCoreConfigured } from "@maitr/core";

import { mobileAuthAdapter } from "./auth";
import { env } from "./env";
import { createMobileSupabaseClient, hasSupabaseConfig } from "./supabase";

/**
 * Verbindet `@maitr/core` mit der Mobile-Plattform: Storage, Auth-Token, API-Adresse,
 * Supabase-Client.
 *
 * Genau hier liegt die Grenze zwischen geteilter Logik und Plattform. Der Core kennt
 * weder AsyncStorage noch Expo - er bekommt beides von außen gereicht.
 *
 * Die Token-Kette in einem Satz: Clerk hält die Sitzung, `lib/auth.ts` holt daraus das
 * Token (oder `null` im Demomodus), `configureCore` reicht diese Funktion als
 * `getAuthToken` in den Core, und `packages/core/src/http.ts` hängt das Ergebnis vor
 * jedem `fetch` als `Authorization: Bearer …` an - außer bei `anonymous: true`.
 */
export function bootstrapCore(): void {
  if (isCoreConfigured()) return;

  configureCore({
    apiBaseUrl: env.apiBaseUrl,
    // Der Token-Lieferant der App. Er entscheidet bei jedem Aufruf neu, ob ein
    // Clerk-Token vorliegt - wichtig, weil `bootstrapCore()` schon beim Import des
    // Root-Layouts läuft, also lange bevor sich jemand angemeldet hat. Als Pfeil
    // gebunden, damit die Methode nicht vom Aufrufkontext abhängt.
    getAuthToken: () => mobileAuthAdapter.getToken(),
    storage: AsyncStorage,
    locale: "de-DE",
    // Ohne konfiguriertes Projekt gar nicht erst anbieten - dann wirft `getSupabase()`
    // eine klare Meldung statt eines Fehlers tief im SDK.
    ...(hasSupabaseConfig() ? { createSupabaseClient: createMobileSupabaseClient } : {}),
  });
}
