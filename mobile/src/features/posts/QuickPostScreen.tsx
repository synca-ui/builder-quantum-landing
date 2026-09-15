import { useEffect, useState } from "react";
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
import { ENTWURF_OHNE_TERMIN, beitragsKanaele, beitragsVorschlaege, neuerEigenerBeitrag } from "../growth/kanaele";
import { VorschauHinweis, merkeEigenenEntwurf, useBeitragsZuordnung } from "./PostsScreen";

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
 *
 * Echter Betrieb (Integrationsprüfung 15.09., Punkt 6): Veröffentlicht wird nichts,
 * und die „stärkste Stunde“ kam aus dem Fixture-Datensatz (echte Stundenwerte gäbe
 * es nur über Meta Insights). Deshalb: Vorschau-Hinweis, Vorschläge aus den
 * Gerichten der eigenen Speisekarte statt „Zimtschnecken/Flat White“, Kanäle nur
 * verbundene, kein Rückfall auf einen Beispieltext, und gemerkt wird ein Entwurf
 * ohne Termin - nicht „geplant für Do 9:00“.
 *
 * Der Entwurf wird dem Betrieb zugeordnet, bevor der Screen schließt (Prüfer-Befund
 * 15.09.): Erst dann zeigt die Beitragsliste ihn - und nur diesem Betrieb.
 */
export function QuickPostScreen() {
  const theme = useTheme();
  const router = useRouter();
  const toast = useToast();
  const dataset = useVenueDataset();
  const { createQuickPost, hasRealVenue, showcase, channels: kanalStatus, menu, posts, venueId } = useStore();
  const [tone, setTone] = useState<MediaTone>("warm");
  const [note, setNote] = useState("");
  // Angelegt, aber noch nicht zugeordnet: `createQuickPost` gibt die id nicht zurück,
  // sie steht erst im nächsten Render in `posts`.
  const [wartet, setWartet] = useState<{ vorherIds: string[]; titel: string; venueId: string } | null>(null);
  // Früh laden, damit das Zuordnen nicht erst auf den Speicher warten muss.
  useBeitragsZuordnung();

  useEffect(() => {
    if (!wartet) return;
    const id = neuerEigenerBeitrag(wartet.vorherIds, posts, wartet.titel);
    if (!id) return;
    setWartet(null);
    merkeEigenenEntwurf(
      id,
      wartet.venueId,
      posts.map((p) => p.id),
    ).then(
      () => toast.show("Als Entwurf gemerkt"),
      () => toast.show("Entwurf nur bis zum nächsten App-Start gemerkt", "fehler"),
    );
    router.back();
  }, [wartet, posts, router, toast]);

  const echterBetrieb = hasRealVenue && !showcase;

  const slot = analytics.bestPostingSlots(dataset.engagement, 1)[0];
  const when = echterBetrieb
    ? ENTWURF_OHNE_TERMIN
    : slot
      ? `${slot.weekdayLabel} ${slot.fromHour}:00`
      : "Do 9:00";
  const uplift = slot ? slot.upliftPercent : 0;
  const channels = echterBetrieb ? beitragsKanaele(kanalStatus, true) : ["Instagram", "Google"];
  const starters = echterBetrieb ? beitragsVorschlaege(menu) : STARTERS;
  const text = note.trim();

  const plan = () => {
    if (echterBetrieb) {
      // Ohne Text gibt es nichts zu merken - kein Beispieltext springt ein.
      if (!text || wartet) return;
      setWartet({ vorherIds: posts.map((p) => p.id), titel: text, venueId });
      createQuickPost({ note: text, tone, when, channels });
      return;
    }
    createQuickPost({ note: text || STARTERS[0], tone, when, channels });
    toast.show(`Beitrag für ${when} geplant`);
    router.back();
  };

  return (
    <Screen animated="subtle" contentStyle={{ gap: theme.spacing.lg }}>
      <NavHeader title={echterBetrieb ? "Neuer Entwurf" : "Schnell posten"} fallback="/beitraege" />

      {echterBetrieb ? <VorschauHinweis /> : null}

      <Text variant="body" tone="secondary" style={{ fontSize: 15, lineHeight: 22 }}>
        {echterBetrieb
          ? "Stimmung wählen, ein, zwei Sätze schreiben - Maitr merkt sich den Entwurf."
          : "Foto-Stimmung wählen, ein, zwei Worte — Maitr textet und plant zur stärksten Stunde."}
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

      {starters.length > 0 ? (
        <View style={{ gap: 8 }}>
          <Eyebrow>{echterBetrieb ? "Aus deiner Speisekarte" : "Vorschläge zum Antippen"}</Eyebrow>
          {starters.map((s) => (
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
      ) : null}

      {echterBetrieb ? (
        <Eyebrow>
          {channels.length > 0 ? `Für ${channels.join(" + ")} · ohne Termin` : "Kein Kanal verbunden · ohne Termin"}
        </Eyebrow>
      ) : (
        <DarkPanel style={{ gap: 4 }}>
          <Eyebrow color={onDarkPanel.accent}>Maitr plant</Eyebrow>
          <Text variant="bodySm" color={onDarkPanel.title} style={{ fontSize: 15 }}>
            {when} · {channels.join(" + ")}
          </Text>
          <Text variant="bodySm" color={onDarkPanel.body} style={{ fontSize: 13 }}>
            Deine stärkste Stunde{uplift ? ` · +${uplift} % Reichweite` : ""}.
          </Text>
        </DarkPanel>
      )}

      {echterBetrieb ? (
        <PillButton label="Als Entwurf merken" onPress={plan} disabled={text.length === 0 || wartet !== null} />
      ) : (
        <PillButton label="Beitrag planen" onPress={plan} />
      )}
    </Screen>
  );
}
