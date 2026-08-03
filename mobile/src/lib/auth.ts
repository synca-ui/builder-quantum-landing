import AsyncStorage from "@react-native-async-storage/async-storage";
import type { AuthAdapter, AuthUser } from "@maitr/core";

const TOKEN_KEY = "maitr.auth.token";
const USER_KEY = "maitr.auth.user";

/**
 * Auth-Adapter der Mobile-App.
 *
 * Bewusst als schlichter Token-Speicher gebaut: Die Web-App nutzt Clerk, mobil ist die
 * Entscheidung (Clerk Expo vs. Supabase Auth) noch offen. Wer sie trifft, ersetzt nur
 * diese Datei - `@maitr/core` und alle Screens sehen weiterhin `AuthAdapter`.
 */
export const mobileAuthAdapter: AuthAdapter = {
  async getToken() {
    return AsyncStorage.getItem(TOKEN_KEY);
  },

  async isSignedIn() {
    return (await AsyncStorage.getItem(TOKEN_KEY)) !== null;
  },

  async getUser() {
    const raw = await AsyncStorage.getItem(USER_KEY);
    if (!raw) return null;
    try {
      return JSON.parse(raw) as AuthUser;
    } catch {
      // Beschädigter Eintrag: lieber abmelden als mit halbem State weiterlaufen.
      await AsyncStorage.multiRemove([TOKEN_KEY, USER_KEY]);
      return null;
    }
  },

  async signOut() {
    await AsyncStorage.multiRemove([TOKEN_KEY, USER_KEY]);
  },
};

/** Nach erfolgreichem Login aufrufen. */
export async function persistSession(token: string, user: AuthUser): Promise<void> {
  await AsyncStorage.multiSet([
    [TOKEN_KEY, token],
    [USER_KEY, JSON.stringify(user)],
  ]);
}
