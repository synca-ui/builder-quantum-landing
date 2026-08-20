// @vitest-environment node
/**
 * Rückfallsicherung für `resolveVenue` (`server/maitr/middleware.ts`).
 *
 * Anlass: `resolveVenue` sammelte die Kandidaten aus Pfad, Query und Rumpf und
 * filterte mit `typeof v === "string"`. Eine genannte, aber NICHT-string-förmige
 * Kennung - `?venueId=a&venueId=a` (qs macht daraus ein Array), `?venueId[0]=a`
 * / `?venueId[not]=zzz` (Array bzw. Objekt), oder im JSON-Rumpf eine Zahl, `null`
 * oder ein verschachteltes Objekt - fiel dabei still aus der Kandidatenliste.
 * Blieb danach genau eine string-förmige Kennung aus einer ANDEREN Quelle übrig,
 * sah die Anfrage aus wie der gute Fall "genau eine Kennung in genau einer
 * Quelle", und der Konfliktabbruch griff nie. Diese Datei prüft, dass so etwas
 * jetzt abgewiesen statt umgangen wird.
 *
 * Zwei Ebenen: zuerst `resolveVenue` direkt (billig, jede Formenkombination),
 * dann dieselben Formen über die ECHTE Route `POST /reservations/walk-in` mit
 * gemocktem Prisma - damit "es wurde nicht geschrieben" tatsächlich am
 * Mock-Aufruf geprüft wird, nicht nur an der HTTP-Antwort.
 */
import { beforeEach, describe, expect, it, vi } from "vitest";
import express from "express";
import request from "supertest";
import type { Request } from "express";
import { resolveVenue } from "../maitr/middleware";

const { prismaMock } = vi.hoisted(() => ({
  prismaMock: {
    businessMember: { findUnique: vi.fn() },
    reservation: { create: vi.fn() },
    table: { findFirst: vi.fn() },
  },
}));

vi.mock("../db/prisma", () => ({ default: prismaMock, prisma: prismaMock }));

import { reservationsRouter } from "../maitr/routes";

describe("resolveVenue: genannte, aber unlesbare Kennung", () => {
  /** Minimales Request-Double - resolveVenue liest nur params/query/body. */
  function req(over: { params?: unknown; query?: unknown; body?: unknown }): Request {
    return over as unknown as Request;
  }

  it("nichts angegeben → kein Fehler, keine Kennung (Ausgangslage)", () => {
    expect(resolveVenue(req({}))).toEqual({ venueId: null, conflict: false });
  });

  it("guter Fall: eine Kennung in genau einer Quelle", () => {
    expect(resolveVenue(req({ body: { venueId: "biz-x" } }))).toEqual({
      venueId: "biz-x",
      conflict: false,
    });
  });

  it("guter Fall bleibt gut: dieselbe Kennung als String in zwei Quellen", () => {
    // Keine Regression: zwei Quellen, die WORTGLEICH denselben String tragen,
    // waren nie das Problem - nur ABWEICHENDE oder unlesbare Formen sind es.
    expect(
      resolveVenue(req({ params: { venueId: "biz-x" }, query: { venueId: "biz-x" } })),
    ).toEqual({ venueId: "biz-x", conflict: false });
  });

  it("bekannter Fall bleibt: zwei widersprüchliche String-Kennungen → conflict", () => {
    expect(
      resolveVenue(req({ query: { venueId: "biz-a" }, body: { venueId: "biz-b" } })),
    ).toEqual({ venueId: null, conflict: true });
  });

  it("leerer String bleibt gleichwertig zu 'nicht angegeben'", () => {
    // Bewusst NICHT Teil der neuen Regel: ein leerer String ist als Zeichenkette
    // lesbar, nur eben leer - er verschwindet weiter wie bisher, keine neue
    // Konflikt-Auslösung.
    expect(
      resolveVenue(req({ query: { venueId: "" }, body: { venueId: "biz-x" } })),
    ).toEqual({ venueId: "biz-x", conflict: false });
  });

  it("qs-Array durch doppelten Query-Parameter (?venueId=a&venueId=a) → conflict", () => {
    // Was `?venueId=a&venueId=a` bei qs tatsächlich ergibt.
    expect(resolveVenue(req({ query: { venueId: ["a", "a"] } }))).toEqual({
      venueId: null,
      conflict: true,
    });
  });

  it("qs-Array durch Indexform (?venueId[0]=a) → conflict", () => {
    // Was `?venueId[0]=a` bei qs tatsächlich ergibt (Array, nicht Objekt).
    expect(resolveVenue(req({ query: { venueId: ["a"] } }))).toEqual({
      venueId: null,
      conflict: true,
    });
  });

  it("qs-Objekt durch Schlüsselform (?venueId[not]=zzz) → conflict", () => {
    expect(resolveVenue(req({ query: { venueId: { not: "zzz" } } }))).toEqual({
      venueId: null,
      conflict: true,
    });
  });

  it("Kennung im Rumpf als Zahl → conflict", () => {
    expect(resolveVenue(req({ body: { venueId: 123 } }))).toEqual({
      venueId: null,
      conflict: true,
    });
  });

  it("Kennung im Rumpf als null → conflict", () => {
    expect(resolveVenue(req({ body: { venueId: null } }))).toEqual({
      venueId: null,
      conflict: true,
    });
  });

  it("Kennung im Rumpf als verschachteltes Objekt → conflict", () => {
    expect(resolveVenue(req({ body: { venueId: { not: "zzz" } } }))).toEqual({
      venueId: null,
      conflict: true,
    });
  });

  it("unlesbare Form bleibt Konflikt, selbst wenn eine andere Quelle eine gültige Kennung trägt", () => {
    // Der eigentliche Regressionsfall: genau HIER griff der alte Filter nicht -
    // das Array/Objekt verschwand, die Body-Kennung blieb als einzige übrig und
    // sah wie der gute Fall aus.
    expect(
      resolveVenue(req({ query: { venueId: ["a", "a"] }, body: { venueId: "biz-x" } })),
    ).toEqual({ venueId: null, conflict: true });
  });
});

describe("POST /reservations/walk-in: unlesbare venueId-Formen schreiben nichts", () => {
  const ICH = "user-wirt";
  const MEIN_BETRIEB = "biz-goldstueck";

  function appAlsAngemeldet() {
    const app = express();
    app.use(express.json());
    app.use((req: express.Request & { userId?: string }, _res, next) => {
      req.userId = ICH;
      next();
    });
    app.use("/reservations", reservationsRouter);
    return app;
  }

  beforeEach(() => {
    vi.clearAllMocks();
    prismaMock.businessMember.findUnique.mockImplementation(
      async ({
        where,
      }: {
        where: { userId_businessId: { userId: string; businessId: string } };
      }) =>
        where.userId_businessId.userId === ICH &&
        where.userId_businessId.businessId === MEIN_BETRIEB
          ? { userId: ICH, businessId: MEIN_BETRIEB, role: "OWNER" }
          : null,
    );
    prismaMock.table.findFirst.mockResolvedValue({ id: "tisch-1" });
    prismaMock.reservation.create.mockResolvedValue({
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
    });
  });

  it("guter Fall bleibt gut: eine Kennung in einer Quelle → 201, es wird geschrieben", async () => {
    const res = await request(appAlsAngemeldet())
      .post("/reservations/walk-in")
      .send({ venueId: MEIN_BETRIEB, tableId: "tisch-1", partySize: 2 });

    expect(res.status).toBe(201);
    expect(prismaMock.reservation.create).toHaveBeenCalledTimes(1);
  });

  // Bei den folgenden fünf Tests trägt IMMER die jeweils andere Quelle zusätzlich
  // eine gültige, zum angemeldeten Nutzer passende venueId. Das ist genau der
  // Regressionsfall: Ohne die neue Sperre fällt die unlesbare Form still aus der
  // Kandidatenliste, die gültige Kennung aus der anderen Quelle bleibt allein
  // übrig, wirkt wie der gute Fall - und die Anfrage würde durchgehen (201, echter
  // Schreibzugriff). Ein Test ohne diese zweite, gültige Quelle würde auch mit der
  // ALTEN Lücke 400 liefern ("venueId fehlt", weil gar kein Kandidat übrig bleibt)
  // und die Gegenprobe könnte den Fix nicht von seiner Abwesenheit unterscheiden.

  it("doppelter Query-Parameter (Array, gleiche Werte) + gültige Kennung im Rumpf → 400, nichts geschrieben", async () => {
    const res = await request(appAlsAngemeldet())
      .post(`/reservations/walk-in?venueId=${MEIN_BETRIEB}&venueId=${MEIN_BETRIEB}`)
      .send({ venueId: MEIN_BETRIEB, tableId: "tisch-1", partySize: 2 });

    expect(res.status).toBe(400);
    expect(prismaMock.businessMember.findUnique).not.toHaveBeenCalled();
    expect(prismaMock.reservation.create).not.toHaveBeenCalled();
  });

  it("Klammerform in der Query (?venueId[0]=…) + gültige Kennung im Rumpf → 400, nichts geschrieben", async () => {
    const res = await request(appAlsAngemeldet())
      .post(`/reservations/walk-in?venueId[0]=${MEIN_BETRIEB}`)
      .send({ venueId: MEIN_BETRIEB, tableId: "tisch-1", partySize: 2 });

    expect(res.status).toBe(400);
    expect(prismaMock.businessMember.findUnique).not.toHaveBeenCalled();
    expect(prismaMock.reservation.create).not.toHaveBeenCalled();
  });

  it("Kennung im Rumpf als Zahl + gültige Kennung in der Query → 400, nichts geschrieben", async () => {
    const res = await request(appAlsAngemeldet())
      .post(`/reservations/walk-in?venueId=${MEIN_BETRIEB}`)
      .send({ venueId: 123, tableId: "tisch-1", partySize: 2 });

    expect(res.status).toBe(400);
    expect(prismaMock.businessMember.findUnique).not.toHaveBeenCalled();
    expect(prismaMock.reservation.create).not.toHaveBeenCalled();
  });

  it("Kennung im Rumpf als null + gültige Kennung in der Query → 400, nichts geschrieben", async () => {
    const res = await request(appAlsAngemeldet())
      .post(`/reservations/walk-in?venueId=${MEIN_BETRIEB}`)
      .send({ venueId: null, tableId: "tisch-1", partySize: 2 });

    expect(res.status).toBe(400);
    expect(prismaMock.businessMember.findUnique).not.toHaveBeenCalled();
    expect(prismaMock.reservation.create).not.toHaveBeenCalled();
  });

  it("Kennung im Rumpf als verschachteltes Objekt + gültige Kennung in der Query → 400, nichts geschrieben", async () => {
    const res = await request(appAlsAngemeldet())
      .post(`/reservations/walk-in?venueId=${MEIN_BETRIEB}`)
      .send({ venueId: { not: "zzz" }, tableId: "tisch-1", partySize: 2 });

    expect(res.status).toBe(400);
    expect(prismaMock.businessMember.findUnique).not.toHaveBeenCalled();
    expect(prismaMock.reservation.create).not.toHaveBeenCalled();
  });

  it("bekannter Fall bleibt: zwei widersprüchliche String-Kennungen → 400, nichts geschrieben", async () => {
    const res = await request(appAlsAngemeldet())
      .post(`/reservations/walk-in?venueId=${MEIN_BETRIEB}`)
      .send({ venueId: "biz-fremd", tableId: "tisch-1", partySize: 2 });

    expect(res.status).toBe(400);
    expect(prismaMock.businessMember.findUnique).not.toHaveBeenCalled();
    expect(prismaMock.reservation.create).not.toHaveBeenCalled();
  });
});
