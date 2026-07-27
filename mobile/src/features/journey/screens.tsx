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
import { useT } from "../../lib/i18n";
import { useStore } from "../../lib/store";
import { useToast } from "../../lib/toast";
import { useTheme } from "../../theme";
import { JourneyFrame } from "./JourneyFrame";

/* ── 18 · Willkommen ─────────────────────────────────────────────────────── */

const promises = [
  { id: "found", icon: TargetIcon, label: { de: "Bei Google gefunden werden", en: "Get found on Google" } },
  { id: "tables", icon: TableIcon, label: { de: "Tische ohne Provision füllen", en: "Fill tables without commission" } },
  { id: "reviews", icon: StarIcon, label: { de: "Bewertungen in Minuten beantworten", en: "Reply to reviews in minutes" } },
];

export function JourneyWelcome() {
  const theme = useTheme();
  const router = useRouter();
  const t = useT();

  return (
    <JourneyFrame
      step={1}
      surface="deep"
      primaryAction={{ label: t({ de: "Einrichtung starten", en: "Start setup" }), onPress: () => router.push("/journey/betrieb") }}
      footnote={t({ de: "Dauert etwa vier Minuten", en: "Takes about four minutes" })}
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
          {t({ de: "Willkommen bei Maitr", en: "Welcome to Maitr" })}
          <Text variant="heroTitle" tone="accent" style={{ fontSize: 40 }}>
            .
          </Text>
        </Text>
        <Text variant="body" tone="secondary" style={{ fontSize: 17, lineHeight: 25.5, marginTop: 12 }}>
          {t({
            de: "In sieben ruhigen Schritten steht deine Präsenz. Wir richten alles gemeinsam ein, du tippst nur.",
            en: "Your presence is ready in seven calm steps. We set everything up together, you just tap.",
          })}
        </Text>
      </View>

      <ListCard>
        {promises.map(({ id, icon: Icon, label }) => (
          <ListRow key={id} title={t(label)} leading={<Icon size={22} color={theme.colors.primary} />} />
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
  const t = useT();

  return (
    <JourneyFrame
      step={2}
      title={t({ de: "Ist das dein Betrieb?", en: "Is this your business?" })}
      subtitle={t({
        de: "Wir haben dich in den Google Daten gefunden. Stimmt das?",
        en: "We found you in Google's data. Is that right?",
      })}
      primaryAction={{ label: t({ de: "Ja, das sind wir", en: "Yes, that's us" }), onPress: () => router.push("/journey/google") }}
      secondaryAction={{ label: t({ de: "Anderen Betrieb suchen", en: "Search for another business" }), onPress: () => toast.show(t({ de: "Betriebssuche", en: "Business search" })) }}
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
            {t({ de: "Aus Google übernommen", en: "Imported from Google" })}
          </Eyebrow>
        </View>
      </Card>
    </JourneyFrame>
  );
}

/* ── 20 · Google verbinden ───────────────────────────────────────────────── */

const googleScopes = [
  { de: "Bewertungen lesen und beantworten", en: "Read and reply to reviews" },
  { de: "Öffnungszeiten aktuell halten", en: "Keep opening hours up to date" },
  { de: "Beiträge veröffentlichen", en: "Publish posts" },
];

export function JourneyGoogle() {
  const theme = useTheme();
  const router = useRouter();
  const { connectChannel } = useStore();
  const t = useT();

  return (
    <JourneyFrame
      step={3}
      title={t({ de: "Verbinde dein\nGoogle Profil", en: "Connect your\nGoogle profile" })}
      subtitle={t({
        de: "Damit Maitr Bewertungen, Zeiten und Beiträge für dich pflegen kann.",
        en: "So Maitr can look after reviews, hours and posts for you.",
      })}
      primaryAction={{
        label: t({ de: "Mit Google verbinden", en: "Connect with Google" }),
        onPress: () => {
          connectChannel("google");
          router.push("/journey/zeiten");
        },
      }}
      footnote={t({ de: "Jederzeit widerrufbar", en: "Revoke anytime" })}
    >
      <Card emphasis="default" padding={theme.spacing.xl} style={{ borderRadius: 22, gap: 14 }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 14 }}>
          <Avatar initials="G" size={48} color="#4285F4" />
          <View style={{ flex: 1 }}>
            <Text variant="cardTitleSm" style={{ fontSize: 18 }}>
              Google Business
            </Text>
            <Eyebrow style={{ fontSize: 10, marginTop: 1 }}>
              {t({ de: "Sofia Brandt · Inhaberin", en: "Sofia Brandt · Owner" })}
            </Eyebrow>
          </View>
        </View>

        <View style={{ height: 1, backgroundColor: theme.colors.surfaceSunken }} />

        {googleScopes.map((scope) => (
          <View key={scope.de} style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
            <CheckIcon size={17} color={theme.colors.success} />
            <Text variant="bodySm" color={theme.colors.textOnSunken} style={{ fontSize: 15 }}>
              {t(scope)}
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
  const t = useT();

  return (
    <JourneyFrame
      step={4}
      title={t({ de: "Stimmen deine Zeiten?", en: "Are your hours right?" })}
      subtitle={t({
        de: "Falsche Zeiten sind Grund Nummer eins für schlechte Bewertungen. Kurz prüfen.",
        en: "Wrong hours are the number one reason for bad reviews. Take a quick look.",
      })}
      primaryAction={{ label: t({ de: "Zeiten übernehmen", en: "Apply hours" }), onPress: () => router.push("/journey/tische") }}
      secondaryAction={{ label: t({ de: "Bearbeiten", en: "Edit" }), onPress: () => toast.show(t({ de: "Zeiten bearbeiten", en: "Edit hours" })) }}
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
                {t({ de: "Geschlossen", en: "Closed" })}
              </Text>
            </View>
          }
        />
      </ListCard>

      <Banner>
        {t({
          de: "Feiertage pflegt Maitr automatisch und fragt dich vorher.",
          en: "Maitr keeps holidays up to date automatically and asks you first.",
        })}
      </Banner>
    </JourneyFrame>
  );
}

/* ── 22 · Tische einrichten ──────────────────────────────────────────────── */

const SEAT_OPTIONS = [16, 24, 32, 40];

export function JourneyTables() {
  const theme = useTheme();
  const router = useRouter();
  const t = useT();

  const [tables, setTables] = useState(8);
  const [seats, setSeats] = useState(24);

  return (
    <JourneyFrame
      step={5}
      title={t({ de: "Wie viele Tische?", en: "How many tables?" })}
      subtitle={t({
        de: "So kann Maitr Reservierungen und Puffer automatisch verwalten.",
        en: "So Maitr can manage reservations and buffers automatically.",
      })}
      primaryAction={{ label: t({ de: "Weiter", en: "Continue" }), onPress: () => router.push("/journey/kanaele") }}
    >
      <Card emphasis="default" padding={theme.spacing.xl} style={{ gap: theme.spacing.lg }}>
        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
          <Text variant="body">{t({ de: "Tische im Lokal", en: "Tables in the venue" })}</Text>
          <View style={{ flexDirection: "row", alignItems: "center", gap: theme.spacing.lg }}>
            <StepperButton
              label="–"
              onPress={() => setTables((n) => Math.max(1, n - 1))}
              accessibilityLabel={t({ de: "Ein Tisch weniger", en: "One table fewer" })}
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
              accessibilityLabel={t({ de: "Ein Tisch mehr", en: "One more table" })}
            />
          </View>
        </View>

        <View style={{ height: 1, backgroundColor: theme.colors.surfaceSunken }} />

        <Eyebrow>{t({ de: "Plätze pro Service", en: "Seats per service" })}</Eyebrow>
        <View style={{ flexDirection: "row", gap: 9 }}>
          {SEAT_OPTIONS.map((option) => (
            <Pressable
              key={option}
              onPress={() => setSeats(option)}
              accessibilityRole="button"
              accessibilityState={{ selected: seats === option }}
              accessibilityLabel={t({ de: `${option} Plätze`, en: `${option} seats` })}
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
          {t({ de: "Puffer zwischen Gästen", en: "Buffer between guests" })}
        </Text>
        <Text variant="numeric" tone="accent" style={{ fontSize: 15 }}>
          {t({ de: "15 Min", en: "15 min" })}
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
  { id: "instagram", name: "Instagram", initials: "Ig", color: "#C13584", meta: { de: "Beiträge automatisch teilen", en: "Share posts automatically" }, on: true },
  { id: "facebook", name: "Facebook", initials: "f", color: "#1877F2", meta: { de: "Seite und Empfehlungen", en: "Page and recommendations" }, on: false },
  { id: "thefork", name: "TheFork", initials: "Tf", color: "#1F7A72", meta: { de: "Reservierungen bündeln", en: "Bundle reservations" }, on: false },
];

export function JourneyChannels() {
  const router = useRouter();
  // Die Auswahl schreibt direkt in den Store - was hier an ist, ist später in
  // „Deine Kanäle" (Screen 11) verbunden.
  const { channels, setChannel } = useStore();
  const t = useT();

  return (
    <JourneyFrame
      step={6}
      title={t({ de: "Wo bist du noch?", en: "Where else are you?" })}
      subtitle={t({
        de: "Maitr hält alles synchron. Du pflegst nur einen Ort.",
        en: "Maitr keeps everything in sync. You only manage one place.",
      })}
      primaryAction={{ label: t({ de: "Weiter", en: "Continue" }), onPress: () => router.push("/journey/medien") }}
      secondaryAction={{ label: t({ de: "Später verbinden", en: "Connect later" }), onPress: () => router.push("/journey/medien") }}
    >
      <ListCard>
        {journeyChannels.map((channel) => (
          <ListRow
            key={channel.id}
            title={channel.name}
            meta={t(channel.meta)}
            leading={<Avatar initials={channel.initials} size={42} color={channel.color} />}
            trailing={
              <Toggle
                value={Boolean(channels[channel.id])}
                onValueChange={(value) => setChannel(channel.id, value)}
                accessibilityLabel={t({ de: `${channel.name} verbinden`, en: `Connect ${channel.name}` })}
              />
            }
          />
        ))}
      </ListCard>
    </JourneyFrame>
  );
}

/* ── 24 · Fotos und Ton ──────────────────────────────────────────────────── */

// `value` bleibt kanonisch deutsch (nur lokaler UI-State/Vergleich); angezeigt wird `label`.
const TONE_OPTIONS = [
  { value: "Warmherzig", label: { de: "Warmherzig", en: "Warm" } },
  { value: "Kurz", label: { de: "Kurz", en: "Concise" } },
  { value: "Formell", label: { de: "Formell", en: "Formal" } },
];

export function JourneyMedia() {
  const theme = useTheme();
  const router = useRouter();
  const t = useT();
  const [tone, setTone] = useState("Warmherzig");

  return (
    <JourneyFrame
      step={7}
      title={t({ de: "Der letzte Schliff", en: "The finishing touch" })}
      subtitle={t({
        de: "Drei Fotos und ein Ton, dann klingt Maitr wie du.",
        en: "Three photos and a tone, then Maitr sounds like you.",
      })}
      primaryAction={{
        label: t({ de: "Einrichtung abschließen", en: "Finish setup" }),
        onPress: () => router.push("/journey/fertig"),
      }}
    >
      <Card emphasis="default" padding={18} style={{ gap: theme.spacing.md }}>
        <Eyebrow>{t({ de: "Fotos", en: "Photos" })}</Eyebrow>
        <View style={{ flexDirection: "row", gap: 10 }}>
          <PhotoTile tone="warm" fill style={{ aspectRatio: 1, borderRadius: theme.radius.control }} />
          <PhotoTile tone="honey" fill style={{ aspectRatio: 1, borderRadius: theme.radius.control }} />
          <AddPhotoTile />
        </View>
      </Card>

      <Card emphasis="subtle" padding={18} style={{ gap: theme.spacing.md }}>
        <Eyebrow>{t({ de: "Ton der Antworten", en: "Tone of replies" })}</Eyebrow>
        <View style={{ flexDirection: "row", gap: 9, flexWrap: "wrap" }}>
          {TONE_OPTIONS.map((option) => (
            <Pressable
              key={option.value}
              onPress={() => setTone(option.value)}
              accessibilityRole="button"
              accessibilityState={{ selected: tone === option.value }}
              accessibilityLabel={t({ de: `Ton ${option.label.de}`, en: `Tone ${option.label.en}` })}
              style={{
                borderRadius: theme.radius.pill,
                paddingVertical: 11,
                paddingHorizontal: 18,
                backgroundColor: tone === option.value ? theme.colors.primary : "transparent",
                borderWidth: tone === option.value ? 0 : 1,
                borderColor: theme.colors.border,
              }}
            >
              <Text
                variant="numeric"
                color={tone === option.value ? theme.colors.onPrimary : theme.colors.textPrimary}
                style={{ fontSize: 15 }}
              >
                {t(option.label)}
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
  { de: "Google verbunden und synchron", en: "Google connected and in sync" },
  { de: "8 Tische bereit für Reservierungen", en: "8 tables ready for reservations" },
  { de: "Instagram teilt deine Beiträge", en: "Instagram shares your posts" },
];

export function JourneyDone() {
  const theme = useTheme();
  const router = useRouter();
  const { signIn } = useStore();
  const t = useT();

  return (
    <JourneyFrame
      surface="deep"
      primaryAction={{
        label: t({ de: "Zum Start", en: "Go to home" }),
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
          {t({ de: "Deine Präsenz", en: "Your presence" })}{"\n"}{t({ de: "ist live", en: "is live" })}
          <Text variant="heroTitle" tone="accent" style={{ fontSize: 38 }}>
            .
          </Text>
        </Text>

        <Text
          variant="body"
          tone="secondary"
          style={{ fontSize: 17, lineHeight: 25.5, textAlign: "center", maxWidth: 300 }}
        >
          {t({
            de: "Gäste finden dich jetzt bei Google, können reservieren und Maitr kümmert sich um den Rest.",
            en: "Guests can now find you on Google, reserve a table, and Maitr takes care of the rest.",
          })}
        </Text>
      </View>

      <ListCard style={{ marginTop: 6 }}>
        {liveChecks.map((check) => (
          <ListRow
            key={check.de}
            title={t(check)}
            leading={<CheckIcon size={18} color={theme.colors.success} />}
          />
        ))}
      </ListCard>
    </JourneyFrame>
  );
}
