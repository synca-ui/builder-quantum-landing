import type { Request, Response, NextFunction } from "express";
import { verifyClerkToken, getOrCreateUser } from "../utils/clerk";

export interface AuthUser {
  id: string;
  email: string;
  clerkId: string;
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthUser;
      userId?: string; // Add userId for compatibility
    }
  }
}

export async function requireAuth(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  const auth = req.headers.authorization || "";
  const token = auth.startsWith("Bearer ") ? auth.slice(7) : "";

  if (!token) {
    return res.status(401).json({ error: "Missing token" });
  }

  // Zwei getrennte Fehlerfälle, zwei getrennte Meldungen: Vorher wurde ALLES
  // (abgelaufener Token, falscher Clerk-Key, DB nicht erreichbar, User-Sync
  // kaputt) zu 401 "Invalid token" plattgedrückt – das hat die Diagnose des
  // Publish-Fehlers unnötig teuer gemacht.
  let verified;
  try {
    verified = await verifyClerkToken(token);
  } catch (e) {
    console.error("Auth error (token verification):", e);
    return res.status(401).json({ error: "Invalid token" });
  }

  try {
    // Lazy sync: get or create Prisma user
    const prismaUser = await getOrCreateUser(verified.sub, verified.email);

    // Attach user to request
    req.user = {
      id: prismaUser.id,
      email: prismaUser.email,
      clerkId: prismaUser.clerkId,
    };

    // Also set userId for API route compatibility
    req.userId = prismaUser.id;

    return next();
  } catch (e) {
    console.error("Auth error (user sync):", e);
    return res.status(401).json({ error: "User sync failed" });
  }
}

/**
 * Wie requireAuth, blockiert aber nie: kein/ein ungültiger Token setzt
 * req.user/req.userId einfach nicht, statt 401 zu antworten. Für Routen, die
 * vor der Registrierung erreichbar sein müssen (z.B. Subdomain-Prüfung im
 * Konfigurator), aber - WENN ein gültiger Token da ist - dessen verifizierte
 * userId nutzen sollen statt einer vom Aufrufer im Body behaupteten.
 */
export async function optionalAuth(
  req: Request,
  _res: Response,
  next: NextFunction,
) {
  const auth = req.headers.authorization || "";
  const token = auth.startsWith("Bearer ") ? auth.slice(7) : "";
  if (!token) return next();

  try {
    const verified = await verifyClerkToken(token);
    const prismaUser = await getOrCreateUser(verified.sub, verified.email);
    req.user = {
      id: prismaUser.id,
      email: prismaUser.email,
      clerkId: prismaUser.clerkId,
    };
    req.userId = prismaUser.id;
  } catch (e) {
    // Kein Fehler nach außen - der Aufrufer bleibt einfach unauthentifiziert.
    console.warn("optionalAuth: Token vorhanden, aber ungültig:", e);
  }
  return next();
}
