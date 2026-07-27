/**
 * SSR-Stub für @clerk/clerk-react.
 *
 * Wird ausschließlich im Prerender-Build (vite.config.prerender.ts) per Alias
 * anstelle des echten Clerk-Pakets eingebunden. Clerk ist rein clientseitig und
 * würde beim Prerendern Netzwerkzugriffe brauchen.
 *
 * Die Rückgabewerte bilden exakt den ERSTEN Render-Zustand im Browser ab
 * (isLoaded: false), bevor Clerk initialisiert hat. Dadurch ist das
 * vorgerenderte Markup identisch mit dem, was React beim Mounten erzeugt –
 * genau das verhindert einen Layout-Shift.
 *
 * Konkret rendert LazyAuthSection bei isLoaded=false die StaticLoginButtons,
 * im Browser zunächst ebenfalls.
 */
import type { ReactNode } from "react";

export function useAuth() {
  return { isLoaded: false, isSignedIn: false, userId: null };
}

export function useUser() {
  return { isLoaded: false, isSignedIn: false, user: null };
}

export function ClerkProvider({ children }: { children?: ReactNode }) {
  return <>{children}</>;
}

export const UserButton = () => null;
export const SignIn = () => null;
export const SignUp = () => null;
