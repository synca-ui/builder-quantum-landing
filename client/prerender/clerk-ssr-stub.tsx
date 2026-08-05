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
 * Stand 05.08.2026 erreicht keine der vorgerenderten Routen mehr Clerk: Der
 * Kopf der Startseite fragt den Anmeldezustand nicht mehr ab, und ClerkProvider
 * hängt an client/components/AppAreaShell.tsx, das client/prerender/entry.tsx
 * nicht importiert. Der Stub bleibt als Netz stehen – zieht jemand künftig eine
 * Clerk-Komponente in eine vorgerenderte Seite, bricht der Build nicht ab,
 * sondern rendert weiter den abgemeldeten Zustand.
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
