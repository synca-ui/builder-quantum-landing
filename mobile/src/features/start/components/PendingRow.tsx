import { Pressable, StyleSheet, View } from "react-native";

import { CheckIcon } from "../../../components/icons";
import { Card } from "../../../components/ui/Card";
import { Text } from "../../../components/ui/Text";
import { useT } from "../../../lib/i18n";
import { useTheme } from "../../../theme";
import { CountdownRing } from "./CountdownRing";

export interface PendingRowProps {
  /** z. B. „Antwort an Marion geht raus". */
  label: string;
  durationMs: number;
  onUndo: () => void;
}

/**
 * Die zusammengeklappte Zeile, während eine Aktion in der Warteschlange steht: Häkchen,
 * Beschreibung, ein leerlaufender Ring und „Rückgängig". Ersetzt die Aufgabenkarte an
 * Ort und Stelle - kein Popup, kein schwebendes Element über der Navigation.
 */
export function PendingRow({ label, durationMs, onUndo }: PendingRowProps) {
  const theme = useTheme();
  const t = useT();

  return (
    <Card emphasis="subtle" padding={0} style={styles.row}>
      <CheckIcon size={18} color={theme.colors.textMuted} />
      <Text variant="bodySm" style={styles.label} numberOfLines={1}>
        {label}
      </Text>
      <CountdownRing durationMs={durationMs} />
      <Pressable
        onPress={onUndo}
        hitSlop={10}
        accessibilityRole="button"
        accessibilityLabel={t({ de: "Rückgängig", en: "Undo" })}
        style={({ pressed }) => ({ opacity: pressed ? 0.6 : 1 })}
      >
        <Text variant="action" tone="accent" style={styles.undo}>
          {t({ de: "Rückgängig", en: "Undo" })}
        </Text>
      </Pressable>
    </Card>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 15,
    paddingHorizontal: 18,
  },
  label: { flex: 1, fontSize: 15 },
  undo: { fontSize: 15, textDecorationLine: "underline" },
});
