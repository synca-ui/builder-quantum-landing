// @vitest-environment node
/**
 * Profil eines Betriebs ändern (`PATCH /venues/:venueId` in `server/maitr/routes.ts`).
 *
 * ANLASS: Bis hierhin konnte ein Betrieb nur beim Anlegen (`POST /venues`) Namen,
 * Zeitzone und Öffnungszeiten bekommen - danach nie wieder. Jeder Tippfehler im
 * Namen oder eine geänderte Öffnungszeit blieb für immer stehen, es gab keine Route,
 * die das nachträglich korrigieren konnte.
 *
 * Diese Datei prüft die Eigenschaften, an denen der Bau steht oder fällt:
 *
 *  1. Der Inhaber ändert Name, Zeitzone und Öffnungszeiten - die Antwort hat
 *     dieselbe Form wie `GET /venues`.
 *  2. Eine Aushilfe (Rolle STAFF) bekommt 403 `nur_inhaber` - das ist der Riegel,
 *     um den es hier geht: `BusinessMember.role` hat den Vorgabewert STAFF.
 *  3. Ein Nutzer, der NICHT Mitglied ist, bekommt 403 - und der fremde Betrieb
 *     bleibt in der Datenbank unverändert.
 *  4. Der Slug ändert sich bei einer Namensänderung NICHT - er ist die
 *     veröffentlichte Adresse.
 *  5. Ein leeres Patch-Objekt wird abgewiesen (422), nicht als Erfolg gemeldet.
 *  6. Eine Öffnungszeit in falscher Form wird mit 422 abgewiesen und landet NICHT
 *     in der Datenbank.
 *  7. Widersprechende venueId in Pfad und Rumpf: 400.
 *
 * Die Datenbank wird nie angefasst - Prisma ist gemockt. Der Mock ist hier aber
 * kein Attrappen-Rückgabewert, sondern ein winziger Speicher: `business.update`
 * schreibt wirklich in ein Array, `businessMember.findUnique` liest wirklich aus
 * einem zweiten. Nur deshalb können die Speicher-Prüfungen unten ("bleibt
 * unverändert", "landet NICHT in der Datenbank") überhaupt etwas beweisen - gegen
 * einen Mock, der ohnehin nichts speichert, wäre das eine leere Behauptung.
 */
import { beforeEach, describe, expect, it, vi } from "vitest";
import express from "express";
import request from "supertest";
// Echt, nicht gemockt: `Prisma.DbNull` ist nur ein Sentinel-Objekt, kein
// Datenbankzugriff - genau das Muster aus `autoConfigurator.spec.ts`.
import { Prisma } from "@prisma/client";

const { prismaMock } = vi.hoisted(() => ({
  prismaMock: {
    // findUnique bedient GET /venues/:slug/public (publicRouter) - der Lesepfad
    // ohne Anmeldung, der `geprüfteOeffnungszeiten` denselben Filter abverlangt
    // wie GET /venues.
    business: { update: vi.fn(), findUnique: vi.fn() },
    businessMember: { findUnique: vi.fn(), findMany: vi.fn() },
  },
}));

vi.mock("../db/prisma", () => ({ default: prismaMock, prisma: prismaMock }));

import { publicRouter, venuesRouter } from "../maitr/routes";
import { maitrErrorHandler } from "../maitr/index";

/** Der Inhaber von "biz-1". */
const ICH = "user-wirt";
/** Eine Aushilfe bei "biz-1" - Rolle STAFF, die Vorgabe des Modells. */
const MITARBEITER = "user-personal";
/** Inhaber von "biz-fremd", mit ICH und MITARBEITER nicht verwandt. */
const NACHBAR = "user-nachbar";
/** Nirgendwo Mitglied. */
const FREMD = "user-fremd";

interface BetriebZeile {
  id: string;
  slug: string;
  name: string;
  tagline: string | null;
  timezone: string;
  tags: string[];
  /** Wie die echte Spalte: `Json?`. */
  openingHours: unknown;
}
interface MitgliedZeile {
  userId: string;
  businessId: string;
  role: string;
}

/** Der "Datenbestand". Wird pro Test frisch aufgesetzt. */
let betriebe: BetriebZeile[];
let mitglieder: MitgliedZeile[];
/** Zählt jeden Aufruf von `business.update` - auch fehlgeschlagene Versuche gäbe es hier nicht, weil der Mock nicht wirft. */
let schreibversuche: number;
/**
 * Das `data`-Objekt des LETZTEN `business.update`-Aufrufs, VOR der Übersetzung
 * in den Speicher (siehe `betriebe[idx]` unten). Nötig für den Löschpfad von
 * `openingHours`: Die Speicher-Übersetzung setzt `Prisma.DbNull` selbst auf
 * `null` um (wie die echte Spalte es täte) - ein Test, der nur `betriebe[0]`
 * prüft, sähe `null` unabhängig davon, ob die Route `Prisma.DbNull` oder ein
 * blosses `null` geschickt hat. Nur das rohe `data`-Objekt unterscheidet die
 * beiden Fälle über Referenzgleichheit (`toBe(Prisma.DbNull)`).
 */
let letzteSchreibDaten: Record<string, unknown> | undefined;

/** Ein frischer "Café Müller"-Betrieb mit Inhaber, Aushilfe und einem fremden Nachbarbetrieb. */
function anfangszustand(): { betriebe: BetriebZeile[]; mitglieder: MitgliedZeile[] } {
  return {
    betriebe: [
      {
        id: "biz-1",
        slug: "cafe-mueller",
        name: "Café Müller",
        tagline: null,
        timezone: "Europe/Berlin",
        tags: [],
        openingHours: null,
      },
      {
        id: "biz-fremd",
        slug: "gasthof-nachbar",
        name: "Gasthof Nachbar",
        tagline: null,
        timezone: "Europe/Berlin",
        tags: [],
        openingHours: null,
      },
    ],
    mitglieder: [
      { userId: ICH, businessId: "biz-1", role: "OWNER" },
      { userId: MITARBEITER, businessId: "biz-1", role: "STAFF" },
      { userId: NACHBAR, businessId: "biz-fremd", role: "OWNER" },
    ],
  };
}

/**
 * Mini-App wie in `maitrVenueCreate.spec.ts`: angemeldet, ohne echtes Clerk-Token.
 * Das Limit spiegelt `server/index.ts` (`express.json({ limit: "5mb" })`) - der
 * Standard von express.json (100kb) würde den 509-KB-Payload-Test unten schon am
 * Parser abweisen, bevor `StrictOpeningHoursSchema` überhaupt zum Zug kommt, und
 * der Test bewiese dann das falsche Ding.
 */
function appAls(userId: string) {
  const app = express();
  app.use(express.json({ limit: "5mb" }));
  app.use((req, _res, next) => {
    (req as express.Request & { userId?: string }).userId = userId;
    next();
  });
  app.use("/venues", venuesRouter);
  // Wie in server/maitr/index.ts: die Fehler-Middleware ganz zum Schluss.
  app.use(maitrErrorHandler);
  return app;
}

/**
 * Mini-App für den UNANGEMELDETEN Pfad: `publicRouter` hängt in
 * `server/maitr/index.ts` an der Wurzel des Maitr-Routers, VOR `requireAuth`
 * (`maitrRouter.use(publicRouter)`, dann erst `maitrRouter.use(requireAuth)`).
 * Kein Auth-Mittelstück hier - genau das ist der Punkt: `GET /venues/:slug/public`
 * muss auch ohne jede Anmeldung funktionieren und darf an einer kaputten
 * `openingHours`-Altzeile nicht scheitern.
 */
function appOeffentlich() {
  const app = express();
  app.use(express.json());
  app.use(publicRouter);
  app.use(maitrErrorHandler);
  return app;
}

beforeEach(() => {
  vi.clearAllMocks();
  ({ betriebe, mitglieder } = anfangszustand());
  schreibversuche = 0;
  letzteSchreibDaten = undefined;

  // Spiegelt `requireVenueAccess`: sucht den zusammengesetzten Schlüssel
  // `(userId, businessId)` und liefert NUR die Rolle - wie die echte Abfrage
  // (`select: { role: true }`).
  prismaMock.businessMember.findUnique.mockImplementation(
    async ({ where }: { where: { userId_businessId: { userId: string; businessId: string } } }) => {
      const { userId, businessId } = where.userId_businessId;
      const m = mitglieder.find((x) => x.userId === userId && x.businessId === businessId);
      return m ? { role: m.role } : null;
    },
  );

  // GET /venues liest denselben Speicher - so vergleicht Test 1 die Vertragsform
  // gegen eine ECHTE zweite Route und nicht gegen eine ausgedachte Erwartung.
  prismaMock.businessMember.findMany.mockImplementation(
    async ({ where }: { where: { userId: string } }) =>
      mitglieder
        .filter((m) => m.userId === where.userId)
        .map((m) => ({ ...m, business: betriebe.find((b) => b.id === m.businessId)! })),
  );

  // Spiegelt `prisma.business.update({ where: { id }, data })`: schreibt wirklich
  // in die Zeile, statt einen Rückgabewert vorzutäuschen. `Prisma.DbNull` wird wie
  // in der echten Spalte zu SQL NULL - dasselbe Muster wie in
  // `server/routes/scraper.ts` beim Neustart eines Scraper-Jobs.
  prismaMock.business.update.mockImplementation(
    async ({ where, data }: { where: { id: string }; data: Record<string, unknown> }) => {
      schreibversuche++;
      // VOR der Übersetzung festhalten - siehe Kommentar an der Deklaration oben.
      letzteSchreibDaten = data;
      const idx = betriebe.findIndex((b) => b.id === where.id);
      if (idx === -1) throw new Error(`Unbekannter Betrieb: ${where.id}`);
      const vorher = betriebe[idx];
      const nachher: BetriebZeile = { ...vorher };
      for (const [feld, wert] of Object.entries(data)) {
        (nachher as unknown as Record<string, unknown>)[feld] =
          wert === Prisma.DbNull ? null : wert;
      }
      betriebe[idx] = nachher;
      return nachher;
    },
  );

  // Spiegelt `prisma.business.findUnique({ where: { slug } })` - der Lesezugriff
  // von `GET /venues/:slug/public`. Liest denselben Speicher wie oben, damit ein
  // Test, der eine kaputte `openingHours`-Altzeile über `betriebe[0].openingHours`
  // einschleust, sie an BEIDEN Lesewegen sieht (siehe `geprüfteOeffnungszeiten`).
  prismaMock.business.findUnique.mockImplementation(
    async ({ where }: { where: { slug: string } }) =>
      betriebe.find((b) => b.slug === where.slug) ?? null,
  );
});

describe("PATCH /venues/:venueId - Profil ändern", () => {
  it("Inhaber ändert Name, Zeitzone und Öffnungszeiten - Antwort hat dieselbe Form wie GET /venues", async () => {
    const app = appAls(ICH);
    const res = await request(app)
      .patch("/venues/biz-1")
      .send({
        name: "Café Neu",
        timezone: "Europe/Vienna",
        openingHours: { monday: { open: "09:00", close: "17:00", closed: false } },
      });

    expect(res.status, JSON.stringify(res.body)).toBe(200);
    expect(res.body).toEqual({
      id: "biz-1",
      name: "Café Neu",
      timezone: "Europe/Vienna",
      tags: [],
      openingHours: { monday: { open: "09:00", close: "17:00", closed: false } },
    });

    // Dieselbe Form wie GET /venues - nicht behauptet, sondern verglichen: eine
    // zweite, unabhängige Route liest denselben Speicher und liefert exakt das,
    // was PATCH gerade zurückgegeben hat.
    const liste = await request(app).get("/venues");
    expect(liste.body).toEqual([res.body]);

    // Und im Speicher steht wirklich die Änderung, nicht nur in der Antwort.
    expect(betriebe[0]).toMatchObject({
      name: "Café Neu",
      timezone: "Europe/Vienna",
      openingHours: { monday: { open: "09:00", close: "17:00", closed: false } },
    });
  });

  it("Aushilfe (Rolle STAFF) bekommt 403 nur_inhaber", async () => {
    const res = await request(appAls(MITARBEITER))
      .patch("/venues/biz-1")
      .send({ name: "Sollte nicht durchgehen" });

    expect(res.status, JSON.stringify(res.body)).toBe(403);
    expect(res.body).toEqual({ error: "nur_inhaber" });
    expect(schreibversuche).toBe(0);
    expect(betriebe[0].name).toBe("Café Müller");
  });

  it("Nicht-Mitglied bekommt 403 - der fremde Betrieb bleibt unverändert", async () => {
    const vorher = { ...betriebe.find((b) => b.id === "biz-fremd")! };

    const res = await request(appAls(FREMD))
      .patch("/venues/biz-fremd")
      .send({ name: "Übernommen" });

    // Die Meldung unterscheidet sich ausdrücklich von "nur_inhaber" oben: FREMD
    // fällt schon an der Mitgliedschaftsprüfung (venueGuard), nicht erst an der
    // Rollenprüfung (ownerGuard). Ein Test, der nur auf 403 prüft, könnte grün
    // bleiben, obwohl der falsche Riegel zugeschlagen hat.
    expect(res.status, JSON.stringify(res.body)).toBe(403);
    expect(res.body).toEqual({ error: "Kein Zugriff auf diesen Betrieb" });

    expect(schreibversuche).toBe(0);
    expect(betriebe.find((b) => b.id === "biz-fremd")).toEqual(vorher);
  });

  it("der Slug ändert sich bei einer Namensänderung NICHT", async () => {
    const res = await request(appAls(ICH))
      .patch("/venues/biz-1")
      .send({ name: "Ganz anderer Name" });

    expect(res.status, JSON.stringify(res.body)).toBe(200);
    expect(betriebe[0].slug).toBe("cafe-mueller");
    // Der Slug ist auch nicht Teil der Vertragsform - GET /venues gibt ihn nie preis.
    expect(res.body).not.toHaveProperty("slug");
  });

  it("ein leeres Patch-Objekt wird abgewiesen (422)", async () => {
    const res = await request(appAls(ICH)).patch("/venues/biz-1").send({});

    expect(res.status, JSON.stringify(res.body)).toBe(422);
    expect(schreibversuche).toBe(0);
    expect(betriebe[0].name).toBe("Café Müller");
  });

  it("eine Öffnungszeit in falscher Form wird abgewiesen (422) und landet NICHT in der Datenbank", async () => {
    const res = await request(appAls(ICH))
      .patch("/venues/biz-1")
      .send({ openingHours: { monday: { open: "8 Uhr", close: "18:00", closed: false } } });

    expect(res.status, JSON.stringify(res.body)).toBe(422);
    expect(schreibversuche).toBe(0);
    expect(betriebe[0].openingHours).toBeNull();
  });

  it("widersprechende venueId in Pfad und Rumpf: 400", async () => {
    const res = await request(appAls(ICH))
      .patch("/venues/biz-1")
      .send({ venueId: "biz-fremd", name: "Sollte nicht durchgehen" });

    expect(res.status, JSON.stringify(res.body)).toBe(400);
    expect(schreibversuche).toBe(0);
    expect(betriebe[0].name).toBe("Café Müller");
    // Auch der ANDERE genannte Betrieb bleibt unangetastet - ein Konflikt darf
    // nicht heimlich zugunsten einer der beiden Seiten aufgelöst werden.
    expect(betriebe.find((b) => b.id === "biz-fremd")!.name).toBe("Gasthof Nachbar");
  });
});

/**
 * Die beiden Löschpfade in `PATCH /venues/:venueId` - jeder mit einer eigenen
 * Codezeile und einer langen Begründung im Handler (siehe dort), aber bis hierhin
 * ohne Test. Ein leeres Patch (siehe oben) prüft NICHT dasselbe: Dort fehlt das
 * Feld ganz, hier wird es ausdrücklich auf "leer" gesetzt.
 */
describe("PATCH /venues/:venueId - die beiden Löschpfade", () => {
  it("tagline: \"\" wird zu echtem null, nicht zu einem leeren String", async () => {
    const app = appAls(ICH);
    // Erst wirklich etwas hinterlegen - sonst bewiese "danach ist sie weg" nichts.
    const gesetzt = await request(app)
      .patch("/venues/biz-1")
      .send({ tagline: "Bester Kaffee der Stadt" });
    expect(gesetzt.status, JSON.stringify(gesetzt.body)).toBe(200);
    expect(betriebe[0].tagline).toBe("Bester Kaffee der Stadt");

    const res = await request(app).patch("/venues/biz-1").send({ tagline: "" });

    expect(res.status, JSON.stringify(res.body)).toBe(200);
    // toApiVenue bildet `tagline: b.tagline ?? undefined` ab - ein blosser leerer
    // String ist NICHT nullish und tauchte hier weiterhin auf. Nur echtes `null`
    // verschwindet aus der JSON-Antwort.
    expect(res.body).not.toHaveProperty("tagline");
    expect(betriebe[0].tagline).toBeNull();
  });

  it("openingHours: null löscht die Spalte per Prisma.DbNull, nicht per blossem JS-null", async () => {
    const app = appAls(ICH);
    // Erst wirklich etwas hinterlegen - sonst bewiese "danach ist es weg" nichts.
    const gesetzt = await request(app)
      .patch("/venues/biz-1")
      .send({ openingHours: { monday: { open: "09:00", close: "17:00", closed: false } } });
    expect(gesetzt.status, JSON.stringify(gesetzt.body)).toBe(200);
    expect(betriebe[0].openingHours).not.toBeNull();

    const res = await request(app).patch("/venues/biz-1").send({ openingHours: null });

    expect(res.status, JSON.stringify(res.body)).toBe(200);
    // Das Sentinel selbst muss den Schreibzugriff erreichen - ein blosses `null`
    // wäre in der Json-Spalte das JSON-Literal "null" statt SQL NULL, und
    // server/routes/admin.ts (`!!business.openingHours`) meldete weiterhin
    // "gesetzt". `letzteSchreibDaten` liest das `data`-Objekt VOR der
    // Speicher-Übersetzung (die `Prisma.DbNull` selbst wieder auf `null` abbildet,
    // wie die echte Spalte es täte) - nur dort ist der Unterschied noch sichtbar.
    expect(letzteSchreibDaten?.openingHours).toBe(Prisma.DbNull);
    expect(betriebe[0].openingHours).toBeNull();
    expect(res.body).not.toHaveProperty("openingHours");
  });
});

/**
 * `geprüfteOeffnungszeiten` im LESEPFAD (`toApiVenue`, benutzt von GET /venues UND
 * dem unangemeldeten GET /venues/:slug/public). Business.openingHours kann
 * Altbestand von VOR `StrictOpeningHoursSchema` enthalten - Zeilen, die nie durch
 * die neue Schranke am Schreibpfad liefen. Beide Lesewege dürfen daran weder
 * scheitern noch die kaputte Form durchreichen.
 */
describe("Lesepfad: kaputte openingHours-Altzeilen dürfen keinen Client erreichen", () => {
  it.each([
    ["fremde Tagesschlüssel/Kurzform (deutsch)", { Mo: "9-17" } as unknown],
    ["Freitext statt Objekt", "Mo-Fr 9-17 Uhr" as unknown],
    ["Zahl statt Objekt", 42 as unknown],
    ["leeres Array statt Objekt", [] as unknown],
    // Die vier Fälle darüber kippen schon an der WERTFORM - ein String, eine Zahl,
    // ein Array. Sie belegen deshalb NICHT, dass der Lesepfad die Tagesschlüssel
    // prüft: Tauscht man dort die enge Form gegen die lose, bleiben sie alle grün,
    // und `{Montag: {open: "99:99", …}}` tritt anschliessend über die unangemeldete
    // Route nach draussen. Genau diese Lücke schliessen die beiden Fälle hier -
    // formgültiger Wert, unzulässiger Schlüssel.
    [
      "deutscher Tagesschlüssel bei gültiger Wertform",
      { Montag: { open: "09:00", close: "17:00", closed: false } } as unknown,
    ],
    [
      "unmögliche Uhrzeit bei gültigem Tagesschlüssel",
      { monday: { open: "99:99", close: "88:88", closed: false } } as unknown,
    ],
  ])("GET /venues gibt bei Altbestand (%s) kein kaputtes openingHours weiter", async (_label, kaputterWert) => {
    betriebe[0].openingHours = kaputterWert;

    const res = await request(appAls(ICH)).get("/venues");

    expect(res.status, JSON.stringify(res.body)).toBe(200);
    const venue = (res.body as Array<{ id: string }>).find((v) => v.id === "biz-1");
    expect(venue).not.toHaveProperty("openingHours");
  });

  it("GET /venues/:slug/public (UNANGEMELDET) gibt bei Altbestand kein kaputtes openingHours weiter und stürzt nicht ab", async () => {
    betriebe[0].openingHours = { Mo: "9-17" };

    const res = await request(appOeffentlich()).get("/venues/cafe-mueller/public");

    expect(res.status, JSON.stringify(res.body)).toBe(200);
    expect(res.body).not.toHaveProperty("openingHours");
    // Der Rest des öffentlichen Profils bleibt unberührt - die Altzeile darf nur
    // das kaputte Feld kosten, nicht die ganze Antwort.
    expect(res.body).toMatchObject({ id: "biz-1", name: "Café Müller" });
  });

  it("GET /venues/:slug/public (UNANGEMELDET) liefert auch bei formgültigem Wert mit fremdem Tagesschlüssel nichts aus", async () => {
    // Der Weg, der ohne Anmeldung erreichbar ist, ist der, auf den es ankommt. Der
    // Test daneben prüft eine kaputte WERTFORM und bliebe auch dann grün, wenn im
    // Lesepfad die lose Form stünde - dieser hier nicht.
    betriebe[0].openingHours = { Montag: { open: "09:00", close: "17:00", closed: false } };

    const res = await request(appOeffentlich()).get("/venues/cafe-mueller/public");

    expect(res.status, JSON.stringify(res.body)).toBe(200);
    expect(res.body).not.toHaveProperty("openingHours");
  });
});

/**
 * `StrictOpeningHoursSchema` (server/schemas/configuration.ts) hinter
 * `PATCH /venues/:venueId` - die neue Enge braucht eigene Belege, nicht nur die
 * vorhandene "falsche Form"-Probe oben (die greift schon an der alten,
 * losen Ziffernform-Regex). Jeder Fall hier muss 422 UND `schreibversuche === 0`
 * zeigen: der Statuscode allein bewiese nicht, dass kein Schreibversuch
 * stattfand.
 */
describe("PATCH /venues/:venueId - StrictOpeningHoursSchema weist die neue Enge tatsächlich ab", () => {
  it.each([
    ["fremder Tagesschlüssel (deutsch)", { Montag: { open: "09:00", close: "17:00", closed: false } }],
    ["fremder Tagesschlüssel (Leerzeichen im englischen Namen)", { "friday ": { open: "09:00", close: "17:00", closed: false } }],
    ["unmögliche Uhrzeit", { monday: { open: "99:99", close: "17:00", closed: false } }],
    ["Stunde jenseits von 23", { monday: { open: "24:00", close: "17:00", closed: false } }],
    ["geöffneter Tag ohne Uhrzeiten", { monday: { closed: false } }],
  ])("%s wird mit 422 abgewiesen, ohne Schreibversuch", async (_label, openingHours) => {
    const res = await request(appAls(ICH)).patch("/venues/biz-1").send({ openingHours });

    expect(res.status, JSON.stringify(res.body)).toBe(422);
    expect(schreibversuche).toBe(0);
    expect(betriebe[0].openingHours).toBeNull();
  });

  it("sehr viele, sehr lange Tagesschlüssel (2000 × 200 Zeichen) werden mit 422 abgewiesen, ohne Schreibversuch", async () => {
    // Dieselbe Grössenordnung wie im Befund gemessen: 2000 Schlüssel à 200
    // Zeichen, 509 023 Byte in der Zeile - ohne die Allowlist nahm die Route das
    // an und lieferte es öffentlich, unangemeldet, wieder aus.
    const openingHours: Record<string, unknown> = {};
    for (let i = 0; i < 2000; i++) {
      openingHours[`${"x".repeat(200)}${i}`] = { open: "09:00", close: "17:00", closed: false };
    }

    const res = await request(appAls(ICH)).patch("/venues/biz-1").send({ openingHours });

    expect(res.status, JSON.stringify(res.body)).toBe(422);
    expect(schreibversuche).toBe(0);
    expect(betriebe[0].openingHours).toBeNull();
  });
});

/**
 * Die Gegenrichtung - und zwar die wichtigere.
 *
 * ANLASS: Die erste Fassung der engen Form verlangte `open < close` und machte damit
 * jede Öffnung über Mitternacht unmöglich: `Fr 18:00 bis 01:00` bekam 422. Das ist
 * keine gängige Ausnahme, das ist die Regel für jede Bar und jede Küche mit
 * Sperrstunde - die Schranke hätte genau die Betriebe ausgesperrt, für die
 * Öffnungszeiten überhaupt eine Rolle spielen. Sie ist deshalb ersatzlos gefallen:
 * `20:00 bis 02:00` ist von einem Zahlendreher nicht unterscheidbar, und eine Regel,
 * die echte Wirte abweist, richtet mehr Schaden an als die Tippfehler, die sie fängt.
 *
 * Ebenso verlangte sie `open` und `close` auch bei `closed: true` - für „sonntags
 * geschlossen" mussten also zwei Uhrzeiten ERFUNDEN werden. Seit der Tageseintrag
 * eine unterscheidende Union ist, ist das nicht mehr nötig und nicht mehr möglich.
 *
 * Ohne diesen Block stünde nur die Ablehnung unter Beobachtung. Eine Schranke, die
 * alles abweist, bestünde jeden Test da oben.
 */
describe("PATCH /venues/:venueId - was ein echter Betrieb eintragen können muss", () => {
  it.each([
    ["Bar über Mitternacht", { friday: { open: "18:00", close: "01:00", closed: false } }],
    ["24-Stunden-Betrieb", { monday: { open: "00:00", close: "00:00", closed: false } }],
    ["Ruhetag ohne erfundene Uhrzeiten", { sunday: { closed: true } }],
    [
      "Ruhetag neben einem Öffnungstag",
      { monday: { open: "09:00", close: "17:00", closed: false }, sunday: { closed: true } },
    ],
  ])("%s wird angenommen und steht danach in der Zeile", async (_label, openingHours) => {
    const res = await request(appAls(ICH)).patch("/venues/biz-1").send({ openingHours });

    expect(res.status, JSON.stringify(res.body)).toBe(200);
    expect(res.body.openingHours).toEqual(openingHours);
    expect(betriebe[0].openingHours).toEqual(openingHours);
  });

  it("ein geschlossener Tag MIT Uhrzeiten wird beim Lesen auf die saubere Form zurückgeschnitten", async () => {
    // Altbestand aus der Zeit, als `open`/`close` auch bei `closed: true` Pflicht
    // waren. Verwerfen wäre hier die falsche Antwort: die Aussage „sonntags
    // geschlossen" IST eindeutig, nur die beiden Uhrzeiten daneben sind bedeutungslos.
    // Der Wirt verlöre sonst einen Tag, den er richtig eingetragen hatte.
    betriebe[0].openingHours = { sunday: { closed: true, open: "00:00", close: "00:00" } };

    const res = await request(appAls(ICH)).get("/venues");

    expect(res.status, JSON.stringify(res.body)).toBe(200);
    const venue = (res.body as Array<{ id: string; openingHours?: unknown }>).find(
      (v) => v.id === "biz-1",
    );
    expect(venue?.openingHours).toEqual({ sunday: { closed: true } });
  });
});
