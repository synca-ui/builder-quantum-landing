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
import { beforeEach, describe, expect, it, vi } from "vitest";
import express from "express";
import request from "supertest";

const { prismaMock } = vi.hoisted(() => ({
  prismaMock: {
    businessMember: { findUnique: vi.fn(), findMany: vi.fn() },
    reservation: { create: vi.fn(), updateMany: vi.fn(), findMany: vi.fn() },
    table: { findFirst: vi.fn() },
  },
}));

vi.mock("../db/prisma", () => ({ default: prismaMock, prisma: prismaMock }));

import { reservationsRouter } from "../maitr/routes";
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
