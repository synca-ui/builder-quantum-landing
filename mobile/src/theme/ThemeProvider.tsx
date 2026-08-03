import { createContext, useContext, useMemo, type ReactNode } from "react";
import { useColorScheme } from "react-native";

import { glow, palettes, type ColorScheme, type Palette } from "./colors";
import { elevation, hitSize, radius, spacing } from "./layout";
import { createTextStyles, type TextStyles } from "./typography";

export interface Theme {
  scheme: ColorScheme;
  colors: Palette;
  glow: typeof glow;
  text: TextStyles;
  spacing: typeof spacing;
  radius: typeof radius;
  elevation: typeof elevation;
  hitSize: typeof hitSize;
  /** Barrierefrei-Modus aktiv: Kontraste sind angehoben, Bewegung stillgestellt. */
  accessible: boolean;
}

const ThemeContext = createContext<Theme | null>(null);

interface ThemeProviderProps {
  children: ReactNode;
  /** Geladene Schriften; ohne sie fällt die Typografie auf die Systemschrift zurück. */
  fontsLoaded: boolean;
  /**
   * Erzwingt ein Schema. Der "Nachtbar Modus" (Screen 16) setzt hier `dark`,
   * unabhängig von der Systemeinstellung.
   */
  forceScheme?: ColorScheme;
  /**
   * Barrierefrei-Modus: hebt die gedeckten Texttöne auf besseren Kontrast. Standard
   * bleibt designtreu - nur eingeschaltet werden `textMuted`/`textFaint` kräftiger,
   * damit 10,5px-Metadaten WCAG-AA erreichen.
   */
  accessible?: boolean;
}

export function ThemeProvider({
  children,
  fontsLoaded,
  forceScheme,
  accessible = false,
}: ThemeProviderProps) {
  const system = useColorScheme();
  const scheme: ColorScheme = forceScheme ?? (system === "dark" ? "dark" : "light");

  const value = useMemo<Theme>(() => {
    const base = palettes[scheme];
    // Kontrast-Verstärkung: die hellsten Grautöne eine Stufe kräftiger. `textMuted`
    // erbt den dunkleren Sekundärton, `textFaint` den bisherigen `textMuted`.
    const colors = accessible
      ? { ...base, textMuted: base.textSecondary, textFaint: base.textMuted }
      : base;

    return {
      scheme,
      colors,
      glow,
      text: createTextStyles(fontsLoaded),
      spacing,
      radius,
      elevation,
      hitSize,
      accessible,
    };
  }, [scheme, fontsLoaded, accessible]);

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme(): Theme {
  const theme = useContext(ThemeContext);
  if (!theme) throw new Error("useTheme muss innerhalb von <ThemeProvider> aufgerufen werden.");
  return theme;
}
