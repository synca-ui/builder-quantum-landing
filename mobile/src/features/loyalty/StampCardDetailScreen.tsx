import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { View } from "react-native";
import { useRouter } from "expo-router";
import {
  api,
  isCoreConfigured,
  type StampCardDetail,
  type StampEventRow,
  type VenueRolle,
} from "@maitr/core";

import { StatusLabel } from "../../components/ui/Avatar";
import { Card } from "../../components/ui/Card";
import { Tag } from "../../components/ui/Chip";
import { EmptyState } from "../../components/ui/EmptyState";
import { Eyebrow } from "../../components/ui/Eyebrow";
import { NavHeader } from "../../components/ui/NavHeader";
import { PillButton } from "../../components/ui/PillButton";
import { ProgressBar } from "../../components/ui/Progress";
import { Screen } from "../../components/ui/Screen";
import { Text } from "../../components/ui/Text";
import { hasRealAuth } from "../../lib/auth";
import { useStore } from "../../lib/store";
import { useToast } from "../../lib/toast";
import { useTheme } from "../../theme";
import { Skelett, TextFeld } from "./Formularteile";
import {
  STATUS_TEXT,
  buchungsFehlerText,
  ereignisZeile,
  fehlerAnzeige,
  genauerZeitpunkt,
  istKartenDetail,
  istVoll,
  nurDatum,
  type FehlerAnzeige,
} from "./aufbereitung";

/**
 * Kartendetail - die Ansicht im Streitfall am Tresen ("der Gast sagt, ich hatte
 * neun").
 *
 * Der Verlauf steht bewusst NUR hier und nicht in der Übersichtsliste: über alle
 * Gäste hinweg dauerhaft angezeigt wäre er ein Anwesenheitsprotokoll von Leuten, die
 * eine Stempelkarte wollten - und dafür ist das Hauptbuch nicht erhoben.
 *
 * Alle vier Aktionen laufen über denselben abgesicherten Serverpfad (Transaktion,
 * Sperrfrist, optimistische Sperre, Hauptbucheintrag). Es gibt keinen zweiten,
 * kürzeren Weg dorthin.
 */
export function StampCardDetailScreen({ kartenId }: { kartenId: string }) {
  const theme = useTheme();
  const router = useRouter();
  const toast = useToast();
  const { venueId } = useStore();

  const echterServer = useMemo(() => hasRealAuth() && isCoreConfigured(), []);

  const [karte, setKarte] = useState<StampCardDetail | null>(null);
  const [verlauf, setVerlauf] = useState<StampEventRow[]>([]);
  const [rolle, setRolle] = useState<VenueRolle>("STAFF");
  const [programmAktiv, setProgrammAktiv] = useState(false);
  const [laedt, setLaedt] = useState(echterServer);
  const [fehler, setFehler] = useState<FehlerAnzeige | null>(null);
  const [aktionsFehler, setAktionsFehler] = useState<string | null>(null);
  const [laeuft, setLaeuft] = useState<null | "stempel" | "praemie" | "entwerten" | "anonym" | "neu">(
    null,
  );
  const [entwertenOffen, setEntwertenOffen] = useState(false);
  const [grund, setGrund] = useState("");
  const [loeschenOffen, setLoeschenOffen] = useState(false);
  const [nonce, setNonce] = useState(0);

  const mounted = useRef(true);
  /** Trennt Erstladen von Nachladen - siehe Ladeeffekt. */
  const schonGeladen = useRef(false);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  /**
   * Vorgangsschlüssel je Aktion, stabil bis zum Erfolg.
   *
   * Das ist der Kern der Idempotenz: wird derselbe Schlüssel wiederholt geschickt,
   * antwortet der Server mit dem bestehenden Zustand statt ein zweites Mal zu buchen.
   * Ein neuer Schlüssel je Tipp hübe den Schutz auf - und genau das passiert am
   * Tresen, wenn das Netz hakt und jemand zweimal drückt.
   */
  const vorgaenge = useRef<Record<string, string>>({});
  const schluessel = (art: string): string => {
    if (!vorgaenge.current[art]) {
      vorgaenge.current[art] = `${art}-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
    }
    return vorgaenge.current[art];
  };

  useEffect(() => {
    if (!echterServer) {
      setLaedt(false);
      return;
    }

    const controller = new AbortController();
    // Skelett NUR beim ersten Durchlauf. Vorher ersetzte jedes Nachladen nach einer
    // Buchung den ganzen Bildschirm für einen Rundlauf durch graue Blöcke - und das
    // passiert am Tresen nach jedem Stempel.
    if (!schonGeladen.current) setLaedt(true);

    Promise.all([
      api.loyalty.card(venueId, kartenId, controller.signal),
      api.loyalty.events(venueId, kartenId, undefined, controller.signal),
      // Dritter Aufruf, und er trägt seinen Preis: nur so weiss dieser Bildschirm,
      // ob der Server die Knöpfe „Karte entwerten" und „Daten löschen" für diesen
      // Nutzer überhaupt einlöst (ownerGuard) und ob neue Karten ausgegeben werden.
      api.loyalty.program(venueId, controller.signal),
    ])
      .then(([detail, ereignisse, programm]) => {
        if (!mounted.current) return;
        // Geprüft wird, was der Bildschirm RENDERT - `detail.id` allein liess eine
        // Antwort ohne `stand` durch, und das Rendern warf danach beim Lesen von
        // `stand.current`.
        if (!istKartenDetail(detail)) throw new Error("Antwort ist keine Karte");
        if (!ereignisse || !Array.isArray(ereignisse.items)) {
          throw new Error("Antwort ist kein Verlauf");
        }
        setKarte(detail);
        setVerlauf(ereignisse.items);
        setRolle(programm?.rolle ?? "STAFF");
        setProgrammAktiv(Boolean(programm?.program?.isActive));
        setFehler(null);
        schonGeladen.current = true;
      })
      .catch((err: unknown) => {
        if (!mounted.current || controller.signal.aborted) return;
        setFehler(fehlerAnzeige(err, "karte"));
      })
      .finally(() => {
        if (mounted.current) setLaedt(false);
      });

    return () => controller.abort();
  }, [venueId, kartenId, nonce, echterServer]);

  const neuLaden = useCallback(() => setNonce((n) => n + 1), []);

  const buchen = useCallback(
    async (art: "stempel" | "praemie") => {
      setLaeuft(art);
      setAktionsFehler(null);
      try {
        const eingabe = { venueId, idempotencyKey: schluessel(art) };
        const antwort =
          art === "stempel"
            ? await api.loyalty.stamp(kartenId, eingabe)
            : await api.loyalty.redeem(kartenId, eingabe);
        // Erst nach dem Erfolg verwerfen: bei „konflikt" (optimistische Sperre hat
        // gegriffen, gebucht wurde nichts) muss die Wiederholung DENSELBEN Schlüssel
        // tragen, sonst bucht sie doppelt.
        delete vorgaenge.current[art];
        setKarte(antwort.karte);
        toast.show(
          antwort.wiederholung
            ? "War schon gebucht"
            : art === "stempel"
              ? "Stempel gesetzt"
              : "Prämie eingelöst",
        );
        neuLaden();
      } catch (err) {
        setAktionsFehler(buchungsFehlerText(err));
      } finally {
        setLaeuft(null);
      }
    },
    [kartenId, neuLaden, toast, venueId],
  );

  const entwerten = useCallback(async () => {
    setLaeuft("entwerten");
    setAktionsFehler(null);
    try {
      const antwort = await api.loyalty.voidCard(kartenId, { venueId, grund: grund.trim() });
      setKarte(antwort.karte);
      setEntwertenOffen(false);
      setGrund("");
      toast.show("Karte entwertet");
      neuLaden();
    } catch (err) {
      setAktionsFehler(buchungsFehlerText(err));
    } finally {
      setLaeuft(null);
    }
  }, [grund, kartenId, neuLaden, toast, venueId]);

  const anonymisieren = useCallback(async () => {
    if (!karte) return;
    setLaeuft("anonym");
    setAktionsFehler(null);
    try {
      await api.loyalty.anonymizeGuest(karte.gast.id, { venueId });
      setLoeschenOffen(false);
      toast.show("Daten des Gastes gelöscht");
      neuLaden();
    } catch (err) {
      setAktionsFehler(buchungsFehlerText(err));
    } finally {
      setLaeuft(null);
    }
  }, [karte, neuLaden, toast, venueId]);

  /**
   * Für denselben Gast eine Anschlusskarte ausgeben.
   *
   * Das war die Lücke, die den Kennwert „Zweite Karte begonnen" dauerhaft auf 0
   * hielt: `issueCard` wurde im ganzen Client nur mit einem NEU erfassten Gast
   * aufgerufen, nie mit `guestId`. Der Wiederkommer wurde damit bei jedem Besuch
   * eine neue Person - zwei Gastzeilen, zwei Karten mit `cycle: 1`, und die spätere
   * Löschanfrage traf nur eine davon.
   *
   * Der `guestId`-Zweig existierte serverseitig längst und ermittelt `cycle + 1`
   * selbst. Er brauchte nur einen Knopf.
   */
  const neueKarte = useCallback(async () => {
    if (!karte) return;
    setLaeuft("neu");
    setAktionsFehler(null);
    try {
      const antwort = await api.loyalty.issueCard({ venueId, guestId: karte.gast.id });
      toast.show("Neue Karte ausgegeben");
      router.replace({
        pathname: "/stempelkarte/[kartenId]",
        params: { kartenId: antwort.karte.id },
      });
    } catch (err) {
      // „Läuft schon eine" trägt die Kartenkennung mit - dann dorthin statt in eine
      // Fehlermeldung.
      const vorhandene = (err as { body?: { kartenId?: unknown } })?.body?.kartenId;
      if (typeof vorhandene === "string") {
        router.replace({ pathname: "/stempelkarte/[kartenId]", params: { kartenId: vorhandene } });
        return;
      }
      setAktionsFehler(buchungsFehlerText(err));
    } finally {
      setLaeuft(null);
    }
  }, [karte, router, toast, venueId]);

  if (!echterServer) {
    return (
      <Rahmen>
        <EmptyState
          title="Diese Karte liegt auf dem Server"
          message="Auf diesem Gerät läuft die App im Demobetrieb ohne Anmeldung."
        />
      </Rahmen>
    );
  }

  if (laedt) {
    return (
      <Rahmen>
        <Skelett hoehe={150} />
        <Skelett hoehe={220} />
      </Rahmen>
    );
  }

  if (fehler || !karte) {
    return (
      <Rahmen>
        <Card padding={theme.spacing.lg} style={{ gap: theme.spacing.md }}>
          <Eyebrow color={theme.colors.destructive}>Nicht geladen</Eyebrow>
          <Text variant="body" tone="secondary">
            {fehler?.text ?? "Diese Karte konnte nicht geladen werden."}
          </Text>
          {fehler?.wiederholbar !== false ? (
            <PillButton label="Erneut versuchen" variant="outline" onPress={neuLaden} />
          ) : null}
          <PillButton label="Zurück" variant="ghost" onPress={() => router.back()} />
        </Card>
      </Rahmen>
    );
  }

  // AUS DEM STAND, nicht aus dem Status. Eine Karte, deren Statusspalte bei ACTIVE
  // hängen geblieben ist, während das Hauptbuch 10 von 10 sagt, stand in der Kachel
  // „Offene Prämien" und im Filter „Voll" - hier fehlte trotzdem der Knopf „Prämie
  // eingelöst", obwohl der Server ihn eingelöst hätte.
  const voll = istVoll(karte);
  // Beides kann zugleich gelten - genau im Driftfall (Status ACTIVE, Hauptbuch
  // 10 von 10). Dann stehen beide Knöpfe da, und beide funktionieren serverseitig.
  // Einen davon wegzunehmen hiesse, dem Wirt am Tresen eine Möglichkeit zu nehmen,
  // die der Server ihm lässt.
  const aktiv = karte.status === "ACTIVE";
  const offen = karte.status === "ACTIVE" || karte.status === "COMPLETED";
  const darfAendern = rolle === "OWNER" || rolle === "ADMIN";

  return (
    <Rahmen>
      <Card padding={theme.spacing.lg} style={{ gap: theme.spacing.md }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
          <Text variant="sectionTitle" style={{ flex: 1, fontSize: 21 }} numberOfLines={1}>
            {karte.gast.anzeigename}
          </Text>
          {karte.gast.istBeispiel ? <Tag label="Beispiel" /> : null}
          <StatusLabel
            label={STATUS_TEXT[karte.status]}
            color={voll ? theme.colors.success : theme.colors.textMuted}
          />
        </View>

        {/* Nur solange die Karte offen ist. Eine eingelöste oder entwertete Karte
            mit Fortschrittsbalken sieht aus, als liefe sie noch. */}
        {offen ? <ProgressBar current={karte.stand.current} total={karte.stand.max} /> : null}

        {/* Der Prämientext DIESER Karte, nicht der des Programms. Ändert der Wirt die
            Prämie, bleibt für laufende Karten die Zusage stehen, die bei der Ausgabe
            galt - `rewardTextQuelle` sagt, woher der angezeigte Text stammt. */}
        <Text variant="body" tone="secondary">
          Prämie dieser Karte: {karte.rewardText}
          {karte.rewardTextQuelle === "programm" ? " (aktuelle Programmprämie)" : ""}
        </Text>

        <View style={{ gap: 4 }}>
          <Zeile label="Zyklus" wert={`${karte.cycle}. Karte · ${karte.redeemedCount}x eingelöst`} />
          <Zeile label="Ausgegeben am" wert={nurDatum(karte.ausgegebenAm)} />
          <Zeile label="Gültig bis" wert={karte.gueltigBis ? nurDatum(karte.gueltigBis) : "unbegrenzt"} />
          {karte.vollSeit ? <Zeile label="Voll seit" wert={nurDatum(karte.vollSeit)} /> : null}
          {karte.eingeloestAm ? (
            <Zeile label="Eingelöst am" wert={nurDatum(karte.eingeloestAm)} />
          ) : null}
          <Zeile
            label="Pass in einer Wallet"
            wert={
              karte.walletGeraete === 0
                ? "auf keinem Gerät"
                : `auf ${karte.walletGeraete} iPhone${karte.walletGeraete === 1 ? "" : "s"}`
            }
          />
        </View>

        {/* Der Cache darf abweichen - der Stand oben kommt aus dem Hauptbuch und ist
            die Wahrheit. Sichtbar statt still: wer eine Abweichung sieht, weiß, dass
            sie sich beim nächsten Stempel von selbst geradezieht. */}
        {karte.cacheStand !== karte.stand.current ? (
          <Text variant="bodySm" tone="muted" style={{ fontSize: 12.5 }}>
            Hinweis: Der schnelle Zwischenstand steht auf {karte.cacheStand}, gerechnet aus dem
            Verlauf sind es {karte.stand.current}. Gültig ist der Verlauf; beim nächsten Stempel
            gleicht sich das an.
          </Text>
        ) : null}
      </Card>

      {aktionsFehler ? (
        <Text variant="body" color={theme.colors.destructive} style={{ fontSize: 14 }}>
          {aktionsFehler}
        </Text>
      ) : null}

      {/* Aktionen. Was der Zustand der Karte nicht erlaubt, steht gar nicht erst da -
          ein Knopf, der zuverlässig 409 antwortet, ist keine Bedienung. */}
      <View style={{ gap: theme.spacing.md }}>
        {aktiv ? (
          <PillButton
            label={laeuft === "stempel" ? "Wird gesetzt …" : "Stempel setzen"}
            disabled={laeuft !== null}
            onPress={() => void buchen("stempel")}
          />
        ) : null}

        {voll ? (
          <PillButton
            label={laeuft === "praemie" ? "Wird gebucht …" : "Prämie eingelöst"}
            disabled={laeuft !== null}
            onPress={() => void buchen("praemie")}
            // NICHT „Der Gast beginnt danach eine neue Karte." Es beginnt keine -
            // `praemieEinloesen` legt ausdrücklich keine Anschlusskarte an. Der Wirt
            // wartete auf eine Karte, die nirgends entstand.
            accessibilityHint="Bucht die Prämie als ausgegeben. Eine neue Karte gibst du danach selbst aus."
          />
        ) : null}

        {/* Der Weg nach dem Einlösen. Ohne ihn verschwanden hier ALLE Knöpfe und der
            einzige verbleibende Weg führte über „Karte ausgeben" mit dem Namen -
            und legte damit denselben Gast ein zweites Mal an. */}
        {!offen && !karte.gast.geloescht && programmAktiv ? (
          <PillButton
            label={laeuft === "neu" ? "Wird ausgegeben …" : "Neue Karte für diesen Gast"}
            variant="outline"
            disabled={laeuft !== null}
            onPress={() => void neueKarte()}
            accessibilityHint="Gibt für denselben Gast die nächste Karte aus - er bleibt derselbe Eintrag in deiner Liste."
          />
        ) : null}

        {(aktiv || voll) && darfAendern ? (
          entwertenOffen ? (
            <Card padding={theme.spacing.lg} style={{ gap: theme.spacing.md }}>
              <Eyebrow color={theme.colors.destructive}>Karte entwerten</Eyebrow>
              <Text variant="body" tone="secondary" style={{ fontSize: 14.5 }}>
                Das lässt sich nicht rückgängig machen. Die Karte gilt danach nicht mehr, der
                Verlauf bleibt als Nachweis stehen.
              </Text>
              <TextFeld
                label="Grund"
                wert={grund}
                onChange={setGrund}
                maxLength={280}
                editable={laeuft === null}
                placeholder="z. B. doppelt ausgegeben"
                mehrzeilig
              />
              <PillButton
                label={laeuft === "entwerten" ? "Wird entwertet …" : "Endgültig entwerten"}
                disabled={laeuft !== null || grund.trim().length < 3}
                onPress={() => void entwerten()}
                style={{ backgroundColor: theme.colors.destructive }}
                labelColor="#FFFFFF"
              />
              <PillButton
                label="Abbrechen"
                variant="ghost"
                disabled={laeuft !== null}
                onPress={() => setEntwertenOffen(false)}
              />
            </Card>
          ) : (
            <PillButton
              label="Karte entwerten"
              variant="outline"
              disabled={laeuft !== null}
              onPress={() => setEntwertenOffen(true)}
            />
          )
        ) : null}
      </View>

      {/* Verlauf - das Hauptbuch dieser einen Karte. */}
      <View style={{ gap: theme.spacing.md }}>
        <Text variant="sectionTitle" style={{ fontSize: 21 }}>
          Verlauf
        </Text>
        {verlauf.length === 0 ? (
          <EmptyState
            title="Noch nichts passiert"
            message="Sobald ein Stempel gesetzt wird, steht hier, wann, von wem und an welchem Gerät."
          />
        ) : (
          <Card padding={theme.spacing.lg} style={{ gap: theme.spacing.md }}>
            {verlauf.map((ereignis) => {
              const zeile = ereignisZeile(ereignis);
              return (
                <View key={ereignis.id} style={{ gap: 2 }}>
                  <View style={{ flexDirection: "row", alignItems: "baseline", gap: 8 }}>
                    <Text variant="cardTitleSm" style={{ flex: 1, fontSize: 15.5 }}>
                      {zeile.titel}
                    </Text>
                    <Text variant="numeric" tone="muted" style={{ fontSize: 14 }}>
                      {zeile.delta} · Stand {ereignis.balanceAfter}
                    </Text>
                  </View>
                  <Text variant="bodySm" tone="muted" style={{ fontSize: 12.5 }}>
                    {genauerZeitpunkt(ereignis.createdAt)} · {zeile.herkunft}
                  </Text>
                  {ereignis.note ? (
                    <Text variant="bodySm" tone="secondary" style={{ fontSize: 12.5 }}>
                      {ereignis.note}
                    </Text>
                  ) : null}
                </View>
              );
            })}
          </Card>
        )}
      </View>

      {/* Auskunft und Löschung muss der BETRIEB beantworten können - er ist der
          Verantwortliche, maitr nur Auftragsverarbeiter. Deshalb steht das hier und
          nicht in einem Support-Kanal.

          Gelöscht wird der GAST, nicht die Karte: Name und Kontaktdaten verschwinden,
          Karte und Hauptbuch bleiben. Ein echtes Löschen gibt es bewusst nicht - an
          `MaitrGuest` hängen per Cascade die Karten und darüber das Hauptbuch; wer
          sich vierzigmal selbst gestempelt hat, räumte damit alle vierzig Belege in
          einem Klick ab.

          NUR FÜR DEN INHABER, seit der Server das mit `ownerGuard` durchsetzt: die
          Anonymisierung entfernt zwar keinen Beleg, aber den KONTEXT der Belege -
          und wer sich selbst gestempelt hat, hat genau daran ein Interesse. Wer sie
          nicht auslösen darf, sieht auch keinen Knopf dafür. */}
      {!darfAendern ? (
        <Text variant="bodySm" tone="muted" style={{ fontSize: 13 }}>
          Eine Löschanfrage dieses Gastes beantwortet der Inhaber des Betriebs - er allein kann
          die Daten hier entfernen.
        </Text>
      ) : karte.gast.geloescht ? (
        <Text variant="bodySm" tone="muted" style={{ fontSize: 13 }}>
          Die Daten dieses Gastes sind bereits gelöscht. Karte und Verlauf bleiben als Nachweis
          des Betriebs stehen.
        </Text>
      ) : loeschenOffen ? (
        <Card padding={theme.spacing.lg} style={{ gap: theme.spacing.md }}>
          <Eyebrow color={theme.colors.destructive}>Daten dieses Gastes löschen</Eyebrow>
          <Text variant="body" tone="secondary" style={{ fontSize: 14.5 }}>
            Name, Telefon und E-Mail werden entfernt und lassen sich nicht wiederherstellen.
            Karte, Stempelstand und Verlauf bleiben - sie sind dein Nachweis, kein Personendatum
            mehr. Auch die Wallet-Anmeldungen der Geräte dieses Gastes werden gelöscht.
          </Text>
          <PillButton
            label={laeuft === "anonym" ? "Wird gelöscht …" : "Daten endgültig löschen"}
            disabled={laeuft !== null}
            onPress={() => void anonymisieren()}
            style={{ backgroundColor: theme.colors.destructive }}
            labelColor="#FFFFFF"
          />
          <PillButton
            label="Abbrechen"
            variant="ghost"
            disabled={laeuft !== null}
            onPress={() => setLoeschenOffen(false)}
          />
        </Card>
      ) : (
        <PillButton
          label="Daten dieses Gastes löschen"
          variant="outline"
          disabled={laeuft !== null}
          onPress={() => setLoeschenOffen(true)}
        />
      )}
    </Rahmen>
  );
}

function Rahmen({ children }: { children?: React.ReactNode }) {
  const theme = useTheme();
  return (
    <Screen contentStyle={{ gap: theme.spacing.lg }} animated="subtle">
      <NavHeader title="Karte" fallback="/stempelkarte" />
      {children}
    </Screen>
  );
}

function Zeile({ label, wert }: { label: string; wert: string }) {
  return (
    <View style={{ flexDirection: "row", justifyContent: "space-between", gap: 12 }}>
      <Text variant="bodySm" tone="muted" style={{ fontSize: 13 }}>
        {label}
      </Text>
      <Text variant="bodySm" style={{ fontSize: 13, flexShrink: 1, textAlign: "right" }}>
        {wert}
      </Text>
    </View>
  );
}
