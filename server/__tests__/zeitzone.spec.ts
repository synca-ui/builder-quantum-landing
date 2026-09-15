// @vitest-environment node
/**
 * Wanduhr ↔ Zeitpunkt (server/utils/zeitzone.ts) und die Zeitfenster der
 * öffentlichen Reservierung (GET /api/public/reservations/slots).
 *
 * ANLASS: Die Web-App speicherte 19:00 als 19:00 UTC. Push und App zeigten jede
 * Web-Buchung im Sommer um zwei Stunden verschoben, die Belegungsprüfung
 * verglich UTC-Stunden. Diese Tests scheitern gegen die alte Fassung.
 */
import { beforeEach, describe, expect, it, vi } from "vitest";
import express from "express";
import request from "supertest";

const { prismaMock } = vi.hoisted(() => ({
  prismaMock: {
    configuration: { findUnique: vi.fn() },
    reservation: { findMany: vi.fn() },
  },
}));
vi.mock("../db/prisma", () => ({ default: prismaMock, prisma: prismaMock }));

import {
  tagesbeginnIn,
  uhrzeitIn,
  zeitpunktAusDatumUndUhrzeit,
  zeitpunktAusWanduhr,
} from "../utils/zeitzone";
import publicReservationsRouter from "../routes/publicReservations";

describe("zeitzone", () => {
  it("rechnet Wanduhr in Köln in echte Zeitpunkte um - Sommer und Winter", () => {
    expect(zeitpunktAusDatumUndUhrzeit("2026-09-20", "19:00", "Europe/Berlin")?.toISOString()).toBe(
      "2026-09-20T17:00:00.000Z",
    );
    expect(zeitpunktAusDatumUndUhrzeit("2026-01-10", "19:00", "Europe/Berlin")?.toISOString()).toBe(
      "2026-01-10T18:00:00.000Z",
    );
    expect(zeitpunktAusDatumUndUhrzeit("20.09.2026", "19:00", "Europe/Berlin")).toBeNull();
  });

  it("trifft auch an den Umstellungstagen die richtige Stunde", () => {
    // 25.10.2026: 03:00 MESZ → 02:00 MEZ. 01:30 ist noch Sommerzeit, 03:30 schon Winterzeit.
    expect(zeitpunktAusWanduhr({ jahr: 2026, monat: 10, tag: 25, stunde: 1, minute: 30 }, "Europe/Berlin").toISOString()).toBe(
      "2026-10-24T23:30:00.000Z",
    );
    expect(zeitpunktAusWanduhr({ jahr: 2026, monat: 10, tag: 25, stunde: 3, minute: 30 }, "Europe/Berlin").toISOString()).toBe(
      "2026-10-25T02:30:00.000Z",
    );
    // 29.03.2026: 01:30 ist noch Winterzeit, 03:30 schon Sommerzeit.
    expect(zeitpunktAusWanduhr({ jahr: 2026, monat: 3, tag: 29, stunde: 1, minute: 30 }, "Europe/Berlin").toISOString()).toBe(
      "2026-03-29T00:30:00.000Z",
    );
    expect(zeitpunktAusWanduhr({ jahr: 2026, monat: 3, tag: 29, stunde: 3, minute: 30 }, "Europe/Berlin").toISOString()).toBe(
      "2026-03-29T01:30:00.000Z",
    );
  });

  it("Tagesbeginn und Uhrzeit in der Zone", () => {
    const halbEins = new Date("2026-09-14T22:30:00.000Z"); // 15.09., 00:30 in Köln
    expect(tagesbeginnIn(halbEins, "Europe/Berlin").toISOString()).toBe("2026-09-14T22:00:00.000Z");
    expect(uhrzeitIn(new Date("2026-09-20T17:00:00.000Z"), "Europe/Berlin")).toBe("19:00");
    expect(tagesbeginnIn(new Date("2026-09-15T10:00:00.000Z"), "Mars/Olympus").toISOString()).toBe(
      "2026-09-15T00:00:00.000Z",
    );
  });
});

describe("GET /api/public/reservations/slots", () => {
  const app = express();
  app.use("/api/public/reservations", publicReservationsRouter);

  beforeEach(() => {
    vi.clearAllMocks();
    prismaMock.configuration.findUnique.mockResolvedValue({
      id: "cfg-1",
      businessId: "biz-1",
      reservationsEnabled: true,
      timeSlots: ["18:00", "19:00", "22:30"],
      openingHours: {},
      business: { timezone: "Europe/Berlin" },
    });
  });

  it("liefert echte Zeitpunkte und erkennt belegte Fenster in Kölner Uhrzeit", async () => {
    // Bestehende Buchung um 19:00 Kölner Zeit = 17:00 UTC.
    prismaMock.reservation.findMany.mockResolvedValue([{ reservationTime: new Date("2026-09-20T17:00:00.000Z") }]);

    const res = await request(app).get("/api/public/reservations/slots?configId=cfg-1&date=2026-09-20");

    expect(res.status).toBe(200);
    expect(res.body.slots).toEqual([
      { time: "18:00", datetime: "2026-09-20T16:00:00.000Z", available: true },
      { time: "19:00", datetime: "2026-09-20T17:00:00.000Z", available: false },
      { time: "22:30", datetime: "2026-09-20T20:30:00.000Z", available: true },
    ]);
    // Der Kalendertag in Köln: 19.09., 22:00 UTC bis 20.09., 22:00 UTC.
    const where = prismaMock.reservation.findMany.mock.calls[0][0].where;
    expect(where.reservationTime.gte.toISOString()).toBe("2026-09-19T22:00:00.000Z");
    expect(where.reservationTime.lt.toISOString()).toBe("2026-09-20T22:00:00.000Z");
  });
});
