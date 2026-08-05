import { Pressable, View, type ViewStyle } from "react-native";
import type { ReactNode } from "react";

import { useTheme } from "../../theme";
import { Text } from "./Text";

type Variant = "primary" | "ink" | "outline" | "ghost";

export interface PillButtonProps {
  label: string;
  onPress?: () => void;
  variant?: Variant;
  /** `compact` für Aktionen rechts in einer Zeile ("Einplanen", "Öffnen"). */
  size?: "default" | "compact";
  disabled?: boolean;
  icon?: ReactNode;
  style?: ViewStyle;
  accessibilityHint?: string;
  /**
   * Überschreibt die Schriftfarbe. Nötig, wenn der Button auf einer Fläche liegt, die
   * nicht zur Palette des Screens gehört - etwa Mint in einem `DarkPanel`.
   */
  labelColor?: string;
  /** Kleinere Beschriftung für lange Labels in schmalen Spalten (Design: 14px). */
  labelSize?: number;
}

/**
 * Vollrunde Aktionsfläche - im Design die einzige Buttonform.
 * `primary` ist Teal (hell) bzw. Mint (dunkel), `ink` die dunkle Sekundäraktion.
 */
export function PillButton({
  label,
  onPress,
  variant = "primary",
  size = "default",
  disabled = false,
  icon,
  style,
  accessibilityHint,
  labelColor,
  labelSize,
}: PillButtonProps) {
  const theme = useTheme();

  const surfaces: Record<Variant, ViewStyle> = {
    primary: { backgroundColor: theme.colors.primary },
    ink: { backgroundColor: theme.colors.inkAction },
    outline: { borderWidth: 1, borderColor: theme.colors.border, backgroundColor: "transparent" },
    ghost: { backgroundColor: "transparent" },
  };

  const labelColors: Record<Variant, string> = {
    primary: theme.colors.onPrimary,
    ink: theme.colors.onInkAction,
    outline: theme.colors.textPrimary,
    ghost: theme.colors.textPrimary,
  };

  const vertical = size === "compact" ? 13 : 16;
  const horizontal = size === "compact" ? 20 : theme.spacing.xl;

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityHint={accessibilityHint}
      accessibilityState={{ disabled }}
      hitSlop={6}
      style={({ pressed }) => [
        {
          borderRadius: theme.radius.pill,
          paddingVertical: vertical,
          paddingHorizontal: horizontal,
          minHeight: theme.hitSize.minTouch,
          alignItems: "center",
          justifyContent: "center",
          flexDirection: "row",
          gap: theme.spacing.sm,
          opacity: disabled ? 0.45 : pressed ? 0.82 : 1,
        },
        surfaces[variant],
        style,
      ]}
    >
      {icon ? <View>{icon}</View> : null}
      <Text
        variant="action"
        color={labelColor ?? labelColors[variant]}
        numberOfLines={1}
        style={labelSize ? { fontSize: labelSize } : undefined}
      >
        {label}
      </Text>
    </Pressable>
  );
}

/** Unterstrichene Textaktion ("Bearbeiten") neben einem PillButton. */
export function LinkAction({
  label,
  onPress,
  accessibilityHint,
  labelSize,
}: Pick<PillButtonProps, "label" | "onPress" | "accessibilityHint" | "labelSize">) {
  const theme = useTheme();
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityHint={accessibilityHint}
      hitSlop={10}
      style={({ pressed }) => ({
        opacity: pressed ? 0.6 : 1,
        minHeight: theme.hitSize.minTouch,
        justifyContent: "center",
        // Nie schrumpfen: sonst quetscht die Aktion den Text daneben in Wortbrüche.
        flexShrink: 0,
      })}
    >
      <Text
        variant="action"
        numberOfLines={1}
        style={[{ textDecorationLine: "underline" }, labelSize ? { fontSize: labelSize } : null]}
      >
        {label}
      </Text>
    </Pressable>
  );
}
