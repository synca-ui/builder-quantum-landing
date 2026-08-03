import { useState } from "react";
import { TextInput, View } from "react-native";
import { useRouter } from "expo-router";

import { Card } from "../../components/ui/Card";
import { Chip } from "../../components/ui/Chip";
import { Eyebrow } from "../../components/ui/Eyebrow";
import { NavHeader } from "../../components/ui/NavHeader";
import { PillButton } from "../../components/ui/PillButton";
import { Screen } from "../../components/ui/Screen";
import { Emphasis, Text } from "../../components/ui/Text";
import { parseClock, useStore } from "../../lib/store";
import { useTheme } from "../../theme";
import { guestBooking } from "./fixtures";

/**
 * Ordnet den gewählten Gast-Tag einem Betriebs-Servicetag zu. Nur Mi (16.) und Sa (19.)
 * haben im Betrieb einen eigenen Tag; alles andere landet sichtbar auf „heute" (Mi),
 * damit die Buchung im Tische-Screen auftaucht.
 */
const DAY_TO_SERVICE: Record<string, string> = { wed: "day_wed", sat: "day_sat" };

/**
 * Screen 03 · Tisch reservieren (Gast-Seite).
 *
 * Drei numerierte Schritte auf einem Screen statt eines Wizards - das ist im Design so
 * angelegt und der Grund, warum der Abschluss-Button die ganze Auswahl wiederholt.
 */
export function GuestBookingScreen() {
  const theme = useTheme();
  const router = useRouter();
  const { addReservation, setLastBooking } = useStore();

  const [day, setDay] = useState("wed");
  const [partySize, setPartySize] = useState(2);
  const [time, setTime] = useState("18:30");
  const [name, setName] = useState<string>(guestBooking.guestName);

  const selectedDay = guestBooking.days.find((d) => d.key === day)!;

  const reserve = () => {
    const from = parseClock(time);
    const serviceDayId = DAY_TO_SERVICE[day] ?? "day_wed";
    const guestName = name.trim() || guestBooking.guestName;

    addReservation({ dayId: serviceDayId, guest: shortName(guestName), partySize, from });
    setLastBooking({
      weekday: selectedDay.weekday,
      dateLabel: `${weekdayLong(selectedDay.weekday)}, ${selectedDay.day} Juli`,
      time,
      partySize,
      guest: guestName,
    });
    router.push("/gast/bestaetigung");
  };

  return (
    <Screen contentStyle={{ gap: theme.spacing.md }}>
      <NavHeader />
      <View style={{ alignItems: "center", gap: 2 }}>
        <Text variant="bodySm" tone="muted" style={{ fontSize: 14 }}>
          <Emphasis variant="bodySm">{guestBooking.venueName}</Emphasis> ·{" "}
          {guestBooking.venueLocation}
        </Text>
        <Text variant="screenTitle" accessibilityRole="header" style={{ fontSize: 30, lineHeight: 34 }}>
          Tisch <Emphasis variant="screenTitle">reservieren</Emphasis>
        </Text>
      </View>

      <Step label="1 · Wann?">
        <View style={{ flexDirection: "row", gap: 9 }}>
          {guestBooking.days.map((entry) => (
            <Chip
              key={entry.key}
              overline={entry.weekday}
              label={entry.day}
              width="grow"
              selected={day === entry.key}
              unavailable={!entry.available}
              onPress={() => setDay(entry.key)}
            />
          ))}
        </View>
      </Step>

      <Step label="2 · Wie viele?">
        <View style={{ flexDirection: "row", gap: 8 }}>
          {guestBooking.partySizes.map((size) => (
            <Chip
              key={size}
              label={String(size)}
              width="grow"
              selected={partySize === size}
              onPress={() => setPartySize(size)}
            />
          ))}
        </View>
      </Step>

      <Step label="3 · Um wie viel Uhr?" hint="Nur freie Zeiten">
        <View style={{ flexDirection: "row", gap: 10, flexWrap: "wrap" }}>
          {guestBooking.times.map((slot) => (
            <Chip
              key={slot.key}
              label={slot.key}
              selected={time === slot.key}
              unavailable={!slot.available}
              onPress={() => setTime(slot.key)}
            />
          ))}
        </View>
      </Step>

      <Card padding={theme.spacing.lg} style={{ flexDirection: "row", gap: theme.spacing.md }}>
        <TextInput
          value={name}
          onChangeText={setName}
          placeholder="Dein Name"
          placeholderTextColor={theme.colors.textFaint}
          accessibilityLabel="Name"
          style={[
            theme.text.body,
            fieldStyle(theme, true),
            { color: theme.colors.textPrimary, fontSize: 15 },
          ]}
        />
        <Field value={guestBooking.guestPhone} />
      </Card>

      <View style={{ gap: theme.spacing.md, marginTop: theme.spacing.sm }}>
        <PillButton
          label={`Reservieren · ${selectedDay.weekday}, ${time} · ${partySize} ${
            partySize === 1 ? "Person" : "Personen"
          }`}
          labelSize={15}
          onPress={reserve}
          style={{ paddingHorizontal: theme.spacing.md }}
        />
        <Eyebrow tone="faint" style={{ textAlign: "center" }}>
          Provisionsfrei über Maitr · Keine Anzahlung
        </Eyebrow>
      </View>
    </Screen>
  );
}

function Step({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  const theme = useTheme();

  return (
    <Card
      emphasis="subtle"
      padding={0}
      style={{
        borderRadius: theme.radius.cardLg,
        paddingVertical: 18,
        paddingHorizontal: theme.spacing.lg,
        gap: theme.spacing.md,
      }}
    >
      <Eyebrow style={{ paddingLeft: 4 }}>
        {label}
        {hint ? <Eyebrow tone="faint"> · {hint}</Eyebrow> : null}
      </Eyebrow>
      {children}
    </Card>
  );
}

/** Gemeinsame Feld-Optik für Name (TextInput) und Telefon (Anzeige). */
function fieldStyle(theme: ReturnType<typeof useTheme>, filled: boolean) {
  return {
    flex: 1,
    borderWidth: 1,
    borderColor: filled ? theme.colors.borderStrong : theme.colors.border,
    borderRadius: theme.radius.control,
    paddingVertical: theme.spacing.lg,
    paddingHorizontal: 18,
    minHeight: theme.hitSize.control,
    justifyContent: "center" as const,
  };
}

/** Telefonnummer bleibt Anzeige - im Design vorausgefüllt, kein Eingabefeld. */
function Field({ value }: { value: string }) {
  const theme = useTheme();
  return (
    <View style={fieldStyle(theme, false)}>
      <Text variant="bodySm" tone="faint" style={{ fontSize: 15 }}>
        {value}
      </Text>
    </View>
  );
}

/** "Marie Weber" → "M. Weber", passend zur Zeitschienen-Darstellung. */
function shortName(full: string): string {
  const parts = full.trim().split(/\s+/);
  if (parts.length < 2) return full;
  return `${parts[0][0]}. ${parts.slice(1).join(" ")}`;
}

function weekdayLong(short: string): string {
  const map: Record<string, string> = {
    Mo: "Montag",
    Di: "Dienstag",
    Mi: "Mittwoch",
    Do: "Donnerstag",
    Fr: "Freitag",
    Sa: "Samstag",
    So: "Sonntag",
  };
  return map[short] ?? short;
}
