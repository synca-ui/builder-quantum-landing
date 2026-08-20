import AsyncStorage from "@react-native-async-storage/async-storage";
import * as SecureStore from "expo-secure-store";
import type { AuthAdapter, AuthUser } from "@maitr/core";

import { env } from "./env";

const TOKEN_KEY = "maitr.auth.token";
const USER_KEY = "maitr.auth.user";

/**
 * ANLASS: Der Demo-Fallback las/schrieb TOKEN_KEY bisher über AsyncStorage -
 * unverschlüsselter Klartext-Speicher. Aktuell folgenlos, weil persistSession()
 * (unten) im gesamten Baum nie aufgerufen wird (grep bestätigt das), aber eine
 * Falle für den nächsten Umbau: würde der Demo-Login künftig echte
 * Token-artige Werte über persistSession() ablegen, landeten sie unverschlüsselt
 * auf dem Gerät, obwohl expo-secure-store bereits Abhängigkeit der App ist.
 * USER_KEY bleibt bewusst in AsyncStorage - dort steht kein Geheimnis, nur ein
 * Profil-Objekt.
 */

type ClerkExpo = typeof import("@clerk/clerk-expo");
type ClerkTokenCache = typeof import("@clerk/clerk-expo/token-cache");

/**
 * Dreiwertig mit Absicht: `undefined` heißt "noch nicht versucht", `null` heißt
 * "steht nicht zur Verfügung". Sobald einmal `null` feststeht, bleibt es dabei -
 * sonst könnte ein späterer Versuch die Antwort umdrehen, und die App stünde mit
 * halb angemeldeten Screens da.
 */
let clerkModule: ClerkExpo | null | undefined;
let clerkTokenCache: ClerkTokenCache | null | undefined;

/**
 * Lädt `@clerk/clerk-expo` erst beim ersten Bedarf.
 *
 * Warum kein statischer Import: Das Paket zieht native Module nach (SecureStore,
 * WebBrowser). Ohne konfigurierten Schlüssel wollen wir die gar nicht erst anfassen -
 * fehlen sie im gerade installierten Dev-Client, würde ein statischer Import die App
 * schon beim Start zerlegen. Der Demomodus wäre dann kein Rückfall mehr, sondern ein
 * Absturz. Metro bündelt `require()` mit fester Zeichenkette genauso wie einen Import,
 * führt das Modul aber erst beim Aufruf aus.
 */
function loadClerk(): ClerkExpo | null {
  if (clerkModule !== undefined) return clerkModule;

  const key = env.clerkPublishableKey?.trim();
  // Clerk-Schlüssel beginnen mit `pk_test_`/`pk_live_`. Die Prüfung fängt den
  // häufigsten Konfigurationsfehler ab: eine leere oder auskommentierte Zeile in
  // `.env`, die als leerer String ankommt.
  if (!key || !key.startsWith("pk_")) {
    clerkModule = null;
    return null;
  }

  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    clerkModule = require("@clerk/clerk-expo") as ClerkExpo;
  } catch (error) {
    console.warn(
      "[auth] Clerk ist konfiguriert, ließ sich aber nicht laden - die App bleibt im Demomodus.",
      error,
    );
    clerkModule = null;
  }

  return clerkModule;
}

/**
 * Läuft die App mit echter Anmeldung?
 *
 * Die Antwort ist über die gesamte Prozesslaufzeit konstant (der Schlüssel wird von
 * Expo zur Bauzeit ins Bundle geschrieben), deshalb dürfen Screens ihre
 * Komponentenwahl daran aufhängen, ohne die Hook-Regeln zu verletzen.
 */
export function hasRealAuth(): boolean {
  return loadClerk() !== null;
}

/**
 * Clerk-Modul für Screens im echten Anmeldebetrieb.
 *
 * Wirft mit Absicht: Wer hier landet, hat vorher `hasRealAuth()` bestätigt bekommen.
 * Ein stiller Rückfall an dieser Stelle würde nur einen Programmierfehler verdecken -
 * der Rückfall auf die Demo passiert eine Ebene höher, bei der Komponentenwahl.
 */
export function requireClerk(): ClerkExpo {
  const clerk = loadClerk();
  if (!clerk) {
    throw new Error("Clerk ist nicht verfügbar. Vorher hasRealAuth() prüfen.");
  }
  return clerk;
}

/** Der Clerk-Tokenspeicher liegt in einem eigenen Einstiegspunkt - ebenfalls faul geladen. */
export function getClerkTokenCache(): ClerkTokenCache["tokenCache"] {
  if (clerkTokenCache === undefined) {
    try {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      clerkTokenCache = require("@clerk/clerk-expo/token-cache") as ClerkTokenCache;
    } catch (error) {
      // Ohne Speicher hält Clerk das Token nur im Arbeitsspeicher: die Anmeldung
      // überlebt dann keinen Neustart, die App läuft aber weiter.
      console.warn("[auth] Clerk-Tokenspeicher nicht verfügbar - Sitzung nur im Speicher.", error);
      clerkTokenCache = null;
    }
  }
  return clerkTokenCache?.tokenCache;
}

/**
 * Zugriff auf die Clerk-Instanz außerhalb von React.
 *
 * `getClerkInstance()` wirft, wenn kein Schlüssel vorliegt - deshalb geht hier nur
 * durch, was `loadClerk()` freigegeben hat, und selbst dann liefert ein Fehler nur
 * `null` statt einer Ausnahme bis in den Screen.
 */
function getClerkInstance(): ReturnType<ClerkExpo["getClerkInstance"]> | null {
  const clerk = loadClerk();
  if (!clerk) return null;

  try {
    return clerk.getClerkInstance({
      publishableKey: env.clerkPublishableKey,
      tokenCache: getClerkTokenCache(),
    });
  } catch (error) {
    console.warn("[auth] Clerk-Instanz nicht verfügbar.", error);
    return null;
  }
}

/**
 * Meldet Änderungen der Clerk-Sitzung an den lokalen Zustand.
 *
 * Warum das nötig ist: Die App führt zwei Wahrheiten. Die Clerk-Sitzung liegt im
 * SecureStore und überlebt jeden Neustart; der lokale `signedIn`-Merker steuert die
 * Navigation. Ohne Kopplung laufen beide auseinander, und zwar in beide Richtungen:
 * Ein Neustart mit gültiger Sitzung landete auf dem Login, und ein „Abmelden", das
 * nur den lokalen Merker löscht, ließ die Clerk-Sitzung stehen - der nächste
 * SSO-Flow lief dann gegen eine bereits aktive Sitzung.
 *
 * Der Rückgabewert ist der Abmelder für den useEffect-Aufräumer.
 *
 * Im Demomodus passiert hier NICHTS: kein Clerk-Zugriff, kein Laden des Pakets, ein
 * No-Op als Abmelder. Dort bleibt der lokale Zustand die einzige Wahrheit - genau
 * wie bisher.
 *
 * `Boolean(session)` ist bewusst dieselbe Definition wie in
 * `mobileAuthAdapter.isSignedIn()`; zwei unterschiedliche Begriffe von „angemeldet"
 * wären wieder zwei Wahrheiten.
 */
export function subscribeToRealAuthSession(
  onSessionChange: (signedIn: boolean) => void,
): () => void {
  const instance = getClerkInstance();
  if (!instance) return () => {};

  try {
    // Clerk meldet sich beim Abonnieren sofort, sobald der Client geladen ist, und
    // danach bei jeder Änderung (Anmeldung, Abmeldung, abgelaufene Sitzung).
    return instance.addListener(({ session }) => onSessionChange(Boolean(session)));
  } catch (error) {
    // Kein Absturz, nur keine Kopplung: die App bleibt auf dem lokalen Zustand
    // stehen, statt beim Start weiß zu bleiben.
    console.warn("[auth] Clerk-Sitzung konnte nicht abonniert werden.", error);
    return () => {};
  }
}

/**
 * Auth-Adapter der Mobile-App.
 *
 * Zwei Betriebsarten hinter einer Schnittstelle: Mit gesetztem
 * `EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY` kommt das Bearer-Token aus der laufenden
 * Clerk-Sitzung - genau das, was `server/middleware/auth.ts` erwartet. Ohne Schlüssel
 * bleibt der bisherige lokale Speicher aktiv, damit die Demo ohne jede Konfiguration
 * bedienbar ist. `@maitr/core` und alle Screens sehen weiterhin nur `AuthAdapter`.
 */
export const mobileAuthAdapter: AuthAdapter = {
  async getToken() {
    const instance = getClerkInstance();
    if (instance) {
      try {
        return (await instance.session?.getToken()) ?? null;
      } catch (error) {
        // Netzfehler beim Auffrischen darf keinen Screen sprengen: ohne Token
        // antwortet die API mit einem sauberen 401 statt mit einem Absturz.
        console.warn("[auth] Clerk-Token konnte nicht geholt werden.", error);
        return null;
      }
    }
    return SecureStore.getItemAsync(TOKEN_KEY);
  },

  async isSignedIn() {
    const instance = getClerkInstance();
    if (instance) return Boolean(instance.session);
    return (await SecureStore.getItemAsync(TOKEN_KEY)) !== null;
  },

  async getUser() {
    const instance = getClerkInstance();
    if (instance) {
      const user = instance.user;
      if (!user) return null;
      return {
        id: user.id,
        email: user.primaryEmailAddress?.emailAddress,
        displayName: user.fullName ?? undefined,
        imageUrl: user.imageUrl,
        // Die Zuordnung zu Betrieben trifft der Server anhand des Tokens
        // (`GET /venues`) - der Client rät sie nicht.
        venueIds: [],
      } satisfies AuthUser;
    }

    const raw = await AsyncStorage.getItem(USER_KEY);
    if (!raw) return null;
    try {
      return JSON.parse(raw) as AuthUser;
    } catch {
      // Beschädigter Eintrag: lieber abmelden als mit halbem State weiterlaufen.
      await Promise.all([
        SecureStore.deleteItemAsync(TOKEN_KEY),
        AsyncStorage.removeItem(USER_KEY),
      ]);
      return null;
    }
  },

  async signOut() {
    const instance = getClerkInstance();
    if (instance) {
      try {
        await instance.signOut();
      } catch (error) {
        console.warn("[auth] Clerk-Abmeldung fehlgeschlagen.", error);
      }
    }
    // Den lokalen Rest immer räumen - auch im Clerk-Betrieb, falls noch ein
    // Demo-Eintrag aus einer früheren Sitzung herumliegt.
    await Promise.all([
      SecureStore.deleteItemAsync(TOKEN_KEY),
      AsyncStorage.removeItem(USER_KEY),
    ]);
  },
};

/** Nach erfolgreichem Login im Demomodus aufrufen. Im Clerk-Betrieb übernimmt Clerk. */
export async function persistSession(token: string, user: AuthUser): Promise<void> {
  await Promise.all([
    SecureStore.setItemAsync(TOKEN_KEY, token),
    AsyncStorage.setItem(USER_KEY, JSON.stringify(user)),
  ]);
}
