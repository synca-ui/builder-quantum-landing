// @vitest-environment node
/**
 * Mandantentrennung der Reservierungs-Routen (`server/maitr/routes.ts`).
 *
 * Anlass: Die App ruft `POST /reservations/walk-in` und `DELETE /reservations/:id`
 * auf (`packages/core/src/api/index.ts`); serverseitig gab es beide nicht. Beim
 * Nachbauen sind genau zwei Dinge gefährlich, und die prüft diese Datei:
 *
 *  1. Der Walk-in nimmt eine Tisch-ID aus dem Rumpf entgegen. Ohne Prüfung könnte
 *     ein Mitglied von Betrieb A einen Gast an einen Tisch von Betrieb B hängen.
 *  2. Die Stornierung nimmt eine Reservierungs-ID aus dem Pfad entgegen. Ohne
 *     Bindung an den autorisierten Betrieb könnte jeder mit einer fremden ID eine
 *     fremde Buchung entfernen - die IDs sind nicht geheim.
 *
 * Dazu die Rückfallsicherung gegen die gerade geschlossene Lücke: Widersprechen
 * sich die venueId-Quellen, muss die Anfrage mit 400 enden statt sich still für
 * eine zu entscheiden.
 *
 * Die Datenbank wird nie angefasst - Prisma ist gemockt. Die Middleware
 * `requireVenueAccess` läuft dabei ECHT mit (sie fragt nur `businessMember`), damit
 * der Test die tatsächliche Zugriffskontrolle prüft und nicht eine nachgebaute.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import express from "express";
import request from "supertest";

const { prismaMock } = vi.hoisted(() => ({
  prismaMock: {
    businessMember: { findUnique: vi.fn(), findMany: vi.fn() },
    reservation: {
      create: vi.fn(),
      updateMany: vi.fn(),
      findMany: vi.fn(),
      findFirst: vi.fn(),
      findFirstOrThrow: vi.fn(),
    },
    business: { findUnique: vi.fn() },
    table: { findFirst: vi.fn() },
  },
}));

vi.mock("../db/prisma", () => ({ default: prismaMock, prisma: prismaMock }));

import { reservationsRouter, tagesbeginnIn } from "../maitr/routes";
import { createServer } from "../index";

/** Der angemeldete Nutzer und sein Betrieb. */
const ICH = "user-wirt";
const MEIN_BETRIEB = "biz-goldstueck";
/** Der fremde Betrieb - seine ID steht öffentlich in /venues/:slug/public. */
const FREMDER_BETRIEB = "biz-nachbar";
const FREMDE_RESERVIERUNG = "res-des-nachbarn";
const FREMDER_TISCH = "tisch-des-nachbarn";

/**
 * Mini-App mit gesetztem req.userId. `requireAuth` wird hier bewusst übersprungen
 * (bräuchte ein echtes Clerk-Token); dass die Routen in der ECHTEN App dahinter
 * hängen, prüft der 401-Block ganz unten gegen createServer().
 */
function appAlsAngemeldet() {
  const app = express();
  app.use(express.json());
  app.use((req, _res, next) => {
    (req as express.Request & { userId?: string }).userId = ICH;
    next();
  });
  app.use("/reservations", reservationsRouter);
  return app;
}

/** Eine Prisma-Zeile, wie `create` sie zurückgäbe. */
function zeile(overrides: Record<string, unknown> = {}) {
  return {
    id: "res-neu",
    businessId: MEIN_BETRIEB,
    tableId: "tisch-1",
    guestName: "Walk-in",
    guestPhone: null,
    guestCount: 2,
    reservationTime: new Date("2026-08-04T18:00:00.000Z"),
    duration: 120,
    status: "ARRIVED",
    source: "walk_in",
    ...overrides,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  // Standard: Ich bin Mitglied in MEIN_BETRIEB und sonst nirgends.
  prismaMock.businessMember.findUnique.mockImplementation(
    async ({ where }: { where: { userId_businessId: { userId: string; businessId: string } } }) =>
      where.userId_businessId.userId === ICH &&
      where.userId_businessId.businessId === MEIN_BETRIEB
        ? { userId: ICH, businessId: MEIN_BETRIEB }
        : null,
  );
});

describe("POST /reservations/walk-in", () => {
  it("legt den Walk-in im eigenen Betrieb an und liefert die Vertragsform zurück", async () => {
    prismaMock.table.findFirst.mockResolvedValue({ id: "tisch-1" });
    prismaMock.reservation.create.mockResolvedValue(zeile());

    const res = await request(appAlsAngemeldet())
      .post("/reservations/walk-in")
      .send({ venueId: MEIN_BETRIEB, tableId: "tisch-1", partySize: 2 });

    expect(res.status).toBe(201);
    // Die Form aus @maitr/core/types, nicht die rohe Prisma-Zeile.
    expect(res.body).toEqual({
      id: "res-neu",
      guestName: "Walk-in",
      partySize: 2,
      start: "2026-08-04T18:00:00.000Z",
      end: "2026-08-04T20:00:00.000Z",
      status: "walk_in",
      source: "walk_in",
    });
    // Geschrieben wird ausschliesslich in den geprüften Betrieb.
    expect(prismaMock.reservation.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ businessId: MEIN_BETRIEB }) }),
    );
  });

  it("hängt keinen Gast an einen fremden Tisch", async () => {
    // Der Tisch gehört dem Nachbarn: Die Suche mit businessId-Filter findet nichts.
    prismaMock.table.findFirst.mockResolvedValue(null);

    const res = await request(appAlsAngemeldet())
      .post("/reservations/walk-in")
      .send({ venueId: MEIN_BETRIEB, tableId: FREMDER_TISCH, partySize: 2 });

    expect(res.status).toBe(404);
    expect(prismaMock.reservation.create).not.toHaveBeenCalled();
    // Und die Suche selbst war schon betriebsgebunden - sonst wäre die Existenz
    // eines fremden Tisches am Antwortverhalten ablesbar.
    expect(prismaMock.table.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ id: FREMDER_TISCH, businessId: MEIN_BETRIEB }),
      }),
    );
  });

  it("weist einen fremden Betrieb im Rumpf mit 403 ab", async () => {
    const res = await request(appAlsAngemeldet())
      .post("/reservations/walk-in")
      .send({ venueId: FREMDER_BETRIEB, tableId: "tisch-1", partySize: 2 });

    expect(res.status).toBe(403);
    expect(prismaMock.reservation.create).not.toHaveBeenCalled();
  });

  it("weist widersprüchliche venueId-Quellen mit 400 ab", async () => {
    // Genau die geschlossene Lücke: geprüft würde die Query, geschrieben der Rumpf.
    const res = await request(appAlsAngemeldet())
      .post(`/reservations/walk-in?venueId=${MEIN_BETRIEB}`)
      .send({ venueId: FREMDER_BETRIEB, tableId: "tisch-1", partySize: 2 });

    expect(res.status).toBe(400);
    expect(prismaMock.businessMember.findUnique).not.toHaveBeenCalled();
    expect(prismaMock.reservation.create).not.toHaveBeenCalled();
  });

  it("lehnt unplausible Gästezahlen ab, bevor irgendetwas geschrieben wird", async () => {
    prismaMock.table.findFirst.mockResolvedValue({ id: "tisch-1" });

    const res = await request(appAlsAngemeldet())
      .post("/reservations/walk-in")
      .send({ venueId: MEIN_BETRIEB, tableId: "tisch-1", partySize: 0 });

    expect(res.status).toBe(422);
    expect(prismaMock.reservation.create).not.toHaveBeenCalled();
  });
});

describe("DELETE /reservations/:reservationId", () => {
  it("storniert nur mit Bindung an den autorisierten Betrieb", async () => {
    prismaMock.reservation.updateMany.mockResolvedValue({ count: 1 });

    const res = await request(appAlsAngemeldet()).delete(
      `/reservations/res-eigen?venueId=${MEIN_BETRIEB}`,
    );

    expect(res.status).toBe(204);
    expect(res.body).toEqual({});
    // Der wichtigste Punkt: businessId steht IN der WHERE-Klausel des Schreibzugriffs.
    expect(prismaMock.reservation.updateMany).toHaveBeenCalledWith({
      where: { id: "res-eigen", businessId: MEIN_BETRIEB },
      data: { status: "CANCELLED" },
    });
  });

  it("entfernt keine fremde Buchung, auch wenn die ID stimmt", async () => {
    // Angreifer nennt seinen eigenen Betrieb (dort ist er Mitglied) und die fremde
    // Reservierungs-ID. Der businessId-Filter lässt den Treffer ins Leere laufen.
    prismaMock.reservation.updateMany.mockResolvedValue({ count: 0 });

    const res = await request(appAlsAngemeldet()).delete(
      `/reservations/${FREMDE_RESERVIERUNG}?venueId=${MEIN_BETRIEB}`,
    );

    expect(res.status).toBe(404);
    expect(prismaMock.reservation.updateMany).toHaveBeenCalledWith({
      where: { id: FREMDE_RESERVIERUNG, businessId: MEIN_BETRIEB },
      data: { status: "CANCELLED" },
    });
  });

  it("nimmt den fremden Betrieb auch dann nicht, wenn er mitgeschickt wird", async () => {
    const res = await request(appAlsAngemeldet()).delete(
      `/reservations/${FREMDE_RESERVIERUNG}?venueId=${FREMDER_BETRIEB}`,
    );

    expect(res.status).toBe(403);
    expect(prismaMock.reservation.updateMany).not.toHaveBeenCalled();
  });

  it("weist widersprüchliche venueId-Quellen mit 400 ab", async () => {
    const res = await request(appAlsAngemeldet())
      .delete(`/reservations/${FREMDE_RESERVIERUNG}?venueId=${MEIN_BETRIEB}`)
      .send({ venueId: FREMDER_BETRIEB });

    expect(res.status).toBe(400);
    expect(prismaMock.reservation.updateMany).not.toHaveBeenCalled();
  });

  it("verlangt überhaupt eine Betriebskennung", async () => {
    // Ohne venueId kann nichts geprüft werden - dann wird auch nichts geschrieben.
    const res = await request(appAlsAngemeldet()).delete("/reservations/res-eigen");

    expect(res.status).toBe(400);
    expect(prismaMock.reservation.updateMany).not.toHaveBeenCalled();
  });
});

describe("beide Routen hängen in der ECHTEN App hinter der Anmeldung", () => {
  const app = createServer();

  it.each([
    { method: "post" as const, path: "/api/maitr/reservations/walk-in" },
    { method: "delete" as const, path: "/api/maitr/reservations/irgendeine-id" },
  ])("$method $path → 401 ohne Token", async ({ method, path }) => {
    const res = await request(app)[method](path).send({});

    expect(res.status, `Antwort war ${res.status}: ${JSON.stringify(res.body)}`).toBe(401);
    // Ohne Anmeldung darf keine Zeile angefasst worden sein.
    expect(prismaMock.reservation.create).not.toHaveBeenCalled();
    expect(prismaMock.reservation.updateMany).not.toHaveBeenCalled();
  });
});

/* ── Kommende Reservierungen (Web-App-Buchungen in der App) ─────────────── */

describe("tagesbeginnIn", () => {
  it("rechnet Mitternacht in der Zone des Betriebs, nicht in der des Servers", () => {
    // 15.09.2026, 00:30 in Köln (MESZ, UTC+2) = 14.09., 22:30 UTC.
    const jetzt = new Date("2026-09-14T22:30:00.000Z");
    expect(tagesbeginnIn(jetzt, "Europe/Berlin").toISOString()).toBe("2026-09-14T22:00:00.000Z");
    // Winterzeit (UTC+1).
    expect(tagesbeginnIn(new Date("2026-01-10T12:00:00.000Z"), "Europe/Berlin").toISOString()).toBe(
      "2026-01-09T23:00:00.000Z",
    );
    // Unbekannte Zone: UTC-Mitternacht statt Absturz.
    expect(tagesbeginnIn(new Date("2026-09-15T10:00:00.000Z"), "Mars/Olympus").toISOString()).toBe(
      "2026-09-15T00:00:00.000Z",
    );
  });
});

describe("GET /reservations/upcoming", () => {
  // Nur die Uhr ist gefälscht, Timer laufen echt - supertest braucht sie.
  const uhrAuf = (iso: string) => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date(iso));
  };
  afterEach(() => {
    vi.useRealTimers();
  });

  it("liefert die Vertragsform samt Anfrage-Status, Quelle und Eingang - nur aus dem eigenen Betrieb", async () => {
    // Ein Juni ohne Zeitumstellung in den nächsten 60 Tagen - sonst wäre die Spanne nicht 60 × 24 h.
    uhrAuf("2026-06-01T10:00:00.000Z");
    prismaMock.business.findUnique.mockResolvedValue({ timezone: "Europe/Berlin" });
    prismaMock.reservation.findMany.mockResolvedValue([
      zeile({
        id: "res-web",
        guestName: "Marie K.",
        guestEmail: "marie@example.org",
        guestPhone: "+49 221 1",
        specialRequests: "Kinderstuhl",
        status: "PENDING",
        source: "website",
        tableId: null,
        createdAt: new Date("2026-09-15T08:00:00.000Z"),
      }),
      zeile({ id: "res-noshow", status: "NO_SHOW", source: "website" }),
    ]);

    const res = await request(appAlsAngemeldet()).get(`/reservations/upcoming?venueId=${MEIN_BETRIEB}&tage=500`);

    expect(res.status).toBe(200);
    expect(res.body[0]).toMatchObject({
      id: "res-web",
      guestName: "Marie K.",
      status: "pending",
      source: "website",
      email: "marie@example.org",
      phone: "+49 221 1",
      note: "Kinderstuhl",
      createdAt: "2026-09-15T08:00:00.000Z",
    });
    // No-Show bleibt No-Show - nicht mehr auf "cancelled" gefaltet.
    expect(res.body[1].status).toBe("no_show");

    const arg = prismaMock.reservation.findMany.mock.calls[0][0];
    expect(arg.where.businessId).toBe(MEIN_BETRIEB);
    // `tage` ist auf 60 gedeckelt.
    const spanne = arg.where.reservationTime.lt.getTime() - arg.where.reservationTime.gte.getTime();
    expect(spanne).toBe(60 * 86_400_000);
  });

  /*
   * ANLASS (Prüfbefund): Das Ende war start + tage × 24 h. Am 25.10. (25 Stunden)
   * endete "heute" um 23:00 - die Buchung um 23:30 fehlte auf dem Abend-Screen;
   * am 29.03. (23 Stunden) zählte 00:30 des Folgetags als "noch heute".
   */
  it("endet um Mitternacht des Kalendertags - auch an den Tagen der Zeitumstellung", async () => {
    prismaMock.business.findUnique.mockResolvedValue({ timezone: "Europe/Berlin" });
    prismaMock.reservation.findMany.mockResolvedValue([]);
    const fenster = async (jetzt: string, tage: number) => {
      uhrAuf(jetzt);
      prismaMock.reservation.findMany.mockClear();
      const res = await request(appAlsAngemeldet()).get(`/reservations/upcoming?venueId=${MEIN_BETRIEB}&tage=${tage}`);
      expect(res.status).toBe(200);
      const { gte, lt } = prismaMock.reservation.findMany.mock.calls[0][0].where.reservationTime;
      return [gte.toISOString(), lt.toISOString()];
    };

    // 25.10.2026: 00:00 MESZ bis 26.10. 00:00 MEZ = 25 Stunden - 23:30 MEZ gehört dazu.
    expect(await fenster("2026-10-25T10:00:00.000Z", 1)).toEqual(["2026-10-24T22:00:00.000Z", "2026-10-25T23:00:00.000Z"]);
    // 29.03.2026: 00:00 MEZ bis 30.03. 00:00 MESZ = 23 Stunden - 00:30 am 30.03. gehört nicht dazu.
    expect(await fenster("2026-03-29T10:00:00.000Z", 1)).toEqual(["2026-03-28T23:00:00.000Z", "2026-03-29T22:00:00.000Z"]);
    // 14 Tage über die Umstellung: Ende ist Mitternacht MEZ, nicht 23:00.
    expect(await fenster("2026-10-20T10:00:00.000Z", 14)).toEqual(["2026-10-19T22:00:00.000Z", "2026-11-02T23:00:00.000Z"]);
  });

  it("fremder Betrieb → 403, keine Abfrage", async () => {
    const res = await request(appAlsAngemeldet()).get(`/reservations/upcoming?venueId=${FREMDER_BETRIEB}`);
    expect(res.status).toBe(403);
    expect(prismaMock.reservation.findMany).not.toHaveBeenCalled();
  });
});

describe("PATCH /reservations/:id/status - No-Show", () => {
  it("setzt NO_SHOW erst ab Beginn der Reservierung und schickt keine Mail", async () => {
    const vergangen = zeile({ id: "res-1", status: "CONFIRMED", reservationTime: new Date(Date.now() - 3_600_000), business: { name: "Haus Töller" } });
    prismaMock.reservation.findFirst.mockResolvedValue(vergangen);
    prismaMock.reservation.updateMany.mockResolvedValue({ count: 1 });
    prismaMock.reservation.findFirstOrThrow.mockResolvedValue({ ...vergangen, status: "NO_SHOW" });

    const res = await request(appAlsAngemeldet())
      .patch("/reservations/res-1/status")
      .send({ venueId: MEIN_BETRIEB, status: "no_show" });

    expect(res.status, JSON.stringify(res.body)).toBe(200);
    expect(res.body.status).toBe("no_show");
    expect(prismaMock.reservation.updateMany).toHaveBeenCalledWith({
      where: { id: "res-1", businessId: MEIN_BETRIEB },
      data: { status: "NO_SHOW" },
    });
  });

  /*
   * ANLASS (Prüfbefund): Eine nie beantwortete Web-Anfrage ließ sich nach
   * Terminbeginn auf NO_SHOW setzen - ohne Mail, und die Zeile zählte im Dataset
   * als No-Show. Die App bietet den Knopf dort nicht an; die Route jetzt auch nicht.
   */
  it("lehnt einen No-Show auf eine nie bestätigte Anfrage (PENDING) ab - auch nach Beginn", async () => {
    prismaMock.reservation.findFirst.mockResolvedValue(
      zeile({ id: "res-anfrage", status: "PENDING", source: "website", reservationTime: new Date(Date.now() - 3_600_000) }),
    );

    const res = await request(appAlsAngemeldet())
      .patch("/reservations/res-anfrage/status")
      .send({ venueId: MEIN_BETRIEB, status: "no_show" });

    expect(res.status).toBe(400);
    expect(prismaMock.reservation.updateMany).not.toHaveBeenCalled();
  });

  it("erlaubt einen No-Show auch für einen Gast, der als angekommen markiert war (ARRIVED)", async () => {
    const vergangen = zeile({ id: "res-da", status: "ARRIVED", reservationTime: new Date(Date.now() - 3_600_000) });
    prismaMock.reservation.findFirst.mockResolvedValue(vergangen);
    prismaMock.reservation.updateMany.mockResolvedValue({ count: 1 });
    prismaMock.reservation.findFirstOrThrow.mockResolvedValue({ ...vergangen, status: "NO_SHOW" });

    const res = await request(appAlsAngemeldet())
      .patch("/reservations/res-da/status")
      .send({ venueId: MEIN_BETRIEB, status: "no_show" });

    expect(res.status, JSON.stringify(res.body)).toBe(200);
  });

  it("lehnt einen No-Show vor Beginn ab", async () => {
    prismaMock.reservation.findFirst.mockResolvedValue(
      zeile({ id: "res-2", status: "CONFIRMED", reservationTime: new Date(Date.now() + 3_600_000) }),
    );

    const res = await request(appAlsAngemeldet())
      .patch("/reservations/res-2/status")
      .send({ venueId: MEIN_BETRIEB, status: "no_show" });

    expect(res.status).toBe(400);
    expect(prismaMock.reservation.updateMany).not.toHaveBeenCalled();
  });
});

describe("PATCH /reservations/:id/status - Absage ist endgültig", () => {
  it("bestätigt eine abgesagte Reservierung nicht still wieder", async () => {
    prismaMock.reservation.findFirst.mockResolvedValue(zeile({ id: "res-3", status: "CANCELLED" }));

    const res = await request(appAlsAngemeldet())
      .patch("/reservations/res-3/status")
      .send({ venueId: MEIN_BETRIEB, status: "confirmed" });

    expect(res.status).toBe(400);
    expect(prismaMock.reservation.updateMany).not.toHaveBeenCalled();
  });
});

describe("POST /reservations - vom Betrieb eingetragen", () => {
  it("ist sofort bestätigt und kommt in Vertragsform zurück", async () => {
    prismaMock.reservation.create.mockImplementation(async ({ data }: { data: Record<string, unknown> }) =>
      zeile({ ...data, id: "res-app", tableId: null, guestCount: data.guestCount, guestPhone: null }),
    );

    const res = await request(appAlsAngemeldet())
      .post("/reservations")
      .send({ venueId: MEIN_BETRIEB, guestName: "Jonas", partySize: 4, start: "2026-09-20T17:00:00.000Z" });

    expect(res.status, JSON.stringify(res.body)).toBe(201);
    expect(res.body).toMatchObject({ id: "res-app", guestName: "Jonas", partySize: 4, status: "confirmed", source: "maitr" });
    expect(res.body).not.toHaveProperty("businessId");
    expect(prismaMock.reservation.create.mock.calls[0][0].data.status).toBe("CONFIRMED");
  });
});
