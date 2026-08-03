import { useState } from "react";
import { Pressable, View } from "react-native";
import { useRouter } from "expo-router";

import { CheckIcon, StarIcon, TableIcon, TargetIcon } from "../../components/icons";
import { Avatar } from "../../components/ui/Avatar";
import { Card } from "../../components/ui/Card";
import { Tag } from "../../components/ui/Chip";
import { Eyebrow } from "../../components/ui/Eyebrow";
import { ListCard, ListRow } from "../../components/ui/ListCard";
import { AddPhotoTile, Banner, PhotoTile } from "../../components/ui/Media";
import { Emphasis, Text } from "../../components/ui/Text";
import { Toggle } from "../../components/ui/Toggle";
import { useStore } from "../../lib/store";
import { useToast } from "../../lib/toast";
import { useTheme } from "../../theme";
import { JourneyFrame } from "./JourneyFrame";

/* ── 18 · Willkommen ─────────────────────────────────────────────────────── */

const promises = [
  { id: "found", icon: TargetIcon, label: "Bei Google gefunden werden" },
  { id: "tables", icon: TableIcon, label: "Tische ohne Provision füllen" },
  { id: "reviews", icon: StarIcon, label: "Bewertungen in Minuten beantworten" },
];

export function JourneyWelcome() {
  const theme = useTheme();
  const router = useRouter();

  return (
    <JourneyFrame
      step={1}
      surface="deep"
      primaryAction={{ label: "Einrichtung starten", onPress: () => router.push("/journey/betrieb") }}
      footnote="Dauert etwa vier Minuten"
    >
      <View style={{ marginTop: 44 }}>
        <View
          style={{
            width: 72,
            height: 72,
            borderRadius: 22,
            backgroundColor: theme.colors.primary,
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Text variant="numeric" color={theme.colors.surface} style={{ fontSize: 44, lineHeight: 50 }}>
            M
            <Text variant="numeric" color={theme.colors.accent} style={{ fontSize: 44 }}>
              .
            </Text>
          </Text>
        </View>

        <Text
          variant="heroTitle"
          accessibilityRole="header"
          style={{ fontSize: 40, lineHeight: 42, marginTop: 22 }}
        >
          Willkommen bei Maitr
          <Text variant="heroTitle" tone="accent" style={{ fontSize: 40 }}>
            .
          </Text>
        </Text>
        <Text variant="body" tone="secondary" style={{ fontSize: 17, lineHeight: 25.5, marginTop: 12 }}>
          In sieben ruhigen Schritten steht deine Präsenz. Wir richten alles gemeinsam ein, du
          tippst nur.
        </Text>
      </View>

      <ListCard>
        {promises.map(({ id, icon: Icon, label }) => (
          <ListRow key={id} title={label} leading={<Icon size={22} color={theme.colors.primary} />} />
        ))}
      </ListCard>
    </JourneyFrame>
  );
}

/* ── 19 · Betrieb finden ─────────────────────────────────────────────────── */

export function JourneyVenue() {
  const theme = useTheme();
  const router = useRouter();
  const toast = useToast();

  return (
    <JourneyFrame
      step={2}
      title="Ist das dein Betrieb?"
      subtitle="Wir haben dich in den Google Daten gefunden. Stimmt das?"
      primaryAction={{ label: "Ja, das sind wir", onPress: () => router.push("/journey/google") }}
      secondaryAction={{ label: "Anderen Betrieb suchen", onPress: () => toast.show("Betriebssuche") }}
    >
      <Card emphasis="strong" padding={theme.spacing.xl} style={{ borderRadius: 22, gap: 14 }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 14 }}>
          <PhotoTile tone="warm" size={52} radius={theme.radius.tile} caption="logo" />
          <View style={{ flex: 1 }}>
            <Emphasis variant="sectionTitle" style={{ fontSize: 21 }}>
              Café Goldstück
            </Emphasis>
            <Text variant="bodySm" tone="secondary" style={{ fontSize: 14, marginTop: 1 }}>
              Körnerstraße 27, 50823 Köln
            </Text>
          </View>
        </View>

        <View style={{ flexDirection: "row", gap: 8, flexWrap: "wrap" }}>
          <Tag label="Café" />
          <Tag label="★ 4,8 · 128" />
          <Tag label="Ehrenfeld" />
        </View>

        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            gap: 8,
            backgroundColor: theme.colors.successSurface,
            borderRadius: theme.radius.chip,
            paddingVertical: 11,
            paddingHorizontal: 14,
          }}
        >
          <CheckIcon size={16} color={theme.colors.success} />
          <Eyebrow color={theme.colors.success} style={{ fontSize: 12 }}>
            Aus Google übernommen
          </Eyebrow>
        </View>
      </Card>
    </JourneyFrame>
  );
}

/* ── 20 · Google verbinden ───────────────────────────────────────────────── */

const googleScopes = [
  "Bewertungen lesen und beantworten",
  "Öffnungszeiten aktuell halten",
  "Beiträge veröffentlichen",
];

export function JourneyGoogle() {
  const theme = useTheme();
  const router = useRouter();
  const { connectChannel } = useStore();

  return (
    <JourneyFrame
      step={3}
      title={"Verbinde dein\nGoogle Profil"}
      subtitle="Damit Maitr Bewertungen, Zeiten und Beiträge für dich pflegen kann."
      primaryAction={{
        label: "Mit Google verbinden",
        onPress: () => {
          connectChannel("google");
          router.push("/journey/zeiten");
        },
      }}
      footnote="Jederzeit widerrufbar"
    >
      <Card emphasis="default" padding={theme.spacing.xl} style={{ borderRadius: 22, gap: 14 }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 14 }}>
          <Avatar initials="G" size={48} color="#4285F4" />
          <View style={{ flex: 1 }}>
            <Text variant="cardTitleSm" style={{ fontSize: 18 }}>
              Google Business
            </Text>
            <Eyebrow style={{ fontSize: 10, marginTop: 1 }}>Sofia Brandt · Inhaberin</Eyebrow>
          </View>
        </View>

        <View style={{ height: 1, backgroundColor: theme.colors.surfaceSunken }} />

        {googleScopes.map((scope) => (
          <View key={scope} style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
            <CheckIcon size={17} color={theme.colors.success} />
            <Text variant="bodySm" color={theme.colors.textOnSunken} style={{ fontSize: 15 }}>
              {scope}
            </Text>
          </View>
        ))}
      </Card>
    </JourneyFrame>
  );
}

/* ── 21 · Öffnungszeiten ─────────────────────────────────────────────────── */

export function JourneyHours() {
  const theme = useTheme();
  const router = useRouter();
  const toast = useToast();

  return (
    <JourneyFrame
      step={4}
      title="Stimmen deine Zeiten?"
      subtitle="Falsche Zeiten sind Grund Nummer eins für schlechte Bewertungen. Kurz prüfen."
      primaryAction={{ label: "Zeiten übernehmen", onPress: () => router.push("/journey/tische") }}
      secondaryAction={{ label: "Bearbeiten", onPress: () => toast.show("Zeiten bearbeiten") }}
    >
      <ListCard>
        <ListRow title="Mo bis Fr" value="8:00 bis 18:00" />
        <ListRow title="Samstag" value="9:00 bis 17:00" />
        <ListRow
          title="Sonntag"
          trailing={
            <View
              style={{
                backgroundColor: theme.colors.surfaceSunken,
                borderRadius: 8,
                paddingVertical: 5,
                paddingHorizontal: 12,
              }}
            >
              <Text variant="numeric" tone="faint" style={{ fontSize: 15 }}>
                Geschlossen
              </Text>
            </View>
          }
        />
      </ListCard>

      <Banner>Feiertage pflegt Maitr automatisch und fragt dich vorher.</Banner>
    </JourneyFrame>
  );
}

/* ── 22 · Tische einrichten ──────────────────────────────────────────────── */

const SEAT_OPTIONS = [16, 24, 32, 40];

export function JourneyTables() {
  const theme = useTheme();
  const router = useRouter();

  const [tables, setTables] = useState(8);
  const [seats, setSeats] = useState(24);

  return (
    <JourneyFrame
      step={5}
      title="Wie viele Tische?"
      subtitle="So kann Maitr Reservierungen und Puffer automatisch verwalten."
      primaryAction={{ label: "Weiter", onPress: () => router.push("/journey/kanaele") }}
    >
      <Card emphasis="default" padding={theme.spacing.xl} style={{ gap: theme.spacing.lg }}>
        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
          <Text variant="body">Tische im Lokal</Text>
          <View style={{ flexDirection: "row", alignItems: "center", gap: theme.spacing.lg }}>
            <StepperButton
              label="–"
              onPress={() => setTables((n) => Math.max(1, n - 1))}
              accessibilityLabel="Ein Tisch weniger"
            />
            <Text
              variant="numeric"
              style={{ fontSize: 24, lineHeight: 30, minWidth: 24, textAlign: "center" }}
            >
              {tables}
            </Text>
            <StepperButton
              label="+"
              filled
              onPress={() => setTables((n) => n + 1)}
              accessibilityLabel="Ein Tisch mehr"
            />
          </View>
        </View>

        <View style={{ height: 1, backgroundColor: theme.colors.surfaceSunken }} />

        <Eyebrow>Plätze pro Service</Eyebrow>
        <View style={{ flexDirection: "row", gap: 9 }}>
          {SEAT_OPTIONS.map((option) => (
            <Pressable
              key={option}
              onPress={() => setSeats(option)}
              accessibilityRole="button"
              accessibilityState={{ selected: seats === option }}
              accessibilityLabel={`${option} Plätze`}
              style={{
                borderRadius: theme.radius.chip,
                paddingVertical: 12,
                paddingHorizontal: 20,
                backgroundColor: seats === option ? theme.colors.primary : "transparent",
                borderWidth: seats === option ? 0 : 1,
                borderColor: theme.colors.border,
              }}
            >
              <Text
                variant="numeric"
                color={seats === option ? theme.colors.onPrimary : theme.colors.textPrimary}
                style={{ fontSize: 16 }}
              >
                {option}
              </Text>
            </Pressable>
          ))}
        </View>
      </Card>

      <View
        style={{
          flexDirection: "row",
          justifyContent: "space-between",
          alignItems: "center",
          backgroundColor: theme.colors.surfaceSunken,
          borderRadius: theme.radius.tile,
          paddingVertical: 14,
          paddingHorizontal: 18,
        }}
      >
        <Text variant="bodySm" style={{ fontSize: 15 }}>
          Puffer zwischen Gästen
        </Text>
        <Text variant="numeric" tone="accent" style={{ fontSize: 15 }}>
          15 Min
        </Text>
      </View>
    </JourneyFrame>
  );
}

function StepperButton({
  label,
  onPress,
  filled = false,
  accessibilityLabel,
}: {
  label: string;
  onPress: () => void;
  filled?: boolean;
  accessibilityLabel: string;
}) {
  const theme = useTheme();

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      hitSlop={6}
      style={({ pressed }) => ({
        width: 38,
        height: 38,
        borderRadius: 19,
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: filled ? theme.colors.primary : "transparent",
        borderWidth: filled ? 0 : 1,
        borderColor: theme.colors.border,
        opacity: pressed ? 0.7 : 1,
      })}
    >
      <Text
        variant="numeric"
        color={filled ? theme.colors.onPrimary : theme.colors.textPrimary}
        style={{ fontSize: 20 }}
      >
        {label}
      </Text>
    </Pressable>
  );
}

/* ── 23 · Kanäle verbinden ───────────────────────────────────────────────── */

const journeyChannels = [
  { id: "instagram", name: "Instagram", initials: "Ig", color: "#C13584", meta: "Beiträge automatisch teilen", on: true },
  { id: "facebook", name: "Facebook", initials: "f", color: "#1877F2", meta: "Seite und Empfehlungen", on: false },
  { id: "thefork", name: "TheFork", initials: "Tf", color: "#1F7A72", meta: "Reservierungen bündeln", on: false },
];

export function JourneyChannels() {
  const router = useRouter();
  // Die Auswahl schreibt direkt in den Store - was hier an ist, ist später in
  // „Deine Kanäle" (Screen 11) verbunden.
  const { channels, setChannel } = useStore();

  return (
    <JourneyFrame
      step={6}
      title="Wo bist du noch?"
      subtitle="Maitr hält alles synchron. Du pflegst nur einen Ort."
      primaryAction={{ label: "Weiter", onPress: () => router.push("/journey/medien") }}
      secondaryAction={{ label: "Später verbinden", onPress: () => router.push("/journey/medien") }}
    >
      <ListCard>
        {journeyChannels.map((channel) => (
          <ListRow
            key={channel.id}
            title={channel.name}
            meta={channel.meta}
            leading={<Avatar initials={channel.initials} size={42} color={channel.color} />}
            trailing={
              <Toggle
                value={Boolean(channels[channel.id])}
                onValueChange={(value) => setChannel(channel.id, value)}
                accessibilityLabel={`${channel.name} verbinden`}
              />
            }
          />
        ))}
      </ListCard>
    </JourneyFrame>
  );
}

/* ── 24 · Fotos und Ton ──────────────────────────────────────────────────── */

const TONE_OPTIONS = ["Warmherzig", "Kurz", "Formell"];

export function JourneyMedia() {
  const theme = useTheme();
  const router = useRouter();
  const [tone, setTone] = useState("Warmherzig");

  return (
    <JourneyFrame
      step={7}
      title="Der letzte Schliff"
      subtitle="Drei Fotos und ein Ton, dann klingt Maitr wie du."
      primaryAction={{
        label: "Einrichtung abschließen",
        onPress: () => router.push("/journey/fertig"),
      }}
    >
      <Card emphasis="default" padding={18} style={{ gap: theme.spacing.md }}>
        <Eyebrow>Fotos</Eyebrow>
        <View style={{ flexDirection: "row", gap: 10 }}>
          <PhotoTile tone="warm" fill style={{ aspectRatio: 1, borderRadius: theme.radius.control }} />
          <PhotoTile tone="honey" fill style={{ aspectRatio: 1, borderRadius: theme.radius.control }} />
          <AddPhotoTile />
        </View>
      </Card>

      <Card emphasis="subtle" padding={18} style={{ gap: theme.spacing.md }}>
        <Eyebrow>Ton der Antworten</Eyebrow>
        <View style={{ flexDirection: "row", gap: 9, flexWrap: "wrap" }}>
          {TONE_OPTIONS.map((option) => (
            <Pressable
              key={option}
              onPress={() => setTone(option)}
              accessibilityRole="button"
              accessibilityState={{ selected: tone === option }}
              accessibilityLabel={`Ton ${option}`}
              style={{
                borderRadius: theme.radius.pill,
                paddingVertical: 11,
                paddingHorizontal: 18,
                backgroundColor: tone === option ? theme.colors.primary : "transparent",
                borderWidth: tone === option ? 0 : 1,
                borderColor: theme.colors.border,
              }}
            >
              <Text
                variant="numeric"
                color={tone === option ? theme.colors.onPrimary : theme.colors.textPrimary}
                style={{ fontSize: 15 }}
              >
                {option}
              </Text>
            </Pressable>
          ))}
        </View>
      </Card>
    </JourneyFrame>
  );
}

/* ── 25 · Fertig ─────────────────────────────────────────────────────────── */

const liveChecks = [
  "Google verbunden und synchron",
  "8 Tische bereit für Reservierungen",
  "Instagram teilt deine Beiträge",
];

export function JourneyDone() {
  const theme = useTheme();
  const router = useRouter();
  const { signIn } = useStore();

  return (
    <JourneyFrame
      surface="deep"
      primaryAction={{
        label: "Zum Start",
        onPress: () => {
          // Wer die Journey als neuer Betrieb durchläuft, ist danach angemeldet.
          signIn();
          router.replace("/start");
        },
      }}
    >
      <View style={{ alignItems: "center", gap: theme.spacing.lg, marginTop: 70 }}>
        <View
          style={{
            width: 88,
            height: 88,
            borderRadius: 44,
            backgroundColor: theme.colors.primary,
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <CheckIcon size={42} color={theme.colors.onPrimary} strokeWidth={2.4} />
        </View>

        <Text
          variant="heroTitle"
          accessibilityRole="header"
          style={{ fontSize: 38, lineHeight: 40, textAlign: "center" }}
        >
          Deine Präsenz{"\n"}ist live
          <Text variant="heroTitle" tone="accent" style={{ fontSize: 38 }}>
            .
          </Text>
        </Text>

        <Text
          variant="body"
          tone="secondary"
          style={{ fontSize: 17, lineHeight: 25.5, textAlign: "center", maxWidth: 300 }}
        >
          Gäste finden dich jetzt bei Google, können reservieren und Maitr kümmert sich um den
          Rest.
        </Text>
      </View>

      <ListCard style={{ marginTop: 6 }}>
        {liveChecks.map((check) => (
          <ListRow
            key={check}
            title={check}
            leading={<CheckIcon size={18} color={theme.colors.success} />}
          />
        ))}
      </ListCard>
    </JourneyFrame>
  );
}
