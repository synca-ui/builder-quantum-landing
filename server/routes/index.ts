import { Router } from "express";
import { webAppsRouter, publicAppsRouter } from "./webapps";
import { configurationsRouter, getPublishedSite } from "./configurations";
import { getConfigBySlug } from "./config";
import { fetchInstagramPhotos } from "./instagram";
import { handleDemo } from "./demo";
import templatesRouter from "./templates";
import scraperRouter from "./scraper";
import subscriptionsRouter from "./subscriptions";
import { subdomainsRouter } from "./subdomains";
import { handleForwardN8n } from "./n8nProxy";
import insightsRouter from "./insights";
import floorPlanRouter from "./floor-plan";
import staffRouter from "./staff";
import creativeStudioRouter from "./creative-studio";
import adminRouter from "./admin";

// Inline Demo Dashboard Router (to avoid build issues)
const demoDashboardRouter = Router();

// Demo Dashboard API endpoints
demoDashboardRouter.get('/insights/overview', async (req, res) => {
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
    console.error('Error in demo insights:', error);
    res.status(500).json({ error: 'Demo endpoint failed' });
  }
});

demoDashboardRouter.get('/insights/revenue-chart', async (req, res) => {
  try {
    const days = parseInt(req.query.days as string) || 7;
    const chartData = Array.from({ length: days }, (_, i) => ({
      date: new Date(Date.now() - (days - 1 - i) * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      revenue: Math.floor(Math.random() * 2000) + 800,
      orders: Math.floor(Math.random() * 50) + 20,
    }));

    res.json({ success: true, data: chartData });
  } catch (error) {
    console.error('Error in demo revenue chart:', error);
    res.status(500).json({ error: 'Demo endpoint failed' });
  }
});

demoDashboardRouter.get('/floor-plan/plans', async (req, res) => {
  try {
    res.json({
      success: true,
      data: [{
        id: 'demo-floor-plan',
        name: 'Demo Hauptbereich',
        description: 'Demo Lageplan mit 5 Tischen',
        tables: [
          { id: '1', number: '1', x: 100, y: 100, shape: 'ROUND', status: 'AVAILABLE', maxCapacity: 4, qrEnabled: true },
          { id: '2', number: '2', x: 300, y: 100, shape: 'SQUARE', status: 'OCCUPIED', maxCapacity: 6, qrEnabled: true },
          { id: '3', number: '3', x: 500, y: 200, shape: 'RECTANGLE', status: 'RESERVED', maxCapacity: 8, qrEnabled: false },
          { id: '4', number: '4', x: 150, y: 300, shape: 'ROUND', status: 'AVAILABLE', maxCapacity: 4, qrEnabled: true },
          { id: '5', number: '5', x: 400, y: 350, shape: 'SQUARE', status: 'AVAILABLE', maxCapacity: 6, qrEnabled: true },
        ],
      }],
    });
  } catch (error) {
    console.error('Error in demo floor plan:', error);
    res.status(500).json({ error: 'Demo endpoint failed' });
  }
});

demoDashboardRouter.get('/health', async (req, res) => {
  res.json({
    success: true,
    data: {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      message: 'Demo Dashboard API is running',
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

// Dashboard API routes (authenticated)
apiRouter.use("/dashboard/insights", insightsRouter);
apiRouter.use("/dashboard/floor-plan", floorPlanRouter);
apiRouter.use("/dashboard/staff", staffRouter);
apiRouter.use("/dashboard/creative", creativeStudioRouter);
apiRouter.use("/dashboard/admin", adminRouter);

// Demo Dashboard API routes (no auth required)
apiRouter.use("/demo/dashboard", demoDashboardRouter);


// Standalone configuration routes (for backward compatibility)
apiRouter.get("/config/:slug", getConfigBySlug);
apiRouter.get("/sites/:subdomain", getPublishedSite);

// Other routes
apiRouter.get("/demo", handleDemo);
apiRouter.get("/instagram", fetchInstagramPhotos);

//N8N
apiRouter.post("/forward-to-n8n", handleForwardN8n);


// Health-Check
apiRouter.get("/ping", (_req, res) => {
  const ping = process.env.PING_MESSAGE ?? "ping";
  res.json({ message: ping });
});
