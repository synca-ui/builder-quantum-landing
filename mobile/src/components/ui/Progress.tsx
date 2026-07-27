import { View } from "react-native";

import { useTheme } from "../../theme";
import { useT } from "../../lib/i18n";
import { Text } from "./Text";

export interface StepDotsProps {
  current: number;
  total: number;
  /** Zählerbeschriftung rechts, z. B. "3 / 7". Weglassen für reine Punktleiste. */
  showCounter?: boolean;
}

/** Segmentierte Fortschrittsleiste der Journey - ein Balken pro Schritt. */
export function StepDots({ current, total, showCounter = true }: StepDotsProps) {
  const theme = useTheme();
  const t = useT();

  return (
    <View
      style={{ flexDirection: "row", alignItems: "center", gap: 10 }}
      accessibilityRole="progressbar"
      accessibilityValue={{ min: 1, max: total, now: current }}
      accessibilityLabel={t({ de: `Schritt ${current} von ${total}`, en: `Step ${current} of ${total}` })}
    >
      <View style={{ flex: 1, flexDirection: "row", gap: 5 }}>
        {Array.from({ length: total }, (_, index) => (
          <View
            key={index}
            style={{
              flex: 1,
              height: 5,
              borderRadius: theme.radius.pill,
              backgroundColor:
                index < current ? theme.colors.primary : theme.colors.trackInactive,
            }}
          />
        ))}
      </View>
      {showCounter ? (
        <Text variant="eyebrowLg" tone="secondary" style={{ textTransform: "none" }}>
          {current} / {total}
        </Text>
      ) : null}
    </View>
  );
}

/** Durchgehender Balken mit Prozentfüllung - Onboarding-Variante (Screen 15). */
export function ProgressBar({ current, total }: { current: number; total: number }) {
  const theme = useTheme();
  const ratio = Math.max(0, Math.min(1, current / total));

  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
      <View
        style={{
          flex: 1,
          height: 6,
          borderRadius: theme.radius.pill,
          backgroundColor: theme.colors.trackInactive,
          overflow: "hidden",
        }}
        accessibilityRole="progressbar"
        accessibilityValue={{ min: 0, max: total, now: current }}
      >
        <View
          style={{
            width: `${ratio * 100}%`,
            height: "100%",
            borderRadius: theme.radius.pill,
            backgroundColor: theme.colors.primary,
          }}
        />
      </View>
      <Text variant="eyebrowLg" tone="secondary" style={{ textTransform: "none" }}>
        {current} / {total}
      </Text>
    </View>
  );
}
