import { Router, Request, Response, NextFunction } from "express";
import { prisma } from "../db/prisma";

export const subdomainsRouter = Router();

/**
 * Middleware to detect subdomain requests and serve the appropriate site
 * This runs LAST after all API routes
 */
export async function handleSubdomainRequest(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const host = req.hostname || req.headers.host?.split(":")[0] || "";

    // Skip if not a subdomain request
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

    if (!subdomain || subdomain === baseDomain) {
      return next();
    }

    // Look up the WebApp for this subdomain
    const webApp = await prisma.webApp.findUnique({
      where: { subdomain },
      select: { configData: true },
    });

    if (!webApp) {
      // Subdomain not found - let the frontend handle 404
      return next();
    }

    // Attach the config to the request for server-side rendering
    (req as any).subdomainConfig = webApp.configData;
    (req as any).subdomain = subdomain;

    return next();
  } catch (error) {
    console.error("[Subdomains] Middleware error:", error);
    return next();
  }
}

// Reserved subdomains that can never be used
const RESERVED_SUBDOMAINS = [
  "www", "admin", "api", "app", "mail", "ftp", "blog", "shop", "store",
  "help", "support", "info", "news", "test", "demo", "staging", "dev",
  "dashboard", "portal", "account", "accounts", "login", "signin", "signup",
  "auth", "oauth", "static", "assets", "cdn", "media", "images", "img",
  "files", "download", "downloads", "docs", "documentation", "status",
  "health", "ping", "metrics", "analytics", "tracking", "webhook", "webhooks",
  "graphql", "rest", "socket", "ws", "wss", "ssl", "secure", "maitr"
];

// Validate subdomain format
function validateSubdomainFormat(subdomain: string): { valid: boolean; error?: string } {
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
    return { valid: false, error: "Muss mit einem Buchstaben oder einer Zahl beginnen" };
  }
  
  if (!/[a-z0-9]$/.test(subdomain)) {
    return { valid: false, error: "Muss mit einem Buchstaben oder einer Zahl enden" };
  }
  
  if (!/^[a-z0-9-]+$/.test(subdomain)) {
    return { valid: false, error: "Nur Kleinbuchstaben, Zahlen und Bindestriche erlaubt" };
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
subdomainsRouter.post("/validate", async (req, res) => {
  try {
    const { subdomain, userId } = req.body;
    
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
subdomainsRouter.post("/reserve", async (req, res) => {
  try {
    const { subdomain, userId, configId } = req.body;
    
    if (!subdomain || !userId || !configId) {
      return res.status(400).json({
        success: false,
        error: "subdomain, userId und configId sind erforderlich",
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
    
    // Update configuration with reserved subdomain
    await prisma.configuration.update({
      where: { id: configId },
      data: { selectedDomain: normalizedSubdomain },
    });
    
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
