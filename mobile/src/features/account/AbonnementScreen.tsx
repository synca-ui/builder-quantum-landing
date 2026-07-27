import { View } from "react-native";
import { useRouter } from "expo-router";
import { analytics } from "@maitr/core";

import { Card } from "../../components/ui/Card";
import { DarkPanel, onDarkPanel } from "../../components/ui/DataDisplay";
import { Eyebrow } from "../../components/ui/Eyebrow";
import { NavHeader } from "../../components/ui/NavHeader";
import { PillButton } from "../../components/ui/PillButton";
import { Screen } from "../../components/ui/Screen";
import { Text } from "../../components/ui/Text";
import { useVenueDataset } from "../../lib/analytics";
import { useStore, type PlanId } from "../../lib/store";
import { useToast } from "../../lib/toast";
import { useTheme } from "../../theme";

interface Plan {
  id: PlanId;
  name: string;
  price: string;
  tagline: string;
  features: string[];
  highlight?: boolean;
}

const PLANS: Plan[] = [
  {
    id: "start",
    name: "Start",
    price: "0 €",
    tagline: "Präsenz im Blick",
    features: ["Präsenzscore & Erkenntnisse", "1 Kanal verbinden", "Bewertungen ansehen"],
  },
  {
    id: "pro",
    name: "Pro",
    price: "29 €",
    tagline: "Der Alltag, erledigt",
    features: [
      "Alle Kanäle (Google, Instagram …)",
      "KI-Antworten & Beitragsplaner",
      "Gäste-CRM & Rückholung",
      "Provisionsfreie Reservierung",
    ],
    highlight: true,
  },
  {
    id: "autopilot",
    name: "Autopilot",
    price: "59 €",
    tagline: "Maitr übernimmt",
    features: [
      "Alles aus Pro",
      "Autopilot: Antworten & Beiträge ohne Freigabe",
      "Auslastungs-Kampagnen",
      "WhatsApp-Concierge",
    ],
  },
];

/**
 * Pläne / Abo. Kein toter Toast mehr, sondern eine echte Paywall - und sie ist an
 * den Euro-ROI verankert: „Du hast X € gespart, Maitr kostet 29 €." Das ist der
 * stärkste Abschluss, den der Analytics-Kern liefert.
 */
export function AbonnementScreen() {
  const theme = useTheme();
  const router = useRouter();
  const toast = useToast();
  const dataset = useVenueDataset();
  const { currentPlan, setPlan } = useStore();
  const roi = analytics.reservationRoi(dataset.reservations, dataset.averageCheck);
  const euro = (v: number) => `${Math.round(v).toLocaleString("de-DE")} €`;

  const choose = (plan: Plan) => {
    if (plan.id === currentPlan) {
      toast.show("Das ist dein aktueller Plan");
      return;
    }
    // Die Abrechnung ist noch nicht angebunden (Stripe-Checkout offen). Der Wechsel
    // schaltet hier nur die Vorschau um - das sagen wir auch so, statt eine Buchung
    // zu suggerieren. Sobald Billing live ist: echten Checkout aufrufen.
    setPlan(plan.id);
    toast.show(`${plan.name} als Vorschau aktiv · Abrechnung kommt später`);
  };

  return (
    <Screen animated="subtle" contentStyle={{ gap: theme.spacing.lg }}>
      <NavHeader title="Pläne" onBack={() => router.back()} />

      <DarkPanel style={{ gap: 6 }}>
        <Eyebrow color={onDarkPanel.accent}>Was Maitr diesen Monat gebracht hat</Eyebrow>
        <Text variant="numeric" color={onDarkPanel.title} style={{ fontSize: 30, lineHeight: 34 }}>
          {euro(roi.revenue)} vermittelt
        </Text>
        <Text variant="bodySm" color={onDarkPanel.body} style={{ fontSize: 13.5, lineHeight: 19 }}>
          {roi.covers} Gäste provisionsfrei über Maitr, {euro(roi.savedCommission)} Provision gespart.
          Pro kostet 29 € — verdient ab dem ersten vollen Tisch.
        </Text>
      </DarkPanel>

      <View style={{ gap: theme.spacing.md }}>
        {PLANS.map((plan) => (
          <PlanCard key={plan.id} plan={plan} current={plan.id === currentPlan} onChoose={() => choose(plan)} />
        ))}
      </View>

      <Eyebrow tone="faint" style={{ textAlign: "center" }}>
        Jederzeit kündbar · Abrechnung über Clerk &amp; Stripe
      </Eyebrow>
    </Screen>
  );
}

function PlanCard({ plan, current, onChoose }: { plan: Plan; current: boolean; onChoose: () => void }) {
  const theme = useTheme();
  return (
    <Card
      emphasis={current || plan.highlight ? "strong" : "subtle"}
      padding={20}
      style={{
        borderRadius: 20,
        gap: 10,
        ...(current || plan.highlight ? { borderWidth: 2, borderColor: theme.colors.primary } : {}),
      }}
    >
      <View style={{ flexDirection: "row", alignItems: "baseline", justifyContent: "space-between" }}>
        <View style={{ flexDirection: "row", alignItems: "baseline", gap: 8 }}>
          <Text variant="cardTitle" style={{ fontSize: 20 }}>
            {plan.name}
          </Text>
          {current ? (
            <Eyebrow tone="accent" style={{ fontSize: 10 }}>
              Aktuell
            </Eyebrow>
          ) : null}
        </View>
        <View style={{ flexDirection: "row", alignItems: "baseline", gap: 3 }}>
          <Text variant="numeric" style={{ fontSize: 22 }}>
            {plan.price}
          </Text>
          <Eyebrow>/ Monat</Eyebrow>
        </View>
      </View>
      <Eyebrow tone="accent">{plan.tagline}</Eyebrow>

      <View style={{ gap: 6, marginTop: 2 }}>
        {plan.features.map((f) => (
          <View key={f} style={{ flexDirection: "row", gap: 8 }}>
            <Text variant="bodySm" tone="accent" style={{ fontSize: 14 }}>
              ✓
            </Text>
            <Text variant="bodySm" tone="secondary" style={{ flex: 1, fontSize: 14, lineHeight: 19 }}>
              {f}
            </Text>
          </View>
        ))}
      </View>

      <PillButton
        label={current ? "Aktueller Plan" : `${plan.name} wählen`}
        size="compact"
        variant={current ? "primary" : "outline"}
        onPress={onChoose}
        style={{ marginTop: 6 }}
      />
    </Card>
  );
}
