import { Router } from "express";
import { webAppsRouter, publicAppsRouter } from "./webapps";
import { configurationsRouter, getPublishedSite } from "./configurations";
import { getConfigBySlug } from "./config";
import { fetchInstagramPhotos } from "./instagram";
import { handleDemo } from "./demo";
import templatesRouter from "./templates";
import scraperRouter from "./scraper";
import subscriptionsRouter from "./subscriptions";

// Erstellen Sie einen Haupt-API-Router, um alle Teil-Routen zu bündeln
export const apiRouter = Router();

// Mount routers at their respective API paths
apiRouter.use("/configurations", configurationsRouter);
apiRouter.use("/webapps", webAppsRouter);
apiRouter.use("/webapps", publicAppsRouter);
apiRouter.use("/templates", templatesRouter);
apiRouter.use("/scraper/jobs", scraperRouter);
apiRouter.use("/subscriptions", subscriptionsRouter);

// Standalone configuration routes (for backward compatibility)
apiRouter.get("/config/:slug", getConfigBySlug);
apiRouter.get("/sites/:subdomain", getPublishedSite);

// Other routes
apiRouter.get("/demo", handleDemo);
apiRouter.get("/instagram", fetchInstagramPhotos);

// Health-Check
apiRouter.get("/ping", (_req, res) => {
  const ping = process.env.PING_MESSAGE ?? "ping";
  res.json({ message: ping });
});
