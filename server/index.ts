import express from "express";
import cors from "cors";
import path from "path";

import { handleDemo } from "./routes/demo";
import { handleSubdomainRequest } from "./routes/subdomains";
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
import { authRouter } from "./routes/auth";
import { webAppsRouter, publicAppsRouter } from "./routes/webapps";
import { handleGenerateSchema, handleValidateSchema } from "./routes/schema";
import { handleStripeWebhook, handleWebhookTest } from "./webhooks/stripe";
import { apiRouter } from "./routes";

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
  const { requireAuth } = require("./middleware/auth");
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
    require("./middleware/auth").requireAuth,
    require("./routes/users").usersRouter,
  );

  // Preview config injection
  app.post("/api/preview/:session", setPreviewConfig);

  // Auto-generation endpoint (Auto Mode)
  // Accepts JSON payload: { url?, maps_link?, business_name?, file_name?, file_base64? }
  const { handleAutogen } = require("./routes/autogen");
  app.post("/api/autogen", handleAutogen);

  // Config JSON proxy for Edge/clients
  app.get(
    "/api/config/:slug",
    require("../server/routes/config").getConfigBySlug,
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
  } = require("./routes/orders");
  app.post("/api/orders/create", handleCreateOrder);
  app.get("/api/orders/:webAppId/recent", handleGetRecentOrders);
  app.get("/api/orders/:webAppId/menu-stats", handleGetMenuStats);
  app.post("/api/orders/:webAppId/clear-old", handleClearOldOrders);

  // Webhook test endpoint (for development/testing)
  app.post("/api/webhooks/test", handleWebhookTest);

  // Proxy to n8n (avoids browser CORS issues)
  const { handleForwardN8n } = require("./routes/n8nProxy");
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
