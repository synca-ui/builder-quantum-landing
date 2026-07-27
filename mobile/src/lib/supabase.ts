import "react-native-url-polyfill/auto";

import AsyncStorage from "@react-native-async-storage/async-storage";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { SupabaseClientLike } from "@maitr/core";

import { env } from "./env";

/**
 * Supabase-Client der Mobile-App.
 *
 * Zwei Unterschiede zur Web-Variante in `client/lib/supabaseClient.ts`:
 * - `storage: AsyncStorage`, weil React Native kein `localStorage` hat.
 * - `detectSessionInUrl: false`, weil es keinen Browser-Redirect gibt, aus dem eine
 *   Session gelesen werden könnte.
 *
 * Der URL-Polyfill oben ist Pflicht: Hermes' `URL` ist unvollständig, und supabase-js
 * baut damit seine Request-URLs.
 */
export function createMobileSupabaseClient(): SupabaseClient {
  if (!env.supabaseUrl || !env.supabaseAnonKey) {
    throw new Error(
      "Supabase fehlt: EXPO_PUBLIC_SUPABASE_URL und EXPO_PUBLIC_SUPABASE_ANON_KEY in mobile/.env setzen.",
    );
  }

  return createClient(env.supabaseUrl, env.supabaseAnonKey, {
    auth: {
      storage: AsyncStorage,
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: false,
    },
  });
}

/** `true`, wenn die App überhaupt gegen Supabase sprechen kann. */
export function hasSupabaseConfig(): boolean {
  return Boolean(env.supabaseUrl && env.supabaseAnonKey);
}

/** Der konkrete Client erfüllt den schmalen Core-Vertrag. */
export type MobileSupabaseClient = SupabaseClient & SupabaseClientLike;
