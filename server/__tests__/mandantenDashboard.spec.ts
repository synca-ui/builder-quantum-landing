// @vitest-environment node
/**
 * Der Umbau von server/routes/admin.ts, server/routes/insights.ts und
 * server/routes/floor-plan.ts auf `betriebskennung()` / `geprueftesBetriebsrecht()`
 * (server/middleware/betriebskennung.ts).
 *
 * ANLASS, gemessen und mit 54 Angriffen gegen die echten Router belegt: In allen
 * drei Dateien stand durchgehend `const businessId = req.query.businessId as
 * string`. Das `as string` prüft nichts. Express parst mit `qs`, und
 * `?businessId[not]=zzz` wird zu `{ businessId: { not: "zzz" } }`. Dieses Objekt
 * ging unverändert in die Besitzprüfung
 *
 *     prisma.business.findFirst({ where: { id: { not: "zzz" }, members: { some: { userId } } } })
 *
 * und die BESTAND, weil sie den EIGENEN Betrieb des Angreifers findet. Danach
 * wurde derselbe Wert als Kennung weiterbenutzt: `where: { businessId }` wurde zu
 * `where: { businessId: { not: "zzz" } } }` und lieferte die Zeilen ALLER
 * Betriebe. Am schwersten wog `PUT /dashboard/admin/reservations/:id`: dort
 * stand `businessId` VOR dem Zod-Parsen separat im Rumpf, und dasselbe Objekt
 * ging als freier Filter in `update({ where: { id, businessId } })` — Prisma
 * ließ das zu, die Reservierung eines fremden Kunden wurde storniert.
 *
 * ---------------------------------------------------------------------------
 * WARUM DER MOCK DAS ECHTE PRISMA-VERHALTEN NACHBILDET, STATT NUR JA/NEIN ZU
 * ANTWORTEN
 *
 * Ein `vi.fn()`, der auf jede Anfrage dieselbe feste Antwort gibt, wäre auch
 * OHNE die Korrektur grün — er prüft dann nur, dass der Handler irgendwas mit
 * `prisma.*` aufruft, nicht WELCHES Argument dabei ankommt. Der `filterRows`-
 * Mechanismus unten wertet `where`-Objekte so aus wie Prisma: `{ not: "zzz" }`
 * matcht jede Zeile außer der mit `id === "zzz"`. Käme ein Filterobjekt durch
 * eine Regression doch bis zur Datenbank durch, würde der Mock GENAU DEN
 * ANGRIFF nachvollziehen, den die Korrektur schließt — und die
 * Mandantentrennungs-Prüfungen unten würden ihn auffangen, nicht nur die
 * Statuscode-Prüfung.
 *
 * Zwei Betriebe (biz-a, biz-b) mit bewusst weit auseinanderliegenden
 * Kennzahlen: Ein Leck fiele bei einer Kennzahl "über alle Betriebe" sonst
 * nicht auf, weil sie nur nach einem guten Monat aussähe (siehe Auftrag,
 * Punkt 3). Mit Faktor-1000-Unterschieden fällt es auf.
 */
import { beforeEach, describe, expect, it, vi } from "vitest";
import express, { type Request, type Response, type NextFunction } from "express";
import request from "supertest";

// ===========================================================================
// PRISMA-ÄHNLICHER FILTER — bildet nach, was Prisma mit einem `where`-Objekt
// tatsächlich tut, statt es zu vereinfachen.
// ===========================================================================

function matchesCondition(value: unknown, condition: unknown): boolean {
  if (condition === undefined) return true;
  if (condition === null) return value === null;
  if (condition instanceof Date) {
    return value instanceof Date && value.getTime() === condition.getTime();
  }
  if (typeof condition !== "object") return value === condition;

  const cond = condition as Record<string, unknown>;
  if ("not" in cond) {
    if (cond.not === null) return value !== null;
    return !matchesCondition(value, cond.not);
  }
  if ("in" in cond) {
    return Array.isArray(cond.in) && (cond.in as unknown[]).some((v) => v === value);
  }
  if ("equals" in cond) return value === cond.equals;
  if ("contains" in cond) {
    return typeof value === "string" && value.includes(String(cond.contains));
  }

  const alsVergleichbar = (v: unknown) => (v instanceof Date ? v.getTime() : v);
  const wert = alsVergleichbar(value) as number;
  let hatBereichsOperator = false;
  if ("gte" in cond) {
    hatBereichsOperator = true;
    if (!(wert >= (alsVergleichbar(cond.gte) as number))) return false;
  }
  if ("lte" in cond) {
    hatBereichsOperator = true;
    if (!(wert <= (alsVergleichbar(cond.lte) as number))) return false;
  }
  if ("lt" in cond) {
    hatBereichsOperator = true;
    if (!(wert < (alsVergleichbar(cond.lt) as number))) return false;
  }
  if ("gt" in cond) {
    hatBereichsOperator = true;
    if (!(wert > (alsVergleichbar(cond.gt) as number))) return false;
  }
  return hatBereichsOperator;
}

function filterRows<T extends Record<string, unknown>>(
  rows: T[],
  where: Record<string, unknown> = {},
): T[] {
  return rows.filter((row) =>
    Object.entries(where).every(([key, cond]) => matchesCondition(row[key], cond)),
  );
}

// ===========================================================================
// DATENBESTAND — zwei Betriebe mit weit auseinanderliegenden Kennzahlen
// ===========================================================================

interface BetriebZeile {
  id: string;
  name: string;
  description: string;
  logoUrl: string;
  cuisine: string;
  openingHours: string;
  contactInfo: string;
  socialLinks: string;
  status: string;
  maitrScore: number;
  updatedAt: Date;
}
interface MitgliedZeile {
  userId: string;
  businessId: string;
}
interface ReservierungsZeile {
  id: string;
  businessId: string;
  status: string;
  guestName: string;
  guestEmail: string;
  guestPhone: string;
  specialRequests: string;
  guestCount: number;
  reservationTime: Date;
  createdAt: Date;
  updatedAt: Date;
  table: { id: string; number: string; name: string } | null;
}
interface SchnappschussZeile {
  businessId: string;
  date: Date;
  period: string;
  revenue: number;
  orders: number;
  uniqueVisitors: number;
  qrScans: number;
  avgOrderValue: number;
  trafficDirect: number;
  trafficGoogle: number;
  trafficFacebook: number;
  trafficInstagram: number;
  trafficQR: number;
  trafficOther: number;
  popularItems: { name: string; count: number }[];
}
interface TischZeile {
  id: string;
  businessId: string;
  floorPlanId: string;
  status: string;
  qrEnabled: boolean;
  qrCode: string | null;
  number: string;
  name: string;
  x: number;
  y: number;
  rotation: number;
  shape: string;
  width: number;
  height: number;
  minCapacity: number;
  maxCapacity: number;
}
interface LageplanZeile {
  id: string;
  businessId: string;
  name: string;
  description?: string;
  sortOrder: number;
  width: number;
  height: number;
  gridSize: number;
  bgColor: string;
  bgImage?: string;
  isActive: boolean;
}
interface KonfigurationZeile {
  businessId: string;
  menuItems: { name: string }[];
  publishedUrl: string | null;
  updatedAt: Date;
}

const heute = new Date();
heute.setHours(0, 0, 0, 0);
const jetzt12 = new Date(heute);
jetzt12.setHours(12, 0, 0, 0);
const jetzt13 = new Date(heute);
jetzt13.setHours(13, 0, 0, 0);
const jetzt1230 = new Date(heute);
jetzt1230.setHours(12, 30, 0, 0);
const jetzt14 = new Date(heute);
jetzt14.setHours(14, 0, 0, 0);

let betriebe: BetriebZeile[];
let mitglieder: MitgliedZeile[];
let reservierungen: ReservierungsZeile[];
let schnappschuesse: SchnappschussZeile[];
let tische: TischZeile[];
let mitarbeiter: { id: string; businessId: string; isActive: boolean }[];
let bestellungen: { id: string; businessId: string }[];
let lageplaene: LageplanZeile[];
let konfigurationen: KonfigurationZeile[];

function grunddaten() {
  betriebe = [
    {
      id: "biz-a",
      name: "Café Müller",
      description: "Gemütliches Café",
      logoUrl: "https://a.example/logo.png",
      cuisine: "Café",
      openingHours: "9-18",
      contactInfo: "a@example.de",
      socialLinks: "https://instagram.com/a",
      status: "ACTIVE",
      maitrScore: 42,
      updatedAt: heute,
    },
    {
      id: "biz-b",
      name: "Trattoria Bernardi",
      description: "Fremder Betrieb",
      logoUrl: "https://b.example/logo.png",
      cuisine: "Italienisch",
      openingHours: "12-22",
      contactInfo: "b@example.de",
      socialLinks: "https://instagram.com/b",
      status: "ACTIVE",
      maitrScore: 999,
      updatedAt: heute,
    },
  ];
  mitglieder = [
    { userId: "wirt-a", businessId: "biz-a" },
    { userId: "wirt-b", businessId: "biz-b" },
    // wirt-x hat bewusst KEINE Zeile hier — Nutzer ohne jede Mitgliedschaft.
  ];
  reservierungen = [
    {
      id: "res-a1",
      businessId: "biz-a",
      status: "PENDING",
      guestName: "Anna A",
      guestEmail: "anna@eigen.de",
      guestPhone: "+49 111",
      specialRequests: "",
      guestCount: 2,
      reservationTime: jetzt12,
      createdAt: heute,
      updatedAt: heute,
      table: { id: "t-a1", number: "1", name: "Fenster" },
    },
    {
      id: "res-a2",
      businessId: "biz-a",
      status: "CONFIRMED",
      guestName: "Carla C",
      guestEmail: "carla@eigen.de",
      guestPhone: "+49 222",
      specialRequests: "",
      guestCount: 3,
      reservationTime: jetzt13,
      createdAt: heute,
      updatedAt: heute,
      table: null,
    },
    {
      id: "res-b1",
      businessId: "biz-b",
      status: "CONFIRMED",
      guestName: "Bernd B",
      guestEmail: "bernd@fremd.de",
      guestPhone: "+49 333",
      specialRequests: "Fensterplatz",
      guestCount: 4,
      reservationTime: jetzt1230,
      createdAt: heute,
      updatedAt: heute,
      table: null,
    },
    {
      id: "res-b2",
      businessId: "biz-b",
      status: "PENDING",
      guestName: "Doro D",
      guestEmail: "doro@fremd.de",
      guestPhone: "+49 444",
      specialRequests: "",
      guestCount: 5,
      reservationTime: jetzt14,
      createdAt: heute,
      updatedAt: heute,
      table: null,
    },
  ];
  schnappschuesse = [
    {
      businessId: "biz-a",
      date: heute,
      period: "daily",
      revenue: 100,
      orders: 5,
      uniqueVisitors: 20,
      qrScans: 3,
      avgOrderValue: 20,
      trafficDirect: 5,
      trafficGoogle: 3,
      trafficFacebook: 1,
      trafficInstagram: 1,
      trafficQR: 2,
      trafficOther: 1,
      popularItems: [{ name: "Kaffee", count: 5 }],
    },
    {
      businessId: "biz-b",
      date: heute,
      period: "daily",
      revenue: 999999,
      orders: 9999,
      uniqueVisitors: 8888,
      qrScans: 7777,
      avgOrderValue: 100,
      trafficDirect: 5000,
      trafficGoogle: 3000,
      trafficFacebook: 1000,
      trafficInstagram: 1000,
      trafficQR: 2000,
      trafficOther: 1000,
      popularItems: [{ name: "GEHEIM", count: 9999 }],
    },
  ];
  tische = [
    {
      id: "t-a1",
      businessId: "biz-a",
      floorPlanId: "fp-a1",
      status: "OCCUPIED",
      qrEnabled: true,
      qrCode: "qr-a1",
      number: "1",
      name: "Fenster",
      x: 0,
      y: 0,
      rotation: 0,
      shape: "round",
      width: 80,
      height: 80,
      minCapacity: 2,
      maxCapacity: 4,
    },
    {
      id: "t-a2",
      businessId: "biz-a",
      floorPlanId: "fp-a1",
      status: "AVAILABLE",
      qrEnabled: false,
      qrCode: null,
      number: "2",
      name: "Terrasse",
      x: 100,
      y: 0,
      rotation: 0,
      shape: "square",
      width: 80,
      height: 80,
      minCapacity: 2,
      maxCapacity: 4,
    },
    {
      id: "t-b1",
      businessId: "biz-b",
      floorPlanId: "fp-b1",
      status: "OCCUPIED",
      qrEnabled: true,
      qrCode: "qr-b1",
      number: "1",
      name: "Geheim 1",
      x: 0,
      y: 0,
      rotation: 0,
      shape: "round",
      width: 80,
      height: 80,
      minCapacity: 2,
      maxCapacity: 4,
    },
    {
      id: "t-b2",
      businessId: "biz-b",
      floorPlanId: "fp-b1",
      status: "OCCUPIED",
      qrEnabled: true,
      qrCode: "qr-b2",
      number: "2",
      name: "Geheim 2",
      x: 100,
      y: 0,
      rotation: 0,
      shape: "round",
      width: 80,
      height: 80,
      minCapacity: 2,
      maxCapacity: 4,
    },
    {
      id: "t-b3",
      businessId: "biz-b",
      floorPlanId: "fp-b1",
      status: "AVAILABLE",
      qrEnabled: false,
      qrCode: null,
      number: "3",
      name: "Geheim 3",
      x: 200,
      y: 0,
      rotation: 0,
      shape: "square",
      width: 80,
      height: 80,
      minCapacity: 2,
      maxCapacity: 4,
    },
  ];
  mitarbeiter = [
    { id: "s-a1", businessId: "biz-a", isActive: true },
    { id: "s-a2", businessId: "biz-a", isActive: false },
    { id: "s-b1", businessId: "biz-b", isActive: true },
  ];
  bestellungen = [
    { id: "o-a1", businessId: "biz-a" },
    { id: "o-b1", businessId: "biz-b" },
    { id: "o-b2", businessId: "biz-b" },
  ];
  lageplaene = [
    {
      id: "fp-a1",
      businessId: "biz-a",
      name: "Hauptraum A",
      description: "eigener Plan",
      sortOrder: 1,
      width: 800,
      height: 600,
      gridSize: 20,
      bgColor: "#f8fafc",
      isActive: true,
    },
    {
      id: "fp-b1",
      businessId: "biz-b",
      name: "Geheimraum B",
      description: "fremder Plan",
      sortOrder: 1,
      width: 800,
      height: 600,
      gridSize: 20,
      bgColor: "#f8fafc",
      isActive: true,
    },
  ];
  konfigurationen = [
    {
      businessId: "biz-a",
      menuItems: [{ name: "Kaffee" }],
      publishedUrl: "https://a.maitr.de",
      updatedAt: heute,
    },
    {
      businessId: "biz-b",
      menuItems: [],
      publishedUrl: null,
      updatedAt: heute,
    },
  ];
}

// ===========================================================================
// PRISMA-MOCK
// ===========================================================================

const { prismaMock } = vi.hoisted(() => ({
  prismaMock: {
    business: { findFirst: vi.fn(), findUnique: vi.fn() },
    reservation: {
      findMany: vi.fn(),
      count: vi.fn(),
      groupBy: vi.fn(),
      update: vi.fn(),
    },
    analyticsSnapshot: { findFirst: vi.fn(), findMany: vi.fn() },
    table: { count: vi.fn() },
    staff: { count: vi.fn() },
    order: { count: vi.fn() },
    floorPlan: { findMany: vi.fn(), findFirst: vi.fn(), create: vi.fn() },
  },
}));

vi.mock("../db/prisma", () => ({ default: prismaMock, prisma: prismaMock }));

/**
 * Angemeldet ohne echtes Clerk-Token — welcher Nutzer die Anfrage stellt,
 * bestimmt der Testheader `x-test-user`. Genau wie die echte Middleware wird
 * sowohl `req.user` als auch `req.userId` gesetzt: Die drei Router lesen
 * ausschließlich `req.userId`.
 */
vi.mock("../middleware/auth", () => ({
  requireAuth: (req: Request, res: Response, next: NextFunction) => {
    const userId = req.headers["x-test-user"] as string | undefined;
    if (!userId) return res.status(401).json({ error: "Missing token" });
    req.userId = userId;
    req.user = { id: userId, email: `${userId}@example.de`, clerkId: `clerk_${userId}` };
    next();
  },
}));

import adminRouter from "../routes/admin";
import insightsRouter from "../routes/insights";
import floorPlanRouter from "../routes/floor-plan";

beforeEach(() => {
  vi.clearAllMocks();
  grunddaten();

  prismaMock.business.findFirst.mockImplementation(
    async ({ where }: { where: Record<string, unknown> }) => {
      const { members, ...skalar } = where as {
        members?: { some: { userId: string } };
        id?: unknown;
      };
      const kandidaten = filterRows(betriebe, skalar);
      const treffer = kandidaten.find((b) =>
        mitglieder.some((m) => m.businessId === b.id && m.userId === members?.some.userId),
      );
      return treffer ? { id: treffer.id } : null;
    },
  );

  prismaMock.business.findUnique.mockImplementation(
    async ({ where, include }: { where: { id: string }; include?: { configurations?: { take?: number } } }) => {
      const treffer = betriebe.find((b) => b.id === where.id);
      if (!treffer) return null;
      if (include?.configurations) {
        const eigene = konfigurationen
          .filter((k) => k.businessId === treffer.id)
          .sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime());
        const take = include.configurations.take ?? eigene.length;
        return { ...treffer, configurations: eigene.slice(0, take) };
      }
      return { ...treffer };
    },
  );

  prismaMock.reservation.findMany.mockImplementation(
    async ({
      where,
      skip = 0,
      take,
    }: {
      where: Record<string, unknown>;
      skip?: number;
      take?: number;
    }) => {
      let rows = filterRows(reservierungen, where).sort(
        (a, b) => b.reservationTime.getTime() - a.reservationTime.getTime(),
      );
      if (typeof take === "number") rows = rows.slice(skip, skip + take);
      return rows;
    },
  );
  prismaMock.reservation.count.mockImplementation(
    async ({ where }: { where: Record<string, unknown> }) => filterRows(reservierungen, where).length,
  );
  prismaMock.reservation.groupBy.mockImplementation(
    async ({ where }: { where: Record<string, unknown> }) => {
      const rows = filterRows(reservierungen, where);
      const zaehler = new Map<string, number>();
      for (const r of rows) zaehler.set(r.status, (zaehler.get(r.status) ?? 0) + 1);
      return [...zaehler.entries()].map(([status, count]) => ({ status, _count: { status: count } }));
    },
  );
  prismaMock.reservation.update.mockImplementation(
    async ({
      where,
      data,
    }: {
      where: Record<string, unknown>;
      data: Record<string, unknown>;
    }) => {
      const treffer = reservierungen.find((r) =>
        Object.entries(where).every(([key, cond]) =>
          matchesCondition((r as unknown as Record<string, unknown>)[key], cond),
        ),
      );
      if (!treffer) {
        const fehler = new Error(
          "An operation failed because it depends on one or more records that were required but not found.",
        );
        (fehler as unknown as { code: string }).code = "P2025";
        throw fehler;
      }
      Object.assign(treffer, data);
      return treffer;
    },
  );

  prismaMock.analyticsSnapshot.findFirst.mockImplementation(
    async ({
      where,
      orderBy,
    }: {
      where: Record<string, unknown>;
      orderBy?: { date?: "asc" | "desc" };
    }) => {
      const rows = filterRows(schnappschuesse, where).sort((a, b) =>
        orderBy?.date === "asc"
          ? a.date.getTime() - b.date.getTime()
          : b.date.getTime() - a.date.getTime(),
      );
      return rows[0] ?? null;
    },
  );
  prismaMock.analyticsSnapshot.findMany.mockImplementation(
    async ({
      where,
      orderBy,
      select,
    }: {
      where: Record<string, unknown>;
      orderBy?: { date?: "asc" | "desc" };
      select?: { popularItems?: boolean };
    }) => {
      let rows = filterRows(schnappschuesse, where);
      if (orderBy?.date) {
        rows = [...rows].sort((a, b) =>
          orderBy.date === "asc" ? a.date.getTime() - b.date.getTime() : b.date.getTime() - a.date.getTime(),
        );
      }
      if (select?.popularItems) return rows.map((r) => ({ popularItems: r.popularItems }));
      return rows;
    },
  );

  prismaMock.table.count.mockImplementation(
    async ({ where }: { where: Record<string, unknown> }) => filterRows(tische, where).length,
  );
  prismaMock.staff.count.mockImplementation(
    async ({ where }: { where: Record<string, unknown> }) => filterRows(mitarbeiter, where).length,
  );
  prismaMock.order.count.mockImplementation(
    async ({ where }: { where: Record<string, unknown> }) => filterRows(bestellungen, where).length,
  );

  prismaMock.floorPlan.findMany.mockImplementation(
    async ({ where }: { where: Record<string, unknown> }) => {
      const rows = filterRows(lageplaene, where).sort((a, b) => a.sortOrder - b.sortOrder);
      return rows.map((plan) => ({
        ...plan,
        tables: tische.filter((t) => t.floorPlanId === plan.id),
      }));
    },
  );
  prismaMock.floorPlan.findFirst.mockImplementation(
    async ({ where }: { where: Record<string, unknown> }) => {
      const rows = filterRows(lageplaene, where).sort((a, b) => b.sortOrder - a.sortOrder);
      return rows[0] ?? null;
    },
  );
  prismaMock.floorPlan.create.mockImplementation(
    async ({ data }: { data: Record<string, unknown> }) => {
      const zeile = { id: `fp-${lageplaene.length + 1}`, ...data } as LageplanZeile;
      lageplaene = [...lageplaene, zeile];
      return { ...zeile, tables: [] };
    },
  );
});

// ===========================================================================
// DIE APP
// ===========================================================================

function app() {
  const a = express();
  a.use(express.json());
  a.use("/api/dashboard/admin", adminRouter);
  a.use("/api/dashboard/insights", insightsRouter);
  a.use("/api/dashboard/floor-plan", floorPlanRouter);
  return a;
}

const ALS_WIRT_A = { "x-test-user": "wirt-a" };
const ALS_WIRT_X = { "x-test-user": "wirt-x" }; // kein einziger Betrieb

// ===========================================================================
// 1. DER SCHWERSTE FALL: PUT /admin/reservations/:id
// ===========================================================================

describe("PUT /api/dashboard/admin/reservations/:id — die gemessene Lücke", () => {
  it("DER ANGRIFF: ein Filterobjekt im Rumpf storniert NICHT die fremde Buchung", async () => {
    const vorher = reservierungen.find((r) => r.id === "res-b1")!.status;
    expect(vorher).toBe("CONFIRMED");

    const res = await request(app())
      .put("/api/dashboard/admin/reservations/res-b1")
      .set(ALS_WIRT_A)
      .send({ businessId: { not: "zzz" }, status: "CANCELLED" });

    expect(res.status, JSON.stringify(res.body)).toBe(400);
    expect(res.body.error).toBe("businessId fehlt oder ist ungültig");

    // Die Gegenprobe: der Speicher selbst, nicht nur der Statuscode.
    expect(reservierungen.find((r) => r.id === "res-b1")!.status).toBe("CONFIRMED");
  });

  it("selbst mit der EIGENEN, echten businessId bleibt die fremde Buchung unangetastet", async () => {
    // Zweite Verteidigungslinie: Prismas `where: { id, businessId }` im Update
    // selbst. wirt-a ist Mitglied von biz-a — die Kennung ist also GÜLTIG —
    // aber res-b1 gehört zu biz-b. Der zusammengesetzte Filter darf trotzdem
    // nicht treffen.
    const res = await request(app())
      .put("/api/dashboard/admin/reservations/res-b1")
      .set(ALS_WIRT_A)
      .send({ businessId: "biz-a", status: "CANCELLED" });

    expect(res.status).toBe(500);
    expect(reservierungen.find((r) => r.id === "res-b1")!.status).toBe("CONFIRMED");
  });

  it("der gute Fall bleibt gut: die eigene Buchung lässt sich stornieren", async () => {
    const res = await request(app())
      .put("/api/dashboard/admin/reservations/res-a1")
      .set(ALS_WIRT_A)
      .send({ businessId: "biz-a", status: "CANCELLED" });

    expect(res.status, JSON.stringify(res.body)).toBe(200);
    expect(reservierungen.find((r) => r.id === "res-a1")!.status).toBe("CANCELLED");
  });

  it("ohne jede Mitgliedschaft: 403, keine Änderung", async () => {
    const res = await request(app())
      .put("/api/dashboard/admin/reservations/res-a1")
      .set(ALS_WIRT_X)
      .send({ businessId: "biz-a", status: "CANCELLED" });

    expect(res.status).toBe(403);
    expect(res.body.error).toBe("Zugriff verweigert");
    expect(reservierungen.find((r) => r.id === "res-a1")!.status).toBe("PENDING");
  });
});

// ===========================================================================
// 2. GET /admin/reservations
// ===========================================================================

describe("GET /api/dashboard/admin/reservations", () => {
  it("DER ANGRIFF: ein Filterobjekt in der Query liefert nichts", async () => {
    const res = await request(app())
      .get("/api/dashboard/admin/reservations?businessId[not]=zzz")
      .set(ALS_WIRT_A);

    expect(res.status, JSON.stringify(res.body)).toBe(400);
    expect(res.body.error).toBe("businessId fehlt oder ist ungültig");
  });

  it("ganz ohne businessId: 400, kein stiller Rückfall", async () => {
    const res = await request(app()).get("/api/dashboard/admin/reservations").set(ALS_WIRT_A);
    expect(res.status).toBe(400);
  });

  it("ohne jede Mitgliedschaft: 403", async () => {
    const res = await request(app())
      .get("/api/dashboard/admin/reservations?businessId=biz-a")
      .set(ALS_WIRT_X);
    expect(res.status).toBe(403);
    expect(res.body.error).toBe("Zugriff verweigert");
  });

  it("der gute Fall: nur die eigenen zwei Reservierungen, keine fremden Gästedaten", async () => {
    const res = await request(app())
      .get("/api/dashboard/admin/reservations?businessId=biz-a")
      .set(ALS_WIRT_A);

    expect(res.status, JSON.stringify(res.body)).toBe(200);
    const namen = res.body.data.reservations.map((r: { guestName: string }) => r.guestName);
    expect(namen.sort()).toEqual(["Anna A", "Carla C"]);
    expect(namen).not.toContain("Bernd B");
    expect(res.body.data.statistics.total).toBe(2);
    expect(res.body.data.statistics.statusCounts).toEqual({ PENDING: 1, CONFIRMED: 1 });
  });
});

// ===========================================================================
// 3. GET /admin/seo
// ===========================================================================

describe("GET /api/dashboard/admin/seo", () => {
  it("DER ANGRIFF: 400", async () => {
    const res = await request(app())
      .get("/api/dashboard/admin/seo?businessId[not]=zzz")
      .set(ALS_WIRT_A);
    expect(res.status).toBe(400);
    expect(res.body.error).toBe("businessId fehlt oder ist ungültig");
  });

  it("der gute Fall: Checkliste stammt vom eigenen Betrieb", async () => {
    const res = await request(app())
      .get("/api/dashboard/admin/seo?businessId=biz-a")
      .set(ALS_WIRT_A);

    expect(res.status, JSON.stringify(res.body)).toBe(200);
    expect(res.body.data.checklist.hasMenu.status).toBe(true); // biz-a hat "Kaffee"
  });
});

// ===========================================================================
// 4. GET /admin/analytics-summary — DIE AGGREGATIONS-PRÜFUNG (Auftrag Punkt 3)
// ===========================================================================

describe("GET /api/dashboard/admin/analytics-summary", () => {
  it("DER ANGRIFF: 400", async () => {
    const res = await request(app())
      .get("/api/dashboard/admin/analytics-summary?businessId[not]=zzz")
      .set(ALS_WIRT_A);
    expect(res.status).toBe(400);
    expect(res.body.error).toBe("businessId fehlt oder ist ungültig");
  });

  it("jede Kennzahl ist auf biz-a eingegrenzt, nicht über beide Betriebe summiert", async () => {
    const res = await request(app())
      .get("/api/dashboard/admin/analytics-summary?businessId=biz-a")
      .set(ALS_WIRT_A);

    expect(res.status, JSON.stringify(res.body)).toBe(200);
    const d = res.body.data;

    // Kombiniert wären das 3 Reservierungen, 2 Mitarbeitende, 5 Tische,
    // 3 Bestellungen und ein Umsatz von 1.000.099 — jede dieser Zahlen wäre
    // hier ein stiller Beweis für ein Leck.
    expect(d.counts.reservations).toBe(2);
    expect(d.counts.staff).toBe(1);
    expect(d.counts.tables).toBe(2);
    expect(d.counts.orders).toBe(1);
    expect(d.analytics.revenue).toBe(100);
    expect(d.businessStatus.name).toBe("Café Müller");
    expect(d.businessStatus.maitrScore).toBe(42);

    const namen = d.recentActivity.reservations.map((r: { guestName: string }) => r.guestName);
    expect(namen).not.toContain("Bernd B");
    expect(namen).not.toContain("Doro D");
  });

  it("ohne jede Mitgliedschaft: 403, keine Kennzahl irgendeines Betriebs", async () => {
    const res = await request(app())
      .get("/api/dashboard/admin/analytics-summary?businessId=biz-a")
      .set(ALS_WIRT_X);
    expect(res.status).toBe(403);
    expect(res.body.data).toBeUndefined();
  });
});

// ===========================================================================
// 5. GET /admin/system-health
// ===========================================================================

describe("GET /api/dashboard/admin/system-health", () => {
  it("DER ANGRIFF: 400", async () => {
    const res = await request(app())
      .get("/api/dashboard/admin/system-health?businessId[not]=zzz")
      .set(ALS_WIRT_A);
    expect(res.status).toBe(400);
  });

  it("der gute Fall: QR-Zählung stammt von biz-a (1), nicht von biz-b (2)", async () => {
    const res = await request(app())
      .get("/api/dashboard/admin/system-health?businessId=biz-a")
      .set(ALS_WIRT_A);

    expect(res.status, JSON.stringify(res.body)).toBe(200);
    expect(res.body.data.checks.qrCodes.message).toBe("1 QR codes active");
  });
});

// ===========================================================================
// 6. GET /insights/overview
// ===========================================================================

describe("GET /api/dashboard/insights/overview", () => {
  it("DER ANGRIFF: 400", async () => {
    const res = await request(app())
      .get("/api/dashboard/insights/overview?businessId[not]=zzz")
      .set(ALS_WIRT_A);
    expect(res.status).toBe(400);
    expect(res.body.error).toBe("businessId fehlt oder ist ungültig");
  });

  it("ohne jede Mitgliedschaft: 403", async () => {
    const res = await request(app())
      .get("/api/dashboard/insights/overview?businessId=biz-a")
      .set(ALS_WIRT_X);
    expect(res.status).toBe(403);
  });

  it("der gute Fall: Umsatz und Tischbelegung stammen von biz-a, nicht von biz-b", async () => {
    const res = await request(app())
      .get("/api/dashboard/insights/overview?businessId=biz-a")
      .set(ALS_WIRT_A);

    expect(res.status, JSON.stringify(res.body)).toBe(200);
    expect(res.body.data.revenue.current).toBe(100); // NICHT 999999
    expect(res.body.data.activeTables).toBe(1); // NICHT 2
    expect(res.body.data.reservations.total).toBe(2);
  });
});

// ===========================================================================
// 7. GET /insights/revenue-chart
// ===========================================================================

describe("GET /api/dashboard/insights/revenue-chart", () => {
  it("DER ANGRIFF: 400", async () => {
    const res = await request(app())
      .get("/api/dashboard/insights/revenue-chart?businessId[not]=zzz")
      .set(ALS_WIRT_A);
    expect(res.status).toBe(400);
  });

  it("der gute Fall: heutiger Umsatz ist 100, nicht 999999", async () => {
    const res = await request(app())
      .get("/api/dashboard/insights/revenue-chart?businessId=biz-a&days=1")
      .set(ALS_WIRT_A);

    expect(res.status, JSON.stringify(res.body)).toBe(200);
    const heutigerEintrag = res.body.data.at(-1);
    expect(heutigerEintrag.revenue).toBe(100);
  });
});

// ===========================================================================
// 8. GET /insights/traffic-sources
// ===========================================================================

describe("GET /api/dashboard/insights/traffic-sources", () => {
  it("DER ANGRIFF: 400", async () => {
    const res = await request(app())
      .get("/api/dashboard/insights/traffic-sources?businessId[not]=zzz")
      .set(ALS_WIRT_A);
    expect(res.status).toBe(400);
  });

  it("der gute Fall: Summen stammen von biz-a (5), nicht von biz-b (5000)", async () => {
    const res = await request(app())
      .get("/api/dashboard/insights/traffic-sources?businessId=biz-a")
      .set(ALS_WIRT_A);

    expect(res.status, JSON.stringify(res.body)).toBe(200);
    const direct = res.body.data.find((s: { source: string }) => s.source === "direct");
    expect(direct.count).toBe(5);
  });
});

// ===========================================================================
// 9. GET /insights/popular-items
// ===========================================================================

describe("GET /api/dashboard/insights/popular-items", () => {
  it("DER ANGRIFF: 400", async () => {
    const res = await request(app())
      .get("/api/dashboard/insights/popular-items?businessId[not]=zzz")
      .set(ALS_WIRT_A);
    expect(res.status).toBe(400);
  });

  it("der gute Fall: 'Kaffee' von biz-a, nicht 'GEHEIM' von biz-b", async () => {
    const res = await request(app())
      .get("/api/dashboard/insights/popular-items?businessId=biz-a")
      .set(ALS_WIRT_A);

    expect(res.status, JSON.stringify(res.body)).toBe(200);
    const namen = res.body.data.map((i: { name: string }) => i.name);
    expect(namen).toContain("Kaffee");
    expect(namen).not.toContain("GEHEIM");
  });
});

// ===========================================================================
// 10. GET /floor-plan/plans
// ===========================================================================

describe("GET /api/dashboard/floor-plan/plans", () => {
  it("DER ANGRIFF: 400", async () => {
    const res = await request(app())
      .get("/api/dashboard/floor-plan/plans?businessId[not]=zzz")
      .set(ALS_WIRT_A);
    expect(res.status).toBe(400);
    expect(res.body.error).toBe("businessId fehlt oder ist ungültig");
  });

  it("ohne jede Mitgliedschaft: 403", async () => {
    const res = await request(app())
      .get("/api/dashboard/floor-plan/plans?businessId=biz-a")
      .set(ALS_WIRT_X);
    expect(res.status).toBe(403);
  });

  it("der gute Fall: nur 'Hauptraum A', nicht 'Geheimraum B'", async () => {
    const res = await request(app())
      .get("/api/dashboard/floor-plan/plans?businessId=biz-a")
      .set(ALS_WIRT_A);

    expect(res.status, JSON.stringify(res.body)).toBe(200);
    const namen = res.body.data.map((p: { name: string }) => p.name);
    expect(namen).toEqual(["Hauptraum A"]);
  });
});

// ===========================================================================
// 11. POST /floor-plan/plans (schreibend)
// ===========================================================================

describe("POST /api/dashboard/floor-plan/plans", () => {
  it("DER ANGRIFF, schreibend: kein Lageplan entsteht", async () => {
    const vorher = lageplaene.length;

    const res = await request(app())
      .post("/api/dashboard/floor-plan/plans")
      .set(ALS_WIRT_A)
      .send({ businessId: { not: "zzz" }, name: "Angriffsraum" });

    expect(res.status, JSON.stringify(res.body)).toBe(400);
    expect(res.body.error).toBe("businessId fehlt oder ist ungültig");
    // Die Gegenprobe: der Speicher, nicht nur die Antwort.
    expect(lageplaene).toHaveLength(vorher);
    expect(lageplaene.some((p) => p.name === "Angriffsraum")).toBe(false);
  });

  it("ohne jede Mitgliedschaft: 403, kein Lageplan entsteht", async () => {
    const vorher = lageplaene.length;

    const res = await request(app())
      .post("/api/dashboard/floor-plan/plans")
      .set(ALS_WIRT_X)
      .send({ businessId: "biz-a", name: "Fremdraum" });

    expect(res.status).toBe(403);
    expect(lageplaene).toHaveLength(vorher);
  });

  it("der gute Fall: der Plan entsteht mit der eigenen businessId", async () => {
    const res = await request(app())
      .post("/api/dashboard/floor-plan/plans")
      .set(ALS_WIRT_A)
      .send({ businessId: "biz-a", name: "Terrasse" });

    expect(res.status, JSON.stringify(res.body)).toBe(200);
    expect(lageplaene.some((p) => p.name === "Terrasse" && p.businessId === "biz-a")).toBe(true);
  });
});
