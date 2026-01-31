import express from "express";
import cors from "cors";
import path from "path";
import { fileURLToPath } from "url";
import { handleClerkWebhook } from "./webhooks/clerk";
import { subdomainsRouter } from "./routes/subdomains";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

import { handleDemo } from "./routes/demo";
import { handleSubdomainRequest } from "./routes/subdomains";
import router, {
  saveConfiguration,
  getConfigurations,
  getConfiguration,
  deleteConfiguration,
  publishConfiguration,
  getPublishedSite,
} from "./routes/configurations";
import { fetchInstagramPhotos } from "./routes/instagram";
import { setPreviewConfig } from "./routes/configurations";
import { webAppsRouter, publicAppsRouter } from "./routes/webapps";
import { handleGenerateSchema, handleValidateSchema } from "./routes/schema";
import { handleStripeWebhook, handleWebhookTest } from "./webhooks/stripe";
import { apiRouter } from "./routes";
import { requireAuth } from "./middleware/auth";
import { usersRouter } from "./routes/users";
import { handleAutogen } from "./routes/autogen";
import { getConfigBySlug } from "./routes/config";
import {
  handleCreateOrder,
  handleGetRecentOrders,
  handleGetMenuStats,
  handleClearOldOrders,
} from "./routes/orders";
import { handleForwardN8n } from "./routes/n8nProxy";

// Middleware to fix Buffer-body issues (Netlify edge cases)
const rawBodyMiddleware = (req: any, _res: any, next: any) => {
  if (Buffer.isBuffer(req.body)) {
    try {
      req.body = JSON.parse(req.body.toString());
    } catch (e) {
      console.error("Error parsing buffer body:", e);
      req.body = {};
    }
  }
  next();
};

export function createServer() {
  const app = express();

  // Middleware
  app.use(cors());

  // Health check endpoint
  app.get("/health", (_req, res) => {
    res.json({ status: "ok" });
  });

  app.post("/api/webhooks/test", handleWebhookTest);

  // Root endpoint
  app.get("/", (_req, res) => {
    res.json({
      status: "online",
      message: "Maitr Backend is running on Railway 🚀",
      service: "api",
    });
  });

  // --- WEBHOOKS (VOR JSON PARSING) ---
  app.post(
    "/api/webhooks/stripe",
    express.raw({ type: "application/json" }),
    handleStripeWebhook,
  );

  app.post(
    "/api/webhooks/clerk",
    express.raw({ type: "application/json" }),
    handleClerkWebhook,
  );
  // --- ENDE WEBHOOKS ---

  // Repair raw bodies & JSON Middleware
  app.use(rawBodyMiddleware);
  app.use(express.json({ limit: "25mb" }));
  app.use(express.urlencoded({ extended: true, limit: "25mb" }));

  // --- API ROUTEN (WICHTIG: ZUERST DEFINIEREN) ---
  // Damit haben API-Calls Vorrang vor Subdomain-Routing

  // Use aggregated API router
  app.use("/api", apiRouter);
  app.use("/api/subdomains", subdomainsRouter);

  // Additional explicit routes / routers
  app.use("/api", webAppsRouter);
  app.use("/api", publicAppsRouter);

  // Configuration API routes (protected)
  app.use("/api/configurations", requireAuth);
  app.post("/api/configurations", saveConfiguration);
  app.get("/api/configurations", getConfigurations);
  app.get("/api/configurations/:id", getConfiguration);
  app.delete("/api/configurations/:id", deleteConfiguration);
  app.post("/api/configurations/:id/publish", publishConfiguration);

  // Public site serving
  app.get("/api/sites/:subdomain", getPublishedSite);

  // Users profile (protected)
  app.use("/api/users", requireAuth, usersRouter);

  // Preview config injection
  app.post("/api/preview/:session", setPreviewConfig);

  // Auto-generation endpoint
  app.post("/api/autogen", handleAutogen);

  // Config JSON proxy
  app.get("/api/config/:slug", getConfigBySlug);

  // Instagram scraping
  app.get("/api/instagram", fetchInstagramPhotos);

  // Schema.org
  app.post("/api/schema/generate", handleGenerateSchema);
  app.post("/api/schema/validate", handleValidateSchema);

  // Orders API
  app.post("/api/orders/create", handleCreateOrder);
  app.get("/api/orders/:webAppId/recent", handleGetRecentOrders);
  app.get("/api/orders/:webAppId/menu-stats", handleGetMenuStats);
  app.post("/api/orders/:webAppId/clear-old", handleClearOldOrders);

  // Demo endpoint
  app.get("/api/demo", handleDemo);

  // --- SUBDOMAIN ROUTING (GANZ AM ENDE) ---
  // Erst wenn keine API-Route gepasst hat, prüfen wir auf Subdomains.
  // Das verhindert, dass API-Calls blockiert werden oder Timeouts werfen.
  app.use(handleSubdomainRequest);

  return app;
}