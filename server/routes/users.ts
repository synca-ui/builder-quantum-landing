import { Router } from "express";
import prisma from "../db/prisma";

export const usersRouter = Router();

usersRouter.get("/me", async (req, res) => {
  try {
    const userId = req.user!.id;
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        fullName: true,
        role: true,
      },
    });

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    return res.json({ user });
  } catch (e) {
    console.error("users/me error", e);
    return res.status(500).json({ error: "Internal server error" });
  }
});

usersRouter.put("/profile", async (req, res) => {
  try {
    const userId = req.user!.id;
    const { fullName } = req.body || {};

    const updated = await prisma.user.update({
      where: { id: userId },
      data: {
        fullName: fullName || null,
      },
      select: {
        id: true,
        email: true,
        fullName: true,
        role: true,
      },
    });

    return res.json({ user: updated });
  } catch (e) {
    console.error("users/profile update error", e);
    return res.status(500).json({ error: "Internal server error" });
  }
});
