// @vitest-environment node
/**
 * Fehlerbehandlung der Maitr-API — der Beleg für `asyncHandler` + `maitrErrorHandler`.
 *
 * DAS PROBLEM (gegen express@4.22.1 / Node 22.21.1 selbst nachgemessen):
 * Express 4 umschliesst Handler-Aufrufe mit try/catch (`router/layer.js`), fängt damit
 * aber nur SYNCHRONE Würfe. Eine `async`-Funktion kehrt sofort mit einem Promise
 * zurück; lehnt es später ab, ist das try/catch längst verlassen. Ergebnis ohne
 * Gegenmassnahme: unbehandelte Ablehnung → Node beendet den Prozess mit Code 1 →
 * die GESAMTE API ist weg, und der auslösende Client bekommt nie eine Antwort.
 * `server/maitr/routes.ts` hatte 9 async-Handler und genau einen try-Block.
 *
 * Die Prüfung läuft auf zwei Ebenen, und das hat einen Grund:
 *
 *  1. IM TESTPROZESS (unten, mit gemocktem Prisma): prüft die ECHTEN Routen und die
 *     ECHTE Fehler-Middleware — Statuscode, Informationsabfluss, headersSent.
 *  2. IM KINDPROZESS (Block "Prozessüberleben"): prüft das, was sich im Testprozess
 *     nicht ehrlich prüfen lässt — dass der Prozess einen geworfenen Handler ÜBERLEBT.
 *     Ein Exitcode ist nur an einem echten Prozess messbar. Dort wird bewusst NUR
 *     `asyncHandler` importiert (die Datei hat keine Abhängigkeiten): ein Import von
 *     `server/maitr/index.ts` zieht Prisma mit und baut eine echte Verbindung zur
 *     Produktionsdatenbank auf — das darf ein Test niemals tun.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import express from "express";
import request from "supertest";
import { execFile } from "node:child_process";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { promisify } from "node:util";

const { prismaMock } = vi.hoisted(() => ({
  prismaMock: {
    businessMember: { findUnique: vi.fn(), findMany: vi.fn() },
    reservation: { findMany: vi.fn(), create: vi.fn(), updateMany: vi.fn() },
    table: { findFirst: vi.fn() },
    insightsCache: { findUnique: vi.fn(), upsert: vi.fn() },
    channelConnection: { findMany: vi.fn(), upsert: vi.fn() },
    business: { findUnique: vi.fn() },
  },
}));
vi.mock("../db/prisma", () => ({ default: prismaMock, prisma: prismaMock }));

import { asyncHandler } from "../maitr/asyncHandler";
import { maitrErrorHandler } from "../maitr/index";
import { reservationsRouter, venuesRouter } from "../maitr/routes";

const ICH = "user-wirt";
const MEIN_BETRIEB = "biz-goldstueck";

/** Die Meldung, die eine echte Prisma-Störung mitbringt — inklusive Innereien. */
const DB_FEHLER =
  'Invalid `prisma.reservation.findMany()` invocation in /srv/app/server/maitr/routes.ts:71 ' +
  "Can't reach database server at ep-bitter-silence-agivv2j7-pooler.eu-central-1.aws.neon.tech:5432";

/** Mini-App wie in maitrReservations.spec.ts: angemeldet, aber ohne echtes Clerk-Token. */
function appAlsAngemeldet() {
  const app = express();
  app.use(express.json());
  app.use((req, _res, next) => {
    (req as express.Request & { userId?: string }).userId = ICH;
    next();
  });
  app.use("/reservations", reservationsRouter);
  app.use("/venues", venuesRouter);
  // Genau wie in server/maitr/index.ts: die Fehler-Middleware ganz zum Schluss.
  app.use(maitrErrorHandler);
  return app;
}

/**
 * Fängt `console.error` ab. Die Fehler-Middleware protokolliert absichtlich laut —
 * ohne das hier wäre die Testausgabe voller echter Stacktraces, und wir könnten
 * nicht prüfen, DASS protokolliert wurde.
 */
let logSpy: ReturnType<typeof vi.spyOn>;

beforeEach(() => {
  vi.clearAllMocks();
  logSpy = vi.spyOn(console, "error").mockImplementation(() => {});
  prismaMock.businessMember.findUnique.mockImplementation(
    async ({ where }: { where: { userId_businessId: { userId: string; businessId: string } } }) =>
      where.userId_businessId.userId === ICH &&
      where.userId_businessId.businessId === MEIN_BETRIEB
        ? { userId: ICH, businessId: MEIN_BETRIEB }
        : null,
  );
});

afterEach(() => {
  logSpy.mockRestore();
});

describe("Ein geworfener async-Handler wird zu 500 statt zu einem toten Server", () => {
  it("GET /reservations/day → 500, wenn die Datenbank wegbricht", async () => {
    prismaMock.reservation.findMany.mockRejectedValue(new Error(DB_FEHLER));

    const res = await request(appAlsAngemeldet())
      .get("/reservations/day")
      .query({ venueId: MEIN_BETRIEB, date: "2026-08-04" });

    // Ohne asyncHandler käme hier gar keine Antwort an — die Anfrage liefe in den
    // Timeout, während der Prozess stirbt.
    expect(res.status).toBe(500);
  });

  it("GET /venues → 500 (Handler ohne vorgelagerte Middleware)", async () => {
    prismaMock.businessMember.findMany.mockRejectedValue(new Error(DB_FEHLER));

    const res = await request(appAlsAngemeldet()).get("/venues");

    expect(res.status).toBe(500);
  });

  it("auch die async-MIDDLEWARE ist abgesichert, nicht nur die Handler", async () => {
    // requireVenueAccess fragt selbst Prisma. Bricht die Abfrage dort weg, lag der
    // Fehler bisher genauso frei - deshalb wird die Middleware in routes.ts als
    // `venueGuard` (= asyncHandler(requireVenueAccess)) eingebunden.
    prismaMock.businessMember.findUnique.mockRejectedValue(new Error(DB_FEHLER));

    const res = await request(appAlsAngemeldet())
      .get("/reservations/day")
      .query({ venueId: MEIN_BETRIEB, date: "2026-08-04" });

    expect(res.status).toBe(500);
  });
});

describe("Die 500-Antwort verrät nichts über das Innenleben", () => {
  it("kein Stacktrace, keine Datenbankmeldung, keine Pfade", async () => {
    prismaMock.reservation.findMany.mockRejectedValue(new Error(DB_FEHLER));

    const res = await request(appAlsAngemeldet())
      .get("/reservations/day")
      .query({ venueId: MEIN_BETRIEB, date: "2026-08-04" });

    const koerper = JSON.stringify(res.body) + res.text;
    // Jeder dieser Bausteine wäre Aufklärungsmaterial für einen Angreifer:
    // Hostname der Datenbank, Verzeichnisstruktur des Servers, Prisma-Aufrufe.
    for (const geheim of [
      "prisma",
      "neon.tech",
      "ep-bitter-silence",
      "5432",
      "/srv/app",
      "routes.ts",
      "at Object.",
      "Error:",
    ]) {
      expect(koerper.toLowerCase()).not.toContain(geheim.toLowerCase());
    }
    expect(res.body).toEqual({ error: "Interner Serverfehler" });
  });

  it("protokolliert den Fehler dafür serverseitig MIT Zusammenhang", async () => {
    prismaMock.reservation.findMany.mockRejectedValue(new Error(DB_FEHLER));

    await request(appAlsAngemeldet())
      .get("/reservations/day")
      .query({ venueId: MEIN_BETRIEB, date: "2026-08-04" });

    const zeilen = logSpy.mock.calls.map((c) => c.join(" ")).join("\n");
    // Methode und Pfad müssen mit ins Log - ein Stacktrace ohne Zuordnung ist
    // beim Nachforschen wertlos.
    expect(zeilen).toContain("GET");
    expect(zeilen).toContain("/reservations/day");
    expect(zeilen).toContain(DB_FEHLER);
  });
});

describe("maitrErrorHandler: Feinheiten, an denen es sonst still bricht", () => {
  it("hat vier Parameter - sonst erkennt Express sie gar nicht als Fehler-Middleware", () => {
    // layer.js: `if (fn.length > 3) return next()`. Bei drei Parametern wäre das
    // hier eine normale Middleware, die im Fehlerfall nie aufgerufen wird.
    expect(maitrErrorHandler.length).toBe(4);
  });

  it("schreibt keine Header mehr, wenn die Antwort schon läuft", async () => {
    const app = express();
    app.get(
      "/halb",
      asyncHandler(async (_req, res) => {
        // Antwort hat begonnen (Header raus, erster Brocken geschrieben), DANN
        // bricht es. Ein zweites res.status() würde hier "Cannot set headers
        // after they are sent" werfen - mitten in der Fehlerbehandlung.
        res.status(200).write("teil-1");
        throw new Error(DB_FEHLER);
      }),
    );
    app.use(maitrErrorHandler);

    const abbruch = await request(app)
      .get("/halb")
      .then(() => null, (e: Error) => e);

    // Erwartet ist ein ABGEBROCHENER Abruf: headersSent ist true, die Middleware
    // reicht an next(err) weiter, und Express' finalhandler zerstört daraufhin den
    // Socket. Für den Client ist das die richtige Auskunft - er wartet nicht ewig
    // auf den Rest eines Rumpfes, der nie kommt.
    expect(abbruch).toBeInstanceOf(Error);
    expect(String((abbruch as Error).message)).toContain("aborted");

    const zeilen = logSpy.mock.calls.flat().join(" ");
    // Protokolliert wurde trotzdem ...
    expect(zeilen).toContain(DB_FEHLER);
    // ... und die Fehlerbehandlung ist nicht ihrerseits an doppelten Headern
    // gescheitert. Genau davor schützt die headersSent-Abfrage.
    expect(zeilen).not.toContain("Cannot set headers");
  });
});

describe("asyncHandler: die Weitergabe an next()", () => {
  function fakeReq() {
    return { method: "GET", originalUrl: "/x" } as unknown as express.Request;
  }

  it("reicht den Fehler unverändert an next() weiter", async () => {
    const fehler = new Error("kaputt");
    const next = vi.fn();

    await asyncHandler(async () => {
      throw fehler;
    })(fakeReq(), {} as express.Response, next);

    expect(next).toHaveBeenCalledWith(fehler);
  });

  it("macht aus einer Ablehnung OHNE Grund trotzdem einen echten Fehler", async () => {
    // Der Fallstrick: next(undefined) heisst für Express "weiter zur nächsten
    // Route", NICHT "Fehler". Die Anfrage liefe still bis zum 404 durch, statt
    // in der Fehler-Middleware zu landen.
    const next = vi.fn();

    await asyncHandler(() => Promise.reject(undefined))(
      fakeReq(),
      {} as express.Response,
      next,
    );

    expect(next).toHaveBeenCalledTimes(1);
    const [uebergeben] = next.mock.calls[0];
    expect(uebergeben).toBeInstanceOf(Error);
    expect(uebergeben).toBeTruthy();
  });

  it("ruft next() NICHT auf, wenn der Handler durchläuft", async () => {
    const next = vi.fn();

    await asyncHandler(async () => "fertig")(fakeReq(), {} as express.Response, next);

    expect(next).not.toHaveBeenCalled();
  });
});

/* ── Prozessüberleben: der eigentliche Kern ──────────────────────────────── */

const execFileAsync = promisify(execFile);

/**
 * Führt ein kleines Express-Programm in einem ECHTEN Kindprozess aus und gibt
 * zurück, was dabei herauskam. Nur so ist "der Prozess lebt noch" messbar.
 */
async function imKindprozess(quelltext: string) {
  // Das Programm muss INNERHALB des Repos liegen: Node sucht `express` über die
  // Elternverzeichnisse der Datei. Aus /tmp heraus gäbe es kein node_modules und
  // der Kindprozess stürbe am Import statt am Testfall. `node_modules/` ist
  // ausserdem ohne Zutun aus der Versionsverwaltung heraus.
  const verzeichnis = await mkdtemp(
    path.join(process.cwd(), "node_modules", ".maitr-fehlertest-"),
  );
  const datei = path.join(verzeichnis, "probe.ts");
  await writeFile(datei, quelltext, "utf8");
  try {
    const { stdout } = await execFileAsync("npx", ["tsx", datei], {
      cwd: process.cwd(),
      timeout: 60_000,
    });
    return { code: 0, stdout, stderr: "" };
  } catch (err) {
    const e = err as { code?: number; stdout?: string; stderr?: string };
    return { code: e.code ?? -1, stdout: e.stdout ?? "", stderr: e.stderr ?? "" };
  } finally {
    await rm(verzeichnis, { recursive: true, force: true });
  }
}

/** Gemeinsamer Rumpf: Server starten, /boom abrufen, Ergebnis als JSON ausgeben. */
function probe(routeAufbau: string) {
  return `
import express from "express";
import http from "node:http";
import { asyncHandler } from ${JSON.stringify(path.resolve(process.cwd(), "server/maitr/asyncHandler.ts"))};

const app = express();
${routeAufbau}

const srv = app.listen(0, () => {
  const port = (srv.address() as any).port;
  http.get({ port, path: "/boom" }, (res) => {
    res.resume();
    res.on("end", () => {
      // Erst NACH der Antwort prüfen, ob der Prozess noch lebt und arbeitet.
      setTimeout(() => {
        console.log("ERGEBNIS:" + JSON.stringify({ status: res.statusCode, lebtNoch: true }));
        process.exit(0);
      }, 150);
    });
  }).on("error", (e) => {
    console.log("ERGEBNIS:" + JSON.stringify({ status: null, fehler: (e as any).code }));
    process.exit(0);
  });
});
`;
}

describe("Prozessüberleben (echter Kindprozess)", () => {
  it("MIT asyncHandler: der Client bekommt 500 UND der Prozess lebt weiter", async () => {
    const ergebnis = await imKindprozess(
      probe(`
app.get("/boom", asyncHandler(async () => {
  throw new Error("prisma ist explodiert");
}));
// Vier Parameter, wie maitrErrorHandler. (Die ECHTE Middleware wird oben im
// Testprozess geprüft - hier nicht importierbar, weil server/maitr/index.ts
// Prisma mitzieht und eine echte DB-Verbindung aufbauen würde.)
app.use((err: unknown, _req: any, res: any, next: any) => {
  if (res.headersSent) return next(err);
  res.status(500).json({ error: "Interner Serverfehler" });
});
`),
    );

    expect(ergebnis.stdout).toContain("ERGEBNIS:");
    const daten = JSON.parse(ergebnis.stdout.split("ERGEBNIS:")[1].split("\n")[0]);
    expect(daten.status).toBe(500);
    expect(daten.lebtNoch).toBe(true);
    // Sauber beendet - kein Absturz.
    expect(ergebnis.code).toBe(0);
  }, 90_000);

  it("OHNE asyncHandler: der Prozess stirbt und der Client bekommt NICHTS", async () => {
    // Negativkontrolle. Sie belegt, dass der Test oben tatsächlich den Wrapper misst
    // und nicht bloss ein Express-Verhalten, das es ohnehin schon gäbe.
    const ergebnis = await imKindprozess(
      probe(`
app.get("/boom", async () => {
  throw new Error("prisma ist explodiert");
});
app.use((err: unknown, _req: any, res: any, next: any) => {
  if (res.headersSent) return next(err);
  res.status(500).json({ error: "Interner Serverfehler" });
});
`),
    );

    // Node beendet bei unbehandelter Ablehnung mit Code 1 ...
    expect(ergebnis.code).toBe(1);
    // ... und die Fehler-Middleware wurde nie erreicht: keine Antwort, keine Ausgabe.
    expect(ergebnis.stdout).not.toContain("ERGEBNIS:");
    expect(ergebnis.stderr).toContain("prisma ist explodiert");
  }, 90_000);
});
