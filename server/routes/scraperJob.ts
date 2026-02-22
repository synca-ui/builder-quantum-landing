// routes/scraperJob.ts
import express from "express";
import prisma from "../db/prisma";

const router = express.Router();

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/scraper-job/score?websiteUrl=...
// Nur Score + Status (für useMaitrScore-Hook)
// ─────────────────────────────────────────────────────────────────────────────
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
      select: { maitrScore: true, status: true },
    });

    console.log("[ScraperJob] Found job:", job);

    if (!job) {
      console.log("[ScraperJob] No job found");
      return res.json({ maitrScore: null, status: "not_found" });
    }

    res.json({ maitrScore: job.maitrScore, status: job.status });
  } catch (error) {
    console.error("[ScraperJob] Error fetching maitrScore:", error);
    res.status(500).json({
      error: "Internal server error",
      details: error instanceof Error ? error.message : "Unknown error",
    });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/scraper-job/full?websiteUrl=...
// ALLE extrahierten Felder — für die Score-Card im Frontend
// ─────────────────────────────────────────────────────────────────────────────
router.get("/full", async (req, res) => {
  try {
    const { websiteUrl } = req.query;
    console.log("[ScraperJob] Full request for:", websiteUrl);

    if (!websiteUrl || typeof websiteUrl !== "string") {
      return res.status(400).json({ error: "websiteUrl is required" });
    }

    const job = await prisma.scraperJob.findFirst({
      where: { websiteUrl },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        status: true,
        businessName: true,
        businessType: true,
        websiteUrl: true,
        maitrScore: true,
        email: true,
        phone: true,
        instagramUrl: true,
        menuUrl: true,
        hasReservation: true,
        analysisFeedback: true,
        isDeepScrapeReady: true,
        createdAt: true,
        startedAt: true,
        completedAt: true,
        extractedData: true,
      },
    });

    console.log("[ScraperJob] Full job:", job?.id, "status:", job?.status);

    if (!job) {
      return res.json({ job: null, status: "not_found" });
    }

    // extractedData als JSON-Fallback (n8n schreibt manchmal nur dort hin)
    const ex = (job.extractedData as Record<string, any>) ?? {};

    const merged = {
      id: job.id,
      status: job.status,
      websiteUrl: job.websiteUrl,
      maitrScore: job.maitrScore ?? ex.maitrScore ?? null,
      businessName: job.businessName || ex.businessName || null,
      businessType: job.businessType || ex.businessType || null,
      email: job.email || ex.email || null,
      phone: job.phone || ex.phone || null,
      instagramUrl: job.instagramUrl || ex.instagramUrl || null,
      menuUrl: job.menuUrl || ex.menuUrl || null,
      hasReservation: job.hasReservation ?? ex.hasReservation ?? false,
      analysisFeedback: job.analysisFeedback || ex.analysisFeedback || null,
      isDeepScrapeReady: job.isDeepScrapeReady ?? ex.isDeepScrapeReady ?? false,
      createdAt: job.createdAt,
      startedAt: job.startedAt,
      completedAt: job.completedAt,
    };

    res.json({ job: merged });
  } catch (error) {
    console.error("[ScraperJob] Full fetch error:", error);
    res.status(500).json({
      error: "Internal server error",
      details: error instanceof Error ? error.message : "Unknown error",
    });
  }
});

export { router as scraperJobRouter };
