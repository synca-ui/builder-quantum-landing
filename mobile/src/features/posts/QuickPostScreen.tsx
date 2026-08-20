import { useState } from "react";
import { Pressable, TextInput, View, type TextStyle } from "react-native";
import { useRouter } from "expo-router";
import { analytics } from "@maitr/core";

import { Card } from "../../components/ui/Card";
import { DarkPanel, onDarkPanel } from "../../components/ui/DataDisplay";
import { Eyebrow } from "../../components/ui/Eyebrow";
import { PhotoTile } from "../../components/ui/Media";
import { NavHeader } from "../../components/ui/NavHeader";
import { PillButton } from "../../components/ui/PillButton";
import { Screen } from "../../components/ui/Screen";
import { Text } from "../../components/ui/Text";
import { useVenueDataset } from "../../lib/analytics";
import { useStore, type MediaTone } from "../../lib/store";
import { useToast } from "../../lib/toast";
import { useTheme } from "../../theme";

const TONES: { key: MediaTone; label: string }[] = [
  { key: "warm", label: "Warm" },
  { key: "honey", label: "Honig" },
  { key: "cool", label: "Kühl" },
];

/** Ein-Tap-Starter statt leerem Blatt - „diktieren" ohne Tastatur. */
const STARTERS = [
  "Frische Zimtschnecken, gerade aus dem Ofen.",
  "Heute Sonne — die Terrasse ist offen.",
  "Neu: Flat White mit unserer Hausröstung.",
];

/**
 * Schnell posten - Foto/Sprach-first.
 *
 * Stimmung wählen, ein, zwei Worte (oder ein Starter antippen), fertig: Maitr textet
 * und plant zur stärksten Stunde. Marketing wird zur Geste mit mehligen Händen -
 * kein Wissen über Kanäle, Timing oder Copy nötig.
 */
export function QuickPostScreen() {
  const theme = useTheme();
  const router = useRouter();
  const toast = useToast();
  const dataset = useVenueDataset();
  const { createQuickPost } = useStore();
  const [tone, setTone] = useState<MediaTone>("warm");
  const [note, setNote] = useState("");

  const slot = analytics.bestPostingSlots(dataset.engagement, 1)[0];
  const when = slot ? `${slot.weekdayLabel} ${slot.fromHour}:00` : "Do 9:00";
  const uplift = slot ? slot.upliftPercent : 0;
  const channels = ["Instagram", "Google"];

  const plan = () => {
    const text = note.trim() || STARTERS[0];
    createQuickPost({ note: text, tone, when, channels });
    toast.show(`Beitrag für ${when} geplant`);
    router.back();
  };

  return (
    <Screen animated="subtle" contentStyle={{ gap: theme.spacing.lg }}>
      <NavHeader title="Schnell posten" fallback="/beitraege" />

      <Text variant="body" tone="secondary" style={{ fontSize: 15, lineHeight: 22 }}>
        Foto-Stimmung wählen, ein, zwei Worte — Maitr textet und plant zur stärksten Stunde.
      </Text>

      <View style={{ flexDirection: "row", gap: theme.spacing.md }}>
        {TONES.map((t) => (
          <Pressable
            key={t.key}
            onPress={() => setTone(t.key)}
            accessibilityRole="button"
            accessibilityLabel={`Foto-Stimmung ${t.label}`}
            style={{ flex: 1, alignItems: "center", gap: 6 }}
          >
            <PhotoTile
              tone={t.key}
              size={96}
              radius={theme.radius.tile}
              style={tone === t.key ? { borderWidth: 2, borderColor: theme.colors.primary } : {}}
            />
            <Eyebrow tone={tone === t.key ? "accent" : "muted"}>{t.label}</Eyebrow>
          </Pressable>
        ))}
      </View>

      <TextInput
        value={note}
        onChangeText={setNote}
        placeholder="Was gibt's Neues?"
        placeholderTextColor={theme.colors.textFaint}
        accessibilityLabel="Beitragstext"
        maxFontSizeMultiplier={1.8}
        multiline
        style={[
          theme.text.body as TextStyle,
          {
            color: theme.colors.textPrimary,
            backgroundColor: theme.colors.surface,
            borderRadius: theme.radius.control,
            padding: 16,
            minHeight: 70,
            borderWidth: 1,
            borderColor: theme.colors.border,
          },
        ]}
      />

      <View style={{ gap: 8 }}>
        <Eyebrow>Vorschläge zum Antippen</Eyebrow>
        {STARTERS.map((s) => (
          <Pressable key={s} onPress={() => setNote(s)} accessibilityRole="button">
            <Card
              emphasis="subtle"
              padding={12}
              style={{
                borderRadius: 12,
                ...(note === s ? { borderWidth: 1.5, borderColor: theme.colors.primary } : {}),
              }}
            >
              <Text variant="bodySm" tone="secondary" style={{ fontSize: 13.5 }}>
                {s}
              </Text>
            </Card>
          </Pressable>
        ))}
      </View>

      <DarkPanel style={{ gap: 4 }}>
        <Eyebrow color={onDarkPanel.accent}>Maitr plant</Eyebrow>
        <Text variant="bodySm" color={onDarkPanel.title} style={{ fontSize: 15 }}>
          {when} · {channels.join(" + ")}
        </Text>
        <Text variant="bodySm" color={onDarkPanel.body} style={{ fontSize: 13 }}>
          Deine stärkste Stunde{uplift ? ` · +${uplift} % Reichweite` : ""}.
        </Text>
      </DarkPanel>

      <PillButton label="Beitrag planen" onPress={plan} />
    </Screen>
  );
}
