/**
 * Gäste-Auswertung - der verteidigbare Kern von Maitr.
 *
 * Plattformen besitzen die Gästebeziehung; Maitr gibt sie dem Betrieb zurück.
 * Aus rohen Besuchsdaten werden hier vier handlungsleitende Größen:
 *   • Segment (neu / stammgast / vip / gefährdet / verloren) - eine RFM-Heuristik
 *   • Churn-Risiko - misst, ob ein Gast seinen eigenen Besuchsrhythmus reißt
 *   • No-Show-Risiko - geglättete No-Show-Quote (kleine Stichproben überreagieren nicht)
 *   • Lifetime Value - Besuche × Ø-Umsatz, macht "wen zurückholen" ökonomisch
 */

import { clamp01, daysBetween, round, smoothedRate } from "./math";
import type { GuestInsight, GuestRecord, GuestSegment, VenueDataset } from "./types";

/** VIP ab so vielen Besuchen. */
const VIP_VISITS = 25;
/** Stammgast ab so vielen Besuchen. */
const REGULAR_VISITS = 5;

/**
 * Erwarteter Besuchsrhythmus in Tagen: Zeitspanne seit dem ersten Besuch geteilt
 * durch die Besuche. Wer alle 7 Tage kam und jetzt 30 Tage weg ist, ist stärker
 * gefährdet als jemand, der ohnehin nur monatlich kommt.
 */
function expectedCadenceDays(guest: GuestRecord, now: string): number {
  const tenure = daysBetween(now, guest.firstVisit);
  if (guest.visits <= 1 || tenure <= 0) return 30;
  return Math.max(3, tenure / guest.visits);
}

export function churnRisk(guest: GuestRecord, now: string): number {
  const sinceLast = daysBetween(now, guest.lastVisit);
  const cadence = expectedCadenceDays(guest, now);
  // 1 Rhythmus überfällig = beginnendes Risiko, 3 Rhythmen = so gut wie verloren.
  return clamp01((sinceLast / cadence - 1) / 2);
}

export function noShowRisk(guest: GuestRecord): number {
  return round(smoothedRate(guest.noShows, guest.visits + guest.noShows), 2);
}

export function segmentOf(guest: GuestRecord, now: string): GuestSegment {
  const sinceLast = daysBetween(now, guest.lastVisit);
  const cadence = expectedCadenceDays(guest, now);

  if (sinceLast > cadence * 3 && guest.visits >= REGULAR_VISITS) return "verloren";
  if (churnRisk(guest, now) >= 0.5 && guest.visits >= REGULAR_VISITS) return "gefährdet";
  if (guest.visits >= VIP_VISITS) return "vip";
  if (guest.visits >= REGULAR_VISITS) return "stammgast";
  return "neu";
}

export function guestInsight(guest: GuestRecord, data: VenueDataset): GuestInsight {
  return {
    id: guest.id,
    name: guest.name,
    segment: segmentOf(guest, data.now),
    visits: guest.visits,
    churnRisk: round(churnRisk(guest, data.now), 2),
    noShowRisk: noShowRisk(guest),
    lifetimeValue: round(guest.visits * data.averageCheck),
    daysSinceLastVisit: daysBetween(data.now, guest.lastVisit),
  };
}

export function guestInsights(data: VenueDataset): GuestInsight[] {
  return data.guests.map((g) => guestInsight(g, data));
}

/**
 * Rückhol-Kandidaten: gefährdete oder verlorene Gäste, nach wirtschaftlichem
 * Wert sortiert. Das ist die Liste, die eine Rückhol-Kampagne füttert.
 */
export function winBackCandidates(data: VenueDataset): GuestInsight[] {
  return guestInsights(data)
    .filter((g) => g.segment === "gefährdet" || g.segment === "verloren")
    .sort((a, b) => b.lifetimeValue - a.lifetimeValue);
}
