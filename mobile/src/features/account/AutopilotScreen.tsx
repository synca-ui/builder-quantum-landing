import { View } from "react-native";
import { useRouter } from "expo-router";

import { Card } from "../../components/ui/Card";
import { DarkPanel, onDarkPanel } from "../../components/ui/DataDisplay";
import { Eyebrow } from "../../components/ui/Eyebrow";
import { ListCard, ListRow } from "../../components/ui/ListCard";
import { NavHeader } from "../../components/ui/NavHeader";
import { Screen } from "../../components/ui/Screen";
import { Text } from "../../components/ui/Text";
import { Toggle } from "../../components/ui/Toggle";
import { useStore, type ActivityItem, type AutopilotCategory } from "../../lib/store";
import { useTheme } from "../../theme";

const CATEGORIES: { key: AutopilotCategory; title: string; meta: string }[] = [
  { key: "reviews", title: "Bewertungsantworten", meta: "5★-Bewertungen sofort warm beantworten" },
  { key: "winback", title: "Rückhol-Nachrichten", meta: "Inaktive Stammgäste automatisch einladen" },
  { key: "posts", title: "Beiträge", meta: "Zur stärksten Stunde von selbst posten" },
];

/**
 * Autopilot - der Beweis für „handelnde Automatisierung".
 *
 * Oben, was Maitr bereits ohne Zutun erledigt hat (der Aktivitäts-Beleg), darunter
 * die Regler, wie viel Vertrauen der Betrieb abgibt. Das ist die Bewegung von
 * „drei Entscheidungen am Morgen" zu „null Entscheidungen".
 */
export function AutopilotScreen() {
  const theme = useTheme();
  const router = useRouter();
  const { activityLog, autopilot, setAutopilot, guests, reactivateGuest } = useStore();
  const autoCount = activityLog.filter((a) => a.auto).length;

  // Der Regler steuert wirklich etwas: „winback" einschalten holt sofort alle
  // inaktiven Gäste zurück - mit auto-Belegen. Kein Lichtschalter ohne Kabel.
  const handleToggle = (category: AutopilotCategory, on: boolean) => {
    setAutopilot(category, on);
    if (on && category === "winback") {
      guests.filter((g) => g.status === "inaktiv").forEach((g) => reactivateGuest(g.id, g.name, true));
    }
  };

  return (
    <Screen animated="subtle" contentStyle={{ gap: theme.spacing.lg }}>
      <NavHeader title="Autopilot" onBack={() => router.back()} />

      <DarkPanel style={{ gap: 6 }}>
        <Eyebrow color={onDarkPanel.accent}>Von Maitr erledigt</Eyebrow>
        <Text variant="numeric" color={onDarkPanel.title} style={{ fontSize: 30, lineHeight: 34 }}>
          {autoCount} {autoCount === 1 ? "Aufgabe" : "Aufgaben"}
        </Text>
        <Text variant="bodySm" color={onDarkPanel.body} style={{ fontSize: 13.5, lineHeight: 19 }}>
          Ohne dass du etwas tun musstest. Schalte mehr frei — Maitr lernt aus deinen Freigaben.
        </Text>
      </DarkPanel>

      <View style={{ gap: theme.spacing.sm }}>
        <Eyebrow>Was Maitr selbst erledigen darf</Eyebrow>
        <ListCard style={{ borderRadius: 18 }}>
          {CATEGORIES.map((c) => (
            <ListRow
              key={c.key}
              title={c.title}
              meta={c.meta}
              trailing={
                <Toggle
                  value={autopilot[c.key]}
                  onValueChange={(v) => handleToggle(c.key, v)}
                  accessibilityLabel={`Autopilot: ${c.title}`}
                />
              }
            />
          ))}
        </ListCard>
      </View>

      <View style={{ gap: theme.spacing.sm }}>
        <Eyebrow>Zuletzt erledigt</Eyebrow>
        <View style={{ gap: theme.spacing.md }}>
          {activityLog.map((a) => (
            <ActivityRow key={a.id} item={a} />
          ))}
        </View>
      </View>
    </Screen>
  );
}

function ActivityRow({ item }: { item: ActivityItem }) {
  const theme = useTheme();
  return (
    <Card emphasis="subtle" padding={16} style={{ borderRadius: 16, gap: 4 }}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
        <Text variant="cardTitleSm" style={{ flex: 1, fontSize: 15.5 }}>
          {item.title}
        </Text>
        {item.auto ? (
          <View
            style={{
              backgroundColor: theme.colors.successSurface,
              borderRadius: theme.radius.pill,
              paddingVertical: 3,
              paddingHorizontal: 9,
            }}
          >
            <Eyebrow color={theme.colors.success} style={{ fontSize: 9 }}>
              Automatisch
            </Eyebrow>
          </View>
        ) : null}
      </View>
      <Text variant="bodySm" tone="secondary" style={{ fontSize: 13, lineHeight: 18 }}>
        {item.detail}
      </Text>
      <Eyebrow style={{ fontSize: 10 }}>{item.time}</Eyebrow>
    </Card>
  );
}
