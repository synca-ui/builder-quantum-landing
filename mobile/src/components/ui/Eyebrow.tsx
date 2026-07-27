import type { TextProps } from "./Text";
import { Text } from "./Text";

/**
 * Die kleine Großbuchstaben-Zeile über fast jedem Block
 * ("BEWERTUNG · 2 MIN", "MITTWOCH, 16. JULI").
 */
export function Eyebrow({ variant = "eyebrow", tone = "muted", ...rest }: TextProps) {
  return <Text variant={variant} tone={tone} {...rest} />;
}
