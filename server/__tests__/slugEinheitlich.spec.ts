/**
 * EINE ADRESSREGEL FÜR BEIDE WEGE.
 *
 * `Business.slug` ist @unique und wird von zwei Stellen gefüllt:
 *
 *   1. POST /api/maitr/venues (server/maitr/routes.ts) - nimmt
 *      `nextSubdomainCandidate(suggestSubdomain(name), 0)`, also genau
 *      `suggestSubdomain(name)`.
 *   2. POST /api/apps/publish (server/routes/webapps.ts -> ensureUserBusiness)
 *      - nimmt `generateBusinessSlug(name)`.
 *
 * Bis zur Vereinheitlichung waren das ZWEI Regeln. Gemessen vorher:
 *
 *   "Café Müller"     -> caf-mller       statt cafe-mueller
 *   "Zur Straßenecke" -> zur-straenecke  statt zur-strassenecke
 *
 * Derselbe Wirt hätte für dasselbe Lokal zwei verschiedene Adressen bekommen -
 * und damit womöglich zwei Betriebe. Zwei Betriebe sind nicht bloß unschön:
 * `taskVenueGuard` leitet die Betriebskennung aus der EINEN Mitgliedschaft ab
 * und antwortet bei zweien mit 400.
 *
 * Solange nie eine Business-Zeile entstand, konnte das niemand bemerken. Seit
 * der Reparatur des Veröffentlichungspfads schreibt jede Veröffentlichung.
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import { suggestSubdomain, nextSubdomainCandidate } from "../../shared/subdomain";

// ===========================================================================
// MOCK: server/db/prisma wirft beim Import, wenn DATABASE_URL fehlt.
// ===========================================================================

interface BetriebZeile {
  id: string;
  slug: string;
  name: string;
  templateId: string | null;
  primaryColor?: string;
  secondaryColor?: string;
  fontFamily?: string;
  status: string;
}
interface MitgliedZeile {
  userId: string;
  businessId: string;
  role: string;
}

let nutzer: { id: string }[] = [];
let betriebe: BetriebZeile[] = [];
let mitglieder: MitgliedZeile[] = [];

const { prismaMock } = vi.hoisted(() => ({
  prismaMock: { $transaction: vi.fn() },
}));
vi.mock("../db/prisma", () => ({ default: prismaMock, prisma: prismaMock }));

/** Der kleinste Datenbestand, den ensureUserBusiness anfasst. */
function txSpiegel() {
  return {
    user: {
      findUnique: async ({ where }: { where: { id: string } }) =>
        nutzer.find((u) => u.id === where.id) ?? null,
    },
    template: {
      findUnique: async () => null,
    },
    business: {
      findUnique: async ({ where }: { where: { slug?: string; id?: string } }) =>
        betriebe.find((b) =>
          where.slug !== undefined ? b.slug === where.slug : b.id === where.id,
        ) ?? null,
      create: async ({ data }: { data: Record<string, unknown> }) => {
        const zeile = {
          id: `biz-${betriebe.length + 1}`,
          templateId: null,
          status: "DRAFT",
          ...(data as unknown as Partial<BetriebZeile>),
        } as BetriebZeile;
        betriebe = [...betriebe, zeile];
        return zeile;
      },
      update: async ({
        where,
        data,
      }: {
        where: { id: string };
        data: Record<string, unknown>;
      }) => {
        const treffer = betriebe.find((b) => b.id === where.id);
        if (!treffer) throw new Error(`Betrieb nicht gefunden: ${where.id}`);
        Object.assign(treffer, data);
        return treffer;
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
          mitglieder.find((m) => m.userId === userId && m.businessId === businessId) ??
          null
        );
      },
      create: async ({ data }: { data: MitgliedZeile }) => {
        mitglieder = [...mitglieder, data];
        return data;
      },
    },
  };
}

import {
  ensureUserBusiness,
  generateBusinessSlug,
  legacyBusinessSlug,
} from "../services/BusinessService";

const ICH = "user-wirt";

beforeEach(() => {
  vi.clearAllMocks();
  nutzer = [{ id: ICH }];
  betriebe = [];
  mitglieder = [];
  prismaMock.$transaction.mockImplementation(
    async (fn: (tx: unknown) => Promise<unknown>) => {
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
});

// ===========================================================================
// 1. DIE GLEICHHEIT SELBST
// ===========================================================================

/**
 * Die knifflige Liste: Umlaute, scharfes S, Akzente, Bindestriche, Ziffern,
 * Apostroph, sehr kurz, sehr lang. Für jeden Namen, aus dem sich überhaupt
 * eine Adresse ableiten lässt, MÜSSEN beide Wege dieselbe liefern.
 */
const KNIFFLIGE_NAMEN = [
  "Café Müller",
  "Zur Straßenecke",
  "Gasthaus Schröder",
  "Weißes Rössl",
  "Ölmühle",
  "Bäckerei Öz",
  "Zoë's Crêperie",
  "L'Osteria",
  "Kleiner Kiepenkerl",
  "Zur Post – Gasthof & Hotel",
  "Restaurant 1900",
  "Steak-Haus 24/7",
  "  Führung  ",
  "Zur Post",
  "abc",
  "Ätna",
  "Gasthaus zum güldenen Löwen am alten Marktplatz von Sankt Andreasberg im Harz",
];

describe("Beide Wege leiten dieselbe Adresse ab", () => {
  it.each(KNIFFLIGE_NAMEN)(
    'POST /venues und Veröffentlichen sind sich einig über "%s"',
    (name) => {
      const perVenueRoute = suggestSubdomain(name);
      // Nur Namen, aus denen sich überhaupt etwas ableiten lässt - die anderen
      // weist die venue-Route mit 422 ab, siehe eigener Block weiter unten.
      expect(perVenueRoute, `${name} liefert keine Adresse`).not.toBeNull();
      expect(generateBusinessSlug(name)).toBe(perVenueRoute);
    },
  );

  it("überträgt Umlaute und Akzente, statt sie wegzuwerfen", () => {
    // Die konkreten Werte, die den Auftrag ausgelöst haben. Vorher stand hier
    // "caf-mller" bzw. "zur-straenecke".
    expect(generateBusinessSlug("Café Müller")).toBe("cafe-mueller");
    expect(generateBusinessSlug("Zur Straßenecke")).toBe("zur-strassenecke");
    expect(generateBusinessSlug("Ölmühle")).toBe("oelmuehle");
    expect(generateBusinessSlug("Weißes Rössl")).toBe("weisses-roessl");
  });

  it("die alte Regel WÄRE hier abgewichen - die Negativkontrolle", () => {
    // Ohne diesen Test könnte die Vereinheitlichung auch dadurch grün werden,
    // dass jemand die Testnamen entschärft.
    const abweichend = KNIFFLIGE_NAMEN.filter(
      (n) => legacyBusinessSlug(n) !== suggestSubdomain(n),
    );
    expect(abweichend.length).toBeGreaterThan(0);
    expect(legacyBusinessSlug("Café Müller")).toBe("caf-mller");
  });

  it("hält die Adresse innerhalb dessen, was als Subdomain zulässig ist", () => {
    // Die alte Regel schnitt bei 50 Zeichen, die gemeinsame bei 63 - und nur
    // die gemeinsame prüft das Ergebnis auch nach.
    const lang = "Gasthaus " + "a".repeat(200);
    const adresse = generateBusinessSlug(lang);
    expect(adresse.length).toBeLessThanOrEqual(63);
  });
});

describe("Namen ohne ableitbare Adresse", () => {
  // Diese weist POST /api/maitr/venues mit 422 ab (dort sitzt ein Mensch, der
  // umbenennen kann). Der Veröffentlichungspfad kann das nicht - die Web-App
  // ist gleich online - und nimmt denselben Rückfall wie die alte Regel.
  it.each(["A", "!!!", "", "Demo", "Admin", "Maitr"])(
    '"%s" hat keine ableitbare Adresse',
    (name) => {
      expect(suggestSubdomain(name)).toBeNull();
      expect(generateBusinessSlug(name)).toBe("business");
    },
  );

  it("der Rückfall ist selbst eine zulässige, nicht reservierte Adresse", () => {
    expect(suggestSubdomain("business")).toBe("business");
  });
});

// ===========================================================================
// 2. DER HEIKLE TEIL: Altbestand bleibt auffindbar
// ===========================================================================

describe("Betriebe, die unter der ALTEN Regel entstanden sind", () => {
  it("werden beim erneuten Veröffentlichen aktualisiert, nicht verdoppelt", async () => {
    // Altbestand: eine Zeile, wie sie der Veröffentlichungspfad vor der
    // Vereinheitlichung geschrieben hat.
    betriebe = [
      {
        id: "biz-alt",
        slug: legacyBusinessSlug("Café Müller"),
        name: "Café Müller",
        templateId: null,
        status: "PUBLISHED",
      },
    ];
    mitglieder = [{ userId: ICH, businessId: "biz-alt", role: "OWNER" }];
    expect(betriebe[0].slug).toBe("caf-mller");

    const ergebnis = await ensureUserBusiness(ICH, "Café Müller", undefined, {
      primaryColor: "#660c21",
    });

    // DAS ist der Punkt: EIN Betrieb, EINE Mitgliedschaft.
    expect(betriebe).toHaveLength(1);
    expect(mitglieder).toHaveLength(1);
    expect(ergebnis.businessId).toBe("biz-alt");
    expect(ergebnis.isMembershipNew).toBe(false);
    // Und die alte Adresse bleibt stehen - sie ist öffentlich erreichbar
    // (GET /venues/:slug/public). Ein Umbenennen bräche jeden Link darauf.
    expect(ergebnis.businessSlug).toBe("caf-mller");
    expect(betriebe[0].primaryColor).toBe("#660c21");
  });

  it("die alte Adresse eines FREMDEN wird nicht übernommen", async () => {
    // Gleicher Name, anderer Wirt, Zeile noch unter der alten Adresse.
    betriebe = [
      {
        id: "biz-fremd",
        slug: legacyBusinessSlug("Café Müller"),
        name: "Café Müller",
        templateId: null,
        status: "PUBLISHED",
      },
    ];
    mitglieder = [{ userId: "user-anderer", businessId: "biz-fremd", role: "OWNER" }];

    const ergebnis = await ensureUserBusiness(ICH, "Café Müller");

    expect(betriebe).toHaveLength(2);
    expect(ergebnis.businessId).not.toBe("biz-fremd");
    // Der eigene bekommt die NEUE Adresse - die alte ist besetzt, aber eine
    // Kollision gibt es dort nicht, weil die Regeln verschieden aussehen.
    expect(ergebnis.businessSlug).toBe("cafe-mueller");
    // Und der fremde Betrieb behält seine Adresse und seinen einzigen Inhaber.
    expect(betriebe[0].slug).toBe("caf-mller");
    expect(mitglieder.filter((m) => m.businessId === "biz-fremd")).toHaveLength(1);
  });
});

// ===========================================================================
// 3. BEIDE WEGE, HINTEREINANDER - der Fall aus dem Befund
// ===========================================================================

describe("Erst POST /venues, dann veröffentlichen", () => {
  it("trifft denselben Betrieb, statt einen zweiten anzulegen", async () => {
    // Schritt 1: der Betrieb, wie ihn die venue-Route anlegt.
    const perVenueRoute = nextSubdomainCandidate(suggestSubdomain("Café Müller")!, 0);
    betriebe = [
      {
        id: "biz-venue",
        slug: perVenueRoute,
        name: "Café Müller",
        templateId: null,
        status: "DRAFT",
      },
    ];
    mitglieder = [{ userId: ICH, businessId: "biz-venue", role: "OWNER" }];

    // Schritt 2: derselbe Wirt veröffentlicht seine Web-App.
    const ergebnis = await ensureUserBusiness(ICH, "Café Müller", undefined, {
      primaryColor: "#123456",
    });

    expect(betriebe).toHaveLength(1);
    expect(mitglieder).toHaveLength(1);
    expect(ergebnis.businessId).toBe("biz-venue");
    expect(ergebnis.businessSlug).toBe("cafe-mueller");
  });
});

// ===========================================================================
// 4. AUSWEICHKANDIDATEN
// ===========================================================================

describe("Ausweichadresse bei fremdem Namensvetter", () => {
  it("nummeriert wie nextSubdomainCandidate", async () => {
    betriebe = [
      {
        id: "biz-fremd",
        slug: "zur-post",
        name: "Zur Post",
        templateId: null,
        status: "DRAFT",
      },
    ];
    mitglieder = [{ userId: "user-anderer", businessId: "biz-fremd", role: "OWNER" }];

    const ergebnis = await ensureUserBusiness(ICH, "Zur Post");

    expect(ergebnis.businessSlug).toBe("zur-post-2");
    expect(ergebnis.businessSlug).toBe(nextSubdomainCandidate("zur-post", 1));
  });

  it("bleibt auch bei einem sehr langen Namen innerhalb der Längengrenze", async () => {
    const lang = "Gasthaus " + "a".repeat(200);
    const adresse = generateBusinessSlug(lang);
    betriebe = [
      {
        id: "biz-fremd",
        slug: adresse,
        name: lang,
        templateId: null,
        status: "DRAFT",
      },
    ];
    mitglieder = [{ userId: "user-anderer", businessId: "biz-fremd", role: "OWNER" }];

    const ergebnis = await ensureUserBusiness(ICH, lang);

    // Von Hand zusammengesetzt (`${slug}-2`) wären es 65 Zeichen gewesen.
    expect(ergebnis.businessSlug.length).toBeLessThanOrEqual(63);
    expect(ergebnis.businessSlug).toMatch(/-2$/);
  });
});
