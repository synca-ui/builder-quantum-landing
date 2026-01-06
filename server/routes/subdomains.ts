import { Request, Response, Router } from 'express';
import prisma from '../db/prisma';

export const subdomainRouter = Router();

/**
 * Extract subdomain from hostname
 * Examples:
 * - bella.maitr.de → bella
 * - maitr.de → null
 * - localhost:3000 → null
 */
function extractSubdomain(hostname: string): string | null {
  const parts = hostname.split('.');
  
  // If localhost or single part, no subdomain
  if (parts.length <= 2 || hostname === 'localhost') {
    return null;
  }
  
  // Get the first part (subdomain)
  const subdomain = parts[0];
  
  // Ignore common subdomains like www, mail, etc.
  if (['www', 'mail', 'smtp', 'imap', 'ftp', 'api'].includes(subdomain)) {
    return null;
  }
  
  return subdomain;
}

/**
 * Middleware to handle subdomain routing
 * If subdomain exists, serve the published site
 */
export async function handleSubdomainRequest(req: Request, res: Response): Promise<void> {
  const subdomain = extractSubdomain(req.hostname);
  
  // If no subdomain or main domain, skip this handler
  if (!subdomain) {
    return;
  }
  
  try {
    console.log(`[Subdomain] Attempting to serve ${subdomain} from ${req.hostname}`);
    
    // Try to find published web app
    const webApp = await prisma.webApp.findUnique({
      where: { subdomain },
      select: {
        configData: true,
        userId: true,
      },
    });
    
    if (!webApp || !webApp.configData) {
      console.log(`[Subdomain] No published site found for subdomain: ${subdomain}`);
      return; // Let next handler deal with it
    }
    
    // Return the published site config as HTML
    const config = webApp.configData as Record<string, any>;
    
    // Simple HTML response that initializes the published site
    const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${config.businessName || 'Restaurant'}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: system-ui, -apple-system, sans-serif; }
  </style>
</head>
<body>
  <div id="root"></div>
  <script>
    window.__PUBLISHED_CONFIG__ = ${JSON.stringify(config)};
    window.__SUBDOMAIN__ = "${subdomain}";
  </script>
  <script type="module" src="https://maitr.de/__published-app.js"></script>
</body>
</html>
    `;
    
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.status(200).send(html);
  } catch (error) {
    console.error(`[Subdomain] Error handling subdomain ${subdomain}:`, error);
    // Don't respond here, let other handlers deal with it
    return;
  }
}
