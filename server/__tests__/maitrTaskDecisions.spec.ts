// @vitest-environment node
/**
 * Aufgaben-Entscheidungen des Tagesbriefings (`server/maitr/routes.ts`,
 * `server/maitr/briefing.ts`, Modell `TaskDecision`).
 *
 * Anlass: "Aufgabe freigeben" ist der grüne Knopf auf dem Startbildschirm. Die App
 * ruft dafür `POST /briefing/tasks/:id/approve` und `PATCH /briefing/tasks/:id`
 * (packages/core/src/api/index.ts); serverseitig gab es beide nicht - Aufgaben waren
 * kein gespeicherter Datensatz, es fehlte schlicht etwas zum Draufschreiben.
 *
 * Diese Datei prüft die drei Eigenschaften, an denen der Bau steht oder fällt:
 *
 *  1. Die Freigabe wird PERSISTIERT - und zwar in den geprüften Betrieb.
 *  2. Eine freigegebene Aufgabe erscheint NICHT MEHR als offen. Weil Aufgaben bei
 *     jedem Aufruf neu berechnet werden, ist das keine Selbstverständlichkeit,
 *     sondern die eigentliche Leistung von `applyDecisions`.
 *  3. Ein fremder Betrieb sieht die Entscheidung nicht und kann sie nicht ändern.
 *
 * Die Datenbank wird nie angefasst - Prisma ist gemockt. Der Mock verhält sich dabei
 * wie eine echte Tabelle (er filtert nach `businessId`), damit Punkt 3 wirklich
 * geprüft wird und nicht nur die Form des Aufrufs. `requireVenueAccess` und der
 * gesamte Insights-Motor laufen ECHT mit.
 */
import { beforeEach, describe, expect, it, vi } from "vitest";
import express from "express";
import request from "supertest";

const { prismaMock } = vi.hoisted(() => ({
  prismaMock: {
    business: { findUniqueOrThrow: vi.fn() },
    businessMember: { findUnique: vi.fn(), findMany: vi.fn() },
    maitrReview: { findMany: vi.fn() },
    maitrEngagementPoint: { findMany: vi.fn() },
    maitrGuest: { findMany: vi.fn() },
    reservation: { findMany: vi.fn() },
    taskDecision: { findMany: vi.fn(), upsert: vi.fn() },
    insightsCache: { findUnique: vi.fn(), upsert: vi.fn(), deleteMany: vi.fn() },
  },
}));

vi.mock("../db/prisma", () => ({ default: prismaMock, prisma: prismaMock }));

import { briefingRouter } from "../maitr/routes";
import { createServer } from "../index";

const ICH = "user-wirt";
const MEIN_BETRIEB = "biz-goldstueck";
/** Der fremde Betrieb - seine ID steht öffentlich in /venues/:slug/public. */
const FREMDER_BETRIEB = "biz-nachbar";

/** Die Bewertung, aus der `buildInsights` die Aufgabe `review_<id>` erzeugt. */
const REVIEW_ID = "rev-001";
const AUFGABE = `review_${REVIEW_ID}`;

const TAG_MS = 86_400_000;

/**
 * Zeilen der Entscheidungstabelle, nach Betrieb getrennt - wie in der echten DB.
 * Der Mock liest daraus, statt eine feste Liste zurückzugeben; nur so fällt auf,
 * wenn der Code den `businessId`-Filter verlöre.
 */
let entscheidungen: Record<string, Record<string, unknown>[]>;

function appAlsAngemeldet() {
  const app = express();
  app.use(express.json());
  app.use((req, _res, next) => {
    (req as express.Request & { userId?: string }).userId = ICH;
    next();
  });
  app.use("/briefing", briefingRouter);
  return app;
}

beforeEach(() => {
  vi.clearAllMocks();
  entscheidungen = { [MEIN_BETRIEB]: [], [FREMDER_BETRIEB]: [] };

  // Ich bin Mitglied in MEIN_BETRIEB und sonst nirgends.
  prismaMock.businessMember.findUnique.mockImplementation(
    async ({ where }: { where: { userId_businessId: { userId: string; businessId: string } } }) =>
      where.userId_businessId.userId === ICH && where.userId_businessId.businessId === MEIN_BETRIEB
        ? { userId: ICH, businessId: MEIN_BETRIEB }
        : null,
  );
  prismaMock.businessMember.findMany.mockResolvedValue([{ businessId: MEIN_BETRIEB }]);

  prismaMock.business.findUniqueOrThrow.mockImplementation(
    async ({ where }: { where: { id: string } }) => ({
      id: where.id,
      name: "Café Goldstück",
      tagline: "Spezialitätenkaffee",
      timezone: "Europe/Berlin",
      tags: ["kaffee"],
      averageCheck: 9,
      profileSignals: null,
    }),
  );

  // Eine unbeantwortete Bewertung → genau eine `review_`-Aufgabe. Alles andere leer,
  // damit die Aufgabenliste überschaubar bleibt.
  prismaMock.maitrReview.findMany.mockResolvedValue([
    {
      id: REVIEW_ID,
      source: "google",
      rating: 2,
      text: "Der Kaffee war kalt und die Wartezeit lang.",
      createdAtSource: new Date(Date.now() - 2 * TAG_MS),
      repliedAt: null,
    },
  ]);
  prismaMock.maitrEngagementPoint.findMany.mockResolvedValue([]);
  prismaMock.maitrGuest.findMany.mockResolvedValue([]);
  prismaMock.reservation.findMany.mockResolvedValue([]);

  // Verhält sich wie die echte Tabelle: liefert NUR Zeilen des angefragten Betriebs.
  prismaMock.taskDecision.findMany.mockImplementation(
    async ({ where }: { where: { businessId: string } }) => entscheidungen[where.businessId] ?? [],
  );
  prismaMock.taskDecision.upsert.mockImplementation(
    async ({
      where,
      create,
      update,
    }: {
      where: { businessId_taskId: { businessId: string; taskId: string } };
      create: Record<string, unknown>;
      update: Record<string, unknown>;
    }) => {
      const { businessId, taskId } = where.businessId_taskId;
      const bestand = entscheidungen[businessId] ?? (entscheidungen[businessId] = []);
      const vorhanden = bestand.find((z) => z.taskId === taskId);
      if (vorhanden) return Object.assign(vorhanden, update);
      const neu = { draft: null, state: "OPEN", decidedAt: null, reopenAt: null, ...create };
      bestand.push(neu);
      return neu;
    },
  );

  prismaMock.insightsCache.findUnique.mockResolvedValue(null);
  prismaMock.insightsCache.upsert.mockResolvedValue({});
  prismaMock.insightsCache.deleteMany.mockResolvedValue({ count: 1 });
});

/** Die Aufgabenkennungen, die `GET /briefing/today` gerade als offen ausliefert. */
async function offeneAufgaben(): Promise<string[]> {
  const res = await request(appAlsAngemeldet()).get(`/briefing/today?venueId=${MEIN_BETRIEB}`);
  expect(res.status, JSON.stringify(res.body)).toBe(200);
  return (res.body.tasks as { id: string }[]).map((t) => t.id);
}

describe("POST /briefing/tasks/:taskId/approve", () => {
  it("persistiert die Freigabe im geprüften Betrieb - ohne dass der Client eine venueId schickt", async () => {
    // Genau die Form aus packages/core/src/api/index.ts: kein Rumpf, keine Query.
    const res = await request(appAlsAngemeldet()).post(`/briefing/tasks/${AUFGABE}/approve`);

    expect(res.status, JSON.stringify(res.body)).toBe(200);
    expect(res.body.id).toBe(AUFGABE);
    expect(res.body.state).toBe("approved");
    expect(typeof res.body.decidedAt).toBe("string");

    // Geschrieben wird in den Betrieb aus der Mitgliedschaft, mit dem handelnden Nutzer.
    expect(prismaMock.taskDecision.upsert).toHaveBeenCalledTimes(1);
    const arg = prismaMock.taskDecision.upsert.mock.calls[0][0];
    expect(arg.where).toEqual({ businessId_taskId: { businessId: MEIN_BETRIEB, taskId: AUFGABE } });
    expect(arg.create).toMatchObject({
      businessId: MEIN_BETRIEB,
      taskId: AUFGABE,
      state: "APPROVED",
      decidedByUserId: ICH,
    });
    // Wiedervorlage gesetzt (ca. +7 Tage) - solange es keinen Veröffentlichungsweg
    // gibt, darf eine Freigabe die Aufgabe nicht für immer verschwinden lassen.
    const reopen = (arg.create.reopenAt as Date).getTime() - Date.now();
    expect(reopen).toBeGreaterThan(6.9 * TAG_MS);
    expect(reopen).toBeLessThan(7.1 * TAG_MS);

    // Und der Cache ist weg, sonst zeigte der Startbildschirm bis zu 15 Minuten
    // weiter dieselbe Karte.
    expect(prismaMock.insightsCache.deleteMany).toHaveBeenCalledWith({
      where: { businessId: MEIN_BETRIEB },
    });
  });

  it("blendet die freigegebene Aufgabe danach aus dem Briefing aus", async () => {
    expect(await offeneAufgaben()).toContain(AUFGABE);

    await request(appAlsAngemeldet()).post(`/briefing/tasks/${AUFGABE}/approve`).expect(200);

    // Neu gerechnet, aus denselben Rohdaten - und die Aufgabe ist trotzdem weg.
    expect(await offeneAufgaben()).not.toContain(AUFGABE);
  });

  it("zeigt die Aufgabe nach Ablauf der Wiedervorlage wieder als offen", async () => {
    entscheidungen[MEIN_BETRIEB].push({
      taskId: AUFGABE,
      state: "APPROVED",
      draft: null,
      decidedAt: new Date(Date.now() - 8 * TAG_MS),
      reopenAt: new Date(Date.now() - TAG_MS),
    });

    expect(await offeneAufgaben()).toContain(AUFGABE);
  });

  it("ist idempotent: zweimal freigeben legt keine zweite Zeile an", async () => {
    await request(appAlsAngemeldet()).post(`/briefing/tasks/${AUFGABE}/approve`).expect(200);
    await request(appAlsAngemeldet()).post(`/briefing/tasks/${AUFGABE}/approve`).expect(200);

    expect(entscheidungen[MEIN_BETRIEB]).toHaveLength(1);
  });

  it("legt für eine erfundene Aufgabenkennung nichts an", async () => {
    const res = await request(appAlsAngemeldet()).post("/briefing/tasks/review_gibtsnicht/approve");

    expect(res.status).toBe(404);
    expect(prismaMock.taskDecision.upsert).not.toHaveBeenCalled();
  });

  it("weist eine formwidrige Kennung ab, bevor irgendetwas gerechnet wird", async () => {
    const res = await request(appAlsAngemeldet()).post("/briefing/tasks/review%20r1/approve");

    expect(res.status).toBe(400);
    expect(prismaMock.taskDecision.upsert).not.toHaveBeenCalled();
  });
});

describe("PATCH /briefing/tasks/:taskId", () => {
  it("speichert den Entwurf, hält die Aufgabe aber offen", async () => {
    const res = await request(appAlsAngemeldet())
      .patch(`/briefing/tasks/${AUFGABE}`)
      .send({ draft: "Das tut uns leid - melden Sie sich gern direkt bei uns." });

    expect(res.status, JSON.stringify(res.body)).toBe(200);
    expect(res.body.state).toBe("open");
    expect(res.body.draft).toBe("Das tut uns leid - melden Sie sich gern direkt bei uns.");
    expect(res.body.decidedAt).toBeUndefined();

    // Bearbeiten ist keine Freigabe: die Aufgabe steht weiter im Briefing - und zwar
    // mit dem bearbeiteten Text, sonst wäre die Arbeit beim nächsten Laden weg.
    const res2 = await request(appAlsAngemeldet()).get(`/briefing/today?venueId=${MEIN_BETRIEB}`);
    const aufgabe = (res2.body.tasks as { id: string; draft?: string }[]).find((t) => t.id === AUFGABE);
    expect(aufgabe?.draft).toBe("Das tut uns leid - melden Sie sich gern direkt bei uns.");
  });

  it("lehnt einen leeren Entwurf ab, bevor geschrieben wird", async () => {
    const res = await request(appAlsAngemeldet()).patch(`/briefing/tasks/${AUFGABE}`).send({ draft: "" });

    expect(res.status).toBe(422);
    expect(prismaMock.taskDecision.upsert).not.toHaveBeenCalled();
  });
});

describe("Mandantentrennung", () => {
  it("lässt die Entscheidung eines fremden Betriebs nicht auf mein Briefing durchschlagen", async () => {
    // Der Nachbar hat dieselbe Aufgabenkennung freigegeben (geteilte Google-Konten
    // machen gleiche externe IDs möglich). Mein Briefing darf das nicht sehen.
    entscheidungen[FREMDER_BETRIEB].push({
      taskId: AUFGABE,
      state: "APPROVED",
      draft: "Antwort des Nachbarn",
      decidedAt: new Date(),
      reopenAt: new Date(Date.now() + 7 * TAG_MS),
    });

    expect(await offeneAufgaben()).toContain(AUFGABE);
    // Der Filter steht IN der Abfrage, nicht in einem Schritt danach.
    expect(prismaMock.taskDecision.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { businessId: MEIN_BETRIEB } }),
    );
  });

  it("schreibt keine Entscheidung in einen fremden Betrieb", async () => {
    const res = await request(appAlsAngemeldet())
      .post(`/briefing/tasks/${AUFGABE}/approve?venueId=${FREMDER_BETRIEB}`);

    expect(res.status).toBe(403);
    expect(prismaMock.taskDecision.upsert).not.toHaveBeenCalled();
    expect(entscheidungen[FREMDER_BETRIEB]).toHaveLength(0);
  });

  it("weist widersprüchliche venueId-Quellen mit 400 ab", async () => {
    const res = await request(appAlsAngemeldet())
      .patch(`/briefing/tasks/${AUFGABE}?venueId=${MEIN_BETRIEB}`)
      .send({ venueId: FREMDER_BETRIEB, draft: "x" });

    expect(res.status).toBe(400);
    expect(prismaMock.businessMember.findUnique).not.toHaveBeenCalled();
    expect(prismaMock.taskDecision.upsert).not.toHaveBeenCalled();
  });

  it("rät den Betrieb nicht, wenn der Nutzer in mehreren Mitglied ist", async () => {
    prismaMock.businessMember.findMany.mockResolvedValue([
      { businessId: MEIN_BETRIEB },
      { businessId: "biz-zweiter-laden" },
    ]);

    const res = await request(appAlsAngemeldet()).post(`/briefing/tasks/${AUFGABE}/approve`);

    expect(res.status).toBe(400);
    expect(prismaMock.taskDecision.upsert).not.toHaveBeenCalled();
  });
});

describe("beide Routen hängen in der ECHTEN App hinter der Anmeldung", () => {
  const app = createServer();

  it.each([
    { method: "post" as const, path: `/api/maitr/briefing/tasks/${AUFGABE}/approve` },
    { method: "patch" as const, path: `/api/maitr/briefing/tasks/${AUFGABE}` },
  ])("$method $path → 401 ohne Token", async ({ method, path }) => {
    const res = await request(app)[method](path).send({ draft: "x" });

    expect(res.status, `Antwort war ${res.status}: ${JSON.stringify(res.body)}`).toBe(401);
    expect(prismaMock.taskDecision.upsert).not.toHaveBeenCalled();
  });
});
