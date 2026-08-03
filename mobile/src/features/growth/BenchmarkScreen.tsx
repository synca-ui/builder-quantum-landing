import { View } from "react-native";
import { useRouter } from "expo-router";

import { Card } from "../../components/ui/Card";
import { DarkPanel, onDarkPanel } from "../../components/ui/DataDisplay";
import { Eyebrow } from "../../components/ui/Eyebrow";
import { NavHeader } from "../../components/ui/NavHeader";
import { Screen } from "../../components/ui/Screen";
import { Text } from "../../components/ui/Text";
import { useTheme } from "../../theme";

interface Row {
  label: string;
  you: string;
  peer: string;
  /** 0-100, Position im Viertel. */
  percentile: number;
}

const ROWS: Row[] = [
  { label: "Bewertung", you: "4,8", peer: "4,3", percentile: 88 },
  { label: "Antwortquote", you: "100 %", peer: "61 %", percentile: 92 },
  { label: "Aufrufe / Monat", you: "4.812", peer: "3.100", percentile: 74 },
  { label: "Reservierungen", you: "61", peer: "38", percentile: 81 },
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

  return (
    <Screen animated="subtle" contentStyle={{ gap: theme.spacing.lg }}>
      <NavHeader title="Köln-Index" onBack={() => router.back()} />

      <DarkPanel style={{ gap: 4 }}>
        <Eyebrow color={onDarkPanel.accent}>Ehrenfeld · anonymer Vergleich</Eyebrow>
        <Text variant="numeric" color={onDarkPanel.title} style={{ fontSize: 30, lineHeight: 34 }}>
          Top 12 %
        </Text>
        <Text variant="bodySm" color={onDarkPanel.body} style={{ fontSize: 13.5, lineHeight: 19 }}>
          Besser als 58 % der Cafés in Köln. Diese Woche +14 % Nachfrage im Viertel — richte
          Einkauf &amp; Personal danach aus.
        </Text>
      </DarkPanel>

      <View style={{ gap: theme.spacing.sm }}>
        <Eyebrow>Du vs. Nachbarschaft</Eyebrow>
        {ROWS.map((r) => (
          <Card key={r.label} emphasis="subtle" padding={14} style={{ gap: 8, borderRadius: 14 }}>
            <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "baseline" }}>
              <Text variant="cardTitleSm" style={{ fontSize: 15 }}>
                {r.label}
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
              accessibilityLabel={`${r.label} im Viertel-Vergleich`}
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
        Anonymisiert &amp; aggregiert — nie an Plattformen verkauft.
      </Eyebrow>
    </Screen>
  );
}
