// @vitest-environment node
/**
 * Die Zone des Betriebs reist mit, wo ein Client Uhrzeiten zeigt oder baut.
 *
 * ANLASS (15.09.2026): Nach dem Zonenfix in GET /slots bauten das Web-Dashboard
 * (`${datum}T19:00:00.000Z`) und die Gast-Verwaltungsseite
 * (`toISOString().slice(0, 16)`) weiter Wanduhr-als-UTC - Doppelbuchungen,
 * falsche Mails, verschobene Buchungen. Beide rechnen jetzt mit
 * @maitr/core/zeitzone und brauchen dafür die Zone, mit der auch /slots rechnet.
 */
import { beforeEach, describe, expect, it, vi } from "vitest";
import express from "express";
import request from "supertest";

const { prismaMock } = vi.hoisted(() => ({
  prismaMock: {
    configuration: { findFirst: vi.fn() },
    reservation: { findMany: vi.fn(), findUnique: vi.fn() },
    business: { findUnique: vi.fn() },
  },
}));
vi.mock("../db/prisma", () => ({ default: prismaMock, prisma: prismaMock }));
vi.mock("../middleware/auth", () => ({
  requireAuth: (req: express.Request, _res: unknown, next: () => void) => {
    req.user = { id: "user-1", email: "wirt@example.de", clerkId: "clerk_wirt" } as any;
    next();
  },
}));

import reservationsRouter from "../routes/reservations";
import publicReservationsRouter, { AKTIONS_SECRET, reservierungsAktionsToken } from "../routes/publicReservations";

const CONFIG_ID = "7d6f3a8e-2b1c-4e5f-9a0b-1c2d3e4f5a6b";

describe("GET /api/dashboard/reservations", () => {
  const app = express();
  app.use(express.json());
  app.use("/api/dashboard/reservations", reservationsRouter);

  beforeEach(() => {
    vi.clearAllMocks();
    prismaMock.configuration.findFirst.mockResolvedValue({ id: CONFIG_ID, businessId: "biz-1" });
    prismaMock.reservation.findMany.mockResolvedValue([]);
  });

  it("liefert die Zone des Betriebs neben den Reservierungen", async () => {
    prismaMock.business.findUnique.mockResolvedValue({ timezone: "Europe/Vienna" });
    const res = await request(app).get(`/api/dashboard/reservations?configId=${CONFIG_ID}`).set("Authorization", "Bearer x");
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ success: true, data: [], timezone: "Europe/Vienna" });
    expect(prismaMock.business.findUnique.mock.calls[0][0].where).toEqual({ id: "biz-1" });
  });

  it("fällt ohne Angabe auf Europe/Berlin zurück - wie GET /slots", async () => {
    prismaMock.business.findUnique.mockResolvedValue(null);
    const res = await request(app).get(`/api/dashboard/reservations?configId=${CONFIG_ID}`).set("Authorization", "Bearer x");
    expect(res.body.timezone).toBe("Europe/Berlin");
  });
});

describe("GET /api/public/reservations/:id", () => {
  const app = express();
  app.use(express.json());
  app.use("/api/public/reservations", publicReservationsRouter);

  it("gibt der Verwaltungsseite die Zone des Betriebs mit - und sonst nichts Neues", async () => {
    prismaMock.reservation.findUnique.mockResolvedValue({
      id: "res-1",
      guestName: "Yuki",
      guestCount: 2,
      reservationTime: new Date("2026-09-20T17:00:00.000Z"),
      specialRequests: null,
      status: "PENDING",
      business: { name: "Café Test", timezone: "Europe/Berlin" },
    });

    // Mit Secret in der Umgebung verlangt die Route den signierten Mail-Token.
    const t = AKTIONS_SECRET ? `?t=${reservierungsAktionsToken("res-1", "manage", AKTIONS_SECRET)}` : "";
    const res = await request(app).get(`/api/public/reservations/res-1${t}`);

    expect(res.status).toBe(200);
    expect(res.body.data.business).toEqual({ name: "Café Test", timezone: "Europe/Berlin" });
    expect(prismaMock.reservation.findUnique.mock.calls[0][0].select.business).toEqual({
      select: { name: true, timezone: true },
    });
  });
});
