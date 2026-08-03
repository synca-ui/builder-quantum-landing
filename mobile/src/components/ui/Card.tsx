import type { ReactNode } from "react";
import { View, type ViewStyle } from "react-native";

import { useTheme } from "../../theme";

export interface CardProps {
  children: ReactNode;
  /** `sunken` für eingelassene Blöcke innerhalb einer Karte (z. B. Detailtabellen). */
  variant?: "raised" | "sunken" | "outlined";
  /** `strong` für die wichtigste Karte eines Screens. */
  emphasis?: "subtle" | "default" | "strong";
  padding?: number;
  style?: ViewStyle;
}

/** Weiße Karte mit weichem Schatten - das tragende Element aller Screens. */
export function Card({
  children,
  variant = "raised",
  emphasis = "default",
  padding,
  style,
}: CardProps) {
  const theme = useTheme();

  const surface: ViewStyle =
    variant === "sunken"
      ? { backgroundColor: theme.colors.surfaceSunken }
      : variant === "outlined"
        ? { backgroundColor: "transparent", borderWidth: 1, borderColor: theme.colors.border }
        : { backgroundColor: theme.colors.surface };

  const shadow =
    variant === "raised"
      ? emphasis === "strong"
        ? theme.elevation.cardStrong
        : emphasis === "subtle"
          ? theme.elevation.subtle
          : theme.elevation.card
      : null;

  return (
    <View
      style={[
        {
          borderRadius: theme.radius.card,
          padding: padding ?? theme.spacing.lg,
        },
        surface,
        shadow,
        style,
      ]}
    >
      {children}
    </View>
  );
}
