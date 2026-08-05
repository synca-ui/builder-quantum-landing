import { View } from "react-native";

import { useTheme } from "../../theme";
import { Eyebrow } from "./Eyebrow";
import { Hatch } from "./Hatch";
import { Text } from "./Text";

export interface TimelineBooking {
  id: string;
  guest: string;
  partySize: number;
  /** Dezimalstunde, z. B. 19.5 für 19:30. */
  from: number;
  to: number;
}

export interface TimelineTable {
  id: string;
  name: string;
  seats: number;
  bookings: TimelineBooking[];
  /** Gesperrter Tisch mit Grund, z. B. "Heute gesperrt · Stammtisch". */
  blockedReason?: string;
}

export interface TimelineProps {
  /** Servicebeginn und -ende als ganze Stunden. */
  fromHour: number;
  toHour: number;
  tables: TimelineTable[];
  /** Puffer nach jeder Reservierung in Minuten. 0 blendet ihn aus. */
  bufferMinutes?: number;
  showLegend?: boolean;
}

const LABEL_WIDTH = 70;
const ROW_HEIGHT = 52;

/**
 * Zeitschiene der Tischbelegung (Screens 05-07).
 *
 * Die Balken liegen prozentual im Servicefenster, nicht in einem Raster - so stimmt
 * die Darstellung auch bei halben Stunden und geänderten Servicezeiten.
 */
export function Timeline({
  fromHour,
  toHour,
  tables,
  bufferMinutes = 0,
  showLegend = true,
}: TimelineProps) {
  const theme = useTheme();
  const span = Math.max(1, toHour - fromHour);
  const percent = (hour: number) => ((hour - fromHour) / span) * 100;

  const hours = Array.from({ length: span + 1 }, (_, index) => fromHour + index);

  return (
    <View
      style={{
        backgroundColor: theme.colors.surfaceSunken,
        borderRadius: theme.radius.cardLg,
        paddingTop: theme.spacing.xl,
        paddingBottom: theme.spacing.lg,
        paddingHorizontal: 18,
        gap: 14,
      }}
    >
      {/* Stundenskala */}
      <View style={{ flexDirection: "row", gap: 12 }}>
        <View style={{ width: LABEL_WIDTH }} />
        <View style={{ flex: 1, flexDirection: "row", justifyContent: "space-between" }}>
          {hours.map((hour) => (
            <Text key={hour} variant="numeric" tone="muted" style={{ fontSize: 12 }}>
              {hour}
            </Text>
          ))}
        </View>
      </View>

      {tables.map((table) => (
        <View key={table.id} style={{ flexDirection: "row", gap: 12, alignItems: "center" }}>
          <View style={{ width: LABEL_WIDTH }}>
            <Text
              variant="numeric"
              tone={table.blockedReason ? "muted" : "primary"}
              style={{
                fontSize: 16,
                textDecorationLine: table.blockedReason ? "line-through" : "none",
              }}
            >
              {table.name}
            </Text>
            <Eyebrow
              color={table.blockedReason ? theme.colors.destructive : theme.colors.textMuted}
              style={{ fontSize: 10 }}
            >
              {table.blockedReason ? "Gesperrt" : `${table.seats} Pers`}
            </Eyebrow>
          </View>

          <View
            style={{
              flex: 1,
              height: ROW_HEIGHT,
              borderRadius: theme.radius.chip,
              backgroundColor: theme.colors.surfaceTrack,
              overflow: "hidden",
            }}
          >
            {table.blockedReason ? (
              <>
                <Hatch
                  color={theme.colors.hatch}
                  background={theme.colors.surfaceSunken}
                  spacing={12}
                  strokeWidth={6}
                />
                <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
                  <Eyebrow>{table.blockedReason}</Eyebrow>
                </View>
              </>
            ) : (
              table.bookings.map((booking) => (
                <View key={booking.id}>
                  <View
                    style={{
                      position: "absolute",
                      left: `${percent(booking.from)}%`,
                      width: `${percent(booking.to) - percent(booking.from)}%`,
                      height: ROW_HEIGHT,
                      borderRadius: theme.radius.chip,
                      backgroundColor: theme.colors.primary,
                      paddingVertical: 8,
                      paddingHorizontal: 11,
                      overflow: "hidden",
                    }}
                  >
                    <Text
                      variant="bodySm"
                      color={theme.colors.onPrimary}
                      numberOfLines={1}
                      style={{ fontSize: 13, lineHeight: 16 }}
                    >
                      {booking.guest} · {booking.partySize} P
                    </Text>
                    <Text
                      variant="bodySm"
                      color={theme.colors.onPrimary}
                      numberOfLines={1}
                      style={{ fontSize: 12, lineHeight: 15, opacity: 0.82 }}
                    >
                      {formatHour(booking.from)}–{formatHour(booking.to)}
                    </Text>
                  </View>

                  {bufferMinutes > 0 ? (
                    <View
                      style={{
                        position: "absolute",
                        left: `${percent(booking.to)}%`,
                        width: `${(bufferMinutes / 60 / span) * 100}%`,
                        height: ROW_HEIGHT,
                        overflow: "hidden",
                      }}
                    >
                      <Hatch color={theme.colors.hatch} spacing={8} strokeWidth={4} />
                    </View>
                  ) : null}
                </View>
              ))
            )}
          </View>
        </View>
      ))}

      {showLegend ? (
        <View
          style={{
            flexDirection: "row",
            gap: 16,
            paddingLeft: LABEL_WIDTH + 12,
            flexWrap: "wrap",
          }}
        >
          <LegendItem label="Reserviert" color={theme.colors.primary} />
          <LegendItem label="Frei" color={theme.colors.surfaceTrack} />
          {bufferMinutes > 0 ? (
            <LegendItem label={`Puffer ${bufferMinutes} Min`} hatched />
          ) : null}
        </View>
      ) : null}
    </View>
  );
}

function LegendItem({
  label,
  color,
  hatched = false,
}: {
  label: string;
  color?: string;
  hatched?: boolean;
}) {
  const theme = useTheme();

  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
      <View
        style={{
          width: 12,
          height: 12,
          borderRadius: 4,
          backgroundColor: hatched ? "transparent" : color,
          overflow: "hidden",
        }}
      >
        {hatched ? <Hatch color={theme.colors.hatch} spacing={6} strokeWidth={3} /> : null}
      </View>
      <Eyebrow style={{ letterSpacing: 0.36 }}>{label}</Eyebrow>
    </View>
  );
}

/** 19.5 → "19:30". Die Zeitschiene rechnet in Dezimalstunden. */
export function formatHour(hour: number): string {
  const h = Math.floor(hour);
  const m = Math.round((hour - h) * 60);
  return `${h}:${String(m).padStart(2, "0")}`;
}
