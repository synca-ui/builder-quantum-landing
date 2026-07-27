import { View } from "react-native";

import { useTheme } from "../../theme";
import { Text } from "./Text";

export interface AvatarProps {
  /** Initialen, z. B. "SB" oder "M". */
  initials: string;
  size?: number;
  /** `ink` für die dunkle Variante im Konto-Kopf, `brand` für Kanal-Farben. */
  variant?: "muted" | "ink";
  /** Überschreibt die Schriftfarbe - Kanal-Logos tragen ihre Markenfarbe. */
  color?: string;
}

/** Kreis mit Initialen. Ersetzt im Design die Profil- und Kanal-Bilder. */
export function Avatar({ initials, size = 44, variant = "muted", color }: AvatarProps) {
  const theme = useTheme();

  const background = variant === "ink" ? theme.colors.inkAction : theme.colors.surfaceSunken;
  const textColor = color ?? (variant === "ink" ? theme.colors.onInkAction : theme.colors.textPrimary);

  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        backgroundColor: background,
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <Text variant="numeric" color={textColor} style={{ fontSize: size * 0.38 }}>
        {initials}
      </Text>
    </View>
  );
}

/** Farbiger Punkt plus Status-Text ("● Verbunden", "● Jetzt geöffnet"). */
export function StatusLabel({ label, color }: { label: string; color: string }) {
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
      <View style={{ width: 7, height: 7, borderRadius: 4, backgroundColor: color }} />
      <Text variant="eyebrow" color={color}>
        {label}
      </Text>
    </View>
  );
}
