import { Pressable, View, type ViewStyle } from "react-native";

import { useTheme } from "../../theme";
import { Text } from "./Text";

export interface ChipProps {
  label: string;
  /** Zweite, kleinere Zeile über dem Label - für Wochentagskürzel ("MI" über "16."). */
  overline?: string;
  selected?: boolean;
  /** Belegt/vergangen: durchgestrichen und ausgegraut, nicht antippbar. */
  unavailable?: boolean;
  onPress?: () => void;
  /** `grow` füllt die Spalte im Grid, `hug` nur den Inhalt. */
  width?: "grow" | "hug";
  style?: ViewStyle;
}

/**
 * Auswahl-Chip aus dem Reservierungs-Screen: Tag, Personenzahl, Uhrzeit, Antwort-Ton.
 * Drei Zustände, alle im Design belegt: frei (Rahmen), gewählt (Teal), belegt (durchgestrichen).
 */
export function Chip({
  label,
  overline,
  selected = false,
  unavailable = false,
  onPress,
  width = "hug",
  style,
}: ChipProps) {
  const theme = useTheme();

  const surface: ViewStyle = selected
    ? { backgroundColor: theme.colors.primary }
    : unavailable
      ? { backgroundColor: theme.colors.surfaceSunken }
      : { borderWidth: 1, borderColor: theme.colors.border };

  const labelColor = selected
    ? theme.colors.onPrimary
    : unavailable
      ? theme.colors.textFaint
      : theme.colors.textPrimary;

  const overlineColor = selected ? theme.colors.onPrimary : theme.colors.textMuted;

  return (
    <Pressable
      onPress={unavailable ? undefined : onPress}
      disabled={unavailable}
      accessibilityRole="button"
      accessibilityLabel={overline ? `${overline} ${label}` : label}
      accessibilityState={{ selected, disabled: unavailable }}
      style={({ pressed }) => [
        {
          borderRadius: theme.radius.control,
          paddingVertical: overline ? 12 : 13,
          paddingHorizontal: width === "grow" ? 0 : 20,
          alignItems: "center",
          justifyContent: "center",
          minHeight: theme.hitSize.minTouch,
          flex: width === "grow" ? 1 : undefined,
          opacity: pressed ? 0.8 : 1,
        },
        surface,
        style,
      ]}
    >
      {overline ? (
        <Text
          variant="eyebrow"
          color={overlineColor}
          style={{ fontSize: 10, opacity: selected ? 0.82 : 1 }}
        >
          {overline}
        </Text>
      ) : null}
      <Text
        variant="numeric"
        color={labelColor}
        style={{
          fontSize: overline ? 19 : 17,
          textDecorationLine: unavailable ? "line-through" : "none",
        }}
      >
        {label}
      </Text>
    </Pressable>
  );
}

/** Nicht antippbares Merkmal-Etikett ("Außenplätze", "★ 4,8 · 128"). */
export function Tag({ label }: { label: string }) {
  const theme = useTheme();
  return (
    <View
      style={{
        backgroundColor: theme.colors.surfaceSunken,
        borderRadius: theme.radius.pill,
        paddingVertical: 7,
        paddingHorizontal: 13,
      }}
    >
      <Text variant="numeric" color={theme.colors.textOnSunken} style={{ fontSize: 12.5 }}>
        {label}
      </Text>
    </View>
  );
}
