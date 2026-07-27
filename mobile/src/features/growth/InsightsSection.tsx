import { useState } from "react";
import { Pressable, View } from "react-native";
import { useRouter, type Href } from "expo-router";
import { analytics } from "@maitr/core";
import type { Insight, InsightSeverity } from "@maitr/core/analytics";

import { Card } from "../../components/ui/Card";
import { Eyebrow } from "../../components/ui/Eyebrow";
import { ListCard, ListRow } from "../../components/ui/ListCard";
import { SwipeToDelete } from "../../components/ui/SwipeToDelete";
import { Text } from "../../components/ui/Text";
import { useVenueDataset } from "../../lib/analytics";
import { useT } from "../../lib/i18n";
import { useTheme } from "../../theme";

/**
 * „Erkenntnisse" - die sichtbare Spitze des Analytics-Motors.
 *
 * Rendert die vom `buildInsights`-Rechner rangierte Liste: was ist gerade wichtig,
 * warum, und ein Sprung zur Handlung. Der Bereich lässt sich einklappen, einzelne
 * Erkenntnisse per Wisch nach rechts entfernen.
 */
export function InsightsSection({ limit = 4 }: { limit?: number }) {
  const theme = useTheme();
  const router = useRouter();
  const t = useT();
  const dataset = useVenueDataset();
  const [collapsed, setCollapsed] = useState(false);
  const [dismissed, setDismissed] = useState<Record<string, boolean>>({});

  const insights = analytics
    .buildInsights(dataset)
    .slice(0, limit)
    .filter((insight) => !dismissed[insight.id]);
  if (insights.length === 0) return null;

  return (
    <View style={{ gap: theme.spacing.md }}>
      {/* Kopf wie eine Profil-Check-Zeile: eigenständige Karte mit Titel, kurzer
          Beschreibung, was Erkenntnisse sind, und Chevron zum Ein-/Ausklappen. */}
      <ListCard>
        <ListRow
          title={t({ de: "Erkenntnisse", en: "Insights" })}
          meta={t({ de: "Was deine Zahlen dir gerade raten", en: "What your numbers are telling you" })}
          onPress={() => setCollapsed((c) => !c)}
          trailing={
            <Text
              variant="numeric"
              tone="faint"
              style={{ fontSize: 22, transform: [{ rotate: collapsed ? "0deg" : "90deg" }] }}
            >
              ›
            </Text>
          }
        />
      </ListCard>

      {!collapsed ? (
        <View style={{ gap: theme.spacing.md }}>
          {insights.map((insight) => (
            <SwipeToDelete
              key={insight.id}
              radius={18}
              onDelete={() => setDismissed((d) => ({ ...d, [insight.id]: true }))}
            >
              <InsightRow
                insight={insight}
                onPress={
                  insight.action?.route ? () => router.push(insight.action!.route as Href) : undefined
                }
              />
            </SwipeToDelete>
          ))}
        </View>
      ) : null}
    </View>
  );
}

const DOT: Record<InsightSeverity, (t: ReturnType<typeof useTheme>) => string> = {
  chance: (t) => t.colors.primary,
  hinweis: (t) => t.colors.textFaint,
  achtung: (t) => t.colors.destructive,
};

function InsightRow({ insight, onPress }: { insight: Insight; onPress?: () => void }) {
  const theme = useTheme();
  const dotColor = DOT[insight.severity](theme);

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${insight.title}. ${insight.action?.label ?? ""}`}
      style={({ pressed }) => ({ opacity: pressed ? 0.85 : 1 })}
    >
      <Card emphasis="subtle" padding={16} style={{ borderRadius: 18, gap: 8 }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
          <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: dotColor }} />
          <Text variant="cardTitleSm" style={{ flex: 1, fontSize: 15.5 }}>
            {insight.title}
          </Text>
          {insight.impact ? (
            <Eyebrow tone="accent" style={{ fontSize: 10 }}>
              {insight.impact}
            </Eyebrow>
          ) : null}
        </View>

        <Text variant="bodySm" tone="secondary" style={{ fontSize: 13.5, lineHeight: 19 }}>
          {insight.detail}
        </Text>

        {insight.action ? (
          <View style={{ flexDirection: "row", alignItems: "center", gap: 4, marginTop: 2 }}>
            <Text variant="numeric" tone="accent" style={{ fontSize: 13 }}>
              {insight.action.label}
            </Text>
            <Text variant="numeric" tone="accent" style={{ fontSize: 15 }}>
              ›
            </Text>
          </View>
        ) : null}
      </Card>
    </Pressable>
  );
}
