import { Pressable, View } from "react-native";

import { useTheme } from "../../theme";
import { Text } from "./Text";

export interface ScreenHeaderProps {
  title: string;
  /** Rechts stehende Zeitraum-Pille, z. B. "MI 16. JULI", "KW 29", "2026". */
  period?: string;
  onPrevious?: () => void;
  onNext?: () => void;
  /** Freies Element rechts statt der Pille. */
  trailing?: React.ReactNode;
}

/**
 * Kopfzeile der Betriebs-Screens: großer Titel links, Zeitraum-Blätterer rechts.
 *
 * Im Design sind die Pfeile Teil des Textes ("‹ MI 16. JULI ›"). Hier sind es echte
 * Pressables - sonst gäbe es keine Tap-Fläche und keinen Screenreader-Hinweis.
 */
export function ScreenHeader({
  title,
  period,
  onPrevious,
  onNext,
  trailing,
}: ScreenHeaderProps) {
  const theme = useTheme();

  return (
    <View
      style={{
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        gap: theme.spacing.md,
      }}
    >
      <Text
        variant="screenTitle"
        accessibilityRole="header"
        style={{ fontSize: 33, lineHeight: 36, flexShrink: 1 }}
      >
        {title}
      </Text>

      {trailing}

      {period ? (
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            backgroundColor: theme.colors.surface,
            borderWidth: 1,
            borderColor: theme.colors.border,
            borderRadius: theme.radius.pill,
            paddingHorizontal: 4,
          }}
        >
          <Arrow direction="previous" onPress={onPrevious} />
          <Text
            variant="eyebrow"
            tone="secondary"
            style={{ fontSize: 12, letterSpacing: 0.36, paddingHorizontal: 2 }}
          >
            {period}
          </Text>
          <Arrow direction="next" onPress={onNext} />
        </View>
      ) : null}
    </View>
  );
}

function Arrow({
  direction,
  onPress,
}: {
  direction: "previous" | "next";
  onPress?: () => void;
}) {
  const theme = useTheme();

  return (
    <Pressable
      onPress={onPress}
      disabled={!onPress}
      accessibilityRole="button"
      accessibilityLabel={direction === "previous" ? "Zurück" : "Weiter"}
      hitSlop={8}
      style={({ pressed }) => ({
        width: 26,
        height: 38,
        alignItems: "center",
        justifyContent: "center",
        opacity: onPress ? (pressed ? 0.5 : 1) : 0.35,
      })}
    >
      <Text variant="numeric" tone="secondary" style={{ fontSize: 15 }}>
        {direction === "previous" ? "‹" : "›"}
      </Text>
    </Pressable>
  );
}
