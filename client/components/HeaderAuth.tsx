/**
 * Clerk-Anmeldung im Kopf der Startseite — nachgeladen, nicht im Ladepfad.
 *
 * WARUM das hier so umständlich aussieht:
 * Der Kopf zeigte zuletzt nur den Text "Mein Bereich" mit einem Link auf
 * /dashboard. Das war kein Versehen, sondern der Preis einer bewussten
 * Optimierung — siehe client/components/AppAreaShell.tsx: ClerkProvider hängt
 * an der App-Bereichs-Route, damit @clerk/clerk-react nicht bei jedem Aufruf
 * der Startseite geladen und initialisiert wird. Auf der Startseite gibt es
 * deshalb gar keinen Clerk-Kontext, in dem ein UserButton stehen könnte.
 *
 * Diese Datei holt den Anmeldeknopf zurück, ohne die Optimierung
 * zurückzunehmen. Vier Eigenschaften, jede aus einem Fehlversuch:
 *
 *  1. KEIN statischer Import von @clerk/clerk-react. Der Import steht in einer
 *     Funktion und läuft erst, wenn der Browser Leerlauf meldet. Deshalb darf
 *     diese Datei ganz normal statisch importiert werden — Clerk landet
 *     trotzdem nicht im Startbündel.
 *  2. GENAU EIN ClerkProvider. Der Kopf und das eingeklappte mobile Menü sind
 *     beide gleichzeitig im DOM ("hidden" ist nur CSS). Ein Provider je Knopf
 *     ergab prompt "You've added multiple <ClerkProvider> components".
 *     Deshalb: der Rahmen liegt einmal um die ganze Navigation, die Knöpfe
 *     holen ihn über den Kontext.
 *  3. KEIN Suspense um die Navigation. Die Kinder werden sofort gezeichnet;
 *     der Provider legt sich erst darum, wenn Clerk da ist. Ein
 *     Suspense-Rahmen hätte den ganzen Kopf für einen Moment ausgeblendet.
 *  4. KEIN Clerk fuer anonyme Besucher. Geladen wird erst, wenn das Cookie
 *     __client_uat eine Anmeldung nahelegt — siehe koennteAngemeldetSein.
 *     Vorher holte jeder anonyme Aufruf der Startseite das SDK von
 *     clerk.maitr.de und loeste dessen Sitzungsabfrage aus, ungefragt und vor
 *     dem Cookie-Banner.
 *  5. Der Zustand kommt aus useAuth().isLoaded, NICHT aus <SignedIn>/
 *     <SignedOut> und auch nicht aus <ClerkLoading>/<ClerkLoaded>. Erreicht
 *     Clerk seinen Server nicht, rendern SignedIn und SignedOut beide nichts,
 *     und ClerkLoading hört auf zu greifen, sobald Clerk auf "failed" geht —
 *     der Kopf hatte an dieser Stelle ein Loch. Das ist kein Randfall: Ein
 *     Werbeblocker oder ein Firmennetz, das clerk.maitr.de sperrt, erzeugt
 *     genau diesen Zustand. isLoaded ist in allen drei Fällen (lädt, fertig,
 *     gescheitert) eindeutig.
 */
import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ComponentType,
  type ReactNode,
} from "react";
import { LogIn } from "lucide-react";
import {
  HeaderAuthPlaceholder,
  HEADER_AUTH_SLOT,
} from "@/components/HeaderAuthPlaceholder";

const CLERK_PUBLISHABLE_KEY = import.meta.env
  .VITE_CLERK_PUBLISHABLE_KEY as string;

/** Die Handvoll Clerk-Teile, die der Kopf braucht. */
interface ClerkParts {
  useAuth: () => { isLoaded: boolean; isSignedIn: boolean | undefined };
  UserButton: ComponentType<Record<string, unknown>>;
}

type LoadedClerk = ClerkParts & { ClerkProvider: ComponentType<any> };

const PartsContext = createContext<ClerkParts | null>(null);

/** Einmal laden, auch wenn der Rahmen zwischendurch neu gehängt wird. */
let partsPromise: Promise<LoadedClerk> | null = null;

function loadClerk(): Promise<LoadedClerk> {
  if (!partsPromise) {
    partsPromise = import("@clerk/clerk-react").then((m) => ({
      ClerkProvider: m.ClerkProvider as ComponentType<any>,
      useAuth: m.useAuth as ClerkParts["useAuth"],
      UserButton: m.UserButton as ClerkParts["UserButton"],
    }));
  }
  return partsPromise;
}

/**
 * Gibt es überhaupt Anzeichen für eine Anmeldung?
 *
 * Clerk setzt `__client_uat` als lesbares Cookie, sobald für diesen Browser
 * ein Client existiert; abgemeldet steht dort "0". Fehlt es, ist der Besucher
 * mit Sicherheit nicht angemeldet — dann gibt es keinen Grund, das Clerk-SDK
 * zu laden.
 *
 * Das ist zuerst eine Datenschutzfrage: Vorher holte JEDER anonyme Besucher
 * der Startseite das SDK von clerk.maitr.de und löste dessen Sitzungsabfrage
 * aus — ungefragt und bevor der Cookie-Banner überhaupt erschienen war.
 * Nebenbei spart es den allermeisten Aufrufen einen Fremdaufruf und 112 KB.
 *
 * Ist das Cookie blockiert, bleibt der Platzhalter stehen. Der führt zur
 * Anmeldeseite — dort lädt Clerk regulär.
 */
function könnteAngemeldetSein(): boolean {
  if (typeof document === "undefined") return false;
  const treffer = document.cookie.match(/(?:^|;\s*)__client_uat=([^;]*)/);
  if (!treffer) return false;
  const wert = decodeURIComponent(treffer[1]).trim();
  return wert !== "" && wert !== "0";
}

/**
 * Legt sich um die Navigation. Zeichnet die Kinder sofort und schiebt den
 * ClerkProvider nach — aber nur, wenn überhaupt jemand angemeldet sein könnte.
 */
export function HeaderAuthGate({ children }: { children: ReactNode }) {
  const [loaded, setLoaded] = useState<LoadedClerk | null>(null);

  useEffect(() => {
    if (!CLERK_PUBLISHABLE_KEY) return;
    // Kein Clerk für anonyme Besucher — siehe könnteAngemeldetSein.
    if (!könnteAngemeldetSein()) return;
    let alive = true;
    const start = () => {
      loadClerk()
        .then((parts) => {
          if (alive) setLoaded(parts);
        })
        .catch(() => {
          // Kein stiller Ausfall: Wer nicht weiß, dass Clerk nicht geladen hat,
          // sucht den fehlenden Avatar später an der falschen Stelle. Der Kopf
          // bleibt benutzbar — der Platzhalter führt zur Anmeldeseite.
          console.warn("[HeaderAuth] Clerk konnte nicht geladen werden");
        });
    };

    const idle = window as unknown as {
      requestIdleCallback?: (cb: () => void, o?: { timeout: number }) => number;
      cancelIdleCallback?: (id: number) => void;
    };
    if (typeof idle.requestIdleCallback === "function") {
      const id = idle.requestIdleCallback(start, { timeout: 2500 });
      return () => {
        alive = false;
        idle.cancelIdleCallback?.(id);
      };
    }
    // Safari kennt requestIdleCallback bis heute nicht.
    const t = window.setTimeout(start, 600);
    return () => {
      alive = false;
      window.clearTimeout(t);
    };
  }, []);

  if (!loaded) return <>{children}</>;

  const { ClerkProvider, ...parts } = loaded;
  return (
    <ClerkProvider publishableKey={CLERK_PUBLISHABLE_KEY}>
      <PartsContext.Provider value={parts}>{children}</PartsContext.Provider>
    </ClerkProvider>
  );
}

/** Das Anmelde-Icon für den abgemeldeten Zustand. */
function SignInIcon({ label = "Anmelden" }: { label?: string }) {
  return (
    <a
      href="/login"
      aria-label={label}
      title={label}
      className={`${HEADER_AUTH_SLOT} flex items-center justify-center border border-gray-200/80 bg-white/60 text-gray-700 transition-colors hover:text-teal-600 hover:border-teal-300`}
    >
      <LogIn className="w-4 h-4" aria-hidden="true" />
    </a>
  );
}

/**
 * Erst hier wird ein Clerk-Hook aufgerufen. Bewusst eine eigene Komponente:
 * Stünde useAuth() in HeaderAuthButton hinter dem frühen return, änderte sich
 * die Zahl der Hooks in dem Moment, in dem Clerk fertig lädt — React bricht
 * das mit "Rendered fewer hooks than expected" ab.
 */
function ClerkAwareButton({
  parts,
  label,
}: {
  parts: ClerkParts;
  label?: string;
}) {
  const { isLoaded, isSignedIn } = parts.useAuth();
  if (!isLoaded) return <HeaderAuthPlaceholder label={label} />;
  if (!isSignedIn) return <SignInIcon label={label} />;

  const { UserButton } = parts;
  return (
    <UserButton
      afterSignOutUrl="/"
      userProfileMode="navigation"
      userProfileUrl="/profile"
      appearance={{ elements: { avatarBox: HEADER_AUTH_SLOT } }}
    />
  );
}

/**
 * Der Knopf selbst. Darf mehrfach vorkommen (Kopf und mobiles Menü) — er
 * bringt keinen eigenen Provider mit.
 */
export function HeaderAuthButton({ label }: { label?: string }) {
  const parts = useContext(PartsContext);
  if (!parts) return <HeaderAuthPlaceholder label={label} />;
  return <ClerkAwareButton parts={parts} label={label} />;
}
