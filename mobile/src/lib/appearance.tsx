import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";

import type { ColorScheme } from "../theme";

interface Appearance {
  /** Nachtbar-Modus: erzwingt die dunkle Palette und den Abend-Screen. */
  nightMode: boolean;
  toggleNightMode: () => void;
  /** `undefined` heißt: Systemeinstellung entscheidet. */
  forcedScheme: ColorScheme | undefined;
  /**
   * Barrierefrei-Modus (Screen 12 Schalter): hebt die Kontraste der gedeckten Text-
   * töne auf AA-Niveau und stellt den animierten Hintergrund still. Der Standard bleibt
   * bewusst designtreu; die Verstärkung ist opt-in.
   */
  accessibleMode: boolean;
  toggleAccessibleMode: () => void;
}

const AppearanceContext = createContext<Appearance | null>(null);

/**
 * Steuert Nachtbar- und Barrierefrei-Modus aus dem Design (Screen 12).
 *
 * Liegt über dem ThemeProvider, weil er dessen `forceScheme` und Kontrast-Verstärkung
 * setzt - und getrennt vom Theme, damit Screens die Modi umschalten können, ohne das
 * Theme zu kennen.
 */
export function AppearanceProvider({ children }: { children: ReactNode }) {
  const [nightMode, setNightMode] = useState(false);
  const [accessibleMode, setAccessibleMode] = useState(false);

  const toggleNightMode = useCallback(() => setNightMode((on) => !on), []);
  const toggleAccessibleMode = useCallback(() => setAccessibleMode((on) => !on), []);

  const value = useMemo<Appearance>(
    () => ({
      nightMode,
      toggleNightMode,
      forcedScheme: nightMode ? "dark" : undefined,
      accessibleMode,
      toggleAccessibleMode,
    }),
    [nightMode, toggleNightMode, accessibleMode, toggleAccessibleMode],
  );

  return <AppearanceContext.Provider value={value}>{children}</AppearanceContext.Provider>;
}

export function useAppearance(): Appearance {
  const value = useContext(AppearanceContext);
  if (!value) throw new Error("useAppearance muss innerhalb von <AppearanceProvider> stehen.");
  return value;
}
