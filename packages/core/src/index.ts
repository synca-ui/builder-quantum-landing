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
export { anonymousAuthAdapter } from "./auth";
export type { AuthAdapter, AuthUser } from "./auth";
export { getSupabase, resetSupabase } from "./supabase";
export type * from "./types";

export * as analytics from "./analytics";
export * as integrations from "./integrations";
