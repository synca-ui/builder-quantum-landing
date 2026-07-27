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
import { useT, type Localized } from "../../lib/i18n";
import { useStore, type PlanId } from "../../lib/store";
import { useToast } from "../../lib/toast";
import { useTheme } from "../../theme";

interface Plan {
  id: PlanId;
  name: string;
  price: string;
  tagline: Localized;
  features: Localized[];
  highlight?: boolean;
}

const PLANS: Plan[] = [
  {
    id: "start",
    name: "Start",
    price: "0 €",
    tagline: { de: "Präsenz im Blick", en: "Presence at a glance" },
    features: [
      { de: "Präsenzscore & Erkenntnisse", en: "Presence score & insights" },
      { de: "1 Kanal verbinden", en: "Connect 1 channel" },
      { de: "Bewertungen ansehen", en: "View reviews" },
    ],
  },
  {
    id: "pro",
    name: "Pro",
    price: "29 €",
    tagline: { de: "Der Alltag, erledigt", en: "Everyday work, done" },
    features: [
      { de: "Alle Kanäle (Google, Instagram …)", en: "All channels (Google, Instagram …)" },
      { de: "KI-Antworten & Beitragsplaner", en: "AI replies & post planner" },
      { de: "Gäste-CRM & Rückholung", en: "Guest CRM & win-back" },
      { de: "Provisionsfreie Reservierung", en: "Commission-free reservations" },
    ],
    highlight: true,
  },
  {
    id: "autopilot",
    name: "Autopilot",
    price: "59 €",
    tagline: { de: "Maitr übernimmt", en: "Maitr takes over" },
    features: [
      { de: "Alles aus Pro", en: "Everything in Pro" },
      { de: "Autopilot: Antworten & Beiträge ohne Freigabe", en: "Autopilot: replies & posts without approval" },
      { de: "Auslastungs-Kampagnen", en: "Occupancy campaigns" },
      { de: "WhatsApp-Concierge", en: "WhatsApp concierge" },
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
  const t = useT();
  const dataset = useVenueDataset();
  const { currentPlan, setPlan } = useStore();
  const roi = analytics.reservationRoi(dataset.reservations, dataset.averageCheck);
  const euro = (v: number) => `${Math.round(v).toLocaleString("de-DE")} €`;

  const choose = (plan: Plan) => {
    if (plan.id === currentPlan) {
      toast.show(t({ de: "Das ist dein aktueller Plan", en: "This is your current plan" }));
      return;
    }
    // Die Abrechnung ist noch nicht angebunden (Stripe-Checkout offen). Der Wechsel
    // schaltet hier nur die Vorschau um - das sagen wir auch so, statt eine Buchung
    // zu suggerieren. Sobald Billing live ist: echten Checkout aufrufen.
    setPlan(plan.id);
    toast.show(
      t({
        de: `${plan.name} als Vorschau aktiv · Abrechnung kommt später`,
        en: `${plan.name} preview active · billing comes later`,
      }),
    );
  };

  return (
    <Screen animated="subtle" contentStyle={{ gap: theme.spacing.lg }}>
      <NavHeader title={t({ de: "Pläne", en: "Plans" })} onBack={() => router.back()} />

      <DarkPanel style={{ gap: 6 }}>
        <Eyebrow color={onDarkPanel.accent}>
          {t({ de: "Was Maitr diesen Monat gebracht hat", en: "What Maitr delivered this month" })}
        </Eyebrow>
        <Text variant="numeric" color={onDarkPanel.title} style={{ fontSize: 30, lineHeight: 34 }}>
          {t({ de: `${euro(roi.revenue)} vermittelt`, en: `${euro(roi.revenue)} brought in` })}
        </Text>
        <Text variant="bodySm" color={onDarkPanel.body} style={{ fontSize: 13.5, lineHeight: 19 }}>
          {t({
            de: `${roi.covers} Gäste provisionsfrei über Maitr, ${euro(roi.savedCommission)} Provision gespart. Pro kostet 29 € — verdient ab dem ersten vollen Tisch.`,
            en: `${roi.covers} guests commission-free via Maitr, ${euro(roi.savedCommission)} in commission saved. Pro costs 29 € — pays off from the first full table.`,
          })}
        </Text>
      </DarkPanel>

      <View style={{ gap: theme.spacing.md }}>
        {PLANS.map((plan) => (
          <PlanCard key={plan.id} plan={plan} current={plan.id === currentPlan} onChoose={() => choose(plan)} />
        ))}
      </View>

      <Eyebrow tone="faint" style={{ textAlign: "center" }}>
        {t({
          de: "Jederzeit kündbar · Abrechnung über Clerk & Stripe",
          en: "Cancel anytime · billing via Clerk & Stripe",
        })}
      </Eyebrow>
    </Screen>
  );
}

function PlanCard({ plan, current, onChoose }: { plan: Plan; current: boolean; onChoose: () => void }) {
  const theme = useTheme();
  const t = useT();
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
              {t({ de: "Aktuell", en: "Current" })}
            </Eyebrow>
          ) : null}
        </View>
        <View style={{ flexDirection: "row", alignItems: "baseline", gap: 3 }}>
          <Text variant="numeric" style={{ fontSize: 22 }}>
            {plan.price}
          </Text>
          <Eyebrow>{t({ de: "/ Monat", en: "/ month" })}</Eyebrow>
        </View>
      </View>
      <Eyebrow tone="accent">{t(plan.tagline)}</Eyebrow>

      <View style={{ gap: 6, marginTop: 2 }}>
        {plan.features.map((f, i) => (
          <View key={i} style={{ flexDirection: "row", gap: 8 }}>
            <Text variant="bodySm" tone="accent" style={{ fontSize: 14 }}>
              ✓
            </Text>
            <Text variant="bodySm" tone="secondary" style={{ flex: 1, fontSize: 14, lineHeight: 19 }}>
              {t(f)}
            </Text>
          </View>
        ))}
      </View>

      <PillButton
        label={current ? t({ de: "Aktueller Plan", en: "Current plan" }) : t({ de: `${plan.name} wählen`, en: `Choose ${plan.name}` })}
        size="compact"
        variant={current ? "primary" : "outline"}
        onPress={onChoose}
        style={{ marginTop: 6 }}
      />
    </Card>
  );
}
