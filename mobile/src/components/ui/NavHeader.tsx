import { Pressable, View } from "react-native";
import { useNavigation, useRouter, type Href } from "expo-router";

import { useTheme } from "../../theme";
import { rueckweg } from "./rueckweg";
import { Text } from "./Text";

export interface NavHeaderProps {
  /** Titel neben dem Zurück-Pfeil. Weglassen für einen reinen Zurück-Button. */
  title?: string;
  /** Nur überschreiben, wenn wirklich nötig - Standard ist `router.back()`. */
  onBack?: () => void;
  /** Element rechts, z. B. „Überspringen". */
  trailing?: React.ReactNode;
  /**
   * Der fachliche Elternbildschirm - wohin „zurück" gehört, wenn der Nutzer
   * NICHT von dort gekommen ist.
   *
   * Früher hieß das „Ziel, wenn es keinen Verlauf gibt", und genau daran ging es
   * vorbei: `app/_layout.tsx` setzt `unstable_settings.initialRouteName: "(tabs)"`.
   * Das ist ein ANKER - öffnet die App direkt auf einem gepushten Bildschirm
   * (Deep-Link, Kaltstart, Benachrichtigung), legt expo-router `(tabs)` darunter
   * in den Stack, und `(tabs)` ankert seinerseits auf `start`. `canGoBack()` sagt
   * dann `true`, dieser Ersatzweg wurde nie gefragt, und der Zurück-Pfeil führte
   * auf die STARTSEITE statt zum Elternbildschirm: aus der Detailansicht einer
   * Stempelkarte nicht zur Kartenliste, aus einem Kanal nicht zu „Deine Kanäle".
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
  const navigation = useNavigation();

  const handleBack = () => {
    if (onBack) return onBack();

    // `getState()` ist optional und je nach Navigator nicht gesetzt - dann bleibt
    // die Tiefe unbekannt, und `rueckweg` entscheidet bewusst wie bisher.
    const state = (
      navigation as { getState?: () => { routes?: unknown[] } | undefined }
    ).getState?.();
    const tiefe = state?.routes?.length;

    // Die Entscheidung selbst liegt in `rueckweg` und ist dort geprüft; hier
    // steht nur ihre Ausführung.
    switch (
      rueckweg({
        hatEltern: fallback !== undefined,
        kannZurueck: router.canGoBack(),
        stapeltiefe: typeof tiefe === "number" ? tiefe : null,
      })
    ) {
      case "eltern":
        return router.replace(fallback!);
      case "zurueck":
        return router.back();
      case "nichts":
        return;
    }
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
        accessibilityLabel="Zurück"
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
