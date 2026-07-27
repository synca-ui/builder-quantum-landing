import { View } from "react-native";
import { useRouter } from "expo-router";

import { CheckIcon } from "../../components/icons";
import { Card } from "../../components/ui/Card";
import { Eyebrow } from "../../components/ui/Eyebrow";
import { NavHeader } from "../../components/ui/NavHeader";
import { PillButton } from "../../components/ui/PillButton";
import { ProgressBar } from "../../components/ui/Progress";
import { Screen } from "../../components/ui/Screen";
import { Text } from "../../components/ui/Text";
import { useT, type Localized } from "../../lib/i18n";
import { useStore } from "../../lib/store";
import { useToast } from "../../lib/toast";
import { useTheme } from "../../theme";

interface Step {
  id: string;
  title: Localized<string>;
  /** Warum der Schritt sich lohnt - nur bei offenen Schritten sichtbar. */
  reason?: Localized<string>;
  state: "done" | "current" | "open";
}

const steps: Step[] = [
  { id: "google", title: { de: "Google Business verbunden", en: "Google Business connected" }, state: "done" },
  { id: "hours", title: { de: "Öffnungszeiten übernommen", en: "Opening hours imported" }, state: "done" },
  {
    id: "instagram",
    title: { de: "Instagram verbinden", en: "Connect Instagram" },
    reason: { de: "Für automatische Beiträge", en: "For automatic posts" },
    state: "current",
  },
  {
    id: "photos",
    title: { de: "3 Fotos hochladen", en: "Upload 3 photos" },
    reason: { de: "Macht das Profil lebendig", en: "Brings your profile to life" },
    state: "open",
  },
];

/**
 * Screen 15 · Onboarding.
 *
 * Kurzfassung der Journey nach dem ersten Login: was schon steht, was noch fehlt.
 * Anders als die siebenteilige Journey (18-25) ist das eine Checkliste, kein Ablauf.
 */
export function OnboardingScreen() {
  const theme = useTheme();
  const router = useRouter();
  const toast = useToast();
  const { connectChannel } = useStore();
  const t = useT();

  const connectInstagram = () => {
    connectChannel("instagram");
    toast.show(t({ de: "Instagram verbunden", en: "Instagram connected" }));
    router.push("/kanaele");
  };

  return (
    <Screen surface="deep" contentStyle={{ paddingHorizontal: 26 }}>
      <NavHeader fallback="/start" />
      <View style={{ marginTop: theme.spacing.sm }}>
        <ProgressBar current={3} total={4} />
      </View>

      <View style={{ marginTop: 70 }}>
        <Eyebrow tone="accent" variant="eyebrowLg">
          {t({ de: "Fast fertig, Sofia", en: "Almost done, Sofia" })}
        </Eyebrow>
        <Text
          variant="heroTitle"
          accessibilityRole="header"
          style={{ fontSize: 40, lineHeight: 42, marginTop: 10 }}
        >
          {t({ de: "Deine Gäste finden dich ab jetzt", en: "Your guests can find you from now on" })}
          <Text variant="heroTitle" tone="accent" style={{ fontSize: 40 }}>
            .
          </Text>
        </Text>
        <Text variant="body" tone="secondary" style={{ fontSize: 17, lineHeight: 25, marginTop: 14 }}>
          {t({
            de: "Wir haben dein Google Profil verbunden. Zwei Dinge fehlen noch, dann läuft alles von selbst.",
            en: "We've connected your Google profile. Two things are still missing, then everything runs on its own.",
          })}
        </Text>
      </View>

      <View style={{ marginTop: 34, gap: theme.spacing.md }}>
        {steps.map((step) => (
          <StepCard key={step.id} step={step} />
        ))}
      </View>

      <View style={{ marginTop: theme.spacing.xxl, gap: theme.spacing.md }}>
        <PillButton label={t({ de: "Instagram verbinden", en: "Connect Instagram" })} onPress={connectInstagram} />
        <Text
          variant="bodySm"
          tone="secondary"
          style={{ fontSize: 15, textAlign: "center" }}
          onPress={() => router.replace("/start")}
        >
          {t({ de: "Später erledigen", en: "Do this later" })}
        </Text>
      </View>
    </Screen>
  );
}

function StepCard({ step }: { step: Step }) {
  const theme = useTheme();
  const t = useT();
  const done = step.state === "done";
  const current = step.state === "current";

  return (
    <Card
      emphasis={current ? "strong" : "subtle"}
      padding={0}
      style={{
        borderRadius: 18,
        paddingVertical: theme.spacing.lg,
        paddingHorizontal: 18,
        flexDirection: "row",
        alignItems: "center",
        gap: 14,
        ...(current ? { borderWidth: 2, borderColor: theme.colors.primary } : {}),
      }}
    >
      <View
        style={{
          width: 30,
          height: 30,
          borderRadius: 15,
          backgroundColor: done ? theme.colors.success : "transparent",
          borderWidth: done ? 0 : 2,
          borderColor: current ? theme.colors.primary : theme.colors.borderStrong,
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        {done ? <CheckIcon size={16} color="#FFFFFF" strokeWidth={2.6} /> : null}
      </View>

      <View style={{ flex: 1 }}>
        <Text
          variant="cardTitleSm"
          tone={done ? "faint" : "primary"}
          style={{ fontSize: 16, textDecorationLine: done ? "line-through" : "none" }}
        >
          {t(step.title)}
        </Text>
        {step.reason ? <Eyebrow style={{ marginTop: 1 }}>{t(step.reason)}</Eyebrow> : null}
      </View>
    </Card>
  );
}
