/**
 * Laufzeit-Konfiguration des Core-Pakets.
 *
 * Wichtig: Dieses Paket liest NIE selbst aus `import.meta.env` oder `process.env`.
 * Die Web-App (Vite) und die Mobile-App (Expo) lesen ihre Variablen jeweils selbst
 * und reichen sie über `configureCore()` herein. Nur so bleibt der Code in beiden
 * Bundlern lauffähig.
 */

/** Minimaler Key-Value-Store, den Web (localStorage) und Mobile (AsyncStorage) erfüllen. */
export interface KeyValueStorage {
  getItem(key: string): string | null | Promise<string | null>;
  setItem(key: string, value: string): void | Promise<void>;
  removeItem(key: string): void | Promise<void>;
}

/** Liefert das aktuelle Bearer-Token oder `null`, wenn niemand angemeldet ist. */
export type TokenProvider = () => Promise<string | null>;

/**
 * Schmale Sicht auf den Supabase-Client. Bewusst kein Import aus `@supabase/supabase-js`:
 * das Paket ist eine Sache der Plattform, nicht des Cores.
 */
export interface SupabaseClientLike {
  from(table: string): unknown;
  auth: unknown;
  storage: unknown;
}

export interface CoreConfig {
  /** Basis-URL der Express-API, z. B. `/api` (Web) oder `https://api.maitr.app/api` (Mobile). */
  apiBaseUrl: string;
  /**
   * Erzeugt den Supabase-Client. Die Plattform bringt das SDK mit, nicht der Core -
   * siehe Begründung in `src/supabase/index.ts`. Weglassen, wenn Supabase ungenutzt bleibt.
   */
  createSupabaseClient?: () => SupabaseClientLike;
  /** Auth-Token-Quelle. Im Web aus Clerk `getToken()`, mobil aus dem jeweiligen Auth-Adapter. */
  getAuthToken?: TokenProvider;
  /** Persistenz für Sessions/Caches. */
  storage?: KeyValueStorage;
  /** Ueberschreibbar für Tests. */
  fetch?: typeof globalThis.fetch;
  /** Sprache für `Accept-Language`. */
  locale?: string;
  /** Timeout je Request in ms (Default 15000). Schützt vor hängenden Verbindungen. */
  requestTimeoutMs?: number;
}

let config: CoreConfig | null = null;

export function configureCore(next: CoreConfig): void {
  config = { locale: "de-DE", requestTimeoutMs: 15000, ...next };
}

export function getCoreConfig(): CoreConfig {
  if (!config) {
    throw new Error(
      "@maitr/core ist nicht konfiguriert. Rufe configureCore({ apiBaseUrl }) beim App-Start auf.",
    );
  }
  return config;
}

export function isCoreConfigured(): boolean {
  return config !== null;
}

/** Nur für Tests: setzt die Konfiguration zurück. */
export function resetCoreConfig(): void {
  config = null;
}
