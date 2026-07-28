// routes/scraperJob.ts
import express from "express";
import prisma from "../db/prisma";
import { requireAuth } from "../middleware/auth";
import { normalizeScraperJob } from "./scraper";

const router = express.Router();

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/scraper-job/score?websiteUrl=...
// Nur Score + Status (für useMaitrScore-Hook)
//
// Bewusst ohne Auth: Der Hook läuft auf der öffentlichen Landingpage, bevor
// irgendjemand angemeldet ist. Ausgeliefert wird nur die Kennzahl zu einer URL,
// die der Aufrufer selbst mitbringt – keine Kontakt- oder Analysedaten.
// ─────────────────────────────────────────────────────────────────────────────
router.get("/score", async (req, res) => {
  try {
    const { websiteUrl } = req.query;
    console.log("[ScraperJob] Score request for:", websiteUrl);

    if (!websiteUrl || typeof websiteUrl !== "string") {
      console.warn("[ScraperJob] Missing or invalid websiteUrl");
      return res.status(400).json({ error: "websiteUrl is required" });
    }

    // Enge Feldauswahl statt des ganzen Datensatzes: Kennzahl, Status und die
    // beiden Zeitstempel für die Dauer-Anzeige. Kontaktdaten, extractedData und
    // suggestedConfig bleiben ausdrücklich draußen — genau wegen ihnen ist
    // /full jetzt authentifiziert.
    const job = await prisma.scraperJob.findFirst({
      where: { websiteUrl },
      orderBy: { createdAt: "desc" },
      select: {
        maitrScore: true,
        status: true,
        startedAt: true,
        completedAt: true,
      },
    });

    if (!job) {
      return res.json({ maitrScore: null, status: "not_found" });
    }

    res.json({
      maitrScore: job.maitrScore,
      status: job.status,
      startedAt: job.startedAt,
      completedAt: job.completedAt,
    });
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
//
// VERALTET. Neuer Weg: GET /api/scraper/:id (server/routes/scraper.ts). Der
// arbeitet über die Job-ID, die POST /api/scraper zurückgibt, und liefert
// dieselben Felder.
//
// Der Endpunkt war vollständig unauthentifiziert und gab zu JEDER jemals
// gescrapten Website E-Mail, Telefonnummer, Speisekarte und Analyseergebnis
// heraus – es genügte, die URL eines fremden Betriebs zu raten. Jetzt: Anmeldung
// erforderlich, und geliefert wird nur, was dem Aufrufer gehört.
//
// Nicht gefunden und "gehört jemand anderem" sind absichtlich dieselbe Antwort,
// damit sich über den Statuscode nicht abfragen lässt, welche Betriebe bereits
// analysiert wurden.
// ─────────────────────────────────────────────────────────────────────────────
router.get("/full", requireAuth, async (req, res) => {
  try {
    const { websiteUrl } = req.query;
    const userId = req.user?.id;
    console.log("[ScraperJob] Full request for:", websiteUrl);

    if (!userId) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    if (!websiteUrl || typeof websiteUrl !== "string") {
      return res.status(400).json({ error: "websiteUrl is required" });
    }

    const job = await prisma.scraperJob.findFirst({
      where: { websiteUrl, userId },
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
        suggestedConfig: true,
      },
    });

    console.log("[ScraperJob] Full job:", job?.id, "status:", job?.status);

    if (!job) {
      return res.json({ job: null, status: "not_found" });
    }

    // Dieselbe Normalisierung wie GET /api/scraper/:id, damit beide Endpunkte
    // während der Umstellung nicht auseinanderlaufen.
    res.json({ job: normalizeScraperJob(job) });
  } catch (error) {
    console.error("[ScraperJob] Full fetch error:", error);
    res.status(500).json({
      error: "Internal server error",
      details: error instanceof Error ? error.message : "Unknown error",
    });
  }
});

export { router as scraperJobRouter };
