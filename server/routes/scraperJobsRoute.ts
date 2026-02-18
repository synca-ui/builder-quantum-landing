import { Router, Request, Response } from "express";
import { prisma } from "../db/prisma";

const router = Router();

router.get("/:id", async (req: Request, res: Response) => {
  const { id } = req.params;

  if (!id) {
    return res.status(400).json({ error: "Job ID erforderlich" });
  }

  try {
    const job = await prisma.scraperJob.findUnique({
      where: { id },
    });

    if (!job) {
      return res.status(404).json({ error: "ScraperJob nicht gefunden" });
    }

    return res.json(job);
  } catch (err) {
    console.error("ScraperJob fetch error:", err);
    return res.status(500).json({ error: "Interner Serverfehler" });
  }
});

export default router;
