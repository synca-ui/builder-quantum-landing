// @vitest-environment node
/**
 * Globale Fehlerbehandlung für den REST der API — der Beleg für `wrapAsyncLayers`
 * und `globalErrorHandler` aus server/index.ts.
 *
 * DAS PROBLEM
 * server/maitr hat seit dem letzten Commit `asyncHandler` und eine eigene
 * Fehler-Middleware. Alles unter server/routes/ hatte das nicht. Gezählt wurde
 * es, nicht geschätzt: 87 echte async-Handler/Middleware unter server/routes/,
 * davon 85 mit try/catch — aber 9 rufen im CATCH-Block ein `await audit(...)`
 * auf, also genau dort, wo die Datenbank gerade weggebrochen ist. Lehnt dieses
 * zweite Promise ab, fängt es niemand mehr.
 *
 * WARUM DIE FEHLER-MIDDLEWARE ALLEIN NICHTS BEWIRKT
 * Sie sieht nur, was per `next(err)` ankommt. Express 4 ruft `next(err)` aber nur
 * aus seinem eigenen try/catch (`router/layer.js`), und das fängt ausschliesslich
 * SYNCHRONE Würfe. Eine abgelehnte Promise erreicht sie nie. Deshalb prüft dieser
 * Test auf zwei Ebenen:
 *
 *  1. IM TESTPROZESS: die ECHTEN Funktionen an einer kleinen App — Statuscode,
 *     Informationsabfluss, headersSent, Arity, Verschachtelung.
 *  2. IM KINDPROZESS (Block "Prozessüberleben"): das, was sich im Testprozess
 *     nicht ehrlich prüfen lässt — dass der Prozess einen geworfenen Handler
 *     ÜBERLEBT. Ein Exitcode ist nur an einem echten Prozess messbar. Die
 *     NEGATIVKONTROLLE dort lässt dieselbe App ohne `wrapAsyncLayers` laufen und
 *     zeigt, dass sie dann stirbt. Ohne sie würde der Test womöglich nur ein
 *     Express-Verhalten messen, das es ohnehin gäbe.
 *
 * Der Kindprozess lädt die ECHTEN Funktionen aus server/index.ts. Damit das keine
 * Verbindung zur Produktionsdatenbank aufbaut, bekommt er DATABASE_URL auf eine
 * Sackgasse gesetzt — Prisma verbindet erst bei der ersten Abfrage, und die
 * stellt dort niemand.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import express from "express";
import request from "supertest";
import { execFile } from "node:child_process";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { promisify } from "node:util";

import { createServer, globalErrorHandler, wrapAsyncLayers } from "../index";

/** Die Meldung, die eine echte Prisma-Störung mitbringt — inklusive Innereien. */
const DB_FEHLER =
  'Invalid `prisma.configuration.findMany()` invocation in /srv/app/server/routes/configurations.ts:132 ' +
  "Can't reach database server at ep-bitter-silence-agivv2j7-pooler.eu-central-1.aws.neon.tech:5432";

let logSpy: ReturnType<typeof vi.spyOn>;

beforeEach(() => {
  // Die Fehler-Middleware protokolliert absichtlich laut. Ohne das Abfangen wäre
  // die Testausgabe voller echter Stacktraces — und wir könnten nicht prüfen,
  // DASS protokolliert wurde.
  logSpy = vi.spyOn(console, "error").mockImplementation(() => {});
});

afterEach(() => {
  logSpy.mockRestore();
});

/**
 * Baut eine App, deren Routen GENAU SO registriert sind wie unter server/routes/:
 * blanke async-Handler, kein Wächter, kein try/catch. Danach läuft die echte
 * `wrapAsyncLayers` über die fertige Routentabelle — dieselbe Reihenfolge wie in
 * `createServer`.
 */
function appWieDieEchte(opts: { umhuellen: boolean } = { umhuellen: true }) {
  const app = express();
  app.use(express.json());

  const api = express.Router();
  api.use(async (_req, _res, next) => {
    next();
  });
  api.get("/boom", async () => {
    throw new Error(DB_FEHLER);
  });
  api.get("/gesund", async (_req, res) => {
    res.json({ ok: true });
  });
  api.get("/mit-status", async () => {
    // body-parser hängt seine Statuscodes genauso an den Fehler.
    throw Object.assign(new Error("kaputte Eingabe"), { status: 400 });
  });
  api.get("/mit-5xx", async () => {
    throw Object.assign(new Error(DB_FEHLER), { status: 503 });
  });
  api.get("/halb", async (_req, res) => {
    // Antwort hat begonnen (Header raus, erster Brocken geschrieben), DANN bricht
    // es. Ein zweites res.status() würde "Cannot set headers after they are sent"
    // werfen — mitten in der Fehlerbehandlung.
    res.status(200).write("teil-1");
    throw new Error(DB_FEHLER);
  });

  // Verschachtelter Unterrouter: apiRouter hängt seinerseits Router ein.
  const tief = express.Router();
  tief.get("/tief", async () => {
    throw new Error(DB_FEHLER);
  });
  api.use("/n", tief);

  app.use("/api", api);

  if (opts.umhuellen) {
    wrapAsyncLayers((app as unknown as { _router?: { stack?: unknown[] } })._router as never);
  }
  app.use(globalErrorHandler);
  return app;
}

describe("Ein geworfener async-Handler wird zu 500 statt zu einem toten Server", () => {
  it("GET /api/boom → 500", async () => {
    const res = await request(appWieDieEchte()).get("/api/boom");
    expect(res.status).toBe(500);
    expect(res.body).toEqual({ error: "Interner Serverfehler" });
  });

  it("auch durch einen VERSCHACHTELTEN Unterrouter hindurch", async () => {
    // Der apiRouter hängt selbst Router ein (dashboard, maitr, public …). Ein
    // Durchlauf, der nur die erste Ebene abklappert, hätte hier nichts bewirkt.
    const res = await request(appWieDieEchte()).get("/api/n/tief");
    expect(res.status).toBe(500);
  });

  it("die gesunde Route bleibt unberührt", async () => {
    // Gegenprobe: Die Umhüllung darf den Normalfall nicht verändern.
    const res = await request(appWieDieEchte()).get("/api/gesund");
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ ok: true });
  });
});

describe("Die Antwort verrät nichts über das Innenleben", () => {
  it("kein Stacktrace, keine Datenbankmeldung, keine Pfade", async () => {
    const res = await request(appWieDieEchte()).get("/api/boom");

    const koerper = JSON.stringify(res.body) + res.text;
    // Jeder Baustein wäre Aufklärungsmaterial: Hostname der Datenbank,
    // Verzeichnisstruktur des Servers, Prisma-Aufrufe.
    for (const geheim of [
      "prisma",
      "neon.tech",
      "ep-bitter-silence",
      "5432",
      "/srv/app",
      "configurations.ts",
      "at Object.",
      "Error:",
    ]) {
      expect(koerper.toLowerCase()).not.toContain(geheim.toLowerCase());
    }
  });

  it("protokolliert dafür serverseitig MIT Methode und Pfad", async () => {
    await request(appWieDieEchte()).get("/api/boom");

    const zeilen = logSpy.mock.calls.map((c) => c.join(" ")).join("\n");
    // Ein Stacktrace ohne Zuordnung ist beim Nachforschen wertlos.
    expect(zeilen).toContain("GET");
    expect(zeilen).toContain("/api/boom");
    expect(zeilen).toContain(DB_FEHLER);
  });
});

describe("globalErrorHandler: Feinheiten, an denen es sonst still bricht", () => {
  it("hat vier Parameter — sonst erkennt Express sie gar nicht als Fehler-Middleware", () => {
    // layer.js: `if (fn.length !== 4) return next(error)`. Bei drei Parametern
    // wäre das hier eine normale Middleware, die im Fehlerfall nie liefe.
    expect(globalErrorHandler.length).toBe(4);
  });

  it("behält einen 4xx-Status des Fehlers bei", async () => {
    // Sonst würde aus dem 400 für kaputtes JSON ein 500: Das sagt dem Client
    // fälschlich "mein Fehler" und nimmt ihm die Chance, seine Anfrage zu
    // korrigieren.
    const res = await request(appWieDieEchte()).get("/api/mit-status");
    expect(res.status).toBe(400);
    expect(res.body).toEqual({ error: "Ungültige Anfrage" });
  });

  it("verdichtet einen 5xx-Status dagegen auf 500", async () => {
    // 5xx heisst "innen ist etwas gebrochen". Welcher Teil, geht den Client
    // nichts an — 503 verriete, dass ein nachgelagerter Dienst gerade fehlt.
    const res = await request(appWieDieEchte()).get("/api/mit-5xx");
    expect(res.status).toBe(500);
    expect(res.body).toEqual({ error: "Interner Serverfehler" });
  });

  it("schreibt keine Header mehr, wenn die Antwort schon läuft", async () => {
    const abbruch = await request(appWieDieEchte())
      .get("/api/halb")
      .then(() => null, (e: Error) => e);

    // Erwartet ist ein ABGEBROCHENER Abruf: headersSent ist true, die Middleware
    // reicht an next(err) weiter, und Express' finalhandler zerstört den Socket.
    // Für den Client ist das die richtige Auskunft — er wartet nicht ewig auf den
    // Rest eines Rumpfes, der nie kommt.
    expect(abbruch).toBeInstanceOf(Error);
    expect(String((abbruch as Error).message)).toContain("aborted");

    const zeilen = logSpy.mock.calls.flat().join(" ");
    expect(zeilen).toContain(DB_FEHLER);
    // Die Fehlerbehandlung ist nicht ihrerseits an doppelten Headern gescheitert.
    expect(zeilen).not.toContain("Cannot set headers");
  });
});

describe("wrapAsyncLayers: was es anfassen darf und was nicht", () => {
  it("lässt eine Fehler-Middleware mit vier Parametern in Ruhe", () => {
    // Eine Umhüllung hat drei Parameter. Würde sie eine Fehler-Middleware
    // umhüllen, machte sie daraus eine normale — der maitrErrorHandler, der im
    // maitrRouter hängt, wäre damit still ausser Betrieb.
    const app = express();
    const fehlerMw = (_e: unknown, _r: unknown, _s: unknown, _n: unknown) => {};
    app.use(fehlerMw);

    wrapAsyncLayers((app as unknown as { _router?: never })._router);

    const stack = (app as unknown as { _router: { stack: { handle: { length: number } }[] } })
      ._router.stack;
    const letzte = stack[stack.length - 1];
    expect(letzte.handle.length).toBe(4);
    expect(letzte.handle).toBe(fehlerMw);
  });

  it("lässt eingehängten Unterroutern ihr .stack — sonst bricht apiContract.spec.ts", () => {
    // Der Vertragstest findet Routen über `layer.handle?.stack`. Würde ein
    // Unterrouter umhüllt statt durchlaufen, wäre diese Eigenschaft weg und der
    // Test fände keine einzige Route mehr — er würde still grün bleiben.
    const app = express();
    const sub = express.Router();
    sub.get("/x", async (_req, res) => {
      res.json({ ok: true });
    });
    app.use("/api", sub);

    wrapAsyncLayers((app as unknown as { _router?: never })._router);

    const stack = (app as unknown as { _router: { stack: { handle?: { stack?: unknown[] } }[] } })
      ._router.stack;
    const subLayer = stack.find((l) => Array.isArray(l.handle?.stack));
    expect(subLayer).toBeDefined();
    expect(Array.isArray(subLayer!.handle!.stack)).toBe(true);
  });

  it("ist idempotent: ein zweiter Durchlauf umhüllt nichts mehr", () => {
    // `createServer` läuft in Tests mehrfach. Ohne den Marker läge am Ende eine
    // Umhüllung um die Umhüllung um die Umhüllung.
    const app = express();
    const sub = express.Router();
    sub.get("/x", async (_req, res) => {
      res.json({ ok: true });
    });
    app.use("/api", sub);

    const ersterLauf = wrapAsyncLayers((app as unknown as { _router?: never })._router);
    const zweiterLauf = wrapAsyncLayers((app as unknown as { _router?: never })._router);

    expect(ersterLauf).toBeGreaterThan(0);
    expect(zweiterLauf).toBe(0);
  });
});

describe("Die ECHTE App aus createServer ist tatsächlich verdrahtet", () => {
  /** Zählt Handler in der echten Routentabelle, die den Marker tragen. */
  function zaehleGesichert(traeger: any): { gesamt: number; gesichert: number } {
    let gesamt = 0;
    let gesichert = 0;
    for (const layer of traeger?.stack ?? []) {
      if (layer.route) {
        const t = zaehleGesichert(layer.route);
        gesamt += t.gesamt;
        gesichert += t.gesichert;
        continue;
      }
      const h = layer.handle;
      if (typeof h !== "function") continue;
      if (Array.isArray(h.stack)) {
        const t = zaehleGesichert(h);
        gesamt += t.gesamt;
        gesichert += t.gesichert;
        continue;
      }
      if (h.length === 4) continue;
      gesamt++;
      if (h.__asyncGesichert) gesichert++;
    }
    return { gesamt, gesichert };
  }

  it("jeder Handler der echten Routentabelle trägt den Marker", () => {
    // Beweist, dass der Aufruf in createServer wirklich läuft und die ganze
    // Tabelle erreicht — nicht nur die kleine Test-App oben.
    const { gesamt, gesichert } = zaehleGesichert(
      (createServer() as unknown as { _router?: unknown })._router,
    );

    expect(gesamt).toBeGreaterThan(100);
    expect(gesichert).toBe(gesamt);
  });

  it("das Routing ist unversehrt: GET /api/ping antwortet weiter", async () => {
    // Gegenprobe gegen die eigene Änderung: Ein Durchlauf, der Handler falsch
    // ersetzt, würde hier sofort auffallen.
    const res = await request(createServer()).get("/api/ping");
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty("message");
  });

  it("kaputtes JSON gibt 400 als JSON zurück statt HTML mit Ausnahmemeldung", async () => {
    // Vorher gemessen: Express' finalhandler lieferte hier eine HTML-Seite mit
    // "<pre>SyntaxError: Expected property name …" — also die Ausnahmemeldung
    // direkt an den Client. Der Status 400 muss dabei erhalten bleiben.
    const res = await request(createServer())
      .post("/api/demo")
      .set("content-type", "application/json")
      .send("{kaputt");

    expect(res.status).toBe(400);
    expect(res.text).not.toContain("<!DOCTYPE html>");
    expect(res.text).not.toContain("SyntaxError");
    expect(res.body).toEqual({ error: "Ungültige Anfrage" });
  });
});

/* ── Prozessüberleben: der eigentliche Kern ──────────────────────────────── */

const execFileAsync = promisify(execFile);

/**
 * Führt ein kleines Express-Programm in einem ECHTEN Kindprozess aus. Nur so ist
 * "der Prozess lebt noch" messbar — ein Exitcode existiert im Testprozess nicht.
 */
async function imKindprozess(quelltext: string) {
  // Das Programm muss INNERHALB des Repos liegen: Node sucht `express` über die
  // Elternverzeichnisse der Datei. Aus /tmp heraus gäbe es kein node_modules und
  // der Kindprozess stürbe am Import statt am Testfall. `node_modules/` ist
  // ausserdem ohne Zutun aus der Versionsverwaltung heraus.
  const verzeichnis = await mkdtemp(
    path.join(process.cwd(), "node_modules", ".api-fehlertest-"),
  );
  const datei = path.join(verzeichnis, "probe.ts");
  await writeFile(datei, quelltext, "utf8");
  try {
    const { stdout } = await execFileAsync("npx", ["tsx", datei], {
      cwd: process.cwd(),
      timeout: 90_000,
      env: {
        ...process.env,
        // Sackgasse statt Produktivdatenbank. server/index.ts zieht über die
        // Routen Prisma mit, und server/db/prisma.ts WIRFT ohne DATABASE_URL.
        // Verbunden wird erst bei der ersten Abfrage — die stellt hier niemand.
        DATABASE_URL: "postgresql://niemand:niemand@127.0.0.1:1/nix?schema=public",
      },
    });
    return { code: 0, stdout, stderr: "" };
  } catch (err) {
    const e = err as { code?: number; stdout?: string; stderr?: string };
    return { code: e.code ?? -1, stdout: e.stdout ?? "", stderr: e.stderr ?? "" };
  } finally {
    await rm(verzeichnis, { recursive: true, force: true });
  }
}

/**
 * Gemeinsamer Rumpf. `umhuellen` schaltet GENAU EINE Zeile um — den Aufruf von
 * `wrapAsyncLayers`. Alles andere, auch die Fehler-Middleware, ist in beiden
 * Läufen identisch. Damit misst die Negativkontrolle wirklich nur diese Zeile.
 */
function probe(umhuellen: boolean) {
  const indexPfad = JSON.stringify(path.resolve(process.cwd(), "server/index.ts"));
  return `
import express from "express";
import http from "node:http";
import { wrapAsyncLayers, globalErrorHandler } from ${indexPfad};

const app = express();
const api = express.Router();
// Genau so registriert wie unter server/routes/: blanker async-Handler.
api.get("/boom", async () => { throw new Error("prisma ist explodiert"); });
api.get("/gesund", async (_req, res) => { res.json({ ok: true }); });
app.use("/api", api);

${umhuellen ? "wrapAsyncLayers((app as any)._router);" : "/* KEINE Umhuellung */"}
app.use(globalErrorHandler);

const srv = app.listen(0, () => {
  const port = (srv.address() as any).port;
  http.get({ port, path: "/api/boom" }, (res) => {
    res.resume();
    res.on("end", () => {
      // Erst NACH der Antwort prüfen, ob der Prozess noch lebt UND arbeitet:
      // eine zweite, gesunde Anfrage.
      setTimeout(() => {
        http.get({ port, path: "/api/gesund" }, (res2) => {
          res2.resume();
          res2.on("end", () => {
            console.log("ERGEBNIS:" + JSON.stringify({
              status: res.statusCode, zweite: res2.statusCode, lebtNoch: true,
            }));
            process.exit(0);
          });
        });
      }, 150);
    });
  }).on("error", (e) => {
    console.log("ERGEBNIS:" + JSON.stringify({ status: null, fehler: (e as any).code }));
    process.exit(0);
  });
});
`;
}

describe("Prozessüberleben (echter Kindprozess, echte Funktionen)", () => {
  it("MIT wrapAsyncLayers: der Client bekommt 500 UND der Prozess bedient weiter", async () => {
    const ergebnis = await imKindprozess(probe(true));

    expect(ergebnis.stdout).toContain("ERGEBNIS:");
    const daten = JSON.parse(ergebnis.stdout.split("ERGEBNIS:")[1].split("\n")[0]);
    expect(daten.status).toBe(500);
    // Die zweite Anfrage beweist mehr als ein blosses "Prozess lebt": Der Server
    // nimmt nach dem Fehler noch Verbindungen an und beantwortet sie.
    expect(daten.zweite).toBe(200);
    expect(daten.lebtNoch).toBe(true);
    expect(ergebnis.code).toBe(0);
  }, 120_000);

  it("OHNE wrapAsyncLayers: der Prozess stirbt und der Client bekommt NICHTS", async () => {
    // NEGATIVKONTROLLE. Sie belegt zweierlei: dass der Test oben tatsächlich die
    // Umhüllung misst und nicht bloss ein Express-Verhalten, das es ohnehin gäbe
    // — und dass die Fehler-Middleware ALLEIN nichts bewirkt. Sie hängt in diesem
    // Lauf ja mit drin und wird trotzdem nie erreicht.
    const ergebnis = await imKindprozess(probe(false));

    // Node beendet bei unbehandelter Ablehnung mit Code 1 ...
    expect(ergebnis.code).toBe(1);
    // ... und die Fehler-Middleware wurde nie erreicht: keine Antwort, keine Ausgabe.
    expect(ergebnis.stdout).not.toContain("ERGEBNIS:");
    expect(ergebnis.stderr).toContain("prisma ist explodiert");
  }, 120_000);
});
