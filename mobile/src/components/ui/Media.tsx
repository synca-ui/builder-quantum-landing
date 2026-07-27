import { Pressable, StyleSheet, View, type ViewStyle } from "react-native";
import Svg, { Defs, LinearGradient, Rect, Stop } from "react-native-svg";

import { PlusIcon } from "../icons";
import { useTheme } from "../../theme";
import { useT } from "../../lib/i18n";
import { Text } from "./Text";

/**
 * Farbverlauf-Platzhalter für Bilder. Das Design zeigt an diesen Stellen noch keine
 * echten Fotos, sondern warme Flächen - hier als lineare Verläufe nachgebaut.
 *
 * Sobald echte Bilder da sind, wird daraus ein `<Image>` mit denselben Maßen.
 */
const TONES = {
  /** Sand/Salbei - Titelbilder, Hausröstung. */
  warm: ["#EFE3D4", "#E7EFE9"],
  /** Honig - Gebäck, Zimtschnecken. */
  honey: ["#F3D9B6", "#EFE7D6"],
  /** Kühl - Titelbild des öffentlichen Profils. */
  cool: ["#EFE3D4", "#D9E6DE"],
} as const;

export type MediaTone = keyof typeof TONES;

export interface PhotoTileProps {
  tone?: MediaTone;
  size?: number;
  /** Füllt die Breite statt einer festen Größe. */
  fill?: boolean;
  radius?: number;
  /** Beschriftung in der Mitte, z. B. "foto" oder "Titelbild". */
  caption?: string;
  style?: ViewStyle;
}

export function PhotoTile({
  tone = "warm",
  size = 74,
  fill = false,
  radius,
  caption,
  style,
}: PhotoTileProps) {
  const theme = useTheme();
  const [from, to] = TONES[tone];

  return (
    <View
      style={[
        {
          width: fill ? undefined : size,
          height: fill ? undefined : size,
          flex: fill ? 1 : undefined,
          borderRadius: radius ?? theme.radius.tile,
          backgroundColor: from,
          alignItems: "center",
          justifyContent: "center",
          overflow: "hidden",
        },
        style,
      ]}
      accessible={false}
    >
      {/* Echter 135°-Verlauf wie im Design (`linear-gradient(135deg, …)`). */}
      <Svg width="100%" height="100%" style={StyleSheet.absoluteFill} pointerEvents="none">
        <Defs>
          <LinearGradient id="photoTile" x1="0" y1="0" x2="1" y2="1">
            <Stop offset="0" stopColor={from} />
            <Stop offset="1" stopColor={to} />
          </LinearGradient>
        </Defs>
        <Rect width="100%" height="100%" fill="url(#photoTile)" />
      </Svg>
      {caption ? (
        <Text variant="eyebrow" color="#B0A490" style={{ fontSize: 10, letterSpacing: 0.4 }}>
          {caption}
        </Text>
      ) : null}
    </View>
  );
}

/** Gestrichelter Rahmen mit Plus - "Foto hinzufügen" (Screen 24). */
export function AddPhotoTile({ onPress }: { onPress?: () => void }) {
  const theme = useTheme();
  const t = useT();

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={t({ de: "Foto hinzufügen", en: "Add photo" })}
      style={({ pressed }) => ({
        flex: 1,
        aspectRatio: 1,
        borderRadius: theme.radius.control,
        borderWidth: 1.5,
        borderStyle: "dashed",
        borderColor: theme.colors.borderStrong,
        alignItems: "center",
        justifyContent: "center",
        opacity: pressed ? 0.6 : 1,
      })}
    >
      <PlusIcon size={22} color={theme.colors.textFaint} />
    </Pressable>
  );
}

/** Eingelassener Hinweistext ohne Karte - im Design `#ECF3F0` mit 16px-Radius. */
export function Banner({ children }: { children: React.ReactNode }) {
  const theme = useTheme();

  return (
    <View
      style={{
        backgroundColor: theme.colors.surfaceSunken,
        borderRadius: theme.radius.tile,
        paddingVertical: 14,
        paddingHorizontal: 18,
      }}
    >
      <Text variant="bodySm" tone="secondary" style={{ fontSize: 14.5, lineHeight: 21 }}>
        {children}
      </Text>
    </View>
  );
}
