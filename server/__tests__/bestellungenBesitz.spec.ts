// @vitest-environment node
/**
 * Bestellereignisse gehören der Web-App, nicht dem Anfragenden.
 *
 * ANLASS: `server/routes/orders.ts` war der letzte Weg, an dem die
 * Besitzprüfung fehlte. Beide schreibenden Handler prüften nur, dass die
 * `webAppId` ein UUID IST - nie, wem sie gehört. Gemessen mit einem Konto OHNE
 * jede Mitgliedschaft:
 *
 *   POST /api/orders/create {"webAppId":"<fremd>", …}  -> 200, die erfundene
 *     Bestellung erschien sofort im unangemeldeten GET /orders/<fremd>/recent -
 *     also als Kaufanreiz auf der Website eines fremden Betriebs.
 *   POST /api/orders/<fremd>/clear-old                 -> 200, fremde Historie
 *     per `deleteMany` gelöscht. Unwiderruflich.
 *
 * Die Kennung ist dabei kein Geheimnis: Sie steht als `id` in jeder
 * öffentlichen Site-Antwort, weil die Gast-Website ihre eigenen Bestellungen
 * nachlädt. Der Angreifer muss nichts raten.
 *
 * Der Mock ist ein schreibender Mini-Speicher, kein Attrappen-Rückgabewert -
 * nur deshalb beweist „nichts gelöscht" überhaupt etwas.
 */
import { beforeEach, describe, expect, it, vi } from "vitest";
import express from "express";
import request from "supertest";

const { prismaMock } = vi.hoisted(() => ({
  prismaMock: {
    webApp: { findFirst: vi.fn() },
    orderEvent: { create: vi.fn(), deleteMany: vi.fn() },
  },
}));

vi.mock("../db/prisma", () => ({ default: prismaMock, prisma: prismaMock }));

import { handleClearOldOrders, handleCreateOrder } from "../routes/orders";

/** Inhaber A und sein Betrieb. */
const ICH = "user-a";
const MEINE_APP = "11111111-1111-4111-8111-111111111111";
/** Ein fremder Betrieb - dessen Kennung steht öffentlich im Netz. */
const FREMDE_APP = "22222222-2222-4222-8222-222222222222";

/** Die Zeilen, die es gibt. Wird je Test frisch aufgebaut. */
let webApps: Array<{ id: string; userId: string }>;
let ereignisse: Array<{ id: string; webAppId: string }>;
/** Zählt, wie oft wirklich geschrieben bzw. gelöscht wurde. */
let schreibversuche: number;
let loeschversuche: number;

/** Der angemeldete Nutzer - `requireAuth` ist hier durch eine Zeile ersetzt. */
let angemeldetAls: string | undefined;

function app() {
  const a = express();
  a.use(express.json());
  a.use((req, _res, next) => {
    if (angemeldetAls) (req as express.Request & { user?: { id: string } }).user = { id: angemeldetAls };
    next();
  });
  a.post("/orders/create", handleCreateOrder);
  a.post("/orders/:webAppId/clear-old", handleClearOldOrders);
  return a;
}

beforeEach(() => {
  vi.clearAllMocks();
  angemeldetAls = ICH;
  schreibversuche = 0;
  loeschversuche = 0;
  webApps = [
    { id: MEINE_APP, userId: ICH },
    { id: FREMDE_APP, userId: "user-b" },
  ];
  ereignisse = [{ id: "ev-fremd-alt", webAppId: FREMDE_APP }];

  prismaMock.webApp.findFirst.mockImplementation(
    async ({ where }: { where: { id: string; userId: string } }) =>
      webApps.find((w) => w.id === where.id && w.userId === where.userId) ?? null,
  );
  prismaMock.orderEvent.create.mockImplementation(
    async ({ data }: { data: { webAppId: string } }) => {
      schreibversuche += 1;
      const zeile = { id: `ev-${ereignisse.length}`, webAppId: data.webAppId };
      ereignisse.push(zeile);
      return { id: zeile.id, orderedAt: new Date(0) };
    },
  );
  prismaMock.orderEvent.deleteMany.mockImplementation(
    async ({ where }: { where: { webAppId: string } }) => {
      loeschversuche += 1;
      const vorher = ereignisse.length;
      ereignisse = ereignisse.filter((e) => e.webAppId !== where.webAppId);
      return { count: vorher - ereignisse.length };
    },
  );
});

describe("POST /orders/create", () => {
  it("DER ANGRIFF: eine fremde webAppId wird abgewiesen, ohne Schreibversuch", async () => {
    const res = await request(app())
      .post("/orders/create")
      .send({ webAppId: FREMDE_APP, menuItemName: "Untergeschoben", orderSource: "manual" });

    expect(res.status, JSON.stringify(res.body)).toBe(404);
    // Der Statuscode allein bewiese es nicht - der Speicher muss unberührt sein.
    expect(schreibversuche).toBe(0);
    expect(ereignisse.filter((e) => e.webAppId === FREMDE_APP)).toHaveLength(1);
  });

  it("dasselbe von einem Konto ganz ohne eigene Web-App", async () => {
    // Der gemessene Fall: Es braucht nicht einmal eine Mitgliedschaft, ein
    // frisch registriertes Konto genügte.
    angemeldetAls = "user-fremd";

    const res = await request(app())
      .post("/orders/create")
      .send({ webAppId: FREMDE_APP, menuItemName: "Untergeschoben", orderSource: "manual" });

    expect(res.status).toBe(404);
    expect(schreibversuche).toBe(0);
  });

  it("der gute Fall bleibt gut: die eigene Web-App nimmt Bestellungen an", async () => {
    const res = await request(app())
      .post("/orders/create")
      .send({ webAppId: MEINE_APP, menuItemName: "Pizza Margherita", orderSource: "manual" });

    expect(res.status, JSON.stringify(res.body)).toBe(200);
    expect(schreibversuche).toBe(1);
    expect(ereignisse.some((e) => e.webAppId === MEINE_APP)).toBe(true);
  });

  it("ohne Anmeldung: 401, kein Schreibversuch", async () => {
    angemeldetAls = undefined;

    const res = await request(app())
      .post("/orders/create")
      .send({ webAppId: MEINE_APP, menuItemName: "Pizza", orderSource: "manual" });

    expect(res.status).toBe(401);
    expect(schreibversuche).toBe(0);
  });
});

describe("POST /orders/:webAppId/clear-old", () => {
  it("DER ANGRIFF: fremde Bestellhistorie lässt sich nicht löschen", async () => {
    // Hier wiegt es am schwersten: Löschen ist unumkehrbar.
    const res = await request(app()).post(`/orders/${FREMDE_APP}/clear-old`);

    expect(res.status, JSON.stringify(res.body)).toBe(404);
    expect(loeschversuche).toBe(0);
    expect(ereignisse.find((e) => e.id === "ev-fremd-alt")).toBeDefined();
  });

  it("die eigene Historie lässt sich weiterhin aufräumen", async () => {
    ereignisse.push({ id: "ev-eigen", webAppId: MEINE_APP });

    const res = await request(app()).post(`/orders/${MEINE_APP}/clear-old`);

    expect(res.status, JSON.stringify(res.body)).toBe(200);
    expect(loeschversuche).toBe(1);
    // Und die fremde Zeile ist dabei NICHT mitgegangen.
    expect(ereignisse.find((e) => e.id === "ev-fremd-alt")).toBeDefined();
  });
});
