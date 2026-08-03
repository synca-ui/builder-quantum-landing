import { useMemo, useState } from "react";
import { View } from "react-native";
import { useRouter } from "expo-router";
import { analytics } from "@maitr/core";
import type { GuestInsight } from "@maitr/core/analytics";

import { Avatar, StatusLabel } from "../../components/ui/Avatar";
import { Card } from "../../components/ui/Card";
import { Chip, Tag } from "../../components/ui/Chip";
import { DarkPanel, onDarkPanel } from "../../components/ui/DataDisplay";
import { EmptyState } from "../../components/ui/EmptyState";
import { Eyebrow } from "../../components/ui/Eyebrow";
import { NavHeader } from "../../components/ui/NavHeader";
import { PillButton } from "../../components/ui/PillButton";
import { Screen } from "../../components/ui/Screen";
import { Text } from "../../components/ui/Text";
import { useVenueDataset } from "../../lib/analytics";
import { useStore, type Guest, type GuestStatus } from "../../lib/store";
import { useToast } from "../../lib/toast";
import { useTheme } from "../../theme";

type Filter = "alle" | "stammgast" | "inaktiv";

/**
 * Gäste-CRM - der verteidigbare Kern von Maitr.
 *
 * Die Gästebeziehung gehört dem Betrieb, nicht der Plattform. Jede Reservierung reichert
 * sie an (Besuche, letzter Besuch). Der Copilot handelt: inaktive Gäste in einem Tap
 * zurückholen - genau der Automatisierungs-Moment, der Maitr von einem Verzeichnis
 * unterscheidet.
 */
export function GuestsScreen() {
  const theme = useTheme();
  const router = useRouter();
  const toast = useToast();
  const { guests, reactivateGuest } = useStore();
  const dataset = useVenueDataset();
  const [filter, setFilter] = useState<Filter>("alle");

  // Kennzahlen je Gast aus dem Analytics-Kern (Wert, No-Show-Risiko), nach Id.
  const insightById = useMemo(() => {
    const map = new Map<string, GuestInsight>();
    for (const gi of analytics.guestInsights(dataset)) map.set(gi.id, gi);
    return map;
  }, [dataset]);

  const regulars = guests.filter((g) => g.status === "stammgast").length;
  const inactive = guests.filter((g) => g.status === "inaktiv");
  const shown = guests.filter((g) => (filter === "alle" ? true : g.status === filter));

  const reactivateAll = () => {
    inactive.forEach((g) => reactivateGuest(g.id, g.name));
    toast.show(`${inactive.length} Gäste zurückgeholt`);
  };

  return (
    <Screen animated="subtle" withTabBar contentStyle={{ gap: theme.spacing.lg }}>
      <NavHeader fallback="/tische" />

      <View>
        <Text variant="screenTitle" accessibilityRole="header" style={{ fontSize: 33, lineHeight: 36 }}>
          Gäste
        </Text>
        <Text variant="body" tone="secondary" style={{ marginTop: 6 }}>
          {guests.length} Gäste · {regulars} Stammgäste · deine Beziehung, nicht die der Plattform.
        </Text>
        <View style={{ flexDirection: "row", marginTop: 8 }}>
          <PillButton
            label="Stammgast-Pass ›"
            variant="ghost"
            size="compact"
            labelSize={14}
            onPress={() => router.push("/loyalty")}
            style={{ paddingHorizontal: 0 }}
          />
        </View>
      </View>

      {inactive.length > 0 ? (
        <DarkPanel style={{ gap: theme.spacing.sm }}>
          <Eyebrow color={onDarkPanel.accent}>Copilot-Vorschlag</Eyebrow>
          <Text variant="sectionTitle" color={onDarkPanel.title} style={{ fontSize: 19 }}>
            {inactive.length}{" "}
            {inactive.length === 1 ? "Gast war" : "Gäste waren"} länger nicht da
          </Text>
          <Text variant="bodySm" color={onDarkPanel.body} style={{ fontSize: 14 }}>
            Eine freundliche Nachricht bringt sie oft zurück - Maitr formuliert und sendet.
          </Text>
          <PillButton
            label="Alle zurückholen"
            size="compact"
            labelColor={onDarkPanel.onAccent}
            onPress={reactivateAll}
            style={{ marginTop: theme.spacing.sm, backgroundColor: onDarkPanel.accent }}
          />
        </DarkPanel>
      ) : null}

      <View style={{ flexDirection: "row", gap: 9 }}>
        <Chip label="Alle" selected={filter === "alle"} onPress={() => setFilter("alle")} />
        <Chip label="Stammgäste" selected={filter === "stammgast"} onPress={() => setFilter("stammgast")} />
        <Chip label="Inaktiv" selected={filter === "inaktiv"} onPress={() => setFilter("inaktiv")} />
      </View>

      <View style={{ gap: theme.spacing.md }}>
        {shown.length === 0 ? (
          <EmptyState
            title={filter === "inaktiv" ? "Keine inaktiven Gäste" : "Keine Gäste in dieser Ansicht"}
            message={
              filter === "inaktiv"
                ? "Alle Stammgäste waren zuletzt da — Maitr hält sie warm."
                : "Sobald jemand reserviert, taucht er hier auf."
            }
          />
        ) : (
          shown.map((guest) => (
            <GuestCard
              key={guest.id}
              guest={guest}
              insight={insightById.get(guest.id)}
              onReactivate={() => {
                reactivateGuest(guest.id, guest.name);
                toast.show(`Nachricht an ${guest.name} gesendet`);
              }}
            />
          ))
        )}
      </View>
    </Screen>
  );
}

const STATUS: Record<GuestStatus, { label: string; color: (t: ReturnType<typeof useTheme>) => string }> = {
  stammgast: { label: "Stammgast", color: (t) => t.colors.success },
  neu: { label: "Neu", color: (t) => t.colors.primary },
  inaktiv: { label: "Inaktiv", color: (t) => t.colors.textMuted },
};

function GuestCard({
  guest,
  insight,
  onReactivate,
}: {
  guest: Guest;
  insight?: GuestInsight;
  onReactivate: () => void;
}) {
  const theme = useTheme();
  const status = STATUS[guest.status];
  const euro = (v: number) => `${Math.round(v).toLocaleString("de-DE")} €`;
  // No-Show-Risiko zeigen, sobald es eine Historie gibt - dann ist die (geglättete)
  // Quote für die Tischplanung relevant, auch wenn sie niedrig ist.
  const showRisk = Boolean(insight) && guest.noShows > 0;

  return (
    <Card emphasis="subtle" padding={theme.spacing.lg} style={{ gap: theme.spacing.md }}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 14 }}>
        <Avatar initials={guest.name.charAt(0)} size={44} />
        <View style={{ flex: 1 }}>
          <Text variant="cardTitleSm" style={{ fontSize: 17 }}>
            {guest.name}
          </Text>
          <Eyebrow style={{ marginTop: 2 }}>
            {guest.visits} Besuche · zuletzt {guest.lastVisit}
            {guest.noShows > 0 ? ` · ${guest.noShows} No-Show` : ""}
          </Eyebrow>
        </View>
        <StatusLabel label={status.label} color={status.color(theme)} />
      </View>

      {insight ? (
        <View
          style={{
            flexDirection: "row",
            gap: theme.spacing.xl,
            paddingTop: theme.spacing.sm,
            borderTopWidth: 1,
            borderTopColor: theme.colors.borderSoft,
          }}
        >
          <GuestMetric label="Wert" value={`≈ ${euro(insight.lifetimeValue)}`} />
          {showRisk ? (
            <GuestMetric
              label="No-Show-Risiko"
              value={`${Math.round(insight.noShowRisk * 100)} %`}
              tone={insight.noShowRisk >= 0.4 ? "warn" : "normal"}
            />
          ) : null}
        </View>
      ) : null}

      {(guest.tags.length > 0 || guest.status === "inaktiv") ? (
        <View style={{ flexDirection: "row", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
          {guest.tags.map((t) => (
            <Tag key={t} label={t} />
          ))}
          {guest.status === "inaktiv" ? (
            <PillButton
              label="Zurückholen"
              size="compact"
              variant="outline"
              labelSize={14}
              onPress={onReactivate}
              style={{ marginLeft: "auto" }}
            />
          ) : null}
        </View>
      ) : null}
    </Card>
  );
}

/** Kleine Kennzahl unter der Gast-Zeile (Wert, No-Show-Risiko). */
function GuestMetric({
  label,
  value,
  tone = "normal",
}: {
  label: string;
  value: string;
  tone?: "normal" | "warn";
}) {
  const theme = useTheme();
  return (
    <View style={{ gap: 1 }}>
      <Eyebrow style={{ fontSize: 10 }}>{label}</Eyebrow>
      <Text
        variant="numeric"
        color={tone === "warn" ? theme.colors.destructive : theme.colors.textPrimary}
        style={{ fontSize: 15 }}
      >
        {value}
      </Text>
    </View>
  );
}
