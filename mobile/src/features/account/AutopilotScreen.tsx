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
import { useT, type Localized } from "../../lib/i18n";
import { useStore, type ActivityItem, type AutopilotCategory } from "../../lib/store";
import { useTheme } from "../../theme";

const CATEGORIES: { key: AutopilotCategory; title: Localized; meta: Localized }[] = [
  {
    key: "reviews",
    title: { de: "Bewertungsantworten", en: "Review replies" },
    meta: { de: "5★-Bewertungen sofort warm beantworten", en: "Reply warmly to 5★ reviews instantly" },
  },
  {
    key: "winback",
    title: { de: "Rückhol-Nachrichten", en: "Win-back messages" },
    meta: { de: "Inaktive Stammgäste automatisch einladen", en: "Automatically invite inactive regulars" },
  },
  {
    key: "posts",
    title: { de: "Beiträge", en: "Posts" },
    meta: { de: "Zur stärksten Stunde von selbst posten", en: "Post automatically at your peak hour" },
  },
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
  const t = useT();
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
        <Eyebrow color={onDarkPanel.accent}>{t({ de: "Von Maitr erledigt", en: "Done by Maitr" })}</Eyebrow>
        <Text variant="numeric" color={onDarkPanel.title} style={{ fontSize: 30, lineHeight: 34 }}>
          {autoCount} {autoCount === 1 ? t({ de: "Aufgabe", en: "task" }) : t({ de: "Aufgaben", en: "tasks" })}
        </Text>
        <Text variant="bodySm" color={onDarkPanel.body} style={{ fontSize: 13.5, lineHeight: 19 }}>
          {t({
            de: "Ohne dass du etwas tun musstest. Schalte mehr frei — Maitr lernt aus deinen Freigaben.",
            en: "Without you having to do a thing. Unlock more — Maitr learns from your approvals.",
          })}
        </Text>
      </DarkPanel>

      <View style={{ gap: theme.spacing.sm }}>
        <Eyebrow>{t({ de: "Was Maitr selbst erledigen darf", en: "What Maitr may handle itself" })}</Eyebrow>
        <ListCard style={{ borderRadius: 18 }}>
          {CATEGORIES.map((c) => (
            <ListRow
              key={c.key}
              title={t(c.title)}
              meta={t(c.meta)}
              trailing={
                <Toggle
                  value={autopilot[c.key]}
                  onValueChange={(v) => handleToggle(c.key, v)}
                  accessibilityLabel={`Autopilot: ${t(c.title)}`}
                />
              }
            />
          ))}
        </ListCard>
      </View>

      <View style={{ gap: theme.spacing.sm }}>
        <Eyebrow>{t({ de: "Zuletzt erledigt", en: "Recently done" })}</Eyebrow>
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
  const t = useT();
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
              {t({ de: "Automatisch", en: "Automatic" })}
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
