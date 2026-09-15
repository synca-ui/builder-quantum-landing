import { useCallback, useEffect, useMemo, useRef } from "react";
import { ActivityIndicator, Alert, Linking, View } from "react-native";
import * as Notifications from "expo-notifications";
import { useFocusEffect, useRouter } from "expo-router";
import type { Reservation } from "@maitr/core";

import { AlertIcon } from "../../components/icons";
import { StatusLabel } from "../../components/ui/Avatar";
import { Card } from "../../components/ui/Card";
import { EmptyState } from "../../components/ui/EmptyState";
import { Eyebrow } from "../../components/ui/Eyebrow";
import { Banner } from "../../components/ui/Media";
import { LinkAction, PillButton } from "../../components/ui/PillButton";
import { Screen } from "../../components/ui/Screen";
import { ScreenHeader } from "../../components/ui/ScreenHeader";
import { Emphasis, Text } from "../../components/ui/Text";
import { useToast } from "../../lib/toast";
import { useTheme } from "../../theme";

import {
  AKTION_TEXT,
  ENTSCHEIDUNG_FUER,
  ERFOLG_TEXT,
  RESERVIERUNGS_FENSTER_TAGE,
  STATUS_TEXT,
  anfragenOffen,
  anfragenOffenText,
  erlaubteAktionen,
  gruppiereNachTag,
  naechsteAnkunft,
  personenText,
  quelleText,
  rueckfrage,
  tagesTitel,
  tagesZusammenfassung,
  telefonLink,
  uhrzeit,
  type Aktion,
} from "./echteReservierungen";
import { useKommendeReservierungen, useMinutenTakt } from "./useKommendeReservierungen";

/**
 * Reservierung im echten Betrieb - die Liste der kommenden Buchungen statt des
 * Tischplans.
 *
 * ANLASS (Integrationsprüfung 15.09., Punkte 10, 16, 20): Der Tab zeigte jedem
 * Betrieb die Fixture-Tage vom Juli 2025, und der Push „Neue Reservierungsanfrage"
 * führte genau dorthin - die Anfrage selbst stand nirgends. Tische kennt der
 * Server nicht (kein Code legt `Table`-Zeilen an), Reservierungen schon. Also
 * zeigt diese Ansicht nur, was es wirklich gibt: Buchungen nach Tag, mit den
 * Aktionen, die der Server einlöst. Tischplan, Sperren und Walk-in bleiben der
 * Vorführung vorbehalten und werden hier benannt statt vorgetäuscht.
 */
export function EchteReservierungenAnsicht({ venueId }: { venueId: string }) {
  const theme = useTheme();
  const router = useRouter();
  const toast = useToast();
  const { reservierungen, laedt, fehler, standMs, refresh, setzeStatus, zeilenFehler, inArbeit } =
    useKommendeReservierungen(venueId);
  const jetzt = useMinutenTakt();

  // Der Tab bleibt gemountet. Öffnet der Push „Neue Reservierungsanfrage" ihn
  // erneut, stünde sonst die Liste von vorhin da - ohne die Anfrage, wegen der
  // man gekommen ist. Den ersten Fokus überspringen: Da lädt der Hook ohnehin.
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

  // Fokus und Vordergrund-Wechsel (im Hook) reichen nicht: Kommt der Push, während
  // die App offen auf diesem Tab steht, zeigt iOS ihn als Banner (setNotificationHandler
  // in pushRegistrierung.ts), und das Antippen ändert weder Fokus noch AppState.
  // Also bei Eingang und beim Antippen einer Reservierungs-Push neu holen.
  useEffect(() => {
    const istReservierungsPush = (n: Notifications.Notification) =>
      (n.request.content.data as { type?: unknown } | undefined)?.type === "reservation";
    const eingang = Notifications.addNotificationReceivedListener((n) => {
      if (istReservierungsPush(n)) refresh();
    });
    const angetippt = Notifications.addNotificationResponseReceivedListener((antwort) => {
      if (istReservierungsPush(antwort.notification)) refresh();
    });
    return () => {
      eingang.remove();
      angetippt.remove();
    };
  }, [refresh]);

  const gruppen = useMemo(
    () => (reservierungen ? gruppiereNachTag(reservierungen, jetzt) : []),
    [reservierungen, jetzt],
  );
  const offen = reservierungen ? anfragenOffen(reservierungen) : 0;
  const naechste = reservierungen ? naechsteAnkunft(reservierungen, jetzt) : null;

  const ausfuehren = async (r: Reservation, aktion: Aktion) => {
    const ok = await setzeStatus(r.id, ENTSCHEIDUNG_FUER[aktion]);
    // Meldung nur nach der Serverantwort. Scheitert es, steht der Grund an der Zeile.
    if (ok) toast.show(ERFOLG_TEXT[aktion]);
  };

  const beiAktion = (r: Reservation, aktion: Aktion) => {
    const frage = rueckfrage(aktion, r, Date.now());
    if (!frage) {
      void ausfuehren(r, aktion);
      return;
    }
    Alert.alert(frage.titel, frage.text, [
      { text: "Abbrechen", style: "cancel" },
      { text: frage.bestaetigen, style: "destructive", onPress: () => void ausfuehren(r, aktion) },
    ]);
  };

  const anrufen = (link: string) => {
    // Im Simulator und auf Tablets ohne Telefon lehnt openURL ab - ohne catch
    // bliebe der Tipp stumm.
    Linking.openURL(link).catch(() => toast.show("Anruf ließ sich nicht starten", "fehler"));
  };

  return (
    <Screen withTabBar contentStyle={{ gap: theme.spacing.lg }}>
      <ScreenHeader title="Reservierung" />

      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
          gap: theme.spacing.md,
          marginTop: -theme.spacing.sm,
        }}
      >
        <Text variant="sectionTitle" style={{ fontSize: 20, lineHeight: 24, flexShrink: 1 }}>
          {reservierungen ? anfragenOffenText(offen) : " "}
        </Text>
        <LinkAction label="Gäste ›" labelSize={14} onPress={() => router.push("/gaeste")} />
      </View>

      <StandZeile laedt={laedt} standMs={standMs} onAktualisieren={refresh} />

      {reservierungen === null ? (
        laedt ? (
          <LadeKarte text="Reservierungen werden abgerufen …" />
        ) : (
          <View style={{ gap: theme.spacing.md }}>
            <EmptyState
              title="Reservierungen nicht geladen"
              message={fehler ?? "Der Abruf hat nicht geklappt."}
            />
            <PillButton label="Erneut versuchen" onPress={refresh} />
          </View>
        )
      ) : (
        <>
          {/* Eine ältere Liste bleibt stehen, wenn das Aktualisieren scheitert - aber
              nicht kommentarlos, sonst hielte man sie für frisch. */}
          {fehler ? (
            <HinweisKarte text={`Aktualisieren hat nicht geklappt: ${fehler} Du siehst den vorherigen Stand.`} />
          ) : null}

          {naechste ? (
            <Card
              emphasis="default"
              padding={0}
              style={{ borderRadius: 18, paddingVertical: theme.spacing.lg, paddingHorizontal: 18 }}
            >
              <Text variant="bodySm" style={{ fontSize: 15 }}>
                Nächste Ankunft: <Emphasis variant="bodySm">{naechste.guestName.trim() || "Ohne Namen"}</Emphasis>{" "}
                um {uhrzeit(Date.parse(naechste.start))}
              </Text>
              <Eyebrow style={{ marginTop: 3 }}>
                {[
                  tagesTitel(Date.parse(naechste.start), jetzt),
                  personenText(naechste.partySize),
                  telefonLink(naechste.phone) ? "Tel. hinterlegt" : null,
                ]
                  .filter(Boolean)
                  .join(" · ")}
              </Eyebrow>
            </Card>
          ) : null}

          {gruppen.length === 0 ? (
            <EmptyState
              title={`Keine Reservierungen in den nächsten ${RESERVIERUNGS_FENSTER_TAGE} Tagen`}
              message="Buchungen aus deiner Web-App und aus der App erscheinen hier, sobald sie eingehen."
            />
          ) : (
            gruppen.map((gruppe) => (
              <View key={gruppe.schluessel} style={{ gap: theme.spacing.md }}>
                <View
                  style={{
                    flexDirection: "row",
                    alignItems: "baseline",
                    justifyContent: "space-between",
                    gap: theme.spacing.md,
                    marginTop: theme.spacing.xs,
                  }}
                >
                  <Text variant="sectionTitle" accessibilityRole="header" style={{ fontSize: 20, lineHeight: 24 }}>
                    {gruppe.titel}
                  </Text>
                  <Eyebrow style={{ flexShrink: 1, textAlign: "right" }}>{tagesZusammenfassung(gruppe)}</Eyebrow>
                </View>
                {gruppe.reservierungen.map((r) => (
                  <ReservierungsZeile
                    key={r.id}
                    reservierung={r}
                    jetzt={jetzt}
                    laeuft={Boolean(inArbeit[r.id])}
                    fehler={zeilenFehler[r.id]}
                    onAktion={(aktion) => beiAktion(r, aktion)}
                    onAnrufen={anrufen}
                  />
                ))}
              </View>
            ))
          )}
        </>
      )}

      {/* Offen benennen, was fehlt, statt die leere Stelle mit dem Tischplan der
          Vorführung zu füllen: Ohne Tische auf dem Server gäbe es weder
          „3 von 8 Plätzen" noch eine Sperre, die irgendwo gilt. */}
      <Banner>
        Tischplan, Tischsperren und Walk-ins gibt es bisher nur in der Vorschau, noch nicht für
        deinen Betrieb. Hier stehen alle Reservierungen der nächsten {RESERVIERUNGS_FENSTER_TAGE} Tage.
      </Banner>
    </Screen>
  );
}

/** Eine Reservierung: wer, wann, wie viele, woher - und was sich damit tun lässt. */
function ReservierungsZeile({
  reservierung: r,
  jetzt,
  laeuft,
  fehler,
  onAktion,
  onAnrufen,
}: {
  reservierung: Reservation;
  jetzt: number;
  laeuft: boolean;
  fehler?: string;
  onAktion: (aktion: Aktion) => void;
  onAnrufen: (link: string) => void;
}) {
  const theme = useTheme();
  const ms = Date.parse(r.start);
  const erledigt = r.status === "cancelled" || r.status === "no_show";
  const aktionen = erlaubteAktionen(r, jetzt);
  const tel = telefonLink(r.phone);
  const notiz = r.note?.trim();

  const statusFarbe =
    r.status === "pending"
      ? theme.colors.primary
      : r.status === "no_show"
        ? theme.colors.destructive
        : r.status === "cancelled"
          ? theme.colors.textMuted
          : theme.colors.success;

  return (
    <Card
      emphasis={r.status === "pending" ? "default" : "subtle"}
      padding={theme.spacing.lg}
      // Erledigte Zeilen bleiben sichtbar (der Wirt soll sehen, dass die Absage
      // durch ist), treten aber zurück.
      style={{ gap: theme.spacing.md, borderRadius: 18, opacity: erledigt ? 0.7 : 1 }}
    >
      <View style={{ flexDirection: "row", alignItems: "flex-start", gap: 14 }}>
        <Text variant="numeric" style={{ fontSize: 19, lineHeight: 24, minWidth: 52 }}>
          {uhrzeit(ms)}
        </Text>
        <View style={{ flex: 1 }}>
          <Text variant="cardTitleSm" style={{ fontSize: 17 }} numberOfLines={2}>
            {r.guestName.trim() || "Ohne Namen"}
          </Text>
          <Eyebrow style={{ marginTop: 2 }}>
            {[personenText(r.partySize), quelleText(r.source)].filter(Boolean).join(" · ")}
          </Eyebrow>
        </View>
        <StatusLabel label={STATUS_TEXT[r.status]} color={statusFarbe} />
      </View>

      {notiz ? (
        <View
          style={{
            backgroundColor: theme.colors.surfaceSunken,
            borderRadius: theme.radius.control,
            paddingVertical: 10,
            paddingHorizontal: 14,
          }}
        >
          <Text variant="bodySm" color={theme.colors.textOnSunken} style={{ fontSize: 14, lineHeight: 20 }}>
            „{notiz}“
          </Text>
        </View>
      ) : null}

      {tel && r.phone ? (
        <View style={{ flexDirection: "row" }}>
          <LinkAction
            label={`Anrufen · ${r.phone.trim()}`}
            labelSize={14}
            accessibilityHint={`Ruft ${r.guestName.trim() || "den Gast"} an`}
            onPress={() => onAnrufen(tel)}
          />
        </View>
      ) : null}

      {fehler ? (
        <View style={{ flexDirection: "row", alignItems: "flex-start", gap: theme.spacing.sm }}>
          <View style={{ marginTop: 2 }}>
            <AlertIcon size={15} color={theme.colors.destructive} />
          </View>
          <Text
            variant="bodySm"
            color={theme.colors.destructive}
            style={{ fontSize: 14, lineHeight: 20, flexShrink: 1 }}
            accessibilityLiveRegion="polite"
          >
            {fehler}
          </Text>
        </View>
      ) : null}

      {laeuft ? (
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            gap: theme.spacing.sm,
            minHeight: theme.hitSize.minTouch,
          }}
        >
          <ActivityIndicator size="small" color={theme.colors.textMuted} />
          <Eyebrow>Wird gespeichert …</Eyebrow>
        </View>
      ) : aktionen.length ? (
        <View style={{ flexDirection: "row", gap: theme.spacing.md }}>
          {aktionen.map((aktion) => (
            <PillButton
              key={aktion}
              label={AKTION_TEXT[aktion]}
              variant={aktion === "bestaetigen" ? "primary" : "outline"}
              size="compact"
              labelSize={14}
              onPress={() => onAktion(aktion)}
              style={{ flex: 1, paddingHorizontal: theme.spacing.sm }}
            />
          ))}
        </View>
      ) : null}
    </Card>
  );
}

/** "Stand 14:05" mit Aktualisieren - geteilt mit der Gästeansicht. */
export function StandZeile({
  laedt,
  standMs,
  onAktualisieren,
}: {
  laedt: boolean;
  standMs: number | null;
  onAktualisieren: () => void;
}) {
  const theme = useTheme();
  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        gap: theme.spacing.md,
        marginTop: -theme.spacing.sm,
        // Spinner und LinkAction wechseln sich ab - ohne feste Höhe hüpft die Liste.
        minHeight: theme.hitSize.minTouch,
      }}
    >
      <Eyebrow style={{ flexShrink: 1 }}>
        {laedt
          ? "Wird abgerufen …"
          : standMs !== null
            ? `Nächste ${RESERVIERUNGS_FENSTER_TAGE} Tage · Stand ${uhrzeit(standMs)}`
            : "Noch nicht abgerufen"}
      </Eyebrow>
      {laedt ? (
        <ActivityIndicator size="small" color={theme.colors.textMuted} />
      ) : (
        <LinkAction label="Aktualisieren" labelSize={14} onPress={onAktualisieren} />
      )}
    </View>
  );
}

/** Erster Abruf läuft. */
export function LadeKarte({ text }: { text: string }) {
  const theme = useTheme();
  return (
    <Card
      emphasis="subtle"
      padding={theme.spacing.xxl}
      style={{ alignItems: "center", gap: theme.spacing.md, borderRadius: 18 }}
    >
      <ActivityIndicator size="small" color={theme.colors.textMuted} />
      <Text variant="bodySm" tone="secondary" style={{ textAlign: "center", fontSize: 14 }}>
        {text}
      </Text>
    </Card>
  );
}

/** Vermerk über der Liste, wenn der gezeigte Stand nicht der aktuelle ist. */
export function HinweisKarte({ text }: { text: string }) {
  const theme = useTheme();
  return (
    <Card
      emphasis="subtle"
      padding={theme.spacing.lg}
      style={{ flexDirection: "row", alignItems: "flex-start", gap: theme.spacing.sm, borderRadius: 18 }}
    >
      <View style={{ marginTop: 2 }}>
        <AlertIcon size={16} color={theme.colors.textMuted} />
      </View>
      <Text variant="bodySm" tone="secondary" style={{ fontSize: 14, lineHeight: 20, flexShrink: 1 }}>
        {text}
      </Text>
    </Card>
  );
}
