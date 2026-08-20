// @vitest-environment node
/**
 * Mandantentrennung, fremdschlüsselgebundene Besitzprüfung und Rollenriegel für
 * `server/routes/staff.ts` und `server/routes/creative-studio.ts`.
 *
 * ANLASS, gemessen (siehe server/middleware/betriebskennung.ts für die volle
 * Herleitung des Grundmusters):
 *
 *  1. `req.query.businessId as string` / `req.body.businessId` prüften zur
 *     Laufzeit nichts. Express parst mit `qs`: `?businessId[not]=zzz` wird zu
 *     `{ businessId: { not: "zzz" } }`, bestand die Besitzprüfung (fand den
 *     EIGENEN Betrieb des Angreifers) und lieferte danach als Filter
 *     weiterbenutzt die Zeilen ALLER Betriebe.
 *
 *  2. `POST /staff/shifts` prüfte die mitgeschickte `staffId` gar nicht: Mit
 *     der eigenen `businessId` und einer `staffId` aus einem FREMDEN Betrieb
 *     antwortete die Route 200 - und lieferte Vorname, Nachname und Position
 *     der fremden Person mit. `POST /staff/conflicts/check` taugte genauso als
 *     Orakel und lieferte zusätzlich die Arbeitszeiten.
 *
 *  3. `POST /creative/menu/items` prüfte die mitgeschickte `categoryId` genauso
 *     wenig: Ein Gericht landete in der Speisekarte eines fremden Betriebs.
 *
 *  4. Kein Rollenriegel: Eine Aushilfe (`BusinessMember.role` STAFF, der
 *     Vorgabewert des Modells) konnte Personal anlegen und die
 *     Website-Vorlage wechseln.
 *
 * Die Datenbank wird nie angefasst - Prisma ist ein schreibender Mini-Speicher
 * (Arrays + echte Filterlogik auf denselben `where`-Formen, die die Routen
 * tatsächlich schicken), kein Attrappen-Rückgabewert. Jeder Test prüft danach
 * den SPEICHER, nicht nur den Statuscode.
 */
import { beforeEach, describe, expect, it, vi } from "vitest";
import express from "express";
import request from "supertest";

// ===========================================================================
// DER "DATENBESTAND"
// ===========================================================================

interface BetriebZeile {
  id: string;
  templateId: string | null;
}
interface MitgliedZeile {
  userId: string;
  businessId: string;
  role: "OWNER" | "ADMIN" | "STAFF";
}
interface PersonalZeile {
  id: string;
  businessId: string;
  email: string;
  firstName: string;
  lastName: string;
  phone: string | null;
  position: string;
  hourlyRate: number | null;
  isActive: boolean;
  permissions: string;
}
interface SchichtZeile {
  id: string;
  businessId: string;
  staffId: string;
  date: Date;
  startTime: Date;
  endTime: Date;
  breakDuration: number;
  shiftType: string;
  position?: string;
  notes?: string;
  hourlyRate?: number;
}
interface KategorieZeile {
  id: string;
  businessId: string;
  name: string;
  sortOrder: number;
}
interface GerichtZeile {
  id: string;
  categoryId: string;
  name: string;
  description?: string;
  price: number;
  imageUrl?: string;
}
interface VorlageZeile {
  id: string;
  name: string;
  description: string;
  category: string;
  isPremium: boolean;
  preview: unknown;
  avgRating: number;
  downloads: number;
}

let betriebe: BetriebZeile[];
let mitglieder: MitgliedZeile[];
let personal: PersonalZeile[];
let schichten: SchichtZeile[];
let kategorien: KategorieZeile[];
let gerichte: GerichtZeile[];
let vorlagen: VorlageZeile[];
let idZaehler: number;

function neueId(praefix: string): string {
  idZaehler += 1;
  return `${praefix}-${idZaehler}`;
}

function personalKurzform(staffId: string) {
  const p = personal.find((x) => x.id === staffId);
  return p
    ? { id: p.id, firstName: p.firstName, lastName: p.lastName, position: p.position }
    : null;
}

// ===========================================================================
// MOCKS - Prisma als schreibender Mini-Speicher
// ===========================================================================

const { prismaMock } = vi.hoisted(() => ({
  prismaMock: {
    business: { findFirst: vi.fn(), update: vi.fn() },
    businessMember: { findUnique: vi.fn() },
    staff: { findMany: vi.fn(), findFirst: vi.fn(), create: vi.fn() },
    shift: { findMany: vi.fn(), create: vi.fn() },
    absence: { findMany: vi.fn() },
    template: { findMany: vi.fn(), findUnique: vi.fn() },
    menuCategory: { findMany: vi.fn(), findFirst: vi.fn(), create: vi.fn() },
    menuItem: { count: vi.fn(), aggregate: vi.fn(), create: vi.fn() },
  },
}));

vi.mock("../db/prisma", () => ({ default: prismaMock, prisma: prismaMock }));

/**
 * `requireAuth` bräuchte ein echtes Clerk-Token; hier reicht ein Kopfzeilen-Feld,
 * über das jeder Testfall wählt, ALS WER er anfragt - genau das braucht diese
 * Datei, weil drei verschiedene Konten gegeneinander getestet werden.
 */
vi.mock("../middleware/auth", () => ({
  requireAuth: (req: express.Request, res: express.Response, next: () => void) => {
    const userId = req.headers["x-test-user"];
    if (typeof userId !== "string" || userId.length === 0) {
      return res.status(401).json({ error: "kein Testnutzer gesetzt" });
    }
    (req as express.Request & { userId?: string }).userId = userId;
    req.user = { id: userId, email: `${userId}@test.de`, clerkId: `clerk_${userId}` };
    return next();
  },
}));

import staffRouter from "../routes/staff";
import creativeStudioRouter from "../routes/creative-studio";

// ===========================================================================
// DIE KONTEN
// ===========================================================================

const BETRIEB_A = "biz-a";
const BETRIEB_B = "biz-b";
const INHABER_A = "user-inhaber-a";
const AUSHILFE_A = "user-aushilfe-a";
const INHABER_B = "user-inhaber-b";

// `staffId`/`categoryId` laufen durch `z.string().uuid()` - deshalb hier echte
// UUIDs statt sprechender Kürzel.
const STAFF_FREMD = "d053b610-522d-4919-b5a0-143ba7d8f545";
const STAFF_EIGEN = "d30929a1-3c2e-4cc3-97aa-ed9bf7208e41";
const KATEGORIE_FREMD = "e98104ef-301d-4d63-b70c-c8a45e2f157a";
const KATEGORIE_EIGEN = "b4e06db3-0c87-4ff1-9de7-e7b81ae4403d";

function app() {
  const a = express();
  a.use(express.json());
  a.use("/staff", staffRouter);
  a.use("/creative", creativeStudioRouter);
  return a;
}

function als(userId: string) {
  return { "x-test-user": userId };
}

beforeEach(() => {
  vi.clearAllMocks();
  idZaehler = 0;

  betriebe = [
    { id: BETRIEB_A, templateId: null },
    { id: BETRIEB_B, templateId: "modern" },
  ];
  mitglieder = [
    { userId: INHABER_A, businessId: BETRIEB_A, role: "OWNER" },
    { userId: AUSHILFE_A, businessId: BETRIEB_A, role: "STAFF" },
    { userId: INHABER_B, businessId: BETRIEB_B, role: "OWNER" },
  ];
  personal = [
    {
      id: STAFF_FREMD,
      businessId: BETRIEB_B,
      email: "kollege@nachbar.de",
      firstName: "Nachbar",
      lastName: "Fremd",
      phone: null,
      position: "Service",
      hourlyRate: 22,
      isActive: true,
      permissions: "[]",
    },
  ];
  schichten = [];
  kategorien = [
    { id: KATEGORIE_FREMD, businessId: BETRIEB_B, name: "Fremde Karte", sortOrder: 1 },
  ];
  gerichte = [];
  vorlagen = [
    {
      id: "modern",
      name: "Modern",
      description: "Modernes Layout",
      category: "Modern",
      isPremium: false,
      preview: {},
      avgRating: 4.5,
      downloads: 10,
    },
    {
      id: "cozy",
      name: "Cozy",
      description: "Gemütliches Layout",
      category: "Cozy",
      isPremium: false,
      preview: {},
      avgRating: 4.0,
      downloads: 3,
    },
  ];

  // ---- business ----------------------------------------------------------
  prismaMock.business.findFirst.mockImplementation(async (args: any) => {
    const { where, include } = args;
    // `id` kann - absichtlich, für die Gegenprobe der Filter-Lücke - auch ein
    // Objekt mit `not` sein: genau das baut `qs` aus `?businessId[not]=zzz`,
    // und Prisma akzeptiert es als Filter. Nachgebildet, damit eine entfernte
    // `betriebskennung()`-Prüfung hier wirklich sichtbar durchbricht statt
    // vom Mock verdeckt zu werden.
    const passtId = (b: BetriebZeile) => {
      const id = where.id;
      if (typeof id === "string") return b.id === id;
      if (id && typeof id === "object" && "not" in id) return b.id !== id.not;
      return false;
    };
    let kandidaten = betriebe.filter(passtId);
    if (where.members) {
      const userId = where.members.some.userId;
      kandidaten = kandidaten.filter((b) =>
        mitglieder.some((m) => m.businessId === b.id && m.userId === userId),
      );
    }
    const treffer = kandidaten[0];
    if (!treffer) return null;
    const zeile: any = { id: treffer.id };
    if (include?.template) {
      zeile.template = vorlagen.find((t) => t.id === treffer.templateId) ?? null;
    }
    return zeile;
  });

  prismaMock.business.update.mockImplementation(async (args: any) => {
    const { where, data, include } = args;
    const treffer = betriebe.find((b) => b.id === where.id);
    if (!treffer) throw new Error(`Betrieb nicht gefunden: ${where.id}`);
    Object.assign(treffer, data);
    const zeile: any = { id: treffer.id, templateId: treffer.templateId };
    if (include?.template) {
      zeile.template = vorlagen.find((t) => t.id === treffer.templateId) ?? null;
    }
    return zeile;
  });

  // ---- businessMember -----------------------------------------------------
  prismaMock.businessMember.findUnique.mockImplementation(async (args: any) => {
    const { userId, businessId } = args.where.userId_businessId;
    return mitglieder.find((m) => m.userId === userId && m.businessId === businessId) ?? null;
  });

  // ---- staff ---------------------------------------------------------------
  prismaMock.staff.findMany.mockImplementation(async (args: any) => {
    const { where } = args;
    return personal
      .filter(
        (p) =>
          p.businessId === where.businessId &&
          (where.isActive === undefined || p.isActive === where.isActive),
      )
      .map((p) => ({ ...p, shifts: [], absences: [], _count: { shifts: 0, absences: 0 } }));
  });

  prismaMock.staff.findFirst.mockImplementation(async (args: any) => {
    const { where } = args;
    const treffer = personal.find((p) => p.id === where.id && p.businessId === where.businessId);
    return treffer ? { id: treffer.id } : null;
  });

  prismaMock.staff.create.mockImplementation(async (args: any) => {
    const zeile: PersonalZeile = {
      id: neueId("staff"),
      isActive: true,
      ...args.data,
    };
    personal = [...personal, zeile];
    return zeile;
  });

  // ---- shift -----------------------------------------------------------
  prismaMock.shift.findMany.mockImplementation(async (args: any) => {
    const { where } = args;
    if (where.staffId !== undefined) {
      // Konflikt-Übersicht (checkShiftConflicts): bewusst vereinfacht auf
      // Mandant+Person - die Datums-Überlappungslogik (das OR/AND-Konstrukt)
      // wird hier nicht nachgebildet, weil kein Test in dieser Datei zwei
      // überlappende Schichten anlegt. Was zählt ist echte businessId/staffId-
      // Filterung, nicht die Kalenderarithmetik.
      return schichten.filter(
        (s) => s.businessId === where.businessId && s.staffId === where.staffId,
      );
    }
    return schichten
      .filter((s) => s.businessId === where.businessId)
      .map((s) => ({ ...s, staff: personalKurzform(s.staffId) }));
  });

  prismaMock.shift.create.mockImplementation(async (args: any) => {
    const zeile: SchichtZeile = { id: neueId("shift"), ...args.data };
    schichten = [...schichten, zeile];
    return { ...zeile, staff: personalKurzform(zeile.staffId) };
  });

  // ---- absence ---------------------------------------------------------
  prismaMock.absence.findMany.mockResolvedValue([]);

  // ---- template ----------------------------------------------------------
  prismaMock.template.findMany.mockImplementation(async () => vorlagen.map((t) => ({ ...t })));
  prismaMock.template.findUnique.mockImplementation(async (args: any) =>
    vorlagen.find((t) => t.id === args.where.id) ?? null,
  );

  // ---- menuCategory ------------------------------------------------------
  prismaMock.menuCategory.findMany.mockImplementation(async (args: any) => {
    const { where } = args;
    return kategorien
      .filter((k) => k.businessId === where.businessId)
      .map((k) => {
        const items = gerichte.filter((g) => g.categoryId === k.id);
        return { ...k, items, _count: { items: items.length } };
      });
  });

  prismaMock.menuCategory.findFirst.mockImplementation(async (args: any) => {
    const { where } = args;
    if (where.id !== undefined) {
      // Besitzprüfung: gehört die Kategorie zu DIESEM Betrieb?
      return kategorien.find((k) => k.id === where.id && k.businessId === where.businessId) ?? null;
    }
    // letzte Kategorie für die Sortierreihenfolge (POST /menu/categories)
    const meine = kategorien.filter((k) => k.businessId === where.businessId);
    if (meine.length === 0) return null;
    return meine.reduce((a, b) => (b.sortOrder > a.sortOrder ? b : a));
  });

  prismaMock.menuCategory.create.mockImplementation(async (args: any) => {
    const zeile: KategorieZeile = { id: neueId("kat"), ...args.data };
    kategorien = [...kategorien, zeile];
    return { ...zeile, _count: { items: 0 } };
  });

  // ---- menuItem ------------------------------------------------------------
  prismaMock.menuItem.count.mockImplementation(async (args: any) => {
    const businessId = args.where.category.businessId;
    const meine = new Set(kategorien.filter((k) => k.businessId === businessId).map((k) => k.id));
    return gerichte.filter((g) => meine.has(g.categoryId)).length;
  });

  prismaMock.menuItem.aggregate.mockImplementation(async (args: any) => {
    const businessId = args.where.category.businessId;
    const meine = new Set(kategorien.filter((k) => k.businessId === businessId).map((k) => k.id));
    const preise = gerichte.filter((g) => meine.has(g.categoryId)).map((g) => g.price);
    const avg = preise.length ? preise.reduce((a, b) => a + b, 0) / preise.length : null;
    return { _avg: { price: avg } };
  });

  prismaMock.menuItem.create.mockImplementation(async (args: any) => {
    const zeile: GerichtZeile = { id: neueId("item"), ...args.data };
    gerichte = [...gerichte, zeile];
    return zeile;
  });
});

/** Gültige ISO-Zeiten für Zod `.datetime()`. */
const SCHICHT = {
  date: "2026-08-10T00:00:00.000Z",
  startTime: "2026-08-10T08:00:00.000Z",
  endTime: "2026-08-10T16:00:00.000Z",
};

// ===========================================================================
// 1. DER FILTER-ANGRIFF - Query UND Rumpf
// ===========================================================================

describe("Der Filter-Angriff aus qs wird abgewiesen (server/routes/staff.ts)", () => {
  it("GET /staff?businessId[not]=zzz -> 400, kein Betrieb wird durchgereicht", async () => {
    const res = await request(app())
      .get("/staff?businessId[not]=zzz")
      .set(als(INHABER_A));

    expect(res.status, JSON.stringify(res.body)).toBe(400);
    expect(prismaMock.staff.findMany).not.toHaveBeenCalled();
  });

  it("POST /staff mit {businessId:{not:\"zzz\"}} im Rumpf -> 400, kein Personal entsteht", async () => {
    const vorher = personal.length;

    const res = await request(app())
      .post("/staff")
      .set(als(INHABER_A))
      .send({
        businessId: { not: "zzz" },
        email: "neu@a.de",
        firstName: "Neu",
        lastName: "Person",
      });

    expect(res.status, JSON.stringify(res.body)).toBe(400);
    expect(personal).toHaveLength(vorher);
  });
});

describe("Grundlegende Mandantentrennung bleibt gewahrt", () => {
  it("Inhaber B bekommt auf Betrieb A eine 403, nicht die Daten", async () => {
    const res = await request(app())
      .get(`/staff?businessId=${BETRIEB_A}`)
      .set(als(INHABER_B));

    expect(res.status, JSON.stringify(res.body)).toBe(403);
  });
});

// ===========================================================================
// 2. DIE FREMDE staffId
// ===========================================================================

describe("POST /staff/shifts: die staffId muss zum geprüften Betrieb gehören", () => {
  it("staffId aus einem FREMDEN Betrieb -> 404, keine Schicht entsteht, keine Personendaten in der Antwort", async () => {
    const res = await request(app())
      .post("/staff/shifts")
      .set(als(INHABER_A))
      .send({ businessId: BETRIEB_A, staffId: STAFF_FREMD, ...SCHICHT });

    expect(res.status, JSON.stringify(res.body)).toBe(404);
    expect(schichten).toHaveLength(0);
    // Die Antwort darf nicht einmal andeutungsweise Namen der fremden Person tragen.
    expect(JSON.stringify(res.body)).not.toMatch(/Nachbar|Fremd/);
  });
});

describe("POST /staff/conflicts/check: dasselbe Orakel, jetzt verschlossen", () => {
  it("staffId aus einem FREMDEN Betrieb -> 404, keine Arbeitszeiten in der Antwort", async () => {
    const res = await request(app())
      .post("/staff/conflicts/check")
      .set(als(INHABER_A))
      .send({
        businessId: BETRIEB_A,
        staffId: STAFF_FREMD,
        startTime: SCHICHT.startTime,
        endTime: SCHICHT.endTime,
      });

    expect(res.status, JSON.stringify(res.body)).toBe(404);
    expect(res.body.data).toBeUndefined();
  });
});

// ===========================================================================
// 3. DIE FREMDE categoryId
// ===========================================================================

describe("POST /creative/menu/items: die categoryId muss zum geprüften Betrieb gehören", () => {
  it("categoryId aus einem FREMDEN Betrieb -> 404, kein Gericht entsteht", async () => {
    const res = await request(app())
      .post("/creative/menu/items")
      .set(als(INHABER_A))
      .send({
        businessId: BETRIEB_A,
        categoryId: KATEGORIE_FREMD,
        items: [{ name: "Spätzle", price: 9.5 }],
      });

    expect(res.status, JSON.stringify(res.body)).toBe(404);
    expect(gerichte).toHaveLength(0);
  });
});

// ===========================================================================
// 4. DIE AUSHILFE AN JEDEM GERIEGELTEN ZUGRIFF
// ===========================================================================

describe("Aushilfe (Rolle STAFF) an den geriegelten Schreibzugriffen", () => {
  it("POST /staff (Personal anlegen) -> 403 nur_inhaber, kein Personal entsteht", async () => {
    const vorher = personal.length;
    const res = await request(app())
      .post("/staff")
      .set(als(AUSHILFE_A))
      .send({ businessId: BETRIEB_A, email: "neu@a.de", firstName: "Neu", lastName: "Person" });

    expect(res.status, JSON.stringify(res.body)).toBe(403);
    expect(res.body.error).toBe("nur_inhaber");
    expect(personal).toHaveLength(vorher);
  });

  it("POST /staff/shifts (Schicht anlegen) -> 403 nur_inhaber, keine Schicht entsteht", async () => {
    // Eigenes Personal anlegen, damit der Test ausschliesslich den Rollenriegel
    // prüft und nicht zufällig an der staffId-Prüfung scheitert.
    personal = [
      ...personal,
      {
        id: STAFF_EIGEN,
        businessId: BETRIEB_A,
        email: "eigen@a.de",
        firstName: "Eigen",
        lastName: "Person",
        phone: null,
        position: "Service",
        hourlyRate: 15,
        isActive: true,
        permissions: "[]",
      },
    ];

    const res = await request(app())
      .post("/staff/shifts")
      .set(als(AUSHILFE_A))
      .send({ businessId: BETRIEB_A, staffId: STAFF_EIGEN, ...SCHICHT });

    expect(res.status, JSON.stringify(res.body)).toBe(403);
    expect(res.body.error).toBe("nur_inhaber");
    expect(schichten).toHaveLength(0);
  });

  it("POST /creative/templates/switch (Vorlage wechseln) -> 403 nur_inhaber, Vorlage bleibt unverändert", async () => {
    const res = await request(app())
      .post("/creative/templates/switch")
      .set(als(AUSHILFE_A))
      .send({ businessId: BETRIEB_A, templateId: "cozy" });

    expect(res.status, JSON.stringify(res.body)).toBe(403);
    expect(res.body.error).toBe("nur_inhaber");
    expect(betriebe.find((b) => b.id === BETRIEB_A)?.templateId).toBeNull();
  });

  it("POST /creative/menu/categories (Kategorie anlegen) -> 403 nur_inhaber, keine Kategorie entsteht", async () => {
    const vorher = kategorien.length;
    const res = await request(app())
      .post("/creative/menu/categories")
      .set(als(AUSHILFE_A))
      .send({ businessId: BETRIEB_A, name: "Vorspeisen" });

    expect(res.status, JSON.stringify(res.body)).toBe(403);
    expect(res.body.error).toBe("nur_inhaber");
    expect(kategorien).toHaveLength(vorher);
  });

  it("POST /creative/menu/items (Gericht anlegen) -> 403 nur_inhaber, kein Gericht entsteht", async () => {
    const res = await request(app())
      .post("/creative/menu/items")
      .set(als(AUSHILFE_A))
      .send({ businessId: BETRIEB_A, items: [{ name: "Spätzle", price: 9.5 }] });

    expect(res.status, JSON.stringify(res.body)).toBe(403);
    expect(res.body.error).toBe("nur_inhaber");
    expect(gerichte).toHaveLength(0);
  });

  it("GET /staff/shifts bleibt offen - eine Aushilfe muss ihren Dienstplan sehen können", async () => {
    schichten = [
      {
        id: "shift-1",
        businessId: BETRIEB_A,
        staffId: STAFF_EIGEN,
        date: new Date(SCHICHT.date),
        startTime: new Date(SCHICHT.startTime),
        endTime: new Date(SCHICHT.endTime),
        breakDuration: 0,
        shiftType: "REGULAR",
      },
    ];

    const res = await request(app())
      .get(`/staff/shifts?businessId=${BETRIEB_A}`)
      .set(als(AUSHILFE_A));

    expect(res.status, JSON.stringify(res.body)).toBe(200);
    expect(res.body.data).toHaveLength(1);
  });
});

// ===========================================================================
// 5. DER GUTE FALL BLEIBT GUT
// ===========================================================================

describe("Inhaber A: der gute Fall bleibt gut", () => {
  it("POST /staff legt Personal im eigenen Betrieb an", async () => {
    const res = await request(app())
      .post("/staff")
      .set(als(INHABER_A))
      .send({
        businessId: BETRIEB_A,
        email: "neu@a.de",
        firstName: "Neu",
        lastName: "Person",
        hourlyRate: 18,
      });

    expect(res.status, JSON.stringify(res.body)).toBe(200);
    expect(res.body.data.businessId).toBe(BETRIEB_A);
    expect(personal.some((p) => p.email === "neu@a.de" && p.businessId === BETRIEB_A)).toBe(true);
  });

  it("POST /staff/shifts legt eine Schicht für die eigene Person an", async () => {
    personal = [
      ...personal,
      {
        id: STAFF_EIGEN,
        businessId: BETRIEB_A,
        email: "eigen@a.de",
        firstName: "Eigen",
        lastName: "Person",
        phone: null,
        position: "Service",
        hourlyRate: 15,
        isActive: true,
        permissions: "[]",
      },
    ];

    const res = await request(app())
      .post("/staff/shifts")
      .set(als(INHABER_A))
      .send({ businessId: BETRIEB_A, staffId: STAFF_EIGEN, ...SCHICHT });

    expect(res.status, JSON.stringify(res.body)).toBe(200);
    expect(schichten).toHaveLength(1);
    expect(schichten[0].businessId).toBe(BETRIEB_A);
    expect(schichten[0].staffId).toBe(STAFF_EIGEN);
  });

  it("POST /creative/templates/switch wechselt die eigene Vorlage", async () => {
    const res = await request(app())
      .post("/creative/templates/switch")
      .set(als(INHABER_A))
      .send({ businessId: BETRIEB_A, templateId: "cozy" });

    expect(res.status, JSON.stringify(res.body)).toBe(200);
    expect(betriebe.find((b) => b.id === BETRIEB_A)?.templateId).toBe("cozy");
  });

  it("POST /creative/menu/categories legt eine Kategorie im eigenen Betrieb an", async () => {
    const res = await request(app())
      .post("/creative/menu/categories")
      .set(als(INHABER_A))
      .send({ businessId: BETRIEB_A, name: "Vorspeisen" });

    expect(res.status, JSON.stringify(res.body)).toBe(200);
    expect(kategorien.some((k) => k.name === "Vorspeisen" && k.businessId === BETRIEB_A)).toBe(
      true,
    );
  });

  it("POST /creative/menu/items legt ein Gericht in der eigenen (neu angelegten) Kategorie an", async () => {
    const res = await request(app())
      .post("/creative/menu/items")
      .set(als(INHABER_A))
      .send({ businessId: BETRIEB_A, items: [{ name: "Spätzle", price: 9.5 }] });

    expect(res.status, JSON.stringify(res.body)).toBe(200);
    expect(gerichte).toHaveLength(1);
    const neueKategorie = kategorien.find((k) => k.id === gerichte[0].categoryId);
    expect(neueKategorie?.businessId).toBe(BETRIEB_A);
  });

  it("POST /creative/menu/items mit eigener categoryId hängt das Gericht dort ein", async () => {
    kategorien = [...kategorien, { id: KATEGORIE_EIGEN, businessId: BETRIEB_A, name: "Suppen", sortOrder: 1 }];

    const res = await request(app())
      .post("/creative/menu/items")
      .set(als(INHABER_A))
      .send({ businessId: BETRIEB_A, categoryId: KATEGORIE_EIGEN, items: [{ name: "Gulaschsuppe", price: 6.5 }] });

    expect(res.status, JSON.stringify(res.body)).toBe(200);
    expect(gerichte).toHaveLength(1);
    expect(gerichte[0].categoryId).toBe(KATEGORIE_EIGEN);
  });
});

// ===========================================================================
// 6. NICHT ANGEMELDET
// ===========================================================================

describe("Ohne Testnutzer-Kopfzeile (steht für: nicht angemeldet)", () => {
  it("GET /staff -> 401", async () => {
    const res = await request(app()).get(`/staff?businessId=${BETRIEB_A}`);
    expect(res.status).toBe(401);
  });
});
