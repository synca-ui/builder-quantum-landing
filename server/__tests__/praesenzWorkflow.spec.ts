// @vitest-environment node
/**
 * Der Präsenz-Workflow (server/maitr/praesenz/index.ts): Betrieb laden → Google
 * Places → Website bestimmen und prüfen → Snapshot speichern → Briefing-Cache
 * verwerfen → Bericht rechnen.
 *
 * Worum es geht, in der Reihenfolge des Schadens:
 *
 *  - GELD. Places ist bezahlt (rund 4 Cent je Suche plus Fotos). Die Drossel und
 *    der Single-Flight entscheiden, ob ein Doppeltipp in der App oder ein
 *    Zeitgeber-Tick eine Rechnung auslöst. Deshalb zählen die Tests hier
 *    Places-Aufrufe, nicht nur Ergebnisse.
 *  - WAHRHEIT. Ein gescheiterter Abruf darf einen richtigen Google-Eintrag nicht
 *    löschen, und die geprüfte Website muss die des Betriebs sein - nicht die
 *    eines anderen Testbetriebs desselben Kontos.
 *  - BETRIEB. Der Code landet vor der Migration auf Railway. Ohne lesbare Tabelle
 *    muss die Route trotzdem einen Bericht liefern - aber OHNE bezahlten Abruf,
 *    denn ohne gespeicherten Stand griffe keine Drossel.
 *
 * Kein Netz, keine Datenbank: `fetch`, Website-Prüfung, Uhr und Schlüssel kommen
 * über `PraesenzUmgebung` herein, Prisma ist gemockt. Der Mock von
 * `presenceSnapshot` und `business.findMany` verhält sich wie eine Tabelle (liest,
 * was geschrieben wurde, wertet den Filter aus) - sonst prüfte der Test nur die
 * Form des Aufrufs, nicht die Wirkung.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { FetchLike } from "@maitr/core/integrations";
// Echt, nicht gemockt: `Prisma.DbNull` ist nur ein Sentinel-Objekt, kein
// Datenbankzugriff - wie in maitrVenueUpdate.spec.ts.
import { Prisma } from "@prisma/client";
import type { GoogleEintrag, WebsitePruefung } from "@maitr/core/analytics";

const { prismaMock } = vi.hoisted(() => ({
  prismaMock: {
    business: { findUniqueOrThrow: vi.fn(), findMany: vi.fn() },
    menuItem: { count: vi.fn() },
    businessMember: { findMany: vi.fn() },
    scraperJob: { findMany: vi.fn() },
    presenceSnapshot: { findUnique: vi.fn(), upsert: vi.fn() },
    insightsCache: { deleteMany: vi.fn() },
  },
}));

vi.mock("../db/prisma", () => ({ default: prismaMock, prisma: prismaMock }));

import {
  DROSSEL_MS,
  GOOGLE_HOECHSTALTER_MS,
  HINWEIS_ORTSANGABE_FEHLT,
  HINWEIS_SPEICHER_FEHLT,
  VERALTET_MS,
  WEBSITE_KULANZ_MS,
  aktualisierePraesenz,
  aktualisiereVeraltetePraesenz,
  ladePraesenz,
  logGrund,
  maitrProfilAus,
  istMaitrAdresse,
  placesSucheAus,
  prozessDrosselLeeren,
  websiteFuerPruefung,
  type PraesenzUmgebung,
} from "../maitr/praesenz";
import type { RohPlace } from "../maitr/praesenz/places";

/* ── Testdaten ──────────────────────────────────────────────────────────── */

const JETZT = new Date("2026-09-15T10:00:00Z");
const MINUTE = 60_000;
const SCHLUESSEL = "AIzaSy-TEST-SCHLUESSEL";
const TOELLER_ID = "biz-toeller";
const WIRT = "user-wirt";

/** Eine Business-Zeile, wie `ladeBetrieb` sie per select liest. */
interface Zeile {
  id: string;
  name: string;
  description: string | null;
  tags: string[];
  openingHours: unknown;
  socialLinks: unknown;
  contactInfo: unknown;
  postalCode: string | null;
  latitude: number | null;
  longitude: number | null;
}

const TOELLER: Zeile = {
  id: TOELLER_ID,
  name: "Haus Töller",
  description: "Kölsch vom Holzfass.",
  tags: [],
  openingHours: { monday: { closed: false, open: "17:00", close: "23:59" }, sunday: { closed: true } },
  socialLinks: { instagram: "https://www.instagram.com/haustoeller/" },
  contactInfo: {
    address: "Weyerstraße 96, 50676 Köln",
    phone: "0221 2589316",
    // Die veröffentlichte Maitr-Web-App - der letzte Rückfall der Website-Prüfung.
    website: "https://haus-toeller.maitr.de",
  },
  postalCode: "50676",
  latitude: 50.9311,
  longitude: 6.9446,
};

/** Was Places zu "Haus Töller, Weyerstraße 96, 50676 Köln" liefert. */
const TOELLER_PLACE: RohPlace = {
  id: "ChIJ-toeller",
  displayName: { text: "Haus Töller" },
  formattedAddress: "Weyerstraße 96, 50676 Köln, Deutschland",
  location: { latitude: 50.9313, longitude: 6.9441 },
  rating: 4.6,
  userRatingCount: 812,
  websiteUri: "https://www.haus-toeller.de/",
  googleMapsUri: "https://maps.google.com/?cid=123",
  nationalPhoneNumber: "0221 2589316",
  businessStatus: "OPERATIONAL",
  reviews: [
    {
      name: "places/ChIJ-toeller/reviews/1",
      rating: 5,
      text: { text: "Bestes Kölsch der Stadt." },
      authorAttribution: { displayName: "Anna K." },
      publishTime: "2026-09-10T20:00:00Z",
    },
  ],
};

/** Ein früher gespeicherter Google-Eintrag (anderer Schnitt als die frische Antwort). */
const ALTER_EINTRAG: GoogleEintrag = {
  placeId: "ChIJ-toeller",
  name: "Haus Töller",
  rating: 4.5,
  reviewCount: 790,
  bewertungen: [],
  fotos: [],
  fotoAnzahl: 0,
  website: "https://www.haus-toeller.de/",
  status: "OPERATIONAL",
};

function erreichbar(url: string): WebsitePruefung {
  return {
    url,
    erreichbar: true,
    https: url.startsWith("https:"),
    mobilTauglich: true,
    strukturierteDaten: true,
    speisekarteVerlinkt: true,
    oeffnungszeitenGefunden: true,
    adresseGefunden: true,
  };
}

/* ── Tabellen-Mocks ─────────────────────────────────────────────────────── */

let betriebe: Map<string, Zeile>;
let mitglieder: Map<string, string[]>;
let jobs: Array<{ userId: string; websiteUrl: string; businessName: string | null }>;
let gerichte: Map<string, number>;
let snapshots: Map<string, Record<string, any>>;

function snapshot(
  venueId: string,
  zeile: { status: string; google?: unknown; website?: unknown; fetchedAt: Date; fehler?: string | null; placeId?: string | null },
) {
  snapshots.set(venueId, { businessId: venueId, fehler: null, google: null, website: null, ...zeile });
}

/**
 * Übersetzt die Schreibdaten wie die Json?-Spalten `google` und `website`: `Prisma.DbNull` wird
 * SQL NULL (liest sich als `null`), ein blosses `null` lehnt Prisma ab - mit
 * derselben Meldungsform wie die echte Validierung. Ohne diese Übersetzung
 * nahm der Mock jedes `null` an, und der Upsert, der in Prod bei jedem Lauf ohne
 * Google-Eintrag scheiterte, sah hier grün aus.
 */
function alsSpalten(zeile: Record<string, any>): Record<string, any> {
  const aus = { ...zeile };
  for (const spalte of ["google", "website"]) {
    if (aus[spalte] === null) {
      throw new Error(
        "Invalid `prisma.presenceSnapshot.upsert()` invocation:\n\nArgument `" +
          spalte +
          "` must not be null. Please use undefined, or use Prisma.DbNull or Prisma.JsonNull.",
      );
    }
    if (aus[spalte] === Prisma.DbNull) aus[spalte] = null;
  }
  return aus;
}

let warn: ReturnType<typeof vi.spyOn>;

beforeEach(() => {
  vi.clearAllMocks();
  warn = vi.spyOn(console, "warn").mockImplementation(() => {});
  // Die prozesslokale Drossel lebt im Modul - ohne Leeren drosselte ein Lauf aus
  // dem vorigen Test (gleiche Uhrzeit JETZT) den nächsten.
  prozessDrosselLeeren();

  betriebe = new Map([[TOELLER_ID, structuredClone(TOELLER)]]);
  mitglieder = new Map([[TOELLER_ID, [WIRT]]]);
  jobs = [];
  gerichte = new Map();
  snapshots = new Map();

  prismaMock.business.findUniqueOrThrow.mockImplementation(async ({ where }: { where: { id: string } }) => {
    const zeile = betriebe.get(where.id);
    if (!zeile) throw new Error(`No Business found (${where.id})`);
    return zeile;
  });
  prismaMock.menuItem.count.mockImplementation(
    async ({ where }: { where: { category: { businessId: string } } }) => gerichte.get(where.category.businessId) ?? 0,
  );
  prismaMock.businessMember.findMany.mockImplementation(async ({ where }: { where: { businessId: string } }) =>
    (mitglieder.get(where.businessId) ?? []).map((userId) => ({ userId })),
  );
  prismaMock.scraperJob.findMany.mockImplementation(async ({ where }: { where: { userId: { in: string[] } } }) =>
    jobs
      .filter((j) => where.userId.in.includes(j.userId))
      .map(({ websiteUrl, businessName }) => ({ websiteUrl, businessName })),
  );
  prismaMock.presenceSnapshot.findUnique.mockImplementation(
    async ({ where }: { where: { businessId: string } }) => snapshots.get(where.businessId) ?? null,
  );
  prismaMock.presenceSnapshot.upsert.mockImplementation(
    async ({ where, create, update }: { where: { businessId: string }; create: any; update: any }) => {
      const vorhanden = snapshots.get(where.businessId);
      const neu = vorhanden ? { ...vorhanden, ...alsSpalten(update) } : alsSpalten(create);
      snapshots.set(where.businessId, neu);
      return neu;
    },
  );
  prismaMock.insightsCache.deleteMany.mockResolvedValue({ count: 1 });
});

afterEach(() => {
  warn.mockRestore();
});

/* ── Test-Umgebung ──────────────────────────────────────────────────────── */

type PlacesAntwort = { places: RohPlace[] } | { http: number; body: unknown };

function testUmgebung(
  o: {
    schluessel?: string | null;
    jetzt?: Date;
    antwort?: PlacesAntwort;
    /** Hält die Places-Antwort zurück, bis das Tor aufgeht (Single-Flight). */
    tor?: Promise<void>;
  } = {},
) {
  const suchen: Array<{ textQuery: string }> = [];
  const fetch = vi.fn<FetchLike>(async (url, init) => {
    if (url.endsWith("/places:searchText")) {
      suchen.push(JSON.parse(init?.body ?? "{}"));
      if (o.tor) await o.tor;
      const a = o.antwort ?? { places: [TOELLER_PLACE] };
      if ("http" in a) return { ok: false, status: a.http, json: async () => a.body };
      return { ok: true, status: 200, json: async () => ({ places: a.places }) };
    }
    throw new Error(`Unerwartete Adresse im Test: ${url}`);
  });
  const pruefeWebsite = vi.fn(async (url: string) => erreichbar(url));
  const umgebung: PraesenzUmgebung = {
    fetch,
    pruefeWebsite,
    jetzt: () => o.jetzt ?? JETZT,
    schluessel: () => (o.schluessel === undefined ? SCHLUESSEL : o.schluessel),
  };
  return { umgebung, fetch, pruefeWebsite, suchen };
}

/* ── (a) Ohne Schlüssel ─────────────────────────────────────────────────── */

describe("aktualisierePraesenz ohne Places-Schlüssel", () => {
  it("ruft Places nicht auf, prüft aber die Website, speichert und verwirft den Briefing-Cache", async () => {
    // Eine eigene Seite in socialLinks - die Web-App in contactInfo prüft niemand (siehe unten).
    betriebe.set(TOELLER_ID, { ...structuredClone(TOELLER), socialLinks: { website: "https://www.haus-toeller.de/" } });
    const { umgebung, fetch, pruefeWebsite } = testUmgebung({ schluessel: null });

    const ergebnis = await aktualisierePraesenz(TOELLER_ID, {}, umgebung);

    expect(fetch).not.toHaveBeenCalled();
    expect(ergebnis.status).toBe("kein_schluessel");
    expect(ergebnis.hinweis).toMatch(/Google-Zugang/);
    expect(ergebnis).not.toHaveProperty("google");

    // Ohne Google-Eintrag und ohne Analyse-Job: die Seite aus socialLinks.
    expect(pruefeWebsite).toHaveBeenCalledTimes(1);
    expect(pruefeWebsite).toHaveBeenCalledWith("https://www.haus-toeller.de/");
    expect(ergebnis.website).toEqual(erreichbar("https://www.haus-toeller.de/"));

    expect(snapshots.get(TOELLER_ID)).toMatchObject({
      businessId: TOELLER_ID,
      placeId: null,
      status: "kein_schluessel",
      fehler: null,
      google: null,
      // Mit Prüfzeitpunkt - er trägt die Kulanz nach einem Ausfall.
      website: { ...erreichbar("https://www.haus-toeller.de/"), geprueftAt: JETZT.toISOString() },
      fetchedAt: JETZT,
    });
    expect(prismaMock.insightsCache.deleteMany).toHaveBeenCalledWith({ where: { businessId: TOELLER_ID } });

    // Der Bericht ist trotzdem da und sagt, dass Google fehlt.
    expect(ergebnis.fetchedAt).toBe(JETZT.toISOString());
    expect(ergebnis.bericht.deckung.unbekannt).toEqual(expect.arrayContaining(["rating", "responsiveness", "reach"]));
    expect(ergebnis.bericht.deckung.hinweis).toContain("Google-Daten sind noch nicht abgerufen.");
  });

  it("lässt einen früher geholten Google-Eintrag stehen - er ist nicht falsch, nur weil der Schlüssel fehlt", async () => {
    snapshot(TOELLER_ID, { status: "bereit", google: ALTER_EINTRAG, fetchedAt: new Date(JETZT.getTime() - 3 * 60 * MINUTE) });
    const { umgebung, fetch, pruefeWebsite } = testUmgebung({ schluessel: null });

    const ergebnis = await aktualisierePraesenz(TOELLER_ID, {}, umgebung);

    expect(fetch).not.toHaveBeenCalled();
    expect(ergebnis.status).toBe("bereit");
    expect(ergebnis.google).toEqual(ALTER_EINTRAG);
    expect(pruefeWebsite).toHaveBeenCalledWith("https://www.haus-toeller.de/");
    // Gespeichert samt Abrufzeitpunkt - und zwar dem ALTEN (Altzeile ohne Feld →
    // ihr fetchedAt), nicht JETZT: Sonst hielte jeder Lauf ohne Schlüssel den
    // Eintrag für immer frisch.
    expect(snapshots.get(TOELLER_ID)?.google).toEqual({
      ...ALTER_EINTRAG,
      abgerufenAt: new Date(JETZT.getTime() - 3 * 60 * MINUTE).toISOString(),
    });
  });

  /*
   * ANLASS (Prüfbefund): `speichereSnapshot` schrieb ein blosses `null` in die
   * Json?-Spalten. Prisma lehnt das ab, der catch loggte nur - in Prod (Google-
   * Schlüssel tot) entstand nie eine Zeile. Der Tabellen-Mock oben lehnt `null`
   * jetzt ebenso ab; hier zusätzlich die Referenz auf das Sentinel und die Wirkung.
   */
  it("schreibt leere Json-Spalten als Prisma.DbNull - danach greift die Drossel", async () => {
    // Weder Google-Eintrag (toter Schlüssel) noch irgendeine Website.
    betriebe.set(TOELLER_ID, {
      ...structuredClone(TOELLER),
      socialLinks: {},
      contactInfo: { address: "Weyerstraße 96, 50676 Köln" },
    });
    const TOT: PlacesAntwort = { http: 403, body: { error: { message: "API key not valid.", status: "PERMISSION_DENIED" } } };
    const { umgebung, fetch, pruefeWebsite } = testUmgebung({ antwort: TOT });

    const ergebnis = await aktualisierePraesenz(TOELLER_ID, {}, umgebung);

    expect(ergebnis.status).toBe("fehler");
    expect(pruefeWebsite).not.toHaveBeenCalled();
    const [aufruf] = prismaMock.presenceSnapshot.upsert.mock.calls[0];
    expect(aufruf.create.google).toBe(Prisma.DbNull);
    expect(aufruf.create.website).toBe(Prisma.DbNull);
    expect(aufruf.update.google).toBe(Prisma.DbNull);
    expect(aufruf.update.website).toBe(Prisma.DbNull);
    expect(warn.mock.calls.map((c) => String(c[0])).some((z) => z.includes("nicht speicherbar"))).toBe(false);
    expect(snapshots.get(TOELLER_ID)).toMatchObject({ status: "fehler", google: null, website: null, fetchedAt: JETZT });

    // Der gespeicherte Stand trägt die Drossel: fünf Minuten später kein zweiter bezahlter Abruf.
    const spaeter = testUmgebung({ antwort: TOT, jetzt: new Date(JETZT.getTime() + 5 * MINUTE) });
    await aktualisierePraesenz(TOELLER_ID, {}, spaeter.umgebung);
    expect(fetch).toHaveBeenCalledTimes(1);
    expect(spaeter.fetch).not.toHaveBeenCalled();
    expect(prismaMock.presenceSnapshot.upsert).toHaveBeenCalledTimes(1);
  });
});

/* ── Mit Schlüssel: der Normalfall ──────────────────────────────────────── */

describe("aktualisierePraesenz mit Places-Schlüssel", () => {
  it("sucht mit Adresse und PLZ, prüft Googles Website und speichert den Eintrag samt placeId", async () => {
    const { umgebung, fetch, pruefeWebsite, suchen } = testUmgebung();

    const ergebnis = await aktualisierePraesenz(TOELLER_ID, {}, umgebung);

    expect(fetch).toHaveBeenCalledTimes(1);
    expect(suchen[0].textQuery).toBe("Haus Töller, Weyerstraße 96, 50676 Köln");
    expect(ergebnis.status).toBe("bereit");
    expect(ergebnis).not.toHaveProperty("hinweis");
    expect(ergebnis.google).toMatchObject({ placeId: "ChIJ-toeller", rating: 4.6, reviewCount: 812 });
    // Die Website, die Gäste bei Google finden, schlägt die Web-App aus contactInfo.
    expect(pruefeWebsite).toHaveBeenCalledWith("https://www.haus-toeller.de/");

    expect(snapshots.get(TOELLER_ID)).toMatchObject({ placeId: "ChIJ-toeller", status: "bereit", fehler: null, fetchedAt: JETZT });
    expect(ergebnis.bericht.bewertungen).toMatchObject({ schnitt: 4.6, anzahl: 812 });
  });
});

/* ── (a2) Betrieb ohne Ortsangabe ───────────────────────────────────────── */

/*
 * ANLASS (Prüfbefund): Seit ein Places-Treffer immer PLZ oder Koordinaten als
 * Ortsbeleg braucht, konnte ein nur in der App angelegter Betrieb (POST /venues
 * kennt keine Adresse) nie gefunden werden. Die bezahlte Suche lief trotzdem bei
 * jedem Lauf, das Ergebnis war dauerhaft "nicht_gefunden" samt Hebel "Lege dein
 * Profil an", und eine früher gefundene Place-ID wurde gelöscht.
 */
describe("Betrieb ohne PLZ und Koordinaten", () => {
  const TAG = 24 * 60 * MINUTE;
  function ohneOrt() {
    betriebe.set(TOELLER_ID, {
      ...structuredClone(TOELLER),
      contactInfo: { website: "https://haus-toeller.maitr.de" },
      postalCode: null,
      latitude: null,
      longitude: null,
    });
  }

  it("sucht nicht, meldet ausstehend mit Adress-Hinweis statt 'nicht gefunden' - auch beim späteren Lesen", async () => {
    ohneOrt();
    const { umgebung, fetch } = testUmgebung();

    const ergebnis = await aktualisierePraesenz(TOELLER_ID, { erzwingen: true }, umgebung);

    expect(fetch).not.toHaveBeenCalled();
    expect(ergebnis.status).toBe("ausstehend");
    expect(ergebnis.hinweis).toBe(HINWEIS_ORTSANGABE_FEHLT);
    expect(ergebnis.bericht.hebel.map((h) => h.id)).not.toContain("google_nicht_gefunden");
    expect(snapshots.get(TOELLER_ID)).toMatchObject({ status: "ausstehend", placeId: null, google: null });

    // Der Zeitgeber am nächsten Tag bezahlt ebenfalls nichts.
    await aktualisierePraesenz(TOELLER_ID, { erzwingen: true }, testUmgebung({ jetzt: new Date(JETZT.getTime() + TAG) }).umgebung);
    expect(fetch).not.toHaveBeenCalled();

    const gelesen = await ladePraesenz(TOELLER_ID, umgebung);
    expect(gelesen.hinweis).toBe(HINWEIS_ORTSANGABE_FEHLT);
    // Ohne Schlüssel bleibt es beim Schlüssel-Hinweis - an der Adresse liegt es dann nicht.
    const ohneSchluessel = await ladePraesenz(TOELLER_ID, { jetzt: () => JETZT, schluessel: () => null });
    expect(ohneSchluessel.hinweis).not.toBe(HINWEIS_ORTSANGABE_FEHLT);
  });

  it("behält einen früher gefundenen Eintrag und seine Place-ID", async () => {
    ohneOrt();
    snapshot(TOELLER_ID, { status: "bereit", google: ALTER_EINTRAG, placeId: "ChIJ-toeller", fetchedAt: new Date(JETZT.getTime() - TAG) });
    const { umgebung, fetch } = testUmgebung();

    const ergebnis = await aktualisierePraesenz(TOELLER_ID, { erzwingen: true }, umgebung);

    expect(fetch).not.toHaveBeenCalled();
    expect(ergebnis.status).toBe("bereit");
    expect(ergebnis.google).toEqual(ALTER_EINTRAG);
    expect(ergebnis).not.toHaveProperty("hinweis");
    expect(snapshots.get(TOELLER_ID)).toMatchObject({ status: "bereit", placeId: "ChIJ-toeller" });
  });

  it("die PLZ in der Adresszeile genügt - dann wird gesucht", async () => {
    betriebe.set(TOELLER_ID, { ...structuredClone(TOELLER), postalCode: null, latitude: null, longitude: null });
    const { umgebung, fetch } = testUmgebung();

    const ergebnis = await aktualisierePraesenz(TOELLER_ID, {}, umgebung);

    expect(fetch).toHaveBeenCalledTimes(1);
    expect(ergebnis.status).toBe("bereit");
  });
});

/* ── (b) Drossel ────────────────────────────────────────────────────────── */

describe("Drossel", () => {
  const vorFuenfMinuten = new Date(JETZT.getTime() - 5 * MINUTE);

  it("liefert einen Stand, der jünger als zehn Minuten ist, ohne Fremdabruf und ohne Schreiben", async () => {
    snapshot(TOELLER_ID, { status: "bereit", google: ALTER_EINTRAG, website: erreichbar("https://www.haus-toeller.de/"), fetchedAt: vorFuenfMinuten });
    const { umgebung, fetch, pruefeWebsite } = testUmgebung();

    const ergebnis = await aktualisierePraesenz(TOELLER_ID, {}, umgebung);

    expect(fetch).not.toHaveBeenCalled();
    expect(pruefeWebsite).not.toHaveBeenCalled();
    expect(prismaMock.presenceSnapshot.upsert).not.toHaveBeenCalled();
    expect(prismaMock.insightsCache.deleteMany).not.toHaveBeenCalled();
    expect(ergebnis.fetchedAt).toBe(vorFuenfMinuten.toISOString());
    expect(ergebnis.google).toEqual(ALTER_EINTRAG);
  });

  it("gilt genau zehn Minuten: danach wird wieder abgerufen", async () => {
    expect(DROSSEL_MS).toBe(10 * MINUTE);
    snapshot(TOELLER_ID, { status: "bereit", google: ALTER_EINTRAG, fetchedAt: new Date(JETZT.getTime() - DROSSEL_MS) });
    const { umgebung, fetch } = testUmgebung();

    const ergebnis = await aktualisierePraesenz(TOELLER_ID, {}, umgebung);

    expect(fetch).toHaveBeenCalledTimes(1);
    expect(ergebnis.google?.rating).toBe(4.6);
  });

  it("wird von erzwingen (Zeitgeber) übergangen", async () => {
    snapshot(TOELLER_ID, { status: "bereit", google: ALTER_EINTRAG, fetchedAt: vorFuenfMinuten });
    const { umgebung, fetch } = testUmgebung();

    const ergebnis = await aktualisierePraesenz(TOELLER_ID, { erzwingen: true }, umgebung);

    expect(fetch).toHaveBeenCalledTimes(1);
    expect(prismaMock.presenceSnapshot.upsert).toHaveBeenCalledTimes(1);
    expect(ergebnis.fetchedAt).toBe(JETZT.toISOString());
    expect(ergebnis.google?.rating).toBe(4.6);
  });
});

/* ── (c) Places-Fehler ──────────────────────────────────────────────────── */

describe("Places-Fehler", () => {
  const TOTER_SCHLUESSEL: PlacesAntwort = {
    http: 403,
    body: { error: { message: "API key not valid. Please pass a valid API key.", status: "PERMISSION_DENIED" } },
  };

  it("behält den vorherigen Google-Eintrag, meldet fehler und sagt, dass der vorherige Stand zu sehen ist", async () => {
    snapshot(TOELLER_ID, { status: "bereit", google: ALTER_EINTRAG, fetchedAt: new Date(JETZT.getTime() - 2 * 60 * MINUTE) });
    const { umgebung, fetch } = testUmgebung({ antwort: TOTER_SCHLUESSEL });

    const ergebnis = await aktualisierePraesenz(TOELLER_ID, {}, umgebung);

    expect(fetch).toHaveBeenCalledTimes(1);
    expect(ergebnis.status).toBe("fehler");
    expect(ergebnis.google).toEqual(ALTER_EINTRAG);
    expect(ergebnis.hinweis).toContain("vorherigen Stand");

    const gespeichert = snapshots.get(TOELLER_ID);
    expect(gespeichert).toMatchObject({ status: "fehler", google: ALTER_EINTRAG, placeId: "ChIJ-toeller" });
    // Der Grund landet in der Zeile - ohne ihn sähe ein toter Schlüssel aus wie "nicht gefunden".
    expect(gespeichert?.fehler).toBe("Google Places HTTP 403: API key not valid. Please pass a valid API key.");
    expect(gespeichert?.fehler).not.toContain(SCHLUESSEL);
  });

  it("ohne vorherigen Eintrag: kein erfundener Eintrag, Hinweis auf später", async () => {
    const { umgebung } = testUmgebung({ antwort: TOTER_SCHLUESSEL });

    const ergebnis = await aktualisierePraesenz(TOELLER_ID, {}, umgebung);

    expect(ergebnis.status).toBe("fehler");
    expect(ergebnis).not.toHaveProperty("google");
    expect(ergebnis.hinweis).toMatch(/später erneut/);
    expect(ergebnis.bericht.bewertungen.schnitt).toBeNull();
  });
});

/* ── (d) Fehlende Tabelle ───────────────────────────────────────────────── */

/*
 * ANLASS (Prüfbefund): Ohne Tabelle war der gespeicherte Stand immer `null`, die
 * Drossel griff nie, und die App stößt ohne `fetchedAt` bei jedem Öffnen einen
 * Refresh an. Jeder Aufruf kostete eine Places-Suche plus Fotos - per Schleife
 * beliebig oft. Vorher prüfte dieser Block nur, DASS der Abruf ohne Tabelle
 * klappt, nicht, was er kostet.
 */
describe("fehlende PresenceSnapshot-Tabelle (Code vor der Migration auf Railway)", () => {
  beforeEach(() => {
    const fehlt = async () => {
      throw new Error("The table `public.PresenceSnapshot` does not exist in the current database.");
    };
    prismaMock.presenceSnapshot.findUnique.mockImplementation(fehlt);
    prismaMock.presenceSnapshot.upsert.mockImplementation(fehlt);
  });

  it("ruft Places und Website NICHT ab - auch nicht wiederholt oder erzwungen - und liefert trotzdem einen Bericht", async () => {
    const { umgebung, fetch, pruefeWebsite } = testUmgebung();

    const ergebnis = await aktualisierePraesenz(TOELLER_ID, {}, umgebung);

    expect(fetch).not.toHaveBeenCalled();
    expect(pruefeWebsite).not.toHaveBeenCalled();
    expect(ergebnis.status).toBe("ausstehend");
    expect(ergebnis.hinweis).toBe(HINWEIS_SPEICHER_FEHLT);
    expect(ergebnis).not.toHaveProperty("fetchedAt");
    expect(ergebnis.bericht.score).toEqual(expect.any(Number));
    expect(warn).toHaveBeenCalledWith(expect.stringContaining("Migration eingespielt?"));

    // Zehn Refreshes nacheinander (App-Starts, Schleife) - und der Zeitgeber.
    for (let i = 0; i < 10; i++) await aktualisierePraesenz(TOELLER_ID, {}, umgebung);
    await aktualisierePraesenz(TOELLER_ID, { erzwingen: true }, umgebung);
    expect(fetch).not.toHaveBeenCalled();
    expect(prismaMock.presenceSnapshot.upsert).not.toHaveBeenCalled();
  });

  it("ladePraesenz wirft nicht, sondern meldet ausstehend", async () => {
    const { umgebung } = testUmgebung();
    const ergebnis = await ladePraesenz(TOELLER_ID, umgebung);
    expect(ergebnis.status).toBe("ausstehend");
    expect(ergebnis.bericht).toBeDefined();
  });
});

/*
 * Lesbar, aber das Schreiben scheitert (Validierung, Datenbank kurz weg): Der
 * nächste Refresh fände keinen Stand. Die prozesslokale Drossel fängt das ab.
 */
describe("Speichern scheitert, Lesen klappt - prozesslokale Drossel", () => {
  beforeEach(() => {
    prismaMock.presenceSnapshot.upsert.mockImplementation(async () => {
      throw new Error("Can't reach database server at `postgres.railway.internal:5432`");
    });
  });

  it("bezahlt innerhalb von zehn Minuten keinen zweiten Abruf und liefert den Stand des ersten", async () => {
    const { umgebung, fetch } = testUmgebung();

    const erster = await aktualisierePraesenz(TOELLER_ID, {}, umgebung);
    expect(fetch).toHaveBeenCalledTimes(1);
    expect(snapshots.has(TOELLER_ID)).toBe(false);

    const neunMinuten = testUmgebung({ jetzt: new Date(JETZT.getTime() + 9 * MINUTE) });
    const zweiter = await aktualisierePraesenz(TOELLER_ID, {}, neunMinuten.umgebung);
    expect(neunMinuten.fetch).not.toHaveBeenCalled();
    expect(neunMinuten.pruefeWebsite).not.toHaveBeenCalled();
    expect(zweiter.google).toEqual(erster.google);
    expect(zweiter.fetchedAt).toBe(JETZT.toISOString());

    // Nach Ablauf wieder, und der Zeitgeber übergeht sie ohnehin.
    const zehnMinuten = testUmgebung({ jetzt: new Date(JETZT.getTime() + DROSSEL_MS) });
    await aktualisierePraesenz(TOELLER_ID, {}, zehnMinuten.umgebung);
    expect(zehnMinuten.fetch).toHaveBeenCalledTimes(1);
    const erzwungen = testUmgebung({ jetzt: new Date(JETZT.getTime() + DROSSEL_MS + MINUTE) });
    await aktualisierePraesenz(TOELLER_ID, { erzwingen: true }, erzwungen.umgebung);
    expect(erzwungen.fetch).toHaveBeenCalledTimes(1);
  });

  it("gilt je Betrieb", async () => {
    betriebe.set("biz-zwei", { ...structuredClone(TOELLER), id: "biz-zwei" });
    const { umgebung, fetch } = testUmgebung();
    await aktualisierePraesenz(TOELLER_ID, {}, umgebung);
    await aktualisierePraesenz("biz-zwei", {}, umgebung);
    expect(fetch).toHaveBeenCalledTimes(2);
  });
});

describe("scheiternder Briefing-Cache", () => {
  it("bricht den Abruf nicht ab", async () => {
    prismaMock.insightsCache.deleteMany.mockImplementation(async () => {
      throw new Error("The table `public.InsightsCache` does not exist");
    });
    const { umgebung } = testUmgebung();
    await expect(aktualisierePraesenz(TOELLER_ID, {}, umgebung)).resolves.toMatchObject({ status: "bereit" });
  });
});

/* ── (e) Single-Flight ──────────────────────────────────────────────────── */

describe("Single-Flight", () => {
  it("zwei parallele Aufrufe (Doppeltipp) teilen sich einen Places-Abruf", async () => {
    let oeffnen!: () => void;
    const tor = new Promise<void>((r) => (oeffnen = r));
    const { umgebung, fetch, pruefeWebsite } = testUmgebung({ tor });

    const erster = aktualisierePraesenz(TOELLER_ID, {}, umgebung);
    const zweiter = aktualisierePraesenz(TOELLER_ID, {}, umgebung);
    oeffnen();
    const [a, b] = await Promise.all([erster, zweiter]);

    expect(fetch).toHaveBeenCalledTimes(1);
    expect(pruefeWebsite).toHaveBeenCalledTimes(1);
    expect(prismaMock.presenceSnapshot.upsert).toHaveBeenCalledTimes(1);
    expect(a).toBe(b);

    // Nach dem Ende ist der Lauf frei: ein erzwungener Abruf geht wieder raus.
    await aktualisierePraesenz(TOELLER_ID, { erzwingen: true }, umgebung);
    expect(fetch).toHaveBeenCalledTimes(2);
  });

  it("gilt je Betrieb - zwei Betriebe laufen parallel mit je einem Abruf", async () => {
    betriebe.set("biz-zwei", { ...structuredClone(TOELLER), id: "biz-zwei" });
    const { umgebung, fetch } = testUmgebung();

    await Promise.all([aktualisierePraesenz(TOELLER_ID, {}, umgebung), aktualisierePraesenz("biz-zwei", {}, umgebung)]);

    expect(fetch).toHaveBeenCalledTimes(2);
  });

  it("gibt den Platz auch nach einem gescheiterten Lauf wieder frei", async () => {
    const { umgebung, fetch } = testUmgebung();
    betriebe.delete(TOELLER_ID);
    await expect(aktualisierePraesenz(TOELLER_ID, {}, umgebung)).rejects.toThrow(/No Business found/);

    betriebe.set(TOELLER_ID, structuredClone(TOELLER));
    await expect(aktualisierePraesenz(TOELLER_ID, {}, umgebung)).resolves.toMatchObject({ status: "bereit" });
    expect(fetch).toHaveBeenCalledTimes(1);
  });
});

/* ── (f) Welche Website wird geprüft? ───────────────────────────────────── */

describe("websiteFuerPruefung", () => {
  const google = { ...ALTER_EINTRAG, website: "https://google-kennt.example/" };
  const passenderJob = { websiteUrl: "https://www.haus-toeller.de/", businessName: "Haus Töller" };
  const fremderJob = { websiteUrl: "https://krawummel.example/", businessName: "Krawummel" };
  const zeile = {
    ...TOELLER,
    socialLinks: { website: "https://social.example/" },
    contactInfo: { website: "https://haus-toeller.maitr.de" },
  };

  it("nimmt zuerst die Website aus dem Google-Eintrag", () => {
    expect(websiteFuerPruefung(google, { zeile, analyseSeiten: [passenderJob] })).toBe("https://google-kennt.example/");
  });

  it("danach den Analyse-Job mit passendem Namen - der neuere Job eines anderen Testbetriebs zählt nicht", () => {
    const { website: _ohne, ...ohneWebsite } = google;
    // Jobs kommen neueste zuerst: Der fremde steht vorn und darf trotzdem nicht gewinnen.
    expect(websiteFuerPruefung(ohneWebsite, { zeile, analyseSeiten: [fremderJob, passenderJob] })).toBe(
      "https://www.haus-toeller.de/",
    );
    expect(websiteFuerPruefung(null, { zeile, analyseSeiten: [fremderJob, passenderJob] })).toBe(
      "https://www.haus-toeller.de/",
    );
  });

  it("nimmt einen Namensvetter-Job nicht, sondern fällt auf socialLinks.website zurück", () => {
    const bellaVista = { ...zeile, name: "Trattoria Bella Vista" };
    const daMario = { websiteUrl: "https://da-mario.example/", businessName: "Trattoria Da Mario" };
    const ohneName = { websiteUrl: "https://ohne-name.example/", businessName: null };
    expect(websiteFuerPruefung(null, { zeile: bellaVista, analyseSeiten: [daMario, ohneName] })).toBe(
      "https://social.example/",
    );
  });

  it("zuletzt contactInfo.website - aber nie die Maitr-Web-App, sonst nichts", () => {
    const ohneSocial = { ...zeile, socialLinks: { website: "  " } };
    expect(
      websiteFuerPruefung(null, {
        zeile: { ...ohneSocial, contactInfo: { website: "https://www.haus-toeller.de/" } },
        analyseSeiten: [fremderJob],
      }),
    ).toBe("https://www.haus-toeller.de/");
    // contactInfo.website = publishedUrl der Web-App: nicht per HTML prüfbar.
    expect(websiteFuerPruefung(null, { zeile: ohneSocial, analyseSeiten: [fremderJob] })).toBeUndefined();
    expect(
      websiteFuerPruefung(null, { zeile: { ...ohneSocial, contactInfo: null }, analyseSeiten: [] }),
    ).toBeUndefined();
  });

  /*
   * ANLASS (Prüfbefund, behoben 15.09.2026): `namensNaehe >= 0.5` genügte über
   * ein gemeinsames Gattungswort ("Café", "Haus", "Restaurant"). Legte derselbe
   * Wirt zwei Testbetriebe an, wurde der NEUERE Job des anderen Betriebs genommen -
   * die App zeigte Befunde über eine fremde Website. Jetzt zählen nur
   * unterscheidende Wörter (dieselbe Namensnähe wie bei Places).
   */
  it("nimmt nicht den neueren Job 'Café Krawummel' für den Betrieb 'Café Goldstück'", () => {
    const goldstueck = { ...zeile, name: "Café Goldstück" };
    const analyseSeiten = [
      { websiteUrl: "https://cafe-krawummel.example/", businessName: "Café Krawummel" },
      { websiteUrl: "https://cafe-goldstueck.example/", businessName: "Café Goldstück" },
    ];
    expect(websiteFuerPruefung(null, { zeile: goldstueck, analyseSeiten })).toBe("https://cafe-goldstueck.example/");

    // "Restaurant Adria" und "Restaurant Zeus" teilen nur das Gattungswort.
    const adria = { ...zeile, name: "Restaurant Adria", socialLinks: {} };
    const zeus = { websiteUrl: "https://zeus.example/", businessName: "Restaurant Zeus" };
    // Ohne passenden Job bleibt nur die Web-App in contactInfo - und die wird nicht geprüft.
    expect(websiteFuerPruefung(null, { zeile: adria, analyseSeiten: [zeus] })).toBeUndefined();
  });

  it("im Ablauf: liest die Analyse-Jobs der Mitglieder und prüft den passenden", async () => {
    mitglieder.set(TOELLER_ID, [WIRT, "user-kellner"]);
    jobs = [
      { userId: WIRT, websiteUrl: "https://krawummel.example/", businessName: "Krawummel" },
      { userId: "user-kellner", websiteUrl: "https://www.haus-toeller.de/", businessName: "Haus Töller" },
      // Job eines Fremden mit passendem Namen - gehört nicht zu diesem Betrieb.
      { userId: "user-fremd", websiteUrl: "https://falsch.example/", businessName: "Haus Töller" },
    ];
    const { umgebung, pruefeWebsite } = testUmgebung({ schluessel: null });

    await aktualisierePraesenz(TOELLER_ID, {}, umgebung);

    expect(prismaMock.scraperJob.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { userId: { in: [WIRT, "user-kellner"] } } }),
    );
    expect(pruefeWebsite).toHaveBeenCalledWith("https://www.haus-toeller.de/");
  });

  it("im Ablauf: ohne Mitglieder keine Job-Abfrage (ein leeres IN wäre eine Abfrage für nichts)", async () => {
    mitglieder.set(TOELLER_ID, []);
    betriebe.set(TOELLER_ID, { ...structuredClone(TOELLER), socialLinks: { website: "https://www.haus-toeller.de/" } });
    const { umgebung, pruefeWebsite } = testUmgebung({ schluessel: null });

    await aktualisierePraesenz(TOELLER_ID, {}, umgebung);

    expect(prismaMock.scraperJob.findMany).not.toHaveBeenCalled();
    expect(pruefeWebsite).toHaveBeenCalledWith("https://www.haus-toeller.de/");
  });
});

/* ── (f2) Die Maitr-Web-App wird nicht per HTML geprüft ─────────────────── */

/*
 * ANLASS (Prüfbefund): Ohne eigene Website fiel die Prüfung auf contactInfo.website
 * zurück - die publishedUrl `<sub>.maitr.de`. Per safeFetch kam die vorgerenderte
 * maitr.de-Startseite zurück (Titel "Maitr – Restaurant-Web-App …", kein
 * Restaurant-Schema, keine Reservierung), und der Bericht empfahl "Online-
 * Reservierung anbieten - deine Maitr-Web-App bringt eine mit", obwohl genau
 * diese Web-App geprüft wurde.
 */
describe("Maitr-eigene Adressen", () => {
  const vorEinerStunde = new Date(JETZT.getTime() - 60 * MINUTE);
  const altEnv = process.env.PUBLIC_BASE_DOMAIN;
  afterEach(() => {
    if (altEnv === undefined) delete process.env.PUBLIC_BASE_DOMAIN;
    else process.env.PUBLIC_BASE_DOMAIN = altEnv;
  });

  it("istMaitrAdresse: Subdomains von maitr.de und PUBLIC_BASE_DOMAIN - keine Namensvettern", () => {
    delete process.env.PUBLIC_BASE_DOMAIN;
    expect(istMaitrAdresse("https://haus-toeller.maitr.de")).toBe(true);
    expect(istMaitrAdresse("https://HAUS-TOELLER.MAITR.DE./speisekarte")).toBe(true);
    expect(istMaitrAdresse("https://maitr.de/")).toBe(true);
    expect(istMaitrAdresse("https://notmaitr.de/")).toBe(false);
    expect(istMaitrAdresse("https://maitr.de.evil.example/")).toBe(false);
    expect(istMaitrAdresse("keine url")).toBe(false);

    process.env.PUBLIC_BASE_DOMAIN = "maitr-staging.app";
    expect(istMaitrAdresse("https://bella12.maitr-staging.app/")).toBe(true);
    expect(istMaitrAdresse("https://bella12.maitr.de/")).toBe(true);
  });

  it("prüft nur die Web-App in contactInfo nicht - kein Befund statt der maitr.de-Startseite", async () => {
    const { umgebung, pruefeWebsite } = testUmgebung({ schluessel: null });

    const ergebnis = await aktualisierePraesenz(TOELLER_ID, {}, umgebung);

    expect(pruefeWebsite).not.toHaveBeenCalled();
    expect(ergebnis).not.toHaveProperty("website");
    expect(snapshots.get(TOELLER_ID)?.website).toBeNull();
    // Kein Reservierungs-Hebel aus einer Seite, die nicht die des Betriebs ist.
    expect(ergebnis.bericht.hebel.map((h) => h.id)).not.toContain("reservation");
  });

  it("überspringt eine Web-App-Adresse bei Google und prüft die nächste eigene Seite", async () => {
    betriebe.set(TOELLER_ID, { ...structuredClone(TOELLER), socialLinks: { website: "https://www.haus-toeller.de/" } });
    const { umgebung, pruefeWebsite } = testUmgebung({
      antwort: { places: [{ ...TOELLER_PLACE, websiteUri: "https://haus-toeller.maitr.de/" }] },
    });

    await aktualisierePraesenz(TOELLER_ID, {}, umgebung);

    expect(pruefeWebsite).toHaveBeenCalledTimes(1);
    expect(pruefeWebsite).toHaveBeenCalledWith("https://www.haus-toeller.de/");
  });

  it("behält den vorigen Befund einer eigenen Seite - einen alten Befund der Web-App nicht", async () => {
    // Die eigene Seite fällt kurz aus den Quellen (hier: Google nennt nur die Web-App); sie war vorher geprüft.
    const eigene = erreichbar("https://www.haus-toeller.de/");
    snapshot(TOELLER_ID, { status: "bereit", google: ALTER_EINTRAG, website: eigene, fetchedAt: vorEinerStunde });
    const mitWebApp = { places: [{ ...TOELLER_PLACE, websiteUri: "https://haus-toeller.maitr.de/" }] };
    const { umgebung, pruefeWebsite } = testUmgebung({ antwort: mitWebApp });

    const ergebnis = await aktualisierePraesenz(TOELLER_ID, {}, umgebung);
    expect(pruefeWebsite).not.toHaveBeenCalled();
    expect(ergebnis.website).toEqual(eigene);

    // Ein Befund der Web-App aus der Zeit vor dieser Änderung fällt dagegen weg.
    snapshot(TOELLER_ID, {
      status: "bereit",
      google: ALTER_EINTRAG,
      website: erreichbar("https://haus-toeller.maitr.de"),
      fetchedAt: vorEinerStunde,
    });
    const nochmal = testUmgebung({ antwort: mitWebApp });
    const danach = await aktualisierePraesenz(TOELLER_ID, { erzwingen: true }, nochmal.umgebung);
    expect(nochmal.pruefeWebsite).not.toHaveBeenCalled();
    expect(danach).not.toHaveProperty("website");
  });

  /*
   * ANLASS (Prüfbefund): Der vorige Befund blieb ohne Frist. Ersetzt der Wirt bei
   * Google seine alte Seite durch die Web-App (wie es der Hebel empfiehlt), stand
   * deren "keine Reservierung" samt Hebel "verlinke deine Web-App" für immer im
   * Bericht - und ein gespeichertes "nicht erreichbar" ebenso.
   */
  it("nur für die Kulanzfrist ab der Prüfung - Folgeläufe verlängern sie nicht", async () => {
    const TAG = 24 * 60 * MINUTE;
    const ohneReservierung = erreichbar("https://www.alt.de/");
    snapshot(TOELLER_ID, { status: "bereit", google: ALTER_EINTRAG, website: ohneReservierung, fetchedAt: vorEinerStunde });
    const mitWebApp = { places: [{ ...TOELLER_PLACE, websiteUri: "https://haus-toeller.maitr.de/" }] };

    // Zeitgeber-Läufe innerhalb der Frist: Der Befund bleibt, sein Prüfzeitpunkt auch.
    const tag1 = testUmgebung({ antwort: mitWebApp, jetzt: new Date(JETZT.getTime() + TAG) });
    expect((await aktualisierePraesenz(TOELLER_ID, { erzwingen: true }, tag1.umgebung)).website).toEqual(ohneReservierung);
    expect(snapshots.get(TOELLER_ID)?.website.geprueftAt).toBe(vorEinerStunde.toISOString());

    // Nach Ablauf der Frist (gerechnet ab der Prüfung, nicht ab dem letzten Lauf) fällt er weg.
    const nachFrist = new Date(vorEinerStunde.getTime() + WEBSITE_KULANZ_MS);
    const spaeter = testUmgebung({ antwort: mitWebApp, jetzt: nachFrist });
    const ergebnis = await aktualisierePraesenz(TOELLER_ID, { erzwingen: true }, spaeter.umgebung);
    expect(spaeter.pruefeWebsite).not.toHaveBeenCalled();
    expect(ergebnis).not.toHaveProperty("website");
    expect(snapshots.get(TOELLER_ID)?.website).toBeNull();
    // Keine Befunde mehr (etwa "Kein Reservierungsweg auf der Seite") zu einer Seite, die niemand mehr verlinkt.
    expect(ergebnis.bericht.websiteBefunde).toEqual([]);
  });

  it("ein voriger 'nicht erreichbar'-Befund bleibt nicht stehen, auch nicht innerhalb der Frist", async () => {
    const weg: WebsitePruefung = {
      ...erreichbar("https://www.alt.de/"),
      erreichbar: false,
      fehler: "Die Seite ist nicht erreichbar.",
    };
    snapshot(TOELLER_ID, { status: "bereit", google: ALTER_EINTRAG, website: weg, fetchedAt: vorEinerStunde });
    const { umgebung } = testUmgebung({ antwort: { places: [{ ...TOELLER_PLACE, websiteUri: "https://haus-toeller.maitr.de/" }] } });

    const ergebnis = await aktualisierePraesenz(TOELLER_ID, {}, umgebung);

    expect(ergebnis).not.toHaveProperty("website");
    expect(snapshots.get(TOELLER_ID)?.website).toBeNull();
    expect(ergebnis.bericht.websiteBefunde).toEqual([]);
  });
});

/* ── (f3) Kurzer Website-Ausfall ────────────────────────────────────────── */

/*
 * ANLASS (Prüfbefund): `pruefeWebsite` fängt jeden Fehler selbst ab und liefert
 * "nicht erreichbar" - der catch im Ablauf, der den vorigen Stand behalten sollte,
 * lief nie. Ein Timeout ersetzte den guten Befund durch "keine Speisekarte, keine
 * Reservierung", und der Bericht behauptete das bis zum nächsten Lauf.
 */
describe("Website kurz nicht erreichbar", () => {
  const SEITE = "https://www.haus-toeller.de/";
  const gut: WebsitePruefung = { ...erreichbar(SEITE), reservierung: { anbieter: "opentable", url: "https://opentable.de/r/1" } };
  const ausfall: WebsitePruefung = {
    url: SEITE,
    erreichbar: false,
    https: true,
    mobilTauglich: false,
    strukturierteDaten: false,
    speisekarteVerlinkt: false,
    oeffnungszeitenGefunden: false,
    adresseGefunden: false,
    fehler: "Zeitüberschreitung - die Seite hat nicht rechtzeitig geantwortet.",
  };

  it("behält den vorigen erreichbaren Befund - samt Reservierung im Score", async () => {
    snapshot(TOELLER_ID, { status: "bereit", google: ALTER_EINTRAG, website: gut, fetchedAt: new Date(JETZT.getTime() - 25 * 60 * MINUTE) });
    const { umgebung, pruefeWebsite } = testUmgebung();
    pruefeWebsite.mockResolvedValue(ausfall);

    const ergebnis = await aktualisierePraesenz(TOELLER_ID, {}, umgebung);

    expect(pruefeWebsite).toHaveBeenCalledWith(SEITE);
    expect(ergebnis.website).toEqual(gut);
    expect(ergebnis.bericht.hebel.map((h) => h.id)).not.toContain("reservation");
    // Der Prüfzeitpunkt bleibt der des guten Befunds (Altzeile: ihr fetchedAt) - die Kulanz verlängert sich nicht.
    expect(snapshots.get(TOELLER_ID)?.website.geprueftAt).toBe(new Date(JETZT.getTime() - 25 * 60 * MINUTE).toISOString());
    expect(warn.mock.calls.map((c) => String(c[0])).some((z) => z.includes("nicht erreichbar"))).toBe(true);
  });

  it("nach Ablauf der Kulanz gilt der Ausfall", async () => {
    const alt = new Date(JETZT.getTime() - WEBSITE_KULANZ_MS - MINUTE);
    snapshot(TOELLER_ID, {
      status: "bereit",
      google: ALTER_EINTRAG,
      website: { ...gut, geprueftAt: alt.toISOString() },
      fetchedAt: new Date(JETZT.getTime() - 60 * MINUTE),
    });
    const { umgebung, pruefeWebsite } = testUmgebung();
    pruefeWebsite.mockResolvedValue(ausfall);

    const ergebnis = await aktualisierePraesenz(TOELLER_ID, {}, umgebung);

    expect(ergebnis.website).toEqual(ausfall);
    expect(snapshots.get(TOELLER_ID)?.website.geprueftAt).toBe(JETZT.toISOString());
  });

  it("ohne vorigen erreichbaren Befund gilt der Ausfall sofort - erreichbar ersetzt ihn wieder", async () => {
    snapshot(TOELLER_ID, { status: "bereit", google: ALTER_EINTRAG, website: ausfall, fetchedAt: new Date(JETZT.getTime() - 60 * MINUTE) });
    const { umgebung, pruefeWebsite } = testUmgebung();
    pruefeWebsite.mockResolvedValue(ausfall);
    expect((await aktualisierePraesenz(TOELLER_ID, {}, umgebung)).website).toEqual(ausfall);

    const wieder = testUmgebung({ jetzt: new Date(JETZT.getTime() + DROSSEL_MS) });
    expect((await aktualisierePraesenz(TOELLER_ID, {}, wieder.umgebung)).website).toEqual(erreichbar(SEITE));
  });

  it("eine unerreichbare Seite ist kein gemessenes 'keine Reservierung'", async () => {
    // Kein Google-Eintrag, keine vorige Prüfung: Nur der Ausfall ist bekannt.
    betriebe.set(TOELLER_ID, { ...structuredClone(TOELLER), socialLinks: { website: SEITE } });
    const { umgebung, pruefeWebsite } = testUmgebung({ schluessel: null });
    pruefeWebsite.mockResolvedValue(ausfall);

    const ergebnis = await aktualisierePraesenz(TOELLER_ID, {}, umgebung);

    expect(ergebnis.website).toEqual(ausfall);
    expect(ergebnis.bericht.hebel.map((h) => h.id)).not.toContain("reservation");
  });

  it("ein alter Fehlertext mit Host und Adresse wird beim Lesen neutral", async () => {
    snapshot(TOELLER_ID, {
      status: "bereit",
      google: ALTER_EINTRAG,
      website: { ...ausfall, fehler: "blocked_address: db.internal löst auf eine nicht erlaubte Adresse auf (10.0.0.5)" },
      fetchedAt: new Date(JETZT.getTime() - 60 * MINUTE),
    });
    const ergebnis = await ladePraesenz(TOELLER_ID, testUmgebung().umgebung);
    expect(ergebnis.website?.fehler).toBe("Die Seite ist nicht erreichbar.");
    expect(JSON.stringify(ergebnis)).not.toContain("10.0.0.5");
  });
});

describe("maitrProfilAus und placesSucheAus", () => {
  it("liest nur, was Maitr wirklich weiß - ungültige Zeiten und leere Felder fallen weg", () => {
    expect(maitrProfilAus(TOELLER, 12)).toEqual({
      name: "Haus Töller",
      hatSpeisekarte: true,
      hatBeschreibung: true,
      tags: [],
      oeffnungszeiten: { monday: { closed: false, open: "17:00", close: "23:59" }, sunday: { closed: true } },
      instagram: "https://www.instagram.com/haustoeller/",
      website: "https://haus-toeller.maitr.de",
      telefon: "0221 2589316",
    });

    const karg = maitrProfilAus(
      {
        ...TOELLER,
        description: "   ",
        openingHours: { monday: { closed: false, open: "25:00", close: "23:59" } },
        socialLinks: { instagram: "" },
        contactInfo: null,
      },
      0,
    );
    expect(karg).toEqual({ name: "Haus Töller", hatSpeisekarte: false, hatBeschreibung: false, tags: [] });
  });

  it("sucht bei Google mit Adresse, PLZ und Koordinaten - soweit bekannt", () => {
    expect(placesSucheAus(TOELLER)).toEqual({
      name: "Haus Töller",
      adresse: "Weyerstraße 96, 50676 Köln",
      postalCode: "50676",
      lat: 50.9311,
      lng: 6.9446,
    });
    expect(
      placesSucheAus({ ...TOELLER, contactInfo: {}, postalCode: null, latitude: null, longitude: null }),
    ).toEqual({ name: "Haus Töller" });
  });
});

/* ── (g) ladePraesenz ───────────────────────────────────────────────────── */

describe("ladePraesenz", () => {
  it("ohne Snapshot: ausstehend (mit Schlüssel) bzw. kein_schluessel - Bericht vorhanden, kein Fremdabruf", async () => {
    const mit = testUmgebung();
    const ausstehend = await ladePraesenz(TOELLER_ID, mit.umgebung);
    expect(ausstehend.status).toBe("ausstehend");
    expect(ausstehend.hinweis).toMatch(/noch nicht abgerufen/);
    expect(ausstehend).not.toHaveProperty("fetchedAt");
    expect(ausstehend.bericht.deckung.hinweis).toContain("Google-Daten sind noch nicht abgerufen.");
    expect(mit.fetch).not.toHaveBeenCalled();
    expect(mit.pruefeWebsite).not.toHaveBeenCalled();

    const ohne = testUmgebung({ schluessel: null });
    const keinSchluessel = await ladePraesenz(TOELLER_ID, ohne.umgebung);
    expect(keinSchluessel.status).toBe("kein_schluessel");
    expect(keinSchluessel.bericht.score).toEqual(expect.any(Number));

    expect(prismaMock.presenceSnapshot.upsert).not.toHaveBeenCalled();
  });

  it("rechnet den Bericht bei jedem Lesen neu - eine neue Speisekarte wirkt sofort", async () => {
    snapshot(TOELLER_ID, { status: "bereit", google: ALTER_EINTRAG, fetchedAt: new Date(JETZT.getTime() - 3 * 60 * MINUTE) });
    const { umgebung } = testUmgebung();

    const vorher = await ladePraesenz(TOELLER_ID, umgebung);
    expect(vorher.bericht.hebel.map((h) => h.id)).toContain("menu");

    gerichte.set(TOELLER_ID, 14);
    const nachher = await ladePraesenz(TOELLER_ID, umgebung);
    expect(nachher.bericht.hebel.map((h) => h.id)).not.toContain("menu");
    expect(nachher.fetchedAt).toBe(vorher.fetchedAt);
  });

  it("vertraut einer kaputten Zeile nicht: unbekannter Status wird fehler, Google ohne placeId fällt weg", async () => {
    snapshot(TOELLER_ID, {
      status: "irgendwas",
      google: { name: "ohne placeId", rating: 5 },
      website: { url: "https://x.example/" },
      fetchedAt: new Date(JETZT.getTime() - 60 * MINUTE),
    });
    const { umgebung } = testUmgebung();

    const ergebnis = await ladePraesenz(TOELLER_ID, umgebung);

    expect(ergebnis.status).toBe("fehler");
    expect(ergebnis).not.toHaveProperty("google");
    expect(ergebnis).not.toHaveProperty("website");
  });
});

/* ── (h) Zeitgeber-Einstieg ─────────────────────────────────────────────── */

describe("aktualisiereVeraltetePraesenz", () => {
  /** Mitgliederzahl je Betrieb - die Grundlage für `members: { some: {} }`. */
  let mitgliederZahl: Map<string, number>;

  /**
   * Wertet den Filter aus wie Postgres - nur für die Formen, die der Code
   * benutzt. Unbekannte Formen werfen, damit eine Änderung am Filter nicht
   * still als "alles passt" durchgeht.
   */
  function passt(id: string, where: any): boolean {
    if (where.members !== undefined) {
      if (JSON.stringify(where.members) !== JSON.stringify({ some: {} })) throw new Error("unbekannter members-Filter");
      if ((mitgliederZahl.get(id) ?? 0) === 0) return false;
    }
    if (where.OR !== undefined) {
      const stand = snapshots.get(id);
      return where.OR.some((klausel: any) => {
        const is = klausel.presenceSnapshot?.is;
        if (is === null) return !stand;
        if (is?.fetchedAt?.lt instanceof Date) return Boolean(stand) && stand!.fetchedAt < is.fetchedAt.lt;
        throw new Error(`unbekannte OR-Klausel: ${JSON.stringify(klausel)}`);
      });
    }
    return true;
  }

  beforeEach(() => {
    mitgliederZahl = new Map();
    const betrieb = (id: string, name: string, mitglieder: number) => {
      betriebe.set(id, { ...structuredClone(TOELLER), id, name });
      mitgliederZahl.set(id, mitglieder);
    };
    betrieb("biz-ohne-stand", "Haus Töller", 1);
    betrieb("biz-alt", "Haus Töller", 2);
    betrieb("biz-frisch", "Haus Töller", 1);
    betrieb("biz-verwaist", "Haus Töller", 0);
    betriebe.delete(TOELLER_ID);

    snapshot("biz-alt", { status: "bereit", google: ALTER_EINTRAG, fetchedAt: new Date(JETZT.getTime() - VERALTET_MS - MINUTE) });
    snapshot("biz-frisch", { status: "bereit", google: ALTER_EINTRAG, fetchedAt: new Date(JETZT.getTime() - VERALTET_MS + MINUTE) });

    prismaMock.business.findMany.mockImplementation(async (args: any) =>
      [...mitgliederZahl.keys()]
        .filter((id) => passt(id, args.where))
        .slice(0, args.take ?? Infinity)
        .map((id) => ({ id })),
    );
  });

  it("frischt nur Betriebe mit Mitgliedern und fehlendem oder über 24 h altem Stand auf", async () => {
    const { umgebung, fetch } = testUmgebung();

    const anzahl = await aktualisiereVeraltetePraesenz({}, umgebung);

    expect(anzahl).toBe(2);
    expect(fetch).toHaveBeenCalledTimes(2);
    expect(snapshots.get("biz-ohne-stand")?.fetchedAt).toEqual(JETZT);
    expect(snapshots.get("biz-alt")?.fetchedAt).toEqual(JETZT);
    expect(snapshots.get("biz-frisch")?.fetchedAt).not.toEqual(JETZT);
    expect(snapshots.has("biz-verwaist")).toBe(false);
    // Die Grenze kommt aus der injizierten Uhr, nicht aus Date.now().
    const filter = prismaMock.business.findMany.mock.calls[0][0].where;
    expect(JSON.stringify(filter)).toContain(new Date(JETZT.getTime() - VERALTET_MS).toISOString());
  });

  it("zählt Fehlschläge nicht mit und macht mit dem nächsten Betrieb weiter", async () => {
    // Der Betrieb verschwindet zwischen Kandidatenliste und Abruf (gelöscht).
    const echt = prismaMock.business.findUniqueOrThrow.getMockImplementation()!;
    prismaMock.business.findUniqueOrThrow.mockImplementation(async (args: any) => {
      if (args.where.id === "biz-ohne-stand") throw new Error("No Business found");
      return echt(args);
    });
    const { umgebung, fetch } = testUmgebung();

    const anzahl = await aktualisiereVeraltetePraesenz({}, umgebung);

    expect(anzahl).toBe(1);
    expect(fetch).toHaveBeenCalledTimes(1);
    expect(snapshots.get("biz-alt")?.fetchedAt).toEqual(JETZT);
  });

  it("deckelt je Lauf und liefert 0 statt zu werfen, wenn die Abfrage scheitert", async () => {
    const { umgebung, fetch } = testUmgebung();
    expect(await aktualisiereVeraltetePraesenz({ limit: 1 }, umgebung)).toBe(1);
    expect(fetch).toHaveBeenCalledTimes(1);

    prismaMock.business.findMany.mockImplementation(async () => {
      throw new Error("The column `PresenceSnapshot.fetchedAt` does not exist");
    });
    await expect(aktualisiereVeraltetePraesenz({}, umgebung)).resolves.toBe(0);
  });
});

/* ── (i) Höchstalter der Places-Inhalte ─────────────────────────────────── */

/*
 * Die Google Maps Platform erlaubt das dauerhafte Speichern von Places-Inhalten
 * nicht, nur die Place-ID darf bleiben. Technische Schadensbegrenzung: Ein Eintrag,
 * der vor mehr als 30 Tagen bei Places abgerufen wurde, wird nicht mehr
 * ausgeliefert und beim nächsten Schreiben verworfen. Ob das den Bedingungen
 * genügt, prüft ein Mensch - diese Tests sichern nur die Mechanik.
 */
describe("Höchstalter der Places-Inhalte (30 Tage)", () => {
  const TAG = 24 * 60 * MINUTE;
  const vor = (ms: number) => new Date(JETZT.getTime() - ms);
  /** So schreibt der Workflow seit dieser Änderung: Abrufzeitpunkt im JSON. */
  const mitAbruf = (abgerufen: Date) => ({ ...ALTER_EINTRAG, abgerufenAt: abgerufen.toISOString() });

  it("ist 30 Tage", () => {
    expect(GOOGLE_HOECHSTALTER_MS).toBe(30 * TAG);
  });

  it("ladePraesenz liefert einen über 30 Tage alten Eintrag nicht mehr - wie ohne Eintrag", async () => {
    snapshot(TOELLER_ID, { status: "bereit", google: mitAbruf(vor(30 * TAG + MINUTE)), placeId: "ChIJ-toeller", fetchedAt: vor(30 * TAG + MINUTE) });

    const mit = await ladePraesenz(TOELLER_ID, testUmgebung().umgebung);
    expect(mit).not.toHaveProperty("google");
    // "bereit" ohne Eintrag gäbe es sonst - der Bericht spräche von Daten, die er nicht zeigt.
    expect(mit.status).toBe("ausstehend");
    expect(mit.hinweis).toBe("Die gespeicherten Google-Daten sind älter als 30 Tage und werden nicht mehr gezeigt.");
    expect(mit.bericht.bewertungen.schnitt).toBeNull();
    expect(mit.bericht.deckung.unbekannt).toContain("rating");

    const ohne = await ladePraesenz(TOELLER_ID, testUmgebung({ schluessel: null }).umgebung);
    expect(ohne.status).toBe("kein_schluessel");
    expect(ohne).not.toHaveProperty("google");

    // Lesen schreibt nicht - verworfen wird beim nächsten Abruf.
    expect(prismaMock.presenceSnapshot.upsert).not.toHaveBeenCalled();
  });

  it("genau 30 Tage alt wird noch ausgeliefert, ohne den internen Zeitstempel", async () => {
    snapshot(TOELLER_ID, { status: "bereit", google: mitAbruf(vor(30 * TAG)), fetchedAt: vor(30 * TAG) });

    const ergebnis = await ladePraesenz(TOELLER_ID, testUmgebung().umgebung);

    expect(ergebnis.status).toBe("bereit");
    expect(ergebnis.google).toEqual(ALTER_EINTRAG);
    expect(ergebnis.google).not.toHaveProperty("abgerufenAt");
  });

  it("zählt den Abrufzeitpunkt im Eintrag, nicht fetchedAt der Zeile", async () => {
    // fetchedAt frisch (ein Lauf ohne Schlüssel vor einer Stunde), der Inhalt aber 31 Tage alt.
    snapshot(TOELLER_ID, { status: "bereit", google: mitAbruf(vor(31 * TAG)), fetchedAt: vor(60 * MINUTE) });
    expect(await ladePraesenz(TOELLER_ID, testUmgebung().umgebung)).not.toHaveProperty("google");

    // Altzeile ohne abgerufenAt: dann entscheidet fetchedAt.
    snapshot(TOELLER_ID, { status: "bereit", google: ALTER_EINTRAG, fetchedAt: vor(31 * TAG) });
    expect(await ladePraesenz(TOELLER_ID, testUmgebung().umgebung)).not.toHaveProperty("google");
    snapshot(TOELLER_ID, { status: "bereit", google: ALTER_EINTRAG, fetchedAt: vor(29 * TAG) });
    expect((await ladePraesenz(TOELLER_ID, testUmgebung().umgebung)).google).toEqual(ALTER_EINTRAG);

    // Ein Abrufzeitpunkt NACH fetchedAt ist kaputt und hielte den Eintrag ewig frisch.
    snapshot(TOELLER_ID, { status: "bereit", google: mitAbruf(new Date(JETZT.getTime() + 365 * TAG)), fetchedAt: vor(31 * TAG) });
    expect(await ladePraesenz(TOELLER_ID, testUmgebung().umgebung)).not.toHaveProperty("google");
  });

  it("ohne Schlüssel verlängert kein Lauf das Alter - nach 30 Tagen fällt der Inhalt weg, die Place-ID bleibt", async () => {
    snapshot(TOELLER_ID, { status: "bereit", google: mitAbruf(vor(29 * TAG)), placeId: "ChIJ-toeller", fetchedAt: vor(60 * MINUTE) });

    const heute = await aktualisierePraesenz(TOELLER_ID, {}, testUmgebung({ schluessel: null }).umgebung);
    expect(heute.google).toEqual(ALTER_EINTRAG);
    expect(snapshots.get(TOELLER_ID)?.google.abgerufenAt).toBe(vor(29 * TAG).toISOString());

    const inZweiTagen = new Date(JETZT.getTime() + 2 * TAG);
    const { umgebung, pruefeWebsite } = testUmgebung({ schluessel: null, jetzt: inZweiTagen });
    const spaeter = await aktualisierePraesenz(TOELLER_ID, {}, umgebung);

    expect(spaeter).not.toHaveProperty("google");
    expect(spaeter.status).toBe("kein_schluessel");
    expect(snapshots.get(TOELLER_ID)).toMatchObject({ google: null, placeId: "ChIJ-toeller", status: "kein_schluessel" });
    // Die Website aus dem verworfenen Eintrag wird nicht mehr geprüft - und die
    // Web-App aus contactInfo ohnehin nicht.
    expect(pruefeWebsite).not.toHaveBeenCalled();
  });

  it("die Drossel liefert einen zu alten Inhalt ebenfalls nicht", async () => {
    snapshot(TOELLER_ID, { status: "bereit", google: mitAbruf(vor(31 * TAG)), fetchedAt: vor(5 * MINUTE) });
    const { umgebung, fetch } = testUmgebung();

    const ergebnis = await aktualisierePraesenz(TOELLER_ID, {}, umgebung);

    expect(fetch).not.toHaveBeenCalled();
    expect(prismaMock.presenceSnapshot.upsert).not.toHaveBeenCalled();
    expect(ergebnis).not.toHaveProperty("google");
    expect(ergebnis.status).toBe("ausstehend");
  });

  it("scheitert Places, bleibt ein zu alter Eintrag weg - gespeichert wird nur die Place-ID", async () => {
    snapshot(TOELLER_ID, { status: "bereit", google: mitAbruf(vor(31 * TAG)), placeId: "ChIJ-toeller", fetchedAt: vor(31 * TAG) });
    const { umgebung } = testUmgebung({ antwort: { http: 500, body: {} } });

    const ergebnis = await aktualisierePraesenz(TOELLER_ID, {}, umgebung);

    expect(ergebnis.status).toBe("fehler");
    expect(ergebnis).not.toHaveProperty("google");
    expect(ergebnis.hinweis).toMatch(/später erneut/);
    expect(snapshots.get(TOELLER_ID)).toMatchObject({ google: null, placeId: "ChIJ-toeller", status: "fehler" });
  });

  it("ein frischer Abruf stempelt JETZT; nicht_gefunden verwirft auch die Place-ID", async () => {
    snapshot(TOELLER_ID, { status: "bereit", google: mitAbruf(vor(31 * TAG)), placeId: "ChIJ-toeller", fetchedAt: vor(31 * TAG) });

    const frisch = await aktualisierePraesenz(TOELLER_ID, {}, testUmgebung().umgebung);
    expect(frisch.google).not.toHaveProperty("abgerufenAt");
    expect(snapshots.get(TOELLER_ID)?.google.abgerufenAt).toBe(JETZT.toISOString());

    const { umgebung } = testUmgebung({ antwort: { places: [] }, jetzt: new Date(JETZT.getTime() + TAG) });
    await aktualisierePraesenz(TOELLER_ID, {}, umgebung);
    expect(snapshots.get(TOELLER_ID)).toMatchObject({ status: "nicht_gefunden", google: null, placeId: null });
  });
});

/* ── (j) Keine Places-Inhalte im Log ────────────────────────────────────── */

describe("Logs ohne Places-Inhalte", () => {
  const INHALTE = ["Bestes Kölsch der Stadt.", "Anna K.", "4.6", "812"];

  it("scheitert das Speichern mit Prisma-Aufrufdump, steht nur der Grund im Log", async () => {
    prismaMock.presenceSnapshot.upsert.mockImplementation(async ({ create }: { create: any }) => {
      // So sieht eine Prisma-Validierungsmeldung aus: der ganze Aufruf samt Werten.
      throw new Error(
        "Invalid `prisma.presenceSnapshot.upsert()` invocation:\n\n{\n  create: " +
          JSON.stringify(create, null, 2) +
          "\n}\n\nArgument `google`: Invalid value provided. Expected InputJsonValue, provided Object.",
      );
    });
    const { umgebung } = testUmgebung();

    await aktualisierePraesenz(TOELLER_ID, {}, umgebung);

    const zeilen = warn.mock.calls.map((c) => String(c[0]));
    const speichern = zeilen.find((z) => z.includes("nicht speicherbar"));
    expect(speichern).toBe(
      "[maitr] PresenceSnapshot nicht speicherbar (Migration eingespielt?): Argument `google`: Invalid value provided. Expected InputJsonValue, provided Object.",
    );
    for (const zeile of zeilen) for (const inhalt of INHALTE) expect(zeile).not.toContain(inhalt);
  });

  it("zitiert eine kaputte Places-Antwort nicht", async () => {
    const { umgebung, fetch } = testUmgebung();
    fetch.mockImplementation(async () => ({
      ok: true,
      status: 200,
      json: async () => {
        throw new SyntaxError(`Unexpected token '<', "<b>Anna K.</b> Bestes Kölsch"... is not valid JSON`);
      },
    }));

    const ergebnis = await aktualisierePraesenz(TOELLER_ID, {}, umgebung);

    expect(ergebnis.status).toBe("fehler");
    const zeile = warn.mock.calls.map((c) => String(c[0])).find((z) => z.includes("Google Places"));
    expect(zeile).toBe(`[maitr] Google Places für Betrieb ${TOELLER_ID} fehlgeschlagen: SyntaxError`);
  });

  it("logGrund: letzte Zeile samt Prisma-Code, Googles Fehlertext bleibt lesbar", () => {
    const tabelle = Object.assign(
      new Error("Invalid `prisma.presenceSnapshot.upsert()` invocation:\n\n\nThe table `public.PresenceSnapshot` does not exist in the current database."),
      { code: "P2021" },
    );
    expect(logGrund(tabelle)).toBe("P2021 The table `public.PresenceSnapshot` does not exist in the current database.");
    expect(logGrund(new Error("Google Places HTTP 403: API key not valid. Please pass a valid API key."))).toBe(
      "Google Places HTTP 403: API key not valid. Please pass a valid API key.",
    );
    expect(logGrund(new TypeError("fetch failed"))).toBe("fetch failed");
    expect(logGrund("x".repeat(500))).toHaveLength(200);
    expect(logGrund(new Error(""))).toBe("Error");
  });
});
