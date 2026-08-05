/**
 * ROI in Euro - der Satz, der eine Abo-Gebühr rechtfertigt.
 *
 * Jede Reservierung über Maitr statt über eine Plattform spart die Provision, die
 * dort auf den vermittelten Umsatz fällig würde (TheFork & Co. nehmen je nach
 * Modell ~2-5 % bzw. einen Betrag je Gedeck). Wir setzen konservativ 2,5 % an und
 * rechnen den vermittelten Umsatz aus Gedecken × Ø-Umsatz.
 */

import { round } from "./math";
import type { ReservationRecord, RoiResult } from "./types";

/** Konservativer Provisionssatz, den Plattformen auf vermittelten Umsatz nehmen. */
const DEFAULT_COMMISSION_RATE = 0.025;

export function reservationRoi(
  reservations: ReservationRecord[],
  averageCheck: number,
  options: { commissionRate?: number; periodDays?: number } = {},
): RoiResult {
  const commissionRate = options.commissionRate ?? DEFAULT_COMMISSION_RATE;
  // Gegen Division durch 0 absichern (0 oder negativ vom Aufrufer → Default).
  const periodDays = options.periodDays && options.periodDays > 0 ? options.periodDays : 30;

  // Nur tatsächlich provisionsfrei vermittelte, wahrgenommene Reservierungen zählen.
  const relevant = reservations.filter(
    (r) => r.source === "maitr" && (r.status === "confirmed" || r.status === "seated"),
  );

  const covers = relevant.reduce((sum, r) => sum + r.partySize, 0);
  const revenue = round(covers * averageCheck);
  const savedCommission = round(revenue * commissionRate);
  const savedCommissionAnnualized = round((savedCommission / periodDays) * 365);

  return {
    reservations: relevant.length,
    covers,
    revenue,
    savedCommission,
    savedCommissionAnnualized,
    commissionRate,
  };
}
