import { useEffect, useRef, useState } from "react";
import { Animated, StyleSheet } from "react-native";

import { MaitrWordmark } from "./MaitrWordmark";
import { Text } from "./ui/Text";
import { useTheme } from "../theme";

/*
 * Zeitplan der Eröffnung. Die Zahlen sind die eigentliche Aussage dieser Datei,
 * deshalb stehen sie oben - und deshalb hier, warum sie so klein sind.
 *
 * Vorher: ENTER 700, CLAIM_DELAY 320, HOLD 1800, FADE_OUT 460. Der Ablauf ist nicht
 * die Summe dieser Zahlen: Das Einblenden läuft INNERHALB der Standzeit. Sichtbar war
 * das Overlay HOLD + FADE_OUT = 2 260 ms. Zwei Sekunden dritteln sich nicht, wenn man
 * zehnmal am Tag kurz in die App schaut - das sind gut 20 Sekunden pro Tag für eine
 * Animation, die man nach dem dritten Mal kennt, und die App ist dahinter längst fertig.
 *
 * Jetzt: 520 + 240 = 760 ms. Die Wortmarke ist bei 320 ms da, der Claim bei 440 ms,
 * dann steht das Bild kurz und geht. Der Moment bleibt, das Warten nicht.
 */
const ENTER = 320; // Einblenden von Wortmarke + Claim
const CLAIM_DELAY = 120; // Der Claim kommt einen Hauch nach der Wortmarke
const HOLD = 520; // Standzeit, bevor sich das Overlay verabschiedet
const FADE_OUT = 240; // Ausblenden → App wird sichtbar

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
  /**
   * Solange das Overlay deckend ist, dürfen Tipper nicht durchgehen.
   *
   * Es lag bisher komplett auf `pointerEvents="none"`. Das Overlay blockierte also
   * nichts - es verdeckte nur. Wer in dieser Zeit auf die Stelle tippte, an der er die
   * „Freigeben"-Karte vermutet, löste sie blind aus, ohne je gesehen zu haben, was
   * dort steht. Ab dem Ausblenden gibt das Overlay die Fläche frei, damit der erste
   * bewusste Tipper nicht an der halbdurchsichtigen Schicht hängen bleibt.
   */
  const [blocking, setBlocking] = useState(true);

  useEffect(() => {
    Animated.parallel([
      Animated.timing(mark, { toValue: 1, duration: ENTER, useNativeDriver: true }),
      Animated.timing(claim, {
        toValue: 1,
        duration: ENTER,
        delay: CLAIM_DELAY,
        useNativeDriver: true,
      }),
    ]).start();

    const timer = setTimeout(() => {
      setBlocking(false);
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
      pointerEvents={blocking ? "auto" : "none"}
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
