import { useEffect } from "react";
import { StyleSheet, useWindowDimensions } from "react-native";
import Animated, {
  Easing,
  useAnimatedProps,
  useReducedMotion,
  useSharedValue,
  withRepeat,
  withTiming,
} from "react-native-reanimated";
import Svg, { Circle, Defs, RadialGradient, Stop } from "react-native-svg";

import { useTheme } from "../../theme";

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

/**
 * Ruhiger, animierter Hintergrund - weiche Farbwolken, die langsam driften.
 *
 * Ersetzt die statischen `radial-gradient`-Stimmungen aus dem Design (Login, Journey)
 * durch dieselben Töne in Bewegung. Bewusst sehr langsam (18-26 s pro Zyklus) und
 * niedrigkontrastig, damit es die minimalistische Ruhe nicht bricht - Personio-Wellen,
 * nicht Bildschirmschoner.
 *
 * Läuft auf dem UI-Thread (Reanimated), kostet also keine JS-Frames. Bei reduzierter
 * Bewegung (Systemeinstellung) stehen die Wolken still.
 */
export interface AnimatedBackgroundProps {
  /** Grundfläche hinter den Wolken. */
  baseColor: string;
  /** Bei `true` keine Bewegung - respektiert „Bewegung reduzieren". */
  reduceMotion?: boolean;
  /** Deckkraft der Wolken (nicht der Grundfläche). Für „ganz leichte" Screens < 1. */
  cloudOpacity?: number;
}

export function AnimatedBackground({
  baseColor,
  reduceMotion,
  cloudOpacity = 1,
}: AnimatedBackgroundProps) {
  const theme = useTheme();
  const { width, height } = useWindowDimensions();
  const systemReducedMotion = useReducedMotion();
  const still = reduceMotion ?? systemReducedMotion;

  // Drei Wolken driften auf eigenen Bahnen. Ein Fortschritt 0..1 pro Wolke.
  const p1 = useSharedValue(0);
  const p2 = useSharedValue(0);
  const p3 = useSharedValue(0);

  useEffect(() => {
    if (still) return;
    const drift = (sv: typeof p1, duration: number) => {
      sv.value = withRepeat(
        withTiming(1, { duration, easing: Easing.inOut(Easing.sin) }),
        -1,
        true,
      );
    };
    drift(p1, 22000);
    drift(p2, 26000);
    drift(p3, 18000);
  }, [still, p1, p2, p3]);

  // Petrol, Mint und Slate aus der Marke - dieselben Töne wie die Design-Verläufe.
  const clouds = [
    { color: theme.glow.petrol, r: width * 0.7, from: { x: 0.1, y: 0.08 }, to: { x: 0.28, y: 0.22 }, sv: p1 },
    { color: theme.glow.mint, r: width * 0.62, from: { x: 0.92, y: 0.3 }, to: { x: 0.7, y: 0.14 }, sv: p2 },
    { color: theme.glow.slate, r: width * 0.66, from: { x: 0.4, y: 0.95 }, to: { x: 0.58, y: 0.8 }, sv: p3 },
  ];

  return (
    <Svg style={StyleSheet.absoluteFill} pointerEvents="none">
      <Defs>
        {clouds.map((c, i) => (
          <RadialGradient key={i} id={`cloud${i}`} cx="50%" cy="50%" r="50%">
            <Stop offset="0" stopColor={c.color} stopOpacity={1} />
            <Stop offset="1" stopColor={c.color} stopOpacity={0} />
          </RadialGradient>
        ))}
      </Defs>

      {/* Grundfläche */}
      <Circle cx={width / 2} cy={height / 2} r={Math.max(width, height)} fill={baseColor} />

      {clouds.map((c, i) => (
        <Cloud key={i} index={i} width={width} height={height} opacity={cloudOpacity} {...c} />
      ))}
    </Svg>
  );
}

function Cloud({
  index,
  width,
  height,
  r,
  from,
  to,
  sv,
  opacity,
}: {
  index: number;
  width: number;
  height: number;
  r: number;
  from: { x: number; y: number };
  to: { x: number; y: number };
  sv: { value: number };
  opacity: number;
}) {
  const animatedProps = useAnimatedProps(() => ({
    cx: (from.x + (to.x - from.x) * sv.value) * width,
    cy: (from.y + (to.y - from.y) * sv.value) * height,
  }));

  return (
    <AnimatedCircle animatedProps={animatedProps} r={r} fill={`url(#cloud${index})`} opacity={opacity} />
  );
}
