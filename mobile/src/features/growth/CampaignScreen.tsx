import { useState } from "react";
import { View } from "react-native";
import { useRouter } from "expo-router";
import { analytics } from "@maitr/core";

import { Avatar } from "../../components/ui/Avatar";
import { Card } from "../../components/ui/Card";
import { DarkPanel, onDarkPanel } from "../../components/ui/DataDisplay";
import { Eyebrow } from "../../components/ui/Eyebrow";
import { NavHeader } from "../../components/ui/NavHeader";
import { PillButton } from "../../components/ui/PillButton";
import { Screen } from "../../components/ui/Screen";
import { Text } from "../../components/ui/Text";
import { useVenueDataset } from "../../lib/analytics";
import { useStore } from "../../lib/store";
import { useToast } from "../../lib/toast";
import { useTheme } from "../../theme";

/**
 * Auslastungs-Autopilot - Nachfrage aus dem eigenen Gäste-Graph erzeugen, statt sie
 * abzuwarten. Maitr sieht den ruhigen Tag kommen und lädt genau die Stammgäste ein,
 * die dann gern kommen. „Leerer Tisch" wird zur adressierbaren Euro-Größe - ein Zug,
 * den Plattformen nicht machen, weil ihnen die Beziehung nicht gehört.
 */
export function CampaignScreen() {
  const theme = useTheme();
  const router = useRouter();
  const toast = useToast();
  const dataset = useVenueDataset();
  const { logActivity } = useStore();
  const [sent, setSent] = useState(false);

  const regulars = analytics
    .guestInsights(dataset)
    .filter((g) => g.segment === "stammgast" || g.segment === "vip");
  const euro = (v: number) => `${Math.round(v).toLocaleString("de-DE")} €`;
  const projected = regulars.length * 2 * dataset.averageCheck;

  const send = () => {
    regulars.forEach((g) =>
      logActivity({
        kind: "winback",
        title: `Einladung an ${g.name}`,
        detail: "Dienstag-Aktion · über WhatsApp eingeladen.",
        auto: true,
      }),
    );
    setSent(true);
    toast.show(`${regulars.length} Einladungen gesendet`);
  };

  return (
    <Screen animated="subtle" contentStyle={{ gap: theme.spacing.lg }}>
      <NavHeader title="Auslastung" onBack={() => router.back()} />

      <DarkPanel style={{ gap: 6 }}>
        <Eyebrow color={onDarkPanel.accent}>Ruhige Zeiten füllen</Eyebrow>
        <Text variant="numeric" color={onDarkPanel.title} style={{ fontSize: 30, lineHeight: 34 }}>
          ~{euro(projected)}
        </Text>
        <Text variant="bodySm" color={onDarkPanel.body} style={{ fontSize: 13.5, lineHeight: 19 }}>
          Für ruhige Zeiten: Maitr lädt {regulars.length} Stammgäste ein, die unter der Woche
          gern kommen — Nachfrage aus deinem eigenen Gäste-Graph, nicht von der Plattform gemietet.
        </Text>
      </DarkPanel>

      <View style={{ gap: theme.spacing.sm }}>
        <Eyebrow>Wen Maitr einlädt</Eyebrow>
        <View style={{ gap: theme.spacing.sm }}>
          {regulars.map((g) => (
            <Card
              key={g.id}
              emphasis="subtle"
              padding={14}
              style={{ flexDirection: "row", alignItems: "center", gap: 12, borderRadius: 14 }}
            >
              <Avatar initials={g.name.charAt(0)} size={38} />
              <View style={{ flex: 1 }}>
                <Text variant="cardTitleSm" style={{ fontSize: 15.5 }}>
                  {g.name}
                </Text>
                <Eyebrow style={{ marginTop: 1 }}>
                  {g.visits} Besuche · ≈ {euro(g.lifetimeValue)} Wert
                </Eyebrow>
              </View>
              {sent ? (
                <Eyebrow tone="accent" style={{ fontSize: 10 }}>
                  Eingeladen
                </Eyebrow>
              ) : null}
            </Card>
          ))}
        </View>
      </View>

      <PillButton
        label={sent ? "Kampagne läuft ✓" : `${regulars.length} einladen · Kampagne senden`}
        variant={sent ? "outline" : "primary"}
        onPress={sent ? undefined : send}
      />
      <Eyebrow tone="faint" style={{ textAlign: "center" }}>
        Provisionsfrei · Antworten landen direkt im Gäste-CRM
      </Eyebrow>
    </Screen>
  );
}
