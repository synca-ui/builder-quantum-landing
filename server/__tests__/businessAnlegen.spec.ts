// @vitest-environment node
/**
 * Beim Veröffentlichen muss ein BETRIEB entstehen (`ensureUserBusiness` in
 * server/services/BusinessService.ts, aufgerufen aus server/routes/webapps.ts).
 *
 * ANLASS: Die Produktivdatenbank hat 0 Zeilen in `Business`, obwohl der
 * Veröffentlichungsweg live ist. Ursache war eine einzige Zeile im create-Zweig
 * des Upserts:
 *
 *     template: templateId || "minimalist",
 *
 * `template` ist in prisma/schema.prisma (Zeile 59) aber keine Textspalte,
 * sondern die Relation `template Template? @relation(fields: [templateId], ...)`.
 * Prisma nimmt dort ausschließlich ein verschachteltes Schreibobjekt entgegen.
 * Belegt mit Prismas EIGENEN erzeugten Typen:
 *
 *     error TS2559: Type 'string' has no properties in common with
 *                   type 'TemplateCreateNestedOneWithoutBusinessesInput'.
 *
 * Der Aufruf ist also bei JEDER Veröffentlichung gescheitert – und webapps.ts
 * hat den Fehler als "Non-fatal - continue without business link" verschluckt.
 * Die Web-App ging online, der Betrieb entstand nie, und ohne `BusinessMember`
 * antwortet danach jede betriebsgebundene Route mit 403.
 *
 * ---------------------------------------------------------------------------
 * WARUM DIESER TEST ÜBERHAUPT ETWAS BEWEIST
 *
 * Ein gewöhnlicher `vi.fn()`-Mock hätte `template: "minimalist"` anstandslos
 * geschluckt – der Test wäre auch OHNE die Korrektur grün gewesen und damit
 * wertlos. Deshalb liest der Mock hier die ECHTE prisma/schema.prisma ein,
 * leitet daraus ab, welche Felder von `Business` Spalten und welche Relationen
 * sind, und lehnt eine Zeichenkette auf einer Relation ab – so wie Prisma es
 * tut. Die Prüfregel ist damit nicht meine Behauptung, sondern das Schema.
 *
 * Zusätzlich kennt der Mock den Fremdschlüssel: `templateId` auf eine Vorlage,
 * die es nicht gibt, wirft P2003. Das ist die zweite Falle an derselben Stelle –
 * eine Verknüpfung ins Leere hätte den Insert genauso gekillt.
 *
 * Die Datenbank wird nie angefasst. Der Prisma-Client ist in diesem Baum
 * ohnehin nicht erzeugt (node_modules/.prisma fehlt).
 */
import { beforeEach, describe, expect, it, vi } from "vitest";
import express from "express";
import request from "supertest";
import { readFileSync } from "node:fs";
import path from "node:path";

// ===========================================================================
// SCHEMA LESEN – die Prüfregeln des Mocks stammen aus der echten Datei
// ===========================================================================

const SCHEMA = readFileSync(
  path.resolve(__dirname, "../../prisma/schema.prisma"),
  "utf8",
);

/** Prismas eingebaute Skalartypen. Alles andere ist Enum oder Relation. */
const SKALARE = new Set([
  "String",
  "Int",
  "Float",
  "Boolean",
  "DateTime",
  "Json",
  "Decimal",
  "BigInt",
  "Bytes",
]);

/** Alle Enum-Namen aus dem Schema – Enums sind Spalten, keine Relationen. */
const ENUMS = new Set(
  [...SCHEMA.matchAll(/^enum\s+(\w+)\s*\{/gm)].map((m) => m[1]),
);

interface Feld {
  typ: string;
  liste: boolean;
}

/** Liest die Felder EINES Modells aus dem Schema. */
function feldervon(modell: string): Record<string, Feld> {
  const block = SCHEMA.match(
    new RegExp(`^model\\s+${modell}\\s*\\{([\\s\\S]*?)^\\}`, "m"),
  );
  if (!block) throw new Error(`Modell ${modell} nicht in schema.prisma`);

  const felder: Record<string, Feld> = {};
  for (const rohzeile of block[1].split("\n")) {
    const zeile = rohzeile.replace(/\/\/.*$/, "").trim();
    // Feldzeilen sehen so aus: "name  Typ[]?  @attribut..."
    const treffer = zeile.match(/^(\w+)\s+(\w+)(\[\])?(\?)?/);
    if (!treffer) continue;
    if (zeile.startsWith("@@")) continue;
    felder[treffer[1]] = { typ: treffer[2], liste: Boolean(treffer[3]) };
  }
  return felder;
}

const BUSINESS_FELDER = feldervon("Business");

/** Spalte = Skalar oder Enum, und keine Liste von Modellen. */
function istSpalte(feld: Feld): boolean {
  return SKALARE.has(feld.typ) || ENUMS.has(feld.typ);
}

/**
 * Prüft ein `data`-Objekt so, wie Prisma es prüft: unbekannte Felder fliegen
 * raus, und auf einer Relation ist eine Zeichenkette kein gültiger Wert –
 * dort gehört ein verschachteltes Schreibobjekt hin (connect/create/...).
 */
function pruefeBusinessDaten(
  data: Record<string, unknown>,
  zweig: "create" | "update",
): void {
  for (const [schluessel, wert] of Object.entries(data)) {
    const feld = BUSINESS_FELDER[schluessel];
    if (!feld) {
      throw validierungsfehler(
        `Unknown argument \`${schluessel}\` in data.${zweig} of Business.`,
      );
    }
    if (istSpalte(feld)) continue;
    // Ab hier: Relation. Nur ein Objekt ist erlaubt.
    if (wert === undefined) continue;
    const istObjekt =
      typeof wert === "object" && wert !== null && !Array.isArray(wert);
    if (!istObjekt) {
      throw validierungsfehler(
        `Invalid value for argument \`${schluessel}\` in data.${zweig} of ` +
          `Business: \`${String(wert)}\` (${typeof wert}). Field \`${schluessel}\` ` +
          `is a relation to \`${feld.typ}\` and expects a nested write, not a scalar.`,
      );
    }
  }
}

function validierungsfehler(text: string) {
  const e = new Error(text);
  e.name = "PrismaClientValidationError";
  return e;
}

/** Fehlerform von Prisma bei verletztem Fremdschlüssel. */
function fremdschluesselVerletzung(feld: string) {
  return Object.assign(
    new Error(`Foreign key constraint failed on the field: \`${feld}\``),
    { code: "P2003", meta: { field_name: feld } },
  );
}

// ===========================================================================
// MOCKS
// ===========================================================================

const { prismaMock } = vi.hoisted(() => ({
  prismaMock: {
    user: { findUnique: vi.fn() },
    template: { findUnique: vi.fn() },
    business: { upsert: vi.fn() },
    businessMember: { findUnique: vi.fn(), findFirst: vi.fn() },
    webApp: { findUnique: vi.fn(), upsert: vi.fn() },
    configuration: { update: vi.fn() },
    auditLog: { create: vi.fn() },
    $transaction: vi.fn(),
  },
}));

vi.mock("../db/prisma", () => ({ default: prismaMock, prisma: prismaMock }));

/** Angemeldet ohne echtes Clerk-Token. */
const ICH = "user-wirt";
vi.mock("../middleware/auth", () => ({
  requireAuth: (req: express.Request, _res: unknown, next: () => void) => {
    // Volle AuthUser-Form, nicht nur die id – sonst prüft der Test gegen eine
    // Gestalt, die die echte Middleware so nie liefert.
    req.user = { id: ICH, email: "wirt@example.de", clerkId: "clerk_wirt" };
    next();
  },
}));

// Stage 3.5 lädt sonst echte Bilder über das Netz.
vi.mock("../services/imageIngest", () => ({
  ingestGallery: vi.fn(async (gallery: unknown) => ({
    gallery: Array.isArray(gallery) ? gallery : [],
    copied: 0,
    skipped: 0,
    failed: 0,
    notes: [],
  })),
}));

import {
  ensureUserBusiness,
  generateBusinessSlug,
  legacyBusinessSlug,
} from "../services/BusinessService";
import { webAppsRouter } from "../routes/webapps";

// ===========================================================================
// DER "DATENBESTAND"
// ===========================================================================

interface BetriebZeile {
  id: string;
  slug: string;
  name: string;
  templateId: string | null;
  primaryColor: string;
  secondaryColor: string;
  fontFamily: string;
  status: string;
}
interface MitgliedZeile {
  userId: string;
  businessId: string;
  role: string;
}

let nutzer: { id: string }[];
let vorlagen: { id: string }[];
let betriebe: BetriebZeile[];
let mitglieder: MitgliedZeile[];
let auditEintraege: { action: string; success: boolean; errorMessage?: string }[];

function txSpiegel() {
  return {
    user: {
      findUnique: async ({ where }: { where: { id: string } }) =>
        nutzer.find((u) => u.id === where.id) ?? null,
    },
    template: {
      findUnique: async ({ where }: { where: { id: string } }) =>
        vorlagen.find((t) => t.id === where.id) ?? null,
    },
    business: {
      // findUnique/create/update statt upsert: BusinessService trennt seit der
      // Mandantenkorrektur drei Faelle, statt blind ueber den globalen slug zu
      // upserten. Der Mock zieht mit, damit er weiter misst, was der Code tut.
      findUnique: async ({ where }: { where: { slug?: string; id?: string } }) =>
        betriebe.find((b) =>
          where.slug !== undefined ? b.slug === where.slug : b.id === where.id,
        ) ?? null,

      create: async ({ data }: { data: Record<string, unknown> }) => {
        pruefeBusinessDaten(data, "create");
        const fk = data.templateId as string | undefined;
        if (fk !== undefined && fk !== null && !vorlagen.some((t) => t.id === fk)) {
          throw fremdschluesselVerletzung("templateId");
        }
        const zeile: BetriebZeile = {
          id: `biz-${betriebe.length + 1}`,
          templateId: null,
          status: "DRAFT",
          ...(data as unknown as Partial<BetriebZeile>),
        } as BetriebZeile;
        if (zeile.templateId === undefined) zeile.templateId = null;
        betriebe = [...betriebe, zeile];
        return zeile;
      },

      update: async ({ where, data }: { where: { id: string }; data: Record<string, unknown> }) => {
        pruefeBusinessDaten(data, "update");
        const fk = data.templateId as string | undefined;
        if (fk !== undefined && fk !== null && !vorlagen.some((t) => t.id === fk)) {
          throw fremdschluesselVerletzung("templateId");
        }
        const treffer = betriebe.find((b) => b.id === where.id);
        if (!treffer) throw new Error(`Betrieb nicht gefunden: ${where.id}`);
        Object.assign(treffer, data);
        return treffer;
      },

      upsert: async ({
        where,
        update,
        create,
      }: {
        where: { slug: string };
        update: Record<string, unknown>;
        create: Record<string, unknown>;
      }) => {
        // BEIDE Zweige prüfen: Sie sind Teil EINES Argumentobjekts, und genau
        // dieses Objekt hat Prisma abgelehnt (siehe TS2559 im Dateikopf).
        pruefeBusinessDaten(update, "update");
        pruefeBusinessDaten(create, "create");

        const treffer = betriebe.find((b) => b.slug === where.slug);
        const fk = (treffer ? update.templateId : create.templateId) as
          | string
          | undefined;
        if (fk !== undefined && fk !== null && !vorlagen.some((t) => t.id === fk)) {
          throw fremdschluesselVerletzung("templateId");
        }

        if (treffer) {
          Object.assign(treffer, update);
          return treffer;
        }
        const zeile: BetriebZeile = {
          id: `biz-${betriebe.length + 1}`,
          templateId: null,
          status: "DRAFT",
          ...(create as unknown as Partial<BetriebZeile>),
        } as BetriebZeile;
        // Prisma speichert `undefined` nicht – es heißt "Feld nicht anfassen".
        if (zeile.templateId === undefined) zeile.templateId = null;
        betriebe = [...betriebe, zeile];
        return zeile;
      },
    },
    businessMember: {
      findUnique: async ({
        where,
      }: {
        where: { userId_businessId: { userId: string; businessId: string } };
      }) => {
        const { userId, businessId } = where.userId_businessId;
        return (
          mitglieder.find(
            (m) => m.userId === userId && m.businessId === businessId,
          ) ?? null
        );
      },
      create: async ({ data }: { data: MitgliedZeile }) => {
        mitglieder = [...mitglieder, data];
        return data;
      },
    },
    configuration: { update: async () => ({ id: "conf-1" }) },
    webApp: {
      upsert: async () => ({ id: "app-1" }),
    },
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  nutzer = [{ id: ICH }];
  // Die vier Vorlagen aus prisma/seed.ts.
  vorlagen = [{ id: "minimalist" }, { id: "modern" }, { id: "stylish" }, { id: "cozy" }];
  betriebe = [];
  mitglieder = [];
  auditEintraege = [];

  prismaMock.$transaction.mockImplementation(
    async (fn: (tx: unknown) => Promise<unknown>) => {
      // Rollback echt nachbilden: Stand sichern, bei Fehler zurückspielen.
      const sicherungBetriebe = betriebe;
      const sicherungMitglieder = mitglieder;
      try {
        return await fn(txSpiegel());
      } catch (err) {
        betriebe = sicherungBetriebe;
        mitglieder = sicherungMitglieder;
        throw err;
      }
    },
  );

  prismaMock.webApp.findUnique.mockResolvedValue(null);
  prismaMock.auditLog.create.mockImplementation(async ({ data }: any) => {
    auditEintraege = [...auditEintraege, data];
    return data;
  });
});

// ===========================================================================
// 0. DIE NEGATIVKONTROLLE SELBST
// ===========================================================================

describe("Der Prüfstein: erkennt der Mock den ursprünglichen Fehler?", () => {
  it("lehnt eine Zeichenkette auf der Relation `template` ab – wie Prisma", () => {
    // Genau das data-Objekt, das bis zur Korrektur im create-Zweig stand.
    expect(() =>
      pruefeBusinessDaten(
        {
          slug: "test",
          name: "Test",
          templateId: undefined,
          template: "minimalist",
          status: "DRAFT",
        },
        "create",
      ),
    ).toThrow(/Field `template` is a relation/);
  });

  it("liest `template` als Relation und `templateId` als Spalte aus dem Schema", () => {
    // Wenn jemand das Schema ändert, verschiebt sich diese Erwartung mit –
    // der Test hängt nicht an einer abgeschriebenen Annahme.
    expect(BUSINESS_FELDER.template).toEqual({ typ: "Template", liste: false });
    expect(istSpalte(BUSINESS_FELDER.template)).toBe(false);
    expect(istSpalte(BUSINESS_FELDER.templateId)).toBe(true);
  });
});

// ===========================================================================
// 1. DER KERN: Betrieb UND Mitgliedschaft entstehen
// ===========================================================================

describe("ensureUserBusiness legt Betrieb UND Mitgliedschaft an", () => {
  it("OHNE templateId", async () => {
    const ergebnis = await ensureUserBusiness(ICH, "Café Müller", undefined, {
      primaryColor: "#660c21",
    });

    expect(betriebe).toHaveLength(1);
    expect(betriebe[0].name).toBe("Café Müller");
    expect(betriebe[0].templateId).toBeNull();
    expect(mitglieder).toEqual([
      { userId: ICH, businessId: "biz-1", role: "OWNER" },
    ]);
    expect(ergebnis.businessId).toBe("biz-1");
    expect(ergebnis.isMembershipNew).toBe(true);
  });

  it("MIT templateId einer vorhandenen Vorlage – und der Bezug wird gesetzt", async () => {
    await ensureUserBusiness(ICH, "Café Müller", "minimalist", {});

    expect(betriebe).toHaveLength(1);
    expect(betriebe[0].templateId).toBe("minimalist");
    expect(mitglieder).toHaveLength(1);
    expect(mitglieder[0].role).toBe("OWNER");
  });

  it("MIT templateId, die es NICHT gibt: Betrieb entsteht trotzdem", async () => {
    // Die zweite Falle an derselben Stelle. Ein Fremdschlüssel ins Leere hätte
    // den Insert genauso scheitern lassen – und wir wären wieder bei 0 Zeilen.
    await ensureUserBusiness(ICH, "Café Müller", "gibtsnicht", {});

    expect(betriebe).toHaveLength(1);
    expect(betriebe[0].templateId).toBeNull();
    expect(mitglieder).toHaveLength(1);
  });

  it("legt beim zweiten Veröffentlichen keine zweite Mitgliedschaft an", async () => {
    await ensureUserBusiness(ICH, "Café Müller", "minimalist", {});
    const zweiter = await ensureUserBusiness(ICH, "Café Müller", "modern", {});

    expect(betriebe).toHaveLength(1);
    expect(mitglieder).toHaveLength(1);
    expect(zweiter.isMembershipNew).toBe(false);
    // Der update-Zweig darf den Vorlagenbezug mitziehen.
    expect(betriebe[0].templateId).toBe("modern");
  });
});

// ===========================================================================
// 2. DER WEG, AUF DEM ES PASSIERT: POST /api/apps/publish
// ===========================================================================

function app() {
  const a = express();
  a.use(express.json());
  a.use("/api", webAppsRouter);
  return a;
}

/** Das Minimum, das validatePublishData durchlässt. */
const KONFIG = {
  business: { name: "Café Müller", type: "restaurant" },
  design: { template: "minimalist", primaryColor: "#660c21" },
  contact: { email: "info@cafe.de" },
  content: { menuItems: [{ name: "Kaffee", price: 3 }] },
};

describe("POST /api/apps/publish legt den Betrieb wirklich an", () => {
  it("Veröffentlichen erzeugt Betrieb und Mitgliedschaft", async () => {
    const res = await request(app())
      .post("/api/apps/publish")
      .send({ subdomain: "cafe-mueller", config: KONFIG });

    expect(res.status, JSON.stringify(res.body)).toBe(200);
    expect(res.body.success).toBe(true);

    // DAS ist der Punkt der ganzen Übung.
    expect(betriebe).toHaveLength(1);
    expect(mitglieder).toEqual([
      { userId: ICH, businessId: "biz-1", role: "OWNER" },
    ]);
    // Die im Konfigurator gewählte Vorlage kommt am Betrieb an – bisher stand
    // an dieser Stelle fest `undefined`.
    expect(betriebe[0].templateId).toBe("minimalist");
    // Und keine Warnung, weil nichts schiefging.
    expect(
      (res.body.warnings as string[]).some((w) =>
        w.includes("Betrieb konnte nicht angelegt werden"),
      ),
    ).toBe(false);
    // Auch kein Auditeintrag über einen Fehlschlag.
    expect(
      auditEintraege.filter((e) => e.action === "business_link_failed"),
    ).toEqual([]);
  });

  it("scheitert das Anlegen, bleibt es nicht mehr still", async () => {
    // Nutzer fehlt -> ensureUserBusiness wirft, wie es auch vorher geworfen hat.
    nutzer = [];

    const res = await request(app())
      .post("/api/apps/publish")
      .send({ subdomain: "cafe-mueller", config: KONFIG });

    // Die Veröffentlichung selbst bleibt erfolgreich: Die Web-App ist online,
    // und ein 500 nähme dem Nutzer ein fertiges Ergebnis weg.
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(betriebe).toHaveLength(0);

    // Aber der Fehlschlag ist jetzt sichtbar – in der Antwort ...
    expect(
      res.body.warnings.some((w: string) =>
        w.includes("Betrieb konnte nicht angelegt werden"),
      ),
      `warnings waren: ${JSON.stringify(res.body.warnings)}`,
    ).toBe(true);

    // ... und im Auditlog.
    const eintrag = auditEintraege.find(
      (e) => e.action === "business_link_failed",
    );
    expect(eintrag, JSON.stringify(auditEintraege)).toBeTruthy();
    expect(eintrag!.success).toBe(false);
    expect(eintrag!.errorMessage).toMatch(/User not found/);
  });

  /**
   * MANDANTENTRENNUNG — der Fall, der erst durch die Reparatur erreichbar wurde.
   *
   * Vorher traf der Upsert den Betrieb ueber den GLOBALEN slug und machte den
   * Aufrufer bedingungslos zum OWNER. Zwei Wirte mit demselben Betriebsnamen
   * ergeben denselben slug: Der zweite waere Mitinhaber des ersten geworden, und
   * der update-Zweig haette Name und Farben des ersten ueberschrieben. Solange
   * nie ein Betrieb entstand, konnte das niemand bemerken.
   */
  it("uebernimmt NICHT den gleichnamigen Betrieb eines anderen Wirts", async () => {
    const ersterWirt = "user-wirt-a";
    const zweiterWirt = "user-wirt-b";
    nutzer = [
      { id: ersterWirt },
      { id: zweiterWirt },
    ];

    const a = await ensureUserBusiness(ersterWirt, "Zur Post");
    const b = await ensureUserBusiness(zweiterWirt, "Zur Post");

    // Zwei getrennte Betriebe, nicht einer mit zwei Inhabern.
    expect(b.businessId).not.toBe(a.businessId);
    expect(betriebe).toHaveLength(2);

    // Der zweite bekam eine ausweichende Adresse, der erste behielt seine.
    expect(a.businessSlug).toBe("zur-post");
    expect(b.businessSlug).toBe("zur-post-2");

    // Und vor allem: Wirt B ist NICHT Mitglied bei Wirt A.
    const fremdeMitgliedschaft = mitglieder.find(
      (m) => m.userId === zweiterWirt && m.businessId === a.businessId,
    );
    expect(fremdeMitgliedschaft).toBeUndefined();
  });

  /**
   * DAS LOCH IM ALTBESTANDS-RUECKFALL, von der Gegenprobe gefunden.
   *
   * Der Rueckfall suchte die alte Adresse nur, wenn unter der NEUEN gar nichts
   * lag. Belegt eine FREMDE Zeile die neue Adresse, wurde die eigene Altzeile nie
   * gesucht - der Aufruf fiel direkt ins Ausweichen und legte einen zweiten
   * Betrieb an, obwohl der eigene unter der alten Adresse danebenstand.
   */
  it("findet den eigenen Altbestand auch, wenn ein Fremder die neue Adresse belegt", async () => {
    const ich = "user-ich";
    const fremder = "user-fremd";
    nutzer = [
      { id: ich },
      { id: fremder },
    ];

    const name = "Café Müller";
    const neueAdresse = generateBusinessSlug(name);
    const alteAdresse = legacyBusinessSlug(name);
    // Nur sinnvoll, wenn sich die Regeln fuer diesen Namen unterscheiden.
    expect(alteAdresse).not.toBe(neueAdresse);

    // Altbestand: MEIN Betrieb liegt unter der alten Adresse.
    betriebe = [
      {
        id: "biz-alt",
        slug: alteAdresse,
        name,
        templateId: null,
        status: "DRAFT",
        primaryColor: "#000000",
        secondaryColor: "#ffffff",
        fontFamily: "sans",
      },
      // Ein FREMDER hat inzwischen die neue Adresse belegt.
      {
        id: "biz-fremd",
        slug: neueAdresse,
        name,
        templateId: null,
        status: "DRAFT",
        primaryColor: "#000000",
        secondaryColor: "#ffffff",
        fontFamily: "sans",
      },
    ];
    mitglieder = [
      { userId: ich, businessId: "biz-alt", role: "OWNER" },
      { userId: fremder, businessId: "biz-fremd", role: "OWNER" },
    ];

    const ergebnis = await ensureUserBusiness(ich, name);

    // Mein Altbestand wird aktualisiert - kein dritter Betrieb.
    expect(ergebnis.businessId).toBe("biz-alt");
    expect(ergebnis.businessSlug).toBe(alteAdresse);
    expect(betriebe).toHaveLength(2);

    // Und der fremde Betrieb bleibt unangetastet.
    const fremdeMitgliedschaft = mitglieder.find(
      (m) => m.userId === ich && m.businessId === "biz-fremd",
    );
    expect(fremdeMitgliedschaft).toBeUndefined();
  });
});
