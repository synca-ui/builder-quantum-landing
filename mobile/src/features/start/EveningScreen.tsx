import { useState } from "react";
import { View } from "react-native";

import { MoonIcon } from "../../components/icons";
import { Card } from "../../components/ui/Card";
import { Eyebrow } from "../../components/ui/Eyebrow";
import { LinkAction, PillButton } from "../../components/ui/PillButton";
import { Screen } from "../../components/ui/Screen";
import { Emphasis, Text } from "../../components/ui/Text";
import { useAppearance } from "../../lib/appearance";
import { useToast } from "../../lib/toast";
import { useTheme } from "../../theme";

export const eveningBriefing = {
  dateLabel: "Mittwoch, 21:40 · Service läuft",
  venueName: "Café Goldstück",
  tablesLabel: "3 von 8 Tischen",
  nextArrival: { time: "19:00", label: "Nächste Ankunft · M. Weber" },
  walkIns: { count: 2, label: "Walk ins offen" },
  quietMoment: {
    eyebrow: "Ruhiger Moment · 1 Min",
    title: "Beitrag „Zimtschnecken\" für morgen 9:00 freigeben",
    action: "Freigeben",
  },
} as const;

/**
 * Screen 16 · Guten Abend · Nachtbar.
 *
 * Die Abendfassung des Start-Screens: weniger Aufgaben, mehr Lagebild. Sie erscheint,
 * wenn der Nachtbar-Modus an ist - der Schalter sitzt im Konto (Screen 12) und als
 * Mondsymbol im Kopf des Morgen-Screens.
 */
export function EveningScreen() {
  const theme = useTheme();
  const toast = useToast();
  const { toggleNightMode } = useAppearance();
  const [planned, setPlanned] = useState(false);

  return (
    <Screen withTabBar contentStyle={{ gap: theme.spacing.lg }}>
      <View style={{ marginTop: 6 }}>
        <Text variant="bodySm" tone="secondary" style={{ fontSize: 15 }}>
          {eveningBriefing.dateLabel}
        </Text>
        <Text
          variant="screenTitle"
          accessibilityRole="header"
          style={{ fontSize: 30, lineHeight: 33, marginTop: 2 }}
        >
          Guten Abend, <Emphasis variant="screenTitle" style={{ fontSize: 30 }}>{eveningBriefing.venueName}</Emphasis>
        </Text>
      </View>

      <Card variant="sunken" padding={theme.spacing.xl} style={{ gap: 14 }}>
        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
          <Text variant="cardTitleSm" style={{ fontSize: 18 }}>
            Heute Abend
          </Text>
          <Eyebrow>{eveningBriefing.tablesLabel}</Eyebrow>
        </View>

        <View style={{ flexDirection: "row", gap: theme.spacing.lg }}>
          <Metric
            value={eveningBriefing.nextArrival.time}
            label={eveningBriefing.nextArrival.label}
            highlight
          />
          <Metric value={String(eveningBriefing.walkIns.count)} label={eveningBriefing.walkIns.label} />
        </View>
      </Card>

      <Card variant="sunken" padding={theme.spacing.xl} style={{ gap: 10 }}>
        <Eyebrow tone="accent">{eveningBriefing.quietMoment.eyebrow}</Eyebrow>
        <Text variant="cardTitle">{eveningBriefing.quietMoment.title}</Text>
        <PillButton
          label={planned ? "Eingeplant ✓" : eveningBriefing.quietMoment.action}
          variant={planned ? "outline" : "primary"}
          onPress={
            planned
              ? undefined
              : () => {
                  setPlanned(true);
                  toast.show("Beitrag für morgen 9:00 eingeplant");
                }
          }
          style={{ borderRadius: theme.radius.control, marginTop: 2 }}
        />
      </Card>

      <Card
        variant="sunken"
        padding={theme.spacing.xl}
        style={{ flexDirection: "row", alignItems: "center", gap: 14 }}
      >
        <View
          style={{
            width: 44,
            height: 44,
            borderRadius: 22,
            backgroundColor: theme.colors.surfaceSunken,
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <MoonIcon size={22} color={theme.colors.accent} />
        </View>
        <View style={{ flex: 1 }}>
          <Text variant="numeric" style={{ fontSize: 16 }}>
            Nachtbar Modus aktiv
          </Text>
          <Text variant="bodySm" tone="secondary" style={{ fontSize: 13, marginTop: 1 }}>
            Schaltet abends automatisch um.
          </Text>
        </View>
        <LinkAction label="Ausschalten" labelSize={14} onPress={toggleNightMode} />
      </Card>
    </Screen>
  );
}

function Metric({
  value,
  label,
  highlight = false,
}: {
  value: string;
  label: string;
  highlight?: boolean;
}) {
  const theme = useTheme();

  return (
    <View style={{ flex: 1 }}>
      <Text
        variant="numeric"
        color={highlight ? theme.colors.accent : theme.colors.textPrimary}
        style={{ fontSize: 30, lineHeight: 34, letterSpacing: -0.6 }}
      >
        {value}
      </Text>
      <Text variant="bodySm" tone="secondary" style={{ fontSize: 13, marginTop: 2 }}>
        {label}
      </Text>
    </View>
  );
}
