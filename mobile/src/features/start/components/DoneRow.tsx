import { Pressable, StyleSheet } from "react-native";

import { CheckIcon } from "../../../components/icons";
import { Card } from "../../../components/ui/Card";
import { Eyebrow } from "../../../components/ui/Eyebrow";
import { Text } from "../../../components/ui/Text";
import { useTheme } from "../../../theme";

export interface DoneRowProps {
  /** z. B. „Veröffentlicht". */
  label: string;
  /** z. B. „9:41". */
  time: string;
  actionLabel?: string;
  onAction?: () => void;
  /** Ausgegraut (z. B. gelöschte/bearbeitete Einträge) statt Erfolgsgrün. */
  muted?: boolean;
}

/**
 * Historie-Zeile nach Ablauf der Wartezeit: dieselbe schmale Form wie die Pending-Zeile,
 * nur ruhiger - Häkchen in Erfolgsgrün, „Veröffentlicht · 9:41" in Meta-Versalien, kein
 * „Rückgängig" mehr, stattdessen „Ansehen"/„Bearbeiten".
 */
export function DoneRow({ label, time, actionLabel, onAction, muted = false }: DoneRowProps) {
  const theme = useTheme();

  return (
    <Card emphasis="subtle" padding={0} style={muted ? { ...styles.row, opacity: 0.7 } : styles.row}>
      <CheckIcon size={16} color={muted ? theme.colors.textFaint : theme.colors.success} />
      <Eyebrow tone={muted ? "faint" : "muted"} style={styles.label} numberOfLines={1}>
        {label} · {time}
      </Eyebrow>
      {actionLabel && onAction ? (
        <Pressable
          onPress={onAction}
          hitSlop={10}
          accessibilityRole="button"
          accessibilityLabel={actionLabel}
          style={({ pressed }) => ({ opacity: pressed ? 0.6 : 1 })}
        >
          <Text variant="action" style={styles.action}>
            {actionLabel}
          </Text>
        </Pressable>
      ) : null}
    </Card>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 12,
    paddingHorizontal: 18,
  },
  label: { flex: 1 },
  action: { fontSize: 14, textDecorationLine: "underline" },
});
