/**
 * Tagesbriefing-Berechnung, geteilt von der Route und dem Sync-Job.
 *
 * Eine Quelle: sowohl `GET /briefing/today` (Cache-Miss) als auch der Rebuild-Job
 * bauen das Briefing hierüber. So schreibt der Sync exakt das, was die Route liest -
 * der `InsightsCache` ist damit wirklich nutzbar, nicht toter Speicher.
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

function daypart(hour: number): "morning" | "day" | "evening" {
  return hour < 11 ? "morning" : hour < 17 ? "day" : "evening";
}

export async function computeBriefing(venueId: string, now: Date = new Date()): Promise<DailyBriefing> {
  const dataset = await assembleVenueDataset(venueId, now);
  const business = await prisma.business.findUniqueOrThrow({ where: { id: venueId } });

  const ra = reviewAnalytics(dataset.reviews, dataset.now);
  const score = presenceScore(dataset).score;
  const impressions = dataset.engagement
    .filter((e) => now.getTime() - Date.parse(e.at) <= 30 * DAY_MS)
    .reduce((sum, e) => sum + e.impressions, 0);

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
    tasks: buildInsights(dataset).slice(0, 3).map(insightToTask),
  };
}
