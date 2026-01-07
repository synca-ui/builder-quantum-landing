import express from "express";
import cors from "cors";
import path from "path";
import { createRequire } from "module";
import { fileURLToPath } from "url";

const require = createRequire(import.meta.url);
const __dirname = path.dirname(fileURLToPath(import.meta.url));

import { handleDemo } from "./routes/demo.js";
import { handleSubdomainRequest } from "./routes/subdomains.js";
import {
  saveConfiguration,
  getConfigurations,
  getConfiguration,
  deleteConfiguration,
  publishConfiguration,
  getPublishedSite,
} from "./routes/configurations.js";
import { fetchInstagramPhotos } from "./routes/instagram.js";
import { setPreviewConfig } from "./routes/configurations.js";
import { authRouter } from "./routes/auth.js";
import { webAppsRouter, publicAppsRouter } from "./routes/webapps.js";
import { handleGenerateSchema, handleValidateSchema } from "./routes/schema.js";
import { handleStripeWebhook, handleWebhookTest } from "./webhooks/stripe.js";
import { apiRouter } from "./routes/index.js";

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

  // Health check endpoint (for dev server readiness)
  app.get("/health", (req, res) => {
    res.json({ status: "ok" });
  });

  // Stripe webhook endpoint MUST come before express.json() so we can access raw body
  app.post(
    "/api/webhooks/stripe",
    express.raw({ type: "application/json" }),
    handleStripeWebhook,
  );

  // Repair raw bodies coming from certain hosting environments
  app.use(rawBodyMiddleware);

  // Standard JSON middleware
  app.use(express.json({ limit: "25mb" }));
  app.use(express.urlencoded({ extended: true, limit: "25mb" }));

  // Subdomain routing for published sites (e.g., bella.maitr.de)
  app.use(handleSubdomainRequest);

  // Use aggregated API router (may include common routes)
  app.use("/api", apiRouter);

  // Additional explicit routes / routers
  // Auth
  app.use("/api/auth", authRouter);

  // Apps (protected)
  app.use("/api", webAppsRouter);

  // Public apps
  app.use("/api", publicAppsRouter);

  // Configuration API routes (protected)
  const { requireAuth } = require("./middleware/auth.js");
  app.use("/api/configurations", requireAuth);
  app.post("/api/configurations", saveConfiguration);
  app.get("/api/configurations", getConfigurations);
  app.get("/api/configurations/:id", getConfiguration);
  app.delete("/api/configurations/:id", deleteConfiguration);
  app.post("/api/configurations/:id/publish", publishConfiguration);

  // Public site serving
  app.get("/api/sites/:subdomain", getPublishedSite);

  // Users profile (protected)
  app.use(
    "/api/users",
    require("./middleware/auth.js").requireAuth,
    require("./routes/users.js").usersRouter,
  );

  // Preview config injection
  app.post("/api/preview/:session", setPreviewConfig);

  // Auto-generation endpoint (Auto Mode)
  // Accepts JSON payload: { url?, maps_link?, business_name?, file_name?, file_base64? }
  const { handleAutogen } = require("./routes/autogen.js");
  app.post("/api/autogen", handleAutogen);

  // Config JSON proxy for Edge/clients
  app.get(
    "/api/config/:slug",
    require("./routes/config.js").getConfigBySlug,
  );

  // Instagram scraping endpoint (best-effort for public/open profiles)
  app.get("/api/instagram", fetchInstagramPhotos);

  // Schema.org JSON-LD generation for Agentic Web
  app.post("/api/schema/generate", handleGenerateSchema);
  app.post("/api/schema/validate", handleValidateSchema);

  // Orders API (for social proof tracking - V2.2)
  const {
    handleCreateOrder,
    handleGetRecentOrders,
    handleGetMenuStats,
    handleClearOldOrders,
  } = require("./routes/orders.js");
  app.post("/api/orders/create", handleCreateOrder);
  app.get("/api/orders/:webAppId/recent", handleGetRecentOrders);
  app.get("/api/orders/:webAppId/menu-stats", handleGetMenuStats);
  app.post("/api/orders/:webAppId/clear-old", handleClearOldOrders);

  // Webhook test endpoint (for development/testing)
  app.post("/api/webhooks/test", handleWebhookTest);

  // Proxy to n8n (avoids browser CORS issues)
  const { handleForwardN8n } = require("./routes/n8nProxy.js");
  app.post("/api/forward-to-n8n", handleForwardN8n);

  // Demo endpoint
  app.get("/api/demo", handleDemo);

  // Static files for production
  if (process.env.NODE_ENV === "production") {
    const clientDistPath = path.join(__dirname, "../../client/dist");
    app.use(express.static(clientDistPath));
    app.get("*", (_req, res) => {
      res.sendFile(path.join(clientDistPath, "index.html"));
    });
  }

  return app;
}
