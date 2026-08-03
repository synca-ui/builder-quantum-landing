import { Platform, type ViewStyle } from "react-native";

/** Abstände. Der Screen-Innenrand ist im Design durchgängig 22-24px. */
export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 28,
  /** Horizontaler Screen-Innenrand. */
  screen: 22,
  /** Freiraum unter dem letzten Element, damit die Tabbar nichts verdeckt. */
  tabBarClearance: 96,
} as const;

/** Eckenradien. Karten 20-24, Chips 12-14, Pills vollrund. */
export const radius = {
  chip: 12,
  control: 14,
  tile: 16,
  card: 20,
  cardLg: 24,
  tabBar: 26,
  pill: 999,
} as const;

/**
 * Schatten. iOS nutzt `shadowColor/Offset/Opacity/Radius`, Android nur `elevation` -
 * beide werden hier gesetzt, damit Karten auf beiden Plattformen abheben.
 */
function shadow(opacity: number, radiusPx: number, offsetY: number, elevation: number): ViewStyle {
  return Platform.select<ViewStyle>({
    ios: {
      shadowColor: "#1C2622",
      shadowOffset: { width: 0, height: offsetY },
      shadowOpacity: opacity,
      shadowRadius: radiusPx,
    },
    android: { elevation },
    default: {},
  })!;
}

export const elevation = {
  /** Kleine Statistik-Kacheln: 0 8px 22px rgba(28,38,34,.05). */
  subtle: shadow(0.05, 11, 4, 2),
  /** Standard-Karte: 0 16px 40px rgba(28,38,34,.08). */
  card: shadow(0.08, 20, 8, 5),
  /** Hervorgehobene Karte: dieselbe Geometrie, kräftiger. */
  cardStrong: shadow(0.1, 20, 8, 7),
  /** Schwebende Tabbar: 0 14px 34px -12px rgba(28,38,34,.28). */
  floating: shadow(0.18, 17, 7, 12),
} as const;

/** Mindesthöhe für Tap-Targets - das Design ist barrierefrei angelegt. */
export const hitSize = {
  minTouch: 44,
  control: 52,
} as const;
