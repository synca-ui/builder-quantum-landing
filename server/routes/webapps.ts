import { Router } from "express";
import { requireAuth } from "../middleware/auth";
import prisma from "../db/prisma";
import { ensureUserBusiness } from "../services/BusinessService";

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

webAppsRouter.post("/apps/publish", async (req, res) => {
  try {
    const userId = req.user!.id;
    const { subdomain, config } = req.body || {};
    if (!subdomain || !config)
      return res.status(400).json({ error: "Missing subdomain or config" });

    // ============ MULTI-TENANCY: Ensure User -> Business -> BusinessMember Link ============
    // Before creating/updating WebApp, ensure the user owns a business
    // This prevents orphaned WebApps and ensures proper access control
    let businessId: string | undefined;
    try {
      const businessSetup = await ensureUserBusiness(
        userId,
        config?.businessName || "Unnamed Business",
        undefined,
        {
          primaryColor: config?.primaryColor || "#000000",
          secondaryColor: config?.secondaryColor || "#ffffff",
          fontFamily: config?.fontFamily || "sans",
        }
      );
      businessId = businessSetup.businessId;

      console.log(
        `[WebApps] Publish: User-Business link verified: userId="${userId}", businessId="${businessId}"`
      );
    } catch (error) {
      console.error(
        "[WebApps] FATAL: Failed to establish User-Business link during publish:",
        error
      );
      return res.status(500).json({
        error: "Failed to verify business ownership for webapp publish",
        details: error instanceof Error ? error.message : "Unknown error",
      });
    }

    // ============ END MULTI-TENANCY VERIFICATION ============

    // Compute URLs preferring explicit env config
    const host = (req.headers.host || "").toString();
    const hdrProto = ((req.headers["x-forwarded-proto"] as string) || "https").toString();
    const siteUrlFromEnv = process.env.SITE_URL;
    let baseHost = process.env.PUBLIC_BASE_DOMAIN || (host.includes(".") ? host.split(".").slice(-2).join(".") : host);
    let proto = hdrProto;
    if (siteUrlFromEnv) {
      try {
        const u = new URL(siteUrlFromEnv);
        baseHost = u.hostname.replace(/^www\./, "");
        proto = u.protocol.replace(":", "") || proto;
      } catch {}
    }
    const publishedUrl = `https://${subdomain}.${baseHost}`;
    const previewOrigin = siteUrlFromEnv ? siteUrlFromEnv.replace(/\/$/, "") : `https://${baseHost}`;
    const previewUrl = `${previewOrigin}/site/${subdomain}`;

    // Fire-and-forget DB upsert to avoid request timeouts in serverless
    (async () => {
      try {
        await prisma.webApp.upsert({
          where: { subdomain },
          create: {
            userId,
            subdomain,
            configData: config,
          },
          update: {
            configData: config,
          },
        });
      } catch (e) {
        console.error("apps/publish background save failed", e);
      }
    })().catch((e) => console.error("apps/publish background error", e));

    return res.json({ subdomain, publishedUrl, previewUrl });
  } catch (e) {
    console.error("publish app error", e);
    return res.status(500).json({ error: "Internal server error" });
  }
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
