import { View, type ViewStyle } from "react-native";
import Svg, { Circle } from "react-native-svg";

import { useTheme } from "../../theme";
import { Card } from "./Card";
import { Eyebrow } from "./Eyebrow";
import { Text } from "./Text";

export interface StatTileProps {
  label: string;
  value: string;
  /** Veränderung zum Vormonat, z. B. "+18 % vs. Juni". */
  delta?: string;
  /** `up` färbt grün, `flat` bleibt gedeckt. */
  trend?: "up" | "flat";
}

/** Kennzahl-Kachel des Monatsrückblicks: Label, große Zahl, Veränderung. */
export function StatTile({ label, value, delta, trend = "up" }: StatTileProps) {
  const theme = useTheme();

  return (
    <Card emphasis="default" padding={18} style={{ flex: 1, borderRadius: theme.radius.tile }}>
      <Eyebrow>{label}</Eyebrow>
      <Text variant="numeric" style={{ fontSize: 32, lineHeight: 35, marginVertical: 4 }}>
        {value}
      </Text>
      {delta ? (
        <Eyebrow
          color={trend === "up" ? theme.colors.success : theme.colors.textMuted}
          style={{ fontSize: 10, letterSpacing: 0.4 }}
        >
          {trend === "up" ? "▲ " : ""}
          {delta}
        </Eyebrow>
      ) : null}
    </Card>
  );
}

export interface BarChartProps {
  /** Ein Eintrag pro Balken; `value` ist relativ, nicht absolut. */
  data: { label: string; value: number }[];
  /** Index des hervorgehobenen Balkens - im Design der laufende Monat. */
  highlightIndex?: number;
  height?: number;
}

/**
 * Balkendiagramm ohne Achsen, wie im Design: sechs Monate, letzter Balken in Teal.
 * Reine Views statt SVG - bei sechs Rechtecken ist das leichter und schärfer.
 */
export function BarChart({ data, highlightIndex, height = 104 }: BarChartProps) {
  const theme = useTheme();
  const max = Math.max(...data.map((d) => d.value), 1);

  return (
    <View style={{ gap: 14 }}>
      <View style={{ flexDirection: "row", alignItems: "flex-end", gap: 12, height }}>
        {data.map((bar, index) => (
          <View
            key={bar.label + index}
            style={{
              flex: 1,
              height: Math.max(8, (bar.value / max) * height),
              borderRadius: 8,
              backgroundColor:
                index === highlightIndex ? theme.colors.primary : theme.colors.surfaceTrack,
            }}
            accessibilityLabel={`${bar.label}: ${bar.value}`}
          />
        ))}
      </View>
      <View style={{ flexDirection: "row", gap: 12 }}>
        {data.map((bar, index) => (
          <Text
            key={bar.label + index}
            variant="numeric"
            color={index === highlightIndex ? theme.colors.primary : theme.colors.textFaint}
            style={{ flex: 1, fontSize: 12, textAlign: "center" }}
          >
            {bar.label}
          </Text>
        ))}
      </View>
    </View>
  );
}

export interface ScoreRingProps {
  /** Erreichter Wert. */
  score: number;
  max?: number;
  size?: number;
}

/**
 * Ringdiagramm des Präsenzscores (Screen 10).
 * `strokeDasharray`/`-offset` bilden den Füllstand ab; gedreht um -90°, damit
 * der Ring oben beginnt.
 */
export function ScoreRing({ score, max = 100, size = 186 }: ScoreRingProps) {
  const theme = useTheme();

  const strokeWidth = 13;
  const radius = size / 2 - strokeWidth / 2 - 8;
  const circumference = 2 * Math.PI * radius;
  const filled = Math.max(0, Math.min(1, score / max));

  return (
    <View
      style={{ width: size, height: size, alignItems: "center", justifyContent: "center" }}
      accessibilityRole="progressbar"
      accessibilityLabel={`Präsenzscore ${score} von ${max}`}
      accessibilityValue={{ min: 0, max, now: score }}
    >
      <Svg width={size} height={size} style={{ position: "absolute" }}>
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={theme.colors.surfaceTrack}
          strokeWidth={strokeWidth}
        />
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={theme.colors.accent}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={circumference * (1 - filled)}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
      </Svg>
      <Text variant="numeric" style={{ fontSize: 50, lineHeight: 52 }}>
        {score}
      </Text>
      <Eyebrow variant="eyebrowLg" style={{ marginTop: 2 }}>
        von {max}
      </Eyebrow>
    </View>
  );
}

/** Sternreihe. Nicht gefüllte Sterne bleiben als Platzhalter sichtbar. */
export function Stars({
  rating,
  max = 5,
  size = 14,
  color,
}: {
  rating: number;
  max?: number;
  size?: number;
  color?: string;
}) {
  const theme = useTheme();
  const filled = Math.round(rating);

  return (
    <Text
      style={{ fontSize: size, letterSpacing: 2 }}
      accessibilityLabel={`${rating} von ${max} Sternen`}
    >
      <Text color={color ?? theme.colors.accent} style={{ fontSize: size, letterSpacing: 2 }}>
        {"★".repeat(filled)}
      </Text>
      <Text color={theme.colors.border} style={{ fontSize: size, letterSpacing: 2 }}>
        {"★".repeat(Math.max(0, max - filled))}
      </Text>
    </Text>
  );
}

/**
 * Dunkler Block auf hellem Grund - im Design der Aufmerksamkeitsanker
 * (Abo-Karte, Empfehlungs-Karte, "1 wartet auf Antwort").
 */
export function DarkPanel({
  children,
  style,
}: {
  children: React.ReactNode;
  style?: ViewStyle;
}) {
  const theme = useTheme();

  return (
    <View
      style={[
        {
          // Fester Ton: der Block bleibt dunkel, auch im Dunkelmodus-Screen.
          backgroundColor: "#202A26",
          borderRadius: theme.radius.card,
          padding: theme.spacing.xl,
        },
        style,
      ]}
    >
      {children}
    </View>
  );
}

/**
 * Farben für Inhalte in `DarkPanel` - dort gilt die Palette des Screens nicht.
 * `meta` gegenüber dem Design (#7D8E86 ≈ 4,3:1) aufgehellt, damit die kleinen
 * Metadaten-Zeilen auf dem dunklen Panel WCAG-AA (≥ 4,5:1) erreichen.
 */
export const onDarkPanel = {
  title: "#ECF3F0",
  body: "#9FB0A8",
  bodyStrong: "#B9C7C0",
  meta: "#98A9A1",
  accent: "#6FBFAE",
  onAccent: "#17211D",
} as const;
