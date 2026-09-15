// @vitest-environment node
/**
 * Präsenzscore mit Deckung (packages/core/src/analytics/presence.ts).
 *
 * ANLASS: Ohne Google-Freigabe gibt es keine Antwortquote und keine Reichweite.
 * Bisher hätte der Score dafür 30 Punkte abgezogen - für etwas, das nie
 * gemessen wurde. Jetzt fallen unbekannte Faktoren aus der Rechnung, die
 * übrigen Gewichte werden auf 1 normiert, und Score plus offene Punkte ergeben
 * weiterhin 100.
 */
import { describe, expect, it } from "vitest";
import { presenceScore } from "../analytics/presence";
import type { VenueDataset } from "../analytics/types";

const NOW = "2026-09-15T09:00:00.000Z";

function tageZurueck(tage: number): string {
  return new Date(Date.parse(NOW) - tage * 86_400_000).toISOString();
}

function dataset(teil: Partial<VenueDataset> = {}): VenueDataset {
  return {
    now: NOW,
    timezone: "Europe/Berlin",
    reviews: [],
    engagement: [],
    reservations: [],
    guests: [],
    profile: { hasMenu: true, hasHolidayHours: false, hasOutdoorAttribute: true, photoCount: 6, hasBio: true },
    averageCheck: 9,
    ...teil,
  };
}

describe("presenceScore ohne Deckungsangabe", () => {
  it("rechnet wie bisher über alle fünf Faktoren", () => {
    const r = presenceScore(
      dataset({
        reviews: [
          { id: "a", source: "google", rating: 5, text: "", createdAt: tageZurueck(3), repliedAt: tageZurueck(2) },
          { id: "b", source: "google", rating: 4, text: "", createdAt: tageZurueck(10) },
        ],
      }),
    );
    expect(r.coverage).toEqual({ measuredWeight: 1, unknown: [], estimated: [] });
    expect(r.factors.every((f) => f.status === "gemessen")).toBe(true);
    // Schnitt 4,5 → 0,75 · 0,3 = 22,5; Antwortquote 0,5 · 0,2 = 10;
    // Vollständigkeit 4/5 · 0,25 = 20; Aktivität 2/4 · 0,15 = 7,5; Reichweite 0.
    expect(r.score).toBe(60);
  });
});

describe("presenceScore mit unbekannten Faktoren", () => {
  const oeffentlich = dataset({
    reviews: [
      { id: "a", source: "google", rating: 5, text: "", createdAt: tageZurueck(3) },
      { id: "b", source: "google", rating: 2, text: "", createdAt: tageZurueck(12) },
    ],
    // Googles Schnitt über alle 312 Bewertungen - nicht der Schnitt der zwei oben (3,5).
    reviewSummary: { averageRating: 4.6, total: 312 },
    profile: {
      hasMenu: true,
      hasBio: false,
      photoCount: 3,
      hasOpeningHours: true,
      hasWebsite: true,
      hasPhone: false,
      hasInstagram: true,
      hasReservation: true,
    },
    coverage: { unknown: ["responsiveness", "reach"], estimated: ["activity"] },
  });

  it("normiert auf die gemessenen Gewichte und bevorzugt Googles Gesamtschnitt", () => {
    const r = presenceScore(oeffentlich);
    expect(r.coverage.measuredWeight).toBe(0.7);
    expect(r.coverage.unknown).toEqual(["responsiveness", "reach"]);
    expect(r.coverage.estimated).toEqual(["activity"]);
    // Schnitt 4,6 → 0,8 · 0,3; Vollständigkeit 5 von 8 gemessenen Flags → 0,625 · 0,25;
    // Aktivität 2/4 → 0,5 · 0,15 - geteilt durch 0,7.
    expect(r.score).toBe(67);
  });

  it("unbekannte Faktoren tragen nichts bei und haben keine offenen Punkte", () => {
    const r = presenceScore(oeffentlich);
    const antwort = r.factors.find((f) => f.key === "responsiveness")!;
    expect(antwort).toMatchObject({ status: "unbekannt", achieved: 0, openPoints: 0 });
    expect(r.factors.find((f) => f.key === "activity")!.status).toBe("geschaetzt");
  });

  it("Score plus offene Punkte ergeben weiter 100 (bis auf Rundung)", () => {
    const r = presenceScore(oeffentlich);
    const offen = r.factors.reduce((s, f) => s + f.openPoints, 0);
    expect(Math.abs(r.score + offen - 100)).toBeLessThanOrEqual(2);
    expect(r.biggestLever?.key).toBe("completeness");
  });

  it("zählt bei der Vollständigkeit nur gemessene Signale", () => {
    const nurMaitr = presenceScore(
      dataset({
        profile: { hasMenu: true, hasBio: true },
        coverage: { unknown: ["rating", "responsiveness", "activity", "reach"] },
      }),
    );
    expect(nurMaitr.coverage.measuredWeight).toBe(0.25);
    expect(nurMaitr.score).toBe(100);
  });

  it("ohne einen einzigen bekannten Faktor ist der Score 0 und kein Hebel gesetzt", () => {
    const nichts = presenceScore(
      dataset({
        coverage: { unknown: ["rating", "responsiveness", "completeness", "activity", "reach"] },
      }),
    );
    expect(nichts.score).toBe(0);
    expect(nichts.biggestLever).toBeNull();
    expect(nichts.coverage.measuredWeight).toBe(0);
  });
});
