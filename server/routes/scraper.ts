/**
 * n8n Scraper API Routes
 *
 * Integrates with n8n workflows to extract business data from websites
 * and pre-populate configuration templates
 *
 * Routes:
 * - POST /api/scraper/jobs - Create a new scraper job
 * - GET /api/scraper/jobs/:id - Get scraper job status and results
 * - GET /api/scraper/jobs - List all user's scraper jobs
 * - POST /api/scraper/jobs/:id/apply - Apply scraped data to a configuration
 */

import { Router, Request, Response } from "express";
import prisma from "../db/prisma";
import { Prisma } from "@prisma/client";
import { requireAuth } from "../middleware/auth";
import { createAuditLogger } from "../utils/audit";
// Bewusst relativ statt über den "@shared"-Alias: vite.config.ts zieht den
// Server-Baum über `await import("./server")` in die Auflösung der Config, und
// dort ist der Alias nicht bekannt. Ein reiner Typ-Import (wie @shared/api in
// demo.ts) fällt nicht auf, weil er wegkompiliert wird – dies hier ist ein
// Wert-Import und muss zur Laufzeit auflösbar sein.
import {
  suggestedConfigToDraft,
  type SuggestedConfig,
} from "../../shared/suggestedConfig";

const router = Router();

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * ✅ Validate URL format
 */
function isValidUrl(url: string): boolean {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
}

/**
 * ✅ Get audit logger helper
 */
function getAuditLogger(req: Request) {
  return createAuditLogger({
    userId: req.user?.id || "anonymous",
    ipAddress: req.ip,
    userAgent: req.get("user-agent"),
  });
}

// ============================================
// HANDLERS
// ============================================

/**
 * ✅ POST /api/scraper/jobs - Create a new scraper job
 *
 * Request Body:
 * {
 *   businessName: string (required)
 *   businessType: string (optional, default: "restaurant")
 *   websiteUrl: string (required, must be valid URL)
 * }
 *
 * Response: { success: boolean; data: ScraperJob; jobId: string }
 */
export async function createScraperJob(req: Request, res: Response) {
  const userId = req.user?.id;
  const audit = getAuditLogger(req);

  try {
    const { businessName, businessType = "restaurant", websiteUrl } = req.body;

    // Validate required fields
    if (!businessName || typeof businessName !== "string") {
      return res.status(400).json({
        success: false,
        error: "Invalid businessName",
        message: "businessName is required and must be a string",
      });
    }

    if (!websiteUrl || typeof websiteUrl !== "string") {
      return res.status(400).json({
        success: false,
        error: "Invalid websiteUrl",
        message: "websiteUrl is required and must be a string",
      });
    }

    // Validate URL format
    if (!isValidUrl(websiteUrl)) {
      return res.status(400).json({
        success: false,
        error: "Invalid URL format",
        message: "websiteUrl must be a valid URL (e.g., https://example.com)",
      });
    }

    // Check for duplicate URL
    const existing = await prisma.scraperJob.findUnique({
      where: { websiteUrl },
    });

    if (existing && existing.status !== "failed") {
      return res.status(409).json({
        success: false,
        error: "URL already being processed",
        message: "A scraper job for this URL already exists",
        existingJobId: existing.id,
      });
    }

    // Create scraper job
    const job = await prisma.scraperJob.create({
      data: {
        businessName,
        businessType,
        websiteUrl,
        userId,
        status: "pending",
      },
    });

    // Log job creation
    await audit("scraper_job_created", job.id, true);

    // TODO: Trigger n8n workflow
    // const n8nResponse = await triggerN8nWorkflow({
    //   jobId: job.id,
    //   websiteUrl,
    //   businessType,
    // });
    //
    // if (n8nResponse.executionId) {
    //   await prisma.scraperJob.update({
    //     where: { id: job.id },
    //     data: {
    //       n8nExecutionId: n8nResponse.executionId,
    //       status: "processing",
    //       startedAt: new Date(),
    //     },
    //   });
    // }

    return res.status(201).json({
      success: true,
      message: "Scraper job created successfully",
      data: job,
      jobId: job.id,
    });
  } catch (error) {
    console.error("[Scraper] Create job error:", error);
    await audit(
      "scraper_job_error",
      "unknown",
      false,
      error instanceof Error ? error.message : "Unknown error",
    );

    return res.status(500).json({
      success: false,
      error: "Failed to create scraper job",
      message: error instanceof Error ? error.message : undefined,
    });
  }
}

/**
 * ✅ GET /api/scraper/jobs/:id - Get scraper job status and results
 *
 * Response: { success: boolean; data: ScraperJob with results }
 */
export async function getScraperJob(req: Request, res: Response) {
  try {
    // @types/express (v5) typisiert Params als string | string[], das Projekt
    // nutzt aber express v4. String() macht die Absicht explizit.
    const id = String(req.params.id);

    // Auf den Besitzer eingegrenzt. Vorher stand hier findUnique({ where: { id } })
    // ohne requireAuth und ohne Besitzprüfung, und die Antwort enthielt
    // zusätzlich user: { email, fullName }. Damit gab jede bekannte Job-ID die
    // E-Mail-Adresse und den Namen des Besitzers heraus – an beliebige Aufrufer.
    // Die Nutzerdaten sind ganz entfallen: Wer den Job abruft, IST der Besitzer,
    // die eigenen Kontaktdaten muss ihm der Endpunkt nicht zurückspiegeln.
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({
        success: false,
        error: "Unauthorized",
      });
    }

    const job = await prisma.scraperJob.findFirst({
      where: { id, userId },
    });

    if (!job) {
      return res.status(404).json({
        success: false,
        error: "Scraper job not found",
      });
    }

    return res.json({
      success: true,
      data: job,
    });
  } catch (error) {
    console.error("[Scraper] Get job error:", error);
    return res.status(500).json({
      success: false,
      error: "Failed to fetch scraper job",
    });
  }
}

/**
 * ✅ GET /api/scraper/jobs - List all user's scraper jobs
 *
 * Query Parameters:
 * - status: "pending" | "processing" | "completed" | "failed" (optional)
 *
 * Response: { success: boolean; data: ScraperJob[]; count: number }
 */
export async function listScraperJobs(req: Request, res: Response) {
  const userId = req.user?.id;

  try {
    if (!userId) {
      return res.status(401).json({
        success: false,
        error: "Unauthorized",
      });
    }

    const { status } = req.query;

    const jobs = await prisma.scraperJob.findMany({
      where: {
        userId,
        ...(typeof status === "string" ? { status } : {}),
      },
      orderBy: { createdAt: "desc" },
      take: 50,
    });

    return res.json({
      success: true,
      data: jobs,
      count: jobs.length,
    });
  } catch (error) {
    console.error("[Scraper] List jobs error:", error);
    return res.status(500).json({
      success: false,
      error: "Failed to fetch scraper jobs",
    });
  }
}

/**
 * ✅ POST /api/scraper/jobs/:id/apply - Apply scraped data to a configuration
 *
 * Request Body:
 * {
 *   configId: string (optional, creates new if not provided)
 * }
 *
 * Response: { success: boolean; configId: string; data: Configuration }
 */
export async function applyScrapedData(req: Request, res: Response) {
  const userId = req.user!.id;
  const id = String(req.params.id);
  const { configId } = req.body;
  const audit = getAuditLogger(req);

  try {
    // Get scraper job
    const job = await prisma.scraperJob.findUnique({
      where: { id },
    });

    if (!job) {
      return res.status(404).json({
        success: false,
        error: "Scraper job not found",
      });
    }

    if (job.status !== "completed") {
      return res.status(400).json({
        success: false,
        error: "Job not completed",
        message: `Job status is "${job.status}", must be "completed"`,
      });
    }

    if (!job.suggestedConfig) {
      return res.status(400).json({
        success: false,
        error: "No configuration data available",
        message: "The scraper job did not produce a configuration",
      });
    }

    // Gemeinsame Abbildung mit dem Client (shared/suggestedConfig.ts), damit
    // Vorbefüllen und automatisches Anlegen nicht auseinanderlaufen.
    //
    // Die vorherige Fassung las hier direkt aus suggestedConfig und griff dabei
    // dreimal daneben:
    //  - contactMethods und socialMedia kommen im Deep-Scrape-Flow überhaupt
    //    nicht vor (0 Treffer im gesamten Workflow) – Telefon und E-Mail, die
    //    als phone/email geliefert werden, gingen also immer verloren.
    //  - Farben, Schrift und Vorlage wurden gar nicht übernommen, obwohl der
    //    Flow sie aus dem Stylesheet der Website ermittelt.
    //  - menuItems und gallery wurden roh durchgereicht, ohne die vom
    //    Konfigurator geforderten ids; gallery liefert reine Strings, erwartet
    //    werden Objekte { id, url }.
    const draft = suggestedConfigToDraft(job.suggestedConfig as SuggestedConfig);

    if (!draft) {
      return res.status(400).json({
        success: false,
        error: "No usable configuration data",
        message: "suggestedConfig enthielt keine verwertbaren Felder",
      });
    }

    if (configId) {
      // Update existing configuration
      const existing = await prisma.configuration.findFirst({
        where: {
          id: configId,
          userId,
        },
      });

      if (!existing) {
        return res.status(404).json({
          success: false,
          error: "Configuration not found",
        });
      }

      const updated = await prisma.configuration.update({
        where: { id: configId },
        data: {
          businessName: draft.business.name || existing.businessName,
          businessType: draft.business.type || existing.businessType,
          location: draft.business.location || existing.location,
          slogan: draft.business.slogan || existing.slogan,
          uniqueDescription:
            draft.business.uniqueDescription || existing.uniqueDescription,
          template: draft.design.template || existing.template,
          primaryColor: draft.design.primaryColor || existing.primaryColor,
          secondaryColor: draft.design.secondaryColor || existing.secondaryColor,
          fontFamily: draft.design.fontFamily || existing.fontFamily,
          menuItems: draft.content.menuItems ?? (existing.menuItems as object),
          gallery: draft.content.gallery ?? (existing.gallery as object),
          contactMethods:
            draft.contact.contactMethods ?? (existing.contactMethods as object),
          openingHours:
            draft.content.openingHours ?? (existing.openingHours as object),
        },
      });

      await audit("scraper_config_applied", configId, true);

      return res.json({
        success: true,
        message: "Configuration updated with scraped data",
        configId,
        data: updated,
      });
    } else {
      // Create new configuration
      const newConfig = await prisma.configuration.create({
        data: {
          userId,
          businessName: draft.business.name || "",
          businessType: draft.business.type || "",
          location: draft.business.location,
          slogan: draft.business.slogan,
          uniqueDescription: draft.business.uniqueDescription,
          ...(draft.design.template ? { template: draft.design.template } : {}),
          ...(draft.design.primaryColor
            ? { primaryColor: draft.design.primaryColor }
            : {}),
          ...(draft.design.secondaryColor
            ? { secondaryColor: draft.design.secondaryColor }
            : {}),
          ...(draft.design.fontFamily
            ? { fontFamily: draft.design.fontFamily }
            : {}),
          // Prismas Json-Eingabetyp lässt optionale Felder (string | undefined)
          // nicht zu, obwohl die Abbildung undefined-Schlüssel gar nicht erst
          // setzt. Deshalb hier bewusst umtypisiert statt die Werte zu
          // verändern – der Inhalt ist geprüft und serialisierbar.
          menuItems: (draft.content.menuItems ?? []) as unknown as Prisma.InputJsonValue,
          gallery: (draft.content.gallery ?? []) as unknown as Prisma.InputJsonValue,
          contactMethods: (draft.contact.contactMethods ??
            []) as unknown as Prisma.InputJsonValue,
          openingHours: (draft.content.openingHours ?? {}) as unknown as Prisma.InputJsonValue,
          status: "draft",
        },
      });

      await audit("scraper_config_created", newConfig.id, true);

      return res.status(201).json({
        success: true,
        message: "Configuration created from scraped data",
        configId: newConfig.id,
        data: newConfig,
      });
    }
  } catch (error) {
    console.error("[Scraper] Apply data error:", error);
    await audit(
      "scraper_apply_error",
      id,
      false,
      error instanceof Error ? error.message : "Unknown error",
    );

    return res.status(500).json({
      success: false,
      error: "Failed to apply scraped data",
      message: error instanceof Error ? error.message : undefined,
    });
  }
}

// ============================================
// ROUTER
// ============================================

router.post("/", requireAuth, createScraperJob);
router.get("/", requireAuth, listScraperJobs);
router.get("/:id", requireAuth, getScraperJob);
router.post("/:id/apply", requireAuth, applyScrapedData);

export default router;
