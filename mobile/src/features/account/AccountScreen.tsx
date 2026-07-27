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
import { useT, type Localized } from "../../lib/i18n";
import { useStore, type PlanId } from "../../lib/store";
import { useToast } from "../../lib/toast";
import { useTheme } from "../../theme";
import { useState } from "react";

const invoices = [
  { period: "Juli 2026", amount: "29,00 €" },
  { period: "Juni 2026", amount: "29,00 €" },
];

/** Muss zu den Plänen in AbonnementScreen passen - hier nur die Konto-Kurzfassung. */
const PLAN_INFO: Record<PlanId, { name: string; price: string; blurb: Localized }> = {
  start: {
    name: "Maitr Start",
    price: "0 €",
    blurb: { de: "Präsenzscore, Erkenntnisse, 1 Kanal.", en: "Presence score, insights, 1 channel." },
  },
  pro: {
    name: "Maitr Pro",
    price: "29 €",
    blurb: {
      de: "Alle Kanäle, KI-Antworten, Gäste-CRM, provisionsfrei.",
      en: "All channels, AI replies, guest CRM, commission-free.",
    },
  },
  autopilot: {
    name: "Maitr Autopilot",
    price: "59 €",
    blurb: {
      de: "Maitr übernimmt: Antworten, Beiträge, Auslastung.",
      en: "Maitr takes over: replies, posts, occupancy.",
    },
  },
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
  const t = useT();
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
          <Eyebrow color={onDarkPanel.accent}>{t({ de: "Aktiv", en: "Active" })}</Eyebrow>
        </View>

        <View style={{ flexDirection: "row", alignItems: "baseline", gap: 8 }}>
          <Text variant="numeric" color={onDarkPanel.title} style={{ fontSize: 38, lineHeight: 42 }}>
            {plan.price}
          </Text>
          <Text variant="body" color={onDarkPanel.body}>
            {t({ de: "/ Monat", en: "/ month" })}
          </Text>
        </View>

        <Text variant="quote" color={onDarkPanel.bodyStrong} style={{ fontSize: 15 }}>
          {t(plan.blurb)}
        </Text>
        <Eyebrow color={onDarkPanel.meta} style={{ marginTop: 4 }}>
          {currentPlan === "start"
            ? t({ de: "Kostenlos · jederzeit upgraden", en: "Free · upgrade anytime" })
            : t({ de: "Nächste Abrechnung: 1. August", en: "Next billing: August 1" })}
        </Eyebrow>

        <View
          style={{ flexDirection: "row", alignItems: "center", gap: 18, marginTop: theme.spacing.sm }}
        >
          <PillButton
            label={t({ de: "Abo verwalten", en: "Manage subscription" })}
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
            {t({ de: "Pläne", en: "Plans" })}
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
          <Eyebrow style={{ fontSize: 10, marginTop: 1 }}>
            {t({ de: "Läuft ab 08/28", en: "Expires 08/28" })}
          </Eyebrow>
        </View>
        <LinkAction label={t({ de: "Ändern", en: "Change" })} onPress={() => router.push("/abo")} />
      </Card>

      <Card
        emphasis="default"
        padding={0}
        style={{ borderRadius: theme.radius.tile, paddingHorizontal: 18, paddingTop: theme.spacing.md }}
      >
        <Eyebrow style={{ marginBottom: 4 }}>{t({ de: "Rechnungen", en: "Invoices" })}</Eyebrow>
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
                onPress={() =>
                  toast.show(
                    t({ de: `Rechnung ${invoice.period} als PDF`, en: `Invoice ${invoice.period} as PDF` }),
                  )
                }
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
          title={t({ de: "Dark Modus „Nachtbar“", en: 'Dark mode "Night bar"' })}
          trailing={
            <Toggle
              value={nightMode}
              onValueChange={toggleNightMode}
              accessibilityLabel={t({ de: "Nachtbar Modus", en: "Night bar mode" })}
            />
          }
        />
        <ListRow
          title={t({ de: "Barrierefrei Modus", en: "Accessible mode" })}
          meta={t({ de: "Mehr Kontrast, keine Bewegung", en: "More contrast, no motion" })}
          trailing={
            <Toggle
              value={accessibleMode}
              onValueChange={toggleAccessibleMode}
              accessibilityLabel={t({ de: "Barrierefrei Modus", en: "Accessible mode" })}
            />
          }
        />
        <ListRow
          title={t({ de: "Push täglich 7:00", en: "Daily push at 7:00" })}
          trailing={
            <Toggle
              value={dailyPush}
              onValueChange={setDailyPush}
              accessibilityLabel={t({
                de: "Tägliche Push-Benachrichtigung um 7 Uhr",
                en: "Daily push notification at 7 AM",
              })}
            />
          }
        />
      </ListCard>

      <ListCard style={{ borderRadius: 18 }}>
        <ListRow
          title="Autopilot"
          meta={t({ de: "Was Maitr automatisch erledigt", en: "What Maitr handles automatically" })}
          onPress={() => router.push("/autopilot")}
          trailing={
            <Text variant="numeric" tone="faint" style={{ fontSize: 22 }}>
              ›
            </Text>
          }
        />
        <ListRow
          title={t({ de: "Profil verwalten", en: "Manage profile" })}
          meta={t({ de: "Name, Beschreibung, Öffnungszeiten, Bio", en: "Name, description, opening hours, bio" })}
          onPress={() => router.push("/profil")}
          trailing={
            <Text variant="numeric" tone="faint" style={{ fontSize: 22 }}>
              ›
            </Text>
          }
        />
        <ListRow
          title={t({ de: "Deine Kanäle", en: "Your channels" })}
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
        {t({ de: "Via Clerk", en: "Via Clerk" })} ·{" "}
        <Eyebrow tone="accent" style={{ textDecorationLine: "underline" }} onPress={logout}>
          {t({ de: "Abmelden", en: "Sign out" })}
        </Eyebrow>
      </Eyebrow>

      {/* Kein Produktinhalt: Einstieg ins Screen-Verzeichnis für Vorführungen.
          Als Button statt Textlink, damit die Tap-Fläche 44pt erreicht. */}
      <PillButton
        label={t({ de: "Alle Screens · Demo", en: "All screens · Demo" })}
        variant="outline"
        size="compact"
        onPress={() => router.push("/demo")}
        style={{ alignSelf: "center", marginTop: theme.spacing.xs }}
      />
    </Screen>
  );
}
