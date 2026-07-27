import { View } from "react-native";
import { useRouter } from "expo-router";

import { Avatar } from "../../components/ui/Avatar";
import { Card } from "../../components/ui/Card";
import { DarkPanel, onDarkPanel } from "../../components/ui/DataDisplay";
import { Eyebrow } from "../../components/ui/Eyebrow";
import { ListCard, ListRow } from "../../components/ui/ListCard";
import { LinkAction, PillButton } from "../../components/ui/PillButton";
import { Screen } from "../../components/ui/Screen";
import { Text } from "../../components/ui/Text";
import { Toggle } from "../../components/ui/Toggle";
import { useAppearance } from "../../lib/appearance";
import { useStore, type PlanId } from "../../lib/store";
import { useToast } from "../../lib/toast";
import { useTheme } from "../../theme";
import { useState } from "react";

const invoices = [
  { period: "Juli 2026", amount: "29,00 €" },
  { period: "Juni 2026", amount: "29,00 €" },
];

/** Muss zu den Plänen in AbonnementScreen passen - hier nur die Konto-Kurzfassung. */
const PLAN_INFO: Record<PlanId, { name: string; price: string; blurb: string }> = {
  start: { name: "Maitr Start", price: "0 €", blurb: "Präsenzscore, Erkenntnisse, 1 Kanal." },
  pro: { name: "Maitr Pro", price: "29 €", blurb: "Alle Kanäle, KI-Antworten, Gäste-CRM, provisionsfrei." },
  autopilot: { name: "Maitr Autopilot", price: "59 €", blurb: "Maitr übernimmt: Antworten, Beiträge, Auslastung." },
};

/**
 * Screen 12 · Konto & Abo.
 *
 * Der Schalter „Nachtbar" ist hier keine Attrappe: er schaltet die App wirklich in die
 * dunkle Palette und damit den Start-Screen auf die Abend-Fassung (Screen 16).
 */
export function AccountScreen() {
  const theme = useTheme();
  const router = useRouter();
  const toast = useToast();
  const { nightMode, toggleNightMode, accessibleMode, toggleAccessibleMode } = useAppearance();
  const { user, signOut, currentPlan } = useStore();
  const plan = PLAN_INFO[currentPlan];

  const [dailyPush, setDailyPush] = useState(true);

  const logout = () => {
    signOut();
    router.replace("/login");
  };

  return (
    <Screen withTabBar contentStyle={{ gap: 9 }}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 14 }}>
        <Avatar initials={user?.initials ?? "SB"} size={54} variant="ink" />
        <View style={{ flex: 1 }}>
          <Text variant="sectionTitle" style={{ fontSize: 22 }}>
            {user?.name ?? "Sofia Brandt"}
          </Text>
          <Eyebrow style={{ marginTop: 1 }}>
            {user?.venueName ?? "Café Goldstück"} · {user?.district ?? "Ehrenfeld"}
          </Eyebrow>
        </View>
      </View>

      <DarkPanel style={{ paddingVertical: theme.spacing.lg, paddingHorizontal: 18, gap: 6 }}>
        <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
          <Eyebrow color={onDarkPanel.accent}>{plan.name}</Eyebrow>
          <Eyebrow color={onDarkPanel.accent}>Aktiv</Eyebrow>
        </View>

        <View style={{ flexDirection: "row", alignItems: "baseline", gap: 8 }}>
          <Text variant="numeric" color={onDarkPanel.title} style={{ fontSize: 38, lineHeight: 42 }}>
            {plan.price}
          </Text>
          <Text variant="body" color={onDarkPanel.body}>
            / Monat
          </Text>
        </View>

        <Text variant="quote" color={onDarkPanel.bodyStrong} style={{ fontSize: 15 }}>
          {plan.blurb}
        </Text>
        <Eyebrow color={onDarkPanel.meta} style={{ marginTop: 4 }}>
          {currentPlan === "start" ? "Kostenlos · jederzeit upgraden" : "Nächste Abrechnung: 1. August"}
        </Eyebrow>

        <View
          style={{ flexDirection: "row", alignItems: "center", gap: 18, marginTop: theme.spacing.sm }}
        >
          <PillButton
            label="Abo verwalten"
            size="compact"
            labelColor={onDarkPanel.onAccent}
            onPress={() => router.push("/abo")}
            style={{ flex: 1, backgroundColor: onDarkPanel.title }}
          />
          <Text
            variant="action"
            color={onDarkPanel.title}
            style={{ fontSize: 15, textDecorationLine: "underline" }}
            onPress={() => router.push("/abo")}
            accessibilityRole="button"
          >
            Pläne
          </Text>
        </View>
      </DarkPanel>

      <Card
        emphasis="default"
        padding={0}
        style={{
          borderRadius: theme.radius.tile,
          paddingVertical: theme.spacing.md,
          paddingHorizontal: 18,
          flexDirection: "row",
          alignItems: "center",
          gap: 14,
        }}
      >
        <View
          style={{
            backgroundColor: theme.colors.inkAction,
            borderRadius: 7,
            paddingVertical: 6,
            paddingHorizontal: 10,
          }}
        >
          <Eyebrow color={theme.colors.onInkAction} style={{ fontSize: 12 }}>
            Visa
          </Eyebrow>
        </View>
        <View style={{ flex: 1 }}>
          <Text variant="numeric" style={{ fontSize: 17, letterSpacing: 0.7 }}>
            •••• 4242
          </Text>
          <Eyebrow style={{ fontSize: 10, marginTop: 1 }}>Läuft ab 08/28</Eyebrow>
        </View>
        <LinkAction label="Ändern" onPress={() => router.push("/abo")} />
      </Card>

      <Card
        emphasis="default"
        padding={0}
        style={{ borderRadius: theme.radius.tile, paddingHorizontal: 18, paddingTop: theme.spacing.md }}
      >
        <Eyebrow style={{ marginBottom: 4 }}>Rechnungen</Eyebrow>
        {invoices.map((invoice, index) => (
          <View
            key={invoice.period}
            style={{
              flexDirection: "row",
              justifyContent: "space-between",
              alignItems: "center",
              paddingVertical: 9,
              borderBottomWidth: index < invoices.length - 1 ? 1 : 0,
              borderBottomColor: theme.colors.surfaceSunken,
            }}
          >
            <Text variant="numeric" style={{ fontSize: 16 }}>
              {invoice.period}
            </Text>
            <Text variant="numeric" tone="muted" style={{ fontSize: 13 }}>
              {invoice.amount} ·{" "}
              <Text
                variant="numeric"
                tone="accent"
                style={{ fontSize: 13, textDecorationLine: "underline" }}
                onPress={() => toast.show(`Rechnung ${invoice.period} als PDF`)}
                accessibilityRole="button"
              >
                PDF
              </Text>
            </Text>
          </View>
        ))}
      </Card>

      <ListCard style={{ borderRadius: 18 }}>
        <ListRow
          title="Dark Modus „Nachtbar“"
          trailing={
            <Toggle
              value={nightMode}
              onValueChange={toggleNightMode}
              accessibilityLabel="Nachtbar Modus"
            />
          }
        />
        <ListRow
          title="Barrierefrei Modus"
          meta="Mehr Kontrast, keine Bewegung"
          trailing={
            <Toggle
              value={accessibleMode}
              onValueChange={toggleAccessibleMode}
              accessibilityLabel="Barrierefrei Modus"
            />
          }
        />
        <ListRow
          title="Push täglich 7:00"
          trailing={
            <Toggle
              value={dailyPush}
              onValueChange={setDailyPush}
              accessibilityLabel="Tägliche Push-Benachrichtigung um 7 Uhr"
            />
          }
        />
      </ListCard>

      <ListCard style={{ borderRadius: 18 }}>
        <ListRow
          title="Autopilot"
          meta="Was Maitr automatisch erledigt"
          onPress={() => router.push("/autopilot")}
          trailing={
            <Text variant="numeric" tone="faint" style={{ fontSize: 22 }}>
              ›
            </Text>
          }
        />
        <ListRow
          title="Profil verwalten"
          meta="Name, Beschreibung, Öffnungszeiten, Bio"
          onPress={() => router.push("/profil")}
          trailing={
            <Text variant="numeric" tone="faint" style={{ fontSize: 22 }}>
              ›
            </Text>
          }
        />
        <ListRow
          title="Deine Kanäle"
          meta="Google, Instagram, Yelp, TheFork, Facebook"
          onPress={() => router.push("/kanaele")}
          trailing={
            <Text variant="numeric" tone="faint" style={{ fontSize: 22 }}>
              ›
            </Text>
          }
        />
      </ListCard>

      <Eyebrow tone="faint" style={{ textAlign: "center", marginTop: theme.spacing.md }}>
        Via Clerk ·{" "}
        <Eyebrow tone="accent" style={{ textDecorationLine: "underline" }} onPress={logout}>
          Abmelden
        </Eyebrow>
      </Eyebrow>

      {/* Kein Produktinhalt: Einstieg ins Screen-Verzeichnis für Vorführungen.
          Als Button statt Textlink, damit die Tap-Fläche 44pt erreicht. */}
      <PillButton
        label="Alle Screens · Demo"
        variant="outline"
        size="compact"
        onPress={() => router.push("/demo")}
        style={{ alignSelf: "center", marginTop: theme.spacing.xs }}
      />
    </Screen>
  );
}
