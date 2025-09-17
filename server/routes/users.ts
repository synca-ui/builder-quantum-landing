import { Router } from "express";
import { sql } from "../sql";

export const usersRouter = Router();

usersRouter.get("/me", async (req, res) => {
  try {
    const userId = req.user!.id;
    const rows = await sql`SELECT id, email, full_name, company_name FROM public.users WHERE id=${userId} LIMIT 1`;
    const user = rows[0];
    if (!user) return res.status(404).json({ error: "User not found" });
    return res.json({ user });
  } catch (e) {
    console.error("users/me error", e);
    return res.status(500).json({ error: "Internal server error" });
  }
});

usersRouter.put("/profile", async (req, res) => {
  try {
    const userId = req.user!.id;
    const { fullName, companyName } = req.body || {};
    const rows = await sql`UPDATE public.users SET full_name=${fullName || null}, company_name=${companyName || null} WHERE id=${userId} RETURNING id, email, full_name, company_name`;
    const updated = rows[0];
    return res.json({ user: updated });
  } catch (e) {
    console.error("users/profile update error", e);
    return res.status(500).json({ error: "Internal server error" });
  }
});
