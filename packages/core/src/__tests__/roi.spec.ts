// @vitest-environment node
/**
 * reservationRoi (analytics/roi.ts): was zählt als provisionsfrei gespart, und
 * über welchen Zeitraum.
 *
 * ANLASS (Integrationsprüfung, Punkt 11): Ohne Zeitraum zählte die ROI-Aufgabe
 * "… Provision gespart" alles aus der Reservierungstabelle - seit Beginn und samt
 * Buchungen für nächste Woche. Mit `now` gilt jetzt (now − periodDays, now].
 * OHNE `now` bleibt die Rechnung, wie sie war: Die Demo (Wachstum, Abo,
 * Erkenntnisse) ruft ohne auf, und ihr Vorführzustand darf sich nicht ändern.
 */
import { describe, expect, it } from "vitest";
import { reservationRoi } from "../analytics/roi";
import type { ReservationRecord } from "../analytics/types";

const NOW = "2026-09-15T10:00:00.000Z";
const TAG_MS = 86_400_000;
const vor = (ms: number) => new Date(Date.parse(NOW) - ms).toISOString();

function res(id: string, start: string, partySize: number, extra: Partial<ReservationRecord> = {}): ReservationRecord {
  return { id, start, partySize, status: "confirmed", source: "maitr", ...extra };
}

describe("reservationRoi - was zählt", () => {
  it("nur Maitr-Buchungen, die bestätigt oder wahrgenommen sind", () => {
    const roi = reservationRoi(
      [
        res("bestaetigt", vor(TAG_MS), 2),
        res("platziert", vor(2 * TAG_MS), 4, { status: "seated" }),
        res("storniert", vor(TAG_MS), 6, { status: "cancelled" }),
        res("noshow", vor(TAG_MS), 5, { status: "no_show" }),
        res("walkin-status", vor(TAG_MS), 3, { status: "walk_in" }),
        res("walkin-quelle", vor(TAG_MS), 3, { source: "walk_in" }),
        res("google", vor(TAG_MS), 7, { source: "google" }),
      ],
      40,
    );
    expect(roi).toEqual({
      reservations: 2,
      covers: 6,
      revenue: 240,
      savedCommission: 6,
      savedCommissionAnnualized: 73,
      commissionRate: 0.025,
    });
  });
});

describe("reservationRoi - Zeitraum", () => {
  const liste = [
    res("jetzt", NOW, 1),
    res("vor-29-tagen", vor(29 * TAG_MS), 2),
    res("genau-30-tage", vor(30 * TAG_MS), 4),
    res("vor-31-tagen", vor(31 * TAG_MS), 8),
    res("in-einer-stunde", new Date(Date.parse(NOW) + 3_600_000).toISOString(), 16),
    res("kaputt", "gestern", 32),
  ];

  it("ohne now: kein Filter - die Demo rechnet unverändert über alles", () => {
    expect(reservationRoi(liste, 10).covers).toBe(63);
  });

  it("mit now: die letzten 30 Tage bis einschließlich jetzt", () => {
    const roi = reservationRoi(liste, 10, { now: NOW });
    // jetzt (1) + vor 29 Tagen (2). Genau 30 Tage zurück ist schon draußen, die Zukunft
    // hat noch nichts gespart, und ein unlesbarer Start zählt nicht.
    expect(roi.covers).toBe(3);
    expect(roi.reservations).toBe(2);
  });

  it("periodDays bestimmt Fenster und Hochrechnung", () => {
    const roi = reservationRoi(liste, 400, { now: NOW, periodDays: 7 });
    expect(roi.covers).toBe(1);
    // 400 € vermittelt, 10 € gespart in 7 Tagen → 10 / 7 × 365 ≈ 521 € im Jahr.
    expect(roi.savedCommission).toBe(10);
    expect(roi.savedCommissionAnnualized).toBe(521);
  });

  it("ein unlesbares now filtert nicht, statt still null Euro zu melden", () => {
    expect(reservationRoi(liste, 10, { now: "irgendwann" }).covers).toBe(63);
  });
});
