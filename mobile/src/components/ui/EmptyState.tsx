import { Card } from "./Card";
import { Text } from "./Text";
import { useTheme } from "../../theme";

/**
 * Ruhiger Leerzustand für Listen ohne Treffer - konsistent mit den vorhandenen
 * Empty-States (Speisekarte, „Für heute erledigt"). Ein Ort, überall wiederverwendbar.
 */
export function EmptyState({ title, message }: { title: string; message?: string }) {
  const theme = useTheme();
  return (
    <Card
      emphasis="subtle"
      padding={theme.spacing.xxl}
      style={{ alignItems: "center", gap: 6, borderRadius: 18 }}
    >
      <Text variant="cardTitleSm" style={{ textAlign: "center", fontSize: 16 }}>
        {title}
      </Text>
      {message ? (
        <Text variant="bodySm" tone="secondary" style={{ textAlign: "center", fontSize: 14, lineHeight: 20 }}>
          {message}
        </Text>
      ) : null}
    </Card>
  );
}
