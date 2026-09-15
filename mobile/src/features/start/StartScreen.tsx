import { useCallback, useEffect, useRef, useState } from "react";
import { ActivityIndicator, ScrollView, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { ApiError, api, type DailyTask, type PresenceStats, type VenuePresence } from "@maitr/core";

import { Card } from "../../components/ui/Card";
import { CheckIcon } from "../../components/icons";
import { EmptyState } from "../../components/ui/EmptyState";
import { PillButton } from "../../components/ui/PillButton";
import { Screen } from "../../components/ui/Screen";
import { SwipeToDelete } from "../../components/ui/SwipeToDelete";
import { Eyebrow } from "../../components/ui/Eyebrow";
import { Text } from "../../components/ui/Text";
import { useAppearance } from "../../lib/appearance";
import { computeProfileScore } from "../growth/profileScore";
import { useStore } from "../../lib/store";
import { useToast } from "../../lib/toast";
import { useTheme } from "../../theme";
import { begruessung } from "../inbox/echterPosteingang";
import { usePosteingang } from "../inbox/usePosteingang";
import { EveningScreen } from "./EveningScreen";
import { GreetingHeader } from "./components/GreetingHeader";
import { StatRow } from "./components/StatRow";
import { CompactTaskCard, ReviewTaskCard } from "./components/TaskCard";
import { DoneRow } from "./components/DoneRow";
import { PendingRow } from "./components/PendingRow";
import { aufgabeErledigt, startAufgaben } from "./startAufgaben";
import { useDailyBriefing, type BriefingSource } from "./useDailyBriefing";
import { usePendingCommit } from "./usePendingCommit";

/**
 * Screen 04 · Start · „Guten Morgen".
 *
 * Der Einstieg der App: Tagesbriefing mit drei Entscheidungen. Der feste Kopf
 * (Begrüßung + Kennzahlen) bleibt stehen; gescrollt wird nur die Aufgabenliste.
 * Öffentliche/verbindliche Aktionen gehen verzögert raus (siehe `usePendingCommit`).
 */
export function StartScreen() {
  const theme = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const toast = useToast();
  const { nightMode, toggleNightMode } = useAppearance();
  const {
    taskDone,
    completeTask,
    profileDone,
    venueId,
    venueProfile,
    praesenz,
    hasRealVenue,
    showcase,
    briefingVersion,
  } = useStore();
  const echterBetrieb = hasRealVenue && !showcase;
  const { briefing, source, loading: briefingLaedt, refresh: briefingNeuLaden } = useDailyBriefing(venueId);
  // Glocke: für den echten Betrieb offene Anfragen, Präsenz-Warnungen und neue
  // Bewertungen - nicht mehr die fünf Seed-Einträge des Demo-Cafés.
  const posteingang = usePosteingang();
  const pending = usePendingCommit();
  // Per Wisch entfernte Aufgaben (Session): fallen aus der Liste UND aus dem Zähler.
  const [dismissed, setDismissed] = useState<Record<string, boolean>>({});
  // Vom Server bestätigte Freigaben (Session): NICHT ins gespeicherte `taskDone` -
  // der Server legt Daueraufgaben nach sieben Tagen wieder vor (siehe
  // `aufgabeErledigt` in startAufgaben.ts).
  const [freigegeben, setFreigegeben] = useState<Record<string, boolean>>({});
  // Entscheidung liegt gerade beim Server (Freigabe oder Ausblenden). Die Aufgabe
  // bleibt dabei sichtbar - siehe `approve()` weiter unten.
  const [amServer, setAmServer] = useState<Record<string, ServerAktion>>({});
  // Fehlgeschlagene Serverentscheidungen: Kennung → Klartext unter der Karte.
  const [serverFehler, setServerFehler] = useState<Record<string, string>>({});
  // Vom Server bestätigte Entscheidungen - für die Historie. Eine Freigabe dort
  // veröffentlicht nichts (siehe `REOPEN_AFTER_MS` in server/maitr/briefing.ts),
  // die Zeile darf deshalb nicht „Veröffentlicht" sagen.
  const [serverEntschieden, setServerEntschieden] = useState<Record<string, boolean>>({});

  const liveStats = kennzahlen({
    echterBetrieb,
    source,
    briefingStats: briefing.stats,
    praesenz,
    profileDone,
  });

  /*
   * Nach einem Präsenz-Abruf das Briefing nachladen.
   *
   * Der Server hält das Briefing 15 Minuten im Cache; ein echter Abruf (Google +
   * Website) verwirft ihn. Die App erfährt davon nur über ein neues `fetchedAt` im
   * Store - ohne dieses Nachladen stünde auf Start bis zu 15 Minuten der alte Score,
   * während der Profil-Check schon den neuen zeigt.
   *
   * Der Stand wird dreiwertig verglichen: `null` = keine Präsenz bekannt,
   * `"ausstehend"` = Präsenz da, aber nie abgerufen, sonst der Zeitstempel. Ein
   * Wechsel auf `null` oder `"ausstehend"` lädt nie nach - dahinter steht kein Abruf,
   * der den Servercache verworfen haben könnte.
   *
   * Zwei Fälle laden nach:
   * - Wechsel AUS einem bekannten Stand auf einen neuen Zeitstempel: Der Server hat
   *   neu abgerufen. Nachgeladen wird, wenn das Briefing vom Server kommt oder gerade
   *   unterwegs ist (eine Anfrage, die vor dem Abruf losging, kann noch den alten
   *   Cache treffen; `refresh()` bricht sie ab und stellt sie neu).
   * - Übergang aus `null` auf einen Zeitstempel, wenn das Briefing schon FERTIG vom
   *   Server geladen ist. Das ist der Rettungsweg nach einem gescheiterten ersten
   *   Präsenz-Abruf („Erneut versuchen" im Profil-Check): Ohne Nachladen bliebe Start
   *   dauerhaft beim alten Score, weil `useDailyBriefing` nie von selbst neu fragt.
   *   Lädt das Briefing dagegen noch (Anmeldung, Gerätespeicher, erster Abruf), bleibt
   *   es beim laufenden Aufruf - ein zweiter wäre doppelt. Trifft die Präsenz erst nach
   *   dem Briefing ein, kostet das höchstens einen zusätzlichen Briefing-Request.
   *
   * Kam das Briefing aus der Fixture, zeigen die Kacheln die Präsenz ohnehin direkt
   * (siehe `kennzahlen`) - dort lädt keiner der beiden Fälle nach.
   *
   * Die Referenz startet mit dem Stand beim ersten Render: Wer Start öffnet, während
   * die Präsenz schon da ist, löst kein Nachladen aus. Schleifen gibt es keine,
   * weil `briefingNeuLaden()` den Präsenzstand nicht berührt und die Referenz vor
   * jeder Entscheidung nachgezogen wird - ein Folgelauf des Effekts (durch `source`
   * oder `briefingLaedt`) sieht keinen Wechsel mehr.
   */
  const praesenzStand = praesenz ? (praesenz.fetchedAt ?? "ausstehend") : null;
  const zuletztGesehenerStand = useRef(praesenzStand);
  useEffect(() => {
    const vorher = zuletztGesehenerStand.current;
    if (vorher === praesenzStand) return;
    zuletztGesehenerStand.current = praesenzStand;
    if (praesenzStand === null || praesenzStand === "ausstehend") return;
    if (vorher === null) {
      // Erster bekannter Stand: nur nachladen, wenn das Briefing schon fertig vom
      // Server da ist - ein laufender Aufruf holt ihn ohnehin.
      if (source === "api" && !briefingLaedt) briefingNeuLaden();
      return;
    }
    if (source !== "api" && !briefingLaedt) return;
    briefingNeuLaden();
  }, [praesenzStand, source, briefingLaedt, briefingNeuLaden]);

  /*
   * Nach „Profil gespeichert" das Briefing nachladen.
   *
   * Anlass (Prüfer-Befund 25, 15.09.): Der Effekt darüber reagiert nur auf ein neues
   * `fetchedAt`. Speichert der Wirt sein Profil binnen zehn Minuten nach dem letzten
   * Präsenzabruf, liefert der gedrosselte Abruf den Bericht zwar neu gerechnet, aber
   * mit altem `fetchedAt` - Start blieb dann für die ganze Sitzung bei „Beschreibung
   * ergänzen" und dem alten Score. Der Profil-Screen zählt deshalb nach der
   * Serverbestätigung `briefingVersion` hoch. Die Referenz startet mit dem Stand beim
   * ersten Render: Wer Start später öffnet, lädt ohnehin frisch.
   */
  const gesehenerBriefingStand = useRef(briefingVersion);
  useEffect(() => {
    if (gesehenerBriefingStand.current === briefingVersion) return;
    gesehenerBriefingStand.current = briefingVersion;
    if (echterBetrieb) briefingNeuLaden();
  }, [briefingVersion, echterBetrieb, briefingNeuLaden]);

  /**
   * Die Freigabe wirklich vollziehen - nach Ablauf der Rücknahmefrist.
   *
   * Zwei Wege, und `source` entscheidet welcher. `source === "api"` heißt: Das
   * Briefing kam vom Server, die Kennungen in `briefing.tasks` sind seine. Nur dann
   * gibt es serverseitig etwas freizugeben. Kam das Briefing aus der Fixture
   * (Demomodus, kein Netz, 401), kennt der Server die Kennung `task_review_marion`
   * nicht - ein Aufruf könnte nur mit 404 enden. Dort bleibt es beim lokalen Häkchen,
   * genau wie bisher.
   *
   * Der Ablauf im Serverfall ist bewusst „sichtbar hängen" statt „still verschwinden":
   * Die Aufgabe bleibt in der Liste und zeigt einen Spinner, bis der Server bestätigt
   * hat. Erst dann verschwindet sie. Scheitert der Aufruf, steht die Karte noch da,
   * mit einer Zeile darunter, was schiefging - eine Aufgabe, die scheinbar erledigt
   * ist und morgen wieder auftaucht, wäre der teurere Fehler.
   *
   * Das zurückgegebene Promise liest `usePendingCommit`: Nur bei Erfolg schreibt es
   * „Freigegeben · 9:41" (Demo: „Veröffentlicht · 9:41") in die Historie.
   */
  const approve = useCallback(
    (task: DailyTask): Promise<void> => {
      if (source !== "api") {
        completeTask(task.id);
        return Promise.resolve();
      }

      setAmServer((a) => ({ ...a, [task.id]: "freigabe" }));
      setServerFehler((f) => ohne(f, task.id));

      // Die Betriebskennung geht mit: Bei mehr als einem Betrieb je Konto
      // (jede veröffentlichte Web-App mit neuem Namen legt einen an) lehnt der
      // Server einen Aufruf ohne Kennung mit 400 ab - der grüne Knopf wäre tot.
      return api.briefing
        .approveTask(task.id, venueId)
        .then(() => {
          // Erst jetzt aus der Liste nehmen. Der Server hat bestätigt; das nächste
          // Briefing liefert die Aufgabe bis zur Wiedervorlage nicht mehr aus. Nur für
          // diese Sitzung ausblenden, nicht über `completeTask` speichern - sonst bliebe
          // sie auch nach der Wiedervorlage für immer weg (Prüfer-Befund 26).
          setServerEntschieden((e) => ({ ...e, [task.id]: true }));
          setFreigegeben((f) => ({ ...f, [task.id]: true }));
        })
        .catch((err: unknown) => {
          setServerFehler((f) => ({ ...f, [task.id]: approveFehlerText(err) }));
          toast.show("Freigabe fehlgeschlagen");
          // Weiterwerfen: `usePendingCommit` darf daraus keinen Historieneintrag machen.
          throw err;
        })
        .finally(() => {
          setAmServer((a) => ohne(a, task.id));
        });
    },
    // `venueId` gehört dazu: Wechselt der Betrieb, bleibt `source` oft "api" - ohne
    // die Abhängigkeit ginge die Freigabe mit der Kennung des vorigen Betriebs raus.
    [source, venueId, completeTask, toast],
  );

  /**
   * Wegwischen wirklich vollziehen - nach Ablauf der Rücknahmefrist.
   *
   * Dieselbe Weiche wie `approve`: Serveraufgaben (`source === "api"`) gehen als
   * Verwerfen an den Server, sonst kämen sie mit dem nächsten Briefing einfach
   * wieder (Integrationsprüfung, Punkt 15). Fixture-Aufgaben kennt der Server
   * nicht - dort bleibt es beim lokalen Ausblenden, genau wie bisher.
   *
   * Auch hier „sichtbar hängen": Die Karte bleibt mit Spinner stehen, bis der
   * Server bestätigt; scheitert es, steht der Grund darunter und die Historie
   * schreibt nichts.
   */
  const verwerfen = useCallback(
    (task: DailyTask): Promise<void> => {
      if (source !== "api") {
        setDismissed((d) => ({ ...d, [task.id]: true }));
        return Promise.resolve();
      }

      setAmServer((a) => ({ ...a, [task.id]: "verwerfen" }));
      setServerFehler((f) => ohne(f, task.id));

      return api.briefing
        .dismissTask(task.id, venueId)
        .then(() => {
          setServerEntschieden((e) => ({ ...e, [task.id]: true }));
          setDismissed((d) => ({ ...d, [task.id]: true }));
        })
        .catch((err: unknown) => {
          setServerFehler((f) => ({ ...f, [task.id]: `Nicht ausgeblendet. ${approveFehlerText(err)}` }));
          toast.show("Ausblenden fehlgeschlagen");
          throw err;
        })
        .finally(() => {
          setAmServer((a) => ohne(a, task.id));
        });
    },
    [source, venueId, toast],
  );

  const handlePrimary = useCallback(
    (task: DailyTask) => {
      // Profil-Aufgaben öffnen einen Editor - kein Senden, keine Warteschlange.
      if (task.kind === "profile") {
        router.push(task.id === "task_profile_menu" ? "/speisekarte" : "/profil-check");
        return;
      }
      // Verzögertes Senden: „Freigeben" ist öffentlich (7 s), „Einplanen" intern (5 s),
      // im Barrierefrei-Modus 15 s (Zeitdruck ist dort eine Barriere).
      const isPublic = task.kind === "review";
      const durationMs = theme.accessible ? 15000 : isPublic ? 7000 : 5000;
      const who = task.title.split(" ")[0];
      pending.start({
        taskId: task.id,
        kind: task.kind,
        // Serveraufgaben: Die Freigabe hält nur die Entscheidung fest - es geht
        // keine Antwort raus und nichts wird eingeplant. Außerdem beginnen ihre
        // Titel nicht mit einem Namen („5★-Bewertung - …").
        label:
          source === "api"
            ? "Wird freigegeben"
            : isPublic
              ? `Antwort an ${who} geht raus`
              : "Beitrag wird eingeplant",
        durationMs,
        commit: () => approve(task),
      });
    },
    [pending, approve, router, theme.accessible, source],
  );

  const handleSecondary = useCallback(
    (task: DailyTask) => {
      router.push({ pathname: "/aufgabe/[id]", params: { id: task.id } });
    },
    [router],
  );

  const startDelete = useCallback(
    (task: DailyTask) => {
      // Löschen läuft durch dieselbe Warteschlange: 7 s Rückgängig, dann wirklich weg.
      // Serveraufgaben heißen „ausblenden": Daueraufgaben kommen nach sieben Tagen
      // wieder, solange ihr Anlass besteht - „gelöscht" wäre zu viel versprochen.
      pending.start({
        taskId: task.id,
        kind: "delete",
        label: source === "api" ? "Aufgabe wird ausgeblendet" : "Aufgabe wird gelöscht",
        durationMs: theme.accessible ? 15000 : 7000,
        commit: () => verwerfen(task),
      });
    },
    [pending, theme.accessible, source, verwerfen],
  );

  // Nachtbar an heißt: Abendfassung statt Tagesbriefing (Screen 16). Der Zweig steht
  // hinter allen Hooks - eine frühere Rückkehr würde deren Aufrufreihenfolge brechen.
  if (nightMode) return <EveningScreen />;

  /*
   * Für einen echten Betrieb gilt nur ein Briefing vom Server. Solange es lädt oder
   * wenn es scheitert, liefert `useDailyBriefing` die Fixture - Marion, die
   * Zimtschnecken, das Café Goldstück am 16. Juli 2025. Die gehören nicht in den
   * Start eines echten Wirts: Kopf aus seinem Profil, statt Karten ein Lade- bzw.
   * Fehlerzustand. Demo und Showcase zeigen die Fixture wie bisher.
   */
  const briefingDa = !echterBetrieb || source === "api";
  // Echter Betrieb: dieselbe Filterung wie im Wachstum - keine „N € Provision
  // gespart", keine Wirkungszahlen ohne Grundlage (siehe `startAufgaben`).
  const aufgaben = briefingDa ? startAufgaben(briefing, echterBetrieb) : [];
  const kopf = briefingDa
    ? {
        dateLabel: formatDateLabel(briefing.now, briefing.venue.timezone),
        greeting: briefing.greeting,
        venueName: briefing.venue.name,
        subline: briefing.subline,
      }
    : {
        dateLabel: formatDateLabel(new Date().toISOString(), "Europe/Berlin"),
        greeting: begruessung(Date.now()),
        venueName: venueProfile.name,
        subline: briefingLaedt
          ? "Dein Tagesbriefing wird geladen."
          : "Deine Entscheidungen für heute ließen sich gerade nicht laden.",
      };

  const openTasks = aufgaben.filter(
    (task) =>
      !aufgabeErledigt(task.id, { source, taskDone, sitzungErledigt: freigegeben }) && !dismissed[task.id],
  );
  const totalTasks = aufgaben.filter((task) => !dismissed[task.id]).length;
  // Eine laufende Aktion zählt sofort mit - außer Löschen (das entfernt, erledigt nicht).
  const pendingCountsDone = pending.pending != null && pending.pending.kind !== "delete";
  // Aufgaben, deren Freigabe beim Server liegt, stehen noch in `openTasks` (mit Absicht -
  // sie sollen sichtbar bleiben). Für den Fortschritt zählen sie trotzdem schon mit,
  // sonst fiele der Balken zwischen Rücknahmefrist und Serverantwort zurück. Ein
  // laufendes Ausblenden zählt nicht - wie Löschen entfernt es, erledigt aber nichts.
  const approvingCount = openTasks.filter((task) => amServer[task.id] === "freigabe").length;
  const doneTasks = totalTasks - openTasks.length + (pendingCountsDone ? 1 : 0) + approvingCount;
  const allDone = openTasks.length === 0;

  // ~28 px Puffer zwischen letzter Karte und der schwebenden Tabbar.
  const contentBottom = insets.bottom + 92;

  return (
    // surface="canvas": gleicher Hintergrund wie die übrigen Tab-Screens (Wachstum etc.).
    // scroll={false} + paddingBottom:0: der Kopf steht fest, die Liste füllt bis zur
    // Tabbar (Clearance liegt im Scroll-Inhalt, nicht am äußeren Container → kein toter Raum).
    <Screen surface="canvas" scroll={false} contentStyle={{ paddingBottom: 0 }}>
      <GreetingHeader
        dateLabel={kopf.dateLabel}
        greeting={kopf.greeting}
        venueName={kopf.venueName}
        subline={kopf.subline}
        unread={posteingang.ungelesen}
        onOpenInbox={() => router.push("/inbox")}
        onToggleNightMode={toggleNightMode}
      />

      {/* Kennzahlen etwas näher an den Untertitel (22 px oben, 24 px unten → HEUTE). */}
      <View style={{ marginTop: 22, marginBottom: 24 }}>
        <StatRow
          stats={liveStats}
          onRating={() => router.push("/bewertungen")}
          onScore={() => router.push("/profil-check")}
          onImpressions={() => router.push("/wachstum")}
        />
      </View>

      {/* HEUTE steht fest im Kopf - nur die Karten darunter scrollen. */}
      {briefingDa && !allDone ? <ProgressHeader done={doneTasks} total={totalTasks} /> : null}

      <View style={{ flex: 1 }}>
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ gap: 7, paddingBottom: contentBottom }}
        >
          {!briefingDa ? (
            briefingLaedt ? (
              <BriefingLaedt />
            ) : (
              <View style={{ gap: theme.spacing.md }}>
                <EmptyState
                  title="Tagesbriefing gerade nicht abrufbar"
                  message="Deine Aufgaben für heute ließen sich nicht laden. Sie sind nicht weg - Maitr kam nur gerade nicht an sie heran."
                />
                <PillButton label="Erneut versuchen" onPress={briefingNeuLaden} />
              </View>
            )
          ) : allDone ? (
            <AllClear />
          ) : (
            openTasks.map((task) => {
              if (pending.pending?.taskId === task.id) {
                return (
                  <PendingRow
                    key={task.id}
                    label={pending.pending.label}
                    durationMs={pending.pending.durationMs}
                    onUndo={pending.undo}
                  />
                );
              }
              // Rücknahmefrist vorbei, Server antwortet noch: sichtbar hängen statt
              // still verschwinden. Kein „Rückgängig" mehr - die Freigabe ist raus.
              if (amServer[task.id]) {
                return (
                  <ApprovingRow
                    key={task.id}
                    label={amServer[task.id] === "verwerfen" ? "Wird ausgeblendet" : "Freigabe läuft"}
                  />
                );
              }
              const card =
                task.kind === "review" ? (
                  <ReviewTaskCard task={task} onPrimary={handlePrimary} onSecondary={handleSecondary} />
                ) : (
                  // Nur die oberste (Bewertungs-)Karte trägt Petrol; die übrigen sind Outline.
                  <CompactTaskCard task={task} variant="outline" onPrimary={handlePrimary} />
                );
              return (
                <View key={task.id}>
                  {/* Nach links wischen → Löschen mit 7-s-Rückgängig (siehe startDelete). */}
                  <SwipeToDelete
                    onDelete={() => startDelete(task)}
                    label={source === "api" ? "Ausblenden" : "Löschen"}
                  >
                    {card}
                  </SwipeToDelete>
                  {serverFehler[task.id] ? (
                    // Die Karte steht noch, weil nichts passiert ist. Der Grund gehört
                    // direkt darunter - der Toast ist da längst wieder weg.
                    <Eyebrow color={theme.colors.destructive} style={styles.failNote}>
                      {serverFehler[task.id]}
                    </Eyebrow>
                  ) : null}
                </View>
              );
            })
          )}

          {pending.history.length > 0 ? (
            <View style={{ marginTop: theme.spacing.md, gap: 7 }}>
              <Eyebrow tone="faint" style={{ marginBottom: 2 }}>
                Erledigt heute
              </Eyebrow>
              {pending.history.map((entry) =>
                entry.kind === "delete" ? (
                  // Gelöschtes wandert ausgegraut in die Historie.
                  <DoneRow
                    key={`${entry.taskId}-${entry.time}`}
                    label={serverEntschieden[entry.taskId] ? "Ausgeblendet" : "Gelöscht"}
                    time={entry.time}
                    muted
                  />
                ) : serverEntschieden[entry.taskId] ? (
                  // Serverfreigabe: festgehalten, nicht veröffentlicht. Kein
                  // „Bearbeiten" - freigegeben ist freigegeben, und der Editor kennt
                  // nur die öffentlichen Google-Bewertungen, nicht diese Aufgabe.
                  <DoneRow
                    key={`${entry.taskId}-${entry.time}`}
                    label="Freigegeben"
                    time={entry.time}
                    actionLabel={entry.kind === "review" ? "Ansehen" : undefined}
                    onAction={entry.kind === "review" ? () => router.push("/bewertungen") : undefined}
                  />
                ) : (
                  <DoneRow
                    key={`${entry.taskId}-${entry.time}`}
                    label="Veröffentlicht"
                    time={entry.time}
                    actionLabel={entry.kind === "review" ? "Bearbeiten" : "Ansehen"}
                    onAction={() =>
                      entry.kind === "review"
                        ? router.push({ pathname: "/aufgabe/[id]", params: { id: entry.taskId } })
                        : router.push("/beitraege")
                    }
                  />
                ),
              )}
            </View>
          ) : null}

          {/* Ab dem ersten Bild, wie vor der Integrationsprüfung: Demo und Showcase
              zeigen die Beispielkarten sofort, also gehört auch ihr Hinweis sofort
              dazu - das Warten auf den Abruf ließ ihn bis zu dessen Ende (ohne Antwort
              bis zum Timeout) fehlen. Nie für einen echten Betrieb - dort zeigt der
              Start keine Beispieldaten. */}
          {!echterBetrieb && source === "fixture" ? (
            <Eyebrow tone="faint" style={{ marginTop: theme.spacing.md, textAlign: "center" }}>
              Beispieldaten · API nicht verbunden
            </Eyebrow>
          ) : null}
        </ScrollView>

        {/* Weicher Fade am unteren Rand: die nächste Karte scheint durch, statt hart
            abzuschneiden - Andeutung „da wartet noch etwas". */}
        <LinearGradient
          pointerEvents="none"
          colors={["transparent", theme.colors.canvas]}
          style={{
            position: "absolute",
            left: -theme.spacing.screen,
            right: -theme.spacing.screen,
            bottom: 0,
            height: contentBottom,
          }}
        />
      </View>
    </Screen>
  );
}

/**
 * Fortschritt in einer Zeile: Label links, drei kurze Segmente rechts, die sich einzeln
 * füllen - passt zu „drei Entscheidungen" und feiert jeden Schritt. Kein durchgehender
 * Balken, der bei 0 % wie ein Divider aussieht.
 */
function ProgressHeader({ done, total }: { done: number; total: number }) {
  const theme = useTheme();
  return (
    <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: theme.spacing.md }}>
      <Eyebrow>
        Heute · {total} {total === 1 ? "Entscheidung" : "Entscheidungen"}
      </Eyebrow>
      <View style={{ flexDirection: "row", gap: 5 }}>
        {Array.from({ length: total }).map((_, i) => (
          <View
            key={i}
            style={{
              width: 16,
              height: 4,
              borderRadius: 2,
              backgroundColor: i < done ? theme.colors.success : theme.colors.trackInactive,
            }}
          />
        ))}
      </View>
    </View>
  );
}

/** Echter Betrieb, Briefing unterwegs - ein Spinner statt der Fixture-Karten. */
function BriefingLaedt() {
  const theme = useTheme();
  return (
    <Card
      emphasis="subtle"
      padding={theme.spacing.xxl}
      style={{ alignItems: "center", gap: theme.spacing.md, borderRadius: 18 }}
    >
      <ActivityIndicator size="small" color={theme.colors.textMuted} />
      <Text variant="bodySm" tone="secondary" style={{ textAlign: "center", fontSize: 14 }}>
        Tagesbriefing wird geladen …
      </Text>
    </Card>
  );
}

type ServerAktion = "freigabe" | "verwerfen";

/** Kopie ohne `id` - dieselbe Referenz, wenn nichts zu entfernen ist (spart Renders). */
function ohne<T>(eintraege: Record<string, T>, id: string): Record<string, T> {
  if (!(id in eintraege)) return eintraege;
  const next = { ...eintraege };
  delete next[id];
  return next;
}

/**
 * Zeile, während eine Entscheidung (Freigabe oder Ausblenden) beim Server liegt.
 *
 * Bewusst dieselbe schmale Form wie `PendingRow`, aber ohne Ring und ohne
 * „Rückgängig": Die Frist ist abgelaufen, zurückzunehmen gibt es nichts mehr. Der
 * Spinner sagt, dass die Aufgabe nicht vergessen wurde, sondern wartet.
 */
function ApprovingRow({ label }: { label: string }) {
  const theme = useTheme();
  return (
    <Card emphasis="subtle" padding={0} style={styles.approvingRow}>
      <ActivityIndicator size="small" color={theme.colors.textMuted} />
      <Text variant="bodySm" tone="secondary" style={styles.approvingLabel} numberOfLines={1}>
        {label}
      </Text>
    </Card>
  );
}

/**
 * Aus einem Fehler eine Zeile machen, die jemandem hinter der Theke etwas sagt.
 *
 * Der Text aus `ApiError.message` kommt vom Server (`{ error: "…" }`) und ist auf
 * Deutsch formuliert - den zeigen wir. Nur bei den Statuscodes, deren Serverwortlaut
 * technisch bleibt, setzen wir eine eigene Zeile davor.
 */
function approveFehlerText(err: unknown): string {
  if (err instanceof ApiError) {
    if (err.status === 401 || err.status === 403) return "Nicht mehr angemeldet. Bitte neu anmelden.";
    if (err.status === 404) return "Diese Aufgabe gibt es nicht mehr.";
    return err.message;
  }
  return "Keine Verbindung. Die Aufgabe bleibt offen.";
}

/** Erscheint, wenn alle drei Entscheidungen des Tages getroffen sind. */
function AllClear() {
  const theme = useTheme();
  return (
    <Card
      emphasis="default"
      style={{ alignItems: "center", gap: theme.spacing.sm, paddingVertical: theme.spacing.xxl }}
    >
      <View
        style={{
          width: 56,
          height: 56,
          borderRadius: 28,
          backgroundColor: theme.colors.successSurface,
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <CheckIcon size={26} color={theme.colors.success} strokeWidth={2.4} />
      </View>
      <Text variant="cardTitle" style={{ textAlign: "center" }}>
        Du hast alles im Griff
        <Text variant="cardTitle" tone="accent">
          .
        </Text>
      </Text>
      <Text variant="bodySm" tone="secondary" style={{ textAlign: "center", fontSize: 14.5 }}>
        Maitr macht den Rest. Morgen früh warten die nächsten Entscheidungen.
      </Text>
    </Card>
  );
}

const styles = StyleSheet.create({
  approvingRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 15,
    paddingHorizontal: 18,
  },
  approvingLabel: { flex: 1, fontSize: 15 },
  failNote: { marginTop: 6, marginLeft: 4 },
});

/**
 * Welche Zahlen die drei Kacheln zeigen - drei Fälle, in dieser Reihenfolge.
 *
 * 1. Echter Betrieb, Briefing vom Server: `briefing.stats` unverändert. Der Server
 *    rechnet Score, Google-Schnitt, Anzahl und `impressionsKnown` bereits aus dem
 *    Präsenz-Snapshot - ein Überschreiben hier (früher: `computeProfileScore`)
 *    zeigte einem echten Wirt den Demo-Score 64.
 * 2. Echter Betrieb, Briefing gerade nicht erreichbar, Präsenz aber da: die Zahlen
 *    aus dem Präsenzbericht. Profilaufrufe kennt der Bericht nicht (ohne
 *    Google-Freigabe gibt es keine) - daher `impressionsKnown: false` und ein Strich
 *    statt der 4.812 aus der Fixture.
 * 3. Echter Betrieb ohne jede Antwort (Laden, kein Netz): Striche. Die Fixture
 *    (4,8 / 64 / 4.812) gehört dem Demo-Café, nicht diesem Betrieb.
 * 4. Sonst (Demomodus, Showcase): wie bisher die Fixture mit dem Live-Score des
 *    Profil-Checks, damit Kachel und Ring dort dieselbe Zahl zeigen.
 *
 * `echterBetrieb` steht vor `source`, weil der Vorführzustand unter keinen Umständen
 * kippen darf - auch nicht, falls der Server für die Demokennung einmal antwortet.
 */
function kennzahlen({
  echterBetrieb,
  source,
  briefingStats,
  praesenz,
  profileDone,
}: {
  echterBetrieb: boolean;
  source: BriefingSource;
  briefingStats: PresenceStats;
  praesenz: VenuePresence | null;
  profileDone: Record<string, boolean>;
}): PresenceStats {
  if (echterBetrieb && source === "api") return briefingStats;
  if (echterBetrieb && praesenz) {
    const { score, bewertungen, deckung } = praesenz.bericht;
    return {
      score,
      rating: bewertungen.schnitt ?? 0,
      reviewCount: bewertungen.anzahl,
      impressions: 0,
      impressionsKnown: false,
      ...(deckung.gemessen < 1 && deckung.hinweis ? { scoreHint: deckung.hinweis } : {}),
    };
  }
  if (echterBetrieb) return { rating: 0, score: Number.NaN, impressions: 0, impressionsKnown: false };
  return { ...briefingStats, score: computeProfileScore(profileDone) };
}

/** „Mittwoch, 16. Juli" - Wochentag und Datum ohne Jahr, wie im Design. */
function formatDateLabel(iso: string, timeZone: string): string {
  return new Date(iso).toLocaleDateString("de-DE", {
    weekday: "long",
    day: "numeric",
    month: "long",
    timeZone,
  });
}
