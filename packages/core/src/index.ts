export {
  configureCore,
  getCoreConfig,
  isCoreConfigured,
  resetCoreConfig,
} from "./config";
export type {
  CoreConfig,
  KeyValueStorage,
  SupabaseClientLike,
  TokenProvider,
} from "./config";

export { request, ApiError } from "./http";
export type { RequestOptions } from "./http";

export * as api from "./api";
/**
 * Die Antworttypen der Stempelkarte liegen in `api/index.ts` neben den Aufrufen -
 * sie beschreiben deren Rückgaben und gehören dorthin. Über `export * as api` sind
 * sie aber nur als `api.StampProgram` erreichbar, und das ist ein Namensraum aus
 * FUNKTIONEN: eine Typannotation kann daraus nichts ziehen. Wer den Wert eines
 * Aufrufs in einem `useState` halten will, braucht den Typ als eigenen Export.
 * Additiv, ändert an vorhandenen Aufrufern nichts.
 */
export type {
  StampCardDetail,
  StampCardFilter,
  StampCardRow,
  StampEventRow,
  StampGuest,
  StampOverview,
  StampProgram,
  StampWirkung,
  VenueRolle,
  WalletBereitschaft,
} from "./api";
export { anonymousAuthAdapter } from "./auth";
export type { AuthAdapter, AuthUser } from "./auth";
export { getSupabase, resetSupabase } from "./supabase";
export type * from "./types";

export * as analytics from "./analytics";
export * as integrations from "./integrations";
