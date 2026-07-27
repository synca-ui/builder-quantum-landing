import { useMemo, useState } from "react";
import { Pressable, TextInput, View } from "react-native";
import { useRouter } from "expo-router";

import { RefreshIcon } from "../../components/icons";
import { Card } from "../../components/ui/Card";
import { Stars } from "../../components/ui/DataDisplay";
import { Eyebrow } from "../../components/ui/Eyebrow";
import { NavHeader } from "../../components/ui/NavHeader";
import { PillButton } from "../../components/ui/PillButton";
import { Screen } from "../../components/ui/Screen";
import { Text } from "../../components/ui/Text";
import { useT } from "../../lib/i18n";
import { useStore } from "../../lib/store";
import { useToast } from "../../lib/toast";
import { useTheme } from "../../theme";
import { reviews } from "./ReviewsScreen";

const MAX_CHARS = 350;

/** Antwortentwürfe je Tonfall - im Design die vier Chips über dem Editor. */
const TONES: Record<string, string> = {
  Warmherzig:
    "Liebe Marion, das lesen wir mit einem Lächeln, bis nächste Woche steht dein Flat White bereit!",
  Kurz: "Danke, Marion! Bis nächste Woche.",
  Formell:
    "Sehr geehrte Frau K., vielen Dank für Ihre Rückmeldung. Wir freuen uns auf Ihren nächsten Besuch.",
  Humorvoll:
    "Liebe Marion, dein Flat White übt schon mal fürs nächste Mal. Bis Donnerstag!",
};

/**
 * Screen 14 · Antwort bearbeiten.
 *
 * Der Ton-Wechsel ersetzt den Entwurf komplett - solange er nicht von Hand geändert
 * wurde. Danach bleibt die eigene Fassung stehen, sonst würde ein Fehlgriff auf einen
 * Chip die getippte Antwort verschlucken.
 */
export function ReplyEditorScreen({ reviewId }: { reviewId?: string }) {
  const theme = useTheme();
  const router = useRouter();
  const toast = useToast();
  const t = useT();
  const { answerReview } = useStore();

  const review = useMemo(
    () => reviews.find((r) => r.id === reviewId) ?? reviews[0],
    [reviewId],
  );

  const [tone, setTone] = useState("Warmherzig");
  const [draft, setDraft] = useState(TONES.Warmherzig);
  const [edited, setEdited] = useState(false);

  const applyTone = (next: string) => {
    setTone(next);
    if (!edited) setDraft(TONES[next]);
  };

  const publish = () => {
    answerReview(review.id);
    toast.show(t({ de: "Auf Google veröffentlicht", en: "Published to Google" }));
    router.back();
  };

  const firstName = review.author.split(" ")[0];

  return (
    <Screen contentStyle={{ gap: theme.spacing.lg }}>
      <NavHeader title={t({ de: `Antwort an ${firstName}`, en: `Reply to ${firstName}` })} />

      <View
        style={{
          backgroundColor: theme.colors.surfaceSunken,
          borderRadius: theme.radius.tile,
          padding: theme.spacing.lg,
          gap: 6,
        }}
      >
        <Stars rating={review.rating} size={13} color={theme.colors.textSecondary} />
        <Text variant="quote" tone="secondary" style={{ fontSize: 14 }}>
          {review.body}
        </Text>
      </View>

      <Eyebrow>{t({ de: "Ton wählen", en: "Choose a tone" })}</Eyebrow>
      <View style={{ flexDirection: "row", gap: 9, flexWrap: "wrap" }}>
        {Object.keys(TONES).map((name) => (
          <Pressable
            key={name}
            onPress={() => applyTone(name)}
            accessibilityRole="button"
            accessibilityState={{ selected: tone === name }}
            accessibilityLabel={t({ de: `Ton ${name}`, en: `Tone ${name}` })}
            style={({ pressed }) => ({
              borderRadius: theme.radius.pill,
              paddingVertical: 10,
              paddingHorizontal: 18,
              minHeight: theme.hitSize.minTouch,
              justifyContent: "center",
              backgroundColor: tone === name ? theme.colors.primary : "transparent",
              borderWidth: tone === name ? 0 : 1,
              borderColor: theme.colors.border,
              opacity: pressed ? 0.8 : 1,
            })}
          >
            <Text
              variant="numeric"
              color={tone === name ? theme.colors.onPrimary : theme.colors.textPrimary}
              style={{ fontSize: 14 }}
            >
              {name}
            </Text>
          </Pressable>
        ))}
      </View>

      <Card
        padding={18}
        style={{ borderWidth: 2, borderColor: theme.colors.primary, minHeight: 190 }}
      >
        <TextInput
          value={draft}
          onChangeText={(text) => {
            setDraft(text);
            setEdited(true);
          }}
          multiline
          maxLength={MAX_CHARS}
          accessibilityLabel={t({ de: "Antworttext", en: "Reply text" })}
          style={[
            theme.text.body,
            { color: theme.colors.textPrimary, lineHeight: 25.6, flex: 1, textAlignVertical: "top" },
          ]}
        />

        <View
          style={{
            flexDirection: "row",
            justifyContent: "space-between",
            alignItems: "center",
            paddingTop: theme.spacing.md,
          }}
        >
          <Eyebrow style={{ textTransform: "none" }}>
            {draft.length} / {MAX_CHARS} {t({ de: "Zeichen", en: "characters" })}
          </Eyebrow>
          <Pressable
            onPress={() => {
              setDraft(TONES[tone]);
              setEdited(false);
            }}
            accessibilityRole="button"
            accessibilityLabel={t({ de: "Neuen Vorschlag erzeugen", en: "Generate a new suggestion" })}
            hitSlop={8}
            style={{ flexDirection: "row", alignItems: "center", gap: 6 }}
          >
            <RefreshIcon size={15} color={theme.colors.primary} />
            <Eyebrow tone="accent">{t({ de: "Neu vorschlagen", en: "Suggest again" })}</Eyebrow>
          </Pressable>
        </View>
      </Card>

      <View style={{ gap: theme.spacing.md }}>
        <PillButton
          label={t({ de: "Auf Google veröffentlichen", en: "Publish to Google" })}
          onPress={publish}
        />
        <Eyebrow tone="faint" style={{ textAlign: "center" }}>
          {t({
            de: "Wird öffentlich unter deinem Profil angezeigt",
            en: "Shown publicly on your profile",
          })}
        </Eyebrow>
      </View>
    </Screen>
  );
}
