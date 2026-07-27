import { View } from "react-native";

import { BarChart } from "../../components/ui/DataDisplay";
import { Card } from "../../components/ui/Card";
import { Eyebrow } from "../../components/ui/Eyebrow";
import { ListCard, ListRow } from "../../components/ui/ListCard";
import { NavHeader } from "../../components/ui/NavHeader";
import { Screen } from "../../components/ui/Screen";
import { Text } from "../../components/ui/Text";
import { useT } from "../../lib/i18n";
import { useStore } from "../../lib/store";
import { useTheme } from "../../theme";

const MONTHS = ["Feb", "Mär", "Apr", "Mai", "Jun", "Jul"];

/**
 * Kennzahl-Detail (aus Screen 09). Zeigt die 6-Monats-Kurve, den aktuellen Wert und
 * eine Monatsaufschlüsselung - echte Dummy-Zeitreihen aus dem Store.
 */
export function MetricDetailScreen({ metricKey }: { metricKey?: string }) {
  const theme = useTheme();
  const t = useT();
  const { growthMetrics } = useStore();
  const metric = growthMetrics.find((m) => m.key === metricKey) ?? growthMetrics[0];

  const max = Math.max(...metric.series);
  const rows = [...metric.series]
    .map((value, i) => ({ month: MONTHS[i], value }))
    .reverse();

  return (
    <Screen animated="subtle" contentStyle={{ gap: theme.spacing.lg }}>
      <NavHeader title={metric.label} />

      <View style={{ gap: 2 }}>
        <Text variant="numeric" style={{ fontSize: 44, lineHeight: 48 }}>
          {metric.value}
        </Text>
        <Eyebrow color={metric.trend === "up" ? theme.colors.success : theme.colors.textMuted}>
          {metric.trend === "up" ? "▲ " : ""}
          {metric.delta}
        </Eyebrow>
      </View>

      <Text variant="body" tone="secondary">
        {metric.detail}
      </Text>

      <Card padding={theme.spacing.xl} style={{ borderRadius: 18, gap: 14 }}>
        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "baseline" }}>
          <Text variant="numeric" style={{ fontSize: 17 }}>
            {t({ de: `${metric.label} · 6 Monate`, en: `${metric.label} · 6 months` })}
          </Text>
          <Eyebrow>{t({ de: "Jul aktueller Monat", en: "Jul current month" })}</Eyebrow>
        </View>
        <BarChart
          data={metric.series.map((value, i) => ({ label: MONTHS[i][0], value }))}
          highlightIndex={5}
          height={120}
        />
      </Card>

      <View style={{ gap: theme.spacing.sm }}>
        <Eyebrow>{t({ de: "Nach Monat", en: "By month" })}</Eyebrow>
        <ListCard>
          {rows.map((r) => (
            <ListRow
              key={r.month}
              title={r.month}
              value={String(r.value)}
              trailing={
                <View style={{ width: 60, alignItems: "flex-end" }}>
                  <View
                    style={{
                      height: 6,
                      width: `${Math.round((r.value / max) * 100)}%`,
                      minWidth: 8,
                      borderRadius: 3,
                      backgroundColor: theme.colors.primary,
                    }}
                  />
                </View>
              }
            />
          ))}
        </ListCard>
      </View>
    </Screen>
  );
}
