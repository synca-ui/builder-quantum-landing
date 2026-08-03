import express from "express";
import cors from "cors";
import path from "path";
import { fileURLToPath } from "url";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import { globalLimiter, strictLimiter } from "./middleware/rateLimit";
import { requireAuth } from "./middleware/auth";
import { apiRouter } from "./routes";
import { scraperJobRouter } from "./routes/scraperJob";
import scraperJobsRoute from "./routes/scraperJobsRoute";
import { handleSubdomainRequest } from "./routes/subdomains";
import { getPublishedSite, setPreviewConfig } from "./routes/configurations";
import { handleForwardN8n } from "./routes/n8nProxy";
import { handleGenerateSchema, handleValidateSchema } from "./routes/schema";
import { handleAutogen } from "./routes/autogen";
import { usersRouter } from "./routes/users";
import { handleClerkWebhook } from "./webhooks/clerk";
import { registerMaitrWebhooks } from "./maitr";
import {
  handleCreateOrder,
  handleGetRecentOrders,
  handleGetMenuStats,
  handleClearOldOrders,
} from "./routes/orders";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Rate-Limiter speziell für den öffentlichen Site-Endpoint
// Verhindert Enumerations-Angriffe (a.maitr.de, b.maitr.de, ...)
const siteRateLimiter = rateLimit({
  windowMs: 60_000,
  limit: 60,
  // Normalize IPv6 addresses (strip brackets) to avoid ERR_ERL_KEY_GEN_IPV6
  keyGenerator: (req) => {
    const ip = (req.ip ?? "").replace(/^\[|\]$/g, "");
    return `${ip}-${req.params.subdomain ?? ""}`;
  },
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Zu viele Anfragen für diese Seite." },
});

// Rate-Limiter für öffentliche Reservierungen (Anti-Spam)
const reservationLimiter = rateLimit({
  windowMs: 5 * 60_000, // 5 Minuten
  limit: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Zu viele Reservierungsanfragen. Bitte warte einen Moment." },
});

/** Allowed CORS origins: maitr.de + all subdomains, and localhost in dev */
const allowedOrigin = (
  origin: string | undefined,
  cb: (err: Error | null, allow?: boolean) => void,
) => {
  if (
    !origin ||
    /^https?:\/\/(.*\.)?maitr\.de$/.test(origin) ||
    /^https?:\/\/localhost(:\d+)?$/.test(origin)
  ) {
    cb(null, true);
  } else {
    cb(new Error(`CORS policy: origin ${origin} is not allowed`));
  }
};

export function createServer() {
  const app = express();

  // Security Headers (Helmet)
  // CSP disabled per default to prevent breaking extensive client functionalities
  // (Clerk, Stripe, Images, etc.) without strict manual config.
  app.use(
    helmet({
      contentSecurityPolicy: false,
      crossOriginEmbedderPolicy: false,
    }),
  );

  // Global Rate Limiting
  app.use(globalLimiter);

  // CORS – restricted to maitr.de and localhost (dev)
  app.use(cors({ origin: allowedOrigin, credentials: true }));

  // Clerk Webhook – MUST stay above express.json(): svix verifies the signature over
  // the raw body. Registered after the JSON parser, body-parser would already have
  // consumed the stream (req._body = true), express.raw() would be skipped, and
  // handleClerkWebhook's req.body.toString() would yield "[object Object]" – every
  // signature check would fail and no user would ever be synced.
  app.post("/api/webhooks/clerk", express.raw({ type: "*/*" }), handleClerkWebhook);

  // Meta-Webhook des Maitr-Backends – aus demselben Grund oberhalb von
  // express.json(): verifyMetaSignature prüft eine HMAC über den Rohbody. Käme der
  // JSON-Parser zuerst, bekäme die Prüfung ein Objekt statt des Buffers und würde
  // ausnahmslos fehlschlagen. Registriert werden nur die beiden /webhooks/meta-
  // Routen; der übrige Maitr-Router hängt regulär unter /api/maitr.
  registerMaitrWebhooks(app);

  // Parse JSON request bodies with size limits
  app.use(express.json({ limit: "5mb" }));
  app.use(express.urlencoded({ extended: true, limit: "5mb" }));

  // n8n Proxy – strict rate limit, before apiRouter
  app.post("/api/forward-to-n8n", strictLimiter, handleForwardN8n);

  // Scraper Job Routers
  app.use("/api/scraper-job", scraperJobRouter);
  app.use("/api/scraper-jobs", scraperJobsRoute);

  // Aggregated API router (configurations, webapps, templates, scraper,
  // subscriptions, subdomains, dashboard, demo, instagram, n8n, etc.)
  // Public reservations get their own rate-limiter here before the router handles them
  app.use("/api/public/reservations", reservationLimiter);
  app.use("/api", apiRouter);

  // Public site serving – rate-limited against enumeration attacks
  app.get("/api/sites/:subdomain", siteRateLimiter, getPublishedSite);

  // Users profile (protected)
  app.use("/api/users", requireAuth, usersRouter);

  // Preview config injection.
  // Der Kommentar hier lautete "session-scoped, no auth needed" — es gab aber
  // nie ein Session-Scoping im Handler: der Parameter hieß :session, gelesen
  // wurde req.params.id, also undefined. Zusammen mit dem fehlenden requireAuth
  // gab die Route jedem Anfragenden eine fremde Konfiguration heraus.
  // Jetzt :id (passend zum Handler) und authentifiziert.
  app.post("/api/preview/:id", requireAuth, setPreviewConfig);

  // Auto-generation endpoint (rate-limited to prevent abuse)
  app.post("/api/autogen", strictLimiter, handleAutogen);

  // Schema.org generation & validation
  app.post("/api/schema/generate", handleGenerateSchema);
  app.post("/api/schema/validate", handleValidateSchema);

  // Orders API
  app.post("/api/orders/create", strictLimiter, handleCreateOrder);
  app.get("/api/orders/:webAppId/recent", handleGetRecentOrders);
  app.get("/api/orders/:webAppId/menu-stats", handleGetMenuStats);
  app.post("/api/orders/:webAppId/clear-old", requireAuth, handleClearOldOrders);

  // --- SUBDOMAIN ROUTING (must be last) ---
  // Only reached if no API route matched — prevents API call timeouts.
  app.use(handleSubdomainRequest);

  return app;
}
