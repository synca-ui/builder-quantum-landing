import { Router } from "express";
import { webAppsRouter, publicAppsRouter } from "./webapps";
import { configurationsRouter, getPublishedSite } from "./configurations";
import { getConfigBySlug } from "./config";
import { fetchInstagramPhotos } from "./instagram";
import { handleDemo } from "./demo";
import templatesRouter from "./templates";
import scraperRouter from "./scraper";
import subscriptionsRouter from "./subscriptions";
import { subdomainsRouter } from "./subdomains";
import { handleForwardN8n } from "./n8nProxy";
import insightsRouter from "./insights";
import floorPlanRouter from "./floor-plan";
import demoDashboardRouter from "./demo-dashboard";
import staffRouter from "./staff";
import creativeStudioRouter from "./creative-studio";
import adminRouter from "./admin";

// Erstellen Sie einen Haupt-API-Router, um alle Teil-Routen zu bündeln
export const apiRouter = Router();

// Mount routers at their respective API paths
apiRouter.use("/configurations", configurationsRouter);
apiRouter.use("/webapps", webAppsRouter);
apiRouter.use("/webapps", publicAppsRouter);
apiRouter.use("/templates", templatesRouter);
apiRouter.use("/scraper", scraperRouter);
apiRouter.use("/subscriptions", subscriptionsRouter);
apiRouter.use("/subdomains", subdomainsRouter);

// Dashboard API routes (authenticated)
apiRouter.use("/dashboard/insights", insightsRouter);
apiRouter.use("/dashboard/floor-plan", floorPlanRouter);
apiRouter.use("/dashboard/staff", staffRouter);
apiRouter.use("/dashboard/creative", creativeStudioRouter);
apiRouter.use("/dashboard/admin", adminRouter);

// Demo Dashboard API routes (no auth required)
apiRouter.use("/demo/dashboard", demoDashboardRouter);


// Standalone configuration routes (for backward compatibility)
apiRouter.get("/config/:slug", getConfigBySlug);
apiRouter.get("/sites/:subdomain", getPublishedSite);

// Other routes
apiRouter.get("/demo", handleDemo);
apiRouter.get("/instagram", fetchInstagramPhotos);

//N8N
apiRouter.post("/forward-to-n8n", handleForwardN8n);


// Health-Check
apiRouter.get("/ping", (_req, res) => {
  const ping = process.env.PING_MESSAGE ?? "ping";
  res.json({ message: ping });
});
