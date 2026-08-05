import { useState } from "react";
import { View } from "react-native";
import { useRouter } from "expo-router";

import { Card } from "../../components/ui/Card";
import { Eyebrow } from "../../components/ui/Eyebrow";
import { Banner } from "../../components/ui/Media";
import { LinkAction, PillButton } from "../../components/ui/PillButton";
import { Screen } from "../../components/ui/Screen";
import { ScreenHeader } from "../../components/ui/ScreenHeader";
import { Emphasis, Text } from "../../components/ui/Text";
import { Timeline } from "../../components/ui/Timeline";
import { ClockIcon } from "../../components/icons";
import { useStore } from "../../lib/store";
import { useToast } from "../../lib/toast";
import { useTheme } from "../../theme";

/**
 * Screens 05-07 · Reservierung.
 *
 * Ein Screen, drei Zustände: teilbelegt, ausgebucht, leerer Tag. Die Tage kommen aus dem
 * Store, nicht aus der Fixture - so erscheint eine Gastbuchung oder ein Walk-in hier
 * sofort in der Zeitschiene. Im Betrieb blättert man mit den Pfeilen durch die Tage.
 */
export function ReservationsScreen() {
  const theme = useTheme();
  const toast = useToast();
  const router = useRouter();
  const { days, addReservation, toggleTableBlock, markReservationNoShow } = useStore();
  const [index, setIndex] = useState(0);
  const day = days[index];

  const step = (delta: number) =>
    setIndex((current) => (current + delta + days.length) % days.length);

  const addWalkIn = () => {
    // Walk-in zur nächsten vollen Stunde im Servicefenster, 2 Personen.
    const from = Math.min(day.serviceFrom + 1, day.serviceTo - 1);
    addReservation({ dayId: day.id, guest: "Walk in", partySize: 2, from });
    toast.show("Walk in eingetragen");
  };

  const toggleBlock = () => {
    // Ersten (ent)sperrbaren Tisch umschalten - im Demo genügt ein Tisch.
    const blocked = day.tables.find((t) => t.blockedReason);
    const target = blocked ?? day.tables[day.tables.length - 1];
    toggleTableBlock(day.id, target.id);
    toast.show(blocked ? "Tisch entsperrt" : "Tisch gesperrt");
  };

  return (
    <Screen withTabBar contentStyle={{ gap: theme.spacing.lg }}>
      <ScreenHeader
        title="Reservierung"
        period={day.label.toUpperCase()}
        onPrevious={() => step(-1)}
        onNext={() => step(1)}
      />

      <View style={{ flexDirection: "row", justifyContent: "flex-end", marginTop: -theme.spacing.sm }}>
        <LinkAction label="Gäste verwalten ›" labelSize={14} onPress={() => router.push("/gaeste")} />
      </View>

      {day.state === "full" ? (
        <View style={{ flexDirection: "row", alignItems: "center", gap: 14 }}>
          <View
            style={{
              backgroundColor: theme.colors.inkAction,
              borderRadius: theme.radius.pill,
              paddingVertical: 9,
              paddingHorizontal: 18,
            }}
          >
            <Eyebrow color={theme.colors.onInkAction} style={{ fontSize: 13 }}>
              Ausgebucht
            </Eyebrow>
          </View>
          <Text variant="body" tone="secondary">
            {day.seatsReserved} von {day.seatsTotal} Plätzen reserviert
          </Text>
        </View>
      ) : day.state === "partial" ? (
        <View style={{ flexDirection: "row", justifyContent: "space-between", gap: theme.spacing.lg }}>
          <Text variant="sectionTitle" style={{ fontSize: 20, lineHeight: 24 }}>
            {day.seatsReserved} von {day.seatsTotal} Plätzen{"\n"}heute reserviert
          </Text>
          <Eyebrow style={{ textAlign: "right", maxWidth: 110 }}>{day.serviceLabel}</Eyebrow>
        </View>
      ) : null}

      <Timeline
        fromHour={day.serviceFrom}
        toHour={day.serviceTo}
        tables={day.tables}
        bufferMinutes={day.bufferMinutes}
        showLegend={day.state === "partial"}
      />

      {day.fullNotice ? <Banner>{day.fullNotice}</Banner> : null}

      {day.state === "empty" ? (
        <EmptyDay />
      ) : (
        <View style={{ flexDirection: "row", gap: theme.spacing.md }}>
          <PillButton
            label="+ Walk in eintragen"
            variant="outline"
            size="compact"
            labelSize={14}
            onPress={addWalkIn}
            style={{ flex: 1, paddingHorizontal: theme.spacing.sm }}
          />
          <PillButton
            label={day.tables.some((t) => t.blockedReason) ? "Tisch entsperren" : "Tisch sperren"}
            variant="outline"
            size="compact"
            labelSize={14}
            onPress={toggleBlock}
            style={{ flex: 1, paddingHorizontal: theme.spacing.sm }}
          />
        </View>
      )}

      {day.nextArrival ? (
        <Card
          emphasis="default"
          padding={0}
          style={{
            borderRadius: 18,
            paddingVertical: theme.spacing.lg,
            paddingHorizontal: 18,
            flexDirection: "row",
            alignItems: "center",
            gap: theme.spacing.md,
          }}
        >
          <View style={{ flex: 1 }}>
            <Text variant="bodySm" style={{ fontSize: 15 }}>
              Nächste Ankunft: <Emphasis variant="bodySm">{day.nextArrival.guest}</Emphasis> um{" "}
              {day.nextArrival.time}
            </Text>
            <Eyebrow style={{ marginTop: 3 }}>{day.nextArrival.meta}</Eyebrow>
          </View>
          {/* No-Show erfassen: gibt den Tisch sofort frei, statt ihn verfallen zu lassen. */}
          <LinkAction
            label="No-Show"
            labelSize={14}
            onPress={() => {
              const guest = day.nextArrival!.guest;
              markReservationNoShow(day.id, guest);
              toast.show(`${guest}: Tisch wieder frei`);
            }}
          />
        </Card>
      ) : null}
    </Screen>
  );
}

/** Leerer Servicetag (Screen 07) - kein Fehler, sondern eine Einladung zum Teilen. */
function EmptyDay() {
  const theme = useTheme();
  const toast = useToast();

  return (
    <View style={{ alignItems: "center", gap: theme.spacing.lg, paddingVertical: theme.spacing.xl }}>
      <View
        style={{
          width: 72,
          height: 72,
          borderRadius: theme.radius.card,
          borderWidth: 2,
          borderStyle: "dashed",
          borderColor: theme.colors.borderStrong,
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <ClockIcon size={30} color={theme.colors.textMuted} />
      </View>

      <Text variant="screenTitle" style={{ fontSize: 27, lineHeight: 31, textAlign: "center" }}>
        Noch keine{"\n"}Reservierungen
      </Text>

      <Text
        variant="body"
        tone="secondary"
        style={{ fontSize: 15.5, lineHeight: 23, textAlign: "center", maxWidth: 300 }}
      >
        Dienstag ist ruhig, dein Buchungslink ist aktiv. Teile ihn im Google Profil und auf
        Instagram, Maitr trägt Buchungen automatisch ein.
      </Text>

      <PillButton
        label="Buchungslink teilen"
        style={{ paddingHorizontal: 34 }}
        onPress={() => toast.show("Buchungslink kopiert")}
      />
    </View>
  );
}
