// @vitest-environment node
/**
 * Die Stempelkarte: Mandantentrennung, Leerzustand, Hauptbuch und die Frage, was
 * eine Prämienänderung mit laufenden Karten macht.
 *
 * Warum diese Datei nötig ist, obwohl es `server/__tests__/apiContract.spec.ts`
 * gibt: Der Vertragstest prüft ausschliesslich `client/lib/apiPaths.ts` (Web).
 * Mobile und `packages/core` benutzen rohe Pfad-Strings - die Loyalty-Pfade sind
 * davon NICHT gedeckt.
 *
 * Die Datenbank wird nie angefasst; Prisma ist gemockt. Die Middleware
 * `requireVenueAccess` läuft dabei ECHT mit (sie fragt nur `businessMember`), damit
 * hier die tatsächliche Zugriffskontrolle geprüft wird und nicht eine nachgebaute.
 */
import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import express from "express";
import request from "supertest";

const { prismaMock } = vi.hoisted(() => {
  const delegate = () => ({
    findFirst: vi.fn(),
    findMany: vi.fn(),
    create: vi.fn(),
    count: vi.fn(),
    updateMany: vi.fn(),
    deleteMany: vi.fn(),
    aggregate: vi.fn(),
    groupBy: vi.fn(),
  });
  const mock = {
    businessMember: { findUnique: vi.fn(), findMany: vi.fn() },
    stampProgram: delegate(),
    stampCard: delegate(),
    stampEvent: delegate(),
    maitrGuest: delegate(),
    walletDeviceRegistration: delegate(),
    auditLog: delegate(),
    $transaction: vi.fn(),
  };
  // Nachträglich gesetzt, nicht im Objektliteral: dort dürfte `mock` sich nicht
  // selbst nennen (Selbstbezug im eigenen Initialisierer). Die Transaktion reicht
  // denselben Mock durch - geprüft wird, WAS in ihr passiert und in welcher
  // Reihenfolge, nicht Postgres' Isolationsverhalten.
  mock.$transaction.mockImplementation(async (fn: (tx: unknown) => Promise<unknown>) => fn(mock));
  return { prismaMock: mock };
});

vi.mock("../db/prisma", () => ({ default: prismaMock, prisma: prismaMock }));

import { loyaltyRouter } from "../maitr/routes";
import { maitrErrorHandler } from "../maitr/index";
import { median, istFastVoll, istFehlendeLoyaltyTabelle } from "../maitr/stempelkarte";
import { createServer } from "../index";

const ICH = "user-wirt";
const MEIN_BETRIEB = "biz-goldstueck";
/** Aushilfe: Mitglied desselben Betriebs, aber mit der Vorgaberolle STAFF. */
const AUSHILFE = "user-aushilfe";
/** Die Kennung des Nachbarn ist kein Geheimnis - sie steht in /venues/:slug/public. */
const FREMDER_BETRIEB = "biz-nachbar";
const MEIN_PROGRAMM = "prog-eigen";
const FREMDES_PROGRAMM = "prog-des-nachbarn";
const FREMDE_KARTE = "karte-des-nachbarn";

/**
 * Mini-App mit gesetztem `req.userId`. `requireAuth` wird hier übersprungen
 * (bräuchte ein echtes Clerk-Token); dass die Routen in der ECHTEN App dahinter
 * hängen, prüft der 401-Block ganz unten gegen `createServer()`.
 *
 * Die Fehler-Middleware hängt mit dran, weil ein Teil dieser Tests genau die
 * Unterscheidung 503-gegen-500 prüft.
 */
function appAlsAngemeldet(userId: string = ICH) {
  const app = express();
  app.use(express.json());
  app.use((req, _res, next) => {
    (req as express.Request & { userId?: string }).userId = userId;
    next();
  });
  app.use("/loyalty", loyaltyRouter);
  app.use(maitrErrorHandler);
  return app;
}

/** Dieselben Routen, angemeldet als Aushilfe mit der Vorgaberolle STAFF. */
function appAlsAushilfe() {
  return appAlsAngemeldet(AUSHILFE);
}

function programmZeile(overrides: Record<string, unknown> = {}) {
  return {
    id: MEIN_PROGRAMM,
    name: "Stempelkarte",
    maxStamps: 10,
    rewardText: "1x Kaffee gratis",
    isActive: true,
    cooldownSeconds: 3600,
    validityDays: null,
    applePassTypeIdentifier: null,
    googleClassId: null,
    ...overrides,
  };
}

function kartenZeile(overrides: Record<string, unknown> = {}) {
  return {
    id: "karte-1",
    programId: MEIN_PROGRAMM,
    guestId: "gast-1",
    cycle: 1,
    currentStamps: 3,
    maxStamps: 10,
    rewardText: "1x Kaffee gratis",
    redeemedCount: 0,
    status: "ACTIVE",
    version: 7,
    createdAt: new Date("2026-07-01T10:00:00.000Z"),
    completedAt: null,
    redeemedAt: null,
    expiresAt: null,
    guest: { id: "gast-1", name: "Anna", anonymizedAt: null, isMock: false },
    program: { rewardText: "1x Kaffee gratis" },
    ...overrides,
  };
}

/** Standardantworten, damit jeder Test nur setzen muss, was ihn angeht. */
beforeEach(() => {
  vi.clearAllMocks();
  prismaMock.businessMember.findUnique.mockImplementation(
    async ({ where }: { where: { userId_businessId: { userId: string; businessId: string } } }) => {
      const { userId, businessId } = where.userId_businessId;
      if (businessId !== MEIN_BETRIEB) return null;
      // Die ROLLE kommt mit. Vorher wurde sie geladen und weggeworfen - und damit
      // durfte jede Aushilfe die Prämie ändern, Karten entwerten und Gastdaten
      // löschen.
      if (userId === ICH) return { userId: ICH, businessId, role: "OWNER" };
      if (userId === AUSHILFE) return { userId: AUSHILFE, businessId, role: "STAFF" };
      return null;
    },
  );
  // `clearAllMocks` löscht auch die Implementierung der Transaktion - ohne diese
  // Zeile liefe ab dem zweiten Test jede Transaktion ins Leere.
  prismaMock.$transaction.mockImplementation(async (fn: (tx: unknown) => Promise<unknown>) =>
    fn(prismaMock),
  );
  prismaMock.stampProgram.findFirst.mockResolvedValue(null);
  prismaMock.stampProgram.updateMany.mockResolvedValue({ count: 1 });
  prismaMock.stampCard.findFirst.mockResolvedValue(null);
  prismaMock.stampCard.findMany.mockResolvedValue([]);
  prismaMock.stampCard.count.mockResolvedValue(0);
  prismaMock.stampCard.updateMany.mockResolvedValue({ count: 1 });
  prismaMock.stampEvent.findFirst.mockResolvedValue(null);
  prismaMock.stampEvent.findMany.mockResolvedValue([]);
  prismaMock.stampEvent.groupBy.mockResolvedValue([]);
  prismaMock.stampEvent.count.mockResolvedValue(0);
  prismaMock.stampEvent.aggregate.mockResolvedValue({ _sum: { delta: 0 } });
  prismaMock.stampEvent.create.mockResolvedValue({ id: "ev-neu" });
  prismaMock.walletDeviceRegistration.findMany.mockResolvedValue([]);
  prismaMock.walletDeviceRegistration.count.mockResolvedValue(0);
  prismaMock.walletDeviceRegistration.deleteMany.mockResolvedValue({ count: 0 });
  prismaMock.maitrGuest.findFirst.mockResolvedValue(null);
  prismaMock.maitrGuest.updateMany.mockResolvedValue({ count: 1 });
  prismaMock.auditLog.create.mockResolvedValue({ id: "audit-1" });
});

/* ── Leerzustand: der Regelfall am ersten Tag ────────────────────────────── */

describe("GET /loyalty/program", () => {
  it("antwortet sauber, wenn noch kein Programm angelegt ist", async () => {
    const res = await request(appAlsAngemeldet()).get(`/loyalty/program?venueId=${MEIN_BETRIEB}`);

    expect(res.status).toBe(200);
    // `null` und nicht ein erfundenes Vorgabeprogramm: der Bildschirm soll "noch
    // nichts eingerichtet" zeigen und keine Nullenwand, die wie ein Messergebnis
    // aussieht.
    expect(res.body.program).toBeNull();
    // Der Wallet-Zustand kommt trotzdem mit - daraus baut der Bildschirm den
    // Statusblock "noch nicht eingerichtet" statt eines toten Sendeknopfs.
    expect(res.body.wallet).toMatchObject({ apple: false, google: false, ready: false });
    expect(prismaMock.stampProgram.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({ where: { businessId: MEIN_BETRIEB } }),
    );
  });

  it("liefert die Wallet-Kennungen NICHT aus, nur den abgeleiteten Zustand", async () => {
    prismaMock.stampProgram.findFirst.mockResolvedValue(
      programmZeile({ applePassTypeIdentifier: "pass.de.maitr.stempel", googleClassId: null }),
    );

    const res = await request(appAlsAngemeldet()).get(`/loyalty/program?venueId=${MEIN_BETRIEB}`);

    expect(res.status).toBe(200);
    expect(res.body.program.walletStatus).toEqual({ apple: true, google: false });
    // Die Kennung selbst darf nicht über die Grenze: ein Eingabefeld dafür wäre ein
    // Weg, die Darstellung ausgelieferter Karten fremder Betriebe zu ändern.
    expect(JSON.stringify(res.body)).not.toContain("pass.de.maitr.stempel");
  });

  it("weist einen fremden Betrieb mit 403 ab", async () => {
    const res = await request(appAlsAngemeldet()).get(`/loyalty/program?venueId=${FREMDER_BETRIEB}`);

    expect(res.status).toBe(403);
    expect(prismaMock.stampProgram.findFirst).not.toHaveBeenCalled();
  });
});

/* ── Mandantentrennung ───────────────────────────────────────────────────── */

describe("Ein fremder Betrieb sieht nichts", () => {
  it("PATCH auf ein fremdes Programm endet mit 404, nicht mit 200", async () => {
    // Der Angreifer nennt SEINEN Betrieb (dort ist er Mitglied) und die fremde
    // Programmkennung. Die Suche mit businessId in der WHERE-Klausel findet nichts.
    prismaMock.stampProgram.findFirst.mockResolvedValue(null);

    const res = await request(appAlsAngemeldet())
      .patch(`/loyalty/program/${FREMDES_PROGRAMM}`)
      .send({ venueId: MEIN_BETRIEB, rewardText: "Gehört mir jetzt" });

    expect(res.status).toBe(404);
    // Der eigentliche Punkt: businessId steht IN der WHERE-Klausel des Lesezugriffs,
    // nicht als Prüfung davor. Baut man sie aus, fällt genau diese Erwartung.
    expect(prismaMock.stampProgram.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: FREMDES_PROGRAMM, businessId: MEIN_BETRIEB },
      }),
    );
    // Und es wurde nichts geschrieben.
    expect(prismaMock.stampProgram.updateMany).not.toHaveBeenCalled();
    expect(prismaMock.stampCard.updateMany).not.toHaveBeenCalled();
  });

  it("die Kartenliste eines fremden Programms bleibt 404", async () => {
    prismaMock.stampProgram.findFirst.mockResolvedValue(null);

    const res = await request(appAlsAngemeldet()).get(
      `/loyalty/program/${FREMDES_PROGRAMM}/cards?venueId=${MEIN_BETRIEB}`,
    );

    expect(res.status).toBe(404);
    expect(prismaMock.stampCard.findMany).not.toHaveBeenCalled();
  });

  it("ein fremdes Kartendetail wird nicht ausgeliefert", async () => {
    prismaMock.stampCard.findFirst.mockResolvedValue(null);

    const res = await request(appAlsAngemeldet()).get(
      `/loyalty/cards/${FREMDE_KARTE}?venueId=${MEIN_BETRIEB}`,
    );

    expect(res.status).toBe(404);
    expect(prismaMock.stampCard.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: FREMDE_KARTE, businessId: MEIN_BETRIEB },
      }),
    );
  });

  it("der Verlauf einer fremden Karte wird gar nicht erst gelesen", async () => {
    prismaMock.stampCard.findFirst.mockResolvedValue(null);

    const res = await request(appAlsAngemeldet()).get(
      `/loyalty/cards/${FREMDE_KARTE}/events?venueId=${MEIN_BETRIEB}`,
    );

    expect(res.status).toBe(404);
    // Ohne die Zugehörigkeitsprüfung käme hier eine leere Liste mit 200 - und der
    // Unterschied zwischen "gibt es nicht" und "gehört einem anderen" wäre ablesbar.
    expect(prismaMock.stampEvent.findMany).not.toHaveBeenCalled();
    expect(prismaMock.stampCard.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: FREMDE_KARTE, businessId: MEIN_BETRIEB } }),
    );
  });

  it("weist widersprüchliche venueId-Quellen mit 400 ab", async () => {
    const res = await request(appAlsAngemeldet())
      .patch(`/loyalty/program/${MEIN_PROGRAMM}?venueId=${MEIN_BETRIEB}`)
      .send({ venueId: FREMDER_BETRIEB, rewardText: "Neu" });

    expect(res.status).toBe(400);
    expect(prismaMock.businessMember.findUnique).not.toHaveBeenCalled();
    expect(prismaMock.stampProgram.updateMany).not.toHaveBeenCalled();
  });
});

/* ── Prämie und Stempelzahl ändern ───────────────────────────────────────── */

describe("Prämie ändern berührt laufende Karten wie festgelegt", () => {
  it("schreibt den ALTEN Text in laufende Karten ohne Snapshot, bevor der neue gilt", async () => {
    prismaMock.stampProgram.findFirst
      .mockResolvedValueOnce(programmZeile())
      .mockResolvedValueOnce(programmZeile({ rewardText: "1x Espresso" }));
    prismaMock.stampCard.updateMany.mockResolvedValue({ count: 43 });
    prismaMock.stampCard.count.mockResolvedValue(43);

    const res = await request(appAlsAngemeldet())
      .patch(`/loyalty/program/${MEIN_PROGRAMM}`)
      .send({ venueId: MEIN_BETRIEB, rewardText: "1x Espresso" });

    expect(res.status).toBe(200);
    // DAS ist der Kern: 43 laufende Karten behalten "1x Kaffee gratis". Ohne diesen
    // Schritt bekäme auch der Gast mit 10 von 10 rückwirkend eine andere Zusage -
    // die neue Spalte allein reicht nicht, weil sie wegen der Migration nullbar ist
    // und gelesen wird als `karte.rewardText ?? programm.rewardText`.
    expect(prismaMock.stampCard.updateMany).toHaveBeenCalledWith({
      where: {
        businessId: MEIN_BETRIEB,
        programId: MEIN_PROGRAMM,
        rewardText: null,
        status: { in: ["ACTIVE", "COMPLETED"] },
      },
      data: { rewardText: "1x Kaffee gratis" },
    });
    expect(res.body.wirkung).toMatchObject({
      laufendeKarten: 43,
      praemieFestgeschrieben: 43,
      nurFuerNeueKarten: ["rewardText"],
      sofortWirksam: [],
    });
    expect(res.body.program.rewardText).toBe("1x Espresso");
  });

  it("ändert bei neuer Stempelzahl KEINE laufende Karte", async () => {
    prismaMock.stampProgram.findFirst
      .mockResolvedValueOnce(programmZeile())
      .mockResolvedValueOnce(programmZeile({ maxStamps: 8 }));
    prismaMock.stampCard.count.mockResolvedValue(43);

    const res = await request(appAlsAngemeldet())
      .patch(`/loyalty/program/${MEIN_PROGRAMM}`)
      .send({ venueId: MEIN_BETRIEB, maxStamps: 8 });

    expect(res.status).toBe(200);
    // StampCard.maxStamps ist ein Snapshot der Ausgabe. Die laufende Karte behält
    // ihre 10 - genau dafür gibt es den Snapshot.
    expect(prismaMock.stampCard.updateMany).not.toHaveBeenCalled();
    expect(res.body.wirkung.nurFuerNeueKarten).toEqual(["maxStamps"]);
    expect(res.body.wirkung.laufendeKarten).toBe(43);
  });

  it("meldet die Sperrfrist als einziges Feld, das sofort auch laufende Karten trifft", async () => {
    prismaMock.stampProgram.findFirst
      .mockResolvedValueOnce(programmZeile())
      .mockResolvedValueOnce(programmZeile({ cooldownSeconds: 1800 }));

    const res = await request(appAlsAngemeldet())
      .patch(`/loyalty/program/${MEIN_PROGRAMM}`)
      .send({ venueId: MEIN_BETRIEB, cooldownSeconds: 1800 });

    expect(res.status).toBe(200);
    expect(res.body.wirkung.sofortWirksam).toEqual(["cooldownSeconds"]);
    expect(res.body.wirkung.nurFuerNeueKarten).toEqual([]);
  });

  it("lässt keine Wallet-Kennung durch den Rumpf in den Schreibzugriff", async () => {
    const res = await request(appAlsAngemeldet())
      .patch(`/loyalty/program/${MEIN_PROGRAMM}`)
      .send({ venueId: MEIN_BETRIEB, googleClassId: "3388000000000000000.fremd" });

    // `.strict()` weist den unbekannten Schlüssel ab, bevor irgendetwas passiert.
    expect(res.status).toBe(422);
    expect(prismaMock.stampProgram.updateMany).not.toHaveBeenCalled();
  });

  it("weist einen zu langen Prämientext ab (der Text steht auf dem Pass)", async () => {
    const res = await request(appAlsAngemeldet())
      .patch(`/loyalty/program/${MEIN_PROGRAMM}`)
      .send({ venueId: MEIN_BETRIEB, rewardText: "x".repeat(61) });

    expect(res.status).toBe(422);
    expect(prismaMock.stampProgram.updateMany).not.toHaveBeenCalled();
  });
});

describe("POST /loyalty/program", () => {
  it("legt genau ein Programm an", async () => {
    prismaMock.stampProgram.findFirst.mockResolvedValue(null);
    prismaMock.stampProgram.create.mockResolvedValue(programmZeile());

    const res = await request(appAlsAngemeldet()).post("/loyalty/program").send({
      venueId: MEIN_BETRIEB,
      name: "Stempelkarte",
      maxStamps: 10,
      rewardText: "1x Kaffee gratis",
      cooldownSeconds: 3600,
      validityDays: null,
      isActive: true,
    });

    expect(res.status).toBe(201);
    expect(prismaMock.stampProgram.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ businessId: MEIN_BETRIEB, validityDays: null }),
      }),
    );
  });

  it("legt kein zweites an, sondern gibt das vorhandene mit 409 zurück", async () => {
    prismaMock.stampProgram.findFirst.mockResolvedValue(programmZeile());

    const res = await request(appAlsAngemeldet()).post("/loyalty/program").send({
      venueId: MEIN_BETRIEB,
      name: "Zweites",
      maxStamps: 5,
      rewardText: "Etwas anderes",
      cooldownSeconds: 0,
      validityDays: null,
      isActive: true,
    });

    expect(res.status).toBe(409);
    expect(res.body.error).toBe("programm_existiert_bereits");
    // Der Bildschirm muss aus dem Doppeltipp keine Sackgasse machen müssen.
    expect(res.body.program.id).toBe(MEIN_PROGRAMM);
    expect(prismaMock.stampProgram.create).not.toHaveBeenCalled();
  });
});

/* ── Die Zahlen kommen aus dem Hauptbuch ─────────────────────────────────── */

describe("Übersicht rechnet aus dem Hauptbuch, nicht aus dem Lese-Cache", () => {
  it("nimmt die Summe der Ereignisse, auch wenn currentStamps etwas anderes behauptet", async () => {
    prismaMock.stampProgram.findFirst.mockResolvedValue(programmZeile());
    prismaMock.stampCard.findMany.mockResolvedValue([
      // Der Cache sagt 3, das Hauptbuch sagt 9 - also "kurz vor der Prämie".
      { id: "k1", cycle: 1, status: "ACTIVE", maxStamps: 10, currentStamps: 3, completedAt: null },
      // Der Cache sagt 10, das Hauptbuch sagt 4 - also NICHT voll.
      { id: "k2", cycle: 2, status: "ACTIVE", maxStamps: 10, currentStamps: 10, completedAt: null },
    ]);
    prismaMock.stampEvent.groupBy.mockResolvedValue([
      { stampCardId: "k1", _sum: { delta: 9 }, _max: { createdAt: new Date() }, _min: { createdAt: new Date() } },
      { stampCardId: "k2", _sum: { delta: 4 }, _max: { createdAt: new Date() }, _min: { createdAt: new Date() } },
    ]);

    const res = await request(appAlsAngemeldet()).get(
      `/loyalty/program/${MEIN_PROGRAMM}/overview?venueId=${MEIN_BETRIEB}`,
    );

    expect(res.status).toBe(200);
    // Beide Abfragen sind betriebsgebunden - das Programm aus dem Pfad ebenso wie
    // die Karten dazu. Baut man eine der beiden Eingrenzungen aus, fällt dieser Test.
    expect(prismaMock.stampProgram.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: MEIN_PROGRAMM, businessId: MEIN_BETRIEB } }),
    );
    expect(prismaMock.stampCard.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { businessId: MEIN_BETRIEB, programId: MEIN_PROGRAMM } }),
    );
    expect(res.body.fastVoll).toBe(1); // k1 aus dem Hauptbuch
    expect(res.body.voll).toBe(0); // k2 ist NICHT voll, egal was der Cache sagt
    expect(res.body.wiederkommer).toBe(1); // k2 hat cycle 2
    // Beide Karten weichen ab - das steht in der Antwort statt still zu wirken.
    expect(res.body.cacheAbweichungen).toBe(2);
  });

  it("zählt eingelöste Prämien über die EREIGNISSE, nicht über den Kartenstatus", async () => {
    prismaMock.stampProgram.findFirst.mockResolvedValue(programmZeile());
    prismaMock.stampCard.findMany.mockResolvedValue([
      { id: "k1", cycle: 3, status: "ACTIVE", maxStamps: 10, currentStamps: 0, completedAt: null },
    ]);
    prismaMock.stampEvent.count.mockResolvedValue(2);

    const res = await request(appAlsAngemeldet()).get(
      `/loyalty/program/${MEIN_PROGRAMM}/overview?venueId=${MEIN_BETRIEB}`,
    );

    expect(res.body.eingeloest30d).toBe(2);
    // Eine Karte kann in mehreren Zyklen eingelöst werden; der Status zeigt nur den
    // letzten. Deshalb muss über StampEvent gezählt werden.
    expect(prismaMock.stampEvent.count).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ businessId: MEIN_BETRIEB, kind: "REDEEMED" }),
      }),
    );
  });

  it("verschweigt die Durchlaufdauer, solange sie Zufall wäre", async () => {
    const start = new Date("2026-07-01T00:00:00.000Z");
    const karten = [1, 2, 3].map((n) => ({
      id: `k${n}`,
      cycle: 1,
      status: "REDEEMED",
      maxStamps: 10,
      currentStamps: 0,
      completedAt: new Date("2026-07-11T00:00:00.000Z"),
    }));
    prismaMock.stampProgram.findFirst.mockResolvedValue(programmZeile());
    prismaMock.stampCard.findMany.mockResolvedValue(karten);
    prismaMock.stampEvent.groupBy.mockResolvedValue(
      karten.map((k) => ({
        stampCardId: k.id,
        _sum: { delta: 0 },
        _max: { createdAt: start },
        _min: { createdAt: start },
      })),
    );

    const res = await request(appAlsAngemeldet()).get(
      `/loyalty/program/${MEIN_PROGRAMM}/overview?venueId=${MEIN_BETRIEB}`,
    );

    // Drei Karten sind kein Messwert. `null` statt einer Zahl, die wie ein
    // Ergebnis aussieht.
    expect(res.body.medianTageBisVoll).toBeNull();
  });

  it("liefert bei einem Programm ohne Karten Nullen statt eines Absturzes", async () => {
    prismaMock.stampProgram.findFirst.mockResolvedValue(programmZeile());
    prismaMock.stampCard.findMany.mockResolvedValue([]);

    const res = await request(appAlsAngemeldet()).get(
      `/loyalty/program/${MEIN_PROGRAMM}/overview?venueId=${MEIN_BETRIEB}`,
    );

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ gesamt: 0, aktiv: 0, voll: 0, medianTageBisVoll: null });
    // Ohne Karten wird das Hauptbuch gar nicht erst befragt.
    expect(prismaMock.stampEvent.groupBy).not.toHaveBeenCalled();
  });
});

/* ── Kartenliste ─────────────────────────────────────────────────────────── */

describe("Wer sammelt", () => {
  it("ersetzt den Namen anonymisierter Gäste serverseitig", async () => {
    prismaMock.stampProgram.findFirst.mockResolvedValue(programmZeile());
    prismaMock.stampCard.findMany.mockResolvedValue([
      kartenZeile({
        id: "k1",
        guest: { id: "g1", name: "Anna Meier", anonymizedAt: new Date(), isMock: false },
      }),
    ]);
    prismaMock.stampEvent.groupBy.mockResolvedValue([
      { stampCardId: "k1", _sum: { delta: 7 }, _max: { createdAt: new Date("2026-08-01T09:00:00.000Z") }, _min: { createdAt: new Date() } },
    ]);

    const res = await request(appAlsAngemeldet()).get(
      `/loyalty/program/${MEIN_PROGRAMM}/cards?venueId=${MEIN_BETRIEB}`,
    );

    expect(res.status).toBe(200);
    expect(res.body.items[0].gast).toMatchObject({
      anzeigename: "Gelöschter Gast",
      geloescht: true,
    });
    // Der echte Name verlässt den Server nicht - die Ersetzung passiert hier und
    // nicht erst in der Anzeige.
    expect(JSON.stringify(res.body)).not.toContain("Anna Meier");
    // Der Stand kommt aus dem Hauptbuch, nicht aus currentStamps (dort steht 3).
    expect(res.body.items[0].stand).toEqual({ current: 7, max: 10 });
  });

  it("führt keine Kontaktspalte mit", async () => {
    prismaMock.stampProgram.findFirst.mockResolvedValue(programmZeile());
    prismaMock.stampCard.findMany.mockResolvedValue([kartenZeile()]);

    const res = await request(appAlsAngemeldet()).get(
      `/loyalty/program/${MEIN_PROGRAMM}/cards?venueId=${MEIN_BETRIEB}`,
    );

    // Telefon und E-Mail sind nullbar und in einer Liste nicht zweckgedeckt; sie
    // werden schon gar nicht erst SELECTiert.
    const select = prismaMock.stampCard.findMany.mock.calls[0][0].select;
    expect(select.guest.select).toEqual({ id: true, name: true, anonymizedAt: true, isMock: true });
    expect(JSON.stringify(res.body)).not.toContain("phone");
  });

  it("grenzt die Liste über businessId ein", async () => {
    prismaMock.stampProgram.findFirst.mockResolvedValue(programmZeile());

    await request(appAlsAngemeldet()).get(
      `/loyalty/program/${MEIN_PROGRAMM}/cards?venueId=${MEIN_BETRIEB}`,
    );

    expect(prismaMock.stampCard.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { businessId: MEIN_BETRIEB, programId: MEIN_PROGRAMM },
      }),
    );
  });
});

/* ── Stempeln ────────────────────────────────────────────────────────────── */

describe("POST /loyalty/cards/:cardId/stamps", () => {
  const KARTE = "karte-1";
  const SCHLUESSEL = "vorgang-abc-12345";

  function stempelAnfrage(schluessel = SCHLUESSEL) {
    return request(appAlsAngemeldet())
      .post(`/loyalty/cards/${KARTE}/stamps`)
      .send({ venueId: MEIN_BETRIEB, idempotencyKey: schluessel });
  }

  it("bucht und schreibt den Stand aus dem Hauptbuch fort", async () => {
    prismaMock.stampCard.findFirst.mockResolvedValue(kartenZeile({ id: KARTE, currentStamps: 99 }));
    prismaMock.stampProgram.findFirst.mockResolvedValue(programmZeile({ cooldownSeconds: 0 }));
    prismaMock.stampEvent.aggregate.mockResolvedValue({ _sum: { delta: 4 } });

    const res = await stempelAnfrage();

    expect(res.status).toBe(200);
    // Schon das LESEN der Karte ist betriebsgebunden, nicht erst das Schreiben.
    expect(prismaMock.stampCard.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: KARTE, businessId: MEIN_BETRIEB } }),
    );
    // Optimistische Sperre UND Mandantenbindung im selben WHERE.
    expect(prismaMock.stampCard.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: KARTE, businessId: MEIN_BETRIEB, version: 7 },
      }),
    );
    // Der Cache wird auf den Hauptbuchstand GESETZT (4 + 1), nicht blind erhöht -
    // ein verrutschter Cache (hier 99) heilt damit.
    expect(prismaMock.stampCard.updateMany.mock.calls[0][0].data.currentStamps).toBe(5);
    expect(prismaMock.stampEvent.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          businessId: MEIN_BETRIEB,
          kind: "EARNED",
          delta: 1,
          balanceAfter: 5,
          source: "MANUAL",
          // Wer gestempelt hat, kommt aus der Sitzung - sonst wäre die
          // Missbrauchsprüfung wertlos.
          staffUserId: ICH,
        }),
      }),
    );
  });

  it("setzt COMPLETED, sobald der Snapshot der Karte erreicht ist", async () => {
    prismaMock.stampCard.findFirst.mockResolvedValue(kartenZeile({ id: KARTE, maxStamps: 10 }));
    prismaMock.stampProgram.findFirst.mockResolvedValue(programmZeile({ cooldownSeconds: 0 }));
    prismaMock.stampEvent.aggregate.mockResolvedValue({ _sum: { delta: 9 } });

    await stempelAnfrage();

    expect(prismaMock.stampCard.updateMany.mock.calls[0][0].data.status).toBe("COMPLETED");
  });

  it("hält die Sperrfrist ein und sagt, ab wann wieder", async () => {
    const letzter = new Date(Date.now() - 60_000);
    prismaMock.stampCard.findFirst.mockResolvedValue(kartenZeile({ id: KARTE }));
    prismaMock.stampProgram.findFirst.mockResolvedValue(programmZeile({ cooldownSeconds: 3600 }));
    prismaMock.stampEvent.findFirst
      .mockResolvedValueOnce(null) // Idempotenzprüfung: nichts gebucht
      .mockResolvedValueOnce({ createdAt: letzter }); // letzter EARNED-Eintrag

    const res = await stempelAnfrage();

    expect(res.status).toBe(409);
    expect(res.body.error).toBe("sperrfrist");
    expect(new Date(res.body.frueheste).getTime()).toBe(letzter.getTime() + 3_600_000);
    expect(prismaMock.stampEvent.create).not.toHaveBeenCalled();
    expect(prismaMock.stampCard.updateMany).not.toHaveBeenCalled();
  });

  it("wertet denselben Vorgangsschlüssel als Erfolg, nicht als zweiten Stempel", async () => {
    prismaMock.stampCard.findFirst.mockResolvedValue(kartenZeile({ id: KARTE }));
    prismaMock.stampEvent.findFirst.mockResolvedValue({ id: "ev-schon-da" });

    const res = await stempelAnfrage();

    expect(res.status).toBe(200);
    expect(res.body.wiederholung).toBe(true);
    // Das erste Piepen ging unter, das Personal tippt nochmal - es darf kein zweiter
    // Stempel entstehen.
    expect(prismaMock.stampEvent.create).not.toHaveBeenCalled();
    expect(prismaMock.stampCard.updateMany).not.toHaveBeenCalled();
  });

  it("bucht nichts, wenn die optimistische Sperre greift", async () => {
    prismaMock.stampCard.findFirst.mockResolvedValue(kartenZeile({ id: KARTE }));
    prismaMock.stampProgram.findFirst.mockResolvedValue(programmZeile({ cooldownSeconds: 0 }));
    prismaMock.stampCard.updateMany.mockResolvedValue({ count: 0 });

    const res = await stempelAnfrage();

    expect(res.status).toBe(409);
    expect(res.body.error).toBe("konflikt");
    expect(prismaMock.stampEvent.create).not.toHaveBeenCalled();
  });

  it("stempelt keine fremde Karte", async () => {
    prismaMock.stampCard.findFirst.mockResolvedValue(null);

    const res = await request(appAlsAngemeldet())
      .post(`/loyalty/cards/${FREMDE_KARTE}/stamps`)
      .send({ venueId: MEIN_BETRIEB, idempotencyKey: SCHLUESSEL });

    expect(res.status).toBe(404);
    expect(prismaMock.stampEvent.create).not.toHaveBeenCalled();
  });
});

/* ── Karte ausgeben ──────────────────────────────────────────────────────── */

describe("POST /loyalty/cards", () => {
  beforeEach(() => {
    prismaMock.stampProgram.findFirst.mockResolvedValue(programmZeile());
    prismaMock.maitrGuest.create.mockResolvedValue({ id: "gast-neu" });
    prismaMock.stampCard.create.mockResolvedValue({ id: "karte-neu" });
    prismaMock.stampCard.findFirst.mockResolvedValue(kartenZeile({ id: "karte-neu" }));
  });

  it("schreibt die Telefonnummer NORMALISIERT mit - sonst greift der Unique-Index nie", async () => {
    const res = await request(appAlsAngemeldet())
      .post("/loyalty/cards")
      .send({ venueId: MEIN_BETRIEB, gast: { name: "Anna M.", phone: "0151 2345678" } });

    expect(res.status).toBe(201);
    expect(prismaMock.maitrGuest.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          phone: "0151 2345678",
          // Ohne diesen Wert lässt Postgres beliebig viele NULL nebeneinander zu -
          // derselbe Gast entstand bei jedem Besuch neu, und seine spätere
          // Löschanfrage traf nur eine der Zeilen.
          phoneE164: "491512345678",
        }),
      }),
    );
  });

  it("erkennt denselben Gast an der Nummer wieder, statt ihn doppelt anzulegen", async () => {
    prismaMock.maitrGuest.findFirst.mockResolvedValue({
      id: "gast-anna",
      name: "Anna M.",
      anonymizedAt: null,
      isMock: false,
    });

    const res = await request(appAlsAngemeldet())
      .post("/loyalty/cards")
      .send({ venueId: MEIN_BETRIEB, gast: { name: "Anna M.", phone: "+49 151 2345678" } });

    expect(res.status).toBe(201);
    expect(prismaMock.maitrGuest.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { businessId: MEIN_BETRIEB, phoneE164: "491512345678" },
      }),
    );
    expect(prismaMock.maitrGuest.create).not.toHaveBeenCalled();
    // Die Karte hängt am BESTEHENDEN Gast - nur so kann `cycle` je über 1 steigen
    // und die Kennzahl "Zweite Karte begonnen" je etwas anderes als 0 zeigen.
    expect(prismaMock.stampCard.create.mock.calls[0][0].data.guestId).toBe("gast-anna");
  });

  it("gibt für einen bereits gelöschten Gast auch über die Nummer keine Karte aus", async () => {
    prismaMock.maitrGuest.findFirst.mockResolvedValue({
      id: "gast-anna",
      name: "Gelöschter Gast",
      anonymizedAt: new Date("2026-01-01T00:00:00.000Z"),
      isMock: false,
    });

    const res = await request(appAlsAngemeldet())
      .post("/loyalty/cards")
      .send({ venueId: MEIN_BETRIEB, gast: { name: "Anna M.", phone: "0151 2345678" } });

    expect(res.status).toBe(409);
    expect(res.body.error).toBe("gast_geloescht");
    expect(prismaMock.stampCard.create).not.toHaveBeenCalled();
  });

  it("hält auch eine VOLLE, noch nicht eingelöste Karte für „läuft bereits“", async () => {
    // Sonst bekommt der Gast eine zweite Karte, die volle rutscht in der nach
    // createdAt sortierten Liste nach unten, und die Prämie wird vergessen. Der 409
    // trägt die Kartenkennung mit - der Bildschirm öffnet damit genau die Karte, auf
    // der "Prämie eingelöst" steht.
    prismaMock.maitrGuest.findFirst.mockResolvedValue({
      id: "gast-anna",
      name: "Anna M.",
      anonymizedAt: null,
      isMock: false,
    });
    prismaMock.stampCard.findMany.mockResolvedValue([
      { id: "karte-voll", cycle: 1, status: "COMPLETED" },
    ]);

    const res = await request(appAlsAngemeldet())
      .post("/loyalty/cards")
      .send({ venueId: MEIN_BETRIEB, guestId: "gast-anna" });

    expect(res.status).toBe(409);
    expect(res.body).toMatchObject({ error: "karte_laeuft_bereits", kartenId: "karte-voll" });
    expect(prismaMock.stampCard.create).not.toHaveBeenCalled();
  });

  it("rät bei einer unklaren Nummer nicht - dann lieber ein neuer Gast", async () => {
    // "1512345678" könnte Durchwahl, Nummer ohne Vorwahl oder internationale Form
    // sein. Wer hier rät, führt zwei fremde Gäste zusammen.
    const res = await request(appAlsAngemeldet())
      .post("/loyalty/cards")
      .send({ venueId: MEIN_BETRIEB, gast: { name: "Anna M.", phone: "1512345678" } });

    expect(res.status).toBe(201);
    expect(prismaMock.maitrGuest.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ phoneE164: null }) }),
    );
  });
});

/* ── Prämie einlösen ─────────────────────────────────────────────────────── */

describe("POST /loyalty/cards/:cardId/redeem", () => {
  const KARTE = "karte-1";

  it("löst nur ein, wenn das Hauptbuch die Prämie hergibt", async () => {
    prismaMock.stampCard.findFirst.mockResolvedValue(kartenZeile({ id: KARTE, status: "COMPLETED" }));
    // Der Cache behauptet 10 (siehe COMPLETED), das Hauptbuch sagt 6.
    prismaMock.stampEvent.aggregate.mockResolvedValue({ _sum: { delta: 6 } });

    const res = await request(appAlsAngemeldet())
      .post(`/loyalty/cards/${KARTE}/redeem`)
      .send({ venueId: MEIN_BETRIEB, idempotencyKey: "vorgang-einloesen-1" });

    expect(res.status).toBe(409);
    expect(res.body).toMatchObject({ error: "praemie_nicht_erreicht", stand: 6, benoetigt: 10 });
    expect(prismaMock.stampEvent.create).not.toHaveBeenCalled();
    // Auch hier: das Lesen der Karte ist betriebsgebunden.
    expect(prismaMock.stampCard.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: KARTE, businessId: MEIN_BETRIEB } }),
    );
  });

  it("bucht ein eigenes Ereignis und lässt einen Überschuss stehen - auf einer OFFENEN Karte", async () => {
    prismaMock.stampCard.findFirst.mockResolvedValue(kartenZeile({ id: KARTE, status: "COMPLETED" }));
    prismaMock.stampEvent.aggregate.mockResolvedValue({ _sum: { delta: 11 } });

    const res = await request(appAlsAngemeldet())
      .post(`/loyalty/cards/${KARTE}/redeem`)
      .send({ venueId: MEIN_BETRIEB, idempotencyKey: "vorgang-einloesen-2" });

    expect(res.status).toBe(200);
    // Eigenes Ereignis statt "currentStamps = 0" - sonst wäre hinterher nicht
    // unterscheidbar, ob eingelöst oder zurückgesetzt wurde.
    expect(prismaMock.stampEvent.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ kind: "REDEEMED", delta: -10, balanceAfter: 1 }),
      }),
    );
    const geschrieben = prismaMock.stampCard.updateMany.mock.calls[0][0].data;
    expect(geschrieben.currentStamps).toBe(1);
    // DAS IST DER PUNKT, und die Spalte allein prüfte ihn nicht: mit `REDEEMED`
    // wäre der elfte Stempel auf einer geschlossenen Karte gelandet - nicht mehr
    // bestempelbar (der Stempelpfad verlangt ACTIVE), nicht mehr einlösbar, und die
    // Folgekarte beginnt bei 0. Er wäre dem Gast genommen.
    expect(geschrieben.status).toBe("ACTIVE");
    expect(geschrieben.completedAt).toBeNull();
    expect(geschrieben.redeemedCount).toEqual({ increment: 1 });
  });

  it("schliesst die Karte, wenn NICHTS übrig bleibt", async () => {
    prismaMock.stampCard.findFirst.mockResolvedValue(kartenZeile({ id: KARTE, status: "COMPLETED" }));
    prismaMock.stampEvent.aggregate.mockResolvedValue({ _sum: { delta: 10 } });

    const res = await request(appAlsAngemeldet())
      .post(`/loyalty/cards/${KARTE}/redeem`)
      .send({ venueId: MEIN_BETRIEB, idempotencyKey: "vorgang-einloesen-3" });

    expect(res.status).toBe(200);
    const geschrieben = prismaMock.stampCard.updateMany.mock.calls[0][0].data;
    expect(geschrieben.currentStamps).toBe(0);
    expect(geschrieben.status).toBe("REDEEMED");
  });
});

/* ── Gastdaten löschen ───────────────────────────────────────────────────── */

describe("POST /loyalty/guests/:guestId/anonymize", () => {
  it("anonymisiert und räumt die Wallet-Registrierungen mit ab", async () => {
    prismaMock.maitrGuest.findFirst.mockResolvedValue({ id: "gast-1", anonymizedAt: null });
    prismaMock.stampCard.findMany.mockResolvedValue([{ id: "k1" }, { id: "k2" }]);

    const res = await request(appAlsAngemeldet())
      .post("/loyalty/guests/gast-1/anonymize")
      .send({ venueId: MEIN_BETRIEB });

    expect(res.status).toBe(204);
    expect(prismaMock.maitrGuest.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: "gast-1", businessId: MEIN_BETRIEB } }),
    );
    // deviceLibraryIdentifier und pushToken sind personenbezogen; blieben sie stehen,
    // wäre das Gerät der Person nach der Anonymisierung weiter adressierbar.
    expect(prismaMock.walletDeviceRegistration.deleteMany).toHaveBeenCalledWith({
      where: { businessId: MEIN_BETRIEB, stampCardId: { in: ["k1", "k2"] } },
    });
    expect(prismaMock.maitrGuest.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "gast-1", businessId: MEIN_BETRIEB },
        data: expect.objectContaining({
          name: "Gelöschter Gast",
          phone: null,
          phoneE164: null,
          email: null,
        }),
      }),
    );
    // Karten und Hauptbuch bleiben stehen - sie sind der Nachweis des Betriebs.
    expect(prismaMock.stampCard.deleteMany).not.toHaveBeenCalled();
    expect(prismaMock.stampEvent.deleteMany).not.toHaveBeenCalled();
  });

  it("rührt einen fremden Gast nicht an", async () => {
    prismaMock.maitrGuest.findFirst.mockResolvedValue(null);

    const res = await request(appAlsAngemeldet())
      .post("/loyalty/guests/gast-des-nachbarn/anonymize")
      .send({ venueId: MEIN_BETRIEB });

    expect(res.status).toBe(404);
    expect(prismaMock.maitrGuest.updateMany).not.toHaveBeenCalled();
    expect(prismaMock.walletDeviceRegistration.deleteMany).not.toHaveBeenCalled();
  });

  it("hinterlässt eine Spur, WER anonymisiert hat", async () => {
    prismaMock.maitrGuest.findFirst.mockResolvedValue({ id: "gast-1", anonymizedAt: null });
    prismaMock.stampCard.findMany.mockResolvedValue([{ id: "k1" }]);

    const res = await request(appAlsAngemeldet())
      .post("/loyalty/guests/gast-1/anonymize")
      .send({ venueId: MEIN_BETRIEB });

    expect(res.status).toBe(204);
    // Der einzige unumkehrbare Schreibzugriff dieses Moduls, der KEIN StampEvent
    // erzeugt: ohne diese Zeile bliebe er spurlos. Wer sich vierzigmal auf einen
    // erfundenen Gast gestempelt hat, entfernte damit den einzigen Beleg dafür,
    // dass der Gast ein Phantom war.
    expect(prismaMock.auditLog.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          userId: ICH,
          action: "guest.anonymize",
          resource: "MaitrGuest",
          resourceId: "gast-1",
        }),
      }),
    );
    // Und NICHT die gelöschten Daten selbst - ein Protokoll, das sie mitschreibt,
    // hebt die Löschung auf.
    const geschrieben = JSON.stringify(prismaMock.auditLog.create.mock.calls[0][0]);
    expect(geschrieben).not.toContain("phone");
    expect(geschrieben).not.toContain("Anna");
  });

  it("fasst einen Gast ohne Stempelkarte nicht an", async () => {
    // Der Bildschirm heisst "Stempelkarte". Ohne diesen Filter konnte über ihn jeder
    // Gast des Betriebs anonymisiert werden, auch ein reiner Reservierungsgast.
    prismaMock.maitrGuest.findFirst.mockResolvedValue({ id: "gast-ohne-karte", anonymizedAt: null });
    prismaMock.stampCard.findMany.mockResolvedValue([]);

    const res = await request(appAlsAngemeldet())
      .post("/loyalty/guests/gast-ohne-karte/anonymize")
      .send({ venueId: MEIN_BETRIEB });

    expect(res.status).toBe(404);
    expect(prismaMock.maitrGuest.updateMany).not.toHaveBeenCalled();
    expect(prismaMock.auditLog.create).not.toHaveBeenCalled();
  });
});

/* ── Die Rolle im Betrieb ────────────────────────────────────────────────── */

describe("Eine Aushilfe darf lesen und stempeln, aber keine Zusage ändern", () => {
  it.each([
    {
      was: "die Prämie ändern",
      lauf: () =>
        request(appAlsAushilfe())
          .patch(`/loyalty/program/${MEIN_PROGRAMM}`)
          .send({ venueId: MEIN_BETRIEB, rewardText: "1x Leitungswasser" }),
    },
    {
      was: "ein Programm anlegen",
      lauf: () =>
        request(appAlsAushilfe()).post("/loyalty/program").send({
          venueId: MEIN_BETRIEB,
          name: "Meins",
          maxStamps: 10,
          rewardText: "1x Kaffee gratis",
          cooldownSeconds: 3600,
          validityDays: null,
          isActive: true,
        }),
    },
    {
      was: "eine Karte entwerten",
      lauf: () =>
        request(appAlsAushilfe())
          .post("/loyalty/cards/karte-1/void")
          .send({ venueId: MEIN_BETRIEB, grund: "aus Versehen" }),
    },
    {
      was: "Gastdaten löschen",
      lauf: () =>
        request(appAlsAushilfe())
          .post("/loyalty/guests/gast-1/anonymize")
          .send({ venueId: MEIN_BETRIEB }),
    },
  ])("$was: 403 statt 200", async ({ lauf }) => {
    const res = await lauf();

    expect(res.status).toBe(403);
    expect(res.body.error).toBe("nur_inhaber");
    // Es wurde nichts geschrieben - der Riegel sitzt VOR dem Handler.
    expect(prismaMock.stampProgram.updateMany).not.toHaveBeenCalled();
    expect(prismaMock.stampProgram.create).not.toHaveBeenCalled();
    expect(prismaMock.stampCard.updateMany).not.toHaveBeenCalled();
    expect(prismaMock.maitrGuest.updateMany).not.toHaveBeenCalled();
  });

  it("darf weiterhin stempeln - sonst kann das Personal nicht arbeiten", async () => {
    prismaMock.stampCard.findFirst.mockResolvedValue(kartenZeile({ id: "karte-1" }));
    prismaMock.stampProgram.findFirst.mockResolvedValue(programmZeile({ cooldownSeconds: 0 }));

    const res = await request(appAlsAushilfe())
      .post("/loyalty/cards/karte-1/stamps")
      .send({ venueId: MEIN_BETRIEB, idempotencyKey: "vorgang-aushilfe-1" });

    expect(res.status).toBe(200);
    expect(prismaMock.stampEvent.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ staffUserId: AUSHILFE }) }),
    );
  });

  it("bekommt die eigene Rolle mitgeliefert, damit der Bildschirm keine Knöpfe zeigt, die scheitern", async () => {
    prismaMock.stampProgram.findFirst.mockResolvedValue(programmZeile());

    const wirt = await request(appAlsAngemeldet()).get(`/loyalty/program?venueId=${MEIN_BETRIEB}`);
    const aushilfe = await request(appAlsAushilfe()).get(`/loyalty/program?venueId=${MEIN_BETRIEB}`);

    expect(wirt.body.rolle).toBe("OWNER");
    expect(aushilfe.body.rolle).toBe("STAFF");
  });
});

/* ── Fehlende Migration ──────────────────────────────────────────────────── */

describe("Solange die Migration nicht eingespielt ist", () => {
  it("antwortet mit 503 und einem benennbaren Grund, nicht mit 500", async () => {
    prismaMock.stampProgram.findFirst.mockImplementation(async () => {
      throw new Error("The table `public.StampProgram` does not exist in the current database.");
    });

    const res = await request(appAlsAngemeldet()).get(`/loyalty/program?venueId=${MEIN_BETRIEB}`);

    expect(res.status).toBe(503);
    expect(res.body).toEqual({ error: "loyalty_nicht_eingerichtet" });
  });

  it("erkennt auch die fehlende neue Spalte", async () => {
    prismaMock.stampProgram.findFirst.mockImplementation(async () => {
      const err = new Error('column "rewardText" does not exist') as Error & { code?: string };
      err.code = "P2022";
      throw err;
    });

    const res = await request(appAlsAngemeldet()).get(`/loyalty/program?venueId=${MEIN_BETRIEB}`);

    expect(res.status).toBe(503);
  });

  it("verschleiert einen ECHTEN Fehler nicht als 503", async () => {
    prismaMock.stampProgram.findFirst.mockImplementation(async () => {
      throw new Error("Can't reach database server at db:5432");
    });

    const res = await request(appAlsAngemeldet()).get(`/loyalty/program?venueId=${MEIN_BETRIEB}`);

    // Ein Verbindungsabbruch ist kein "noch nicht eingerichtet". Wer das gleich
    // behandelt, macht aus einem Ausfall eine dauerhaft ruhige Fehlermeldung.
    expect(res.status).toBe(500);
  });
});

/* ── Reine Rechenregeln ──────────────────────────────────────────────────── */

describe("Rechenregeln", () => {
  it("nimmt den Median und nicht den Mittelwert", () => {
    // Der eine Gast mit der Karte in der Jacke (365 Tage) verschöbe den Mittelwert
    // auf 80; der Median bleibt bei 8.
    expect(median([5, 7, 8, 9, 365])).toBe(8);
    expect(median([4, 6])).toBe(5);
    expect(median([])).toBeNull();
  });

  it("zählt nur ein oder zwei fehlende Stempel als 'kurz vor der Prämie'", () => {
    expect(istFastVoll(9, 10)).toBe(true);
    expect(istFastVoll(8, 10)).toBe(true);
    expect(istFastVoll(7, 10)).toBe(false);
    // Voll ist nicht "fast voll" - das wäre eine Doppelzählung mit `voll`.
    expect(istFastVoll(10, 10)).toBe(false);
  });

  it("unterscheidet fehlende Tabelle von echtem Ausfall", () => {
    expect(istFehlendeLoyaltyTabelle({ code: "P2021" })).toBe(true);
    expect(
      istFehlendeLoyaltyTabelle(
        new Error("The table `public.StampCard` does not exist in the current database."),
      ),
    ).toBe(true);
    expect(istFehlendeLoyaltyTabelle(new Error("Can't reach database server"))).toBe(false);
    expect(istFehlendeLoyaltyTabelle(new Error("Unique constraint failed"))).toBe(false);
  });
});

/* ── Ohne Anmeldung ──────────────────────────────────────────────────────── */

describe("Die Routen hängen in der ECHTEN App hinter der Anmeldung", () => {
  /**
   * `createServer()` NICHT im describe-Rumpf aufrufen.
   *
   * Dort läuft es beim Einsammeln der Testdatei, also bevor vitest die Umgebung
   * fertig aufgebaut hat - der erste Lauf nach einem Kaltstart scheiterte damit
   * reproduzierbar mit "socket hang up" (2 von 50), die folgenden nicht. Ein
   * flackernder SICHERHEITStest ist derjenige, den man irgendwann überspringt.
   */
  let app: ReturnType<typeof createServer>;
  beforeAll(() => {
    app = createServer();
  });

  it.each([
    { method: "get" as const, path: "/api/maitr/loyalty/program" },
    { method: "post" as const, path: "/api/maitr/loyalty/program" },
    { method: "patch" as const, path: "/api/maitr/loyalty/program/irgendeine-id" },
    { method: "get" as const, path: "/api/maitr/loyalty/program/irgendeine-id/overview" },
    { method: "get" as const, path: "/api/maitr/loyalty/program/irgendeine-id/cards" },
    { method: "get" as const, path: "/api/maitr/loyalty/cards/irgendeine-id" },
    { method: "get" as const, path: "/api/maitr/loyalty/cards/irgendeine-id/events" },
    { method: "post" as const, path: "/api/maitr/loyalty/cards" },
    { method: "post" as const, path: "/api/maitr/loyalty/cards/irgendeine-id/stamps" },
    { method: "post" as const, path: "/api/maitr/loyalty/cards/irgendeine-id/redeem" },
    { method: "post" as const, path: "/api/maitr/loyalty/cards/irgendeine-id/void" },
    { method: "post" as const, path: "/api/maitr/loyalty/guests/irgendeine-id/anonymize" },
  ])("$method $path → 401 ohne Token", async ({ method, path }) => {
    const res = await request(app)[method](path).send({});

    expect(res.status, `Antwort war ${res.status}: ${JSON.stringify(res.body)}`).toBe(401);
    // Ohne Anmeldung darf keine Zeile angefasst worden sein.
    expect(prismaMock.stampProgram.create).not.toHaveBeenCalled();
    expect(prismaMock.stampProgram.updateMany).not.toHaveBeenCalled();
    expect(prismaMock.stampCard.create).not.toHaveBeenCalled();
    expect(prismaMock.stampCard.updateMany).not.toHaveBeenCalled();
    expect(prismaMock.stampEvent.create).not.toHaveBeenCalled();
    expect(prismaMock.maitrGuest.updateMany).not.toHaveBeenCalled();
  });
});
