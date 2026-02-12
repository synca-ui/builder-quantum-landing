import helmet from "helmet";
import { globalLimiter, strictLimiter } from "./middleware/rateLimit";

// ... existing code ...

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// ... existing imports ...

// Middleware to fix Buffer-body issues (Netlify edge cases)
const rawBodyMiddleware = (req: any, _res: any, next: any) => {
  // ...
};

export function createServer() {
  const app = express();

  // Security Headers (Helmet)
  // CSP disabled per default to prevent breaking extensive client functionalities 
  // (Clerk, Stripe, Images, etc.) without strict manual config.
  app.use(helmet({
    contentSecurityPolicy: false,
    crossOriginEmbedderPolicy: false,
  }));

  // Global Rate Limiting
  app.use(globalLimiter);

  // Middleware
  app.use(cors());

  // ...

  // ✅ WICHTIG: n8n Proxy Route VOR dem apiRouter definieren
  // Protected with Strict Rate Limiting
  app.post("/api/forward-to-n8n", strictLimiter, handleForwardN8n);

  // ✅ Scraper Job Router
  app.use("/api/scraper-job", scraperJobRouter);

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