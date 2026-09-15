import { useMemo, useState } from "react";
import { TextInput, View } from "react-native";
import { useRouter } from "expo-router";
import { ApiError, api, isCoreConfigured } from "@maitr/core";
import { DAYS } from "@maitr/core/types";

import { Card } from "../../components/ui/Card";
import { Chip } from "../../components/ui/Chip";
import { Eyebrow } from "../../components/ui/Eyebrow";
import { NavHeader } from "../../components/ui/NavHeader";
import { PillButton } from "../../components/ui/PillButton";
import { Screen } from "../../components/ui/Screen";
import { Emphasis, Text } from "../../components/ui/Text";
import { hasRealAuth } from "../../lib/auth";
import { fensterFuer, wanduhrIn } from "../../lib/oeffnungsstatus";
import { parseClock, useStore } from "../../lib/store";
import { useTheme } from "../../theme";
import { guestBooking } from "./fixtures";
import {
  bestaetigungAus,
  istReservierung,
  naechsteTage,
  startIso,
  uhrzeitenFuer,
  type Zeitauswahl,
} from "./gastbuchung";

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
 *
 * Für einen echten Betrieb (Prüfbericht Punkte 4 und 26) ist der Screen die
 * Vorschau, wie ein Gast bucht - und zugleich ein echter Eintrag: Kopf aus dem
 * Profil, die nächsten sieben Tage ab heute statt Juli 2025, Uhrzeiten nach der
 * Öffnungszeit des Tags, und Absenden schreibt über `POST /reservations`. Der
 * Wirt trägt dabei selbst ein, deshalb ist die Reservierung sofort bestätigt.
 * "Nur freie Zeiten" steht dort nicht: Eine Belegung prüft niemand, solange die
 * Tische keinen Schreibweg haben (Prüfbericht Punkt 28).
 */
export function GuestBookingScreen() {
  const theme = useTheme();
  const router = useRouter();
  const { addReservation, setLastBooking, venueProfile, venueId, praesenz, hasRealVenue, showcase } =
    useStore();

  const [day, setDay] = useState("wed");
  const [partySize, setPartySize] = useState(2);
  const [time, setTime] = useState("18:30");
  const [name, setName] = useState<string>(guestBooking.guestName);

  // Echter Betrieb: eigene Auswahl, damit die Vorführwerte ("wed", "Marie Weber")
  // nie in einen echten Eintrag rutschen.
  const [tagWahl, setTagWahl] = useState<string | null>(null);
  const [zeitWahl, setZeitWahl] = useState<string | null>(null);
  const [gast, setGast] = useState("");
  const [telefon, setTelefon] = useState("");
  const [laeuft, setLaeuft] = useState(false);
  const [fehler, setFehler] = useState<string | null>(null);
  // Beim Öffnen festgehalten: Die Tage wechseln erst um Mitternacht, und eine
  // Auswahl, die unter dem Finger verschwindet, wäre schlimmer als eine
  // Uhrzeit, die seit dem Öffnen knapp vergangen ist.
  const [geoeffnetUm] = useState(() => new Date());

  const echterBetrieb = hasRealVenue && !showcase;
  const googleZeiten = praesenz?.google?.oeffnungszeiten;

  const tage = useMemo(() => {
    const jetztMinute = wanduhrIn(geoeffnetUm).minute;
    return naechsteTage(geoeffnetUm).map((t) => ({
      ...t,
      auswahl: uhrzeitenFuer(
        fensterFuer(DAYS[t.wochentag], venueProfile.hours, googleZeiten),
        t.heute ? jetztMinute : null,
      ),
    }));
  }, [geoeffnetUm, venueProfile.hours, googleZeiten]);

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

  // Abgeleitet statt per Effekt nachgezogen: Passt die Wahl nicht mehr (Tag
  // gewechselt, Uhrzeit dort nicht möglich), gilt der erste mögliche Wert.
  const gewaehlterTag =
    tage.find((t) => t.key === tagWahl && t.auswahl.zeiten.length > 0) ??
    tage.find((t) => t.auswahl.zeiten.length > 0) ??
    null;
  const zeiten = gewaehlterTag?.auswahl.zeiten ?? [];
  const gewaehlteZeit = zeitWahl && zeiten.includes(zeitWahl) ? zeitWahl : (zeiten[0] ?? null);
  const angebunden = hasRealAuth() && isCoreConfigured();
  const kannEintragen = Boolean(gewaehlterTag && gewaehlteZeit && gast.trim()) && angebunden && !laeuft;

  const eintragen = async () => {
    if (!gewaehlterTag || !gewaehlteZeit || !gast.trim() || laeuft) return;
    const start = startIso(gewaehlterTag, gewaehlteZeit);
    if (!start) {
      setFehler("Die Uhrzeit ließ sich nicht lesen. Bitte eine andere wählen.");
      return;
    }
    setLaeuft(true);
    setFehler(null);
    try {
      const antwort = await api.reservations.create({
        venueId,
        guestName: gast.trim(),
        partySize,
        start,
        ...(telefon.trim() ? { phone: telefon.trim() } : {}),
      });
      if (!istReservierung(antwort)) {
        // Der Aufruf lief durch, die Antwort passt aber nicht - ob gespeichert
        // wurde, weiß die App nicht. Das sagen, statt "eingetragen" zu behaupten.
        throw new Error(
          "Die Antwort des Servers war unerwartet. Bitte in den Reservierungen prüfen, ob der Eintrag angekommen ist.",
        );
      }
      setLastBooking(bestaetigungAus(antwort));
      setLaeuft(false);
      router.push("/gast/bestaetigung");
    } catch (e) {
      // Nur eine Serverantwort (ApiError) sagt sicher "nicht gespeichert". Bei
      // Abbruch oder Netzfehler kann der Eintrag trotzdem angekommen sein - ein
      // zweites Tippen legte dann eine doppelte Reservierung an.
      setFehler(
        e instanceof ApiError
          ? e.message || "Die Reservierung konnte nicht eingetragen werden."
          : e instanceof Error && e.message.startsWith("Die Antwort des Servers war unerwartet")
            ? e.message
            : "Keine sichere Antwort vom Server. Bitte erst in den Reservierungen prüfen, ob der Eintrag angekommen ist, bevor du es erneut versuchst.",
      );
      setLaeuft(false);
    }
  };

  const ort = venueProfile.city.replace(/^\d+\s/, "").trim();

  if (echterBetrieb) {
    return (
      <Screen contentStyle={{ gap: theme.spacing.md }}>
        <NavHeader />
        <View style={{ alignItems: "center", gap: 2 }}>
          <Text variant="bodySm" tone="muted" style={{ fontSize: 14 }}>
            <Emphasis variant="bodySm">{venueProfile.name}</Emphasis>
            {ort ? ` · ${ort}` : ""}
          </Text>
          <Text variant="screenTitle" accessibilityRole="header" style={{ fontSize: 30, lineHeight: 34 }}>
            Tisch <Emphasis variant="screenTitle">reservieren</Emphasis>
          </Text>
        </View>

        <Step label="1 · Wann?">
          <View style={{ flexDirection: "row", gap: 6 }}>
            {tage.map((t) => (
              <Chip
                key={t.key}
                overline={t.kurz}
                label={t.datum}
                width="grow"
                selected={gewaehlterTag?.key === t.key}
                unavailable={t.auswahl.zeiten.length === 0}
                onPress={() => setTagWahl(t.key)}
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

        <Step label="3 · Um wie viel Uhr?" hint={zeitHinweis(gewaehlterTag?.auswahl ?? null)}>
          {zeiten.length > 0 ? (
            <View style={{ flexDirection: "row", gap: 10, flexWrap: "wrap" }}>
              {zeiten.map((zeit) => (
                <Chip
                  key={zeit}
                  label={zeit}
                  selected={gewaehlteZeit === zeit}
                  onPress={() => setZeitWahl(zeit)}
                />
              ))}
            </View>
          ) : (
            <Text variant="bodySm" tone="secondary" style={{ fontSize: 15, paddingLeft: 4 }}>
              In den nächsten sieben Tagen ist laut Öffnungszeiten keine Uhrzeit möglich.
            </Text>
          )}
        </Step>

        {/* Nebeneinander wie in der Demo; die Telefonnummer ist hier ein echtes Feld,
            weil sie mit dem Eintrag gespeichert wird. */}
        <Card padding={theme.spacing.lg} style={{ flexDirection: "row", gap: theme.spacing.md }}>
          <TextInput
            value={gast}
            onChangeText={setGast}
            editable={!laeuft}
            placeholder="Name des Gastes"
            placeholderTextColor={theme.colors.textFaint}
            accessibilityLabel="Name des Gastes"
            autoCapitalize="words"
            maxLength={120}
            style={[theme.text.body, fieldStyle(theme, gast.trim().length > 0), { color: theme.colors.textPrimary, fontSize: 15 }]}
          />
          <TextInput
            value={telefon}
            onChangeText={setTelefon}
            editable={!laeuft}
            placeholder="Telefon"
            placeholderTextColor={theme.colors.textFaint}
            accessibilityLabel="Telefon, optional"
            keyboardType="phone-pad"
            maxLength={40}
            style={[theme.text.body, fieldStyle(theme, telefon.trim().length > 0), { color: theme.colors.textPrimary, fontSize: 15 }]}
          />
        </Card>

        {fehler ? (
          <Text variant="bodySm" color={theme.colors.destructive} style={{ fontSize: 14, textAlign: "center" }}>
            {fehler}
          </Text>
        ) : null}
        {!angebunden ? (
          <Text variant="bodySm" tone="muted" style={{ fontSize: 14, textAlign: "center" }}>
            Ohne Verbindung zum Maitr-Server lässt sich nichts eintragen.
          </Text>
        ) : null}

        <View style={{ gap: theme.spacing.md, marginTop: theme.spacing.sm }}>
          <PillButton
            label={
              laeuft
                ? "Wird eingetragen …"
                : gewaehlterTag && gewaehlteZeit
                  ? `Eintragen · ${gewaehlterTag.kurz} ${gewaehlterTag.datum}, ${gewaehlteZeit} · ${partySize} ${
                      partySize === 1 ? "Person" : "Personen"
                    }`
                  : "Eintragen"
            }
            labelSize={15}
            disabled={!kannEintragen}
            onPress={() => void eintragen()}
            accessibilityHint={gast.trim() ? undefined : "Erst den Namen des Gastes eingeben."}
            style={{ paddingHorizontal: theme.spacing.md }}
          />
          <Eyebrow tone="faint" style={{ textAlign: "center" }}>
            So bucht ein Gast · Dein Eintrag ist sofort bestätigt
          </Eyebrow>
        </View>
      </Screen>
    );
  }

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

/** Was hinter "3 · Um wie viel Uhr?" steht - ehrlich, woher die Uhrzeiten kommen. */
function zeitHinweis(auswahl: Zeitauswahl | null): string | undefined {
  if (!auswahl) return undefined;
  if (auswahl.grund === "offen") return "Nach Öffnungszeit";
  if (auswahl.grund === "unbekannt") return "Öffnungszeit unbekannt";
  return undefined;
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
