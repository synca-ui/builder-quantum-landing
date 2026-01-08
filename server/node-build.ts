import path from "path";
import { createServer } from "./index";
import * as express from "express";

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

  // Check N8N_WEBHOOK_URL
  if (!process.env.N8N_WEBHOOK_URL) {
    errors.push(
      "❌ N8N_WEBHOOK_URL is not set (required for n8n analysis flow)"
    );
  }

  // Check DATABASE_URL or NETLIFY_DATABASE_URL
  const hasDatabase =
    process.env.DATABASE_URL || process.env.NETLIFY_DATABASE_URL;
  if (!hasDatabase) {
    errors.push(
      "❌ DATABASE_URL or NETLIFY_DATABASE_URL is not set (required for data persistence)"
    );
  }

  // Check JWT_SECRET
  if (!process.env.JWT_SECRET || process.env.JWT_SECRET === "dev-secret-change-me") {
    errors.push(
      "❌ JWT_SECRET is not set or using dev default (required for authentication security)"
    );
  }

  // If any errors, log them and exit
  if (errors.length > 0) {
    console.error("\n🚨 STARTUP VALIDATION FAILED 🚨\n");
    console.error("Missing critical environment variables:\n");
    errors.forEach((error) => console.error(error));
    console.error(
      "\n📖 Please configure these variables in your .env file or environment.\n"
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

  // Graceful shutdown
  process.on("SIGTERM", () => {
    console.log("🛑 Received SIGTERM, shutting down gracefully");
    process.exit(0);
  });

  process.on("SIGINT", () => {
    console.log("🛑 Received SIGINT, shutting down gracefully");
    process.exit(0);
  });
}
