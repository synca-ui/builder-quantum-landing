// @vitest-environment node
/**
 * Den ersten eigenen Betrieb anlegen (`POST /venues` in `server/maitr/routes.ts`).
 *
 * ANLASS: In der Produktivdatenbank stehen 0 Zeilen in `Business` und 0 in
 * `BusinessMember`. Ein echter Nutzer meldet sich an, hat keine Mitgliedschaft - und
 * bekommt von jeder betriebsgebundenen Route 403 "Kein Zugriff auf diesen Betrieb".
 * Es fehlte schlicht die eine Route, mit der überhaupt etwas Eigenes entsteht.
 *
 * Diese Datei prüft die vier Eigenschaften, an denen der Bau steht oder fällt:
 *
 *  1. Betrieb UND Mitgliedschaft entstehen - mit Rolle OWNER, an DEN angemeldeten
 *     Nutzer gehängt, nicht an eine Kennung aus der Anfrage.
 *  2. Die Adresse (slug) ist eindeutig; bei Kollision wird der nächste Kandidat aus
 *     `shared/subdomain.ts` genommen, nicht der fremde Betrieb übernommen.
 *  3. Ein zweiter Nutzer sieht den Betrieb NICHT.
 *  4. Scheitert ein Teil, bleibt KEIN halber Zustand zurück - kein Betrieb ohne
 *     Mitglied, an den danach niemand mehr herankommt.
 *
 * Dazu der Fall, um den es beim Anlegen wirklich geht: zweimal getippt.
 *
 * Die Datenbank wird nie angefasst - Prisma ist gemockt. Der Mock ist hier aber kein
 * Attrappen-Rückgabewert, sondern ein winziger Speicher MIT Unique-Index auf `slug`
 * und MIT Rollback: `$transaction` sichert den Stand vor dem Callback und stellt ihn
 * bei einem Fehler wieder her. Nur deshalb kann Punkt 4 überhaupt etwas beweisen -
 * gegen einen Mock, der ohnehin nichts speichert, wäre "kein halber Zustand" eine
 * leere Behauptung.
 */
import { beforeEach, describe, expect, it, vi } from "vitest";
import express from "express";
import request from "supertest";

const { prismaMock } = vi.hoisted(() => ({
  prismaMock: {
    business: { findUnique: vi.fn() },
    businessMember: { findMany: vi.fn(), findUnique: vi.fn() },
    $transaction: vi.fn(),
  },
}));

vi.mock("../db/prisma", () => ({ default: prismaMock, prisma: prismaMock }));

import { venuesRouter } from "../maitr/routes";
import { maitrErrorHandler } from "../maitr/index";
import { createServer } from "../index";

/** Der angemeldete Nutzer. */
const ICH = "user-wirt";
/** Ein anderer Nutzer, der schon einen Betrieb hat. */
const NACHBAR = "user-nachbar";

interface BetriebZeile {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  tagline: string | null;
  timezone: string;
  tags: string[];
}
interface MitgliedZeile {
  userId: string;
  businessId: string;
  role: string;
}

/** Der "Datenbestand". Wird pro Test frisch aufgesetzt. */
let betriebe: BetriebZeile[];
let mitglieder: MitgliedZeile[];
/** Zählt JEDEN Schreibversuch - auch die, die zurückgerollt werden. */
let schreibversuche: { business: number; member: number };
/** Haken, um einen Fehler mitten in der Transaktion auszulösen. */
let memberCreateWirft: Error | null;

/** Ein Fehler in der Form, die Prisma bei verletztem Unique-Index liefert. */
function uniqueVerletzung(feld: string) {
  return Object.assign(new Error(`Unique constraint failed on the fields: (\`${feld}\`)`), {
    code: "P2002",
    meta: { target: [feld] },
  });
}

/**
 * Der Transaktions-Ausschnitt, den die Route benutzt - inklusive Unique-Index auf
 * `slug`. Ohne den Index könnte Punkt 2 nicht geprüft werden.
 */
function txSpiegel() {
  return {
    business: {
      create: async ({ data }: { data: Record<string, unknown> }) => {
        schreibversuche.business++;
        if (betriebe.some((b) => b.slug === data.slug)) throw uniqueVerletzung("slug");
        const zeile: BetriebZeile = {
          id: `biz-${betriebe.length + 1}`,
          description: null,
          tagline: null,
          timezone: "Europe/Berlin",
          tags: [],
          ...(data as unknown as Partial<BetriebZeile>),
        } as BetriebZeile;
        betriebe = [...betriebe, zeile];
        return zeile;
      },
    },
    businessMember: {
      findFirst: async ({ where }: { where: { userId: string } }) => {
        const m = mitglieder.find((x) => x.userId === where.userId);
        if (!m) return null;
        return { ...m, business: betriebe.find((b) => b.id === m.businessId)! };
      },
      create: async ({ data }: { data: MitgliedZeile }) => {
        schreibversuche.member++;
        if (memberCreateWirft) throw memberCreateWirft;
        mitglieder = [...mitglieder, data];
        return data;
      },
    },
  };
}

/** Mini-App wie in maitrReservations.spec.ts: angemeldet, ohne echtes Clerk-Token. */
function appAls(userId: string) {
  const app = express();
  app.use(express.json());
  app.use((req, _res, next) => {
    (req as express.Request & { userId?: string }).userId = userId;
    next();
  });
  app.use("/venues", venuesRouter);
  // Wie in server/maitr/index.ts: die Fehler-Middleware ganz zum Schluss.
  app.use(maitrErrorHandler);
  return app;
}

beforeEach(() => {
  vi.clearAllMocks();
  betriebe = [];
  mitglieder = [];
  schreibversuche = { business: 0, member: 0 };
  memberCreateWirft = null;

  prismaMock.$transaction.mockImplementation(async (fn: (tx: unknown) => Promise<unknown>) => {
    // ROLLBACK ECHT NACHBILDEN: Stand sichern, und bei einem Fehler im Callback
    // exakt diesen Stand wiederherstellen. Genau das macht eine Transaktion, und
    // genau daran hängt der Test "kein halber Zustand".
    const sicherungBetriebe = betriebe;
    const sicherungMitglieder = mitglieder;
    try {
      return await fn(txSpiegel());
    } catch (err) {
      betriebe = sicherungBetriebe;
      mitglieder = sicherungMitglieder;
      throw err;
    }
  });

  // GET /venues liest denselben Speicher - so prüft der Test die Sichtbarkeit
  // und nicht eine zweite, ausgedachte Liste.
  prismaMock.businessMember.findMany.mockImplementation(
    async ({ where }: { where: { userId: string } }) =>
      mitglieder
        .filter((m) => m.userId === where.userId)
        .map((m) => ({ ...m, business: betriebe.find((b) => b.id === m.businessId)! })),
  );
});

describe("POST /venues - der erste eigene Betrieb", () => {
  it("legt Betrieb UND Mitgliedschaft an und liefert die Vertragsform zurück", async () => {
    const res = await request(appAls(ICH))
      .post("/venues")
      .send({ name: "Café Müller", description: "Kaffee und Kuchen" });

    expect(res.status, JSON.stringify(res.body)).toBe(201);
    // Die Form aus @maitr/core/types#Venue, nicht die rohe Zeile (kein slug, keine
    // Beschreibung - dieselbe Form, die GET /venues liefert).
    expect(res.body).toEqual({
      id: "biz-1",
      name: "Café Müller",
      timezone: "Europe/Berlin",
      tags: [],
    });

    // Beides ist da - und die Mitgliedschaft hängt am ANGEMELDETEN Nutzer.
    expect(betriebe).toHaveLength(1);
    expect(mitglieder).toEqual([
      { userId: ICH, businessId: "biz-1", role: "OWNER" },
    ]);
    // Rolle OWNER ausdrücklich: die Vorgabe des Modells wäre STAFF.
    expect(mitglieder[0].role).toBe("OWNER");
    // Die Beschreibung landet in der Zeile, auch wenn sie nicht zurückkommt.
    expect(betriebe[0].description).toBe("Kaffee und Kuchen");
    // Und beides lief in EINER Transaktion, nicht in zwei Aufrufen nacheinander.
    expect(prismaMock.$transaction).toHaveBeenCalledTimes(1);
  });

  it("leitet die Adresse mit den GEMEINSAMEN Regeln ab (Umlaute ausgeschrieben)", async () => {
    await request(appAls(ICH)).post("/venues").send({ name: "Café Müller" });

    // suggestSubdomain aus shared/subdomain.ts - nicht "caf-m-ller".
    expect(betriebe[0].slug).toBe("cafe-mueller");
  });

  it("übernimmt eine genannte Zeitzone und weist eine erfundene ab", async () => {
    const ok = await request(appAls(ICH))
      .post("/venues")
      .send({ name: "Bar Wien", timezone: "Europe/Vienna" });
    expect(ok.status).toBe(201);
    expect(betriebe[0].timezone).toBe("Europe/Vienna");

    betriebe = [];
    mitglieder = [];
    const kaputt = await request(appAls(ICH))
      .post("/venues")
      .send({ name: "Bar Mordor", timezone: "Mordor/Barad-dur" });

    expect(kaputt.status).toBe(422);
    // Nichts geschrieben: Die Zone trägt später jede Tageslogik.
    expect(schreibversuche.business).toBe(1); // nur der erfolgreiche Lauf oben
    expect(betriebe).toHaveLength(0);
  });

  it("weicht auf den nächsten Kandidaten aus, wenn die Adresse vergeben ist", async () => {
    // Der Nachbar hat "cafe-mueller" schon.
    betriebe = [
      {
        id: "biz-nachbar",
        slug: "cafe-mueller",
        name: "Café Müller",
        description: null,
        tagline: null,
        timezone: "Europe/Berlin",
        tags: [],
      },
    ];
    mitglieder = [{ userId: NACHBAR, businessId: "biz-nachbar", role: "OWNER" }];

    const res = await request(appAls(ICH)).post("/venues").send({ name: "Café Müller" });

    expect(res.status, JSON.stringify(res.body)).toBe(201);
    // nextSubdomainCandidate(basis, 1) - nicht der fremde Betrieb.
    expect(betriebe.map((b) => b.slug)).toEqual(["cafe-mueller", "cafe-mueller-2"]);
    expect(res.body.id).not.toBe("biz-nachbar");
    // Der fremde Betrieb hat KEIN neues Mitglied bekommen.
    expect(mitglieder.filter((m) => m.businessId === "biz-nachbar")).toEqual([
      { userId: NACHBAR, businessId: "biz-nachbar", role: "OWNER" },
    ]);
  });

  it("gibt auf, statt endlos Kandidaten zu probieren", async () => {
    // Alle zehn Kandidaten (Stamm + "-2" bis "-10") sind vergeben.
    betriebe = ["zur-post", ...Array.from({ length: 9 }, (_, i) => `zur-post-${i + 2}`)].map(
      (slug, i) => ({
        id: `fremd-${i}`,
        slug,
        name: "Zur Post",
        description: null,
        tagline: null,
        timezone: "Europe/Berlin",
        tags: [],
      }),
    );

    const res = await request(appAls(ICH)).post("/venues").send({ name: "Zur Post" });

    expect(res.status).toBe(409);
    expect(String(res.body.error)).toMatch(/Adresse/);
    expect(betriebe).toHaveLength(10);
    expect(mitglieder).toHaveLength(0);
  });

  it("lehnt einen zweiten Betrieb ab und nennt den vorhandenen", async () => {
    const erste = await request(appAls(ICH)).post("/venues").send({ name: "Café Müller" });
    expect(erste.status).toBe(201);

    const zweite = await request(appAls(ICH)).post("/venues").send({ name: "Zweite Filiale" });

    expect(zweite.status).toBe(409);
    // Der vorhandene Betrieb kommt mit - der Client muss daraus keine Sackgasse machen.
    expect(zweite.body.venue).toEqual(erste.body);
    // Und es wurde NICHTS geschrieben: der Betrieb ist nicht wieder loszuwerden.
    expect(betriebe).toHaveLength(1);
    expect(mitglieder).toHaveLength(1);
    expect(schreibversuche.business).toBe(1);
  });

  it("zweimal getippt ergibt genau einen Betrieb", async () => {
    const app = appAls(ICH);
    const erste = await request(app).post("/venues").send({ name: "Café Müller" });
    const zweite = await request(app).post("/venues").send({ name: "Café Müller" });

    expect(erste.status).toBe(201);
    expect(zweite.status).toBe(409);
    expect(betriebe).toHaveLength(1);
    expect(mitglieder).toHaveLength(1);
    // Kein "cafe-mueller-2" als stiller zweiter Betrieb.
    expect(betriebe.map((b) => b.slug)).toEqual(["cafe-mueller"]);
  });

  it("erkennt den Doppeltipp auch dann, wenn er erst an der Adresse auffällt", async () => {
    // Das echte Wettrennen: Beim ersten Durchlauf sieht die Anfrage noch keine
    // Mitgliedschaft (der Gewinner hatte noch nicht committet), läuft aber in die
    // Unique-Verletzung auf slug. Postgres lässt den INSERT bis zum Commit des
    // Gewinners warten - beim nächsten Durchlauf ist dessen Mitgliedschaft da.
    // Genau dieser Ablauf wird hier nachgestellt.
    let durchlauf = 0;
    prismaMock.$transaction.mockImplementation(async (fn: (tx: unknown) => Promise<unknown>) => {
      const tx = txSpiegel();
      if (durchlauf++ === 0) {
        // Der Gewinner "committet" mitten im ersten Versuch.
        betriebe = [
          {
            id: "biz-gewinner",
            slug: "cafe-mueller",
            name: "Café Müller",
            description: null,
            tagline: null,
            timezone: "Europe/Berlin",
            tags: [],
          },
        ];
        mitglieder = [{ userId: ICH, businessId: "biz-gewinner", role: "OWNER" }];
        // ... aber erst NACHDEM diese Anfrage die Mitgliedschaft schon gelesen hat.
        const blind = {
          ...tx,
          businessMember: { ...tx.businessMember, findFirst: async () => null },
        };
        return await fn(blind);
      }
      return await fn(tx);
    });

    const res = await request(appAls(ICH)).post("/venues").send({ name: "Café Müller" });

    expect(res.status).toBe(409);
    expect(res.body.venue.id).toBe("biz-gewinner");
    // Der zweite Durchlauf hat NICHT auf "cafe-mueller-2" ausweichen dürfen.
    expect(betriebe).toHaveLength(1);
    expect(mitglieder).toHaveLength(1);
  });

  it("hinterlässt keinen halben Zustand, wenn die Mitgliedschaft scheitert", async () => {
    // Der gefährlichste Fall: Betrieb angelegt, Mitgliedschaft nicht. An so einen
    // Betrieb käme niemand mehr heran, und der Nutzer wird ihn nicht wieder los.
    memberCreateWirft = new Error("Verbindung zur Datenbank verloren");
    const logSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    const res = await request(appAls(ICH)).post("/venues").send({ name: "Café Müller" });

    expect(res.status).toBe(500);
    // Nichtssagende Antwort - keine Datenbankmeldung nach aussen.
    expect(res.body).toEqual({ error: "Interner Serverfehler" });
    expect(JSON.stringify(res.body)).not.toContain("Datenbank");
    // Versucht wurde beides, geblieben ist nichts.
    expect(schreibversuche).toEqual({ business: 1, member: 1 });
    expect(betriebe).toEqual([]);
    expect(mitglieder).toEqual([]);

    // Und der Nutzer sieht danach weiterhin keinen Betrieb - kein Geisterbetrieb.
    const liste = await request(appAls(ICH)).get("/venues");
    expect(liste.body).toEqual([]);

    logSpy.mockRestore();
  });

  it("prüft die Eingabe, bevor irgendetwas geschrieben wird", async () => {
    const app = appAls(ICH);
    const leer = await request(app).post("/venues").send({ name: "  " });
    const ohne = await request(app).post("/venues").send({});

    expect(leer.status).toBe(422);
    expect(ohne.status).toBe(422);
    expect(schreibversuche.business).toBe(0);
    expect(betriebe).toEqual([]);
  });

  it("lehnt einen Namen ab, aus dem sich keine Adresse ableiten lässt", async () => {
    // "demo" ist in RESERVED_SUBDOMAINS - suggestSubdomain liefert null. Lieber
    // nachfragen als eine Adresse erfinden, die der Betrieb nie gewählt hat.
    const res = await request(appAls(ICH)).post("/venues").send({ name: "Demo" });

    expect(res.status).toBe(422);
    expect(schreibversuche.business).toBe(0);
  });
});

describe("Sichtbarkeit", () => {
  it("ein zweiter Nutzer sieht den fremden Betrieb NICHT", async () => {
    const angelegt = await request(appAls(ICH)).post("/venues").send({ name: "Café Müller" });
    expect(angelegt.status).toBe(201);

    const meine = await request(appAls(ICH)).get("/venues");
    const fremde = await request(appAls(NACHBAR)).get("/venues");

    expect(meine.body).toEqual([angelegt.body]);
    expect(fremde.body).toEqual([]);
  });

  it("hängt den Betrieb an den angemeldeten Nutzer, nicht an eine Kennung aus der Anfrage", async () => {
    // Mitgeschickte Fremdkennungen dürfen nichts bewirken - weder userId noch venueId.
    const res = await request(appAls(ICH))
      .post("/venues")
      .send({ name: "Café Müller", userId: NACHBAR, venueId: "biz-fremd" });

    expect(res.status).toBe(201);
    expect(mitglieder).toEqual([{ userId: ICH, businessId: "biz-1", role: "OWNER" }]);
  });
});

describe("die Route hängt in der ECHTEN App hinter der Anmeldung", () => {
  const app = createServer();

  it("POST /api/maitr/venues → 401 ohne Token", async () => {
    const res = await request(app).post("/api/maitr/venues").send({ name: "Café Müller" });

    expect(res.status, `Antwort war ${res.status}: ${JSON.stringify(res.body)}`).toBe(401);
    expect(prismaMock.$transaction).not.toHaveBeenCalled();
  });
});
