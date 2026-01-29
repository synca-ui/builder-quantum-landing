import { Request, Response, Router } from "express";
import prisma from "../db/prisma";
import { requireAuth } from "../middleware/auth";
import { ConfigurationSchema, type Configuration } from "../schemas/configuration";
import { createAuditLogger } from "../utils/audit";

const router = Router();

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * ✅ RLS Check: Verify user owns or has access to business
 */
async function authorizeUserBusiness(
  userId: string,
  businessId: string | undefined | null,
): Promise<boolean> {
  if (!businessId) return true;

  const membership = await prisma.businessMember.findFirst({
    where: { userId, businessId },
  });

  return !!membership;
}

/**
 * ✅ Helper: Get all businesses user has access to
 */
async function getUserBusinessAccess(userId: string): Promise<string[]> {
  const memberships = await prisma.businessMember.findMany({
    where: { userId },
    select: { businessId: true },
  });
  return memberships.map((m) => m.businessId);
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

/**
 * ✅ Generate subdomain from business name
 */
function generateSubdomain(businessName: string): string {
  return (
    businessName
      .toLowerCase()
      .replace(/[^a-z0-9]/g, "-")
      .replace(/-+/g, "-")
      .substring(0, 30)
      .replace(/^-|-$/g, "") ||
    `restaurant-${Math.random().toString(36).slice(2, 7)}`
  );
}

/**
 * ✅ Helper: Map nested configuration to flat Prisma structure
 */
function mapConfigToDatabase(configData: Configuration, selectedTemplate?: string) {
  return {
    businessName: configData.business.name,
    businessType: configData.business.type,
    location: configData.business.location,
    slogan: configData.business.slogan,
    uniqueDescription: configData.business.uniqueDescription,
    template: configData.design.template,
    selectedTemplate,
    primaryColor: configData.design.primaryColor,
    secondaryColor: configData.design.secondaryColor,
    fontFamily: configData.design.fontFamily,
    backgroundColor: configData.design.backgroundColor,
    fontColor: configData.design.fontColor,
    priceColor: configData.design.priceColor,
    headerFontColor: configData.design.headerFontColor,
    headerFontSize: configData.design.headerFontSize,
    headerBackgroundColor: configData.design.headerBackgroundColor,
    menuItems: configData.content.menuItems as any,
    gallery: configData.content.gallery as any,
    openingHours: configData.content.openingHours as any,
    homepageDishImageVisibility: configData.content.homepageDishImageVisibility,
    reservationsEnabled: configData.features.reservationsEnabled,
    maxGuests: configData.features.maxGuests,
    onlineOrdering: configData.features.onlineOrderingEnabled,
    onlineStore: configData.features.onlineStoreEnabled,
    teamArea: configData.features.teamAreaEnabled,
    reservationButtonColor: configData.features.reservationButtonColor,
    reservationButtonTextColor: configData.features.reservationButtonTextColor,
    reservationButtonShape: configData.features.reservationButtonShape,
    contactMethods: configData.contact.contactMethods,
    socialMedia: configData.contact.socialMedia,
    selectedPages: configData.pages.selectedPages,
    customPages: configData.pages.customPages,
    paymentOptions: configData.payments.paymentOptions || [],
    offers: configData.payments.offers || [],
    selectedDomain: configData.business.domain?.selectedDomain,
    hasDomain: configData.business.domain?.hasDomain || false,
    domainName: configData.business.domain?.domainName,
  };
}

// ============================================
// HANDLER FUNCTIONS
// ============================================

/**
 * ✅ POST /api/configurations - Create or Update Configuration
 */
export async function saveConfiguration(req: Request, res: Response) {
  const userId = req.user!.id;
  const audit = getAuditLogger(req);

  try {
    // 1. Validate and parse configuration with userId from auth context
    const bodyWithUserId = {
      ...req.body,
      userId,
    };

    const parsed = ConfigurationSchema.safeParse(bodyWithUserId);
    if (!parsed.success) {
      await audit(
        "config_update_failed",
        req.body.id || "unknown",
        false,
        "Validation failed",
      );

      return res.status(400).json({
        error: "Invalid configuration data",
        details: parsed.error.issues,
      });
    }

    const configData = parsed.data;
    const businessId = (req.body as any).businessId || null;
    const selectedTemplate = (req.body as any).selectedTemplate;

    // 2. Verify business access
    if (businessId && !(await authorizeUserBusiness(userId, businessId))) {
      await audit(
        "config_update_failed",
        configData.id || "unknown",
        false,
        "Unauthorized business access",
      );

      return res.status(403).json({
        error: "Forbidden",
        message: "You do not have access to this business",
      });
    }

    // 3. Update existing configuration
    if (configData.id) {
      const existing = await prisma.configuration.findFirst({
        where: { id: configData.id, userId },
      });

      if (!existing) {
        await audit(
          "config_update_failed",
          configData.id,
          false,
          "Configuration not found",
        );
        return res.status(404).json({ error: "Configuration not found" });
      }

      // Validate template if specified
      if (selectedTemplate) {
        const template = await prisma.template.findUnique({
          where: { id: selectedTemplate },
        });

        if (!template) {
          return res.status(400).json({
            error: "Invalid template",
            message: `Template "${selectedTemplate}" not found`,
          });
        }

        // Check premium template access
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
          ...mapConfigToDatabase(configData, selectedTemplate),
          updatedAt: new Date(),
        },
      });

      await audit("config_updated", updated.id, true);

      return res.json({
        success: true,
        data: updated,
        message: "Configuration updated successfully",
      });
    }

    // 4. Create new configuration
    const newConfig = await prisma.configuration.create({
      data: {
        userId,
        businessId,
        ...mapConfigToDatabase(configData, selectedTemplate),
        status: "draft",
      },
    });

    await audit("config_created", newConfig.id, true);

    return res.status(201).json({
      success: true,
      data: newConfig,
      message: "Configuration created successfully",
    });
  } catch (error) {
    console.error("[Configurations] Save error:", error);
    await audit(
      "config_save_error",
      req.body.id || "unknown",
      false,
      error instanceof Error ? error.message : "Unknown error",
    );

    return res.status(500).json({
      error: "Failed to save configuration",
      message: error instanceof Error ? error.message : undefined,
    });
  }
}

/**
 * ✅ GET /api/configurations - List all user's configurations
 */
export async function getConfigurations(req: Request, res: Response) {
  const userId = req.user!.id;

  try {
    const businessIds = await getUserBusinessAccess(userId);

    const configurations = await prisma.configuration.findMany({
      where: {
        OR: [{ userId }, { businessId: { in: businessIds } }],
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
}

/**
 * ✅ GET /api/configurations/:id - Get single configuration
 */
export async function getConfiguration(req: Request, res: Response) {
  const { id } = req.params;
  const userId = req.user!.id;

  try {
    const configuration = await prisma.configuration.findFirst({
      where: { id, userId },
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
}

/**
 * ✅ DELETE /api/configurations/:id
 */
export async function deleteConfiguration(req: Request, res: Response) {
  const { id } = req.params;
  const userId = req.user!.id;
  const audit = getAuditLogger(req);

  try {
    const existing = await prisma.configuration.findFirst({
      where: { id, userId },
    });

    if (!existing) {
      await audit("config_delete_failed", id, false, "Not found or unauthorized");

      return res.status(403).json({
        error: "Forbidden",
        message: "Configuration not found or you do not have permission to delete it",
      });
    }

    await prisma.addOnInstance.deleteMany({
      where: { configId: id },
    });

    await prisma.configuration.delete({
      where: { id },
    });

    await audit("config_deleted", id, true);

    return res.json({
      success: true,
      message: "Configuration deleted successfully",
    });
  } catch (error) {
    console.error("[Configurations] Delete error:", error);
    await audit(
      "config_delete_error",
      id,
      false,
      error instanceof Error ? error.message : "Unknown",
    );

    return res.status(500).json({
      error: "Failed to delete configuration",
    });
  }
}

/**
 * ✅ POST /api/configurations/:id/publish
 * Veröffentlicht eine Konfiguration auf der gewählten Subdomain
 */
export async function publishConfiguration(req: Request, res: Response) {
  const { id } = req.params;
  const userId = req.user!.id;
  const audit = getAuditLogger(req);

  try {
    const configuration = await prisma.configuration.findFirst({
      where: { id, userId },
    });

    if (!configuration) {
      await audit("config_publish_failed", id, false, "Not found or unauthorized");
      return res.status(404).json({
        error: "Not Found",
        message: "Konfiguration wurde nicht gefunden.",
      });
    }

    const subscription = await prisma.subscription.findUnique({
      where: { userId },
    });

    const maxSites = subscription?.maxSites || 1;
    const publishedSites = await prisma.configuration.count({
      where: { userId, status: "published" },
    });

    if (publishedSites >= maxSites) {
      return res.status(403).json({
        error: "Subscription limit exceeded",
        message: `Dein ${subscription?.plan || "Free"}-Plan erlaubt maximal ${maxSites} veröffentlichte Website(s).`,
        currentPublished: publishedSites,
        maxAllowed: maxSites,
      });
    }

    const subdomain = (configuration as any).selectedDomain || generateSubdomain(configuration.businessName);

    if (!subdomain) {
      return res.status(400).json({
        error: "Validation Error",
        message: "Es wurde keine Subdomain ausgewählt.",
      });
    }

    const existingWebApp = await prisma.webApp.findUnique({
      where: { subdomain },
    });

    if (existingWebApp && existingWebApp.configId !== configuration.id) {
      return res.status(400).json({
        error: "Subdomain already taken",
        message: "Diese Subdomain ist bereits vergeben. Bitte wähle eine andere.",
      });
    }

    const published = await prisma.configuration.update({
      where: { id },
      data: {
        status: "published",
        publishedUrl: `https://${subdomain}.maitr.de`,
        updatedAt: new Date(),
      },
    });

    const webApp = await prisma.webApp.upsert({
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
      webAppId: webApp.id,
      publishedUrl: `https://${subdomain}.maitr.de`,
      message: "Website wurde erfolgreich veröffentlicht! 🚀",
    });
  } catch (error) {
    console.error("[Configurations] Publish error:", error);
    await audit(
      "config_publish_error",
      id,
      false,
      error instanceof Error ? error.message : "Unknown",
    );

    return res.status(500).json({
      error: "Fehler beim Veröffentlichen",
      message: error instanceof Error ? error.message : undefined,
    });
  }
}

/**
 * ✅ GET /api/sites/:subdomain - Get published site (PUBLIC)
 */
export async function getPublishedSite(req: Request, res: Response) {
  const { subdomain } = req.params;

  try {
    const webApp = await prisma.webApp.findUnique({
      where: { subdomain },
      select: {
        id: true,
        subdomain: true,
        configData: true,
        publishedAt: true,
        updatedAt: true,
      },
    });

    if (!webApp) {
      return res.status(404).json({
        success: false,
        error: "Site not found",
      });
    }

    const config = webApp.configData as any;

    if (!config) {
      return res.status(404).json({
        success: false,
        error: "Configuration not found",
      });
    }

    const flatConfig = {
      id: webApp.id,
      userId: config.userId || "published",
      businessName: config.business?.name || config.businessName || "",
      businessType: config.business?.type || config.businessType || "",
      location: config.business?.location || config.location || "",
      slogan: config.business?.slogan || config.slogan || "",
      uniqueDescription: config.business?.uniqueDescription || config.uniqueDescription || "",
      template: config.design?.template || config.template || "modern",
      primaryColor: config.design?.primaryColor || config.primaryColor || "#111827",
      secondaryColor: config.design?.secondaryColor || config.secondaryColor || "#6B7280",
      fontFamily: config.design?.fontFamily || config.fontFamily || "sans-serif",
      backgroundColor: config.design?.backgroundColor || config.backgroundColor,
      fontColor: config.design?.fontColor || config.fontColor,
      headerFontSize: config.design?.headerFontSize || config.headerFontSize || 24,
      logo: config.design?.logo || config.logo,
      selectedPages: config.pages?.selected || config.selectedPages || ["home"],
      customPages: config.pages?.custom || config.customPages || [],
      openingHours: config.content?.openingHours || config.openingHours || {},
      menuItems: config.content?.menuItems || config.menuItems || [],
      gallery: config.content?.gallery || config.gallery || [],
      reservationsEnabled: config.features?.reservationsEnabled ?? config.reservationsEnabled ?? false,
      maxGuests: config.features?.maxGuests || config.maxGuests || 10,
      onlineOrdering: config.features?.onlineOrdering ?? config.onlineOrdering ?? false,
      onlineStore: config.features?.onlineStore ?? config.onlineStore ?? false,
      teamArea: config.features?.teamArea ?? config.teamArea ?? false,
      contactMethods: config.contact?.methods || config.contactMethods || [],
      socialMedia: config.contact?.social || config.socialMedia || {},
      offers: config.offers || [],
      offerBanner: config.offerBanner,
      reservationButtonColor: config.reservationButtonColor,
      reservationButtonTextColor: config.reservationButtonTextColor,
      reservationButtonShape: config.reservationButtonShape,
      homepageDishImageVisibility: config.homepageDishImageVisibility,
      themeMode: config.themeMode,
      templateThemes: config.templateThemes,
      publishedAt: webApp.publishedAt,
      updatedAt: webApp.updatedAt,
      status: "published",
    };

    return res.json({
      success: true,
      data: flatConfig,
    });
  } catch (error) {
    console.error("[Configurations] Get published site error:", error);
    return res.status(500).json({
      success: false,
      error: "Failed to fetch published site",
    });
  }
}

/**
 * ✅ POST /api/configurations/:id/preview - Set preview config
 */
export async function setPreviewConfig(req: Request, res: Response) {
  const { id } = req.params;
  const userId = req.user?.id;

  try {
    const configuration = await prisma.configuration.findFirst({
      where: {
        id,
        ...(userId ? { userId } : {}),
      },
    });

    if (!configuration) {
      return res.status(404).json({ error: "Configuration not found" });
    }

    return res.json({
      success: true,
      data: configuration,
      message: "Preview config set",
    });
  } catch (error) {
    console.error("[Configurations] Set preview error:", error);
    return res.status(500).json({
      error: "Failed to set preview config",
    });
  }
}

// ============================================
// ROUTER SETUP
// ============================================

router.post("/", requireAuth, saveConfiguration);
router.get("/", requireAuth, getConfigurations);
router.get("/:id", requireAuth, getConfiguration);
router.delete("/:id", requireAuth, deleteConfiguration);
router.post("/:id/publish", requireAuth, publishConfiguration);
router.post("/:id/preview", setPreviewConfig);

// ============================================
// EXPORTS
// ============================================

export const configurationsRouter = router;
export default router;

