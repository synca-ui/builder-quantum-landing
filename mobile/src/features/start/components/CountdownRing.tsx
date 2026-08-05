import { useEffect } from "react";
import Animated, {
  Easing,
  useAnimatedProps,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";
import Svg, { Circle } from "react-native-svg";

import { useTheme } from "../../../theme";

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

export interface CountdownRingProps {
  /** Laufzeit in ms - der Ring läuft in dieser Zeit von voll auf leer. */
  durationMs: number;
  size?: number;
  strokeWidth?: number;
  color?: string;
}

/**
 * Kreisring, der über `durationMs` leerläuft - zeigt die verbleibende Zeit bis eine
 * verzögerte Aktion wirklich rausgeht. Bewusst ein Ring (kein Balken), passend zur
 * Icon-Sprache der App.
 *
 * Läuft auf dem UI-Thread (Reanimated), und das ist hier der springende Punkt: Der Ring
 * ist die längste Animation der App - 7 s beim Freigeben, 15 s im Barrierefrei-Modus -
 * und er läuft ausgerechnet in dem Moment, in dem der Wirt weitertippt und scrollt.
 *
 * Vorher trieb ihn `Animated.timing` mit `useNativeDriver: false`, weil SVG-Props den
 * Native-Driver der alten API nicht nutzen können. Auf dem Simulator gemessen: **417
 * JS-seitige Aktualisierungen in 6 938 ms** für eine einzige Freigabe - jede davon ein
 * Schritt über die JS-Brücke, mitten in der Bedienung. Reanimated kennt diese
 * Einschränkung nicht: `useAnimatedProps` schreibt `strokeDashoffset` direkt im
 * UI-Thread, der JS-Thread hat währenddessen nichts zu tun. Dasselbe Muster nutzt
 * `AnimatedBackground` schon für die Wolken.
 */
export function CountdownRing({ durationMs, size = 22, strokeWidth = 2.4, color }: CountdownRingProps) {
  const theme = useTheme();
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const progress = useSharedValue(0);

  useEffect(() => {
    // Zurücksetzen und neu starten: Beide Zuweisungen landen in der Reihenfolge im
    // UI-Thread, der Ring beginnt also wieder voll.
    progress.value = 0;
    progress.value = withTiming(1, { duration: durationMs, easing: Easing.linear });
  }, [durationMs, progress]);

  const animatedProps = useAnimatedProps(() => ({
    strokeDashoffset: circumference * progress.value,
  }));

  return (
    <Svg width={size} height={size}>
      <Circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        stroke={theme.colors.border}
        strokeWidth={strokeWidth}
        fill="none"
      />
      <AnimatedCircle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        stroke={color ?? theme.colors.primary}
        strokeWidth={strokeWidth}
        fill="none"
        strokeDasharray={`${circumference} ${circumference}`}
        animatedProps={animatedProps}
        strokeLinecap="round"
        transform={`rotate(-90 ${size / 2} ${size / 2})`}
      />
    </Svg>
  );
}
