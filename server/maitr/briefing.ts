/**
 * Tagesbriefing-Berechnung, geteilt von der Route und dem Sync-Job.
 *
 * Eine Quelle: sowohl `GET /briefing/today` (Cache-Miss) als auch der Rebuild-Job
 * bauen das Briefing hierüber. So schreibt der Sync exakt das, was die Route liest -
 * der `InsightsCache` ist damit wirklich nutzbar, nicht toter Speicher.
 *
 * ZWEI SCHICHTEN, UND WARUM DIE TRENNUNG TRÄGT
 *
 * 1. Aufgaben werden BERECHNET (`buildInsights`) - aus Bewertungen, Reservierungen,
 *    Gästen, Profilsignalen. Sie sind nirgends gespeichert und dürfen es auch nicht
 *    sein: Sobald eine Bewertung beantwortet ist, fällt sie aus dem Motor heraus,
 *    eine gespeicherte Kopie stünde weiter als offen da.
 * 2. Die ENTSCHEIDUNG darüber wird gespeichert (`TaskDecision`) - Freigabe, Verwerfen,
 *    bearbeiteter Entwurf. Das ist das Einzige am Briefing, was sich nicht ausrechnen
 *    lässt, weil es vom Willen des Betriebs abhängt.
 *
 * `applyDecisions` legt (2) über (1). Entscheidungen ohne passende Aufgabe fallen
 * dabei stillschweigend weg - deshalb kann die Entscheidungstabelle nie eine Aufgabe
 * zurückholen, deren Grundlage verschwunden ist.
 */
import { buildInsights, presenceScore, reviewAnalytics } from "@maitr/core/analytics";
import type { Insight } from "@maitr/core/analytics";
import type { DailyBriefing, DailyTask, TaskKind } from "@maitr/core/types";
import { prisma } from "../db/prisma";
import { assembleVenueDataset } from "./dataset";

const DAY_MS = 86_400_000;

const KIND_MAP: Record<Insight["kind"], TaskKind> = {
  review: "review",
  timing: "post",
  guest: "reservation",
  profile: "profile",
  roi: "profile",
  reservation: "reservation",
};

function insightToTask(i: Insight): DailyTask {
  return {
    id: i.id,
    kind: KIND_MAP[i.kind] ?? "profile",
    eyebrow: i.severity.toUpperCase(),
    title: i.title,
    impact: i.impact,
    estimatedMinutes: 2,
    primaryAction: { label: i.action?.label ?? "Öffnen", endpoint: i.action?.route },
  };
}

/* ── Entscheidungen ──────────────────────────────────────────────────────── */

/**
 * Wiedervorlage-Fenster einer Entscheidung.
 *
 * AUSNAHMSLOS gesetzt, und das aus zwei unabhängigen Gründen:
 *
 * a) Abgeleitete Aufgabenkennungen sind nicht alle einmalig. `review_<id>` nennt ein
 *    konkretes Objekt und verschwindet nach der Antwort - `occupancy_fill`,
 *    `roi_month`, `profile_<hebel>`, `noshow_<gastId>` dagegen beschreiben einen
 *    Dauerzustand und werden jeden Tag neu erzeugt. Eine unbefristete Entscheidung
 *    würde diese zweite Sorte für immer aus dem Briefing tilgen, obwohl der Zustand
 *    weiterbesteht.
 * b) Es gibt bis heute KEINEN Veröffentlichungsweg: `ChannelConnector`
 *    (packages/core/src/integrations) kann `fetchReviews`/`fetchEngagement`, also
 *    ausschliesslich lesen. Eine Freigabe setzt derzeit nur den Willen des Betriebs
 *    fest, sie stellt die Antwort nirgends ein. Verschwände die Aufgabe dauerhaft,
 *    spielte die App eine Erledigung vor, die nie bei Google oder Meta ankommt.
 *
 * Sobald (b) steht - die Freigabe also tatsächlich veröffentlicht und der Sync
 * `repliedAt` zurückliefert - gehört `reopenAt` für genau diese Aufgaben auf NULL:
 * dann trägt die Grundlage selbst die Erledigung, und die Wiedervorlage wäre nur
 * noch Lärm. Das Feld ist deshalb nullbar.
 */
export const REOPEN_AFTER_MS = 7 * DAY_MS;

/**
 * Die Felder einer `TaskDecision`-Zeile, die das Briefing braucht.
 *
 * Bewusst strukturell beschrieben statt aus `@prisma/client` importiert - wie
 * `ReservationRow` in `routes.ts`: der generierte Client liegt in diesem Repo nicht
 * im Baum (`node_modules/.prisma` fehlt), und Tests reichen einfache Objekte herein.
 */
export interface TaskDecisionRow {
  taskId: string;
  state: "OPEN" | "APPROVED" | "DISMISSED";
  draft: string | null;
  decidedAt: Date | null;
  reopenAt: Date | null;
}

/** Prisma-Enum → Zustand des API-Vertrags (`@maitr/core/types#DailyTask.state`). */
export function toApiState(state: TaskDecisionRow["state"]): NonNullable<DailyTask["state"]> {
  return state === "APPROVED" ? "approved" : state === "DISMISSED" ? "dismissed" : "open";
}

/**
 * Ist diese Aufgabe erledigt - also aus dem Briefing zu nehmen?
 *
 * `OPEN` heisst NICHT "keine Zeile vorhanden": Die Zeile entsteht auch beim blossen
 * Bearbeiten des Entwurfs. Eine bearbeitete, aber nicht freigegebene Aufgabe bleibt
 * offen - sonst verlöre der Betrieb sie in dem Moment, in dem er an ihr arbeitet.
 */
export function isSettled(decision: TaskDecisionRow, now: Date): boolean {
  if (decision.state === "OPEN") return false;
  // Wiedervorlage erreicht → wieder offen (Begründung an REOPEN_AFTER_MS).
  if (decision.reopenAt !== null && decision.reopenAt.getTime() <= now.getTime()) return false;
  return true;
}

/**
 * Entscheidungen über die frisch berechneten Aufgaben legen.
 *
 * Rein und ohne Datenbank, damit die Regel für sich prüfbar bleibt. Die Richtung ist
 * wichtig: iteriert wird über die BERECHNETEN Aufgaben, nicht über die
 * Entscheidungen. Eine Entscheidung, deren Aufgabe heute nicht entsteht (Bewertung
 * beantwortet, Gast wieder da, Bewertung gelöscht), hat damit schlicht keine
 * Wirkung - sie kann nichts wiederbeleben.
 */
export function applyDecisions(
  tasks: DailyTask[],
  decisions: Map<string, TaskDecisionRow>,
  now: Date,
): DailyTask[] {
  const offen: DailyTask[] = [];
  for (const task of tasks) {
    const decision = decisions.get(task.id);
    if (!decision) {
      offen.push({ ...task, state: "open" });
      continue;
    }
    if (isSettled(decision, now)) continue;
    // Noch offen - aber der bearbeitete Entwurf muss mit, sonst wäre die Arbeit des
    // Betriebs beim nächsten Aufruf des Briefings verloren.
    offen.push({
      ...task,
      state: "open",
      draft: decision.draft ?? task.draft,
    });
  }
  return offen;
}

/**
 * Entscheidungen eines Betriebs laden. Der `businessId`-Filter ist die
 * Mandantentrennung: Entscheidungen eines fremden Betriebs sind hier nicht
 * erreichbar, auch wenn die Aufgabenkennung zufällig dieselbe wäre.
 */
export async function loadDecisions(venueId: string): Promise<Map<string, TaskDecisionRow>> {
  try {
    const rows: TaskDecisionRow[] = await prisma.taskDecision.findMany({
      where: { businessId: venueId },
      select: { taskId: true, state: true, draft: true, decidedAt: true, reopenAt: true },
    });
    return new Map(rows.map((r) => [r.taskId, r]));
  } catch (err) {
    // Fehlt die Tabelle, ist das KEIN Grund, den Startbildschirm umzubringen.
    //
    // Der Code landet über main automatisch auf Railway, die Migration spielt ein
    // Mensch von Hand ein (das Repo führt keine gültige Prisma-Historie). Zwischen
    // Deploy und Migration gibt es also ein Fenster, in dem die Tabelle fehlt. Ohne
    // dieses Auffangen risse eine bedingungslose Abfrage nicht nur die zwei neuen
    // Routen mit, sondern GET /briefing/today — den Hauptbildschirm der App, der
    // vorher tadellos lief.
    //
    // Der Rückfall ist inhaltlich richtig und nicht bloss Schadensbegrenzung: keine
    // Entscheidungen bedeutet, jede Aufgabe ist offen. Genau das war der Zustand vor
    // dieser Änderung. Sobald die Migration liegt, greift der reguläre Weg von selbst.
    //
    // Bewusst breit gefangen statt auf einen Prisma-Fehlercode: Die Fassung des
    // generierten Clients entscheidet, ob P2021 ("table does not exist") oder ein
    // Initialisierungsfehler kommt — und ein zu enger Filter liesse genau den Fall
    // durch, den diese Zeilen abfangen sollen.
    console.warn(
      `[maitr] Aufgaben-Entscheidungen nicht lesbar (Migration eingespielt?), ` +
        `alle Aufgaben gelten als offen: ${(err as Error).message}`,
    );
    return new Map();
  }
}

/**
 * ALLE heute berechneten Aufgaben eines Betriebs - ungefiltert, ohne Entscheidungen.
 *
 * Der Schreibpfad (`POST .../approve`, `PATCH ...`) braucht genau das: Er muss
 * prüfen, ob die Kennung aus dem Pfad überhaupt zu einer Aufgabe DIESES Betriebs
 * gehört, bevor er eine Zeile anlegt - sonst füllte jeder erfundene String die
 * Tabelle. Und er muss eine bereits entschiedene Aufgabe weiterhin finden, damit ein
 * zweites Freigeben nicht in einen 404 läuft.
 */
export async function computeTasks(venueId: string, now: Date = new Date()): Promise<DailyTask[]> {
  const dataset = await assembleVenueDataset(venueId, now);
  return buildInsights(dataset).map(insightToTask);
}

export async function computeBriefing(venueId: string, now: Date = new Date()): Promise<DailyBriefing> {
  const dataset = await assembleVenueDataset(venueId, now);
  const business = await prisma.business.findUniqueOrThrow({ where: { id: venueId } });
  const decisions = await loadDecisions(venueId);

  const ra = reviewAnalytics(dataset.reviews, dataset.now);
  const score = presenceScore(dataset).score;
  const impressions = dataset.engagement
    .filter((e) => now.getTime() - Date.parse(e.at) <= 30 * DAY_MS)
    .reduce((sum, e) => sum + e.impressions, 0);

  // Erst entscheiden, DANN abschneiden. Andersherum wäre eine freigegebene Aufgabe
  // zwar weg, ihr Platz aber leer geblieben - der Betrieb bekäme zwei Karten statt
  // drei, obwohl weitere offene Aufgaben vorliegen.
  const offeneAufgaben = applyDecisions(buildInsights(dataset).map(insightToTask), decisions, now);

  const part = daypart(now.getHours());
  return {
    venue: {
      id: business.id,
      name: business.name,
      tagline: business.tagline ?? undefined,
      timezone: business.timezone,
      tags: business.tags,
    },
    now: dataset.now,
    daypart: part,
    greeting: part === "morning" ? "Guten Morgen," : part === "evening" ? "Guten Abend," : "Hallo,",
    subline: "Drei Entscheidungen, dann übernimmt Maitr.",
    stats: { rating: ra.averageRating, score, impressions },
    tasks: offeneAufgaben.slice(0, 3),
  };
}

function daypart(hour: number): "morning" | "day" | "evening" {
  return hour < 11 ? "morning" : hour < 17 ? "day" : "evening";
}
