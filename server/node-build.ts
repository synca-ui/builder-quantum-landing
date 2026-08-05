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

  /**
   * PROZESSWÄCHTER — das letzte Netz, nicht das erste.
   *
   * Erste Verteidigungslinie ist `asyncHandler` + die Fehler-Middleware am
   * Maitr-Router: Sie machen aus einem abgelehnten Promise im Anfragepfad eine
   * saubere 500-Antwort, sodass hier gar nichts mehr ankommt. Das ist wichtig für
   * das Verständnis der folgenden Entscheidung — gemessen gilt nämlich: Ein
   * `unhandledRejection`-Handler, der NUR protokolliert, verhindert zwar den
   * Absturz, aber der Client bekommt trotzdem nie eine Antwort und hängt bis in
   * seinen eigenen Timeout. Als alleinige Maßnahme wäre das also eine
   * Verschlimmbesserung: aus einem lauten Absturz würde ein stiller Hänger.
   *
   * Bewusst UNTERSCHIEDLICH behandelt, weil die beiden Ereignisse nicht dasselbe
   * bedeuten:
   */

  /**
   * unhandledRejection → PROTOKOLLIEREN UND WEITERLAUFEN.
   *
   * Wer hier noch ankommt, kommt nicht mehr aus dem Anfragepfad, sondern aus
   * Hintergrundarbeit ohne Anfrage daran — vor allem `startMaitrScheduler`, das
   * `syncAll` per Zeitgeber anstößt und dabei fremde APIs (Google, Meta) berührt.
   * Ein 502 von Meta um 3 Uhr nachts ist ein zu erwartender Betriebszustand.
   * Node beendet den Prozess dafür seit v15 standardmäßig — das hieße: die API
   * fällt für alle Betriebe aus, weil ein Hintergrundabgleich für einen einzigen
   * Betrieb gescheitert ist. Genau dieses Versagensmuster wird hier abgestellt.
   *
   * Das Gegenargument ist ernst zu nehmen: Nicht abzustürzen kann echte Fehler
   * verstecken, weil niemand mehr hinsieht. Dagegen steht (a) der vollständige
   * Stack im Log statt einer stummen Unterdrückung und (b) dass der Anfragepfad
   * durch asyncHandler bereits abgedeckt ist — es wird hier also nichts
   * verdeckt, was sonst als 500 sichtbar gewesen wäre.
   */
  process.on("unhandledRejection", (reason) => {
    console.error(
      "[server] Unbehandelte Promise-Ablehnung (Prozess läuft weiter):",
      reason instanceof Error ? reason.stack : reason,
    );
  });

  /**
   * uncaughtException → PROTOKOLLIEREN UND GEORDNET BEENDEN (Exitcode 1).
   *
   * Hier ist die Abwägung umgekehrt. Eine Ausnahme, die bis hierher durchschlägt,
   * hat eine Aufrufkette an beliebiger Stelle abgebrochen: halb geschriebener
   * Zustand, nicht freigegebene Sperren, offene Transaktionen. Node dokumentiert
   * den Prozess danach ausdrücklich als undefiniert — Weiterlaufen hieße, ab jetzt
   * mit möglicherweise falschen Daten zu antworten. Das ist schlimmer als ein
   * Neustart: Ein Absturz ist sichtbar und wird von der Plattform (Railway) neu
   * gestartet, stille Datenfehler nicht.
   *
   * Deshalb geordnet: erst den Zeitgeber stoppen (sonst kann noch ein Sync-Lauf in
   * den sterbenden Prozess feuern), dann mit 1 beenden, damit der Neustart als
   * Fehlschlag zählt und nicht als sauberes Herunterfahren.
   */
  process.on("uncaughtException", (err) => {
    console.error("[server] Nicht abgefangene Ausnahme — geordneter Abbruch:", err.stack ?? err);
    stopMaitrScheduler();
    process.exit(1);
  });

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
