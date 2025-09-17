import "dotenv/config";
import express from "express";
import cors from "cors";
import path from "path";

// Importieren Sie alle Ihre Routen-Handler und Router
import { handleDemo } from "./routes/demo";
import {
  saveConfiguration,
  getConfigurations,
  getConfiguration,
  deleteConfiguration,
  publishConfiguration,
  getPublishedSite,
  setPreviewConfig,
} from "./routes/configurations";
import { fetchInstagramPhotos } from "./routes/instagram";
import { getConfigBySlug } from "./routes/config";
import { authRouter } from './routes/auth';
import { webAppsRouter, publicAppsRouter } from './routes/webapps';

// Erstellen Sie einen Haupt-API-Router, um alles zu bündeln
const apiRouter = express.Router();

// Auth-Routen
apiRouter.use('/auth', authRouter);

// Geschützte App-Routen
apiRouter.use(webAppsRouter);

// Öffentliche App-Routen
apiRouter.use(publicAppsRouter);

// Konfigurations-API-Routen
apiRouter.post("/configurations", saveConfiguration);
apiRouter.get("/configurations", getConfigurations);
apiRouter.get("/configurations/:id", getConfiguration);
apiRouter.delete("/configurations/:id", deleteConfiguration);
apiRouter.post("/configurations/:id/publish", publishConfiguration);

// Konfigurations-Proxy
apiRouter.get("/config/:slug", getConfigBySlug);

// Andere Routen
apiRouter.get("/demo", handleDemo);
apiRouter.get("/instagram", fetchInstagramPhotos);
apiRouter.get("/sites/:subdomain", getPublishedSite);
apiRouter.post("/preview/:session", setPreviewConfig);

// Health-Check-Route
apiRouter.get("/ping", (_req, res) => {
  const ping = process.env.PING_MESSAGE ?? "ping";
  res.json({ message: ping });
});


// Die Funktion zum Erstellen des Servers
export function createServer() {
  const app = express();

  // === Middleware ===
  app.use(cors());

  if (process.env.NODE_ENV !== 'production') {
    app.use(express.json({ limit: "25mb" }));
    app.use(express.urlencoded({ extended: true, limit: "25mb" }));
  }

  // === API-Routen ===
  // Registrieren Sie den gebündelten API-Router unter dem Präfix /api
  app.use("/api", apiRouter);

  // === Statische Dateien für die Produktion ===
  if (process.env.NODE_ENV === "production") {
    const clientDistPath = path.join(__dirname, "../../client/dist");
    app.use(express.static(clientDistPath));
    app.get("*", (_req, res) => {
      res.sendFile(path.join(clientDistPath, "index.html"));
    });
  }

  return app;
}