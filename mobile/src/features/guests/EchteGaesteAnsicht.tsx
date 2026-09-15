import { useCallback, useMemo, useRef } from "react";
import { Linking, View } from "react-native";
import { useFocusEffect, useRouter } from "expo-router";

import { Avatar } from "../../components/ui/Avatar";
import { Card } from "../../components/ui/Card";
import { EmptyState } from "../../components/ui/EmptyState";
import { Eyebrow } from "../../components/ui/Eyebrow";
import { Banner } from "../../components/ui/Media";
import { NavHeader } from "../../components/ui/NavHeader";
import { LinkAction, PillButton } from "../../components/ui/PillButton";
import { Screen } from "../../components/ui/Screen";
import { Text } from "../../components/ui/Text";
import { useToast } from "../../lib/toast";
import { useTheme } from "../../theme";

import {
  HinweisKarte,
  LadeKarte,
  StandZeile,
} from "../reservations/EchteReservierungenAnsicht";
import {
  RESERVIERUNGS_FENSTER_TAGE,
  gaesteAusReservierungen,
  gastZusammenfassung,
  personenText,
  tagUndUhrzeit,
  telefonLink,
  type GastAusReservierungen,
} from "../reservations/echteReservierungen";
import { useKommendeReservierungen, useMinutenTakt } from "../reservations/useKommendeReservierungen";

/**
 * Gäste im echten Betrieb - abgeleitet aus den Reservierungen, sonst nichts.
 *
 * ANLASS (Integrationsprüfung 15.09., Punkt 22): Die Vorführung zeigte jedem
 * Betrieb zehn erfundene Gäste mit „Wert ≈ … €", Stammgast-Segmenten und einem
 * Copilot, der „formuliert und sendet" - es ging nie etwas raus. Eine Gästekartei
 * mit Besuchszähler gibt es auf dem Server nicht, und an `Reservation` hängt kein
 * Gast. Was es gibt: die Reservierungen der nächsten Tage mit Name und Telefon.
 * Daraus entsteht diese Liste - und sie sagt dazu, woraus.
 *
 * Lädt selbst über denselben Hook wie der Reservierungs-Tab. Ein geteilter Stand
 * im Store wäre sparsamer, gehört aber nicht in diese Änderung; zwei Abrufe beim
 * Wechsel zwischen den Screens sind die ehrlichere Wahl als eine Liste von vorhin.
 */
export function EchteGaesteAnsicht({ venueId }: { venueId: string }) {
  const theme = useTheme();
  const router = useRouter();
  const toast = useToast();
  const { reservierungen, laedt, fehler, standMs, refresh } = useKommendeReservierungen(venueId);
  const jetzt = useMinutenTakt();

  // Wie im Reservierungs-Tab: beim erneuten Fokus frisch holen, den ersten
  // überspringen (da lädt der Hook ohnehin).
  const ersterFokus = useRef(true);
  useFocusEffect(
    useCallback(() => {
      if (ersterFokus.current) {
        ersterFokus.current = false;
        return;
      }
      refresh();
    }, [refresh]),
  );

  const gaeste = useMemo(
    () => (reservierungen ? gaesteAusReservierungen(reservierungen, jetzt) : []),
    [reservierungen, jetzt],
  );

  const anrufen = (link: string) => {
    Linking.openURL(link).catch(() => toast.show("Anruf ließ sich nicht starten", "fehler"));
  };

  return (
    <Screen animated="subtle" withTabBar contentStyle={{ gap: theme.spacing.lg }}>
      <NavHeader fallback="/tische" />

      <View>
        <Text variant="screenTitle" accessibilityRole="header" style={{ fontSize: 33, lineHeight: 36 }}>
          Gäste
        </Text>
        <Text variant="body" tone="secondary" style={{ marginTop: 6 }}>
          {reservierungen
            ? `${gaeste.length} ${gaeste.length === 1 ? "Gast" : "Gäste"} mit Reservierung in den nächsten ${RESERVIERUNGS_FENSTER_TAGE} Tagen`
            : `Aus deinen Reservierungen der nächsten ${RESERVIERUNGS_FENSTER_TAGE} Tage`}
        </Text>
        <View style={{ flexDirection: "row", marginTop: 8 }}>
          {/* Die Stempelkarte ist echt angebunden - der Weg dorthin bleibt. */}
          <PillButton
            label="Stempelkarte ›"
            variant="ghost"
            size="compact"
            labelSize={14}
            onPress={() => router.push("/stempelkarte")}
            style={{ paddingHorizontal: 0 }}
          />
        </View>
      </View>

      <Banner>
        Die Liste entsteht aus den Reservierungen von heute bis in {RESERVIERUNGS_FENSTER_TAGE} Tagen.
        Frühere Besuche kennt sie nicht. Gäste mit derselben Telefonnummer sind zusammengefasst.
      </Banner>

      <StandZeile laedt={laedt} standMs={standMs} onAktualisieren={refresh} />

      {reservierungen === null ? (
        laedt ? (
          <LadeKarte text="Reservierungen werden abgerufen …" />
        ) : (
          <View style={{ gap: theme.spacing.md }}>
            {/* Nicht „Noch keine Gäste": Die Liste war nicht abrufbar, das ist etwas anderes. */}
            <EmptyState title="Gäste nicht geladen" message={fehler ?? "Der Abruf hat nicht geklappt."} />
            <PillButton label="Erneut versuchen" onPress={refresh} />
          </View>
        )
      ) : (
        <>
          {fehler ? (
            <HinweisKarte text={`Aktualisieren hat nicht geklappt: ${fehler} Du siehst den vorherigen Stand.`} />
          ) : null}

          {gaeste.length === 0 ? (
            <EmptyState
              title="Noch keine Gäste"
              message={`Sobald jemand für die nächsten ${RESERVIERUNGS_FENSTER_TAGE} Tage reserviert, steht er hier.`}
            />
          ) : (
            <View style={{ gap: theme.spacing.md }}>
              {gaeste.map((gast) => (
                <GastKarte key={gast.schluessel} gast={gast} jetzt={jetzt} onAnrufen={anrufen} />
              ))}
            </View>
          )}
        </>
      )}
    </Screen>
  );
}

/**
 * Ein Gast: Name, Buchungen, nächste und letzte Buchung, No-Shows. Bewusst ohne
 * Wert, Status-Etikett und „Zurückholen" - dafür fehlen Daten und ein Sendeweg.
 */
function GastKarte({
  gast,
  jetzt,
  onAnrufen,
}: {
  gast: GastAusReservierungen;
  jetzt: number;
  onAnrufen: (link: string) => void;
}) {
  const theme = useTheme();
  const tel = telefonLink(gast.telefon);

  const naechsteText = gast.naechste
    ? [
        tagUndUhrzeit(Date.parse(gast.naechste.start), jetzt),
        personenText(gast.naechste.partySize),
        gast.naechste.status === "pending" ? "Anfrage offen" : null,
      ]
        .filter(Boolean)
        .join(" · ")
    : `Keine in den nächsten ${RESERVIERUNGS_FENSTER_TAGE} Tagen`;

  return (
    <Card emphasis="subtle" padding={theme.spacing.lg} style={{ gap: theme.spacing.md }}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 14 }}>
        <Avatar initials={initialen(gast.name)} size={44} />
        <View style={{ flex: 1 }}>
          <Text variant="cardTitleSm" style={{ fontSize: 17 }} numberOfLines={2}>
            {gast.name}
          </Text>
          <Eyebrow
            style={{ marginTop: 2 }}
            color={gast.noShows > 0 ? theme.colors.destructive : undefined}
          >
            {gastZusammenfassung(gast)}
          </Eyebrow>
        </View>
      </View>

      <View
        style={{
          gap: 6,
          paddingTop: theme.spacing.sm,
          borderTopWidth: 1,
          borderTopColor: theme.colors.borderSoft,
        }}
      >
        <GastAngabe label="Nächste" wert={naechsteText} />
        {gast.letzte ? (
          <GastAngabe label="Zuletzt" wert={tagUndUhrzeit(Date.parse(gast.letzte.start), jetzt)} />
        ) : null}
      </View>

      {tel && gast.telefon ? (
        <View style={{ flexDirection: "row" }}>
          <LinkAction
            label={`Anrufen · ${gast.telefon.trim()}`}
            labelSize={14}
            accessibilityHint={`Ruft ${gast.name} an`}
            onPress={() => onAnrufen(tel)}
          />
        </View>
      ) : null}
    </Card>
  );
}

function GastAngabe({ label, wert }: { label: string; wert: string }) {
  const theme = useTheme();
  return (
    <View style={{ flexDirection: "row", alignItems: "baseline", gap: theme.spacing.md }}>
      <Eyebrow style={{ fontSize: 10, minWidth: 58 }}>{label}</Eyebrow>
      <Text variant="bodySm" style={{ fontSize: 14, lineHeight: 20, flexShrink: 1 }}>
        {wert}
      </Text>
    </View>
  );
}

/** "Marie Weber" → "MW", "anna" → "A", leer → "?". */
function initialen(name: string): string {
  const woerter = name.trim().split(/\s+/).filter(Boolean);
  if (!woerter.length) return "?";
  const erste = woerter[0].charAt(0);
  const letzte = woerter.length > 1 ? woerter[woerter.length - 1].charAt(0) : "";
  return (erste + letzte).toUpperCase();
}
