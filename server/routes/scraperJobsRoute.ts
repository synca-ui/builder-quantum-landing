import { Router, Request, Response } from "express";
import { prisma } from "../db/prisma";
import { requireAuth } from "../middleware/auth";
import { normalizeScraperJob } from "./scraper";

const router = Router();

/**
 * GET /api/scraper-jobs/:id
 *
 * VERALTET – deckungsgleich mit GET /api/scraper/:id (server/routes/scraper.ts),
 * das ebenfalls authentifiziert und besitzgebunden ist. Neue Aufrufer gehören
 * dorthin; diese Route bleibt nur, solange noch etwas sie benutzt.
 *
 * Sie war vollständig unauthentifiziert und gab die komplette Zeile zu jeder
 * bekannten Job-ID heraus – samt E-Mail, Telefonnummer und Analyseergebnis
 * fremder Betriebe. Jetzt: Anmeldung erforderlich, Treffer nur auf eigene Jobs.
 * "Existiert nicht" und "gehört jemand anderem" antworten identisch mit 404.
 */
router.get("/:id", requireAuth, async (req: Request, res: Response) => {
  const id = String(req.params.id);
  const userId = req.user?.id;

  if (!userId) {
    return res.status(401).json({ error: "Nicht angemeldet" });
  }

  if (!id) {
    return res.status(400).json({ error: "Job ID erforderlich" });
  }

  try {
    const job = await prisma.scraperJob.findFirst({
      where: { id, userId },
    });

    if (!job) {
      return res.status(404).json({ error: "ScraperJob nicht gefunden" });
    }

    return res.json(normalizeScraperJob(job));
  } catch (err) {
    console.error("ScraperJob fetch error:", err);
    return res.status(500).json({ error: "Interner Serverfehler" });
  }
});

export default router;
