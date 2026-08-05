/**
 * Maitr-Backend — Router-Zusammenbau.
 *
 * Mountbar unter `/api/maitr` in der bestehenden Express-App (siehe README).
 * Reihenfolge ist sicherheitsrelevant: öffentliche Routen (Gastprofil, OAuth-
 * Callback) zuerst, danach die Auth-Schranke, danach alles Venue-scoped.
 *
 * Der Meta-Webhook wird NICHT hier gemountet, sondern über `registerMaitrWebhooks`
 * VOR dem globalen `express.json` - sonst konsumiert der JSON-Parser den Body und die
 * HMAC-Signaturprüfung bekäme ein Objekt statt des Rohbodys (Signatur schlüge fehl).
 */
import express, { Router, type Express, type NextFunction, type Request, type Response } from "express";
import { requireAuth } from "../middleware/auth";
import {
  briefingRouter,
  integrationsRouter,
  publicRouter,
  reservationsRouter,
  venuesRouter,
} from "./routes";
import { metaVerifyChallenge, verifyMetaSignature } from "./security";

export const maitrRouter = Router();

// 1) Öffentlich (kein Auth): Gastprofil + OAuth-Callback (durch signierten state geschützt).
maitrRouter.use(publicRouter);

// 2) Ab hier authentifiziert (Clerk-Bearer). Venue-Zugriff prüft jede Route selbst.
maitrRouter.use(requireAuth);
maitrRouter.use("/venues", venuesRouter);
maitrRouter.use("/reservations", reservationsRouter);
maitrRouter.use("/briefing", briefingRouter);
maitrRouter.use("/integrations", integrationsRouter);

/**
 * Fehler-Middleware des Maitr-Routers. MUSS als Letztes am Router hängen — Express
 * arbeitet die Schichten der Reihe nach ab und erreicht sie nur über `next(err)`
 * aus einer davor liegenden Schicht.
 *
 * Bewusst AM ROUTER und nicht global: Der Maitr-Router ist ein in sich
 * geschlossener Baustein und bringt seine Fehlerbehandlung selbst mit; die
 * restliche App behält ihr bisheriges Verhalten unverändert. Wird der Router
 * anderswo gemountet, wandert der Schutz mit.
 *
 * Die vier Argumente sind NICHT kosmetisch. Express unterscheidet normale von
 * Fehler-Middleware ausschliesslich an `fn.length`: `layer.js` prüft
 * `if (fn.length > 3) return next()` und überspringt die Funktion im normalen
 * Ablauf. Verschwindet der vierte Parameter `next` (etwa weil ihn jemand als
 * ungenutzt streicht), ist das hier still eine ganz gewöhnliche Middleware, die
 * nie aufgerufen wird — und der Schutz ist lautlos weg.
 */
export function maitrErrorHandler(
  err: unknown,
  req: Request,
  res: Response,
  next: NextFunction,
): void {
  // Serverseitig mit Zusammenhang protokollieren: ohne Methode und Pfad ist ein
  // Stacktrace im Log nicht zuzuordnen. Das ist die EINZIGE Stelle, an der die
  // Einzelheiten auftauchen dürfen.
  console.error(
    `[maitr] Unbehandelter Fehler bei ${req.method} ${req.originalUrl}:`,
    err instanceof Error ? err.stack : err,
  );

  // Läuft die Antwort schon, sind die Header raus — ein zweites res.status()
  // würde nur "Cannot set headers after they are sent" werfen. An Express
  // weiterreichen: Dessen finalhandler erkennt den Fall und zerstört den Socket,
  // damit der Client nicht ewig auf den Rest eines halben Bodys wartet.
  if (res.headersSent) {
    next(err);
    return;
  }

  // Dem Client bewusst NICHTSSAGEND antworten. Kein Stacktrace, keine
  // Datenbankmeldung, keine Dateipfade: Prisma-Fehler nennen Tabellen-, Spalten-
  // und Constraint-Namen, Stacktraces nennen die Verzeichnisstruktur des Servers.
  // Beides ist Aufklärungsmaterial für einen Angreifer und gehört ins Log, nicht
  // in die Antwort. Auch nicht in Entwicklung anders — sonst weicht genau der
  // Pfad ab, der in Produktion zählt.
  res.status(500).json({ error: "Interner Serverfehler" });
}

maitrRouter.use(maitrErrorHandler);

/**
 * Webhook-Routen mit ROHBODY registrieren. MUSS vor `app.use(express.json())` in
 * `createServer` aufgerufen werden, damit `verifyMetaSignature` den unveränderten
 * Body als Buffer bekommt.
 */
export function registerMaitrWebhooks(app: Express, basePath = "/api/maitr"): void {
  // Handshake beim Einrichten (Meta ruft GET mit hub.mode/verify_token).
  app.get(`${basePath}/webhooks/meta`, (req, res) => {
    const challenge = metaVerifyChallenge(req.query as Record<string, unknown>);
    if (challenge === null) return res.sendStatus(403);
    return res.status(200).send(challenge);
  });
  // Signierte Events: HMAC über den Rohbody prüfen, sonst hart ablehnen.
  app.post(`${basePath}/webhooks/meta`, express.raw({ type: "*/*" }), (req, res) => {
    if (!verifyMetaSignature(req.body as Buffer, req.header("x-hub-signature-256"))) {
      return res.sendStatus(401);
    }
    // Event verifiziert → hier den betroffenen Betrieb zum Pull einreihen (sync.pullChannel).
    return res.sendStatus(200);
  });
}

export { syncAll } from "./sync";
