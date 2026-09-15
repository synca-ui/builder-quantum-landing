import { View } from "react-native";
import { useRouter } from "expo-router";

import { CheckIcon } from "../../components/icons";
import { Card } from "../../components/ui/Card";
import { EmptyState } from "../../components/ui/EmptyState";
import { Eyebrow } from "../../components/ui/Eyebrow";
import { NavHeader } from "../../components/ui/NavHeader";
import { PillButton } from "../../components/ui/PillButton";
import { Screen } from "../../components/ui/Screen";
import { Emphasis, Text } from "../../components/ui/Text";
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
 *
 * Für einen echten Betrieb (Prüfbericht Punkt 4) folgt der Screen einem Eintrag
 * über `POST /reservations` - `lastBooking` stammt dann aus der Serverantwort.
 * Dort steht "Reservierung eingetragen" statt "Tisch reserviert": Der Wirt hat
 * selbst eingetragen, und niemand hat dem Gast eine SMS geschickt oder etwas in
 * einen Kalender gelegt - die Route verschickt nichts. Die Ausgebucht-Karte
 * fehlt ebenfalls; `days` sind die Vorführtage, nicht die Belegung des Betriebs.
 */
export function GuestConfirmationScreen() {
  const theme = useTheme();
  const router = useRouter();
  const toast = useToast();
  const { lastBooking, days, venueProfile, hasRealVenue, showcase } = useStore();

  const echterBetrieb = hasRealVenue && !showcase;
  if (echterBetrieb) {
    const adresse = [venueProfile.street, venueProfile.city].map((t) => t.trim()).filter(Boolean).join(", ");
    return (
      <Screen contentStyle={{ gap: 18 }}>
        <NavHeader />
        {lastBooking ? (
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
              Reservierung eingetragen
              <Text variant="screenTitle" tone="accent" style={{ fontSize: 30 }}>
                .
              </Text>
            </Text>
            <Text variant="body" tone="secondary" style={{ marginTop: -6, textAlign: "center" }}>
              Sie ist gespeichert und sofort bestätigt.
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
              <DetailRow label="Gast" value={lastBooking.guest} />
              <DetailRow label="Wann" value={`${lastBooking.dateLabel} · ${lastBooking.time}`} />
              <DetailRow label="Personen" value={String(lastBooking.partySize)} />
              {/* DetailRow setzt "Name, Adresse" - ohne Adresse bliebe ein Komma
                  hängen, deshalb steht der Name dann allein. */}
              {adresse ? (
                <DetailRow label="Wo" venue={venueProfile.name || undefined} value={adresse} />
              ) : venueProfile.name ? (
                <DetailRow label="Wo" value={venueProfile.name} />
              ) : null}
            </View>

            <Text
              variant="bodySm"
              tone="muted"
              style={{ fontSize: 13, lineHeight: 19.5, paddingHorizontal: 6, textAlign: "center" }}
            >
              Maitr schickt dem Gast dazu keine Nachricht.
            </Text>
          </Card>
        ) : (
          <EmptyState
            title="Noch nichts eingetragen"
            message="Eine Reservierung erscheint hier, sobald du sie eingetragen hast."
          />
        )}

        {lastBooking ? null : (
          <PillButton label="Reservierung eintragen" onPress={() => router.replace("/gast/reservieren")} />
        )}
        <PillButton label="Fertig" variant="ghost" onPress={() => router.replace("/gast/profil")} />
      </Screen>
    );
  }

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
          Tisch reserviert
          <Text variant="screenTitle" tone="accent" style={{ fontSize: 30 }}>
            .
          </Text>
        </Text>
        <Text variant="body" tone="secondary" style={{ marginTop: -6 }}>
          Wir freuen uns auf dich, {firstName}!
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
          <DetailRow label="Wann" value={when} />
          <DetailRow label="Personen" value={String(partySize)} />
          <DetailRow label="Wo" venue={fixture.venueName} value={fixture.where} />
        </View>

        <Text
          variant="bodySm"
          tone="muted"
          style={{ fontSize: 13, lineHeight: 19.5, paddingHorizontal: 6 }}
        >
          {fixture.smsNote}
        </Text>

        <PillButton
          label="Zum Kalender hinzufügen"
          variant="outline"
          style={{ width: "100%" }}
          onPress={() => toast.show("Zum Kalender hinzugefügt")}
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
            onPress={() => toast.show("Alternative gewählt")}
            style={{ marginTop: 4, paddingHorizontal: theme.spacing.md }}
          />
        </Card>
      ) : null}

      <PillButton label="Fertig" variant="ghost" onPress={() => router.replace("/gast/profil")} />

      <Eyebrow tone="faint" style={{ textAlign: "center" }}>
        Provisionsfrei über Maitr
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
