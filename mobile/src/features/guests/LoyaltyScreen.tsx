import { useState } from "react";
import { View } from "react-native";
import { useRouter } from "expo-router";

import { Avatar } from "../../components/ui/Avatar";
import { Card } from "../../components/ui/Card";
import { DarkPanel, onDarkPanel } from "../../components/ui/DataDisplay";
import { Eyebrow } from "../../components/ui/Eyebrow";
import { NavHeader } from "../../components/ui/NavHeader";
import { PillButton } from "../../components/ui/PillButton";
import { Screen } from "../../components/ui/Screen";
import { Text } from "../../components/ui/Text";
import { useT } from "../../lib/i18n";
import { useStore, type Guest } from "../../lib/store";
import { useToast } from "../../lib/toast";
import { useTheme } from "../../theme";

/** Alle 10 Besuche ein Freigetränk. */
const REWARD_EVERY = 10;

/**
 * Stammgast-Pass - Loyalty ohne App-Zwang.
 *
 * Keine zweite Gäste-App, kein Kärtchen: die Treue lebt im Gäste-Graph + Telefonnummer.
 * Beim 10. Besuch löst Maitr die Belohnung automatisch aus und meldet sie Gast und
 * Betrieb. Der Gast merkt nur die Belohnung - der Betrieb besitzt die Beziehung.
 */
export function LoyaltyScreen() {
  const theme = useTheme();
  const router = useRouter();
  const toast = useToast();
  const t = useT();
  const { guests, logActivity } = useStore();
  const [sent, setSent] = useState<string | null>(null);

  const members = guests.filter((g) => g.visits >= 5).sort((a, b) => b.visits - a.visits);
  const totalRewards = members.reduce((sum, g) => sum + Math.floor(g.visits / REWARD_EVERY), 0);

  const sendReward = (g: Guest) => {
    logActivity({
      kind: "winback",
      title: `Freikaffee für ${g.name}`,
      detail: "Treue-Belohnung automatisch gutgeschrieben · per WhatsApp.",
      auto: true,
    });
    setSent(g.id);
    toast.show(t({ de: `Belohnung für ${g.name} gesendet`, en: `Reward sent to ${g.name}` }));
  };

  return (
    <Screen animated="subtle" contentStyle={{ gap: theme.spacing.lg }}>
      <NavHeader title={t({ de: "Stammgast-Pass", en: "Loyalty pass" })} onBack={() => router.back()} />

      <DarkPanel style={{ gap: 4 }}>
        <Eyebrow color={onDarkPanel.accent}>{t({ de: "Treue ohne Extra-App", en: "Loyalty without an extra app" })}</Eyebrow>
        <Text variant="numeric" color={onDarkPanel.title} style={{ fontSize: 30, lineHeight: 34 }}>
          {t({ de: `${totalRewards} Freikaffees`, en: `${totalRewards} free coffees` })}
        </Text>
        <Text variant="bodySm" color={onDarkPanel.body} style={{ fontSize: 13.5, lineHeight: 19 }}>
          {t({
            de: "Der Pass lebt in deinem Gäste-Graph, nicht in einer weiteren App. Maitr meldet jede fällige Belohnung — du bestätigst mit einem Tap.",
            en: "The pass lives in your guest graph, not in yet another app. Maitr flags every reward that's due — you confirm with a tap.",
          })}
        </Text>
      </DarkPanel>

      <View style={{ gap: theme.spacing.sm }}>
        <Eyebrow>{t({ de: "Deine Stammgäste", en: "Your regulars" })}</Eyebrow>
        {members.map((g) => {
          const progress = g.visits % REWARD_EVERY;
          const toNext = REWARD_EVERY - progress;
          return (
            <Card key={g.id} emphasis="subtle" padding={14} style={{ gap: 10, borderRadius: 14 }}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
                <Avatar initials={g.name.charAt(0)} size={38} />
                <View style={{ flex: 1 }}>
                  <Text variant="cardTitleSm" style={{ fontSize: 15.5 }}>
                    {g.name}
                  </Text>
                  <Eyebrow style={{ marginTop: 1 }}>
                    {t({
                      de: `${Math.floor(g.visits / REWARD_EVERY)} Freikaffees · noch ${toNext} bis zur nächsten`,
                      en: `${Math.floor(g.visits / REWARD_EVERY)} free coffees · ${toNext} more to the next`,
                    })}
                  </Eyebrow>
                </View>
                {toNext <= 2 ? (
                  <PillButton
                    label={sent === g.id ? t({ de: "Gesendet ✓", en: "Sent ✓" }) : t({ de: "Belohnen", en: "Reward" })}
                    size="compact"
                    variant={sent === g.id ? "outline" : "primary"}
                    labelSize={13}
                    onPress={sent === g.id ? undefined : () => sendReward(g)}
                  />
                ) : null}
              </View>
              <View
                accessibilityRole="progressbar"
                accessibilityLabel={t({ de: "Fortschritt zur nächsten Belohnung", en: "Progress to next reward" })}
                accessibilityValue={{ min: 0, max: REWARD_EVERY, now: progress }}
                style={{
                  height: 6,
                  borderRadius: 3,
                  backgroundColor: theme.colors.surfaceSunken,
                  overflow: "hidden",
                }}
              >
                <View
                  style={{
                    width: `${(progress / REWARD_EVERY) * 100}%`,
                    height: "100%",
                    backgroundColor: theme.colors.primary,
                  }}
                />
              </View>
            </Card>
          );
        })}
      </View>

      <Eyebrow tone="faint" style={{ textAlign: "center" }}>
        {t({
          de: "Kein Punktesammeln fürs Handy — der Gast merkt nur die Belohnung.",
          en: "No points to collect on a phone — the guest just enjoys the reward.",
        })}
      </Eyebrow>
    </Screen>
  );
}
