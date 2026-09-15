import { useEffect, useState } from "react";
import { View } from "react-native";
import { api, isCoreConfigured } from "@maitr/core";

import { MoonIcon } from "../../components/icons";
import { StatusLabel } from "../../components/ui/Avatar";
import { Card } from "../../components/ui/Card";
import { Eyebrow } from "../../components/ui/Eyebrow";
import { LinkAction, PillButton } from "../../components/ui/PillButton";
import { Screen } from "../../components/ui/Screen";
import { Emphasis, Text } from "../../components/ui/Text";
import { useAppearance } from "../../lib/appearance";
import { hasRealAuth } from "../../lib/auth";
import { oeffnungsstatus, uhrzeit, wanduhrIn } from "../../lib/oeffnungsstatus";
import { useStore } from "../../lib/store";
import { useToast } from "../../lib/toast";
import { useTheme } from "../../theme";
import { naechsteAnkunft, naechsteTage, uhrzeitDer } from "../reservations/gastbuchung";

export const eveningBriefing = {
  dateLabel: "Mittwoch, 21:40 · Service läuft",
  venueName: "Café Goldstück",
  tablesLabel: "3 von 8 Tischen",
  nextArrival: { time: "19:00", label: "Nächste Ankunft · M. Weber" },
  walkIns: { count: 2, label: "Walk ins offen" },
  quietMoment: {
    eyebrow: "Ruhiger Moment · 1 Min",
    title: "Beitrag „Zimtschnecken\" für morgen 9:00 freigeben",
    action: "Freigeben",
  },
} as const;

/** Wie oft die Liste neu geholt wird: Web-App-Buchungen kommen auch abends noch an. */
const ABRUF_TAKT_MS = 5 * 60_000;

/**
 * Stand des Reservierungsabrufs. "fehler" bleibt getrennt von einer leeren
 * Liste - "nicht abrufbar" ist nicht "heute keine Reservierungen".
 */
type Abruf =
  | { zustand: "laedt" }
  | { zustand: "fehler" }
  /** `fuer`: Betrieb der Antwort - nach einem Betriebswechsel gilt sie nicht mehr. */
  | { zustand: "bereit"; fuer: string; antwort: unknown };

/**
 * Screen 16 · Guten Abend · Nachtbar.
 *
 * Die Abendfassung des Start-Screens: weniger Aufgaben, mehr Lagebild. Sie erscheint,
 * wenn der Nachtbar-Modus an ist - der Schalter sitzt im Konto (Screen 12) und als
 * Mondsymbol im Kopf des Morgen-Screens.
 *
 * Für einen echten Betrieb (Prüfbericht Punkte 3 und 10): Name aus dem Profil,
 * Datum und Uhrzeit vom Gerät, der Geöffnet-Status aus den Öffnungszeiten und die
 * nächste Ankunft aus `GET /reservations/upcoming`. "3 von 8 Tischen", die
 * Walk-ins und der Beitragsvorschlag haben keine Datenquelle - sie fehlen dort,
 * statt die Zahlen des Demo-Cafés zu zeigen. Demo und Showcase bleiben der
 * Vorführzustand.
 */
export function EveningScreen() {
  const theme = useTheme();
  const toast = useToast();
  const { toggleNightMode } = useAppearance();
  const { venueProfile, venueId, praesenz, hasRealVenue, showcase } = useStore();
  const [planned, setPlanned] = useState(false);

  const echterBetrieb = hasRealVenue && !showcase;
  const abrufbar = echterBetrieb && hasRealAuth() && isCoreConfigured();

  // Die Uhr läuft mit: Der Screen bleibt abends lange offen, und "21:40" um
  // 23 Uhr wäre genauso erfunden wie die feste Zeile der Demo.
  const [jetzt, setJetzt] = useState(() => new Date());
  useEffect(() => {
    if (!echterBetrieb) return;
    const takt = setInterval(() => setJetzt(new Date()), 60_000);
    return () => clearInterval(takt);
  }, [echterBetrieb]);

  // Wechselt alle fünf Minuten und stößt damit den Abruf unten erneut an - ohne
  // zweiten Zeitgeber.
  const abrufFenster = Math.floor(jetzt.getTime() / ABRUF_TAKT_MS);

  const [abruf, setAbruf] = useState<Abruf>({ zustand: "laedt" });
  useEffect(() => {
    if (!abrufbar) return;
    const controller = new AbortController();
    // Beim Nachladen die bekannte Liste stehen lassen, statt alle fünf Minuten
    // "wird geladen" aufblitzen zu lassen.
    setAbruf((vorher) =>
      vorher.zustand === "bereit" && vorher.fuer === venueId ? vorher : { zustand: "laedt" },
    );
    api.reservations
      .upcoming(venueId, 1, controller.signal)
      .then((antwort) => {
        if (controller.signal.aborted) return;
        setAbruf({ zustand: "bereit", fuer: venueId, antwort });
      })
      .catch(() => {
        if (controller.signal.aborted) return;
        setAbruf((vorher) =>
          vorher.zustand === "bereit" && vorher.fuer === venueId ? vorher : { zustand: "fehler" },
        );
      });
    return () => controller.abort();
  }, [abrufbar, venueId, abrufFenster]);

  const status = echterBetrieb
    ? oeffnungsstatus(jetzt, venueProfile.hours, praesenz?.google?.oeffnungszeiten)
    : null;
  const datumZeile = `${naechsteTage(jetzt, 1)[0].lang} · ${uhrzeit(wanduhrIn(jetzt).minute)}`;

  // Eine Antwort für einen anderen Betrieb zählt nicht - bis der Effekt nach dem
  // Wechsel läuft, vergeht ein Bild, und darin stünde sonst ein fremder Gast.
  const aktuell: Abruf = abruf.zustand === "bereit" && abruf.fuer !== venueId ? { zustand: "laedt" } : abruf;
  // `null`: Antwort war keine Liste - wie ein Fehler behandeln, nicht wie "keine".
  const lage = aktuell.zustand === "bereit" ? naechsteAnkunft(aktuell.antwort, jetzt) : null;

  return (
    <Screen withTabBar contentStyle={{ gap: theme.spacing.lg }}>
      <View style={{ marginTop: 6 }}>
        <Text variant="bodySm" tone="secondary" style={{ fontSize: 15 }}>
          {echterBetrieb ? datumZeile : eveningBriefing.dateLabel}
        </Text>
        <Text
          variant="screenTitle"
          accessibilityRole="header"
          style={{ fontSize: 30, lineHeight: 33, marginTop: 2 }}
        >
          Guten Abend,{" "}
          <Emphasis variant="screenTitle" style={{ fontSize: 30 }}>
            {echterBetrieb ? venueProfile.name : eveningBriefing.venueName}
          </Emphasis>
        </Text>
        {status ? (
          <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginTop: 8 }}>
            <StatusLabel
              label={status.label}
              color={status.offen ? theme.colors.success : theme.colors.textMuted}
            />
            {status.zusatz ? (
              <Text variant="bodySm" tone="muted" style={{ fontSize: 14 }}>
                · {status.zusatz}
              </Text>
            ) : null}
          </View>
        ) : null}
      </View>

      <Card variant="sunken" padding={theme.spacing.xl} style={{ gap: 14 }}>
        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
          <Text variant="cardTitleSm" style={{ fontSize: 18 }}>
            Heute Abend
          </Text>
          {echterBetrieb ? null : <Eyebrow>{eveningBriefing.tablesLabel}</Eyebrow>}
        </View>

        {!echterBetrieb ? (
          <View style={{ flexDirection: "row", gap: theme.spacing.lg }}>
            <Metric
              value={eveningBriefing.nextArrival.time}
              label={eveningBriefing.nextArrival.label}
              highlight
            />
            <Metric value={String(eveningBriefing.walkIns.count)} label={eveningBriefing.walkIns.label} />
          </View>
        ) : !abrufbar || aktuell.zustand === "fehler" || (aktuell.zustand === "bereit" && !lage) ? (
          <Hinweis text="Reservierungen gerade nicht abrufbar." />
        ) : aktuell.zustand === "laedt" ? (
          <Hinweis text="Reservierungen werden geladen …" />
        ) : lage?.naechste ? (
          <View style={{ flexDirection: "row", gap: theme.spacing.lg }}>
            <Metric
              value={uhrzeitDer(lage.naechste)}
              label={`Nächste Ankunft · ${lage.naechste.guestName}${
                lage.naechste.status === "pending" ? " · Anfrage offen" : ""
              }`}
              highlight
            />
            <Metric
              value={String(lage.nochHeute)}
              label={lage.nochHeute === 1 ? "Reservierung heute noch" : "Reservierungen heute noch"}
            />
          </View>
        ) : (
          <Hinweis text="Heute keine Reservierungen mehr." />
        )}
      </Card>

      {echterBetrieb ? null : (
        <Card variant="sunken" padding={theme.spacing.xl} style={{ gap: 10 }}>
          <Eyebrow tone="accent">{eveningBriefing.quietMoment.eyebrow}</Eyebrow>
          <Text variant="cardTitle">{eveningBriefing.quietMoment.title}</Text>
          <PillButton
            label={planned ? "Eingeplant ✓" : eveningBriefing.quietMoment.action}
            variant={planned ? "outline" : "primary"}
            onPress={
              planned
                ? undefined
                : () => {
                    setPlanned(true);
                    toast.show("Beitrag für morgen 9:00 eingeplant");
                  }
            }
            style={{ borderRadius: theme.radius.control, marginTop: 2 }}
          />
        </Card>
      )}

      <Card
        variant="sunken"
        padding={theme.spacing.xl}
        style={{ flexDirection: "row", alignItems: "center", gap: 14 }}
      >
        <View
          style={{
            width: 44,
            height: 44,
            borderRadius: 22,
            backgroundColor: theme.colors.surfaceSunken,
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <MoonIcon size={22} color={theme.colors.accent} />
        </View>
        <View style={{ flex: 1 }}>
          <Text variant="numeric" style={{ fontSize: 16 }}>
            Nachtbar Modus aktiv
          </Text>
          {/* "Schaltet abends automatisch um" stimmt nicht: lib/appearance.tsx
              kennt nur den Schalter, keine Uhrzeit. Für den echten Betrieb steht
              deshalb da, was passiert (Prüfbericht, "nur ehrlich machen"). */}
          <Text variant="bodySm" tone="secondary" style={{ fontSize: 13, marginTop: 1 }}>
            {echterBetrieb ? "Von Hand eingeschaltet · nach einem Neustart wieder aus." : "Schaltet abends automatisch um."}
          </Text>
        </View>
        <LinkAction label="Ausschalten" labelSize={14} onPress={toggleNightMode} />
      </Card>
    </Screen>
  );
}

function Hinweis({ text }: { text: string }) {
  return (
    <Text variant="bodySm" tone="secondary" style={{ fontSize: 15 }}>
      {text}
    </Text>
  );
}

function Metric({
  value,
  label,
  highlight = false,
}: {
  value: string;
  label: string;
  highlight?: boolean;
}) {
  const theme = useTheme();

  return (
    <View style={{ flex: 1 }}>
      <Text
        variant="numeric"
        color={highlight ? theme.colors.accent : theme.colors.textPrimary}
        style={{ fontSize: 30, lineHeight: 34, letterSpacing: -0.6 }}
      >
        {value}
      </Text>
      <Text variant="bodySm" tone="secondary" style={{ fontSize: 13, marginTop: 2 }}>
        {label}
      </Text>
    </View>
  );
}
