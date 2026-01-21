import { Request, Response, Router } from "express";
import prisma from "../db/prisma";
import { requireAuth } from "../middleware/auth";
import { 
  LegacyConfigurationSchema,
  validateConfiguration,
} from "../schemas/configuration";
import type { Configuration } from "../schemas/configuration";
import { createAuditLogger } from "../utils/audit";

const router = Router();

// ============================================
// HELPERs FUNCTIONS
// ============================================

/**
 * ✅ RLS Check: Verify user owns or has access to business
 * This is the CRITICAL security function that prevents data leaks
 */
async function authorizeUserBusiness(
  userId: string,
  businessId: string | undefined | null
): Promise<boolean> {
  if (!businessId) {
    // User can create configs without explicit businessId
    return true;
  }

  // Check if user owns or is member of this business
  const membership = await prisma.businessMember.findFirst({
    where: {
      userId,
      businessId,
    },
  });

  return !!membership;
}

/**
 * ✅ RLS Check: Verify user owns configuration
 */
async function authorizeConfiguration(
  userId: string,
  configId: string
): Promise<boolean> {
  const config = await prisma.configuration.findFirst({
    where: {
      id: configId,
      userId, // ✅ CRITICAL: Filter by userId
    },
  });

  return !!config;
}

/**
 * ✅ Helper: Get all businesses user has access to
 */
async function getUserBusinessAccess(userId: string): Promise<string[]> {
  const memberships = await prisma.businessMember.findMany({
    where: { userId },
    select: { businessId: true },
  });
  return memberships.map(m => m.businessId);
}

/**
 * ✅ Audit logger helper
 */
function getAuditLogger(req: Request) {
  return createAuditLogger({
    userId: req.user!.id,
    ipAddress: req.ip,
    userAgent: req.get("user-agent"),
  });
}

// ============================================
// ENDPOINTS
// ============================================

/**
 * ✅ POST /api/configurations - Create or Update
 * WITH RLS: Only saves for authenticated user
 */
router.post("/", requireAuth, async (req: Request, res: Response) => {
  const userId = req.user!.id;
  const audit = getAuditLogger(req);

  try {
    // Validate request body
    const parsed = LegacyConfigurationSchema.safeParse(req.body);
    if (!parsed.success) {
      await audit(
        "config_update_failed",
        req.body.id || "unknown",
        false,
        "Validation failed"
      );

      return res.status(400).json({
        error: "Invalid configuration data",
        details: parsed.error.issues,
      });
    }

    const configData = parsed.data;

    // ✅ RLS CHECK 1: Verify businessId ownership
    if (configData.businessId) {
      const authorized = await authorizeUserBusiness(userId, configData.businessId);
      if (!authorized) {
        await audit(
          "config_update_failed",
          configData.id || "unknown",
          false,
          "Unauthorized business access"
        );

        return res.status(403).json({
          error: "Forbidden",
          message: "You do not have access to this business",
        });
      }
    }

    // Update existing or create new
    if (configData.id) {
      // ✅ RLS CHECK 2: Verify user owns config
      const existing = await prisma.configuration.findFirst({
        where: {
          id: configData.id,
          userId, // ✅ CRITICAL
        },
      });

      if (!existing) {
        await audit(
          "config_update_failed",
          configData.id,
          false,
          "Configuration not found"
        );

        return res.status(404).json({ error: "Configuration not found" });
      }

      // Validate template if specified
      if (configData.selectedTemplate) {
        const template = await prisma.template.findUnique({
          where: { id: configData.selectedTemplate },
        });

        if (!template) {
          return res.status(400).json({
            error: "Invalid template",
            message: `Template "${configData.selectedTemplate}" not found`,
          });
        }

        // Check if premium template and user has access
        if (template.isPremium) {
          const subscription = await prisma.subscription.findUnique({
            where: { userId },
          });

          if (!subscription || subscription.plan === "free") {
            return res.status(403).json({
              error: "Premium template requires upgrade",
              currentPlan: subscription?.plan || "free",
            });
          }
        }
      }

      // Update configuration
      const updated = await prisma.configuration.update({
        where: { id: configData.id },
        data: {
          businessName: configData.businessName,
          businessType: configData.businessType,
          location: configData.location,
          slogan: configData.slogan,
          uniqueDescription: configData.uniqueDescription,
          template: configData.template,
          selectedTemplate: configData.selectedTemplate,
          primaryColor: configData.primaryColor,
          secondaryColor: configData.secondaryColor,
          fontFamily: configData.fontFamily,
          menuItems: configData.menuItems,
          gallery: configData.gallery,
          openingHours: configData.openingHours,
          reservationsEnabled: configData.reservationsEnabled,
          maxGuests: configData.maxGuests,
          onlineOrdering: configData.onlineOrdering,
          onlineStore: configData.onlineStore,
          teamArea: configData.teamArea,
          contactMethods: configData.contactMethods,
          socialMedia: configData.socialMedia,
          selectedPages: configData.selectedPages,
          customPages: configData.customPages,
          paymentOptions: configData.paymentOptions,
          offers: configData.offers,
          updatedAt: new Date(),
        },
      });

      await audit("config_updated", updated.id, true);

      return res.json({
        success: true,
        data: updated,
        message: "Configuration updated",
      });
    } else {
      // Create new configuration
      const newConfig = await prisma.configuration.create({
        data: {
          userId, // ✅ CRITICAL: Always set from req.user, never from req.body
          businessId: configData.businessId,
          businessName: configData.businessName || "",
          businessType: configData.businessType || "",
          location: configData.location,
          slogan: configData.slogan,
          uniqueDescription: configData.uniqueDescription,
          template: configData.template || "",
          selectedTemplate: configData.selectedTemplate,
          primaryColor: configData.primaryColor || "#111827",
          secondaryColor: configData.secondaryColor || "#6B7280",
          fontFamily: configData.fontFamily || "sans-serif",
          menuItems: configData.menuItems || [],
          gallery: configData.gallery || [],
          openingHours: configData.openingHours || {},
          reservationsEnabled: configData.reservationsEnabled || false,
          maxGuests: configData.maxGuests || 10,
          onlineOrdering: configData.onlineOrdering || false,
          onlineStore: configData.onlineStore || false,
          teamArea: configData.teamArea || false,
          contactMethods: configData.contactMethods || [],
          socialMedia: configData.socialMedia || {},
          selectedPages: configData.selectedPages || ["home"],
          customPages: configData.customPages || [],
          paymentOptions: configData.paymentOptions || [],
          offers: configData.offers || [],
          status: "draft",
        },
      });

      await audit("config_created", newConfig.id, true);

      return res.status(201).json({
        success: true,
        data: newConfig,
        message: "Configuration created",
      });
    }
  } catch (error) {
    console.error("[Configurations] Save error:", error);
    await audit(
      "config_save_error",
      req.body.id || "unknown",
      false,
      error instanceof Error ? error.message : "Unknown error"
    );

    return res.status(500).json({
      error: "Failed to save configuration",
      message: error instanceof Error ? error.message : undefined,
    });
  }
});

/**
 * ✅ GET /api/configurations - List all user's configurations
 * WITH RLS: Only returns user's own configs and team configs
 */
router.get("/", requireAuth, async (req: Request, res: Response) => {
  const userId = req.user!.id;

  try {
    // Get all businesses user has access to
    const businessIds = await getUserBusinessAccess(userId);

    // ✅ RLS QUERY: Only user's own configs + team business configs
    const configurations = await prisma.configuration.findMany({
      where: {
        OR: [
          { userId }, // User's own configs
          { businessId: { in: businessIds } }, // Team business configs
        ],
      },
      include: {
        business: {
          select: { id: true, name: true, slug: true },
        },
      },
      orderBy: { updatedAt: "desc" },
    });

    return res.json({
      success: true,
      data: configurations,
      count: configurations.length,
    });
  } catch (error) {
    console.error("[Configurations] List error:", error);
    return res.status(500).json({
      error: "Failed to fetch configurations",
    });
  }
});

/**
 * ✅ GET /api/configurations/:id - Get single configuration
 * WITH RLS: Only if user owns or is team member
 */
router.get("/:id", requireAuth, async (req: Request, res: Response) => {
  const { id } = req.params;
  const userId = req.user!.id;

  try {
    // ✅ RLS QUERY: Filter by userId
    const configuration = await prisma.configuration.findFirst({
      where: {
        id,
        userId, // ✅ CRITICAL: Only own configs
      },
      include: {
        business: {
          include: {
            members: {
              select: { userId: true, role: true },
            },
          },
        },
        templateData: {
          select: {
            id: true,
            name: true,
            tokens: true,
            layout: true,
          },
        },
      },
    });

    if (!configuration) {
      return res.status(404).json({
        error: "Configuration not found",
        message: "This configuration does not exist or you do not have access",
      });
    }

    return res.json({
      success: true,
      data: configuration,
    });
  } catch (error) {
    console.error("[Configurations] Get error:", error);
    return res.status(500).json({
      error: "Failed to fetch configuration",
    });
  }
});

/**
 * ✅ DELETE /api/configurations/:id - Delete configuration
 * WITH RLS: Only if user owns it
 */
router.delete("/:id", requireAuth, async (req: Request, res: Response) => {
  const { id } = req.params;
  const userId = req.user!.id;
  const audit = getAuditLogger(req);

  try {
    // ✅ RLS CHECK: Verify user owns config
    const existing = await prisma.configuration.findFirst({
      where: {
        id,
        userId, // ✅ CRITICAL
      },
    });

    if (!existing) {
      await audit("config_delete_failed", id, false, "Not found or unauthorized");

      return res.status(403).json({
        error: "Forbidden",
        message: "Configuration not found or you do not have permission to delete it",
      });
    }

    // Delete all add-ons first (cascade won't work if we delete config directly)
    await prisma.addOnInstance.deleteMany({
      where: { configId: id },
    });

    // Delete configuration
    await prisma.configuration.delete({
      where: { id },
    });

    await audit("config_deleted", id, true);

    return res.json({
      success: true,
      message: "Configuration deleted",
    });
  } catch (error) {
    console.error("[Configurations] Delete error:", error);
    await audit("config_delete_error", id, false, error instanceof Error ? error.message : "Unknown");

    return res.status(500).json({
      error: "Failed to delete configuration",
    });
  }
});

/**
 * ✅ POST /api/configurations/:id/publish - Publish configuration
 * WITH RLS: Only if user owns it
 */
router.post("/:id/publish", requireAuth, async (req: Request, res: Response) => {
  const { id } = req.params;
  const userId = req.user!.id;
  const audit = getAuditLogger(req);

  try {
    // ✅ RLS CHECK: Verify user owns config
    const configuration = await prisma.configuration.findFirst({
      where: {
        id,
        userId, // ✅ CRITICAL
      },
    });

    if (!configuration) {
      await audit("config_publish_failed", id, false, "Not found or unauthorized");

      return res.status(403).json({
        error: "Forbidden",
        message: "Configuration not found or you do not have permission to publish it",
      });
    }

    // Check subscription limits
    const subscription = await prisma.subscription.findUnique({
      where: { userId },
    });

    const maxSites = subscription?.maxSites || 1;
    const publishedSites = await prisma.configuration.count({
      where: {
        userId,
        status: "published",
      },
    });

    if (publishedSites >= maxSites) {
      return res.status(403).json({
        error: "Subscription limit exceeded",
        message: `Your ${subscription?.plan || "free"} plan allows ${maxSites} published site(s). Upgrade to publish more.`,
        currentPublished: publishedSites,
        maxAllowed: maxSites,
      });
    }

    // Generate subdomain
    const subdomain = generateSubdomain(configuration.businessName);

    // Check if subdomain already taken
    const existing = await prisma.webApp.findUnique({
      where: { subdomain },
    });

    if (existing && existing.id !== configuration.id) {
      return res.status(400).json({
        error: "Subdomain already taken",
        message: "Choose a different business name or contact support",
      });
    }

    // Update configuration status
    const published = await prisma.configuration.update({
      where: { id },
      data: {
        status: "published",
        publishedUrl: `https://${subdomain}.maitr.de`,
        updatedAt: new Date(),
      },
    });

    // Create or update WebApp record
    await prisma.webApp.upsert({
      where: { configId: id },
      update: {
        subdomain,
        configData: published as any,
        publishedAt: new Date(),
      },
      create: {
        userId,
        configId: id,
        subdomain,
        configData: published as any,
        publishedAt: new Date(),
      },
    });

    await audit("config_published", id, true);

    return res.json({
      success: true,
      data: published,
      publishedUrl: `https://${subdomain}.maitr.de`,
      message: "Configuration published successfully",
    });
  } catch (error) {
    console.error("[Configurations] Publish error:", error);
    await audit(
      "config_publish_error",
      id,
      false,
      error instanceof Error ? error.message : "Unknown"
    );

    return res.status(500).json({
      error: "Failed to publish configuration",
      message: error instanceof Error ? error.message : undefined,
    });
  }
});

/**
 * ✅ GET /api/configurations/:id/access-check - Check if user can access
 * Used for debugging RLS issues
 */
router.get("/:id/access-check", requireAuth, async (req: Request, res: Response) => {
  const { id } = req.params;
  const userId = req.user!.id;

  try {
    const config = await prisma.configuration.findFirst({
      where: {
        id,
        userId,
      },
      select: {
        id: true,
        businessName: true,
        userId: true,
        status: true,
      },
    });

    if (!config) {
      return res.json({
        access: false,
        message: "Configuration not found or you do not have access",
      });
    }

    return res.json({
      access: true,
      config,
      message: "You have access to this configuration",
    });
  } catch (error) {
    return res.status(500).json({
      error: "Check failed",
    });
  }
});

// ============================================
// HELPER FUNCTIONS
// ============================================

function generateSubdomain(businessName: string): string {
  return (
    businessName
      .toLowerCase()
      .replace(/[^a-z0-9]/g, "-")
      .replace(/-+/g, "-")
      .substring(0, 30)
      .replace(/^-|-$/g, "") || `restaurant-${Math.random().toString(36).slice(2, 7)}`
  );
}

export default router;
