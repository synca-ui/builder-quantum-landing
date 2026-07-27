import { View } from "react-native";
import { useRouter } from "expo-router";

import { CheckIcon } from "../../components/icons";
import { Card } from "../../components/ui/Card";
import { Eyebrow } from "../../components/ui/Eyebrow";
import { NavHeader } from "../../components/ui/NavHeader";
import { PillButton } from "../../components/ui/PillButton";
import { Screen } from "../../components/ui/Screen";
import { Emphasis, Text } from "../../components/ui/Text";
import { useT } from "../../lib/i18n";
import { useToast } from "../../lib/toast";
import { useStore } from "../../lib/store";
import { useTheme } from "../../theme";
import { guestConfirmation as fixture } from "./fixtures";

/**
 * Screen 02 · Bestätigung (Gast-Seite).
 *
 * Zeigt die tatsächlich gewählte Buchung (aus dem Store). Der Ausgebucht-Vorschlag
 * darunter erscheint nur, wenn der gewählte Tag im Betrieb voll ist - im Design stehen
 * Zusage und Alternative gemeinsam, hier abhängig vom echten Zustand.
 */
export function GuestConfirmationScreen() {
  const theme = useTheme();
  const router = useRouter();
  const toast = useToast();
  const t = useT();
  const { lastBooking, days } = useStore();

  const firstName = lastBooking?.guest.split(" ")[0] ?? fixture.guestFirstName;
  const when = lastBooking ? `${lastBooking.dateLabel} · ${lastBooking.time}` : fixture.when;
  const partySize = lastBooking?.partySize ?? fixture.partySize;

  // Vorschlag nur zeigen, wenn ein Tag im Betrieb wirklich ausgebucht ist.
  const showSuggestion = days.some((d) => d.state === "full");

  return (
    <Screen contentStyle={{ gap: 18 }}>
      <NavHeader />
      <Card
        emphasis="subtle"
        padding={0}
        style={{
          borderRadius: theme.radius.cardLg,
          paddingVertical: theme.spacing.xxl,
          paddingHorizontal: theme.spacing.xl,
          alignItems: "center",
          gap: 13,
        }}
      >
        <View
          style={{
            width: 74,
            height: 74,
            borderRadius: 37,
            backgroundColor: theme.colors.successSurface,
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <CheckIcon size={33} color={theme.colors.success} strokeWidth={2.4} />
        </View>

        <Text variant="screenTitle" accessibilityRole="header" style={{ fontSize: 30, lineHeight: 34 }}>
          {t({ de: "Tisch reserviert", en: "Table booked" })}
          <Text variant="screenTitle" tone="accent" style={{ fontSize: 30 }}>
            .
          </Text>
        </Text>
        <Text variant="body" tone="secondary" style={{ marginTop: -6 }}>
          {t({
            de: `Wir freuen uns auf dich, ${firstName}!`,
            en: `We can't wait to see you, ${firstName}!`,
          })}
        </Text>

        <View
          style={{
            width: "100%",
            backgroundColor: theme.colors.surfaceSunken,
            borderRadius: theme.radius.tile,
            paddingVertical: 14,
            paddingHorizontal: theme.spacing.lg,
            gap: 9,
            marginTop: 2,
          }}
        >
          <DetailRow label={t({ de: "Wann", en: "When" })} value={when} />
          <DetailRow label={t({ de: "Personen", en: "People" })} value={String(partySize)} />
          <DetailRow label={t({ de: "Wo", en: "Where" })} venue={fixture.venueName} value={fixture.where} />
        </View>

        <Text
          variant="bodySm"
          tone="muted"
          style={{ fontSize: 13, lineHeight: 19.5, paddingHorizontal: 6 }}
        >
          {fixture.smsNote}
        </Text>

        <PillButton
          label={t({ de: "Zum Kalender hinzufügen", en: "Add to calendar" })}
          variant="outline"
          style={{ width: "100%" }}
          onPress={() => toast.show(t({ de: "Zum Kalender hinzugefügt", en: "Added to calendar" }))}
        />
      </Card>

      {showSuggestion ? (
        <Card
          emphasis="subtle"
          padding={0}
          style={{
            paddingVertical: theme.spacing.lg,
            paddingHorizontal: theme.spacing.xl,
            gap: 9,
          }}
        >
          <Eyebrow>{fixture.fullDaySuggestion.state}</Eyebrow>
          <Text variant="sectionTitle">{fixture.fullDaySuggestion.headline}</Text>
          <Text variant="bodySm" tone="secondary" style={{ fontSize: 15 }}>
            {fixture.fullDaySuggestion.body}
          </Text>
          <PillButton
            label={fixture.fullDaySuggestion.action}
            size="compact"
            labelSize={14.5}
            onPress={() => toast.show(t({ de: "Alternative gewählt", en: "Alternative selected" }))}
            style={{ marginTop: 4, paddingHorizontal: theme.spacing.md }}
          />
        </Card>
      ) : null}

      <PillButton
        label={t({ de: "Fertig", en: "Done" })}
        variant="ghost"
        onPress={() => router.replace("/gast/profil")}
      />

      <Eyebrow tone="faint" style={{ textAlign: "center" }}>
        {t({ de: "Provisionsfrei über Maitr", en: "Commission-free via Maitr" })}
      </Eyebrow>
    </Screen>
  );
}

function DetailRow({
  label,
  value,
  venue,
}: {
  label: string;
  value: string;
  venue?: string;
}) {
  return (
    <View style={{ flexDirection: "row", justifyContent: "space-between", gap: 12 }}>
      <Text variant="bodySm" tone="muted" style={{ fontSize: 15 }}>
        {label}
      </Text>
      <Text variant="bodySm" style={{ fontSize: 15, textAlign: "right", flexShrink: 1 }}>
        {venue ? (
          <>
            <Emphasis variant="bodySm">{venue}</Emphasis>
            {", "}
          </>
        ) : null}
        {value}
      </Text>
    </View>
  );
}
