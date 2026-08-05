import { Text as RNText, type TextProps as RNTextProps, type TextStyle } from "react-native";

import { useTheme } from "../../theme";
import type { TextStyles } from "../../theme";

type Variant = keyof TextStyles;
type ColorToken = "primary" | "secondary" | "muted" | "faint" | "accent" | "onPrimary" | "onDark";

export interface TextProps extends RNTextProps {
  variant?: Variant;
  /** Semantisches Farbtoken statt Hex - hält Hell-/Dunkelmodus konsistent. */
  tone?: ColorToken;
  /** Freie Farbe, wenn kein Token passt (z. B. Statusfarben). */
  color?: string;
}

/**
 * Zentrale Textkomponente. Sie ist der einzige Ort, an dem `fontFamily` gesetzt wird -
 * so kann kein Screen versehentlich auf die Systemschrift zurückfallen.
 */
export function Text({
  variant = "body",
  tone = "primary",
  color,
  style,
  ...rest
}: TextProps) {
  const theme = useTheme();

  const toneColor: Record<ColorToken, string> = {
    primary: theme.colors.textPrimary,
    secondary: theme.colors.textSecondary,
    muted: theme.colors.textMuted,
    faint: theme.colors.textFaint,
    accent: theme.colors.primary,
    onPrimary: theme.colors.onPrimary,
    onDark: theme.colors.onInkAction,
  };

  const base = theme.text[variant] as TextStyle;

  // Dynamic Type: Text wächst mit der OS-Textgröße (Barrierefreiheit), aber gedeckelt,
  // damit die dichten Layouts nicht zerbrechen. Aufrufer können beides überschreiben.
  return (
    <RNText
      allowFontScaling
      maxFontSizeMultiplier={1.8}
      style={[base, { color: color ?? toneColor[tone] }, style]}
      {...rest}
    />
  );
}

export interface EmphasisProps extends RNTextProps {
  /** Übernimmt Größe und Laufweite dieser Rolle - aber nicht deren Schriftschnitt. */
  variant?: Variant;
  tone?: ColorToken;
}

/**
 * Kursive Hervorhebung für Betriebsnamen ("Café Goldstück").
 * Im Design über `font-style:italic` + `font-feature-settings:'ss01','salt'` gelöst;
 * die Feature-Settings bringt der Italic-Schnitt selbst mit.
 *
 * `fontFamily` der Variante wird bewusst verworfen - sonst überschriebe der aufrechte
 * Schnitt die Kursive, und die Hervorhebung wäre unsichtbar.
 */
export function Emphasis({ variant, tone = "primary", style, ...rest }: EmphasisProps) {
  const theme = useTheme();
  const { fontFamily: _upright, ...metrics } = variant
    ? (theme.text[variant] as TextStyle)
    : ({} as TextStyle);

  const toneColor = tone === "accent" ? theme.colors.primary : theme.colors.textPrimary;

  return (
    <RNText
      allowFontScaling
      maxFontSizeMultiplier={1.8}
      style={[metrics, theme.text.emphasis, { color: toneColor }, style]}
      {...rest}
    />
  );
}
