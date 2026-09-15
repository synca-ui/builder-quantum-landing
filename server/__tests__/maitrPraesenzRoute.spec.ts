// @vitest-environment node
/**
 * Die zwei Präsenz-Routen in server/maitr/routes.ts:
 *   GET  /venues/:venueId/presence          → ladePraesenz (nur lesen)
 *   POST /venues/:venueId/presence/refresh  → aktualisierePraesenz (bezahlter Abruf)
 *
 * Was hier NICHT passieren darf:
 *  - Ein fremder Betrieb liest die Präsenz eines anderen oder löst dessen
 *    Abruf aus (die Betriebs-ID steht öffentlich in /venues/:slug/public).
 *  - Ein Aufrufer übergeht die Drossel. `erzwingen` ist dem Zeitgeber
 *    vorbehalten; käme es aus Rumpf oder Query durch, ließe sich mit einer
 *    Schleife beliebig viel Places-Guthaben verbrennen.
 *  - Ein Fehler im Ablauf (Prisma nennt Tabellen, Places nennt Schlüsselprobleme)
 *    landet im Klartext beim Client.
 *
 * `../maitr/praesenz` ist gemockt - der Ablauf selbst ist in praesenzWorkflow.spec.ts
 * geprüft. `requireVenueAccess` und `maitrErrorHandler` laufen echt.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import express from "express";
import request from "supertest";

const { prismaMock, praesenzMock } = vi.hoisted(() => ({
  prismaMock: {
    businessMember: { findUnique: vi.fn() },
  },
  praesenzMock: {
    ladePraesenz: vi.fn(),
    aktualisierePraesenz: vi.fn(),
  },
}));

vi.mock("../db/prisma", () => ({ default: prismaMock, prisma: prismaMock }));
vi.mock("../maitr/praesenz", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../maitr/praesenz")>()),
  ...praesenzMock,
}));

import { venuesRouter } from "../maitr/routes";
import { maitrErrorHandler } from "../maitr/index";

const ICH = "user-wirt";
const MEIN_BETRIEB = "biz-toeller";
const FREMDER_BETRIEB = "biz-nachbar";

/** Die Antwort des (gemockten) Ablaufs - wird unverändert durchgereicht. */
const PRAESENZ = {
  status: "bereit",
  fetchedAt: "2026-09-15T09:55:00.000Z",
  google: { placeId: "ChIJ-toeller", name: "Haus Töller", rating: 4.6, reviewCount: 812 },
  bericht: { score: 71, hebel: [], websiteBefunde: [] },
};

function app(userId: string | null) {
  const a = express();
  a.use(express.json());
  a.use((req, _res, next) => {
    if (userId) (req as express.Request & { userId?: string }).userId = userId;
    next();
  });
  a.use("/venues", venuesRouter);
  a.use(maitrErrorHandler);
  return a;
}

let fehlerLog: ReturnType<typeof vi.spyOn>;

beforeEach(() => {
  vi.clearAllMocks();
  fehlerLog = vi.spyOn(console, "error").mockImplementation(() => {});
  // Ich bin Mitglied (Personal) in MEIN_BETRIEB und sonst nirgends.
  prismaMock.businessMember.findUnique.mockImplementation(
    async ({ where }: { where: { userId_businessId: { userId: string; businessId: string } } }) =>
      where.userId_businessId.userId === ICH && where.userId_businessId.businessId === MEIN_BETRIEB
        ? { role: "STAFF" }
        : null,
  );
  praesenzMock.ladePraesenz.mockResolvedValue(PRAESENZ);
  praesenzMock.aktualisierePraesenz.mockResolvedValue({ ...PRAESENZ, fetchedAt: "2026-09-15T10:00:00.000Z" });
});

afterEach(() => {
  fehlerLog.mockRestore();
});

describe("GET /venues/:venueId/presence", () => {
  it("liefert den gespeicherten Stand der geprüften venueId - auch dem Personal - und ruft nichts ab", async () => {
    const res = await request(app(ICH)).get(`/venues/${MEIN_BETRIEB}/presence`);

    expect(res.status).toBe(200);
    expect(res.body).toEqual(PRAESENZ);
    expect(praesenzMock.ladePraesenz).toHaveBeenCalledTimes(1);
    expect(praesenzMock.ladePraesenz.mock.calls[0]).toEqual([MEIN_BETRIEB]);
    // Lesen kostet nichts - ein GET darf nie den bezahlten Abruf auslösen.
    expect(praesenzMock.aktualisierePraesenz).not.toHaveBeenCalled();
  });

  it("fremder Betrieb → 403, der Ablauf wird gar nicht erst gerufen", async () => {
    const res = await request(app(ICH)).get(`/venues/${FREMDER_BETRIEB}/presence`);
    expect(res.status).toBe(403);
    expect(praesenzMock.ladePraesenz).not.toHaveBeenCalled();
  });

  it("ohne Anmeldung → 401", async () => {
    const res = await request(app(null)).get(`/venues/${MEIN_BETRIEB}/presence`);
    expect(res.status).toBe(401);
    expect(praesenzMock.ladePraesenz).not.toHaveBeenCalled();
  });

  it("ein Fehler im Ablauf → 500 ohne Einzelheiten", async () => {
    praesenzMock.ladePraesenz.mockImplementation(async () => {
      throw new Error("Invalid `prisma.presenceSnapshot.findUnique()` invocation: column PresenceSnapshot.google");
    });

    const res = await request(app(ICH)).get(`/venues/${MEIN_BETRIEB}/presence`);

    expect(res.status).toBe(500);
    expect(res.body).toEqual({ error: "Interner Serverfehler" });
    expect(res.text).not.toContain("presenceSnapshot");
    // Die Einzelheiten gehören ins Log, nicht in die Antwort.
    expect(fehlerLog).toHaveBeenCalled();
  });
});

describe("POST /venues/:venueId/presence/refresh", () => {
  it("stößt den Abruf für die geprüfte venueId an - ohne Optionen, also mit Drossel", async () => {
    const res = await request(app(ICH)).post(`/venues/${MEIN_BETRIEB}/presence/refresh`);

    expect(res.status).toBe(200);
    expect(res.body.fetchedAt).toBe("2026-09-15T10:00:00.000Z");
    expect(praesenzMock.aktualisierePraesenz).toHaveBeenCalledTimes(1);
    expect(praesenzMock.aktualisierePraesenz.mock.calls[0]).toEqual([MEIN_BETRIEB]);
    expect(praesenzMock.ladePraesenz).not.toHaveBeenCalled();
  });

  it("reicht erzwingen aus Rumpf oder Query NIE durch", async () => {
    await request(app(ICH)).post(`/venues/${MEIN_BETRIEB}/presence/refresh?erzwingen=true`).send({ erzwingen: true });
    await request(app(ICH))
      .post(`/venues/${MEIN_BETRIEB}/presence/refresh`)
      .send({ optionen: { erzwingen: true }, venueId: MEIN_BETRIEB });

    expect(praesenzMock.aktualisierePraesenz).toHaveBeenCalledTimes(2);
    for (const aufruf of praesenzMock.aktualisierePraesenz.mock.calls) {
      expect(aufruf[0]).toBe(MEIN_BETRIEB);
      expect(aufruf[1]?.erzwingen).not.toBe(true);
    }
  });

  it("fremder Betrieb → 403 und kein Abruf", async () => {
    const res = await request(app(ICH)).post(`/venues/${FREMDER_BETRIEB}/presence/refresh`);
    expect(res.status).toBe(403);
    expect(praesenzMock.aktualisierePraesenz).not.toHaveBeenCalled();
  });

  it("eine fremde venueId im Rumpf lenkt den Abruf nicht um → 400", async () => {
    const res = await request(app(ICH))
      .post(`/venues/${MEIN_BETRIEB}/presence/refresh`)
      .send({ venueId: FREMDER_BETRIEB });
    expect(res.status).toBe(400);
    expect(praesenzMock.aktualisierePraesenz).not.toHaveBeenCalled();
  });

  it("ein Fehler im Ablauf → 500 ohne Einzelheiten", async () => {
    praesenzMock.aktualisierePraesenz.mockImplementation(async () => {
      throw new Error("No Business found (biz-toeller) - Google Places HTTP 403: API key not valid");
    });

    const res = await request(app(ICH)).post(`/venues/${MEIN_BETRIEB}/presence/refresh`);

    expect(res.status).toBe(500);
    expect(res.body).toEqual({ error: "Interner Serverfehler" });
    expect(res.text).not.toContain("API key");
  });
});
