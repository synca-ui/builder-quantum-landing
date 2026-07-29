/**
 * Aufträge für die Speisekarten-Erkennung.
 *
 * Anlass: Der Endpunkt lief synchron und lieferte HTTP 504. Der Netlify-Proxy,
 * über den /api/* zu Railway geht, bricht nach 26 Sekunden ab – die Erkennung
 * eines 21-MB-Bild-PDFs braucht 40 bis 90. Netlifys eigene Empfehlung für
 * längere Vorgänge lautet ausdrücklich, asynchron zu arbeiten statt auf die
 * Antwort zu warten.
 *
 * Deshalb: POST legt einen Auftrag an und antwortet sofort, GET fragt ihn ab.
 * Beide Aufrufe sind in Millisekunden durch und bleiben weit unter der Grenze.
 *
 * BEWUSSTE EINSCHRÄNKUNG: Der Speicher liegt im Prozess, nicht in der
 * Datenbank. Bei einer zweiten Instanz landete eine Abfrage womöglich auf einem
 * Prozess, der den Auftrag nicht kennt, und der Client bekäme "nicht gefunden".
 * Für eine Instanz – dem heutigen Stand auf Railway – ist das richtig und
 * spart eine Tabelle. Wer skaliert, muss das hier in die Datenbank verlegen;
 * die Schnittstelle unten bleibt dabei gleich.
 */
import { randomUUID } from "node:crypto";
import type { MenuExtractionResult } from "./menuExtraction";

export type MenuJobStatus = "running" | "done" | "failed";

export interface MenuJob {
  id: string;
  /** Besitzer – nur er darf den Auftrag abfragen. */
  userId: string;
  status: MenuJobStatus;
  createdAt: number;
  finishedAt?: number;
  result?: MenuExtractionResult;
  error?: string;
}

/** Wie lange ein fertiger Auftrag abrufbar bleibt. */
const TTL_MS = 15 * 60 * 1000;

/**
 * Obergrenze gleichzeitig laufender Aufträge je Nutzer. Jede Erkennung kostet
 * Geld und belegt bis zu anderthalb Minuten – ohne Grenze könnte jemand
 * beliebig viele parallel anstoßen.
 */
const MAX_RUNNING_PER_USER = 2;

const jobs = new Map<string, MenuJob>();

/** Räumt abgelaufene Aufträge weg. Läuft bei jedem Zugriff mit. */
function sweep(): void {
  const cutoff = Date.now() - TTL_MS;
  for (const [id, job] of jobs) {
    // Laufende nie wegräumen, auch wenn sie lange brauchen.
    if (job.status !== "running" && job.createdAt < cutoff) jobs.delete(id);
  }
}

export function runningCount(userId: string): number {
  sweep();
  let n = 0;
  for (const job of jobs.values()) {
    if (job.userId === userId && job.status === "running") n++;
  }
  return n;
}

export class TooManyJobsError extends Error {
  constructor() {
    super(
      `Es laufen bereits ${MAX_RUNNING_PER_USER} Erkennungen. Bitte warte, bis eine fertig ist.`,
    );
    this.name = "TooManyJobsError";
  }
}

/**
 * Legt einen Auftrag an und startet die Arbeit im Hintergrund.
 *
 * Die Arbeit wird bewusst NICHT erwartet: Der Aufrufer soll sofort antworten
 * können. Fehler landen im Auftrag statt in einem unbehandelten Promise – ein
 * abgestürzter Hintergrundlauf würde sonst den ganzen Prozess mitreißen.
 */
export function startMenuJob(
  userId: string,
  work: () => Promise<MenuExtractionResult>,
): MenuJob {
  sweep();

  if (runningCount(userId) >= MAX_RUNNING_PER_USER) {
    throw new TooManyJobsError();
  }

  const job: MenuJob = {
    id: randomUUID(),
    userId,
    status: "running",
    createdAt: Date.now(),
  };
  jobs.set(job.id, job);

  void work()
    .then((result) => {
      job.result = result;
      job.status = "done";
      job.finishedAt = Date.now();
    })
    .catch((err) => {
      job.error = err instanceof Error ? err.message : "Erkennung fehlgeschlagen";
      job.status = "failed";
      job.finishedAt = Date.now();
      console.error("[MenuJob] fehlgeschlagen:", err);
    });

  return job;
}

/**
 * Holt einen Auftrag – aber nur den eigenen.
 *
 * "Gibt es nicht" und "gehört jemand anderem" sind absichtlich dasselbe
 * Ergebnis: Sonst ließe sich über den Statuscode abfragen, welche Aufträge
 * es gibt.
 */
export function getMenuJob(id: string, userId: string): MenuJob | null {
  sweep();
  const job = jobs.get(id);
  if (!job || job.userId !== userId) return null;
  return job;
}

/** Nur für Tests: setzt den Speicher zurück. */
export function __resetMenuJobs(): void {
  jobs.clear();
}

export { MAX_RUNNING_PER_USER, TTL_MS };
