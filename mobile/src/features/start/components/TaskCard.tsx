import { StyleSheet, View } from "react-native";
import type { DailyTask } from "@maitr/core";

import { Card } from "../../../components/ui/Card";
import { Eyebrow } from "../../../components/ui/Eyebrow";
import { LinkAction, PillButton } from "../../../components/ui/PillButton";
import { Text } from "../../../components/ui/Text";
import { useTheme } from "../../../theme";

export interface TaskCardProps {
  task: DailyTask;
  onPrimary?: (task: DailyTask) => void;
  onSecondary?: (task: DailyTask) => void;
}

/**
 * Die ausführliche Aufgabenkarte (Screen 04, Block "Bewertung").
 * Zeigt Entwurf und Wirkungsversprechen, Aktion steht unter dem Text.
 */
export function ReviewTaskCard({ task, onPrimary, onSecondary }: TaskCardProps) {
  const theme = useTheme();

  return (
    <Card emphasis="default" padding={0} style={styles.reviewCard}>
      <View style={styles.headRow}>
        <Eyebrow>{task.eyebrow}</Eyebrow>
        {task.rating ? (
          <Text
            color={theme.colors.textSecondary}
            style={styles.stars}
            accessibilityLabel={`${task.rating} von 5 Sternen`}
          >
            {"★".repeat(task.rating)}
          </Text>
        ) : null}
      </View>

      <Text variant="cardTitle">{task.title}</Text>

      {task.draft ? (
        <Text variant="quote" tone="secondary">
          {task.draft}
        </Text>
      ) : null}

      {task.impact ? <Eyebrow>{task.impact}</Eyebrow> : null}

      <View style={styles.actionRow}>
        <PillButton
          label={task.primaryAction.label}
          onPress={() => onPrimary?.(task)}
          style={styles.grow}
          accessibilityHint={`Aufgabe „${task.title}“ freigeben`}
        />
        {task.secondaryAction ? (
          <LinkAction
            label={task.secondaryAction.label}
            onPress={() => onSecondary?.(task)}
            accessibilityHint={`Entwurf zu „${task.title}“ bearbeiten`}
          />
        ) : null}
      </View>
    </Card>
  );
}

/**
 * Die kompakte Aufgabenkarte (Blöcke "Beitrag" und "Profil").
 * Text links, Aktion rechts auf gleicher Höhe.
 */
export function CompactTaskCard({
  task,
  onPrimary,
  variant = "ink",
}: TaskCardProps & { variant?: "ink" | "outline" }) {
  const theme = useTheme();

  return (
    <Card
      emphasis={variant === "ink" ? "default" : "subtle"}
      padding={0}
      style={styles.compactCard}
    >
      <View style={styles.grow}>
        <Eyebrow>{task.eyebrow}</Eyebrow>
        <Text variant="cardTitleSm" style={{ marginTop: theme.spacing.xs }}>
          {task.title}
        </Text>
        {task.impact ? (
          <Eyebrow style={{ marginTop: 5 }}>{task.impact}</Eyebrow>
        ) : null}
      </View>

      <PillButton
        label={task.primaryAction.label}
        variant={variant}
        size="compact"
        onPress={() => onPrimary?.(task)}
        accessibilityHint={`Aufgabe „${task.title}“ ausführen`}
      />
    </Card>
  );
}

const styles = StyleSheet.create({
  reviewCard: {
    paddingVertical: 14,
    paddingHorizontal: 18,
    gap: 6,
  },
  compactCard: {
    paddingVertical: 13,
    paddingHorizontal: 18,
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
  },
  headRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  stars: {
    fontSize: 14,
    letterSpacing: 2,
  },
  actionRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
    marginTop: 2,
  },
  grow: { flex: 1 },
});
