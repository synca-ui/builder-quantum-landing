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
import express, { Router, type Express } from "express";
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
