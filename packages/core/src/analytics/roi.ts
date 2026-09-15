/**
 * ROI in Euro - der Satz, der eine Abo-Gebühr rechtfertigt.
 *
 * Jede Reservierung über Maitr statt über eine Plattform spart die Provision, die
 * dort auf den vermittelten Umsatz fällig würde (TheFork & Co. nehmen je nach
 * Modell ~2-5 % bzw. einen Betrag je Gedeck). Wir setzen konservativ 2,5 % an und
 * rechnen den vermittelten Umsatz aus Gedecken × Ø-Umsatz.
 *
 * ZEITRAUM: Mit `now` zählen nur Reservierungen der letzten `periodDays` Tage bis
 * einschließlich `now` - eine Buchung für nächsten Samstag hat noch nichts
 * gespart. Ohne `now` wird NICHT gefiltert: Wachstum, Abo und Erkenntnisse der
 * Demo rechnen seit jeher über alle Fixture-Reservierungen (61 vergangene plus die
 * heutige um 19 Uhr), und der Vorführzustand soll exakt so bleiben. Der Server
 * begrenzt den Zeitraum deshalb schon beim Laden (server/maitr/dataset.ts).
 */

import { round } from "./math";
import type { Iso8601 } from "../types";
import type { ReservationRecord, RoiResult } from "./types";

/** Konservativer Provisionssatz, den Plattformen auf vermittelten Umsatz nehmen. */
const DEFAULT_COMMISSION_RATE = 0.025;

export function reservationRoi(
  reservations: ReservationRecord[],
  averageCheck: number,
  options: { commissionRate?: number; periodDays?: number; now?: Iso8601 } = {},
): RoiResult {
  const commissionRate = options.commissionRate ?? DEFAULT_COMMISSION_RATE;
  // Gegen Division durch 0 absichern (0 oder negativ vom Aufrufer → Default).
  const periodDays = options.periodDays && options.periodDays > 0 ? options.periodDays : 30;
  const imZeitraum = zeitraumFilter(options.now, periodDays);

  // Nur tatsächlich provisionsfrei vermittelte, wahrgenommene Reservierungen zählen.
  // Stornierte, No-Shows und Walk-ins fallen hier heraus.
  const relevant = reservations.filter(
    (r) => r.source === "maitr" && (r.status === "confirmed" || r.status === "seated") && imZeitraum(r),
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

/**
 * (now − periodDays, now]. Ein unlesbares `now` filtert nicht - lieber die alte
 * Zahl als stillschweigend null Euro, die wie "Maitr hat nichts gebracht" aussieht.
 */
function zeitraumFilter(now: Iso8601 | undefined, periodDays: number): (r: ReservationRecord) => boolean {
  const ende = now === undefined ? NaN : Date.parse(now);
  if (!Number.isFinite(ende)) return () => true;
  const beginn = ende - periodDays * 86_400_000;
  return (r) => {
    const start = Date.parse(r.start);
    return Number.isFinite(start) && start > beginn && start <= ende;
  };
}
