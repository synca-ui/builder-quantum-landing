import { Router } from "express";
import bcrypt from "bcryptjs";
import prisma from "../db/prisma";
import { signToken } from "../middleware/auth";

export const authRouter = Router();

authRouter.get("/signup", (_req, res) => {
  return res
    .status(405)
    .json({ error: "Use POST /api/auth/signup with JSON { email, password }" });
});

authRouter.post("/signup", async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      console.error("Fehler in /signup: E-Mail oder Passwort fehlen!", req.body);
      return res.status(400).json({ error: "Email and password required" });
    }

    // Passwort sicher hashen
    const hash = await bcrypt.hash(password, 10);

    // Nutzer in der Datenbank anlegen, falls er noch nicht existiert
    let user = await prisma.user.create({
      data: {
        email,
        passwordHash: hash,
      },
      select: {
        id: true,
        email: true,
      },
    }).catch(async (e: any) => {
      // Wenn der Nutzer bereits existiert, holen wir seine Daten
      if (e.code === 'P2002') {
        return await prisma.user.findUnique({
          where: { email },
          select: {
            id: true,
            email: true,
          },
        });
      }
      throw e;
    });

    // Ein Token für die Sitzung erstellen und zurücksenden
    const token = signToken({ id: user.id, email: user.email });
    return res.json({ user, token });
  } catch (e: any) {
    console.error("signup error", e);
    return res
      .status(503)
      .json({ error: "Database unavailable or misconfigured" });
  }
});

authRouter.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: "Email and password required" });
    }

    // Nutzer in der Datenbank suchen
    const user = await prisma.user.findUnique({
      where: { email },
      select: {
        id: true,
        email: true,
        passwordHash: true,
      },
    });

    // Prüfen, ob der Nutzer existiert und das Passwort korrekt ist
    if (!user) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    if (!user.passwordHash) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    const ok = await bcrypt.compare(password, user.passwordHash);
    if (!ok) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    // Ein Token für die Sitzung erstellen und zurücksenden
    const token = signToken({ id: user.id, email: user.email });
    return res.json({ user: { id: user.id, email: user.email }, token });
  } catch (e: any) {
    console.error("login error", e);
    return res
      .status(503)
      .json({ error: "Database unavailable or misconfigured" });
  }
});
