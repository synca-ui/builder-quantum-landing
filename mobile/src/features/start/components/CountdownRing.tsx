import { useEffect, useRef } from "react";
import { Animated, Easing } from "react-native";
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
 * Icon-Sprache der App. Nutzt die native `Animated`-API (kein Worklets-Plugin nötig).
 */
export function CountdownRing({ durationMs, size = 22, strokeWidth = 2.4, color }: CountdownRingProps) {
  const theme = useTheme();
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const progress = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    progress.setValue(0);
    Animated.timing(progress, {
      toValue: 1,
      duration: durationMs,
      easing: Easing.linear,
      useNativeDriver: false, // SVG-Props laufen nicht über den Native-Driver.
    }).start();
  }, [durationMs, progress]);

  const strokeDashoffset = progress.interpolate({
    inputRange: [0, 1],
    outputRange: [0, circumference],
  });

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
        strokeDashoffset={strokeDashoffset}
        strokeLinecap="round"
        transform={`rotate(-90 ${size / 2} ${size / 2})`}
      />
    </Svg>
  );
}
