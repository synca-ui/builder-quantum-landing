import { Pressable, View } from "react-native";

import { useTheme } from "../../theme";

export interface ToggleProps {
  value: boolean;
  onValueChange?: (value: boolean) => void;
  accessibilityLabel: string;
}

/**
 * Schalter, 44x26 mit 20px-Knauf - Maße aus dem Design.
 *
 * Absichtlich nicht React Natives `Switch`: der sieht auf iOS und Android je nach
 * Plattform anders aus und würde die Markenfarbe verlassen.
 */
export function Toggle({ value, onValueChange, accessibilityLabel }: ToggleProps) {
  const theme = useTheme();

  return (
    <Pressable
      onPress={() => onValueChange?.(!value)}
      accessibilityRole="switch"
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ checked: value }}
      hitSlop={10}
      style={({ pressed }) => ({
        width: 44,
        height: 26,
        borderRadius: theme.radius.pill,
        backgroundColor: value ? theme.colors.primary : theme.colors.border,
        justifyContent: "center",
        opacity: pressed ? 0.8 : 1,
      })}
    >
      <View
        style={{
          position: "absolute",
          top: 3,
          left: value ? undefined : 3,
          right: value ? 3 : undefined,
          width: 20,
          height: 20,
          borderRadius: 10,
          backgroundColor: "#FFFFFF",
        }}
      />
    </Pressable>
  );
}
