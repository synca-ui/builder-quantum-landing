import { useState } from "react";
import { View } from "react-native";

import { MoonIcon } from "../../components/icons";
import { Card } from "../../components/ui/Card";
import { Eyebrow } from "../../components/ui/Eyebrow";
import { LinkAction, PillButton } from "../../components/ui/PillButton";
import { Screen } from "../../components/ui/Screen";
import { Emphasis, Text } from "../../components/ui/Text";
import { useAppearance } from "../../lib/appearance";
import { useT } from "../../lib/i18n";
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
  const t = useT();
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
          {t({ de: "Guten Abend, ", en: "Good evening, " })}
          <Emphasis variant="screenTitle" style={{ fontSize: 30 }}>{eveningBriefing.venueName}</Emphasis>
        </Text>
      </View>

      <Card variant="sunken" padding={theme.spacing.xl} style={{ gap: 14 }}>
        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
          <Text variant="cardTitleSm" style={{ fontSize: 18 }}>
            {t({ de: "Heute Abend", en: "Tonight" })}
          </Text>
          <Eyebrow>{t({ de: eveningBriefing.tablesLabel, en: "3 of 8 tables" })}</Eyebrow>
        </View>

        <View style={{ flexDirection: "row", gap: theme.spacing.lg }}>
          <Metric
            value={eveningBriefing.nextArrival.time}
            label={t({ de: eveningBriefing.nextArrival.label, en: "Next arrival · M. Weber" })}
            highlight
          />
          <Metric
            value={String(eveningBriefing.walkIns.count)}
            label={t({ de: eveningBriefing.walkIns.label, en: "Walk-ins open" })}
          />
        </View>
      </Card>

      <Card variant="sunken" padding={theme.spacing.xl} style={{ gap: 10 }}>
        <Eyebrow tone="accent">
          {t({ de: eveningBriefing.quietMoment.eyebrow, en: "Quiet moment · 1 min" })}
        </Eyebrow>
        <Text variant="cardTitle">
          {t({
            de: eveningBriefing.quietMoment.title,
            en: `Approve the “Zimtschnecken” post for tomorrow 9:00`,
          })}
        </Text>
        <PillButton
          label={
            planned
              ? t({ de: "Eingeplant ✓", en: "Scheduled ✓" })
              : t({ de: eveningBriefing.quietMoment.action, en: "Approve" })
          }
          variant={planned ? "outline" : "primary"}
          onPress={
            planned
              ? undefined
              : () => {
                  setPlanned(true);
                  toast.show(
                    t({
                      de: "Beitrag für morgen 9:00 eingeplant",
                      en: "Post scheduled for tomorrow 9:00",
                    }),
                  );
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
            {t({ de: "Nachtbar Modus aktiv", en: "Night mode active" })}
          </Text>
          <Text variant="bodySm" tone="secondary" style={{ fontSize: 13, marginTop: 1 }}>
            {t({ de: "Schaltet abends automatisch um.", en: "Switches on automatically in the evening." })}
          </Text>
        </View>
        <LinkAction
          label={t({ de: "Ausschalten", en: "Turn off" })}
          labelSize={14}
          onPress={toggleNightMode}
        />
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
