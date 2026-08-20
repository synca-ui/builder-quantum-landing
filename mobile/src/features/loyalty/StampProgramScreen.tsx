import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Pressable, View } from "react-native";
import { useRouter } from "expo-router";
import {
  api,
  type StampCardFilter,
  type StampCardRow,
  type WalletBereitschaft,
} from "@maitr/core";

import { StatusLabel } from "../../components/ui/Avatar";
import { Card } from "../../components/ui/Card";
import { Chip, Tag } from "../../components/ui/Chip";
import { DarkPanel, StatTile, onDarkPanel } from "../../components/ui/DataDisplay";
import { EmptyState } from "../../components/ui/EmptyState";
import { Eyebrow } from "../../components/ui/Eyebrow";
import { ListCard } from "../../components/ui/ListCard";
import { NavHeader } from "../../components/ui/NavHeader";
import { PillButton } from "../../components/ui/PillButton";
import { ProgressBar } from "../../components/ui/Progress";
import { Screen } from "../../components/ui/Screen";
import { Text } from "../../components/ui/Text";
import { Toggle } from "../../components/ui/Toggle";
import { useStore } from "../../lib/store";
import { useToast } from "../../lib/toast";
import { useTheme } from "../../theme";
import { AuswahlZeile, Skelett, TextFeld } from "./Formularteile";
import {
  GUELTIGKEIT_OPTIONEN,
  NAME_MAX,
  PRAEMIE_MAX,
  SPERRFRIST_OPTIONEN,
  STATUS_TEXT,
  STEMPEL_OPTIONEN,
  VORSCHLAG,
  aenderungsWarnungen,
  buchungsFehlerText,
  entwurfAusProgramm,
  geaenderteFelder,
  formularFehler,
  istVoll,
  relativeZeit,
  uebersichtsZeile,
  walletMangelKlartext,
  walletSatz,
  walletStatusZeile,
  type ProgrammEntwurf,
} from "./aufbereitung";
import { useStampProgram } from "./useStampProgram";

const FILTER: { wert: StampCardFilter; label: string }[] = [
  { wert: "alle", label: "Alle" },
  { wert: "fastvoll", label: "Kurz vor der Prämie" },
  { wert: "voll", label: "Voll" },
  { wert: "eingeschlafen", label: "Eingeschlafen" },
];

/**
 * Einstellungsbereich der Stempelkarte.
 *
 * Was dieser Bildschirm bewusst NICHT hat, und warum - damit es niemand später
 * "vergessen" wieder einbaut:
 *
 *  - Keinen Knopf "Nutzer benachrichtigen". Es gibt keinen Kanal dafür. Der
 *    Apple-Wallet-Push trägt keinen Text; er sagt dem Gerät nur "hol den Pass neu",
 *    und sichtbar wird ausschließlich, dass sich ein Feldwert geändert hat. Google
 *    kennt für den hier verwendeten Passtyp keinen Benachrichtigungsschalter. Der
 *    Gast hat keine App. Statt eines Knopfes steht hier ein Statusblock.
 *  - Auch keinen DEAKTIVIERTEN Sendeknopf. Ein grauer Knopf ist ein Versprechen mit
 *    Datum; es gibt keines. Genau diesen Fehler macht der alte `LoyaltyScreen`, der
 *    "Belohnung gesendet" meldet, ohne dass irgendetwas gesendet wurde.
 *  - Kein "Programm löschen". Am Programm hängt per Cascade das Hauptbuch, für das
 *    das Datenmodell überhaupt gebaut wurde. Ersatz ist "Neue Karten ausgeben: aus".
 *  - Kein "+1" in der Liste. Stempeln ist eine Transaktion mit Sperrfrist,
 *    optimistischer Sperre und Hauptbucheintrag; ein Knopf in der Liste wäre ein
 *    zweiter, schwächerer Weg in dieselbe Invariante. Das gehört ins Kartendetail.
 *  - Keine Umsatzzahlen. An einem Stempel hängt kein Preis und kein Bon; jede Zahl
 *    dazu wäre erfunden.
 */
export function StampProgramScreen() {
  const theme = useTheme();
  const router = useRouter();
  const toast = useToast();
  const { venueId, hasRealVenue } = useStore();

  const {
    zustand,
    program,
    wallet,
    rolle,
    uebersicht,
    karten,
    mehrVorhanden,
    gekappt,
    kartenLaden,
    mehrLaden,
    ladeFehler,
    uebersichtFehler,
    listenFehler,
    filter,
    setFilter,
    refresh,
  } = useStampProgram(venueId, hasRealVenue);

  /**
   * Nur der Inhaber darf die Zusage ändern - der Server setzt das seit dem
   * `ownerGuard` durch (PATCH /program, POST /program, void, anonymize).
   *
   * Der Bildschirm muss das MITMACHEN, nicht bloss wissen: ein Speichern-Knopf, den
   * der Server mit 403 beantwortet, ist genau die Sorte Zusage, gegen die dieser
   * Bildschirm sonst argumentiert.
   */
  const nurInhaber = rolle === "OWNER" || rolle === "ADMIN";

  const [entwurf, setEntwurf] = useState<ProgrammEntwurf>({ ...VORSCHLAG });
  const [speichert, setSpeichert] = useState(false);
  const [bestaetigung, setBestaetigung] = useState<string[] | null>(null);
  const [aktionsFehler, setAktionsFehler] = useState<string | null>(null);

  // Signatur des zuletzt übernommenen Serverstands. Ohne sie würde jedes `refresh()`
  // - etwa nach einem Filterwechsel - die halb getippte Prämie des Wirts überschreiben.
  const uebernommen = useRef<string | null>(null);
  useEffect(() => {
    if (!program) return;
    const stand = entwurfAusProgramm(program);
    const signatur = JSON.stringify(stand);
    if (uebernommen.current === signatur) return;
    uebernommen.current = signatur;
    setEntwurf(stand);
  }, [program]);

  const geaendert = useMemo(
    () => (program ? geaenderteFelder(entwurf, program) : []),
    [entwurf, program],
  );
  const formFehler = useMemo(() => formularFehler(entwurf), [entwurf]);

  /**
   * Wann das Formular gesperrt ist.
   *
   * Bei Ladefehler und während des Ladens: sonst speichert der Wirt gegen einen
   * Zustand, den er nicht kennt.
   *
   * Und während die Warnung offen steht: die Sätze darin nennen konkrete Werte
   * („bleibt bei 10 Stempeln"). Wer daneben weitertippt, bekäme sonst eine Warnung
   * zum einen Wert und speicherte einen anderen - der Bestätigungsschritt wäre damit
   * genau das, was er verhindern soll.
   */
  const gesperrt =
    zustand === "fehler" ||
    zustand === "laedt" ||
    speichert ||
    bestaetigung !== null ||
    // Für das Personal ist der ganze Einstellungsbereich eine Leseansicht.
    !nurInhaber;

  const anlegen = useCallback(async () => {
    setSpeichert(true);
    setAktionsFehler(null);
    try {
      await api.loyalty.createProgram({
        venueId,
        name: entwurf.name.trim(),
        maxStamps: entwurf.maxStamps,
        rewardText: entwurf.rewardText.trim(),
        cooldownSeconds: entwurf.cooldownSeconds,
        validityDays: entwurf.validityDays,
        isActive: entwurf.isActive,
      });
      toast.show("Stempelkarte eingerichtet");
      refresh();
    } catch (err) {
      // 409: Es gibt schon ein Programm - meist ein Doppeltipp oder ein zweites
      // Gerät. Das ist keine Fehlermeldung wert, sondern ein Neuladen: danach steht
      // das vorhandene Programm da, statt einer Sackgasse mit rotem Text.
      const kennung = (err as { body?: { error?: unknown } })?.body?.error;
      if (kennung === "programm_existiert_bereits") {
        refresh();
        return;
      }
      setAktionsFehler(buchungsFehlerText(err));
    } finally {
      setSpeichert(false);
    }
  }, [entwurf, refresh, toast, venueId]);

  const speichern = useCallback(async () => {
    if (!program) return;
    setSpeichert(true);
    setAktionsFehler(null);
    setBestaetigung(null);
    try {
      // NUR die geänderten Felder. Alles mitzuschicken hiesse, denselben Prämientext
      // neu zu setzen - und der Server klopft ihn dann in jede laufende Karte fest,
      // obwohl sich nichts geändert hat.
      const aenderung: Record<string, unknown> = { venueId };
      for (const feld of geaendert) {
        aenderung[feld] =
          feld === "name" || feld === "rewardText" ? String(entwurf[feld]).trim() : entwurf[feld];
      }
      const antwort = await api.loyalty.updateProgram(program.id, aenderung);
      const festgeschrieben = antwort?.wirkung?.praemieFestgeschrieben ?? 0;
      toast.show(
        festgeschrieben > 0
          ? `Gespeichert · alte Prämie für ${festgeschrieben} laufende Karten festgehalten`
          : "Gespeichert",
      );
      refresh();
    } catch (err) {
      setAktionsFehler(buchungsFehlerText(err));
    } finally {
      setSpeichert(false);
    }
  }, [entwurf, geaendert, program, refresh, toast, venueId]);

  /**
   * Erst warnen, dann speichern - nie umgekehrt.
   *
   * Die Wirkung der sechs Felder ist asymmetrisch und man sieht sie ihnen nicht an:
   * die Stempelzahl liegt als Snapshot auf jeder laufenden Karte und ändert sich für
   * die nicht mehr, die Sperrfrist wird bei jeder Buchung frisch gelesen und gilt
   * sofort für alle. Wer das nach dem Speichern erfährt, hat schon eine Zusage
   * geändert.
   */
  const speichernAnstossen = useCallback(() => {
    if (!program) return;
    // `offeneKarten` und NICHT `aktiv`: der Server schreibt den alten Prämientext in
    // ACTIVE **und** COMPLETED. Mit `aktiv` fehlten in der Warnung genau die Gäste,
    // die morgen ihren Kaffee abholen - und der Toast danach nannte eine andere Zahl.
    // `null` statt `?? 0`: sind die Kennzahlen nicht durchgekommen, weiss dieser
    // Bildschirm NICHT, wie viele Karten offen sind - und sagt dann auch keine Zahl.
    const warnungen = aenderungsWarnungen(
      entwurf,
      program,
      uebersicht ? uebersicht.offeneKarten : null,
    );
    if (warnungen.length === 0) {
      void speichern();
      return;
    }
    setBestaetigung(warnungen);
  }, [entwurf, program, speichern, uebersicht]);

  /* ── Zustände, die vor dem Bildschirm kommen ───────────────────────────── */

  if (zustand === "demo") {
    return (
      <Rahmen>
        <EmptyState
          title="Die Stempelkarte arbeitet gegen den Server"
          message="Auf diesem Gerät läuft die App ohne Anmeldung im Demobetrieb. Melde dich an und lege deinen Betrieb an - danach steht die Stempelkarte hier."
        />
      </Rahmen>
    );
  }

  /**
   * Angemeldet, aber ohne eigenen Betrieb - der wahrscheinlichste erste Aufruf
   * dieses Bildschirms überhaupt.
   *
   * Vorher ging der Aufruf mit der DEMOKENNUNG raus, der Server antwortete 403, und
   * hier stand "Dieser Betrieb gehört nicht zu deinem Konto" - über einen Betrieb,
   * den es gar nicht gibt, ohne Knopf und ohne Weg weiter. Deshalb ein eigener
   * Zustand VOR dem ersten Aufruf, wie "demo": kein Aufruf, kein 403, ein Weg.
   */
  if (zustand === "kein_betrieb") {
    return (
      <Rahmen>
        <EmptyState
          title="Für diesen Bildschirm braucht es zuerst deinen Betrieb"
          message="Die Stempelkarte gehört zu einem Betrieb - Karten, Stempel und Prämien hängen daran. Leg ihn an, danach steht sie hier."
        />
        <PillButton label="Betrieb anlegen" onPress={() => router.push("/onboarding/betrieb")} />
      </Rahmen>
    );
  }

  if (zustand === "laedt") {
    return (
      <Rahmen>
        {/* Skelett für Kopf, Kennzahlen und Einstellungen. Kein Spinner über dem
            ganzen Screen: die Einstellungen sind der Kern und sollen zuerst da sein. */}
        <Skelett hoehe={120} />
        <View style={{ flexDirection: "row", gap: theme.spacing.md }}>
          <View style={{ flex: 1 }}>
            <Skelett hoehe={96} />
          </View>
          <View style={{ flex: 1 }}>
            <Skelett hoehe={96} />
          </View>
          <View style={{ flex: 1 }}>
            <Skelett hoehe={96} />
          </View>
        </View>
        <Skelett hoehe={280} />
      </Rahmen>
    );
  }

  // OHNE `&& fehler`. Vorher fiel der Bildschirm bei `zustand === "fehler"` ohne
  // zugehörigen Text durch diese Abfrage hindurch und zeigte den vollen, aber
  // vollständig gesperrten Aufbau: alle Felder grau, Speichern tot, keine Meldung,
  // kein „Erneut versuchen". Ein Zustand ohne Text darf nie in einen bedienbar
  // aussehenden Bildschirm fallen - deshalb hier ein Ersatztext statt einer Lücke.
  if (zustand === "fehler") {
    return (
      <Rahmen>
        <Card padding={theme.spacing.lg} style={{ gap: theme.spacing.md }}>
          <Eyebrow color={theme.colors.destructive}>
            {ladeFehler?.art === "nicht_eingerichtet"
              ? "Noch nicht freigeschaltet"
              : "Nicht geladen"}
          </Eyebrow>
          <Text variant="body" tone="secondary">
            {ladeFehler?.text ?? "Die Stempelkarte konnte nicht geladen werden."}
          </Text>
          {/* Bei 503 „loyalty_nicht_eingerichtet" fehlen die Tabellen in der
              Datenbank. Ein „Erneut versuchen" scheiterte morgen genauso - deshalb
              steht dann keiner. */}
          {ladeFehler === null || ladeFehler.wiederholbar ? (
            <PillButton label="Erneut versuchen" variant="outline" onPress={refresh} />
          ) : null}
        </Card>
      </Rahmen>
    );
  }

  /* ── Es gibt noch kein Programm - der Regelfall beim ersten Öffnen ─────── */

  if (zustand === "kein_programm") {
    return (
      <Rahmen>
        {/* Keine Nullen. Eine „0 offene Prämien" liest sich wie ein Messergebnis;
            „noch nichts eingerichtet" ist die Wahrheit. */}
        <EmptyState
          title="Noch keine Stempelkarte eingerichtet"
          message={
            nurInhaber
              ? "Leg fest, wie viele Stempel es bis zur Prämie braucht und was der Gast dafür bekommt. Danach kannst du Karten ausgeben und stempeln."
              : "Einrichten kann sie nur der Inhaber des Betriebs. Sobald er das getan hat, kannst du hier Karten ausgeben und stempeln."
          }
        />

        {nurInhaber ? (
          <>
            <EinstellungsFormular
              entwurf={entwurf}
              setEntwurf={setEntwurf}
              gesperrt={speichert}
              neu
            />

            {aktionsFehler ? <FehlerZeile text={aktionsFehler} /> : null}

            <PillButton
              label={speichert ? "Wird eingerichtet …" : "Stempelkarte einrichten"}
              disabled={speichert || formFehler !== null}
              onPress={() => void anlegen()}
            />
            {formFehler ? (
              <Text variant="bodySm" tone="muted" style={{ fontSize: 13 }}>
                {formFehler}
              </Text>
            ) : null}
          </>
        ) : null}

        {wallet ? <WalletBlock wallet={wallet} /> : null}
      </Rahmen>
    );
  }

  /* ── Programm da ───────────────────────────────────────────────────────── */

  if (!program) return <Rahmen />;

  // Kennzahlen und Liste können scheitern, während das Programm längst steht. Dann
  // darf hier NICHT "Noch keine Karte ausgegeben" stehen - das wäre eine Aussage über
  // die Daten, und die kennt der Bildschirm in diesem Moment gerade nicht.
  const keineKarten = uebersicht !== null && uebersicht.gesamt === 0;

  return (
    <Rahmen>
      {/* NUR der Kennzahlenblock. Vorher hing hier derselbe Fehlerzustand wie an der
          Liste - ein Fehler beim Nachladen der Liste riss damit die korrekt
          geladenen Zahlen mit vom Bildschirm. */}
      {uebersichtFehler ? (
        <Card padding={theme.spacing.lg} style={{ gap: theme.spacing.sm }}>
          <Eyebrow color={theme.colors.destructive}>Zahlen nicht geladen</Eyebrow>
          <Text variant="body" tone="secondary" style={{ fontSize: 14.5 }}>
            {uebersichtFehler.text}
          </Text>
          {uebersichtFehler.wiederholbar ? (
            <PillButton
              label="Erneut versuchen"
              variant="outline"
              size="compact"
              onPress={refresh}
            />
          ) : null}
        </Card>
      ) : keineKarten ? (
        // Auch hier keine Nullenwand: EINE Zeile statt vier Kacheln mit 0.
        <Card padding={theme.spacing.lg} style={{ gap: 6 }}>
          <Eyebrow>Stand</Eyebrow>
          <Text variant="body" tone="secondary">
            Noch keine Karte ausgegeben. Sobald du unten die erste ausgibst, stehen hier die
            Zahlen dazu.
          </Text>
        </Card>
      ) : uebersicht ? (
        <>
          {/* A - die einzige Zahl, die ein offenes Versprechen darstellt: was der
              Wirt noch einlösen muss. */}
          <DarkPanel style={{ gap: 4 }}>
            <Eyebrow color={onDarkPanel.accent}>Offene Prämien</Eyebrow>
            <Text variant="numeric" color={onDarkPanel.title} style={{ fontSize: 46, lineHeight: 50 }}>
              {uebersicht.voll}
            </Text>
            <Text variant="body" color={onDarkPanel.bodyStrong}>
              {uebersicht.voll === 0
                ? "Gerade wartet niemand auf seine Prämie."
                : uebersicht.voll === 1
                  ? "Eine Karte ist voll und noch nicht eingelöst."
                  : "Karten sind voll und noch nicht eingelöst."}
            </Text>
          </DarkPanel>

          {/* B - drei Kennzahlen. Mehr wären ein Datenmuseum. Keine Umsatzzahl: an
              einem Stempel hängt kein Preis und kein Bon. */}
          <View style={{ flexDirection: "row", gap: theme.spacing.md }}>
            <StatTile label="Kurz vor der Prämie" value={String(uebersicht.fastVoll)} trend="flat" />
            <StatTile
              label="Zweite Karte begonnen"
              value={String(uebersicht.wiederkommer)}
              trend="flat"
            />
            <StatTile
              label="Eingelöst (30 Tage)"
              value={String(uebersicht.eingeloest30d)}
              trend="flat"
            />
          </View>

          <Text variant="bodySm" tone="muted" style={{ fontSize: 12.5 }}>
            {uebersichtsZeile(uebersicht)}
          </Text>
        </>
      ) : (
        <Skelett hoehe={120} />
      )}

      {/* C - Einstellungen */}
      <Card padding={theme.spacing.lg} style={{ gap: theme.spacing.lg }}>
        <Eyebrow>Einstellungen</Eyebrow>
        <EinstellungsFormular entwurf={entwurf} setEntwurf={setEntwurf} gesperrt={gesperrt} />

        {formFehler ? (
          <Text variant="bodySm" color={theme.colors.destructive} style={{ fontSize: 13 }}>
            {formFehler}
          </Text>
        ) : null}

        {/* Für das Personal steht hier gar kein Knopf. Der Server antwortet auf
            PATCH /program mit 403 „nur_inhaber"; ein Knopf, der zuverlässig
            scheitert, ist schlimmer als keiner. */}
        {!nurInhaber ? (
          <Text variant="bodySm" tone="muted" style={{ fontSize: 13 }}>
            Ändern kann diese Einstellungen nur der Inhaber des Betriebs. Stempeln und Karten
            ausgeben kannst du.
          </Text>
        ) : /* Die Warnung steht VOR dem Speichern und nennt echte Zahlen. */
        bestaetigung ? (
          <Card variant="sunken" padding={theme.spacing.lg} style={{ gap: theme.spacing.sm }}>
            <Eyebrow>Bevor gespeichert wird</Eyebrow>
            {bestaetigung.map((zeile) => (
              <Text key={zeile} variant="body" tone="secondary" style={{ fontSize: 14.5 }}>
                {zeile}
              </Text>
            ))}
            <View style={{ flexDirection: "row", gap: theme.spacing.md, marginTop: 4 }}>
              <PillButton
                label={speichert ? "Speichert …" : "Verstanden, speichern"}
                size="compact"
                disabled={speichert}
                onPress={() => void speichern()}
                style={{ flex: 1 }}
                labelSize={14}
              />
              <PillButton
                label="Abbrechen"
                variant="ghost"
                size="compact"
                disabled={speichert}
                onPress={() => setBestaetigung(null)}
                labelSize={14}
              />
            </View>
          </Card>
        ) : (
          <PillButton
            label={speichert ? "Speichert …" : "Änderungen speichern"}
            disabled={gesperrt || geaendert.length === 0 || formFehler !== null}
            onPress={speichernAnstossen}
            accessibilityHint="Zeigt zuerst, was die Änderung für laufende Karten bedeutet."
          />
        )}

        {aktionsFehler ? <FehlerZeile text={aktionsFehler} /> : null}
      </Card>

      {/* D - Statusblock, kein Bedienelement. */}
      {wallet ? <WalletBlock wallet={wallet} /> : null}

      {/* E - wer sammelt */}
      <View style={{ gap: theme.spacing.md }}>
        <Text variant="sectionTitle" style={{ fontSize: 21 }}>
          Wer sammelt
        </Text>

        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
          {FILTER.map((eintrag) => (
            <Chip
              key={eintrag.wert}
              label={eintrag.label}
              selected={filter === eintrag.wert}
              onPress={() => setFilter(eintrag.wert)}
              style={{ paddingHorizontal: 15, paddingVertical: 10 }}
            />
          ))}
        </View>

        {kartenLaden && karten.length === 0 ? (
          <Skelett hoehe={140} />
        ) : listenFehler && karten.length === 0 ? (
          // Kein Leerzustand über Daten, die gerade nicht geladen werden konnten -
          // "Noch keine Karte ausgegeben" wäre hier schlicht eine Behauptung.
          <Text variant="bodySm" tone="muted" style={{ fontSize: 13 }}>
            {listenFehler.text}
          </Text>
        ) : karten.length === 0 ? (
          // Bei `keineKarten` steht dieselbe Aussage schon oben in der Karte "Stand".
          // Zweimal derselbe Satz in einem Bildschirm liest sich wie zwei Befunde.
          keineKarten && filter === "alle" ? null : (
            <EmptyState
              title={
                filter === "alle" ? "Noch keine Karte ausgegeben" : "Keine Karte in dieser Auswahl"
              }
              message={
                filter === "alle"
                  ? "Gib unten die erste Karte aus. Danach steht hier, wer sammelt und wie weit."
                  : undefined
              }
            />
          )
        ) : (
          <ListCard>
            {karten.map((karte) => (
              <KartenZeile
                key={karte.id}
                karte={karte}
                onPress={() =>
                  router.push({
                    pathname: "/stempelkarte/[kartenId]",
                    params: { kartenId: karte.id },
                  })
                }
              />
            ))}
          </ListCard>
        )}

        {/* ZWEI VERSCHIEDENE SACHEN, vorher zu einer verodert.
            `mehrVorhanden` heisst „es gibt eine nächste Seite" - dagegen hilft
            Nachladen. `gekappt` heisst „der Server hat bei der Filterprüfung seine
            Obergrenze erreicht" - dagegen hilft Nachladen NICHT, und der frühere
            Satz „Nutze die Filter oben" verwies auf einen Weg, den es nicht gibt:
            die Filter prüfen selbst nur die neuesten 500 Karten. */}
        {mehrVorhanden ? (
          <PillButton
            label={kartenLaden ? "Lädt …" : "Mehr laden"}
            variant="outline"
            size="compact"
            disabled={kartenLaden}
            onPress={mehrLaden}
          />
        ) : null}
        {gekappt ? (
          <Text variant="bodySm" tone="muted" style={{ fontSize: 12.5 }}>
            Für diese Auswahl werden nur die neuesten 500 Karten geprüft - ältere sind hier
            nicht erreichbar.
          </Text>
        ) : null}
        {/* Scheitert das Nachladen, bleibt das schon Geladene stehen - der Fehler
            gehört trotzdem hin, sonst sieht die Liste vollständig aus. */}
        {listenFehler && karten.length > 0 ? (
          <Text variant="bodySm" tone="muted" style={{ fontSize: 12.5 }}>
            {listenFehler.text}
          </Text>
        ) : null}
      </View>

      <KarteAusgeben
        venueId={venueId}
        programmAktiv={program.isActive}
        onAusgegeben={(kartenId) => {
          refresh();
          router.push({ pathname: "/stempelkarte/[kartenId]", params: { kartenId } });
        }}
      />
    </Rahmen>
  );
}

/* ── Bausteine dieses Bildschirms ────────────────────────────────────────── */

function Rahmen({ children }: { children?: React.ReactNode }) {
  const theme = useTheme();
  return (
    <Screen contentStyle={{ gap: theme.spacing.lg }} animated="subtle">
      <NavHeader title="Stempelkarte" fallback="/konto" />
      {children}
    </Screen>
  );
}

function FehlerZeile({ text }: { text: string }) {
  const theme = useTheme();
  return (
    <Text variant="body" color={theme.colors.destructive} style={{ fontSize: 14 }}>
      {text}
    </Text>
  );
}

function EinstellungsFormular({
  entwurf,
  setEntwurf,
  gesperrt,
  neu = false,
}: {
  entwurf: ProgrammEntwurf;
  setEntwurf: (naechster: ProgrammEntwurf) => void;
  gesperrt: boolean;
  neu?: boolean;
}) {
  const theme = useTheme();
  const setzen = <K extends keyof ProgrammEntwurf>(feld: K, wert: ProgrammEntwurf[K]) =>
    setEntwurf({ ...entwurf, [feld]: wert });

  return (
    <View style={{ gap: theme.spacing.lg }}>
      <TextFeld
        label="Name des Programms"
        wert={entwurf.name}
        onChange={(wert) => setzen("name", wert)}
        maxLength={NAME_MAX}
        editable={!gesperrt}
        placeholder="Stempelkarte"
      />

      <AuswahlZeile
        label="Wie viele Stempel bis zur Prämie"
        optionen={STEMPEL_OPTIONEN.map((wert) => ({ wert, label: String(wert) }))}
        wert={entwurf.maxStamps}
        onChange={(wert) => setzen("maxStamps", wert)}
        editable={!gesperrt}
      />

      <TextFeld
        label="Was der Gast bekommt"
        wert={entwurf.rewardText}
        onChange={(wert) => setzen("rewardText", wert)}
        maxLength={PRAEMIE_MAX}
        editable={!gesperrt}
        placeholder="z. B. 1x Kaffee gratis"
        // NICHT „Steht so auf der Karte des Gastes". Der einzige Ort, an dem dieser
        // Text heute erscheint, ist diese App - es gibt keinen Wallet-Pass (siehe
        // PASSAUSGABE_GEBAUT). Der Wirt sagte sonst am Tresen „steht auf deinem
        // Handy", und dort steht nichts.
        hinweis="Steht auf der Karte in dieser App - und später auf dem Wallet-Pass des Gastes"
      />

      <AuswahlZeile
        label="Ein Stempel pro Besuch - frühestens wieder nach:"
        optionen={SPERRFRIST_OPTIONEN.map((o) => ({ wert: o.wert, label: o.label }))}
        wert={entwurf.cooldownSeconds}
        onChange={(wert) => setzen("cooldownSeconds", wert)}
        editable={!gesperrt}
        hinweis="Verhindert, dass derselbe Gast beim gleichen Besuch zweimal gestempelt wird."
      />

      <AuswahlZeile
        label="Karte verfällt nach"
        optionen={GUELTIGKEIT_OPTIONEN.map((o) => ({ wert: o.wert, label: o.label }))}
        wert={entwurf.validityDays}
        onChange={(wert) => setzen("validityDays", wert)}
        editable={!gesperrt}
      />

      <View style={{ flexDirection: "row", alignItems: "center", gap: 14 }}>
        <View style={{ flex: 1 }}>
          <Text variant="cardTitleSm" style={{ fontSize: 16.5 }}>
            Neue Karten ausgeben
          </Text>
          {/* Nicht „Aktiv" beschriften - das liest sich, als würde es laufende
              Karten beenden. Es beendet nichts. */}
          <Text variant="bodySm" tone="muted" style={{ fontSize: 12.5, marginTop: 2 }}>
            {entwurf.isActive
              ? "Du kannst neue Karten an Gäste ausgeben."
              : "Laufende Karten bleiben gültig. Es kommen nur keine neuen dazu."}
          </Text>
        </View>
        <Toggle
          value={entwurf.isActive}
          onValueChange={gesperrt ? undefined : (wert) => setzen("isActive", wert)}
          accessibilityLabel="Neue Karten ausgeben"
        />
      </View>

      {neu ? null : (
        <Text variant="bodySm" tone="muted" style={{ fontSize: 12.5 }}>
          Das Programm lässt sich nicht löschen - daran hängt der Nachweis jedes gesetzten
          Stempels. Wer keine Karten mehr ausgeben will, schaltet den Schalter oben aus.
        </Text>
      )}
    </View>
  );
}

/**
 * Kartenaktualisierung - lesend, ohne Aktion.
 *
 * Der Titel ist bewusst nicht „Nutzer benachrichtigen": was hier passiert, ist, dass
 * die Karte des Gastes den neuen Stand zeigt. Ein freies Rundschreiben an alle
 * Kartenbesitzer kann dieses System nicht auslösen, und ein Knopf, der das
 * behauptete, wäre eine Zusage ohne Kanal.
 */
function WalletBlock({ wallet }: { wallet: WalletBereitschaft }) {
  const theme = useTheme();
  const mangel = useMemo(() => walletMangelKlartext(wallet.missing), [wallet.missing]);
  // Hinterlegte Zugangsdaten sind noch keine Zustellung. Grün erst, wenn beides
  // stimmt - sonst ist die Farbe selbst die Zusage.
  const zustellbar = (hinterlegt: boolean) => hinterlegt && Boolean(wallet.passausgabeGebaut);

  return (
    <Card variant="sunken" padding={theme.spacing.lg} style={{ gap: theme.spacing.sm }}>
      <Eyebrow>Kartenaktualisierung</Eyebrow>

      <View style={{ gap: 6 }}>
        <StatusLabel
          label={walletStatusZeile("Apple Wallet", wallet.apple, wallet.passausgabeGebaut)}
          color={zustellbar(wallet.apple) ? theme.colors.success : theme.colors.textMuted}
        />
        <StatusLabel
          label={walletStatusZeile("Google Wallet", wallet.google, wallet.passausgabeGebaut)}
          color={zustellbar(wallet.google) ? theme.colors.success : theme.colors.textMuted}
        />
      </View>

      <Text variant="body" tone="secondary" style={{ fontSize: 14.5 }}>
        {walletSatz(wallet)}
      </Text>

      <Text variant="bodySm" tone="muted" style={{ fontSize: 13 }}>
        Ein freier Text an alle Kartenbesitzer ist über die Wallet nicht möglich - der Gast
        sieht nur, was auf seiner eigenen Karte steht.
      </Text>

      {mangel.length > 0 ? (
        <Text variant="bodySm" tone="faint" style={{ fontSize: 12 }}>
          Dafür fehlt noch: {mangel.join(", ")}.
        </Text>
      ) : null}
    </Card>
  );
}

/**
 * Eine Zeile der Sammlerliste.
 *
 * Bewusst kein `FlatList`: der ganze Bildschirm liegt in `Screen`, und das ist ein
 * ScrollView. Eine VirtualizedList darin ist der Fall, vor dem React Native selbst
 * warnt - die Virtualisierung greift nicht mehr, dafür bricht die Scrollmessung.
 * Gegen Länge hilft hier die Obergrenze der Abfrage (20 Zeilen, "Alle anzeigen" auf
 * 100) und der Filter darüber, nicht ein zweiter Scroller.
 *
 * KEINE Kontaktspalte: Telefon und E-Mail sind nullbar und in einer Übersicht nicht
 * zweckgedeckt. Und kein Verlauf - über alle Gäste dauerhaft angezeigt wäre das ein
 * Anwesenheitsprotokoll statt eines Stempelstands.
 */
function KartenZeile({ karte, onPress }: { karte: StampCardRow; onPress: () => void }) {
  const theme = useTheme();
  // Aus dem STAND, nicht aus dem Status - sonst zeigt der Filter "Voll" eine Karte,
  // an der das Abzeichen "voll" fehlt (siehe `istVoll`).
  const voll = istVoll(karte);

  return (
    // Die GANZE Zeile ist das Tippziel. Vorher hingen zwei `onPress` an zwei Texten
    // (Name und „›"); ein Tipp auf den Fortschrittsbalken oder auf „vor 3 Tagen" -
    // am Tresen der Normalfall - tat nichts. Machart wie `ListRow`.
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${karte.gast.anzeigename}, ${karte.stand.current} von ${karte.stand.max} Stempeln`}
      style={({ pressed }) => ({
        paddingVertical: 14,
        gap: 8,
        minHeight: theme.hitSize.minTouch,
        opacity: pressed ? 0.6 : 1,
      })}
    >
      <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
        <Text
          variant="cardTitleSm"
          tone={karte.gast.geloescht ? "muted" : "primary"}
          numberOfLines={1}
          style={{ flex: 1, fontSize: 16.5 }}
        >
          {karte.gast.anzeigename}
        </Text>
        {karte.gast.istBeispiel ? <Tag label="Beispiel" /> : null}
        {voll ? <StatusLabel label="voll" color={theme.colors.success} /> : null}
        <Text variant="numeric" tone="faint" style={{ fontSize: 20 }}>
          ›
        </Text>
      </View>

      <ProgressBar current={karte.stand.current} total={karte.stand.max} />

      <Text variant="bodySm" tone="muted" style={{ fontSize: 12.5 }}>
        {relativeZeit(karte.letzterStempelAt)}
        {karte.cycle > 1 ? ` · ${karte.cycle}. Karte` : ""}
        {karte.status !== "ACTIVE" && !voll ? ` · ${STATUS_TEXT[karte.status]}` : ""}
      </Text>
    </Pressable>
  );
}

/**
 * Karte ausgeben.
 *
 * Ohne diesen Weg bliebe die Liste dauerhaft leer und niemand könnte prüfen, ob das
 * Gebaute funktioniert. Bewusst ohne Kamera: `expo-camera` ist nicht installiert und
 * bräuchte einen neuen nativen Bau. Der Server verbucht das als `MANUAL` - dafür ist
 * der Wert im Datenmodell vorgesehen.
 *
 * Steht „Neue Karten ausgeben" auf aus, gibt es hier keinen Knopf statt eines
 * grauen: der Server antwortete mit `keine_neuen_karten`, und ein Knopf, der immer
 * scheitert, ist schlimmer als keiner.
 */
function KarteAusgeben({
  venueId,
  programmAktiv,
  onAusgegeben,
}: {
  venueId: string;
  programmAktiv: boolean;
  onAusgegeben: (kartenId: string) => void;
}) {
  const theme = useTheme();
  const [offen, setOffen] = useState(false);
  const [name, setName] = useState("");
  const [telefon, setTelefon] = useState("");
  const [laeuft, setLaeuft] = useState(false);
  const [fehler, setFehler] = useState<string | null>(null);

  const ausgeben = useCallback(async () => {
    setLaeuft(true);
    setFehler(null);
    try {
      const antwort = await api.loyalty.issueCard({
        venueId,
        gast: { name: name.trim(), ...(telefon.trim() ? { phone: telefon.trim() } : {}) },
      });
      setName("");
      setTelefon("");
      setOffen(false);
      onAusgegeben(antwort.karte.id);
    } catch (err) {
      // Der Sonderfall „dieser Gast sammelt schon" trägt die laufende Karte mit -
      // das ist keine Sackgasse, sondern ein Hinweis auf die vorhandene Karte.
      const kartenId = (err as { body?: { kartenId?: unknown } })?.body?.kartenId;
      if (typeof kartenId === "string") {
        setOffen(false);
        onAusgegeben(kartenId);
        return;
      }
      setFehler(buchungsFehlerText(err));
    } finally {
      setLaeuft(false);
    }
  }, [name, onAusgegeben, telefon, venueId]);

  if (!programmAktiv) {
    return (
      <Text variant="bodySm" tone="muted" style={{ fontSize: 13 }}>
        „Neue Karten ausgeben" ist ausgeschaltet - deshalb steht hier kein Knopf dafür. Schalte
        es oben wieder ein, um Karten auszugeben.
      </Text>
    );
  }

  if (!offen) {
    return (
      <PillButton label="Karte ausgeben" variant="outline" onPress={() => setOffen(true)} />
    );
  }

  return (
    <Card padding={theme.spacing.lg} style={{ gap: theme.spacing.md }}>
      <Eyebrow>Karte ausgeben</Eyebrow>
      {/* Der Nummer ist jetzt ein Zweck zugeordnet, und der steht hier auch dran:
          der Server normalisiert sie und erkennt denselben Gast beim nächsten Mal
          daran wieder. Vorher stand hier „ohne sie funktioniert die Karte genauso" -
          das legte nahe, dass MIT ihr etwas mehr funktioniert, und es funktionierte
          nichts: `phoneE164` wurde nie geschrieben, es gab keinen Sendeweg. */}
      <Text variant="bodySm" tone="secondary" style={{ fontSize: 13.5 }}>
        Der Name steht auf der Karte und in deiner Liste. Die Nummer ist freiwillig - mit ihr
        erkennt Maitr denselben Gast beim nächsten Mal wieder, statt ihn doppelt anzulegen.
        Verschickt wird nichts.
      </Text>

      <TextFeld
        label="Name des Gastes"
        wert={name}
        onChange={setName}
        maxLength={120}
        editable={!laeuft}
        placeholder="z. B. Anna M."
      />
      <TextFeld
        label="Telefon (freiwillig)"
        wert={telefon}
        onChange={setTelefon}
        maxLength={40}
        editable={!laeuft}
        placeholder="+49 …"
      />

      {fehler ? <FehlerZeile text={fehler} /> : null}

      <PillButton
        label={laeuft ? "Wird ausgegeben …" : "Karte ausgeben"}
        disabled={laeuft || name.trim().length === 0}
        onPress={() => void ausgeben()}
      />
      <PillButton
        label="Abbrechen"
        variant="ghost"
        disabled={laeuft}
        onPress={() => {
          setOffen(false);
          setFehler(null);
        }}
      />
    </Card>
  );
}
