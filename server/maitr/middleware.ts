/**
 * Maitr-spezifische Middleware.
 *
 * `requireVenueAccess` ist der wichtigste Sicherheits-Baustein: es verhindert den
 * Cross-Tenant-Leak. Der von `requireAuth` gesetzte `req.userId` wird gegen die
 * `BusinessMember`-Tabelle geprüft - nur wer Mitglied des angefragten Betriebs ist,
 * darf dessen Daten sehen. Ein client-geliefertes `venueId` allein genügt NIE.
 */
import type { NextFunction, Request, Response } from "express";
import type { ZodTypeAny } from "zod";
import { prisma } from "../db/prisma";

export function resolveVenueId(req: Request): string | null {
  const raw = req.params.venueId ?? req.query.venueId ?? req.body?.venueId;
  return typeof raw === "string" && raw.length > 0 ? raw : null;
}

export async function requireVenueAccess(req: Request, res: Response, next: NextFunction) {
  const venueId = resolveVenueId(req);
  if (!venueId) return res.status(400).json({ error: "venueId fehlt" });
  if (!req.userId) return res.status(401).json({ error: "Nicht angemeldet" });

  const membership = await prisma.businessMember.findUnique({
    where: { userId_businessId: { userId: req.userId, businessId: venueId } },
  });
  if (!membership) return res.status(403).json({ error: "Kein Zugriff auf diesen Betrieb" });

  (req as Request & { venueId?: string }).venueId = venueId;
  return next();
}

/** Zod-Validierung des Request-Bodys an der Grenze - kein ungeprüfter Input weiter. */
export function validateBody(schema: ZodTypeAny) {
  return (req: Request, res: Response, next: NextFunction) => {
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(422).json({ error: "Ungültige Eingabe", issues: parsed.error.issues });
    }
    req.body = parsed.data;
    return next();
  };
}
