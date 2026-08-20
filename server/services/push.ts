/**
 * Push an die Betreiber-App (Expo).
 *
 * Versand direkt gegen Expos HTTP-API (https://exp.host/--/api/v2/push/send) —
 * bewusst OHNE expo-server-sdk: der Endpunkt ist ein einfacher JSON-POST, und
 * eine Dependency, die ein fetch kapselt, ist keine.
 *
 * Zustellmodell: Ein Ereignis gehört einem BETRIEB (z. B. neue
 * Reservierungsanfrage); zugestellt wird an die GERÄTE seiner Mitglieder —
 * aufgelöst zur Sendezeit über BusinessMember → PushToken. Tokens, die Expo
 * als `DeviceNotRegistered` meldet (App gelöscht, Gerät gewechselt), werden
 * sofort entfernt: ein toter Token, der bleibt, ist bei jedem künftigen
 * Versand ein garantierter Fehlschlag.
 *
 * Fehler blockieren NIE den Auslöser: Wer eine Reservierung anfragt, wartet
 * nicht darauf, dass Expo antwortet. Aufrufer nutzen `void ...().catch(...)`.
 */
import prisma from "../db/prisma";

const EXPO_PUSH_URL = "https://exp.host/--/api/v2/push/send";
/** Expos dokumentierte Obergrenze je Anfrage. */
const BLOCKGROESSE = 100;

export interface PushNachricht {
  to: string;
  title: string;
  body: string;
  /** Landet in der App im Notification-Response (Deep-Link-Daten). */
  data?: Record<string, string>;
}

/** Ein Expo-Push-Token sieht aus wie ExponentPushToken[xxxx]. */
export function istExpoPushToken(token: string): boolean {
  return /^Expo(nent)?PushToken\[.+\]$/.test(token);
}

export function inBloecken<T>(liste: T[], groesse: number = BLOCKGROESSE): T[][] {
  const bloecke: T[][] = [];
  for (let i = 0; i < liste.length; i += groesse) {
    bloecke.push(liste.slice(i, i + groesse));
  }
  return bloecke;
}

interface ExpoTicket {
  status: "ok" | "error";
  message?: string;
  details?: { error?: string };
}

/**
 * Versendet die Nachrichten und gibt die Tokens zurück, die Expo als
 * dauerhaft unzustellbar meldet (`DeviceNotRegistered`).
 */
export async function expoVersenden(
  nachrichten: PushNachricht[],
): Promise<{ unzustellbar: string[] }> {
  const unzustellbar: string[] = [];

  for (const block of inBloecken(nachrichten)) {
    try {
      const res = await fetch(EXPO_PUSH_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify(block),
      });
      if (!res.ok) {
        console.error(`[Push] Expo antwortete ${res.status}`);
        continue;
      }
      const json = (await res.json()) as { data?: ExpoTicket[] };
      (json.data ?? []).forEach((ticket, i) => {
        if (
          ticket.status === "error" &&
          ticket.details?.error === "DeviceNotRegistered"
        ) {
          unzustellbar.push(block[i].to);
        } else if (ticket.status === "error") {
          console.warn(`[Push] Ticket-Fehler: ${ticket.message ?? "unbekannt"}`);
        }
      });
    } catch (err) {
      console.error("[Push] Versandfehler:", err);
    }
  }

  return { unzustellbar };
}

/**
 * Push an alle Mitglieder eines Betriebs. Löscht unzustellbare Tokens.
 */
export async function pushAnBetrieb(
  businessId: string,
  titel: string,
  text: string,
  data?: Record<string, string>,
): Promise<void> {
  const mitglieder = await prisma.businessMember.findMany({
    where: { businessId },
    select: { userId: true },
  });
  if (mitglieder.length === 0) return;

  const tokens = await prisma.pushToken.findMany({
    where: { userId: { in: mitglieder.map((m) => m.userId) } },
    select: { token: true },
  });
  if (tokens.length === 0) return;

  const { unzustellbar } = await expoVersenden(
    tokens.map((t) => ({
      to: t.token,
      title: titel,
      body: text,
      data,
    })),
  );

  if (unzustellbar.length > 0) {
    await prisma.pushToken.deleteMany({
      where: { token: { in: unzustellbar } },
    });
  }
}
