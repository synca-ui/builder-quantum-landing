import { useCallback, useState } from "react";
import { ScrollView, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import type { DailyTask } from "@maitr/core";

import { Card } from "../../components/ui/Card";
import { CheckIcon } from "../../components/icons";
import { Screen } from "../../components/ui/Screen";
import { SwipeToDelete } from "../../components/ui/SwipeToDelete";
import { Eyebrow } from "../../components/ui/Eyebrow";
import { Text } from "../../components/ui/Text";
import { useAppearance } from "../../lib/appearance";
import { useLang, useT, type Lang } from "../../lib/i18n";
import { computeProfileScore } from "../growth/profileScore";
import { useStore } from "../../lib/store";
import { useTheme } from "../../theme";
import { EveningScreen } from "./EveningScreen";
import { GreetingHeader } from "./components/GreetingHeader";
import { StatRow } from "./components/StatRow";
import { CompactTaskCard, ReviewTaskCard } from "./components/TaskCard";
import { DoneRow } from "./components/DoneRow";
import { PendingRow } from "./components/PendingRow";
import { useDailyBriefing } from "./useDailyBriefing";
import { usePendingCommit } from "./usePendingCommit";

/** Solange keine Betriebsauswahl existiert, arbeitet der Screen auf dem Demo-Betrieb. */
const VENUE_ID = "venue_goldstueck";

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
  const t = useT();
  const lang = useLang();
  const insets = useSafeAreaInsets();
  const { nightMode, toggleNightMode } = useAppearance();
  const { taskDone, completeTask, unreadCount, profileDone } = useStore();
  const { briefing } = useDailyBriefing(VENUE_ID);
  const pending = usePendingCommit();
  // Per Wisch entfernte Aufgaben (Session): fallen aus der Liste UND aus dem Zähler.
  const [dismissed, setDismissed] = useState<Record<string, boolean>>({});

  // Die „Score"-Kachel zeigt denselben Live-Wert wie der Profil-Check-Ring.
  const liveStats = { ...briefing.stats, score: computeProfileScore(profileDone) };

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
        label: isPublic
          ? t({ de: `Antwort an ${who} geht raus`, en: `Reply to ${who} is going out` })
          : t({ de: "Beitrag wird eingeplant", en: "Post is being scheduled" }),
        durationMs,
        commit: () => completeTask(task.id),
      });
    },
    [pending, completeTask, router, theme.accessible, t],
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
        label: t({ de: "Aufgabe wird gelöscht", en: "Task is being deleted" }),
        durationMs: theme.accessible ? 15000 : 7000,
        commit: () => setDismissed((d) => ({ ...d, [task.id]: true })),
      });
    },
    [pending, theme.accessible, t],
  );

  // Nachtbar an heißt: Abendfassung statt Tagesbriefing (Screen 16). Der Zweig steht
  // hinter allen Hooks - eine frühere Rückkehr würde deren Aufrufreihenfolge brechen.
  if (nightMode) return <EveningScreen />;

  const openTasks = briefing.tasks.filter((task) => !taskDone[task.id] && !dismissed[task.id]);
  const totalTasks = briefing.tasks.filter((task) => !dismissed[task.id]).length;
  // Eine laufende Aktion zählt sofort mit - außer Löschen (das entfernt, erledigt nicht).
  const pendingCountsDone = pending.pending != null && pending.pending.kind !== "delete";
  const doneTasks = totalTasks - openTasks.length + (pendingCountsDone ? 1 : 0);
  const allDone = openTasks.length === 0;

  // ~28 px Puffer zwischen letzter Karte und der schwebenden Tabbar.
  const contentBottom = insets.bottom + 92;

  return (
    // surface="canvas": gleicher Hintergrund wie die übrigen Tab-Screens (Wachstum etc.).
    // scroll={false} + paddingBottom:0: der Kopf steht fest, die Liste füllt bis zur
    // Tabbar (Clearance liegt im Scroll-Inhalt, nicht am äußeren Container → kein toter Raum).
    <Screen surface="canvas" scroll={false} contentStyle={{ paddingBottom: 0 }}>
      <GreetingHeader
        dateLabel={formatDateLabel(briefing.now, briefing.venue.timezone, lang)}
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
              const card =
                task.kind === "review" ? (
                  <ReviewTaskCard task={task} onPrimary={handlePrimary} onSecondary={handleSecondary} />
                ) : (
                  // Nur die oberste (Bewertungs-)Karte trägt Petrol; die übrigen sind Outline.
                  <CompactTaskCard task={task} variant="outline" onPrimary={handlePrimary} />
                );
              return (
                // Nach links wischen → Löschen mit 7-s-Rückgängig (siehe startDelete).
                <SwipeToDelete key={task.id} onDelete={() => startDelete(task)}>
                  {card}
                </SwipeToDelete>
              );
            })
          )}

          {pending.history.length > 0 ? (
            <View style={{ marginTop: theme.spacing.md, gap: 7 }}>
              <Eyebrow tone="faint" style={{ marginBottom: 2 }}>
                {t({ de: "Erledigt heute", en: "Done today" })}
              </Eyebrow>
              {pending.history.map((entry) =>
                entry.kind === "delete" ? (
                  // Gelöschtes wandert ausgegraut in die Historie.
                  <DoneRow key={`${entry.taskId}-${entry.time}`} label={t({ de: "Gelöscht", en: "Deleted" })} time={entry.time} muted />
                ) : (
                  <DoneRow
                    key={`${entry.taskId}-${entry.time}`}
                    label={t({ de: "Veröffentlicht", en: "Published" })}
                    time={entry.time}
                    actionLabel={entry.kind === "review" ? t({ de: "Bearbeiten", en: "Edit" }) : t({ de: "Ansehen", en: "View" })}
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
  const t = useT();
  return (
    <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: theme.spacing.md }}>
      <Eyebrow>
        {t({
          de: `Heute · ${total} ${total === 1 ? "Entscheidung" : "Entscheidungen"}`,
          en: `Today · ${total} ${total === 1 ? "decision" : "decisions"}`,
        })}
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

/** Erscheint, wenn alle drei Entscheidungen des Tages getroffen sind. */
function AllClear() {
  const theme = useTheme();
  const t = useT();
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
        {t({ de: "Du hast alles im Griff", en: "You're all caught up" })}
        <Text variant="cardTitle" tone="accent">
          .
        </Text>
      </Text>
      <Text variant="bodySm" tone="secondary" style={{ textAlign: "center", fontSize: 14.5 }}>
        {t({
          de: "Maitr macht den Rest. Morgen früh warten die nächsten Entscheidungen.",
          en: "Maitr handles the rest. Tomorrow morning the next decisions will be waiting.",
        })}
      </Text>
    </Card>
  );
}

/** „Mittwoch, 16. Juli" / „Wednesday, July 16" - Wochentag und Datum ohne Jahr. */
function formatDateLabel(iso: string, timeZone: string, lang: Lang): string {
  return new Date(iso).toLocaleDateString(lang === "en" ? "en-US" : "de-DE", {
    weekday: "long",
    day: "numeric",
    month: "long",
    timeZone,
  });
}
