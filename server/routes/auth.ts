import { Router } from "express";
import bcrypt from "bcryptjs";
import { sql } from "../sql";
import { signToken } from "../middleware/auth";

export const authRouter = Router();

authRouter.get("/signup", (_req, res) => {
  return res.status(405).json({ error: "Use POST /api/auth/signup with JSON { email, password }" });
});

authRouter.post("/signup", async (req, res) => {
  try {
    let email: string | undefined;
    let password: string | undefined;
    const body = (req as any).body;
    if (typeof body === "string") {
      try {
        const parsed = JSON.parse(body);
        email = parsed.email;
        password = parsed.password;
      } catch {}
    } else if (body && typeof body === "object") {
      email = (body as any).email;
      password = (body as any).password;
    }
    if (!email || !password)
      return res.status(400).json({ error: "Email and password required" });
    const hash = await bcrypt.hash(password, 10);

    // create user if not exists
    const rows = await sql`INSERT INTO public.users(email, password_hash)
                            VALUES(${email}, ${hash})
                            ON CONFLICT (email) DO NOTHING
                            RETURNING id, email`;
    let user = rows && rows[0];
    if (!user) {
      const existing =
        await sql`SELECT id, email FROM public.users WHERE email=${email} LIMIT 1`;
      user = existing[0];
    }
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
    let email: string | undefined;
    let password: string | undefined;
    const body = (req as any).body;
    if (typeof body === "string") {
      try {
        const parsed = JSON.parse(body);
        email = parsed.email;
        password = parsed.password;
      } catch {}
    } else if (body && typeof body === "object") {
      email = (body as any).email;
      password = (body as any).password;
    }
    if (!email || !password)
      return res.status(400).json({ error: "Email and password required" });
    const rows =
      await sql`SELECT id, email, password_hash FROM public.users WHERE email=${email} LIMIT 1`;
    const user = rows[0];
    if (!user) return res.status(401).json({ error: "Invalid credentials" });
    const ok = await bcrypt.compare(password, user.password_hash);
    if (!ok) return res.status(401).json({ error: "Invalid credentials" });
    const token = signToken({ id: user.id, email: user.email });
    return res.json({ user: { id: user.id, email: user.email }, token });
  } catch (e: any) {
    console.error("login error", e);
    return res
      .status(503)
      .json({ error: "Database unavailable or misconfigured" });
  }
});
