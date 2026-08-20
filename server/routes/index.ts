import { Router } from "express";
import { webAppsRouter, publicAppsRouter } from "./webapps";
// getPublishedSite wird hier nicht mehr importiert: Die Route ist jetzt allein in
// server/index.ts registriert, dort mit siteRateLimiter. Siehe unten.
// getConfigBySlug aus "./config" entfällt ebenfalls – main hat die Datei samt
// GET /config/:slug bereits entfernt (die Abfrage konnte nie treffen).
import { configurationsRouter } from "./configurations";
import { maitrRouter } from "../maitr";
import { handleDemo } from "./demo";
import templatesRouter from "./templates";
import scraperRouter from "./scraper";
import subscriptionsRouter from "./subscriptions";
import { subdomainsRouter } from "./subdomains";
import { mediaRouter } from "./media";
import { menuRouter } from "./menu";
import { siteRouter } from "./site";
// handleForwardN8n wird hier nicht mehr importiert – die Registrierung ist entfernt,
// siehe die Anmerkung weiter unten.
import insightsRouter from "./insights";
import floorPlanRouter from "./floor-plan";
import staffRouter from "./staff";
import creativeStudioRouter from "./creative-studio";
import adminRouter from "./admin";
import reservationsRouter from "./reservations";
import publicReservationsRouter from "./publicReservations";
import { publicStampcardsRouter } from "./publicStampcards";

// Inline Demo Dashboard Router (to avoid build issues)
const demoDashboardRouter = Router();

// Demo Dashboard API endpoints
demoDashboardRouter.get("/insights/overview", async (req, res) => {
  try {
    // Return realistic demo data
    res.json({
      success: true,
      data: {
        revenue: { current: 1247, previous: 1089, change: 14.5 },
        orders: { current: 34, previous: 28, change: 21.4 },
        visitors: { current: 87, previous: 72, change: 20.8 },
        qrScans: { current: 52, previous: 41, change: 26.8 },
        reservations: { current: 12, total: 18 },
        activeTables: 5,
      },
    });
  } catch (error) {
    console.error("Error in demo insights:", error);
    res.status(500).json({ error: "Demo endpoint failed" });
  }
});

demoDashboardRouter.get("/insights/revenue-chart", async (req, res) => {
  try {
    const days = parseInt(req.query.days as string) || 7;
    const chartData = Array.from({ length: days }, (_, i) => ({
      date: new Date(Date.now() - (days - 1 - i) * 24 * 60 * 60 * 1000)
        .toISOString()
        .split("T")[0],
      revenue: Math.floor(Math.random() * 2000) + 800,
      orders: Math.floor(Math.random() * 50) + 20,
    }));

    res.json({ success: true, data: chartData });
  } catch (error) {
    console.error("Error in demo revenue chart:", error);
    res.status(500).json({ error: "Demo endpoint failed" });
  }
});

demoDashboardRouter.get("/floor-plan/plans", async (req, res) => {
  try {
    res.json({
      success: true,
      data: [
        {
          id: "demo-floor-plan",
          name: "Demo Hauptbereich",
          description: "Demo Lageplan mit 5 Tischen",
          tables: [
            {
              id: "1",
              number: "1",
              x: 100,
              y: 100,
              shape: "ROUND",
              status: "AVAILABLE",
              maxCapacity: 4,
              qrEnabled: true,
            },
            {
              id: "2",
              number: "2",
              x: 300,
              y: 100,
              shape: "SQUARE",
              status: "OCCUPIED",
              maxCapacity: 6,
              qrEnabled: true,
            },
            {
              id: "3",
              number: "3",
              x: 500,
              y: 200,
              shape: "RECTANGLE",
              status: "RESERVED",
              maxCapacity: 8,
              qrEnabled: false,
            },
            {
              id: "4",
              number: "4",
              x: 150,
              y: 300,
              shape: "ROUND",
              status: "AVAILABLE",
              maxCapacity: 4,
              qrEnabled: true,
            },
            {
              id: "5",
              number: "5",
              x: 400,
              y: 350,
              shape: "SQUARE",
              status: "AVAILABLE",
              maxCapacity: 6,
              qrEnabled: true,
            },
          ],
        },
      ],
    });
  } catch (error) {
    console.error("Error in demo floor plan:", error);
    res.status(500).json({ error: "Demo endpoint failed" });
  }
});

demoDashboardRouter.get("/health", async (req, res) => {
  res.json({
    success: true,
    data: {
      status: "healthy",
      timestamp: new Date().toISOString(),
      message: "Demo Dashboard API is running",
    },
  });
});

// Erstellen Sie einen Haupt-API-Router, um alle Teil-Routen zu bündeln
export const apiRouter = Router();

// Mount routers at their respective API paths
apiRouter.use("/configurations", configurationsRouter);
apiRouter.use("/webapps", webAppsRouter);
apiRouter.use("/webapps", publicAppsRouter);
apiRouter.use("/templates", templatesRouter);
apiRouter.use("/scraper", scraperRouter);
apiRouter.use("/subscriptions", subscriptionsRouter);
apiRouter.use("/subdomains", subdomainsRouter);
apiRouter.use("/media", mediaRouter);
// Speisekarten-Erkennung (OCR + Parser) – Kernstück des automatischen Modus
apiRouter.use("/menu", menuRouter);
// Logo, Adresse und soziale Netze aus der Website – ergänzt, was der Scrape leer lässt
apiRouter.use("/site", siteRouter);

// Dashboard API routes (authenticated)
apiRouter.use("/dashboard/insights", insightsRouter);
apiRouter.use("/dashboard/floor-plan", floorPlanRouter);
apiRouter.use("/dashboard/staff", staffRouter);
apiRouter.use("/dashboard/creative", creativeStudioRouter);
apiRouter.use("/dashboard/admin", adminRouter);
apiRouter.use("/dashboard/reservations", reservationsRouter);

// Demo Dashboard API routes (no auth required)
apiRouter.use("/demo/dashboard", demoDashboardRouter);

// Public reservation routes (no auth required)
apiRouter.use("/public/reservations", publicReservationsRouter);
apiRouter.use("/public/stampcards", publicStampcardsRouter);

// Maitr-Backend (Präsenzverwaltung Google/Meta) unter /api/maitr.
//
// Der Router bringt seine Auth-Schranke selbst mit: publicRouter zuerst
// (Gastprofil und OAuth-Rücksprung, letzterer durch signierten state geschützt),
// danach requireAuth, danach alles Venue-scoped. Deshalb hier bewusst OHNE
// zusätzliches requireAuth eingehängt — das würde den Callback aussperren, den
// Google und Meta ohne Bearer-Token aufrufen.
//
// Der Meta-Webhook läuft NICHT über diesen Router, sondern über
// registerMaitrWebhooks in server/index.ts, vor express.json().
//
// Ohne gesetzte MAITR_*-Variablen startet der Server normal: maitrEnv() wird erst
// beim Zugriff ausgewertet. Die OAuth-Routen antworten dann mit einem Fehler, der
// die fehlenden Variablen benennt — der übrige Betrieb bleibt unberührt.
apiRouter.use("/maitr", maitrRouter);

// GET /config/:slug ist entfernt: Die Route fragte per rohem SQL nach
// public.tenants / restaurants mit Spalten tenant_slug, schema_name,
// config_json — das aktuelle Prisma-Schema erzeugt aber Tenant/Restaurant mit
// slug, schemaName, configJson. Die Abfrage konnte nie treffen, der Fehler
// wurde verschluckt, die Route lieferte immer 404 (gegen Produktion gemessen).
// Kein Client rief sie auf. Mit ihr fallen server/routes/config.ts,
// server/sql.ts und server/db.ts weg — und damit der einzige Konsument von
// NETLIFY_DATABASE_URL.

// "/sites/:subdomain" wird hier BEWUSST nicht registriert. Der apiRouter hängt in
// server/index.ts auf /api, und zwar VOR der gedrosselten Registrierung derselben
// Route. Express nimmt den ersten Treffer – eine Kopie hier beantwortete deshalb
// jede Anfrage, ohne dass der siteRateLimiter je liefe. Genau das war der Zustand:
// der Limiter gegen das Durchprobieren von Kundensubdomains war toter Code.
// Einzige Quelle: app.get("/api/sites/:subdomain", siteRateLimiter, …).
//
// Dasselbe gilt für "/forward-to-n8n": nur in server/index.ts, dort mit
// strictLimiter. Dort steht die Registrierung zufällig vor dem apiRouter, der
// Limiter griff also – eine Kopie hier wäre trotzdem eine Falle für später.

// Other routes
apiRouter.get("/demo", handleDemo);

// GET /instagram ist ENTFERNT, samt server/routes/instagram.ts.
//
// Der Endpunkt war öffentlich, ohne Anmeldung erreichbar, und holte eine vom
// Aufrufer benannte Adresse serverseitig ab — eine SSRF-Fläche. Zugleich lieferte
// er nichts: Alle drei Auswertungswege hingen an Markern, die Instagram vor Jahren
// entfernt hat (window._sharedData, __additionalDataLoaded); ein Abruf gegen ein
// echtes Profil ergab live eine leere Liste. Und er hatte keinen einzigen Aufrufer
// in client/, server/, shared/, mobile/ oder packages/.
//
// Eine Härtung der Hostprüfung wurde erwogen und verworfen: Sie hielt die
// Weiterleitung nicht auf. `fetch` folgt automatisch, ein offener Redirect auf
// instagram.com hätte die Prüfung wirkungslos gemacht — nachgestellt mit zwei
// lokalen Servern, der Rumpf des zweiten landete im og:image-Auswertungspfad.
// Eine halbe Absicherung an einem ungenutzten Endpunkt ist schlechter als keine:
// Sie hält die Fläche offen und suggeriert Schutz.
//
// Wer Instagram-Bilder wirklich anzeigen will, braucht die Graph API mit
// OAuth je Betrieb (siehe packages/core/src/integrations/meta.ts) — nicht das
// Abrufen einer öffentlichen Profilseite.

// Health-Check
apiRouter.get("/ping", (_req, res) => {
  const ping = process.env.PING_MESSAGE ?? "ping";
  res.json({ message: ping });
});
