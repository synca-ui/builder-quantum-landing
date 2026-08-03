/**
 * Beste Zeitfenster - woher die Zusage "Do 9-11 Uhr: +41 % Reichweite" kommt.
 *
 * Aus den stündlichen Reichweite-Punkten wird eine Wochentag×Stunde-Heatmap
 * gebaut. Für jedes zusammenhängende Zwei-Stunden-Fenster wird die
 * Durchschnittsreichweite gegen den Gesamtdurchschnitt gestellt; die stärksten
 * Fenster gewinnen. Der Uplift ist das Wirkungsversprechen für Beitragsvorschläge.
 */

import { round } from "./math";
import type { EngagementPoint, TimingSlot } from "./types";

const WEEKDAYS = ["Mo", "Di", "Mi", "Do", "Fr", "Sa", "So"];

/** JS-Sonntag=0 → unser Montag=0. */
function isoWeekday(date: Date): number {
  return (date.getDay() + 6) % 7;
}

export function bestPostingSlots(engagement: EngagementPoint[], topN = 3): TimingSlot[] {
  if (engagement.length === 0) return [];

  // buckets[weekday][hour] = summierte Reichweite; counts für den Durchschnitt.
  const buckets: number[][] = Array.from({ length: 7 }, () => new Array(24).fill(0));
  const counts: number[][] = Array.from({ length: 7 }, () => new Array(24).fill(0));
  let grandTotal = 0;
  let grandCount = 0;

  for (const point of engagement) {
    const d = new Date(point.at);
    const wd = isoWeekday(d);
    const h = d.getHours();
    buckets[wd][h] += point.impressions;
    counts[wd][h] += 1;
    grandTotal += point.impressions;
    grandCount += 1;
  }

  const baseline = grandCount === 0 ? 0 : grandTotal / grandCount;
  if (baseline === 0) return [];

  const slots: TimingSlot[] = [];
  for (let wd = 0; wd < 7; wd++) {
    // Zwei-Stunden-Fenster von 6:00 bis 20:00 abklappern.
    for (let h = 6; h <= 18; h++) {
      const c = counts[wd][h] + counts[wd][h + 1];
      if (c === 0) continue;
      const avg = (buckets[wd][h] + buckets[wd][h + 1]) / c;
      const uplift = round((avg / baseline - 1) * 100);
      if (uplift <= 0) continue;
      slots.push({
        weekday: wd,
        weekdayLabel: WEEKDAYS[wd],
        fromHour: h,
        toHour: h + 2,
        upliftPercent: uplift,
      });
    }
  }

  // Nur das jeweils stärkste Fenster je Wochentag, dann global Top-N.
  const bestPerDay = new Map<number, TimingSlot>();
  for (const slot of slots) {
    const cur = bestPerDay.get(slot.weekday);
    if (!cur || slot.upliftPercent > cur.upliftPercent) bestPerDay.set(slot.weekday, slot);
  }

  return [...bestPerDay.values()]
    .sort((a, b) => b.upliftPercent - a.upliftPercent)
    .slice(0, topN);
}
