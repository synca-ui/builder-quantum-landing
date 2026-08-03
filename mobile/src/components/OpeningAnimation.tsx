import { useEffect, useRef } from "react";
import { Animated, StyleSheet } from "react-native";

import { MaitrWordmark } from "./MaitrWordmark";
import { Text } from "./ui/Text";
import { useTheme } from "../theme";

const ENTER = 700; // Einblenden von Wortmarke + Claim
const HOLD = 1800; // Standzeit, bevor sich das Overlay verabschiedet
const FADE_OUT = 460; // Ausblenden → App wird sichtbar

/**
 * Eröffnungsanimation beim App-Start: „Maitr." mit dem Claim „Der digitale Gastgeber
 * für Gastronomie". Liegt als Overlay über dem Navigator und blendet sich nach einem
 * kurzen Moment weich aus.
 *
 * Der Hintergrund ist `canvasQuiet` - dieselbe Farbe wie der native Splash
 * (`app.json` splash), damit der Übergang Splash → Animation → App nahtlos ist und
 * nichts aufblitzt. Spielt einmal pro Kaltstart (der Navigator bleibt danach montiert).
 *
 * Bewusst mit der nativen `Animated`-API (nicht Reanimated): so ist die Intro
 * unabhängig vom Worklets-Babel-Plugin und läuft in jedem Build zuverlässig.
 */
export function OpeningAnimation({ onDone }: { onDone: () => void }) {
  const theme = useTheme();

  const overlay = useRef(new Animated.Value(1)).current;
  const mark = useRef(new Animated.Value(0)).current;
  const claim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(mark, { toValue: 1, duration: ENTER, useNativeDriver: true }),
      Animated.timing(claim, { toValue: 1, duration: ENTER, delay: 320, useNativeDriver: true }),
    ]).start();

    const timer = setTimeout(() => {
      Animated.timing(overlay, {
        toValue: 0,
        duration: FADE_OUT,
        useNativeDriver: true,
      }).start(({ finished }) => {
        if (finished) onDone();
      });
    }, HOLD);

    return () => clearTimeout(timer);
    // Bewusst nur beim Mounten.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const markTranslate = mark.interpolate({ inputRange: [0, 1], outputRange: [14, 0] });

  return (
    <Animated.View
      pointerEvents="none"
      style={[
        StyleSheet.absoluteFill,
        styles.container,
        { backgroundColor: theme.colors.canvasQuiet, opacity: overlay },
      ]}
    >
      <Animated.View style={{ opacity: mark, transform: [{ translateY: markTranslate }] }}>
        <MaitrWordmark size={56} />
      </Animated.View>
      <Animated.View style={[styles.claimWrap, { opacity: claim }]}>
        <Text variant="eyebrow" tone="muted" style={styles.claim}>
          Der digitale Gastgeber für Gastronomie
        </Text>
      </Animated.View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: { alignItems: "center", justifyContent: "center", gap: 18 },
  claimWrap: { maxWidth: 250 },
  claim: { textAlign: "center", fontSize: 11, letterSpacing: 1.5, lineHeight: 17 },
});
