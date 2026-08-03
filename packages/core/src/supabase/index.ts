import { getCoreConfig, type SupabaseClientLike } from "../config";

/**
 * Zugriff auf Supabase.
 *
 * Der Core importiert `@supabase/supabase-js` bewusst NICHT selbst. Metro löst auch
 * dynamische Imports beim Bündeln statisch auf - ein `import("@supabase/supabase-js")`
 * hier würde die Mobile-App also zwingen, das Paket zu installieren, selbst wenn sie
 * nur die Express-API nutzt. Stattdessen reicht jede Plattform eine Factory herein
 * (`createSupabaseClient` in `CoreConfig`) und bringt ihre eigene Client-Variante mit:
 * im Web mit `localStorage`, mobil mit AsyncStorage.
 */

export type { SupabaseClientLike } from "../config";

let client: SupabaseClientLike | null = null;

export function getSupabase(): SupabaseClientLike {
  const cfg = getCoreConfig();

  if (!cfg.createSupabaseClient) {
    throw new Error(
      "Supabase ist nicht eingerichtet. Übergib createSupabaseClient in configureCore().",
    );
  }

  // Ein Client pro Prozess - mehrere Instanzen würden sich beim Token-Refresh
  // gegenseitig überschreiben.
  client ??= cfg.createSupabaseClient();
  return client;
}

/** Nur für Tests: erzwingt beim nächsten Aufruf einen frischen Client. */
export function resetSupabase(): void {
  client = null;
}
