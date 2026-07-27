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
 */
export function bootstrapCore(): void {
  if (isCoreConfigured()) return;

  configureCore({
    apiBaseUrl: env.apiBaseUrl,
    getAuthToken: mobileAuthAdapter.getToken,
    storage: AsyncStorage,
    locale: "de-DE",
    // Ohne konfiguriertes Projekt gar nicht erst anbieten - dann wirft `getSupabase()`
    // eine klare Meldung statt eines Fehlers tief im SDK.
    ...(hasSupabaseConfig() ? { createSupabaseClient: createMobileSupabaseClient } : {}),
  });
}
