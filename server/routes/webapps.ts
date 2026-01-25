import { Router, Request, Response } from "express";
import { requireAuth } from "../middleware/auth";
import prisma from "../db/prisma";
import { ensureUserBusiness } from "../services/BusinessService";
import { createAuditLogger } from "../utils/audit";

// ============================================
// VALIDATION HELPERS
// ============================================

interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

const RESERVED_SUBDOMAINS = [
  "www", "admin", "api", "app", "mail", "ftp", "blog", "shop", "store",
  "help", "support", "info", "news", "test", "demo", "staging", "dev",
  "dashboard", "portal", "account", "accounts", "login", "signin", "signup",
  "auth", "oauth", "static", "assets", "cdn", "media", "images", "img",
  "files", "download", "downloads", "docs", "documentation", "status",
  "health", "ping", "metrics", "analytics", "tracking", "webhook", "webhooks",
  "graphql", "rest", "socket", "ws", "wss", "ssl", "secure", "maitr"
];

function validatePublishData(config: any, subdomain: string): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Required: Business name
  if (!config?.business?.name || config.business.name.length < 2) {
    errors.push("Geschäftsname ist erforderlich (mindestens 2 Zeichen)");
  }

  // Required: Business type
  if (!config?.business?.type) {
    errors.push("Geschäftstyp ist erforderlich");
  }

  // Required: Template
  if (!config?.design?.template) {
    errors.push("Template muss ausgewählt werden");
  }

  // Required: Valid subdomain
  if (!subdomain || subdomain.length < 3) {
    errors.push("Subdomain muss mindestens 3 Zeichen haben");
  } else if (!/^[a-z0-9][a-z0-9-]*[a-z0-9]$/.test(subdomain) && subdomain.length > 2) {
    errors.push("Subdomain darf nur Kleinbuchstaben, Zahlen und Bindestriche enthalten");
  } else if (RESERVED_SUBDOMAINS.includes(subdomain)) {
    errors.push("Diese Subdomain ist reserviert");
  }

  // Warnings for optional but recommended fields
  if (!config?.contact?.email && !config?.contact?.phone) {
    warnings.push("Keine Kontaktdaten angegeben");
  }

  if (!config?.content?.menuItems || config.content.menuItems.length === 0) {
    warnings.push("Keine Speisekarte/Produkte hinzugefügt");
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings
  };
}

function normalizeSubdomain(input: string): string {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9-]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .substring(0, 63);
}

export const webAppsRouter = Router();

// Protect only /apps* routes with auth (avoid intercepting other /api paths)
webAppsRouter.use("/apps", requireAuth);

webAppsRouter.get("/apps", async (req, res) => {
  try {
    const userId = req.user!.id;
    const apps = await prisma.webApp.findMany({
      where: { userId },
      orderBy: { updatedAt: "desc" },
      select: {
        id: true,
        userId: true,
        subdomain: true,
        configData: true,
        publishedAt: true,
        updatedAt: true,
      },
    });
    return res.json({ apps });
  } catch (e) {
    console.error("get apps error", e);
    return res.status(500).json({ error: "Internal server error" });
  }
});

webAppsRouter.get("/apps/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user!.id;
    const app = await prisma.webApp.findFirst({
      where: { id, userId },
      select: {
        id: true,
        userId: true,
        subdomain: true,
        configData: true,
        publishedAt: true,
        updatedAt: true,
      },
    });
    if (!app) {
      return res.status(404).json({ error: "Not found" });
    }
    return res.json(app);
  } catch (e) {
    console.error("get app error", e);
    return res.status(500).json({ error: "Internal server error" });
  }
});

/**
 * POST /api/apps/publish - Full publish flow
 * Validates, persists to NeonDB, and activates subdomain routing
 */
webAppsRouter.post("/apps/publish", async (req: Request, res: Response) => {
  const startTime = Date.now();
  const userId = req.user!.id;

  const audit = createAuditLogger({
    userId,
    ipAddress: req.ip,
    userAgent: req.get("user-agent"),
  });

  try {
    const { subdomain: rawSubdomain, config, configId } = req.body || {};

    if (!rawSubdomain || !config) {
      return res.status(400).json({
        success: false,
        error: "subdomain und config sind erforderlich",
        stage: "validation"
      });
    }

    const subdomain = normalizeSubdomain(rawSubdomain);

    // ============ STAGE 1: VALIDATION ============
    console.log(`[Publish] Stage 1: Validating config for ${subdomain}...`);

    const validation = validatePublishData(config, subdomain);
    if (!validation.valid) {
      return res.status(400).json({
        success: false,
        error: "Validierung fehlgeschlagen",
        errors: validation.errors,
        warnings: validation.warnings,
        stage: "validation"
      });
    }

    // ============ STAGE 2: CHECK SUBDOMAIN AVAILABILITY ============
    console.log(`[Publish] Stage 2: Checking subdomain availability...`);

    const existingWebApp = await prisma.webApp.findUnique({
      where: { subdomain },
      select: { id: true, userId: true, configId: true }
    });

    // Allow update if user owns the subdomain
    if (existingWebApp && existingWebApp.userId !== userId) {
      return res.status(409).json({
        success: false,
        error: "Diese Subdomain ist bereits vergeben",
        stage: "subdomain_check"
      });
    }

    // ============ STAGE 3: ENSURE BUSINESS LINK ============
    console.log(`[Publish] Stage 3: Ensuring business link...`);

    let businessId: string | undefined;
    try {
      const businessName = config?.business?.name || config?.businessName || "Unnamed Business";
      const businessSetup = await ensureUserBusiness(
        userId,
        businessName,
        undefined,
        {
          primaryColor: config?.design?.primaryColor || config?.primaryColor || "#000000",
          secondaryColor: config?.design?.secondaryColor || config?.secondaryColor || "#ffffff",
          fontFamily: config?.design?.fontFamily || config?.fontFamily || "sans",
        },
      );
      businessId = businessSetup.businessId;
    } catch (error) {
      console.error("[Publish] Business link failed:", error);
      // Non-fatal - continue without business link
    }

    // ============ STAGE 4: PERSIST TO DATABASE ============
    console.log(`[Publish] Stage 4: Persisting to database...`);

    const baseDomain = process.env.PUBLIC_BASE_DOMAIN || "maitr.de";
    const publishedUrl = `https://${subdomain}.${baseDomain}`;
    const previewUrl = `${process.env.SITE_URL || `https://${baseDomain}`}/site/${subdomain}`;
    const now = new Date();

    // Flatten config for storage - supports both nested and flat formats
    const flatConfig = {
      // Business info
      businessName: config?.business?.name || config?.businessName || "",
      businessType: config?.business?.type || config?.businessType || "",
      location: config?.business?.location || config?.location || "",
      slogan: config?.business?.slogan || config?.slogan || "",
      uniqueDescription: config?.business?.uniqueDescription || config?.uniqueDescription || "",

      // Design
      template: config?.design?.template || config?.template || "",
      primaryColor: config?.design?.primaryColor || config?.primaryColor || "#111827",
      secondaryColor: config?.design?.secondaryColor || config?.secondaryColor || "#6B7280",
      fontFamily: config?.design?.fontFamily || config?.fontFamily || "sans-serif",
      headerFontSize: config?.design?.headerFontSize || 24,

      // Content
      menuItems: config?.content?.menuItems || config?.menuItems || [],
      gallery: config?.content?.gallery || config?.gallery || [],
      openingHours: config?.content?.openingHours || config?.openingHours || {},

      // Features
      reservationsEnabled: config?.features?.reservationsEnabled ?? config?.reservationsEnabled ?? false,
      maxGuests: config?.features?.maxGuests || config?.maxGuests || 10,
      onlineOrdering: config?.features?.onlineOrdering ?? config?.onlineOrdering ?? false,
      onlineStore: config?.features?.onlineStore ?? config?.onlineStore ?? false,
      teamArea: config?.features?.teamArea ?? config?.teamArea ?? false,

      // Contact
      email: config?.contact?.email || "",
      phone: config?.contact?.phone || "",
      contactMethods: config?.contact?.methods || config?.contactMethods || [],
      socialMedia: config?.contact?.social || config?.socialMedia || {},

      // Pages
      selectedPages: config?.pages?.selected || config?.selectedPages || ["home"],
      customPages: config?.pages?.custom || config?.customPages || [],

      // SEO
      seoTitle: config?.seo?.title || "",
      seoDescription: config?.seo?.description || "",

      // Domain
      selectedDomain: subdomain,
      publishedUrl,

      // Status
      status: "published",
      publishedAt: now.toISOString(),
    };

    // Transaction: Update Configuration + Upsert WebApp atomically
    const result = await prisma.$transaction(async (tx) => {
      // Update or create Configuration if we have an ID
      let configuration = null;
      if (configId) {
        configuration = await tx.configuration.update({
          where: { id: configId },
          data: {
            status: "published",
            publishedUrl,
            selectedDomain: subdomain,
            businessName: flatConfig.businessName,
            businessType: flatConfig.businessType,
            location: flatConfig.location,
            slogan: flatConfig.slogan,
            template: flatConfig.template,
            primaryColor: flatConfig.primaryColor,
            secondaryColor: flatConfig.secondaryColor,
            fontFamily: flatConfig.fontFamily,
            menuItems: flatConfig.menuItems,
            gallery: flatConfig.gallery,
            openingHours: flatConfig.openingHours,
            reservationsEnabled: flatConfig.reservationsEnabled,
            maxGuests: flatConfig.maxGuests,
            onlineOrdering: flatConfig.onlineOrdering,
            contactMethods: flatConfig.contactMethods,
            socialMedia: flatConfig.socialMedia,
            selectedPages: flatConfig.selectedPages,
            updatedAt: now,
          },
        });
      }

      // Upsert WebApp - this makes the subdomain immediately active
      const webApp = await tx.webApp.upsert({
        where: { subdomain },
        create: {
          userId,
          configId: configId || `temp-${Date.now()}`,
          subdomain,
          configData: { ...config, ...flatConfig, _publishedAt: now.toISOString() },
          publishedAt: now,
        },
        update: {
          configData: { ...config, ...flatConfig, _publishedAt: now.toISOString() },
          publishedAt: now,
          updatedAt: now,
        },
      });

      return { configuration, webApp };
    });

    // ============ STAGE 5: AUDIT & RESPOND ============
    const elapsed = Date.now() - startTime;
    console.log(`[Publish] ✅ Published ${subdomain} in ${elapsed}ms`);

    await audit("webapp_published", result.webApp.id, true);

    return res.json({
      success: true,
      subdomain,
      publishedUrl,
      previewUrl,
      webAppId: result.webApp.id,
      configId: result.configuration?.id || configId,
      publishedAt: now.toISOString(),
      elapsed,
      warnings: validation.warnings,
      stage: "complete"
    });

  } catch (error) {
    console.error("[Publish] Fatal error:", error);
    await audit("webapp_publish_failed", "unknown", false,
      error instanceof Error ? error.message : "Unknown error"
    );

    return res.status(500).json({
      success: false,
      error: "Veröffentlichung fehlgeschlagen",
      message: error instanceof Error ? error.message : "Unbekannter Fehler",
      stage: "error"
    });
  }
});

// Legacy endpoint - redirects to new publish
webAppsRouter.post("/apps/legacy-publish", async (req, res) => {
  const userId = req.user!.id;
  const { subdomain, config } = req.body || {};
  if (!subdomain || !config)
    return res.status(400).json({ error: "Missing subdomain or config" });

  const baseDomain = process.env.PUBLIC_BASE_DOMAIN || "maitr.de";
  const publishedUrl = `https://${subdomain}.${baseDomain}`;
  const previewUrl = `${process.env.SITE_URL || `https://${baseDomain}`}/site/${subdomain}`;

  // Fire-and-forget DB upsert
  prisma.webApp.upsert({
    where: { subdomain },
    create: { userId, subdomain, configId: `legacy-${Date.now()}`, configData: config },
    update: { configData: config },
  }).catch(e => console.error("legacy publish failed", e));

  return res.json({ subdomain, publishedUrl, previewUrl });
});

webAppsRouter.put("/apps/:id", async (req, res) => {
  try {
    const userId = req.user!.id;
    const { id } = req.params;
    const { config } = req.body || {};
    if (!config) return res.status(400).json({ error: "Missing config" });

    const app = await prisma.webApp.updateMany({
      where: { id, userId },
      data: { configData: config },
    });

    if (app.count === 0) {
      return res.status(404).json({ error: "Not found" });
    }

    const updated = await prisma.webApp.findUnique({
      where: { id },
      select: {
        id: true,
        userId: true,
        subdomain: true,
        configData: true,
        publishedAt: true,
        updatedAt: true,
      },
    });

    return res.json(updated);
  } catch (e) {
    console.error("update app error", e);
    return res.status(500).json({ error: "Internal server error" });
  }
});

// Public endpoint (no auth)
export const publicAppsRouter = Router();
publicAppsRouter.get("/public/apps/:subdomain", async (req, res) => {
  try {
    const { subdomain } = req.params;
    const app = await prisma.webApp.findUnique({
      where: { subdomain },
      select: { configData: true },
    });
    if (!app) {
      return res.status(404).json({ error: "Not found" });
    }
    return res.json({ config: app.configData });
  } catch (e) {
    console.error("public app error", e);
    return res.status(500).json({ error: "Internal server error" });
  }
});
