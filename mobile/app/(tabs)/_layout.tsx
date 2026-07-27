// In SDK 57 liegt der JS-Tabs-Navigator unter `expo-router/js-tabs`;
// der Re-Export aus `expo-router` ist deprecated.
import { Tabs } from "expo-router/js-tabs";

import { MaitrTabBar } from "../../src/components/MaitrTabBar";
import { useT } from "../../src/lib/i18n";

export const unstable_settings = {
  initialRouteName: "start",
};

/**
 * Die fünf Bereiche aus `MaitrTabbar.dc.html`.
 *
 * Profil-Check, Kanäle und Bewertungen liegen mit in dieser Gruppe, erscheinen aber
 * nicht in der Leiste (`href: null`). So bleibt die Tabbar beim Hineinnavigieren
 * stehen - im Design zeigen auch diese Screens die Leiste, mit dem jeweiligen
 * Elternbereich aktiv.
 *
 * Die Darstellung übernimmt vollständig `MaitrTabBar` - `Tabs` liefert nur Navigation
 * und State, damit die schwebende Pille pixelgenau dem Design folgen kann.
 */
export default function TabsLayout() {
  const t = useT();

  return (
    <Tabs
      tabBar={(props) => <MaitrTabBar {...props} />}
      screenOptions={{ headerShown: false, sceneStyle: { backgroundColor: "transparent" } }}
    >
      {/* Kein Tab-Badge: die ungelesenen Nachrichten zeigt allein die Glocke im
          Start-Header. Ein zweites Badge (und dessen dunkler Kreis) wäre Redundanz. */}
      <Tabs.Screen name="start" options={{ title: t({ de: "Start", en: "Home" }) }} />
      <Tabs.Screen name="tische" options={{ title: t({ de: "Tische", en: "Tables" }) }} />
      <Tabs.Screen name="beitraege" options={{ title: t({ de: "Beiträge", en: "Posts" }) }} />
      <Tabs.Screen name="wachstum" options={{ title: t({ de: "Wachstum", en: "Growth" }) }} />
      <Tabs.Screen name="konto" options={{ title: t({ de: "Konto", en: "Account" }) }} />

      <Tabs.Screen name="profil-check" options={{ href: null }} />
      <Tabs.Screen name="kanaele" options={{ href: null }} />
      <Tabs.Screen name="bewertungen" options={{ href: null }} />
      <Tabs.Screen name="gaeste" options={{ href: null }} />
    </Tabs>
  );
}
