import type { ReactNode } from "react";
import { StyleSheet, View, type StyleProp, type ViewStyle } from "react-native";
import { BlurView } from "expo-blur";

import { useTheme } from "../../theme";

export interface GlassProps {
  children: ReactNode;
  /** Eckenradius; die Blur-Fläche wird darauf beschnitten. */
  radius?: number;
  /** Blur-Stärke 0-100. Im Design entspricht die Tabbar ~14px Blur. */
  intensity?: number;
  style?: StyleProp<ViewStyle>;
}

/**
 * Echtes Glasmorphism: eine `BlurView`, die den Hintergrund verwischt, mit dünnem
 * Lichtrand darüber. Ersetzt die frühere halbtransparente Näherung - jetzt verschwimmt
 * der animierte Wellen-Hintergrund tatsächlich hinter dem Element (wie bei Personio).
 *
 * Der Schatten sitzt außen (nicht beschnitten), Blur und Farbschleier in einer inneren,
 * auf den Radius geclippten Ebene - sonst würde `overflow:hidden` den Schatten kappen.
 */
export function Glass({ children, radius = 26, intensity = 30, style }: GlassProps) {
  const theme = useTheme();

  return (
    <View style={[{ borderRadius: radius }, style]}>
      <View style={[StyleSheet.absoluteFill, { borderRadius: radius, overflow: "hidden" }]}>
        <BlurView
          intensity={intensity}
          tint={theme.scheme === "dark" ? "dark" : "light"}
          style={StyleSheet.absoluteFill}
        />
        <View
          style={[
            StyleSheet.absoluteFill,
            {
              backgroundColor: theme.colors.tabBarBackground,
              borderWidth: StyleSheet.hairlineWidth,
              borderColor: theme.colors.tabBarBorder,
              borderRadius: radius,
            },
          ]}
        />
      </View>
      {children}
    </View>
  );
}
