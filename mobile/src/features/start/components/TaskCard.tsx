import { StyleSheet, View } from "react-native";
import type { DailyTask } from "@maitr/core";

import { Card } from "../../../components/ui/Card";
import { Eyebrow } from "../../../components/ui/Eyebrow";
import { LinkAction, PillButton } from "../../../components/ui/PillButton";
import { Text } from "../../../components/ui/Text";
import { useT } from "../../../lib/i18n";
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
  const t = useT();

  return (
    <Card emphasis="default" padding={0} style={styles.reviewCard}>
      <View style={styles.headRow}>
        <Eyebrow>{task.eyebrow}</Eyebrow>
        {task.rating ? (
          <Text
            color={theme.colors.textSecondary}
            style={styles.stars}
            accessibilityLabel={t({ de: `${task.rating} von 5 Sternen`, en: `${task.rating} of 5 stars` })}
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
          accessibilityHint={t({ de: `Aufgabe „${task.title}“ freigeben`, en: `Approve task “${task.title}”` })}
        />
        {task.secondaryAction ? (
          <LinkAction
            label={task.secondaryAction.label}
            onPress={() => onSecondary?.(task)}
            accessibilityHint={t({ de: `Entwurf zu „${task.title}“ bearbeiten`, en: `Edit draft for “${task.title}”` })}
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
  const t = useT();

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
        accessibilityHint={t({ de: `Aufgabe „${task.title}“ ausführen`, en: `Run task “${task.title}”` })}
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
