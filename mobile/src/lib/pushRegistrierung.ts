/**
 * Push-Registrierung der Betreiber-App.
 *
 * Meldet das Gerät beim Server an (`POST /api/maitr/push/register`), damit
 * neue Reservierungsanfragen als Push ankommen. Der Server löst zur
 * Sendezeit Betrieb → Mitglieder → Geräte auf — hier wird nur das KONTO
 * registriert, kein Betrieb.
 *
 * Bewusste Grenzen:
 *  - Nur echtes Gerät (Simulatoren bekommen keine Expo-Push-Tokens) und nur
 *    gegen den echten Server — der Demobetrieb hat niemanden, der sendet.
 *  - Erst fragen, dann registrieren; eine Ablehnung wird NICHT wiederholt
 *    angefleht. Wer Push später will, schaltet es in den Systemeinstellungen
 *    frei — beim nächsten Start greift die Registrierung dann von selbst.
 */
import { useEffect } from "react";
import { Platform } from "react-native";
import * as Device from "expo-device";
import * as Notifications from "expo-notifications";
import Constants from "expo-constants";
import { useRouter } from "expo-router";
import { api } from "@maitr/core";

import { hasRealAuth } from "./auth";
import { useStore } from "./store";

// Wie sich eine Push im Vordergrund verhält: zeigen, aber nicht doppelt
// erschrecken — Banner ja, Ton nein (der Wirt steht ggf. im Service).
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: false,
    shouldSetBadge: false,
  }),
});

async function registrieren(): Promise<void> {
  if (!Device.isDevice) return;

  const vorhanden = await Notifications.getPermissionsAsync();
  let status = vorhanden.status;
  if (status === "undetermined") {
    status = (await Notifications.requestPermissionsAsync()).status;
  }
  if (status !== "granted") return;

  if (Platform.OS === "android") {
    await Notifications.setNotificationChannelAsync("default", {
      name: "Benachrichtigungen",
      importance: Notifications.AndroidImportance.HIGH,
    });
  }

  const projectId: string | undefined =
    Constants.expoConfig?.extra?.eas?.projectId;
  const token = (await Notifications.getExpoPushTokenAsync({ projectId })).data;

  await api.push.register({
    token,
    platform: Platform.OS === "ios" ? "ios" : "android",
  });
}

/**
 * Im angemeldeten Bereich aufrufen (Tab-Layout). Registriert das Gerät und
 * navigiert bei angetippter Reservierungs-Push zu den Tischen.
 */
export function usePushRegistrierung(): void {
  const router = useRouter();
  const { signedIn } = useStore();

  useEffect(() => {
    if (!signedIn || !hasRealAuth()) return;
    registrieren().catch((err) =>
      // Kein Toast: Push ist Komfort. Ein Registrierungsfehler darf den
      // Start des Arbeitstags nicht mit einer Fehlermeldung eröffnen.
      console.warn("[Push] Registrierung fehlgeschlagen:", err),
    );
  }, [signedIn]);

  useEffect(() => {
    const abo = Notifications.addNotificationResponseReceivedListener(
      (antwort) => {
        const data = antwort.notification.request.content.data as
          | { type?: string }
          | undefined;
        if (data?.type === "reservation") {
          router.push("/(tabs)/tische");
        }
      },
    );
    return () => abo.remove();
  }, [router]);
}
