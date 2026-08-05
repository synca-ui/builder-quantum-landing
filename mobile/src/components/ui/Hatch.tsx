import { View } from "react-native";
import Svg, { Defs, Line, Pattern, Rect } from "react-native-svg";

export interface HatchProps {
  /** Farbe der Schraffurlinien. */
  color: string;
  /** Flächenfarbe hinter den Linien; `transparent` lässt den Untergrund durch. */
  background?: string;
  spacing?: number;
  strokeWidth?: number;
  borderRadius?: number;
}

/**
 * Diagonale Schraffur - im Design `repeating-linear-gradient(-45deg, …)`,
 * das React Native nicht kennt. Ein SVG-`<Pattern>` liefert dasselbe Bild und
 * skaliert mit der Fläche.
 *
 * Verwendung: Puffer zwischen Reservierungen und gesperrte Tische.
 */
export function Hatch({
  color,
  background = "transparent",
  spacing = 8,
  strokeWidth = 4,
  borderRadius = 0,
}: HatchProps) {
  return (
    <View
      style={{ ...StyleSheetAbsoluteFill, borderRadius, overflow: "hidden" }}
      pointerEvents="none"
    >
      <Svg width="100%" height="100%">
        <Defs>
          <Pattern
            id="hatch"
            width={spacing}
            height={spacing}
            patternUnits="userSpaceOnUse"
            patternTransform="rotate(-45)"
          >
            <Rect width={spacing} height={spacing} fill={background} />
            <Line
              x1="0"
              y1="0"
              x2="0"
              y2={spacing}
              stroke={color}
              strokeWidth={strokeWidth}
            />
          </Pattern>
        </Defs>
        <Rect width="100%" height="100%" fill="url(#hatch)" />
      </Svg>
    </View>
  );
}

const StyleSheetAbsoluteFill = {
  position: "absolute" as const,
  top: 0,
  left: 0,
  right: 0,
  bottom: 0,
};
