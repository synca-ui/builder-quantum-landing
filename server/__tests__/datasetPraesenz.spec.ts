// @vitest-environment node
/**
 * Tagesbriefing ohne Google-Freigabe (server/maitr/dataset.ts + briefing.ts).
 *
 * ANLASS: Ein echter Betrieb ohne Google-Verbindung hatte keine MaitrReview-Zeilen
 * und keine Reichweite. Der Start-Screen zeigte deshalb 0,0★, einen Score mit
 * 30 Punkten Abzug für eine "Antwortquote" von null - und gar keine Aufgaben, weil
 * nichts da war. Seit dem Präsenz-Workflow liegt der Google-Eintrag im
 * PresenceSnapshot. Diese Datei prüft, dass das Briefing ihn nutzt, ohne etwas
 * zu behaupten, das Places nicht hergibt:
 *
 *  - Schnitt und Anzahl kommen aus Googles GESAMTzahl, nicht aus den fünf
 *    gezeigten Bewertungen.
 *  - Antwortquote und Reichweite sind UNBEKANNT, nicht null.
 *  - Keine "Bewertung wartet auf Antwort"-Aufgabe: Places nennt keine
 *    Inhaberantworten, jede Bewertung sähe unbeantwortet aus - auch die längst
 *    beantwortete.
 *
 * Prisma ist gemockt, der Präsenz-Lesepfad (`gespeichertePraesenz`) und der ganze
 * Analytics-Kern laufen echt.
 */
import { beforeEach, describe, expect, it, vi } from "vitest";
import { buildInsights, praesenzBericht, reservationRoi, type GoogleEintrag } from "@maitr/core/analytics";

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

import { RESERVIERUNGEN_ZEITRAUM_MS, assembleVenueDataset, mapSource } from "../maitr/dataset";
import { computeBriefing } from "../maitr/briefing";
import { maitrProfilAus } from "../maitr/praesenz";

const NOW = new Date("2026-09-15T08:00:00Z");
const TAG_MS = 86_400_000;
const vorTagen = (n: number) => new Date(NOW.getTime() - n * TAG_MS);

const BETRIEB_ID = "biz-goldstueck";

let business: Record<string, unknown>;
/** Verbindungen samt Status - der Mock filtert wie die Tabelle. */
let verbindungen: Array<{ provider: string; status: string }>;
let gerichte: number;
let snapshotZeile: Record<string, unknown> | null;

/**
 * Der gespeicherte Places-Eintrag. Die drei gezeigten Bewertungen haben einen
 * Schnitt von 2,7 - Google nennt über alle 187 Bewertungen 4,3. Genau dieser
 * Unterschied zeigt, woher die Zahl im Briefing kommt.
 */
const GOOGLE: GoogleEintrag = {
  placeId: "ChIJ-goldstueck",
  name: "Café Goldstück",
  rating: 4.3,
  reviewCount: 187,
  bewertungen: [
    { id: "places/g/reviews/1", autor: "Mia", rating: 1, text: "Kalter Kaffee, unfreundlicher Service.", createdAt: vorTagen(2).toISOString() },
    { id: "places/g/reviews/2", autor: "Tom", rating: 2, text: "Lange gewartet.", createdAt: vorTagen(5).toISOString() },
    { id: "places/g/reviews/3", autor: "Lea", rating: 5, text: "Bester Flat White in Ehrenfeld.", createdAt: vorTagen(9).toISOString() },
  ],
  fotos: [],
  fotoAnzahl: 3,
  telefon: "0221 9876543",
  website: "https://cafe-goldstueck.example/",
  status: "OPERATIONAL",
};

beforeEach(() => {
  vi.clearAllMocks();

  business = {
    id: BETRIEB_ID,
    name: "Café Goldstück",
    tagline: "Spezialitätenkaffee",
    description: null,
    timezone: "Europe/Berlin",
    tags: ["kaffee"],
    averageCheck: 9,
    profileSignals: null,
    openingHours: null,
    socialLinks: null,
    contactInfo: null,
    postalCode: "50825",
    latitude: null,
    longitude: null,
  };
  verbindungen = [];
  gerichte = 0;
  snapshotZeile = {
    status: "bereit",
    fehler: null,
    google: GOOGLE,
    website: null,
    fetchedAt: vorTagen(1),
  };

  prismaMock.business.findUniqueOrThrow.mockImplementation(async () => business);
  prismaMock.maitrReview.findMany.mockResolvedValue([]);
  prismaMock.maitrEngagementPoint.findMany.mockResolvedValue([]);
  prismaMock.maitrGuest.findMany.mockResolvedValue([]);
  prismaMock.reservation.findMany.mockResolvedValue([]);
  prismaMock.channelConnection.findMany.mockImplementation(
    async ({ where }: { where: { businessId: string; status?: string } }) =>
      verbindungen.filter((v) => where.status === undefined || v.status === where.status).map(({ provider }) => ({ provider })),
  );
  prismaMock.menuItem.count.mockImplementation(async ({ where }: { where: { category: { businessId: string } } }) =>
    where.category.businessId === BETRIEB_ID ? gerichte : 0,
  );
  prismaMock.presenceSnapshot.findUnique.mockImplementation(async () => snapshotZeile);
  prismaMock.taskDecision.findMany.mockResolvedValue([]);
});

/* ── (a) Ohne Freigabe, mit gespeichertem Google-Eintrag ────────────────── */

describe("ohne Google-Verbindung und ohne MaitrReview", () => {
  it("nimmt Schnitt und Anzahl aus Google und führt Antwortquote und Reichweite als unbekannt", async () => {
    // Eine widerrufene Google-Verbindung ist keine Freigabe.
    verbindungen = [{ provider: "GOOGLE", status: "REVOKED" }];

    const dataset = await assembleVenueDataset(BETRIEB_ID, NOW);

    expect(prismaMock.presenceSnapshot.findUnique).toHaveBeenCalledWith(
      expect.objectContaining({ where: { businessId: BETRIEB_ID } }),
    );
    expect(dataset.reviewSummary).toEqual({ averageRating: 4.3, total: 187 });
    expect(dataset.coverage?.unknown).toEqual(expect.arrayContaining(["responsiveness", "reach"]));
    expect(dataset.coverage?.unknown).not.toContain("rating");
    expect(dataset.reviews.map((r) => r.id)).toEqual(GOOGLE.bewertungen.map((b) => b.id));
    expect(dataset.reviews.every((r) => r.repliedAt === undefined)).toBe(true);
    expect(dataset.profile).toMatchObject({ photoCount: 3, hasPhone: true, hasWebsite: true, hasMenu: false });
  });

  it("leitet hasMenu aus menuItem.count ab - nicht aus der nie beschriebenen Spalte profileSignals", async () => {
    gerichte = 7;
    const dataset = await assembleVenueDataset(BETRIEB_ID, NOW);
    expect(dataset.profile.hasMenu).toBe(true);
    expect(prismaMock.menuItem.count).toHaveBeenCalledWith({ where: { category: { businessId: BETRIEB_ID } } });
  });

  it("erzeugt keine review_-Aufgaben aus Bewertungen, deren Antwortstatus niemand kennt", async () => {
    const dataset = await assembleVenueDataset(BETRIEB_ID, NOW);

    const ids = buildInsights(dataset).map((i) => i.id);
    expect(ids.filter((id) => id.startsWith("review_"))).toEqual([]);

    // Gegenprobe: Dieselben Bewertungen MIT bekanntem Antwortstatus ergäben
    // zwei kritische Antwort-Aufgaben. Der Test oben prüft also etwas.
    const gegenprobe = buildInsights({ ...dataset, coverage: undefined }).map((i) => i.id);
    expect(gegenprobe).toEqual(expect.arrayContaining(["review_places/g/reviews/1", "review_places/g/reviews/2"]));
  });

  it("computeBriefing: Google-Schnitt und -Anzahl, Aufrufe als unbekannt, Hinweis zum Score", async () => {
    const briefing = await computeBriefing(BETRIEB_ID, NOW);

    expect(briefing.stats.rating).toBe(4.3);
    expect(briefing.stats.reviewCount).toBe(187);
    expect(briefing.stats.impressions).toBe(0);
    expect(briefing.stats.impressionsKnown).toBe(false);
    // rating + completeness gemessen, activity geschätzt - responsiveness und reach fehlen.
    expect(briefing.stats.scoreHint).toBe("Beruht auf 3 von 5 Faktoren.");
    expect(briefing.tasks.some((t) => t.id.startsWith("review_"))).toBe(false);
  });

  it("computeBriefing und Präsenzbericht nennen denselben Score (Start-Screen = Profil-Check)", async () => {
    const briefing = await computeBriefing(BETRIEB_ID, NOW);
    const bericht = praesenzBericht({
      now: NOW.toISOString(),
      google: GOOGLE,
      googleStatus: "bereit",
      website: null,
      maitr: maitrProfilAus(business as any, gerichte),
    });
    expect(briefing.stats.score).toBe(bericht.score);
  });

  it("ohne gespeicherten Stand: kein erfundener Schnitt, rating ebenfalls unbekannt", async () => {
    snapshotZeile = null;

    const dataset = await assembleVenueDataset(BETRIEB_ID, NOW);
    expect(dataset).not.toHaveProperty("reviewSummary");
    expect(dataset.reviews).toEqual([]);
    expect(dataset.coverage?.unknown).toEqual(expect.arrayContaining(["rating", "activity", "responsiveness", "reach"]));

    const briefing = await computeBriefing(BETRIEB_ID, NOW);
    expect(briefing.stats.rating).toBe(0);
    expect(briefing.stats.reviewCount).toBe(0);
    expect(briefing.stats.scoreHint).toBe("Beruht auf 1 von 5 Faktoren.");
  });
});

/* ── (b) Mit aktiver Google-Verbindung ──────────────────────────────────── */

describe("mit aktiver GOOGLE-Verbindung", () => {
  /*
   * ANLASS (Prüfbefund, behoben 15.09.2026): Hier stand vorher "bleibt bei der
   * freigegebenen Datenlage: reviews [], keine coverage" - und schrieb damit einen
   * Fehler fest. Der OAuth-Callback setzt die Verbindung sofort auf ACTIVE,
   * gezogen wird erst beim nächsten Sync. Bis dahin galten leere Bewertungen als
   * gemessen: Bewertung 0 ("Noch keine Bewertung" auf Start), Antwortquote und
   * Reichweite 0, und ein 4,6★-Betrieb fiel beim Verbinden von Score 66 auf 19.
   */
  it("noch nicht synchronisiert: Google-Schnitt aus dem Snapshot, Antwortquote und Reichweite unbekannt - kein Score-Sturz", async () => {
    const ohneVerbindung = await computeBriefing(BETRIEB_ID, NOW);

    verbindungen = [{ provider: "GOOGLE", status: "ACTIVE" }];
    const dataset = await assembleVenueDataset(BETRIEB_ID, NOW);

    expect(dataset.reviewSummary).toEqual({ averageRating: 4.3, total: 187 });
    expect(dataset.reviews.map((r) => r.id)).toEqual(GOOGLE.bewertungen.map((b) => b.id));
    expect(dataset.coverage?.unknown).toEqual(expect.arrayContaining(["responsiveness", "reach"]));
    expect(dataset.coverage?.unknown).not.toContain("rating");

    const briefing = await computeBriefing(BETRIEB_ID, NOW);
    expect(briefing.stats.rating).toBe(4.3);
    expect(briefing.stats.reviewCount).toBe(187);
    expect(briefing.stats.impressionsKnown).toBe(false);
    expect(briefing.stats.score).toBe(ohneVerbindung.stats.score);
    expect(briefing.tasks.some((t) => t.id.startsWith("review_"))).toBe(false);
  });

  it("synchronisierte Bewertungen mit Antwortstatus erzeugen weiter Antwort-Aufgaben", async () => {
    // Ohne aktive Verbindung, aber mit Zeilen aus einem früheren Sync - ebenfalls die freigegebene Datenlage.
    prismaMock.maitrReview.findMany.mockResolvedValue([
      { id: "rev-offen", source: "google", rating: 2, text: "Kalt.", createdAtSource: vorTagen(1), repliedAt: null },
      { id: "rev-beantwortet", source: "google", rating: 1, text: "Laut.", createdAtSource: vorTagen(2), repliedAt: vorTagen(1) },
    ]);

    const dataset = await assembleVenueDataset(BETRIEB_ID, NOW);

    expect(dataset).not.toHaveProperty("coverage");
    // Der Sync holt nur die erste Seite - Googles Gesamtzahl aus dem Snapshot ist der Schnitt.
    expect(dataset.reviewSummary).toEqual({ averageRating: 4.3, total: 187 });
    const ids = buildInsights(dataset).map((i) => i.id);
    expect(ids).toContain("review_rev-offen");
    expect(ids).not.toContain("review_rev-beantwortet");
  });

  /*
   * ANLASS (Prüfbefund): Die freigegebene Datenlage übernahm ALLE MaitrReview-
   * Zeilen. Mit Google PLUS Meta flossen Facebook-Empfehlungen (5★/1★, nie mit
   * Antwortzeitpunkt) in Schnitt und Antwortquote ein, und eine negative
   * Empfehlung wurde "Kritische 1★-Bewertung wartet auf Antwort".
   */
  it("Google + Meta: Facebook-Empfehlungen zählen weder als Bewertung mit Antwortstatus noch als Aufgabe", async () => {
    verbindungen = [
      { provider: "GOOGLE", status: "ACTIVE" },
      { provider: "META", status: "ACTIVE" },
    ];
    snapshotZeile = null; // ohne Snapshot-Schnitt: sonst verdeckte er einen falschen Mittelwert
    prismaMock.maitrReview.findMany.mockResolvedValue([
      { id: "g-gut", source: "google", rating: 5, text: "Toll.", createdAtSource: vorTagen(3), repliedAt: vorTagen(2) },
      { id: "fb-positiv", source: "facebook", rating: 5, text: "", createdAtSource: vorTagen(4), repliedAt: null },
      { id: "fb-negativ", source: "facebook", rating: 1, text: "Nie wieder.", createdAtSource: vorTagen(6), repliedAt: null },
    ]);

    const dataset = await assembleVenueDataset(BETRIEB_ID, NOW);
    expect(dataset.reviews.map((r) => r.id)).toEqual(["g-gut"]);

    const briefing = await computeBriefing(BETRIEB_ID, NOW);
    // Nur die Google-Bewertung: 5,0 statt (5 + 5 + 1) / 3 = 3,7.
    expect(briefing.stats.rating).toBe(5);
    expect(briefing.tasks.map((t) => t.id)).not.toContain("review_fb-negativ");
    // Antwortquote 100 % - die Empfehlungen zählen nicht als unbeantwortet.
    const antwortquote = praesenzBericht(
      { now: NOW.toISOString(), google: null, googleStatus: "ausstehend", website: null, maitr: maitrProfilAus(business as any, 0) },
      dataset,
    ).faktoren.find((f) => f.key === "responsiveness");
    expect(antwortquote?.achieved).toBe(1);
  });
});

/* ── (c) Meta-Reichweite ────────────────────────────────────────────────── */

describe("mit Meta-Reichweite, ohne Google-Freigabe", () => {
  it("führt reach nicht als unbekannt - die Profilaufrufe sind gemessen", async () => {
    prismaMock.maitrEngagementPoint.findMany.mockResolvedValue([
      { at: vorTagen(3), source: "instagram", impressions: 1200, actions: 30 },
    ]);

    const dataset = await assembleVenueDataset(BETRIEB_ID, NOW);
    expect(dataset.coverage?.unknown).toContain("responsiveness");
    expect(dataset.coverage?.unknown).not.toContain("reach");

    const briefing = await computeBriefing(BETRIEB_ID, NOW);
    expect(briefing.stats.impressions).toBe(1200);
    expect(briefing.stats.impressionsKnown).toBe(true);
    expect(briefing.stats.scoreHint).toBe("Beruht auf 4 von 5 Faktoren.");
  });

  /*
   * FEHLER IM CODE (gemeldet, nicht behoben): dataset.ts nimmt die freigegebene
   * Datenlage schon bei `reviews.length > 0`. Der Meta-Sync (server/maitr/sync.ts)
   * schreibt aber Facebook-Empfehlungen als MaitrReview - positiv → 5★,
   * negativ → 1★, nie mit repliedAt (packages/core/src/integrations/meta.ts).
   * Mit NUR einer Meta-Verbindung verdrängen sie den gespeicherten Google-Eintrag:
   * Der Start-Screen zeigt den Facebook-Schnitt als Google-Sterne und stellt für
   * jede negative Empfehlung eine Antwort-Aufgabe ein, obwohl niemand ihren
   * Antwortstatus kennt - genau der Fall, den `coverage` verhindern sollte.
   * BEHOBEN 15.09.2026: dataset.ts wählt die freigegebene Datenlage nur noch bei
   * aktiver GOOGLE-Verbindung oder Google-Bewertungen aus einem früheren Sync.
   */
  describe("nur Meta verbunden, Facebook-Empfehlungen synchronisiert", () => {
    beforeEach(() => {
      verbindungen = [{ provider: "META", status: "ACTIVE" }];
      prismaMock.maitrReview.findMany.mockResolvedValue([
        { id: "fb-positiv", source: "facebook", rating: 5, text: "", createdAtSource: vorTagen(4), repliedAt: null },
        { id: "fb-negativ", source: "facebook", rating: 1, text: "Nie wieder.", createdAtSource: vorTagen(6), repliedAt: null },
      ]);
    });

    it("stats.rating bleibt Googles 4,3 statt des Facebook-Schnitts (3,0)", async () => {
      const briefing = await computeBriefing(BETRIEB_ID, NOW);
      expect(briefing.stats.rating).toBe(4.3);
    });

    it("eine negative Facebook-Empfehlung wird keine Antwort-Aufgabe", async () => {
      const briefing = await computeBriefing(BETRIEB_ID, NOW);
      expect(briefing.tasks.map((t) => t.id)).not.toContain("review_fb-negativ");
    });
  });
});

/* ── (d) Händische Korrektur ────────────────────────────────────────────── */

describe("gesetzte profileSignals", () => {
  it("gewinnen gegen abgeleitete Werte - nicht gesetzte oder falsch getypte bleiben abgeleitet", async () => {
    gerichte = 7;
    business.description = "Kaffee aus eigener Röstung.";
    business.profileSignals = { hasMenu: false, photoCount: 12, hasBio: "ja", hasPhone: "nein" };

    const dataset = await assembleVenueDataset(BETRIEB_ID, NOW);

    expect(dataset.profile.hasMenu).toBe(false); // gesetzt, trotz 7 Gerichten
    expect(dataset.profile.photoCount).toBe(12); // gesetzt, statt Googles 3
    expect(dataset.profile.hasBio).toBe(true); // "ja" ist kein Wahrheitswert → abgeleitet
    expect(dataset.profile.hasPhone).toBe(true); // "nein" ebenso → aus Google
  });

  it("gewinnen auch in der freigegebenen Datenlage", async () => {
    verbindungen = [{ provider: "GOOGLE", status: "ACTIVE" }];
    prismaMock.maitrReview.findMany.mockResolvedValue([
      { id: "rev-1", source: "google", rating: 4, text: "Gut.", createdAtSource: vorTagen(1), repliedAt: null },
    ]);
    business.profileSignals = { hasMenu: true, hasHolidayHours: false };

    const dataset = await assembleVenueDataset(BETRIEB_ID, NOW);

    // Gesetzte Werte gewinnen; die öffentlichen Signale aus dem Snapshot (Fotos,
    // Website, Telefon …) kommen in dieser Datenlage ebenfalls hinzu.
    expect(dataset.profile).toMatchObject({ hasMenu: true, hasBio: false, hasHolidayHours: false });
    expect(dataset.profile.photoCount).toBe(3);
  });
});

/* ── (e) ROI: Web-App-Buchungen, Zeitraum ───────────────────────────────── */

/*
 * ANLASS (Integrationsprüfung, Punkt 11): Buchungen über die Maitr-Web-App tragen
 * source "website" und fielen in den Rückfall "walk_in" - `reservationRoi` zählt
 * aber nur "maitr". Die ROI-Aufgabe blieb für jeden echten Betrieb stumm. Und ohne
 * Zeitraum zählte "diesen Monat gespart" alles seit Beginn der Tabelle, samt
 * Buchungen für nächste Woche.
 *
 * ANLASS (Prüfbefund): Umgekehrt zählten Einträge des Betriebs in der App
 * (source "maitr", seit dieser Änderung sofort CONFIRMED) als "provisionsfrei
 * vermittelt" - die telefonische Buchung ebenso wie ein Probelauf in der
 * Gastbuchungs-Vorschau. Keine Plattform hat sie vermittelt.
 */
describe("ROI-Aufgabe aus echten Reservierungen", () => {
  interface ReservierungsZeile {
    id: string;
    businessId: string;
    guestCount: number;
    reservationTime: Date;
    status: string;
    source: string;
  }
  let zeilen: ReservierungsZeile[];
  const res = (id: string, source: string, status: string, zeit: Date, guestCount: number): ReservierungsZeile => ({
    id,
    businessId: BETRIEB_ID,
    guestCount,
    reservationTime: zeit,
    status,
    source,
  });

  beforeEach(() => {
    business.averageCheck = 40;
    zeilen = [
      res("web-bestaetigt", "website", "CONFIRMED", vorTagen(3), 4),
      res("web-da", "website", "COMPLETED", vorTagen(8), 2),
      // Vom Wirt in der App eingetragen (POST /reservations) - nicht vermittelt.
      res("app-da", "maitr", "COMPLETED", vorTagen(10), 5),
      res("web-angefragt", "website", "PENDING", vorTagen(1), 2),
      res("walkin", "walk_in", "ARRIVED", vorTagen(2), 3),
      res("web-storniert", "website", "CANCELLED", vorTagen(4), 6),
      res("web-noshow", "website", "NO_SHOW", vorTagen(5), 5),
      res("web-alt", "website", "CONFIRMED", vorTagen(31), 8),
      res("web-naechste-woche", "website", "CONFIRMED", new Date(NOW.getTime() + 7 * TAG_MS), 10),
      { ...res("fremd", "website", "CONFIRMED", vorTagen(2), 12), businessId: "biz-fremd" },
    ];
    // Wertet den Filter aus wie die Tabelle - nur die Formen, die der Code nutzt.
    prismaMock.reservation.findMany.mockImplementation(
      async ({
        where,
      }: {
        where: { businessId: string; reservationTime?: { gt?: Date; lte?: Date }; status?: { not?: string } };
      }) =>
        zeilen.filter(
          (z) =>
            z.businessId === where.businessId &&
            (where.status?.not === undefined || z.status !== where.status.not) &&
            (where.reservationTime?.gt === undefined || z.reservationTime > where.reservationTime.gt) &&
            (where.reservationTime?.lte === undefined || z.reservationTime <= where.reservationTime.lte),
        ),
    );
  });

  it("mapSource: nur website ist eine vermittelte Maitr-Buchung - App-Einträge und Unbekanntes bleiben walk_in", () => {
    expect(mapSource("website")).toBe("maitr");
    expect(mapSource("maitr")).toBe("walk_in");
    expect(mapSource("google")).toBe("google");
    expect(mapSource("walk_in")).toBe("walk_in");
    expect(mapSource("telefon")).toBe("walk_in");
  });

  it("lädt nur die letzten 30 Tage bis jetzt", async () => {
    const dataset = await assembleVenueDataset(BETRIEB_ID, NOW);

    expect(RESERVIERUNGEN_ZEITRAUM_MS).toBe(30 * TAG_MS);
    expect(prismaMock.reservation.findMany).toHaveBeenCalledWith({
      where: { businessId: BETRIEB_ID, reservationTime: { gt: vorTagen(30), lte: NOW }, status: { not: "PENDING" } },
    });
    expect(dataset.reservations.map((r) => r.id).sort()).toEqual(
      ["app-da", "walkin", "web-bestaetigt", "web-da", "web-noshow", "web-storniert"].sort(),
    );
    expect(dataset.reservations.find((r) => r.id === "web-bestaetigt")).toMatchObject({ source: "maitr", status: "confirmed" });
    expect(dataset.reservations.find((r) => r.id === "app-da")).toMatchObject({ source: "walk_in", status: "seated" });
  });

  it("zählt Web-App-Buchungen als provisionsfrei - ohne offene Anfragen, App-Einträge, Stornos, No-Shows und Walk-ins", async () => {
    const dataset = await assembleVenueDataset(BETRIEB_ID, NOW);
    const roi = buildInsights(dataset).find((i) => i.id === "roi_month");

    // web-bestaetigt 4 + web-da 2 = 6 Gäste. web-angefragt (PENDING, gestern, nie
    // bestätigt) zählt NICHT - sonst stünde eine unbeantwortete Anfrage als
    // "Provision gespart" auf Start. app-da (5 Gäste, vom Wirt eingetragen) zählt
    // ebenso wenig. 6 × 40 € = 240 € vermittelt, 2,5 % = 6 € gespart.
    expect(roi).toMatchObject({
      title: "6 € Provision gespart",
      detail: "2 provisionsfreie Reservierungen · 6 Gäste · 240 € vermittelt.",
    });
    // Dieselbe Zahl, wie sie reservationRoi mit ausdrücklichem Zeitraum rechnet.
    expect(reservationRoi(dataset.reservations, 40, { now: dataset.now })).toMatchObject({ reservations: 2, covers: 6 });
  });

  it("nur offene Web-Anfragen ergeben keine ROI-Aufgabe; ein unbekannter Status zählt nicht als bestätigt", async () => {
    zeilen = [
      res("web-angefragt", "website", "PENDING", vorTagen(1), 2),
      res("web-rätsel", "website", "WAITLIST", vorTagen(2), 4),
    ];
    const dataset = await assembleVenueDataset(BETRIEB_ID, NOW);
    expect(dataset.reservations).toEqual([]);
    expect(buildInsights(dataset).map((i) => i.id)).not.toContain("roi_month");
  });

  it("ohne Buchung im Zeitraum keine ROI-Aufgabe - auch nicht aus alten oder künftigen", async () => {
    zeilen = zeilen.filter((z) => z.id === "web-alt" || z.id === "web-naechste-woche");
    const dataset = await assembleVenueDataset(BETRIEB_ID, NOW);
    expect(dataset.reservations).toEqual([]);
    expect(buildInsights(dataset).map((i) => i.id)).not.toContain("roi_month");
  });
});

/* ── (f) Höchstalter der Places-Inhalte ─────────────────────────────────── */

describe("gespeicherter Google-Eintrag über 30 Tage", () => {
  it("fließt nicht ins Briefing - Start zeigt keine monatealten Google-Sterne", async () => {
    // Zeile vor einer Stunde geschrieben (Lauf ohne Schlüssel), Inhalt aber 31 Tage alt.
    snapshotZeile = {
      status: "bereit",
      fehler: null,
      placeId: GOOGLE.placeId,
      google: { ...GOOGLE, abgerufenAt: vorTagen(31).toISOString() },
      website: null,
      fetchedAt: new Date(NOW.getTime() - 3_600_000),
    };

    const dataset = await assembleVenueDataset(BETRIEB_ID, NOW);
    expect(dataset).not.toHaveProperty("reviewSummary");
    expect(dataset.reviews).toEqual([]);
    expect(dataset.coverage?.unknown).toContain("rating");

    const briefing = await computeBriefing(BETRIEB_ID, NOW);
    expect(briefing.stats.rating).toBe(0);
    expect(briefing.stats.reviewCount).toBe(0);
  });

  it("bis 30 Tage gilt er weiter", async () => {
    snapshotZeile = { ...snapshotZeile!, google: { ...GOOGLE, abgerufenAt: vorTagen(30).toISOString() }, fetchedAt: vorTagen(1) };
    const dataset = await assembleVenueDataset(BETRIEB_ID, NOW);
    expect(dataset.reviewSummary).toEqual({ averageRating: 4.3, total: 187 });
    expect(dataset.reviews.map((r) => r.id)).toEqual(GOOGLE.bewertungen.map((b) => b.id));
  });
});
