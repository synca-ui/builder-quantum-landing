import { useRef, type ReactNode } from "react";
import { Animated, Dimensions, PanResponder, StyleSheet, View } from "react-native";

import { useTheme } from "../../theme";
import { useT } from "../../lib/i18n";
import { Text } from "./Text";

const SCREEN_W = Dimensions.get("window").width;
const THRESHOLD = 96; // ab hier gilt der Wisch als „löschen"

export interface SwipeToDeleteProps {
  children: ReactNode;
  onDelete: () => void;
  /** Muss zum Radius des Inhalts passen, damit die rote Fläche nicht übersteht. */
  radius?: number;
  label?: string;
}

/**
 * Nach links wischen → löschen. Bewusst mit `PanResponder` + nativer `Animated`-API
 * (kein Reanimated/Gesture-Handler nötig): horizontal-dominante Linkswische werden
 * beansprucht, vertikales Scrollen bleibt beim ScrollView. Über der Schwelle gleitet
 * der Inhalt raus und `onDelete` entfernt ihn; darunter federt er zurück.
 */
export function SwipeToDelete({ children, onDelete, radius = 20, label }: SwipeToDeleteProps) {
  const theme = useTheme();
  const t = useT();
  const resolvedLabel = label ?? t({ de: "Löschen", en: "Delete" });
  const translateX = useRef(new Animated.Value(0)).current;
  const onDeleteRef = useRef(onDelete);
  onDeleteRef.current = onDelete;

  const pan = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_e, g) => g.dx < -8 && Math.abs(g.dx) > Math.abs(g.dy) * 1.5,
      onPanResponderMove: (_e, g) => {
        if (g.dx < 0) translateX.setValue(g.dx);
      },
      onPanResponderRelease: (_e, g) => {
        if (g.dx < -THRESHOLD) {
          Animated.timing(translateX, {
            toValue: -SCREEN_W,
            duration: 180,
            useNativeDriver: true,
          }).start(() => onDeleteRef.current());
        } else {
          Animated.spring(translateX, { toValue: 0, useNativeDriver: true, bounciness: 0 }).start();
        }
      },
      onPanResponderTerminate: () => {
        Animated.spring(translateX, { toValue: 0, useNativeDriver: true, bounciness: 0 }).start();
      },
    }),
  ).current;

  return (
    <View>
      <View
        pointerEvents="none"
        style={[styles.bg, { backgroundColor: theme.colors.destructive, borderRadius: radius }]}
      >
        <Text variant="action" color={theme.colors.onPrimary} style={styles.label}>
          {resolvedLabel}
        </Text>
      </View>
      <Animated.View style={{ transform: [{ translateX }] }} {...pan.panHandlers}>
        {children}
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  bg: {
    position: "absolute",
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
    justifyContent: "center",
    alignItems: "flex-end",
    paddingRight: 26,
  },
  label: { fontSize: 15 },
});
