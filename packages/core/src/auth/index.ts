import type { TokenProvider } from "../config";

/**
 * Auth-Vertrag zwischen Core und Plattform.
 *
 * Web erfüllt ihn heute mit Clerk (`useAuth().getToken`), Mobile kann Clerk Expo,
 * Supabase Auth oder etwas anderes einsetzen - der Core sieht nur dieses Interface.
 */
export interface AuthAdapter {
  /** Bearer-Token für die Express-API. */
  getToken: TokenProvider;
  /** Ist gerade jemand angemeldet? */
  isSignedIn(): boolean | Promise<boolean>;
  /** Aktueller Nutzer, sofern bekannt. */
  getUser(): Promise<AuthUser | null>;
  signOut(): Promise<void>;
}

export interface AuthUser {
  id: string;
  email?: string;
  displayName?: string;
  imageUrl?: string;
  /** Betriebe, auf die der Nutzer Zugriff hat. */
  venueIds: string[];
}

/** Adapter, der niemanden anmeldet - nützlich für Gast-Flows und Tests. */
export const anonymousAuthAdapter: AuthAdapter = {
  getToken: async () => null,
  isSignedIn: () => false,
  getUser: async () => null,
  signOut: async () => {},
};
