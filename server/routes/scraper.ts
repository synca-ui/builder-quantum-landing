/**
 * n8n Scraper API Routes
 *
 * Integrates with n8n workflows to extract business data from websites
 * and pre-populate configuration templates
 *
 * Routes (gemountet unter /api/scraper, siehe routes/index.ts):
 * - POST /api/scraper          - Job anlegen und n8n-Entry-Flow anstoßen
 * - GET  /api/scraper/:id      - Status und Ergebnis eines Jobs (Polling)
 * - GET  /api/scraper          - Jobs des Nutzers auflisten
 * - POST /api/scraper/:id/apply - Ergebnis in eine Konfiguration übernehmen
 *
 * Alle Routen sind authentifiziert und auf den Besitzer eingegrenzt.
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

/**
 * Der Entry-Flow braucht gemessen ~3s. 10s lassen Luft für einen kalten Start,
 * ohne dass der Nutzer vor einem hängenden Formular sitzt.
 */
const N8N_TRIGGER_TIMEOUT_MS = 10_000;

/**
 * Bewusst ein flaches Objekt statt einer unterschiedenen Union: Das Projekt
 * kompiliert mit strict: false, dort verengt TypeScript `ok: true | false` nicht
 * zuverlässig auf den passenden Zweig.
 *
 * reason "rejected": n8n war erreichbar und hat die Übernahme verweigert
 * (typisch: 404, weil der Workflow nicht aktiv ist) – der Flow läuft sicher
 * nicht.
 * reason "unreachable": Zeitüberschreitung oder Netzfehler – der Flow kann
 * trotzdem angelaufen sein, deshalb wird daraus kein "failed" abgeleitet.
 */
type N8nTriggerResult = {
  ok: boolean;
  reason?: "rejected" | "unreachable";
  message?: string;
};

/**
 * Stößt den n8n-Entry-Flow für eine Website an.
 *
 * Das Feld heißt "link" und nicht etwa "url": Der Webhook-Knoten des
 * Entry-Flows liest genau $json.body.link. Unter jedem anderen Namen läuft der
 * Flow ohne URL los und schreibt eine leere Zeile.
 */
/**
 * Zusatzangaben aus dem Auto-Konfigurator-Formular. Sie müssen mit an n8n,
 * sonst ist der Weg über POST /api/scraper eine stille Verschlechterung
 * gegenüber dem alten /api/forward-to-n8n: Wer einen Google-Maps-Link angibt
 * oder seine Speisekarte hochlädt, verlöre beides.
 */
export interface N8nExtras {
  mapsLink?: string | null;
  menuFile?: { name: string; base64: string } | null;
  businessName?: string | null;
}

async function triggerN8nEntryFlow(
  webhookUrl: string,
  websiteUrl: string,
  extras: N8nExtras = {},
): Promise<N8nTriggerResult> {
  try {
    const resp = await fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      // "link" ist das Pflichtfeld: Der Webhook-Knoten des Entry-Flows liest
      // $json.body.link. Der Rest ist optional und wird von den nachgelagerten
      // Knoten nur ausgewertet, wenn er da ist.
      body: JSON.stringify({
        link: websiteUrl,
        mapsLink: extras.mapsLink || null,
        menuFile: extras.menuFile || null,
        businessName: extras.businessName || null,
        deepScrape: true,
      }),
      signal: AbortSignal.timeout(N8N_TRIGGER_TIMEOUT_MS),
    });

    if (!resp.ok) {
      const body = await resp.text().catch(() => "");
      return {
        ok: false,
        reason: "rejected",
        message: `n8n antwortete mit HTTP ${resp.status}${
          body ? `: ${body.slice(0, 200)}` : ""
        }`,
      };
    }

    return { ok: true };
  } catch (error) {
    return {
      ok: false,
      reason: "unreachable",
      message: error instanceof Error ? error.message : String(error),
    };
  }
}

/**
 * Der Deep-Scrape-Flow schreibt die Spalte per
 * `JSON.stringify($json.suggestedConfig)`. Ob dabei ein Objekt oder ein String
 * in der Spalte landet, hängt an deren Typ (jsonb parst, text nicht). Beides
 * wird hier behandelt, damit der Client immer ein Objekt bekommt.
 */
export function parseMaybeJson(value: unknown): Record<string, any> | null {
  if (!value) return null;
  if (typeof value === "object") return value as Record<string, any>;
  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value);
      return parsed && typeof parsed === "object" ? parsed : null;
    } catch {
      console.warn("[Scraper] suggestedConfig ist kein gültiges JSON");
      return null;
    }
  }
  return null;
}

/** Nur die Spalten, die die Normalisierung wirklich anfasst. */
type ScraperJobRow = {
  id: string;
  status: string;
  businessName: string | null;
  businessType: string | null;
  websiteUrl: string;
  maitrScore: number | null;
  email: string | null;
  phone: string | null;
  instagramUrl: string | null;
  menuUrl: string | null;
  hasReservation: boolean;
  analysisFeedback: string | null;
  isDeepScrapeReady: boolean;
  createdAt: Date;
  startedAt: Date | null;
  completedAt: Date | null;
  extractedData: unknown;
  suggestedConfig: unknown;
};

/**
 * Bringt eine ScraperJob-Zeile in die Form, die der Client erwartet.
 *
 * Zwei n8n-Flows schreiben in dieselbe Zeile: Der Entry-Flow legt die flachen
 * Felder an, füllt aber je nach Zweig nur extractedData; der Deep-Scrape-Flow
 * liefert später suggestedConfig nach. Deshalb hier für jedes Feld erst die
 * Spalte, dann extractedData als Rückfallebene – sonst sieht der Client je nach
 * Zeitpunkt mal Daten und mal null.
 */
export function normalizeScraperJob(job: ScraperJobRow) {
  const ex = (job.extractedData as Record<string, any>) ?? {};

  return {
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

    // Das eigentliche Ergebnis des Deep-Scrape: die fertig gebaute
    // Konfiguration (Farben, Speisekarte, Galerie, Öffnungszeiten, …).
    // Der Client wartet auf dieses Feld – nicht auf status, denn das setzt
    // schon der Entry-Flow auf "completed".
    suggestedConfig: parseMaybeJson(job.suggestedConfig),
    extractedData: ex,
  };
}

// ============================================
// HANDLERS
// ============================================

/**
 * ✅ POST /api/scraper - Job anlegen und den n8n-Entry-Flow anstoßen
 *
 * Request Body:
 * {
 *   websiteUrl: string (required, must be valid URL)
 *   businessName: string (optional, sonst Hostname als Platzhalter)
 *   businessType: string (optional, default: "restaurant")
 * }
 *
 * Response:
 * {
 *   success: true
 *   data: ScraperJob            // die angelegte/zurückgesetzte Zeile
 *   jobId: string               // damit pollt der Client GET /api/scraper/:id
 *   n8nTriggered: boolean
 *   warning?: string            // gesetzt, wenn n8n nicht sauber übernommen hat
 * }
 */
export async function createScraperJob(req: Request, res: Response) {
  const userId = req.user?.id;
  const audit = getAuditLogger(req);

  try {
    // requireAuth hängt vor dieser Route, die Prüfung macht die Besitzlogik
    // unten aber erst typsicher (req.user ist optional typisiert).
    if (!userId) {
      return res.status(401).json({
        success: false,
        error: "Unauthorized",
      });
    }

    const {
      businessName,
      businessType = "restaurant",
      websiteUrl,
      mapsLink,
      menuFile,
    } = req.body;

    // Optionale Zusatzangaben aus dem Formular. Nur weiterreichen, wenn sie die
    // erwartete Form haben — sie landen unverändert im n8n-Request-Body.
    const extraMapsLink =
      typeof mapsLink === "string" && mapsLink.trim() ? mapsLink.trim() : null;
    const extraMenuFile =
      menuFile &&
      typeof menuFile === "object" &&
      typeof (menuFile as any).name === "string" &&
      typeof (menuFile as any).base64 === "string"
        ? {
            name: String((menuFile as any).name).slice(0, 200),
            base64: String((menuFile as any).base64),
          }
        : null;

    // Validate required fields
    if (businessName !== undefined && typeof businessName !== "string") {
      return res.status(400).json({
        success: false,
        error: "Invalid businessName",
        message: "businessName must be a string",
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

    // Der Auto-Konfigurator kennt beim Auslösen oft nur die URL, die Spalte
    // businessName ist aber NOT NULL. Der Hostname ist ein brauchbarer
    // Platzhalter – der Entry-Flow überschreibt ihn, sobald er den echten Namen
    // aus der Seite gelesen hat.
    const resolvedName =
      (typeof businessName === "string" && businessName.trim()) ||
      new URL(websiteUrl).hostname.replace(/^www\./, "");

    // Ohne Webhook-URL entstünde eine Zeile, die nie befüllt wird, und der
    // Client würde sechs Minuten lang ins Leere pollen. Lieber sofort ehrlich
    // scheitern – und zwar bevor irgendetwas in die Datenbank geschrieben wird.
    const webhookUrl = process.env.N8N_WEBHOOK_URL;

    if (!webhookUrl) {
      console.error("[Scraper] N8N_WEBHOOK_URL ist nicht gesetzt");
      return res.status(503).json({
        success: false,
        error: "Scraper not configured",
        message:
          "Die Website-Analyse ist derzeit nicht verfügbar (N8N_WEBHOOK_URL fehlt).",
      });
    }

    // websiteUrl ist global @unique, es kann also je URL nur eine Zeile geben.
    const existing = await prisma.scraperJob.findUnique({
      where: { websiteUrl },
    });

    let job;

    if (existing) {
      // Fremde Zeile: bleibt gesperrt. Die Antwort verrät weder die Job-ID noch
      // den Besitzer – sonst wäre der 409 selbst ein Auskunftsdienst darüber,
      // wer welche Website analysieren lässt.
      if (existing.userId && existing.userId !== userId) {
        return res.status(409).json({
          success: false,
          error: "URL already being processed",
          message: "Für diese Website läuft bereits eine Analyse.",
        });
      }

      // Eigene oder herrenlose Zeile: erneut scrapen ist erlaubt.
      //
      // Herrenlos (userId === null) sind genau die Zeilen, die n8n selbst per
      // Upsert auf websiteUrl angelegt hat – der Flow schreibt die Spalte userId
      // nicht. Das ist der Normalfall, wenn zuvor über die Landingpage
      // analysiert wurde. Diese Zeilen hier zu blockieren würde den
      // Auto-Konfigurator für praktisch jede URL dauerhaft sperren; sie werden
      // stattdessen dem anfragenden Nutzer zugeordnet und komplett neu befüllt.
      job = await prisma.scraperJob.update({
        where: { id: existing.id },
        data: {
          businessName: resolvedName,
          businessType,
          userId,
          status: "pending",
          // DbNull = SQL NULL. Prisma.JsonNull wäre das JSON-Literal `null` und
          // würde als "es gibt ein Ergebnis" durchgehen.
          suggestedConfig: Prisma.DbNull,
          startedAt: null,
          completedAt: null,
        },
      });

      await audit("scraper_job_restarted", job.id, true);
    } else {
      // Die Zeile entsteht hier – MIT userId – und erst danach wird n8n
      // getriggert. Der Entry-Flow upsertet auf websiteUrl und fasst userId
      // nicht an, der Besitz bleibt also erhalten.
      job = await prisma.scraperJob.create({
        data: {
          businessName: resolvedName,
          businessType,
          websiteUrl,
          userId,
          status: "pending",
        },
      });

      await audit("scraper_job_created", job.id, true);
    }

    const trigger = await triggerN8nEntryFlow(webhookUrl, websiteUrl, {
      mapsLink: extraMapsLink,
      menuFile: extraMenuFile,
      businessName:
        typeof businessName === "string" && businessName.trim()
          ? businessName.trim()
          : null,
    });

    // Nur eine ausdrückliche Absage von n8n gilt als gescheitert. Bei
    // Zeitüberschreitung kann der Flow weiterlaufen – dann wäre "failed" gelogen
    // und der Client würde ein Ergebnis wegwerfen, das gleich eintrifft.
    const accepted = trigger.ok || trigger.reason !== "rejected";

    if (!trigger.ok) {
      console.warn(
        `[Scraper] n8n-Trigger für ${websiteUrl} nicht bestätigt (${trigger.reason}): ${trigger.message}`,
      );
      await audit("scraper_job_trigger_failed", job.id, false, trigger.message);
    }

    // Überschreibt bewusst auch ein "completed", das der Entry-Flow in der
    // Zwischenzeit gesetzt haben kann: Der setzt es fest verdrahtet, obwohl der
    // Deep-Scrape danach erst losläuft. "processing" ist der ehrlichere Stand.
    // Auf suggestedConfig hat das keinen Einfluss – die Spalte bleibt unberührt.
    job = await prisma.scraperJob.update({
      where: { id: job.id },
      data: {
        status: accepted ? "processing" : "failed",
        startedAt: new Date(),
      },
    });

    return res.status(201).json({
      success: true,
      message: accepted
        ? "Scraper job created successfully"
        : "Scraper job created, but n8n did not accept the trigger",
      data: job,
      jobId: job.id,
      n8nTriggered: trigger.ok,
      ...(trigger.ok ? {} : { warning: trigger.message }),
    });
  } catch (error) {
    // P2002 = Unique-Verletzung auf websiteUrl. Passiert im Rennen zwischen der
    // Prüfung oben und dem create, etwa wenn n8n die Zeile aus einem früheren
    // Landingpage-Scrape genau dazwischen anlegt. Fachlich ist das derselbe
    // Konflikt wie oben und kein Serverfehler.
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      return res.status(409).json({
        success: false,
        error: "URL already being processed",
        message: "Für diese Website läuft bereits eine Analyse.",
      });
    }

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
 * ✅ GET /api/scraper/:id - Get scraper job status and results
 *
 * Der Polling-Endpunkt des Auto-Konfigurators. Er liefert dieselben Felder wie
 * das alte, unauthentifizierte GET /api/scraper-job/full – inklusive
 * suggestedConfig –, nur besitzgebunden.
 *
 * Response: { success: true; data: <normalisierter Job> }
 * Fertig ist der Vorgang, wenn data.suggestedConfig gesetzt ist.
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
      data: normalizeScraperJob(job),
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
    // Auf den Besitzer eingegrenzt: Vorher genügte eine fremde Job-ID, um deren
    // Scrape-Ergebnis (Kontaktdaten, Speisekarte, Bilder eines fremden Betriebs)
    // in die eigene Konfiguration zu kopieren.
    const job = await prisma.scraperJob.findFirst({
      where: { id, userId },
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
    // parseMaybeJson, weil die Spalte je nach Typ ein Objekt ODER einen String
    // enthält (n8n schreibt JSON.stringify hinein).
    const draft = suggestedConfigToDraft(
      parseMaybeJson(job.suggestedConfig) as SuggestedConfig | null,
    );

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
          secondaryColor:
            draft.design.secondaryColor || existing.secondaryColor,
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
          menuItems: (draft.content.menuItems ??
            []) as unknown as Prisma.InputJsonValue,
          gallery: (draft.content.gallery ??
            []) as unknown as Prisma.InputJsonValue,
          contactMethods: (draft.contact.contactMethods ??
            []) as unknown as Prisma.InputJsonValue,
          openingHours: (draft.content.openingHours ??
            {}) as unknown as Prisma.InputJsonValue,
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
