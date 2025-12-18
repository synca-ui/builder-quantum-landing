import { Router } from "express";
import bcrypt from "bcryptjs";
import { sql } from "../sql";
import { signToken } from "../middleware/auth";

export const authRouter = Router();

authRouter.get("/signup", (_req, res) => {
  return res
    .status(405)
    .json({ error: "Use POST /api/auth/signup with JSON { email, password }" });
});

authRouter.post("/signup", async (req, res) => {
  try {
    // Sauberer, direkter Zugriff auf den Body, der jetzt korrekt geparsed wird.
    const { email, password } = req.body;

    if (!email || !password) {
      console.error("Fehler in /signup: E-Mail oder Passwort fehlen!", req.body);
      return res.status(400).json({ error: "Email and password required" });
    }

    // Passwort sicher hashen
    const hash = await bcrypt.hash(password, 10);

    // Nutzer in der Datenbank anlegen, falls er noch nicht existiert
    const rows = await sql`INSERT INTO public.users(email, password_hash)
                            VALUES(${email}, ${hash})
                            ON CONFLICT (email) DO NOTHING
                            RETURNING id, email`;
    let user = rows && rows[0];

    // Wenn der Nutzer bereits existierte, holen wir seine Daten
    if (!user) {
      const existing =
        await sql`SELECT id, email FROM public.users WHERE email=${email} LIMIT 1`;
      user = existing[0];
    }

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
    // Sauberer, direkter Zugriff auf den Body
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: "Email and password required" });
    }

    // Nutzer in der Datenbank suchen
    const rows =
      await sql`SELECT id, email, password_hash FROM public.users WHERE email=${email} LIMIT 1`;
    const user = rows[0];

    // Prüfen, ob der Nutzer existiert und das Passwort korrekt ist
    if (!user) {
      return res.status(401).json({ error: "Invalid credentials" });
    }
    const ok = await bcrypt.compare(password, user.password_hash);
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