import { useState } from "react";
import { Pressable, View } from "react-native";
import { useRouter } from "expo-router";
import { analytics } from "@maitr/core";

import { Card } from "../../components/ui/Card";
import { BarChart, DarkPanel, StatTile, onDarkPanel } from "../../components/ui/DataDisplay";
import { Eyebrow } from "../../components/ui/Eyebrow";
import { ListCard, ListRow } from "../../components/ui/ListCard";
import { PillButton } from "../../components/ui/PillButton";
import { Screen } from "../../components/ui/Screen";
import { ScreenHeader } from "../../components/ui/ScreenHeader";
import { Text } from "../../components/ui/Text";
import { useVenueDataset } from "../../lib/analytics";
import { useStore } from "../../lib/store";
import { useToast } from "../../lib/toast";
import { useTheme } from "../../theme";
import { computeOpenPoints, computeProfileScore } from "./profileScore";
import { InsightsSection } from "./InsightsSection";

const CHANNEL_IDS = ["google", "instagram", "yelp", "thefork", "facebook"];
const MONTHS = ["F", "M", "A", "M", "J", "J"];

/**
 * Screen 09 · Dein Juli.
 *
 * Der Monatsrückblick mit vier antippbaren Kennzahlen (Aufrufe, Bewertungen,
 * Reservierungen, Routen) - jede öffnet ihre Detail-Kurve. Zugleich Einstieg in
 * Profil-Check (10) und Kanäle (11).
 */
export function GrowthScreen() {
  const theme = useTheme();
  const router = useRouter();
  const toast = useToast();
  const { profileDone, channels, growthMetrics } = useStore();
  const dataset = useVenueDataset();
  const [year, setYear] = useState(2026);

  // Score aus der geteilten Quelle (siehe profileScore) - identisch zu Start & Ring.
  const score = computeProfileScore(profileDone);
  const openPoints = computeOpenPoints(profileDone);
  const connectedCount = CHANNEL_IDS.filter((id) => channels[id]).length;
  const openChannels = CHANNEL_IDS.length - connectedCount;

  // ROI in Euro: provisionsfreie Reservierungen × Ø-Umsatz × gesparte Provision.
  const roi = analytics.reservationRoi(dataset.reservations, dataset.averageCheck);
  const euro = (v: number) => `${Math.round(v).toLocaleString("de-DE")} €`;

  const openMetric = (key: string) =>
    router.push({ pathname: "/kennzahl/[key]", params: { key } });

  const aufrufe = growthMetrics.find((m) => m.key === "aufrufe")!;

  return (
    <Screen withTabBar contentStyle={{ gap: 14 }}>
      <ScreenHeader
        title="Dein Juli"
        period={String(year)}
        onPrevious={() => setYear((y) => y - 1)}
        onNext={() => setYear((y) => y + 1)}
      />

      <View style={{ gap: theme.spacing.md }}>
        <View style={{ flexDirection: "row", gap: theme.spacing.md }}>
          {growthMetrics.slice(0, 2).map((m) => (
            <Pressable
              key={m.key}
              onPress={() => openMetric(m.key)}
              accessibilityRole="button"
              accessibilityLabel={`${m.label} ${m.value}, Details`}
              style={({ pressed }) => ({ flex: 1, opacity: pressed ? 0.7 : 1 })}
            >
              <StatTile label={m.label} value={m.value} delta={m.delta} trend={m.trend} />
            </Pressable>
          ))}
        </View>
        <View style={{ flexDirection: "row", gap: theme.spacing.md }}>
          {growthMetrics.slice(2, 4).map((m) => (
            <Pressable
              key={m.key}
              onPress={() => openMetric(m.key)}
              accessibilityRole="button"
              accessibilityLabel={`${m.label} ${m.value}, Details`}
              style={({ pressed }) => ({ flex: 1, opacity: pressed ? 0.7 : 1 })}
            >
              <StatTile label={m.label} value={m.value} delta={m.delta} trend={m.trend} />
            </Pressable>
          ))}
        </View>
      </View>

      <Pressable
        onPress={() => openMetric("aufrufe")}
        accessibilityRole="button"
        accessibilityLabel="Aufrufe-Verlauf öffnen"
        style={({ pressed }) => ({ opacity: pressed ? 0.85 : 1 })}
      >
        <Card padding={theme.spacing.xl} style={{ borderRadius: 18, gap: 14 }}>
          <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "baseline" }}>
            <Text variant="numeric" style={{ fontSize: 17 }}>
              Aufrufe · 6 Monate
            </Text>
            <Eyebrow>Ø +15 %/Monat</Eyebrow>
          </View>
          <BarChart
            data={aufrufe.series.map((value, i) => ({ label: MONTHS[i], value }))}
            highlightIndex={5}
          />
        </Card>
      </Pressable>

      <DarkPanel style={{ gap: 6 }}>
        <Eyebrow color={onDarkPanel.meta}>Provisionsfrei über Maitr</Eyebrow>
        <View style={{ flexDirection: "row", alignItems: "baseline", gap: 10 }}>
          <Text variant="numeric" color={onDarkPanel.title} style={{ fontSize: 30, lineHeight: 34 }}>
            {euro(roi.savedCommission)}
          </Text>
          <Text variant="bodySm" color={onDarkPanel.body} style={{ fontSize: 13 }}>
            gespart diesen Monat
          </Text>
        </View>
        <Text variant="bodySm" color={onDarkPanel.body} style={{ fontSize: 13.5, lineHeight: 19 }}>
          {roi.reservations} Reservierungen · {roi.covers} Gäste · {euro(roi.revenue)} vermittelt.
          Hochgerechnet {euro(roi.savedCommissionAnnualized)} im Jahr, die nicht an Plattformen gehen.
        </Text>
      </DarkPanel>

      <InsightsSection />

      <ListCard>
        <ListRow
          title="Profil Check"
          meta={
            openPoints > 0 ? `Score ${score} · +${openPoints} Punkte offen` : `Score ${score} · komplett`
          }
          onPress={() => router.push("/profil-check")}
          trailing={<Chevron />}
        />
        <ListRow
          title="Deine Kanäle"
          meta={
            openChannels > 0
              ? `${connectedCount} verbunden · ${openChannels} offen`
              : `${connectedCount} verbunden`
          }
          onPress={() => router.push("/kanaele")}
          trailing={<Chevron />}
        />
        <ListRow
          title="Auslastung füllen"
          meta="Ruhige Zeiten mit Stammgästen füllen"
          onPress={() => router.push("/kampagne")}
          trailing={<Chevron />}
        />
        <ListRow
          title="Köln-Index"
          meta="Besser als 58 % der Cafés in Köln"
          onPress={() => router.push("/benchmark")}
          trailing={<Chevron />}
        />
      </ListCard>

      <DarkPanel style={{ gap: theme.spacing.sm }}>
        <Text variant="sectionTitle" color={onDarkPanel.title} style={{ fontSize: 20 }}>
          Kolleg:innen empfehlen
          <Text variant="sectionTitle" color={onDarkPanel.accent} style={{ fontSize: 20 }}>
            .
          </Text>
        </Text>
        <Text variant="bodySm" color={onDarkPanel.body} style={{ fontSize: 14 }}>
          1 Monat geschenkt, für dich und den Betrieb, den du einlädst.
        </Text>
        <PillButton
          label="Einladung teilen"
          size="compact"
          labelColor={onDarkPanel.onAccent}
          onPress={() => toast.show("Einladungslink kopiert")}
          style={{ marginTop: theme.spacing.sm, backgroundColor: onDarkPanel.accent }}
        />
      </DarkPanel>
    </Screen>
  );
}

function Chevron() {
  return (
    <Text variant="numeric" tone="faint" style={{ fontSize: 22 }}>
      ›
    </Text>
  );
}
