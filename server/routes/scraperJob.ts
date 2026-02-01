// routes/scraperJob.ts
import express from "express";
import { prisma } from "../db/prisma.ts";


const router = express.Router();

// GET /api/scraper-job/score?websiteUrl=https://kleiner-kiepenkerl.de
router.get("/score", async (req, res) => {
  try {
    const { websiteUrl } = req.query;

    console.log("[ScraperJob] Score request for:", websiteUrl);

    if (!websiteUrl || typeof websiteUrl !== "string") {
      console.warn("[ScraperJob] Missing or invalid websiteUrl");
      return res.status(400).json({ error: "websiteUrl is required" });
    }

    const job = await prisma.scraperJob.findFirst({
      where: { websiteUrl },
      orderBy: { createdAt: "desc" },
      select: {
        maitrScore: true,
        status: true,
      },
    });

    console.log("[ScraperJob] Found job:", job);

    // Kein Job gefunden
    if (!job) {
      console.log("[ScraperJob] No job found");
      return res.json({ maitrScore: null, status: "not_found" });
    }

    res.json({
      maitrScore: job.maitrScore,
      status: job.status,
    });
  } catch (error) {
    console.error("[ScraperJob] Error fetching maitrScore:", error);
    console.error("[ScraperJob] Error stack:", error instanceof Error ? error.stack : "Unknown");
    res.status(500).json({
      error: "Internal server error",
      details: error instanceof Error ? error.message : "Unknown error"
    });
  }
});

export { router as scraperJobRouter };