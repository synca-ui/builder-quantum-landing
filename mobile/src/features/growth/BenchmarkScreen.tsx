import { View } from "react-native";
import { useRouter } from "expo-router";

import { Card } from "../../components/ui/Card";
import { DarkPanel, onDarkPanel } from "../../components/ui/DataDisplay";
import { Eyebrow } from "../../components/ui/Eyebrow";
import { NavHeader } from "../../components/ui/NavHeader";
import { Screen } from "../../components/ui/Screen";
import { Text } from "../../components/ui/Text";
import { useT } from "../../lib/i18n";
import { useTheme } from "../../theme";

interface Row {
  label: { de: string; en: string };
  you: string;
  peer: string;
  /** 0-100, Position im Viertel. */
  percentile: number;
}

const ROWS: Row[] = [
  { label: { de: "Bewertung", en: "Rating" }, you: "4,8", peer: "4,3", percentile: 88 },
  { label: { de: "Antwortquote", en: "Response rate" }, you: "100 %", peer: "61 %", percentile: 92 },
  { label: { de: "Aufrufe / Monat", en: "Views / month" }, you: "4.812", peer: "3.100", percentile: 74 },
  { label: { de: "Reservierungen", en: "Reservations" }, you: "61", peer: "38", percentile: 81 },
];

/**
 * Köln-Index / Kiez-Benchmark - aggregiertes Graph-Wissen als Radar.
 *
 * Anonymisierter Peer-Vergleich wird zum Nachfrage-Signal: „Ehrenfeld +14 % diese
 * Woche". Aus dem Netzwerk vieler Betriebe entsteht ein Prognose- und perspektivisch
 * B2B-Datenprodukt - ein zweiter Graben, den eine einzelne Plattform nicht baut.
 */
export function BenchmarkScreen() {
  const theme = useTheme();
  const router = useRouter();
  const t = useT();

  return (
    <Screen animated="subtle" contentStyle={{ gap: theme.spacing.lg }}>
      <NavHeader title={t({ de: "Köln-Index", en: "Cologne Index" })} onBack={() => router.back()} />

      <DarkPanel style={{ gap: 4 }}>
        <Eyebrow color={onDarkPanel.accent}>{t({ de: "Ehrenfeld · anonymer Vergleich", en: "Ehrenfeld · anonymous comparison" })}</Eyebrow>
        <Text variant="numeric" color={onDarkPanel.title} style={{ fontSize: 30, lineHeight: 34 }}>
          Top 12 %
        </Text>
        <Text variant="bodySm" color={onDarkPanel.body} style={{ fontSize: 13.5, lineHeight: 19 }}>
          {t({
            de: "Besser als 58 % der Cafés in Köln. Diese Woche +14 % Nachfrage im Viertel — richte Einkauf & Personal danach aus.",
            en: "Better than 58% of cafés in Cologne. Demand in the neighborhood is +14% this week — plan buying & staffing around it.",
          })}
        </Text>
      </DarkPanel>

      <View style={{ gap: theme.spacing.sm }}>
        <Eyebrow>{t({ de: "Du vs. Nachbarschaft", en: "You vs. neighborhood" })}</Eyebrow>
        {ROWS.map((r) => (
          <Card key={r.label.de} emphasis="subtle" padding={14} style={{ gap: 8, borderRadius: 14 }}>
            <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "baseline" }}>
              <Text variant="cardTitleSm" style={{ fontSize: 15 }}>
                {t(r.label)}
              </Text>
              <Text variant="numeric" tone="accent" style={{ fontSize: 14 }}>
                {r.you}{" "}
                <Text variant="numeric" tone="faint" style={{ fontSize: 12 }}>
                  · Ø {r.peer}
                </Text>
              </Text>
            </View>
            <View
              accessibilityRole="progressbar"
              accessibilityLabel={t({ de: `${t(r.label)} im Viertel-Vergleich`, en: `${t(r.label)} vs. the neighborhood` })}
              accessibilityValue={{ min: 0, max: 100, now: r.percentile }}
              style={{
                height: 6,
                borderRadius: 3,
                backgroundColor: theme.colors.surfaceSunken,
                overflow: "hidden",
              }}
            >
              <View
                style={{ width: `${r.percentile}%`, height: "100%", backgroundColor: theme.colors.primary }}
              />
            </View>
          </Card>
        ))}
      </View>

      <Eyebrow tone="faint" style={{ textAlign: "center" }}>
        {t({
          de: "Anonymisiert & aggregiert — nie an Plattformen verkauft.",
          en: "Anonymized & aggregated — never sold to platforms.",
        })}
      </Eyebrow>
    </Screen>
  );
}
