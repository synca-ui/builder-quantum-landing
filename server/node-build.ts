import path from "path";
import { createServer } from "./index";
import * as express from "express";
import { startMaitrScheduler, stopMaitrScheduler } from "./maitr/scheduler";

const app = createServer();
const port = process.env.PORT || 3000;

// In production, serve the built SPA files
const __dirname = import.meta.dirname;
const distPath = path.join(__dirname, "../spa");

/**
 * Validate that all critical environment variables are set
 * Exit with code 1 if any are missing (prevent unsafe startup)
 */
function validateEnvironment() {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Ohne DB läuft nichts — harter Abbruch.
  if (!process.env.DATABASE_URL) {
    errors.push(
      "❌ DATABASE_URL is not set (required for data persistence)",
    );
  }

  // Ohne gültigen Clerk-Key schlägt JEDE authentifizierte Anfrage fehl
  // (server/utils/clerk.ts wirft dann "CLERK_SECRET_KEY not configured",
  // die Middleware macht daraus pauschal 401). Lieber beim Start auffallen
  // als später als rätselhaftes "Invalid token" beim Nutzer.
  if (!process.env.CLERK_SECRET_KEY) {
    errors.push(
      "❌ CLERK_SECRET_KEY is not set (required to verify Clerk sessions)",
    );
  }

  // n8n ist ein optionales Feature (server/routes/n8nProxy.ts). Ein fehlender
  // Webhook darf den kompletten Serverstart nicht verhindern — vorher tat er
  // genau das.
  if (!process.env.N8N_WEBHOOK_URL) {
    warnings.push(
      "⚠️  N8N_WEBHOOK_URL is not set — the n8n analysis flow will be unavailable",
    );
  }

  // Bild-Uploads brauchen Supabase Storage (server/services/supabaseStorage.ts).
  // Fehlt die Konfiguration, antwortet /api/media/upload mit 503.
  if (
    !(process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL) ||
    !process.env.SUPABASE_SERVICE_ROLE_KEY
  ) {
    warnings.push(
      "⚠️  SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY missing — image uploads will return 503",
    );
  }

  warnings.forEach((w) => console.warn(w));

  // If any errors, log them and exit
  if (errors.length > 0) {
    console.error("\n🚨 STARTUP VALIDATION FAILED 🚨\n");
    console.error("Missing critical environment variables:\n");
    errors.forEach((error) => console.error(error));
    console.error(
      "\n📖 Please configure these variables in your .env file or environment.\n",
    );
    process.exit(1);
  }

  console.log("✅ All critical environment variables validated");
}

// Serve static files
app.use(express.static(distPath));

// Handle React Router - serve index.html for all non-API routes
app.get("*", (req, res) => {
  // Don't serve index.html for API routes
  if (req.path.startsWith("/api/") || req.path.startsWith("/health")) {
    return res.status(404).json({ error: "API endpoint not found" });
  }

  res.sendFile(path.join(distPath, "index.html"));
});

// Only listen if run directly (node dist/server/node-build.js)
// This prevents app.listen() from executing when imported by Netlify serverless functions
if (import.meta.url === `file://${process.argv[1]}`) {
  // Validate environment before starting server
  validateEnvironment();

  app.listen(port, () => {
    console.log(`🚀 Fusion Starter server running on port ${port}`);
    console.log(`📱 Frontend: http://localhost:${port}`);
    console.log(`🔧 API: http://localhost:${port}/api`);
  });

  // Maitr-Sync. Läuft NUR, wenn MAITR_SYNC_INTERVAL_MINUTES gesetzt ist —
  // ohne die Variable passiert hier nichts. Absichtlich hinter app.listen:
  // Der Zeitgeber darf das Annehmen von Anfragen nicht verzögern.
  startMaitrScheduler();

  // Graceful shutdown
  process.on("SIGTERM", () => {
    console.log("🛑 Received SIGTERM, shutting down gracefully");
    stopMaitrScheduler();
    process.exit(0);
  });

  process.on("SIGINT", () => {
    console.log("🛑 Received SIGINT, shutting down gracefully");
    stopMaitrScheduler();
    process.exit(0);
  });
}
