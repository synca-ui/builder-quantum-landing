import { Router } from "express";
import { webAppsRouter, publicAppsRouter } from "./webapps";
import {
  saveConfiguration,
  getConfigurations,
  getConfiguration,
  deleteConfiguration,
  publishConfiguration,
  getPublishedSite,
  setPreviewConfig,
} from "./configurations";
import { fetchInstagramPhotos } from "./instagram";
import { getConfigBySlug } from "./config";
import { handleDemo } from "./demo";

// Erstellen Sie einen Haupt-API-Router, um alle Teil-Routen zu bündeln
export const apiRouter = Router();

// Binden Sie alle importierten Routen an den Haupt-Router
apiRouter.use('/auth', authRouter);
apiRouter.use(webAppsRouter);
apiRouter.use(publicAppsRouter);

// Konfigurations-Routen
apiRouter.post("/configurations", saveConfiguration);
apiRouter.get("/configurations", getConfigurations);
apiRouter.get("/configurations/:id", getConfiguration);
apiRouter.delete("/configurations/:id", deleteConfiguration);
apiRouter.post("/configurations/:id/publish", publishConfiguration);
apiRouter.get("/config/:slug", getConfigBySlug);
apiRouter.get("/sites/:subdomain", getPublishedSite);
apiRouter.post("/preview/:session", setPreviewConfig);

// Andere Routen
apiRouter.get("/demo", handleDemo);
apiRouter.get("/instagram", fetchInstagramPhotos);

// Health-Check
apiRouter.get("/ping", (_req, res) => {
  const ping = process.env.PING_MESSAGE ?? "ping";
  res.json({ message: ping });
});
