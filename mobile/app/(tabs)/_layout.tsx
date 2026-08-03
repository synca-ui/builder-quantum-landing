// In SDK 57 liegt der JS-Tabs-Navigator unter `expo-router/js-tabs`;
// der Re-Export aus `expo-router` ist deprecated.
import { Tabs } from "expo-router/js-tabs";

import { MaitrTabBar } from "../../src/components/MaitrTabBar";

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
