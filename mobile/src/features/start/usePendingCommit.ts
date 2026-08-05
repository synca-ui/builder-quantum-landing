import { useCallback, useEffect, useRef, useState } from "react";
import { AppState } from "react-native";

export interface PendingAction {
  taskId: string;
  kind: string;
  /** Zeile während der Wartezeit, z. B. „Antwort an Marion geht raus". */
  label: string;
  durationMs: number;
  /**
   * Wird beim Ablauf (oder sofortigem Verbindlichmachen) ausgeführt.
   *
   * Darf ein Promise liefern. Das ist seit dem Anschluss an `api.briefing.approveTask`
   * nötig: Erst wenn der Server die Freigabe bestätigt hat, ist die Aktion wirklich
   * passiert. Ein abgelehntes Promise heißt „nicht passiert" - dann bleibt auch die
   * Zeile „Veröffentlicht · 9:41" aus, statt einen Erfolg zu behaupten, den es nicht gab.
   */
  commit: () => void | Promise<void>;
}

export interface HistoryEntry {
  taskId: string;
  kind: string;
  time: string; // „9:41"
}

function formatTime(d: Date): string {
  return `${d.getHours()}:${String(d.getMinutes()).padStart(2, "0")}`;
}

/**
 * Verzögertes Senden mit ehrlichem „Rückgängig": Eine Aktion geht erst nach `durationMs`
 * wirklich raus. Bis dahin ist „Rückgängig" die Wahrheit (nichts wurde gepostet), nicht
 * eine Löschung hinterher.
 *
 * Regeln (siehe Produktvorgabe):
 * - Nur EINE offene Rücknahme gleichzeitig - eine neue Aktion macht die vorige sofort
 *   verbindlich.
 * - App verlassen (AppState ≠ active) oder Screen-Unmount vor Ablauf → sofort senden,
 *   nicht abbrechen (keine Arbeit verlieren).
 */
export function usePendingCommit() {
  const [pending, setPending] = useState<PendingAction | null>(null);
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingRef = useRef<PendingAction | null>(null);
  pendingRef.current = pending;

  const clearTimer = () => {
    if (timer.current) {
      clearTimeout(timer.current);
      timer.current = null;
    }
  };

  const commitNow = useCallback(() => {
    const p = pendingRef.current;
    if (!p) return;
    clearTimer();
    // Die Wartezeile verschwindet sofort - ab hier ist nichts mehr zurückzunehmen.
    setPending(null);
    // Der Zeitstempel wird JETZT genommen, nicht erst nach der Serverantwort: der
    // Nutzer hat zu diesem Zeitpunkt entschieden, nicht 400 ms später.
    const time = formatTime(new Date());
    // `Promise.resolve().then(...)` fängt auch einen synchron geworfenen Fehler ein.
    // Der Historieneintrag hängt am Erfolg: Scheitert der Serveraufruf, behauptet die
    // Liste nichts. Wie es dann weitergeht (Karte zurückholen, Hinweis zeigen),
    // entscheidet der Aufrufer in seinem `catch` - dieser Hook kennt keine Endpunkte.
    Promise.resolve()
      .then(() => p.commit())
      .then(() => {
        setHistory((h) => [{ taskId: p.taskId, kind: p.kind, time }, ...h]);
      })
      .catch(() => {});
  }, []);

  const start = useCallback(
    (action: PendingAction) => {
      // Nur eine offene Rücknahme: die vorherige sofort verbindlich machen.
      if (pendingRef.current) commitNow();
      setPending(action);
      clearTimer();
      timer.current = setTimeout(() => commitNow(), action.durationMs);
    },
    [commitNow],
  );

  const undo = useCallback(() => {
    clearTimer();
    setPending(null);
  }, []);

  useEffect(() => {
    const sub = AppState.addEventListener("change", (state) => {
      if (state !== "active") commitNow();
    });
    return () => {
      sub.remove();
      clearTimer();
      // Beim Unmount ausstehende Aktion committen (nicht verlieren) - ohne React-State,
      // da die Komponente gerade verschwindet. Ein abgelehntes Promise wird hier
      // bewusst nur verschluckt: Es gibt keine Oberfläche mehr, die es zeigen könnte,
      // und eine unbehandelte Ablehnung würde in React Native als roter Kasten landen.
      const p = pendingRef.current;
      if (p) {
        Promise.resolve()
          .then(() => p.commit())
          .catch(() => {});
      }
    };
  }, [commitNow]);

  return { pending, history, start, undo, commitNow };
}
