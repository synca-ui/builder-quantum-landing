import { Text as RNText } from "react-native";

import { useTheme } from "../theme";

export interface MaitrWordmarkProps {
  size?: number;
}

/**
 * "Maitr." - der Punkt trägt die Markenfarbe und ist Teil der Wortmarke,
 * nicht Satzzeichen. Deshalb eine eigene Komponente statt loser Strings.
 *
 * Hell/Dunkel regelt die Palette: `primary` ist im Hellmodus Teal, im Dunkelmodus Mint.
 */
export function MaitrWordmark({ size = 26 }: MaitrWordmarkProps) {
  const theme = useTheme();
  const wordColor = theme.colors.textPrimary;
  const dotColor = theme.colors.primary;

  return (
    <RNText
      accessibilityRole="header"
      accessibilityLabel="Maitr"
      style={[
        theme.text.screenTitle,
        { fontSize: size, lineHeight: size * 1.1, letterSpacing: -size * 0.03, color: wordColor },
      ]}
    >
      Maitr
      <RNText style={{ color: dotColor }}>.</RNText>
    </RNText>
  );
}
