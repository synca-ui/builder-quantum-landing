import type { ReactElement } from "react";
import type { BottomTabBarProps } from "expo-router/js-tabs";
import { Pressable, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useTheme } from "../theme";
import { AccountIcon, GrowthIcon, PostIcon, TableIcon, TargetIcon, type IconProps } from "./icons";
import { Glass } from "./ui/Glass";
import { Text } from "./ui/Text";

/** Reihenfolge und Beschriftung stammen aus `MaitrTabbar.dc.html`. */
const TAB_ICONS: Record<string, (props: IconProps) => ReactElement> = {
  start: TargetIcon,
  tische: TableIcon,
  beitraege: PostIcon,
  wachstum: GrowthIcon,
  konto: AccountIcon,
};

/**
 * Screens in der Tab-Gruppe, die keinen eigenen Eintrag haben. Solange einer davon
 * offen ist, leuchtet der Bereich, aus dem er kommt - die Zuordnung ist im Design
 * vorgegeben (Screen 11 „Kanäle" zeigt Konto, nicht Wachstum).
 */
const PARENT_TAB: Record<string, string> = {
  "profil-check": "wachstum",
  kanaele: "konto",
  bewertungen: "start",
  gaeste: "tische",
};

/**
 * Schwebende Tabbar-Pille.
 *
 * Im Design liegt sie mit `position:absolute; left:16; right:16; bottom:16` über dem
 * Screen und hat `backdrop-filter:blur(14px)`. RN kann Backdrop-Blur nicht per Style;
 * die halbtransparente Fläche plus Schatten trägt die Wirkung ausreichend. Wer echtes
 * Blur will, legt hier ein `expo-blur` <BlurView> unter den Inhalt.
 */
export function MaitrTabBar({ state, descriptors, navigation }: BottomTabBarProps) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();

  // Nur die fünf Bereiche mit Icon erscheinen; alles andere in der Gruppe ist ein
  // Unter-Screen und wird über PARENT_TAB dem Elternbereich zugeschlagen.
  const visibleRoutes = state.routes
    .map((route, index) => ({ route, index }))
    .filter(({ route }) => route.name in TAB_ICONS);

  const currentName = state.routes[state.index]?.name ?? "";
  const activeName = currentName in TAB_ICONS ? currentName : PARENT_TAB[currentName];
  const activeIndex = state.routes.findIndex((route) => route.name === activeName);

  return (
    <Glass
      radius={theme.radius.tabBar}
      intensity={40}
      style={[
        styles.container,
        { bottom: Math.max(insets.bottom, theme.spacing.lg) },
        theme.elevation.floating,
      ]}
    >
      {visibleRoutes.map(({ route, index }) => {
        const { options } = descriptors[route.key];
        const focused = index === activeIndex;
        const Icon = TAB_ICONS[route.name] ?? TargetIcon;
        const label = typeof options.title === "string" ? options.title : route.name;
        const badge = options.tabBarBadge;

        const color = focused ? theme.colors.primary : theme.colors.textMuted;

        const onPress = () => {
          const event = navigation.emit({ type: "tabPress", target: route.key, canPreventDefault: true });
          if (!focused && !event.defaultPrevented) {
            navigation.navigate(route.name);
          }
        };

        return (
          <Pressable
            key={route.key}
            onPress={onPress}
            onLongPress={() => navigation.emit({ type: "tabLongPress", target: route.key })}
            accessibilityRole="button"
            accessibilityState={{ selected: focused }}
            accessibilityLabel={label}
            style={styles.tab}
          >
            {/* Mint-Spot hinter dem aktiven Icon, 22 % Deckkraft. */}
            {focused ? (
              <View
                style={[styles.spot, { backgroundColor: theme.colors.accent, borderRadius: 11 }]}
                pointerEvents="none"
              />
            ) : null}

            <Icon size={22} color={color} />
            <Text variant="eyebrow" color={color} style={styles.label}>
              {label}
            </Text>

            {badge !== undefined && badge !== null ? (
              <View style={[styles.badge, { backgroundColor: theme.colors.inkAction }]}>
                <Text variant="eyebrow" color={theme.colors.onInkAction} style={styles.badgeText}>
                  {String(badge)}
                </Text>
              </View>
            ) : null}
          </Pressable>
        );
      })}
    </Glass>
  );
}

const styles = StyleSheet.create({
  container: {
    position: "absolute",
    left: 16,
    right: 16,
    height: 64,
    paddingHorizontal: 8,
    flexDirection: "row",
    alignItems: "center",
  },
  tab: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
    height: "100%",
  },
  spot: {
    position: "absolute",
    top: 9,
    width: 34,
    height: 26,
    opacity: 0.22,
  },
  label: {
    fontSize: 9.5,
    letterSpacing: 0.29,
    textTransform: "none",
  },
  badge: {
    position: "absolute",
    top: 6,
    right: 12,
    minWidth: 15,
    height: 15,
    paddingHorizontal: 3,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  badgeText: {
    fontSize: 9,
    letterSpacing: 0,
    textTransform: "none",
  },
});
