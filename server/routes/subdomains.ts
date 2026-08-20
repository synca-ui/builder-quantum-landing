import { Router, Request, Response, NextFunction } from "express";
import prisma from "../db/prisma";
import { requireAuth, optionalAuth } from "../middleware/auth";
import { getCachedSite, setCachedSite } from "../utils/siteCache";
import { oeffentlicheSiteFelder } from "../utils/publicSiteView";


export const subdomainsRouter = Router();

/**
 * Middleware to detect subdomain requests and serve the appropriate site
 * This runs LAST after all API routes
 *
 * Flow:
 * 1. User visits bella.maitr.de
 * 2. This middleware detects the subdomain
 * 3. Attaches config to request (for potential SSR)
 * 4. Passes to frontend SPA which renders the site
 */
export async function handleSubdomainRequest(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    if (req.path.startsWith("/api")) return next();

    const host = req.hostname || req.headers.host?.split(":")[0] || "";

    const mainDomains = [
      "maitr.de",
      "www.maitr.de",
      "staging.maitr.de",
      "localhost",
      "127.0.0.1",
    ];

    if (mainDomains.includes(host)) {
      return next();
    }

    // Skip Netlify preview URLs
    if (host.endsWith(".netlify.app")) {
      return next();
    }

    // Extract subdomain from host (e.g., "cafe.maitr.de" -> "cafe")
    const baseDomain = process.env.PUBLIC_BASE_DOMAIN || "maitr.de";
    const subdomain = host.replace(`.${baseDomain}`, "").split(".")[0];

    if (!subdomain || subdomain === baseDomain || subdomain === "www") {
      return next();
    }

    // Check LRU cache first — avoids DB round-trip for repeated subdomain requests
    const cached = getCachedSite(subdomain);
    if (cached) {
      (req as any).subdomainConfig = cached.data;
      (req as any).subdomain = subdomain;
      return next();
    }

    // Look up the WebApp for this subdomain
    const webApp = await prisma.webApp.findUnique({
      where: { subdomain },
      select: {
        id: true,
        subdomain: true,
        configData: true,
        publishedAt: true,
      },
    });

    if (!webApp) {
      // Subdomain not found - let the frontend handle 404
      return next();
    }

    // Store in cache for subsequent requests
    setCachedSite(subdomain, webApp.configData, webApp.id);

    // Attach the config to the request for potential SSR or API use
    (req as any).subdomainConfig = webApp.configData;
    (req as any).subdomain = subdomain;
    (req as any).webAppId = webApp.id;

    // The frontend SPA will take over and render the site
    // It will call /api/sites/:subdomain to get the config
    return next();
  } catch (error) {
    console.error("[Subdomains] Middleware error:", error);
    return next();
  }
}

/**
 * API endpoint to get site config by subdomain
 * Called by the frontend Site.tsx component
 * GET /api/subdomains/:subdomain/config
 */
subdomainsRouter.get("/:subdomain/config", async (req, res) => {
  try {
    const { subdomain } = req.params;

    if (!subdomain) {
      return res.status(400).json({ error: "Subdomain required" });
    }

    const webApp = await prisma.webApp.findUnique({
      where: { subdomain: subdomain.toLowerCase() },
      select: {
        id: true,
        subdomain: true,
        configData: true,
        publishedAt: true,
        updatedAt: true,
      },
    });

    if (!webApp) {
      return res.status(404).json({
        success: false,
        error: "Site not found",
      });
    }

    // Return config in format expected by Site.tsx
    //
    // ANLASS: Hier stand die Feldliste von Hand, mit `userId: config.userId ||
    // "published"` mittendrin - eine interne Kontokennung, öffentlich ohne
    // jede Anmeldung abrufbar. `oeffentlicheSiteFelder`
    // (server/utils/publicSiteView.ts) ist dieselbe Positivliste, die auch
    // `GET /api/webapps/public/apps/:subdomain` benutzt - EINE geprüfte Liste
    // statt zweier auseinanderlaufender. Die Legende (allergenLegend) und
    // alles andere, was Site.tsx bisher von hier bekam, steht weiterhin drin;
    // nur `userId` nicht mehr.
    //
    // `GET /api/sites/:subdomain` (server/routes/configurations.ts) trägt
    // eigene Marken-Vorgabewerte, die hier nie galten, und benutzt darum
    // bewusst NICHT dieselbe Funktion - siehe Kommentar dort.
    return res.json({
      success: true,
      data: oeffentlicheSiteFelder(webApp.configData, {
        id: webApp.id,
        publishedAt: webApp.publishedAt,
        updatedAt: webApp.updatedAt,
      }),
    });
  } catch (error) {
    console.error("[Subdomains] Get config error:", error);
    return res.status(500).json({
      success: false,
      error: "Failed to load site",
    });
  }
});

// Reserved subdomains that can never be used
const RESERVED_SUBDOMAINS = [
  "www",
  "admin",
  "api",
  "app",
  "mail",
  "ftp",
  "blog",
  "shop",
  "store",
  "help",
  "support",
  "info",
  "news",
  "test",
  "demo",
  "staging",
  "dev",
  "dashboard",
  "portal",
  "account",
  "accounts",
  "login",
  "signin",
  "signup",
  "auth",
  "oauth",
  "static",
  "assets",
  "cdn",
  "media",
  "images",
  "img",
  "files",
  "download",
  "downloads",
  "docs",
  "documentation",
  "status",
  "health",
  "ping",
  "metrics",
  "analytics",
  "tracking",
  "webhook",
  "webhooks",
  "graphql",
  "rest",
  "socket",
  "ws",
  "wss",
  "ssl",
  "secure",
  "maitr",
];

// Validate subdomain format
function validateSubdomainFormat(subdomain: string): {
  valid: boolean;
  error?: string;
} {
  if (!subdomain) {
    return { valid: false, error: "Subdomain ist erforderlich" };
  }

  if (subdomain.length < 3) {
    return { valid: false, error: "Mindestens 3 Zeichen erforderlich" };
  }

  if (subdomain.length > 63) {
    return { valid: false, error: "Maximal 63 Zeichen erlaubt" };
  }

  if (!/^[a-z0-9]/.test(subdomain)) {
    return {
      valid: false,
      error: "Muss mit einem Buchstaben oder einer Zahl beginnen",
    };
  }

  if (!/[a-z0-9]$/.test(subdomain)) {
    return {
      valid: false,
      error: "Muss mit einem Buchstaben oder einer Zahl enden",
    };
  }

  if (!/^[a-z0-9-]+$/.test(subdomain)) {
    return {
      valid: false,
      error: "Nur Kleinbuchstaben, Zahlen und Bindestriche erlaubt",
    };
  }

  if (/--/.test(subdomain)) {
    return { valid: false, error: "Keine doppelten Bindestriche erlaubt" };
  }

  return { valid: true };
}

/**
 * POST /api/subdomains/validate
 * Check if a subdomain is available
 */
subdomainsRouter.post("/validate", optionalAuth, async (req, res) => {
  try {
    const { subdomain } = req.body;
    // ANLASS: userId kam bisher ungeprüft aus dem Body und entschied, ob die
    // Antwort "owned" statt "taken" war - jeder konnte jede interne userId
    // behaupten und so herausfinden, ob genau dieser Nutzer eine bestimmte
    // Subdomain besitzt (Mitgliedschafts-Orakel). Die Route muss vor der
    // Registrierung erreichbar bleiben (Konfigurator-Vorschau), deshalb kein
    // requireAuth - aber WENN ein gültiger Token mitkommt, zählt nur dessen
    // verifizierte userId, nie eine vom Body behauptete.
    const userId = req.userId;

    if (!subdomain) {
      return res.status(400).json({
        available: false,
        error: "Subdomain ist erforderlich",
      });
    }

    // Normalize to lowercase
    const normalizedSubdomain = subdomain.toLowerCase().trim();

    // 1. Format validation
    const formatValidation = validateSubdomainFormat(normalizedSubdomain);
    if (!formatValidation.valid) {
      return res.json({
        available: false,
        reason: "invalid",
        error: formatValidation.error,
      });
    }

    // 2. Check reserved list
    if (RESERVED_SUBDOMAINS.includes(normalizedSubdomain)) {
      return res.json({
        available: false,
        reason: "reserved",
        error: "Diese Subdomain ist reserviert",
        suggestions: generateSuggestions(normalizedSubdomain),
      });
    }

    // 3. Check database for existing WebApp
    const existingWebApp = await prisma.webApp.findUnique({
      where: { subdomain: normalizedSubdomain },
      select: { id: true, userId: true },
    });

    if (existingWebApp) {
      // If user owns this subdomain, it's available for them
      if (userId && existingWebApp.userId === userId) {
        return res.json({
          available: true,
          reason: "owned",
          message: "Diese Subdomain gehört Ihnen",
        });
      }

      return res.json({
        available: false,
        reason: "taken",
        error: "Diese Subdomain ist bereits vergeben",
        suggestions: generateSuggestions(normalizedSubdomain),
      });
    }

    // 4. Check Configuration.selectedDomain for pending reservations
    const pendingConfig = await prisma.configuration.findFirst({
      where: {
        selectedDomain: normalizedSubdomain,
        status: { not: "archived" },
        ...(userId ? { userId: { not: userId } } : {}),
      },
      select: { id: true },
    });

    if (pendingConfig) {
      return res.json({
        available: false,
        reason: "pending",
        error: "Diese Subdomain wird gerade reserviert",
        suggestions: generateSuggestions(normalizedSubdomain),
      });
    }

    // 5. Subdomain is available!
    return res.json({
      available: true,
      subdomain: normalizedSubdomain,
      fullDomain: `${normalizedSubdomain}.maitr.de`,
    });
  } catch (error) {
    console.error("[Subdomains] Validation error:", error);
    return res.status(500).json({
      available: false,
      error: "Fehler bei der Überprüfung",
    });
  }
});

/**
 * POST /api/subdomains/reserve
 * Reserve a subdomain for a user (called during publish)
 */
// requireAuth ist hier Pflicht: Die Route nahm die userId früher aus dem
// Request-Body entgegen — der Angreifer bestimmte also selbst, als wer er
// auftritt. Die Besitzprüfung unten verglich gegen genau diesen Body-Wert und
// war damit wirkungslos; das abschließende configuration.update lief ohne
// jeden userId-Filter auf eine beliebige fremde Konfiguration.
subdomainsRouter.post("/reserve", requireAuth, async (req, res) => {
  try {
    const { subdomain, configId } = req.body;
    // Identität kommt ausschließlich aus dem verifizierten Token.
    const userId = req.user!.id;

    if (!subdomain || !configId) {
      return res.status(400).json({
        success: false,
        error: "subdomain und configId sind erforderlich",
      });
    }

    const normalizedSubdomain = subdomain.toLowerCase().trim();

    // Validate format
    const formatValidation = validateSubdomainFormat(normalizedSubdomain);
    if (!formatValidation.valid) {
      return res.status(400).json({
        success: false,
        error: formatValidation.error,
      });
    }

    // Check if reserved
    if (RESERVED_SUBDOMAINS.includes(normalizedSubdomain)) {
      return res.status(400).json({
        success: false,
        error: "Diese Subdomain ist reserviert",
      });
    }

    // Check if already taken by someone else
    const existingWebApp = await prisma.webApp.findUnique({
      where: { subdomain: normalizedSubdomain },
    });

    if (existingWebApp && existingWebApp.userId !== userId) {
      return res.status(400).json({
        success: false,
        error: "Diese Subdomain ist bereits vergeben",
      });
    }

    // updateMany statt update: Der userId-Filter gehört in die where-Klausel,
    // sonst schreibt die Route in jede beliebige fremde Konfiguration.
    // count === 0 heißt "gibt es nicht ODER gehört dir nicht" — bewusst
    // dieselbe Antwort, damit die Route kein Existenz-Orakel wird.
    const updated = await prisma.configuration.updateMany({
      where: { id: configId, userId },
      data: { selectedDomain: normalizedSubdomain },
    });

    if (updated.count === 0) {
      return res.status(404).json({
        success: false,
        error: "Konfiguration nicht gefunden",
      });
    }

    return res.json({
      success: true,
      subdomain: normalizedSubdomain,
      fullDomain: `${normalizedSubdomain}.maitr.de`,
    });
  } catch (error) {
    console.error("[Subdomains] Reservation error:", error);
    return res.status(500).json({
      success: false,
      error: "Fehler bei der Reservierung",
    });
  }
});

/**
 * Generate alternative subdomain suggestions
 */
function generateSuggestions(subdomain: string): string[] {
  const year = new Date().getFullYear();
  const suggestions: string[] = [];

  // Add common variations
  const variations = [
    `${subdomain}-${year}`,
    `mein-${subdomain}`,
    `${subdomain}-gastro`,
    `${subdomain}-online`,
    `${subdomain}-de`,
  ];

  for (const variation of variations) {
    if (validateSubdomainFormat(variation).valid) {
      suggestions.push(variation);
    }
    if (suggestions.length >= 3) break;
  }

  return suggestions;
}
