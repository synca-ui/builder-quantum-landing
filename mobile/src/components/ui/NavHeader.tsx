import { Pressable, View } from "react-native";
import { useRouter, type Href } from "expo-router";

import { useTheme } from "../../theme";
import { useT } from "../../lib/i18n";
import { Text } from "./Text";

export interface NavHeaderProps {
  /** Titel neben dem Zurück-Pfeil. Weglassen für einen reinen Zurück-Button. */
  title?: string;
  /** Nur überschreiben, wenn wirklich nötig - Standard ist `router.back()`. */
  onBack?: () => void;
  /** Element rechts, z. B. „Überspringen". */
  trailing?: React.ReactNode;
  /**
   * Ziel NUR, wenn es keinen Verlauf gibt (Deep-Link/Kaltstart) - dann greift der
   * echte Zurück-Schritt nicht. Statt totem Button gehen wir hierhin (meist der
   * Eltern-Tab des Screens). Im Normalfall (per push erreicht) bleibt es bei back().
   */
  fallback?: Href;
}

/**
 * Einheitliche Kopfzeile mit Zurück-Pfeil für alle Screens, die auf den Stack
 * gepusht werden (Gast-Flow, Journey, Unter-Screens, Modals).
 *
 * Zurück heißt immer „ein Schritt zurück" (`router.back()`) - man landet dort, wo man
 * herkam, nicht auf einem festen Ziel. `onBack` nur setzen, wenn ein Screen wirklich
 * etwas anderes braucht (z. B. eine Aktion beim Verlassen).
 */
export function NavHeader({ title, onBack, trailing, fallback }: NavHeaderProps) {
  const theme = useTheme();
  const router = useRouter();
  const t = useT();

  const handleBack = () => {
    if (onBack) return onBack();
    if (router.canGoBack()) return router.back();
    if (fallback) router.replace(fallback);
  };

  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        gap: theme.spacing.sm,
        minHeight: theme.hitSize.minTouch,
      }}
    >
      <Pressable
        onPress={handleBack}
        accessibilityRole="button"
        accessibilityLabel={t({ de: "Zurück", en: "Back" })}
        hitSlop={12}
        style={({ pressed }) => ({
          width: 40,
          height: 40,
          marginLeft: -6,
          alignItems: "center",
          justifyContent: "center",
          borderRadius: 20,
          opacity: pressed ? 0.55 : 1,
        })}
      >
        <Text variant="numeric" style={{ fontSize: 26, lineHeight: 28, marginTop: -2 }}>
          ‹
        </Text>
      </Pressable>

      {title ? (
        <Text
          variant="sectionTitle"
          accessibilityRole="header"
          style={{ fontSize: 26, lineHeight: 32, flexShrink: 1 }}
          numberOfLines={1}
        >
          {title}
        </Text>
      ) : null}

      {trailing ? <View style={{ marginLeft: "auto" }}>{trailing}</View> : null}
    </View>
  );
}
