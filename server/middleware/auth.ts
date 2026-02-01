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
  try {
    const auth = req.headers.authorization || "";
    const token = auth.startsWith("Bearer ") ? auth.slice(7) : "";

    if (!token) {
      return res.status(401).json({ error: "Missing token" });
    }

    // Verify Clerk token
    const verified = await verifyClerkToken(token);

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
    console.error("Auth error:", e);
    return res.status(401).json({ error: "Invalid token" });
  }
}
