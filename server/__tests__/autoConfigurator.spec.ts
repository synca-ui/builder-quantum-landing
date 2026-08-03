// @vitest-environment node
/**
 * Die Server-Kette des automatischen Modus, von POST /api/scraper bis zum
 * Polling auf GET /api/scraper/:id.
 *
 * Der Test geht bewusst über die ECHTE Express-App (createServer), nicht über
 * die einzelnen Handler: Genau an den Nähten ist bisher etwas verloren gegangen
 * – die Besitzprüfung hing an der Middleware, mapsLink und menuFile fielen
 * zwischen Formular und n8n heraus, und suggestedConfig kam je nach Spaltentyp
 * mal als Objekt und mal als String zurück.
 *
 * Gemockt ist nur, was es hier nicht geben kann: die Datenbank (Prisma), die
 * Clerk-Instanz und der ausgehende Aufruf zu n8n. Die Besitzlogik selbst wird
 * NICHT gemockt – die Prisma-Attrappe filtert wirklich nach `where`, damit ein
 * fehlender userId-Filter im Produktivcode hier auffliegt statt durchzurutschen.
 */
import { beforeEach, describe, expect, it, vi } from "vitest";
import request from "supertest";
import { Prisma } from "@prisma/client";

// ============================================================
// Umgebung: muss stehen, BEVOR die Module geladen werden
// ============================================================

// utils/clerk.ts liest CLERK_SECRET_KEY beim Import in eine Modulkonstante.
// Ohne diesen Wert würde verifyClerkToken sofort werfen und jeder Request
// endete in 401 – auch der, der eigentlich durchgehen soll.
vi.hoisted(() => {
  process.env.CLERK_SECRET_KEY = "sk_test_attrappe";
  process.env.DATABASE_URL ||= "postgresql://ci:ci@localhost:5432/ci";
});

// ============================================================
// Attrappen
// ============================================================

const { prismaMock, verifyTokenMock, getUserMock, db } = vi.hoisted(() => {
  const db = { scraperJobs: [] as Record<string, any>[], seq: 0 };

  /** Prismas `where` nachgebildet: alle angegebenen Felder müssen passen. */
  const matches = (row: Record<string, any>, where: Record<string, any> = {}) =>
    Object.entries(where).every(([key, value]) => row[key] === value);

  const prismaMock = {
    user: { findUnique: vi.fn(), create: vi.fn(), update: vi.fn() },
    auditLog: { create: vi.fn(async () => ({})) },
    configuration: { findFirst: vi.fn(), create: vi.fn(), update: vi.fn() },
    scraperJob: {
      findUnique: vi.fn(
        async ({ where }: any) =>
          db.scraperJobs.find((r) => matches(r, where)) ?? null,
      ),
      findFirst: vi.fn(
        async ({ where }: any) =>
          db.scraperJobs.find((r) => matches(r, where)) ?? null,
      ),
      findMany: vi.fn(async ({ where }: any) =>
        db.scraperJobs.filter((r) => matches(r, where)),
      ),
      create: vi.fn(async ({ data }: any) => {
        const row = {
          id: `job-${++db.seq}`,
          maitrScore: null,
          email: null,
          phone: null,
          instagramUrl: null,
          menuUrl: null,
          hasReservation: false,
          analysisFeedback: null,
          isDeepScrapeReady: false,
          extractedData: null,
          suggestedConfig: null,
          createdAt: new Date(),
          startedAt: null,
          completedAt: null,
          userId: null,
          ...data,
        };
        db.scraperJobs.push(row);
        return row;
      }),
      update: vi.fn(async ({ where, data }: any) => {
        const row = db.scraperJobs.find((r) => matches(r, where));
        if (!row) throw new Error(`update: keine Zeile für ${JSON.stringify(where)}`);
        // Prisma.DbNull ist ein Sentinel-Objekt, in der Spalte landet SQL NULL.
        for (const [key, value] of Object.entries(data)) {
          row[key] =
            value === Prisma.DbNull || value === Prisma.JsonNull ? null : value;
        }
        return row;
      }),
    },
  };

  return {
    db,
    prismaMock,
    verifyTokenMock: vi.fn(),
    getUserMock: vi.fn(),
  };
});

// scraper.ts importiert den Default-Export, scraperJobsRoute.ts den benannten.
vi.mock("../db/prisma", () => ({ default: prismaMock, prisma: prismaMock }));
vi.mock("@clerk/clerk-sdk-node", () => ({
  verifyToken: verifyTokenMock,
  clerkClient: { users: { getUser: getUserMock } },
}));

const { createServer } = await import("../index");

const app = createServer();

// ============================================================
// Testdaten
// ============================================================

const OWNER = {
  id: "user-owner",
  clerkId: "clerk_owner",
  email: "owner@example.de",
  token: "token-owner",
};
const STRANGER = {
  id: "user-stranger",
  clerkId: "clerk_stranger",
  email: "stranger@example.de",
  token: "token-stranger",
};
const USERS = [OWNER, STRANGER];

const WEBHOOK = "https://n8n.example.de/webhook/entry";
const SITE = "https://kleiner-kiepenkerl.de";

/** Was der Deep-Scrape-Flow am Ende in die Spalte schreibt. */
const SUGGESTED = {
  businessName: "Kleiner Kiepenkerl",
  primaryColor: "#660c21",
  phone: "0251 43416",
};

const auth = (token: string) => ["Authorization", `Bearer ${token}`] as const;

/** Antwort einer zufriedenen n8n-Instanz. */
const n8nOk = () => ({ ok: true, status: 200, text: async () => "" });

let fetchMock: ReturnType<typeof vi.fn>;

beforeEach(() => {
  vi.clearAllMocks();
  db.scraperJobs.length = 0;
  db.seq = 0;

  process.env.N8N_WEBHOOK_URL = WEBHOOK;

  verifyTokenMock.mockImplementation(async (token: string) => {
    const user = USERS.find((u) => u.token === token);
    if (!user) throw new Error("Invalid token");
    return { sub: user.clerkId, email: user.email };
  });
  prismaMock.user.findUnique.mockImplementation(
    async ({ where }: any) =>
      USERS.find(
        (u) => u.clerkId === where.clerkId || u.email === where.email,
      ) ?? null,
  );
  prismaMock.auditLog.create.mockResolvedValue({});

  fetchMock = vi.fn(async () => n8nOk());
  vi.stubGlobal("fetch", fetchMock);
});

/** Legt eine fertige Zeile direkt in die Attrappe, ohne den Weg über n8n. */
function seedJob(overrides: Record<string, any> = {}) {
  const row = {
    id: `seed-${++db.seq}`,
    status: "completed",
    businessName: "Kleiner Kiepenkerl",
    businessType: "restaurant",
    websiteUrl: SITE,
    userId: OWNER.id,
    maitrScore: 72,
    email: "info@kleiner-kiepenkerl.de",
    phone: "0251 43416",
    instagramUrl: null,
    menuUrl: null,
    hasReservation: true,
    analysisFeedback: "Solide Basis",
    isDeepScrapeReady: true,
    extractedData: null,
    suggestedConfig: null,
    createdAt: new Date(),
    startedAt: new Date(),
    completedAt: new Date(),
    ...overrides,
  };
  db.scraperJobs.push(row);
  return row;
}

/** Der Body, den der Server an n8n geschickt hat. */
const n8nBody = (call = 0) => JSON.parse(fetchMock.mock.calls[call][1].body);

// ============================================================
// 1 + 2: Anlegen
// ============================================================

describe("POST /api/scraper – Auftrag anlegen", () => {
  it("ohne Token: 401, keine Zeile, kein n8n-Aufruf", async () => {
    const res = await request(app).post("/api/scraper").send({ websiteUrl: SITE });

    expect(res.status).toBe(401);
    // Ein Auftrag ohne Besitzer wäre schlimmer als gar keiner: Der Entry-Flow
    // upsertet auf websiteUrl und würde ihn nie wieder jemandem zuordnen.
    expect(prismaMock.scraperJob.create).not.toHaveBeenCalled();
    expect(db.scraperJobs).toHaveLength(0);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("mit Token: legt die Zeile mit der userId AUS DEM TOKEN an und triggert n8n genau einmal", async () => {
    const res = await request(app)
      .post("/api/scraper")
      .set(...auth(OWNER.token))
      .send({
        websiteUrl: SITE,
        // Der Versuch, sich per Body eine fremde Identität zu geben. Früher
        // bestimmte der Client seine userId selbst – hier darf davon nichts
        // ankommen.
        userId: STRANGER.id,
      });

    expect(res.status).toBe(201);
    expect(res.body.jobId).toBeTruthy();

    const created = prismaMock.scraperJob.create.mock.calls[0][0].data;
    expect(created.userId).toBe(OWNER.id);
    expect(created.userId).not.toBe(STRANGER.id);
    expect(created.websiteUrl).toBe(SITE);
    // Ohne Namen im Formular: der Hostname als Platzhalter, den der Flow später
    // überschreibt. Die Spalte ist NOT NULL.
    expect(created.businessName).toBe("kleiner-kiepenkerl.de");

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock.mock.calls[0][0]).toBe(WEBHOOK);
    // "link" und nichts anderes: Der Webhook-Knoten liest $json.body.link.
    // Unter einem anderen Namen liefe der Flow ohne URL los.
    expect(n8nBody().link).toBe(SITE);
    expect(n8nBody().deepScrape).toBe(true);

    // Die zurückgegebene jobId ist die, mit der der Client danach pollt.
    expect(res.body.jobId).toBe(db.scraperJobs[0].id);
    expect(res.body.n8nTriggered).toBe(true);
  });

  it("reicht mapsLink und menuFile an n8n durch (gingen vorher verloren)", async () => {
    const menuFile = { name: "speisekarte.pdf", base64: "JVBERi0xLjQK" };

    const res = await request(app)
      .post("/api/scraper")
      .set(...auth(OWNER.token))
      .send({
        websiteUrl: SITE,
        businessName: "Kleiner Kiepenkerl",
        mapsLink: "https://maps.app.goo.gl/abc123",
        menuFile,
      });

    expect(res.status).toBe(201);
    expect(fetchMock).toHaveBeenCalledTimes(1);

    const body = n8nBody();
    expect(body.mapsLink).toBe("https://maps.app.goo.gl/abc123");
    expect(body.menuFile).toEqual(menuFile);
    expect(body.businessName).toBe("Kleiner Kiepenkerl");
  });

  it("ohne N8N_WEBHOOK_URL: 503, und zwar bevor irgendetwas geschrieben wird", async () => {
    delete process.env.N8N_WEBHOOK_URL;

    const res = await request(app)
      .post("/api/scraper")
      .set(...auth(OWNER.token))
      .send({ websiteUrl: SITE });

    // Kein stiller Erfolg: Eine angelegte Zeile ohne Flow dahinter hieße für den
    // Client sechs Minuten Pollen ins Leere.
    expect(res.status).toBe(503);
    expect(res.body.success).toBe(false);
    expect(prismaMock.scraperJob.create).not.toHaveBeenCalled();
    expect(db.scraperJobs).toHaveLength(0);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("n8n antwortet mit Fehler: Zeile bleibt bestehen, Client bekommt seine jobId", async () => {
    // Typischer Fall: Der Workflow ist nicht aktiv, der Webhook antwortet 404.
    fetchMock.mockResolvedValueOnce({
      ok: false,
      status: 404,
      text: async () => "workflow not registered",
    });

    const res = await request(app)
      .post("/api/scraper")
      .set(...auth(OWNER.token))
      .send({ websiteUrl: SITE });

    expect(res.status).toBe(201);
    expect(res.body.jobId).toBeTruthy();
    expect(res.body.n8nTriggered).toBe(false);
    expect(res.body.warning).toContain("404");

    // Die Zeile wird nicht zurückgerollt – ein späterer Neustart soll sie
    // wiederverwenden können.
    expect(db.scraperJobs).toHaveLength(1);
    // Ausdrückliche Absage von n8n = der Flow läuft sicher nicht.
    expect(db.scraperJobs[0].status).toBe("failed");
  });

  it("n8n läuft in die Zeitüberschreitung: bleibt 'processing', nicht 'failed'", async () => {
    fetchMock.mockRejectedValueOnce(
      new Error("The operation was aborted due to timeout"),
    );

    const res = await request(app)
      .post("/api/scraper")
      .set(...auth(OWNER.token))
      .send({ websiteUrl: SITE });

    expect(res.status).toBe(201);
    expect(res.body.jobId).toBeTruthy();
    expect(res.body.n8nTriggered).toBe(false);

    expect(db.scraperJobs).toHaveLength(1);
    // Bei einer Zeitüberschreitung kann der Flow trotzdem angelaufen sein.
    // "failed" wäre gelogen und der Client würfe ein Ergebnis weg, das gleich
    // eintrifft.
    expect(db.scraperJobs[0].status).toBe("processing");
  });

  it("fremde Zeile zur selben URL: 409, und die Antwort verrät die Job-ID nicht", async () => {
    seedJob({ userId: STRANGER.id, status: "processing" });

    const res = await request(app)
      .post("/api/scraper")
      .set(...auth(OWNER.token))
      .send({ websiteUrl: SITE });

    expect(res.status).toBe(409);
    expect(JSON.stringify(res.body)).not.toContain(db.scraperJobs[0].id);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("herrenlose Zeile (von n8n selbst angelegt): wird übernommen statt gesperrt", async () => {
    // Der Entry-Flow upsertet auf websiteUrl und schreibt userId NICHT. Diese
    // Zeilen zu blockieren würde den Auto-Konfigurator für praktisch jede URL
    // dauerhaft sperren, die schon einmal über die Landingpage lief.
    const alt = seedJob({ userId: null, status: "completed", suggestedConfig: SUGGESTED });

    const res = await request(app)
      .post("/api/scraper")
      .set(...auth(OWNER.token))
      .send({ websiteUrl: SITE });

    expect(res.status).toBe(201);
    expect(res.body.jobId).toBe(alt.id);
    expect(alt.userId).toBe(OWNER.id);
    // Das alte Ergebnis muss weg, sonst hält der Client es sofort für das neue.
    expect(alt.suggestedConfig).toBeNull();
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});

// ============================================================
// 6 + 7: Polling
// ============================================================

describe("GET /api/scraper/:id – Polling", () => {
  it("ohne Token: 401", async () => {
    const job = seedJob();

    const res = await request(app).get(`/api/scraper/${job.id}`);

    expect(res.status).toBe(401);
    expect(JSON.stringify(res.body)).not.toContain("kiepenkerl");
  });

  it("mit Token, aber fremde Zeile: 404 und keine Daten", async () => {
    const job = seedJob({ userId: OWNER.id, suggestedConfig: SUGGESTED });

    const res = await request(app)
      .get(`/api/scraper/${job.id}`)
      .set(...auth(STRANGER.token));

    expect(res.status).toBe(404);
    // "gibt es nicht" und "gehört jemand anderem" antworten absichtlich gleich.
    const body = JSON.stringify(res.body);
    expect(body).not.toContain("info@kleiner-kiepenkerl.de");
    expect(body).not.toContain("0251 43416");
    // Der Filter muss die userId wirklich enthalten – sonst greift die
    // Attrappe daneben und der Test wäre wertlos.
    expect(prismaMock.scraperJob.findFirst).toHaveBeenCalledWith({
      where: { id: job.id, userId: STRANGER.id },
    });
  });

  it("eigene Zeile: liefert suggestedConfig durch", async () => {
    const job = seedJob({ suggestedConfig: SUGGESTED });

    const res = await request(app)
      .get(`/api/scraper/${job.id}`)
      .set(...auth(OWNER.token));

    expect(res.status).toBe(200);
    expect(res.body.data.suggestedConfig).toEqual(SUGGESTED);
    expect(res.body.data.businessName).toBe("Kleiner Kiepenkerl");
  });

  it("suggestedConfig als String in der Spalte kommt trotzdem als Objekt an", async () => {
    // n8n schreibt JSON.stringify($json.suggestedConfig). Ob daraus ein Objekt
    // oder ein String in der Spalte wird, hängt an deren Typ (jsonb parst, text
    // nicht). Der Client darf davon nichts merken – er ruft sonst .businessName
    // auf einem String auf und bekommt undefined.
    const job = seedJob({ suggestedConfig: JSON.stringify(SUGGESTED) });

    const res = await request(app)
      .get(`/api/scraper/${job.id}`)
      .set(...auth(OWNER.token));

    expect(res.status).toBe(200);
    expect(typeof res.body.data.suggestedConfig).toBe("object");
    expect(res.body.data.suggestedConfig).toEqual(SUGGESTED);
  });

  it("noch kein Ergebnis: suggestedConfig ist null, nicht etwa ein leeres Objekt", async () => {
    // Das Fertigsignal des Clients ist genau dieses Feld – status setzt schon
    // der Entry-Flow auf "completed". Ein {} hier würde das Polling zu früh
    // beenden und eine leere Konfiguration übernehmen.
    const job = seedJob({ status: "completed", suggestedConfig: null });

    const res = await request(app)
      .get(`/api/scraper/${job.id}`)
      .set(...auth(OWNER.token));

    expect(res.status).toBe(200);
    expect(res.body.data.suggestedConfig).toBeNull();
  });

  it("kaputtes JSON in der Spalte reißt das Polling nicht ab", async () => {
    const job = seedJob({ suggestedConfig: "{ das ist kein json" });

    const res = await request(app)
      .get(`/api/scraper/${job.id}`)
      .set(...auth(OWNER.token));

    expect(res.status).toBe(200);
    expect(res.body.data.suggestedConfig).toBeNull();
  });
});

// ============================================================
// 8: Die abgesicherten Altrouten
// ============================================================

describe("Altrouten: abgesichert, aber der Score bleibt öffentlich", () => {
  it("GET /api/scraper-job/full ohne Token: 401", async () => {
    seedJob({ suggestedConfig: SUGGESTED });

    const res = await request(app).get(
      `/api/scraper-job/full?websiteUrl=${encodeURIComponent(SITE)}`,
    );

    expect(res.status).toBe(401);
    // Genau hier lagen früher E-Mail, Telefon und die komplette Analyse offen –
    // es genügte, die URL eines fremden Betriebs zu raten.
    const body = JSON.stringify(res.body);
    expect(body).not.toContain("info@kleiner-kiepenkerl.de");
    expect(body).not.toContain("0251 43416");
  });

  it("GET /api/scraper-jobs/:id ohne Token: 401", async () => {
    const job = seedJob({ suggestedConfig: SUGGESTED });

    const res = await request(app).get(`/api/scraper-jobs/${job.id}`);

    expect(res.status).toBe(401);
    expect(JSON.stringify(res.body)).not.toContain("info@kleiner-kiepenkerl.de");
  });

  it("GET /api/scraper-job/score bleibt offen – und gibt nur die Kennzahl heraus", async () => {
    // Gegenprobe: Der Hook läuft auf der Landingpage, bevor sich jemand
    // angemeldet hat. 401 wäre hier das FALSCHE Ergebnis.
    seedJob({ suggestedConfig: SUGGESTED });

    const res = await request(app).get(
      `/api/scraper-job/score?websiteUrl=${encodeURIComponent(SITE)}`,
    );

    expect(res.status).not.toBe(401);
    expect(res.status).toBe(200);
    expect(res.body.maitrScore).toBe(72);
    expect(res.body.status).toBe("completed");

    // Die Attrappe reicht bewusst die GANZE Zeile heraus (select wird ignoriert).
    // Der Endpunkt darf trotzdem nur vier Felder ausliefern – so fällt auf, wenn
    // dort jemals `res.json(job)` steht.
    expect(Object.keys(res.body).sort()).toEqual([
      "completedAt",
      "maitrScore",
      "startedAt",
      "status",
    ]);
    const body = JSON.stringify(res.body);
    expect(body).not.toContain("info@kleiner-kiepenkerl.de");
    expect(body).not.toContain("0251 43416");
    expect(body).not.toContain("Kiepenkerl");
  });

  it("GET /api/scraper-jobs/:id mit fremdem Token: 404, nicht die Daten", async () => {
    const job = seedJob({ userId: OWNER.id, suggestedConfig: SUGGESTED });

    const res = await request(app)
      .get(`/api/scraper-jobs/${job.id}`)
      .set(...auth(STRANGER.token));

    expect(res.status).toBe(404);
    expect(JSON.stringify(res.body)).not.toContain("info@kleiner-kiepenkerl.de");
  });
});
