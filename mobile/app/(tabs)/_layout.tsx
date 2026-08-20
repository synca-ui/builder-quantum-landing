// In SDK 57 liegt der JS-Tabs-Navigator unter `expo-router/js-tabs`;
// der Re-Export aus `expo-router` ist deprecated.
import { useEffect } from "react";
import { useRouter } from "expo-router";
import { Tabs } from "expo-router/js-tabs";

import { MaitrTabBar } from "../../src/components/MaitrTabBar";
import { useStore } from "../../src/lib/store";
import { usePushRegistrierung } from "../../src/lib/pushRegistrierung";

export const unstable_settings = {
  initialRouteName: "start",
};

/**
 * Die fünf Bereiche der Tabbar.
 *
 * Bewertungen steht seit dem Umbau an zweiter Stelle - dort, wo vorher „Tische"
 * lag. Grund: Bewertungen beantworten ist die tägliche Arbeit, die Maitr abnimmt;
 * Reservierungen sind ein Nebenschauplatz und bleiben als Screen erhalten.
 *
 * Profil-Check, Kanäle, Tische und Gäste liegen mit in dieser Gruppe, erscheinen aber
 * nicht in der Leiste (`href: null`). So bleibt die Tabbar beim Hineinnavigieren
 * stehen - im Design zeigen auch diese Screens die Leiste, mit dem jeweiligen
 * Elternbereich aktiv.
 *
 * `tische` bleibt bewusst als Route bestehen: Posteingang (`store.tsx`), das
 * Demo-Verzeichnis und der Zurück-Fallback des Gäste-Screens verweisen darauf, und
 * der Gast-Buchungsflow schreibt in denselben Store. Löschen würde tote Links
 * erzeugen, ohne etwas zu gewinnen.
 *
 * Die Darstellung übernimmt vollständig `MaitrTabBar` - `Tabs` liefert nur Navigation
 * und State, damit die schwebende Pille pixelgenau dem Design folgen kann.
 */
export default function TabsLayout() {
  const router = useRouter();
  const { signedIn } = useStore();

  // Push-Registrierung + Tap-Navigation (neue Reservierungsanfragen).
  usePushRegistrierung();

  // Gegenstück zum reaktiven Redirect in app/login.tsx: Verliert die Sitzung zur
  // Laufzeit ihre Gültigkeit — abgelaufen, im Clerk-Dashboard beendet, auf einem
  // anderen Gerät abgemeldet —, meldet das Abo in store.tsx signedIn=false. Ohne
  // diese Zeile bliebe der Nutzer trotzdem in den Tabs stehen und liefe in lauter
  // 401-Antworten; die Abmeldung wirkte erst beim nächsten Kaltstart.
  //
  // Im Demobetrieb greift das nur beim bewussten Abmelden, und dort navigiert der
  // Kontobildschirm ohnehin selbst — der Effekt kommt ihm höchstens zuvor.
  useEffect(() => {
    if (!signedIn) router.replace("/login");
  }, [signedIn, router]);

  return (
    <Tabs
      tabBar={(props) => <MaitrTabBar {...props} />}
      screenOptions={{ headerShown: false, sceneStyle: { backgroundColor: "transparent" } }}
    >
      {/* Kein Tab-Badge: die ungelesenen Nachrichten zeigt allein die Glocke im
          Start-Header. Ein zweites Badge (und dessen dunkler Kreis) wäre Redundanz. */}
      <Tabs.Screen name="start" options={{ title: "Start" }} />
      <Tabs.Screen name="bewertungen" options={{ title: "Bewertungen" }} />
      <Tabs.Screen name="beitraege" options={{ title: "Beiträge" }} />
      <Tabs.Screen name="wachstum" options={{ title: "Wachstum" }} />
      <Tabs.Screen name="konto" options={{ title: "Konto" }} />

      <Tabs.Screen name="profil-check" options={{ href: null }} />
      <Tabs.Screen name="kanaele" options={{ href: null }} />
      <Tabs.Screen name="tische" options={{ href: null }} />
      <Tabs.Screen name="gaeste" options={{ href: null }} />
    </Tabs>
  );
}
