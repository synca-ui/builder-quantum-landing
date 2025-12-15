import "dotenv/config";
import express from "express";
import cors from "cors";
import { handleDemo } from "./routes/demo";
import {
  saveConfiguration,
  getConfigurations,
  getConfiguration,
  deleteConfiguration,
  publishConfiguration,
  getPublishedSite,
} from "./routes/configurations";
import { fetchInstagramPhotos } from "./routes/instagram";
import { setPreviewConfig } from "./routes/configurations";
import { authRouter } from './routes/auth';
import { webAppsRouter, publicAppsRouter } from './routes/webapps';
import { handleGenerateSchema, handleValidateSchema } from './routes/schema';

export function createServer() {
  const app = express();

  // Middleware
  app.use(cors());
  app.use(express.json({ limit: "25mb" }));
  app.use(express.urlencoded({ extended: true, limit: "25mb" }));

  // Health check
  app.get("/api/ping", (_req, res) => {
    const ping = process.env.PING_MESSAGE ?? "ping";
    res.json({ message: ping });
  });

  // Example route
  app.get("/api/demo", handleDemo);

  // Auth
  app.use('/api/auth', authRouter);

  // Apps (protected)
  app.use('/api', webAppsRouter);

  // Public apps
  app.use('/api', publicAppsRouter);

  // Configuration API routes (protected)
  const { requireAuth } = require('./middleware/auth');
  app.use('/api/configurations', requireAuth);
  app.post("/api/configurations", saveConfiguration);
  app.get("/api/configurations", getConfigurations);
  app.get("/api/configurations/:id", getConfiguration);
  app.delete("/api/configurations/:id", deleteConfiguration);
  app.post("/api/configurations/:id/publish", publishConfiguration);

  // Public site serving
  app.get("/api/sites/:subdomain", getPublishedSite);

  // Users profile (protected)
  app.use('/api/users', require('./middleware/auth').requireAuth, require('./routes/users').usersRouter);

  // Preview config injection
  app.post("/api/preview/:session", setPreviewConfig);

  // Auto-generation endpoint (Auto Mode)
  // Accepts JSON payload: { url?, maps_link?, business_name?, file_name?, file_base64? }
  const { handleAutogen } = require('./routes/autogen');
  app.post('/api/autogen', handleAutogen);

  // Config JSON proxy for Edge/clients
  app.get("/api/config/:slug", require('../server/routes/config').getConfigBySlug);

  // Instagram scraping endpoint (best-effort for public/open profiles)
  app.get("/api/instagram", fetchInstagramPhotos);

  // Schema.org JSON-LD generation for Agentic Web
  app.post("/api/schema/generate", handleGenerateSchema);
  app.post("/api/schema/validate", handleValidateSchema);

  return app;
}
