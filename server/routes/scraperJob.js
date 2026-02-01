// routes/scraperJob.js
const express = require("express");
const { PrismaClient } = require("@prisma/client");

const router = express.Router();
const prisma = new PrismaClient();

// GET /api/scraper-job/score?websiteUrl=https://kleiner-kiepenkerl.de
router.get("/score", async (req, res) => {
  try {
    const { websiteUrl } = req.query;

    if (!websiteUrl) {
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

    // Kein Job gefunden oder Score noch null/0 und Status nicht "completed"
    if (!job) {
      return res.json({ maitrScore: null, status: "not_found" });
    }

    res.json({
      maitrScore: job.maitrScore,
      status: job.status, // "pending" | "completed" | "failed"
    });
  } catch (error) {
    console.error("Error fetching maitrScore:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

module.exports = router;
