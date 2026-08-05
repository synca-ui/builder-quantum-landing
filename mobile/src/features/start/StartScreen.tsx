import { useCallback, useState } from "react";
import { ActivityIndicator, ScrollView, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { ApiError, api, type DailyTask } from "@maitr/core";

import { Card } from "../../components/ui/Card";
import { CheckIcon } from "../../components/icons";
import { Screen } from "../../components/ui/Screen";
import { SwipeToDelete } from "../../components/ui/SwipeToDelete";
import { Eyebrow } from "../../components/ui/Eyebrow";
import { Text } from "../../components/ui/Text";
import { useAppearance } from "../../lib/appearance";
import { computeProfileScore } from "../growth/profileScore";
import { useStore } from "../../lib/store";
import { useToast } from "../../lib/toast";
import { useTheme } from "../../theme";
import { EveningScreen } from "./EveningScreen";
import { GreetingHeader } from "./components/GreetingHeader";
import { StatRow } from "./components/StatRow";
import { CompactTaskCard, ReviewTaskCard } from "./components/TaskCard";
import { DoneRow } from "./components/DoneRow";
import { PendingRow } from "./components/PendingRow";
import { useDailyBriefing } from "./useDailyBriefing";
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
  const { taskDone, completeTask, unreadCount, profileDone, venueId } = useStore();
  const { briefing, source } = useDailyBriefing(venueId);
  const pending = usePendingCommit();
  // Per Wisch entfernte Aufgaben (Session): fallen aus der Liste UND aus dem Zähler.
  const [dismissed, setDismissed] = useState<Record<string, boolean>>({});
  // Freigabe liegt gerade beim Server. Die Aufgabe bleibt dabei sichtbar - siehe
  // `approve()` weiter unten.
  const [approving, setApproving] = useState<Record<string, boolean>>({});
  // Fehlgeschlagene Freigaben: Kennung → Klartext unter der Karte.
  const [approveFailed, setApproveFailed] = useState<Record<string, string>>({});

  // Die „Score"-Kachel zeigt denselben Live-Wert wie der Profil-Check-Ring.
  const liveStats = { ...briefing.stats, score: computeProfileScore(profileDone) };

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
   * „Veröffentlicht · 9:41" in die Historie.
   */
  const approve = useCallback(
    (task: DailyTask): Promise<void> => {
      if (source !== "api") {
        completeTask(task.id);
        return Promise.resolve();
      }

      setApproving((a) => ({ ...a, [task.id]: true }));
      setApproveFailed((f) => {
        if (!f[task.id]) return f;
        const next = { ...f };
        delete next[task.id];
        return next;
      });

      return api.briefing
        .approveTask(task.id)
        .then(() => {
          // Erst jetzt aus der Liste nehmen. Der Server hat bestätigt; das nächste
          // Briefing liefert die Aufgabe ohnehin nicht mehr aus.
          completeTask(task.id);
        })
        .catch((err: unknown) => {
          setApproveFailed((f) => ({ ...f, [task.id]: approveFehlerText(err) }));
          toast.show("Freigabe fehlgeschlagen");
          // Weiterwerfen: `usePendingCommit` darf daraus keinen Historieneintrag machen.
          throw err;
        })
        .finally(() => {
          setApproving((a) => {
            const next = { ...a };
            delete next[task.id];
            return next;
          });
        });
    },
    [source, completeTask, toast],
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
        label: isPublic ? `Antwort an ${who} geht raus` : "Beitrag wird eingeplant",
        durationMs,
        commit: () => approve(task),
      });
    },
    [pending, approve, router, theme.accessible],
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
      pending.start({
        taskId: task.id,
        kind: "delete",
        label: "Aufgabe wird gelöscht",
        durationMs: theme.accessible ? 15000 : 7000,
        commit: () => setDismissed((d) => ({ ...d, [task.id]: true })),
      });
    },
    [pending, theme.accessible],
  );

  // Nachtbar an heißt: Abendfassung statt Tagesbriefing (Screen 16). Der Zweig steht
  // hinter allen Hooks - eine frühere Rückkehr würde deren Aufrufreihenfolge brechen.
  if (nightMode) return <EveningScreen />;

  const openTasks = briefing.tasks.filter((task) => !taskDone[task.id] && !dismissed[task.id]);
  const totalTasks = briefing.tasks.filter((task) => !dismissed[task.id]).length;
  // Eine laufende Aktion zählt sofort mit - außer Löschen (das entfernt, erledigt nicht).
  const pendingCountsDone = pending.pending != null && pending.pending.kind !== "delete";
  // Aufgaben, deren Freigabe beim Server liegt, stehen noch in `openTasks` (mit Absicht -
  // sie sollen sichtbar bleiben). Für den Fortschritt zählen sie trotzdem schon mit,
  // sonst fiele der Balken zwischen Rücknahmefrist und Serverantwort zurück.
  const approvingCount = openTasks.filter((task) => approving[task.id]).length;
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
        dateLabel={formatDateLabel(briefing.now, briefing.venue.timezone)}
        greeting={briefing.greeting}
        venueName={briefing.venue.name}
        subline={briefing.subline}
        unread={unreadCount}
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
      {!allDone ? <ProgressHeader done={doneTasks} total={totalTasks} /> : null}

      <View style={{ flex: 1 }}>
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ gap: 7, paddingBottom: contentBottom }}
        >
          {allDone ? (
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
              if (approving[task.id]) {
                return <ApprovingRow key={task.id} label="Freigabe läuft" />;
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
                  <SwipeToDelete onDelete={() => startDelete(task)}>{card}</SwipeToDelete>
                  {approveFailed[task.id] ? (
                    // Die Karte steht noch, weil nichts passiert ist. Der Grund gehört
                    // direkt darunter - der Toast ist da längst wieder weg.
                    <Eyebrow color={theme.colors.destructive} style={styles.failNote}>
                      {approveFailed[task.id]}
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
                  <DoneRow key={`${entry.taskId}-${entry.time}`} label="Gelöscht" time={entry.time} muted />
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

          {source === "fixture" ? (
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

/**
 * Zeile, während die Freigabe beim Server liegt.
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

/** „Mittwoch, 16. Juli" - Wochentag und Datum ohne Jahr, wie im Design. */
function formatDateLabel(iso: string, timeZone: string): string {
  return new Date(iso).toLocaleDateString("de-DE", {
    weekday: "long",
    day: "numeric",
    month: "long",
    timeZone,
  });
}
