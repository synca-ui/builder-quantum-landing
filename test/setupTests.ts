import "@testing-library/jest-dom";
import { expect, afterEach, vi } from "vitest";
import { cleanup } from "@testing-library/react";

/**
 * lottie-react zieht lottie-web herein, und das greift beim Import direkt auf
 * HTMLCanvasElement.getContext() zu. jsdom implementiert Canvas nicht (dafür
 * bräuchte es das native "canvas"-Paket), weshalb schon der Import wirft:
 *   TypeError: Cannot set properties of null (setting 'fillStyle')
 *
 * Daran scheiterten LoadingOverlay.test.tsx und ModeSelection.test.tsx komplett.
 * Die Animation ist für keinen dieser Tests relevant – deshalb hier durch ein
 * schlichtes Element ersetzt, statt eine native Abhängigkeit einzuführen.
 */
vi.mock("lottie-react", () => ({
  default: (props: Record<string, unknown>) => null,
  useLottie: () => ({ View: null }),
}));

/**
 * Clerk ist rein clientseitig und verlangt einen <ClerkProvider /> im Baum;
 * ohne ihn wirft useAuth() sofort. Komponententests müssten sonst jede
 * Seite in einen echten Provider wickeln und bräuchten einen Publishable Key.
 *
 * Die Rückgaben bilden bewusst den ERSTEN Render-Zustand im Browser ab
 * (isLoaded: false) – dieselbe Annahme wie in client/prerender/clerk-ssr-stub.tsx,
 * damit Tests, Prerendering und der erste Client-Render dasselbe sehen.
 */
/**
 * Fast jede Seite rendert <PageSEO>, und das rendert <Helmet>. Ohne einen
 * <HelmetProvider /> im Baum wirft react-helmet-async beim ersten Render:
 *   TypeError: Cannot read properties of undefined (reading 'add')
 *   at HelmetDispatcher.init  (context.helmetInstances ist undefined)
 *
 * Statt jeden Test in einen Provider zu wickeln, hier neutralisiert – die
 * <head>-Tags sind für Komponententests ohnehin nicht das Prüfobjekt. Wer sie
 * testen will, braucht einen echten HelmetProvider im jeweiligen Test.
 */
vi.mock("react-helmet-async", () => ({
  Helmet: () => null,
  HelmetProvider: ({ children }: { children?: unknown }) => children,
}));

vi.mock("@clerk/clerk-react", () => ({
  useAuth: () => ({ isLoaded: false, isSignedIn: false, userId: null }),
  useUser: () => ({ isLoaded: false, isSignedIn: false, user: null }),
  ClerkProvider: ({ children }: { children?: unknown }) => children,
  UserButton: () => null,
  SignIn: () => null,
  SignUp: () => null,
}));

// Cleanup after each test
afterEach(() => {
  cleanup();
});
