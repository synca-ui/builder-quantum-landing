// @vitest-environment node
/**
 * Kopf des Tagesbriefings (server/maitr/briefing.ts): Begrüßung und Unterzeile.
 *
 * ANLASS (Integrationsprüfung, Punkt 12 und Querschnitt 9):
 *
 *  - Die Tageszeit kam aus `now.getHours()`, also aus der Zeitzone des
 *    Serverprozesses. Auf Railway ist TZ nicht gesetzt (UTC): Ein Kölner Wirt bekam
 *    im Sommer um 12:30 Uhr "Guten Morgen" und um 18:30 Uhr "Hallo".
 *  - Die Unterzeile stand fest auf "Drei Entscheidungen, dann übernimmt Maitr." -
 *    auch über einer einzigen Karte oder über keiner.
 *
 * Die Zeitzonen-Tests nehmen Zeitpunkte, an denen UTC und Betriebszeit in
 * verschiedene Tagesabschnitte fallen, und zusätzlich New York: Der Rechner, auf
 * dem die Tests laufen, steht meist in Europe/Berlin - ein Test nur mit Berlin
 * bemerkte die Prozesszeitzone gar nicht.
 *
 * Prisma ist gemockt (Vorbild datasetPraesenz.spec.ts), Dataset, Analytics-Kern
 * und Entscheidungslogik laufen echt.
 */
import { beforeEach, describe, expect, it, vi } from "vitest";

const { prismaMock } = vi.hoisted(() => ({
  prismaMock: {
    business: { findUniqueOrThrow: vi.fn() },
    maitrReview: { findMany: vi.fn() },
    maitrEngagementPoint: { findMany: vi.fn() },
    maitrGuest: { findMany: vi.fn() },
    reservation: { findMany: vi.fn() },
    channelConnection: { findMany: vi.fn() },
    menuItem: { count: vi.fn() },
    presenceSnapshot: { findUnique: vi.fn() },
    taskDecision: { findMany: vi.fn() },
  },
}));

vi.mock("../db/prisma", () => ({ default: prismaMock, prisma: prismaMock }));

import { begruessung, computeBriefing, computeTasks, daypart, stundeIn, unterzeile } from "../maitr/briefing";

const BETRIEB_ID = "biz-toeller";
const TAG_MS = 86_400_000;
/** 15.09.2026 - Sommerzeit, Berlin = UTC+2, New York = UTC−4. */
const um = (utc: string) => new Date(`2026-09-15T${utc}:00Z`);
const NOW = um("08:00");
const vorTagen = (n: number) => new Date(NOW.getTime() - n * TAG_MS);

let business: Record<string, unknown>;
let entscheidungen: Array<{ taskId: string; state: string; draft: string | null; decidedAt: Date | null; reopenAt: Date | null }>;

beforeEach(() => {
  vi.clearAllMocks();
  business = {
    id: BETRIEB_ID,
    name: "Haus Töller",
    tagline: null,
    description: null,
    timezone: "Europe/Berlin",
    tags: [],
    averageCheck: 9,
    profileSignals: null,
    openingHours: null,
    socialLinks: null,
    contactInfo: null,
    postalCode: "50676",
    latitude: null,
    longitude: null,
  };
  entscheidungen = [];

  prismaMock.business.findUniqueOrThrow.mockImplementation(async () => business);
  // Drei unbeantwortete Google-Bewertungen aus einem früheren Sync → drei
  // Antwort-Aufgaben, dazu der Profil-Hebel. Genug, um jede Zahl einzustellen.
  prismaMock.maitrReview.findMany.mockResolvedValue([
    { id: "rev-1", source: "google", rating: 2, text: "Kalt.", createdAtSource: vorTagen(1), repliedAt: null },
    { id: "rev-2", source: "google", rating: 1, text: "Laut.", createdAtSource: vorTagen(2), repliedAt: null },
    { id: "rev-3", source: "google", rating: 5, text: "Prima.", createdAtSource: vorTagen(3), repliedAt: null },
  ]);
  prismaMock.maitrEngagementPoint.findMany.mockResolvedValue([]);
  prismaMock.maitrGuest.findMany.mockResolvedValue([]);
  prismaMock.reservation.findMany.mockResolvedValue([]);
  prismaMock.channelConnection.findMany.mockResolvedValue([]);
  prismaMock.menuItem.count.mockResolvedValue(0);
  prismaMock.presenceSnapshot.findUnique.mockResolvedValue(null);
  prismaMock.taskDecision.findMany.mockImplementation(async () => entscheidungen);
});

/* ── Tageszeit in der Zeitzone des Betriebs ─────────────────────────────── */

describe("stundeIn", () => {
  it("rechnet in der Zeitzone des Betriebs, nicht in der des Prozesses", () => {
    expect(stundeIn(um("09:30"), "Europe/Berlin")).toBe(11);
    expect(stundeIn(um("09:30"), "America/New_York")).toBe(5);
    expect(stundeIn(um("09:30"), "UTC")).toBe(9);
    // Mitternacht ist 0, nicht 24.
    expect(stundeIn(um("22:00"), "Europe/Berlin")).toBe(0);
    // Winterzeit: Berlin = UTC+1.
    expect(stundeIn(new Date("2026-01-15T10:30:00Z"), "Europe/Berlin")).toBe(11);
  });

  it("fällt bei fehlender oder unbekannter Zone auf Europe/Berlin zurück, statt zu werfen", () => {
    expect(stundeIn(um("09:30"), null)).toBe(11);
    expect(stundeIn(um("09:30"), "")).toBe(11);
    expect(stundeIn(um("09:30"), "Köln")).toBe(11);
  });

  it("daypart und Begrüßung: Morgen bis 10:59, Tag bis 16:59, danach Abend", () => {
    expect([10, 11, 16, 17].map(daypart)).toEqual(["morning", "day", "day", "evening"]);
    expect(begruessung("morning")).toBe("Guten Morgen,");
    expect(begruessung("day")).toBe("Hallo,");
    expect(begruessung("evening")).toBe("Guten Abend,");
  });
});

describe("computeBriefing: Begrüßung", () => {
  it.each([
    // [UTC, Zone, daypart, greeting] - UTC allein ergäbe jeweils etwas anderes.
    ["08:30", "Europe/Berlin", "morning", "Guten Morgen,"], // 10:30 Berlin
    ["09:30", "Europe/Berlin", "day", "Hallo,"], // 11:30 Berlin, UTC wäre Morgen
    ["15:30", "Europe/Berlin", "evening", "Guten Abend,"], // 17:30 Berlin, UTC wäre Tag
    ["15:30", "America/New_York", "day", "Hallo,"], // 11:30 New York
    ["12:00", "America/New_York", "morning", "Guten Morgen,"], // 08:00 New York, UTC wäre Tag
  ] as const)("%s UTC in %s → %s", async (utc, zone, part, greeting) => {
    business.timezone = zone;
    const briefing = await computeBriefing(BETRIEB_ID, um(utc));
    expect(briefing.daypart).toBe(part);
    expect(briefing.greeting).toBe(greeting);
    expect(briefing.venue.timezone).toBe(zone);
  });
});

/* ── Unterzeile aus der Aufgabenzahl ────────────────────────────────────── */

describe("unterzeile", () => {
  it("nennt die Zahl, im Singular und ohne Aufgaben ehrlich", () => {
    expect(unterzeile(3)).toBe("Drei Entscheidungen, dann übernimmt Maitr.");
    expect(unterzeile(2)).toBe("Zwei Entscheidungen, dann übernimmt Maitr.");
    expect(unterzeile(1)).toBe("Eine Entscheidung, dann übernimmt Maitr.");
    expect(unterzeile(0)).toBe("Heute ist nichts zu entscheiden.");
    expect(unterzeile(-1)).toBe("Heute ist nichts zu entscheiden.");
    expect(unterzeile(Number.NaN)).toBe("Heute ist nichts zu entscheiden.");
  });
});

describe("computeBriefing: Unterzeile folgt den ausgelieferten Aufgaben", () => {
  it("drei, zwei, eine, keine - nach Entscheidungen und Kappung auf drei", async () => {
    const ids = (await computeTasks(BETRIEB_ID, NOW)).map((t) => t.id);
    // Mehr als drei berechnet: Die Unterzeile zählt die AUSGELIEFERTEN, nicht die berechneten.
    expect(ids.length).toBeGreaterThan(3);

    const erwartet: Array<[number, string]> = [
      [3, "Drei Entscheidungen, dann übernimmt Maitr."],
      [2, "Zwei Entscheidungen, dann übernimmt Maitr."],
      [1, "Eine Entscheidung, dann übernimmt Maitr."],
      [0, "Heute ist nichts zu entscheiden."],
    ];
    for (const [offen, subline] of erwartet) {
      // Alle bis auf `offen` verworfen (Wiedervorlage erst in einer Woche).
      const verworfen = offen >= 3 ? [] : ids.slice(offen);
      entscheidungen = verworfen.map((taskId) => ({
        taskId,
        state: "DISMISSED",
        draft: null,
        decidedAt: NOW,
        reopenAt: new Date(NOW.getTime() + 7 * TAG_MS),
      }));

      const briefing = await computeBriefing(BETRIEB_ID, NOW);

      expect(briefing.tasks).toHaveLength(offen);
      expect(briefing.subline).toBe(subline);
    }
  });
});
