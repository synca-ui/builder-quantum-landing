/**
 * Creative Studio API - Template & Menu Management
 * Handles template switching and menu upgrades for restaurant owners
 */

import { Router, Request, Response } from "express";
import { requireAuth } from "../middleware/auth";
import prisma from "../db/prisma";
import { z } from "zod";
import {
  betriebskennung,
  geprueftesBetriebsrecht,
} from "../middleware/betriebskennung";
import { istFremdePrefixUrl } from "../services/supabaseStorage";

// Extend Request interface for TypeScript
declare global {
  namespace Express {
    interface Request {
      userId?: string;
    }
  }
}

const router = Router();

// Validation schemas
const templateSwitchSchema = z.object({
  templateId: z.string(),
  preserveContent: z.boolean().default(true),
});

const menuUpgradeSchema = z.object({
  categoryId: z.string().uuid().optional(),
  items: z.array(
    z.object({
      name: z.string().min(1),
      description: z.string().optional(),
      price: z.number().positive(),
      imageUrl: z.string().url().optional(),
    }),
  ),
});

/**
 * Betriebskennung lesen und die Mitgliedschaft prüfen.
 *
 * ANLASS: Hier stand an jeder Route `req.query.businessId as string` bzw.
 * `req.body.businessId` - ein `as string` prüft zur Laufzeit nichts. Express
 * parst mit `qs`, und `?businessId[not]=zzz` wird zu `{ businessId: { not:
 * "zzz" } }`. Dieses Objekt bestand die Besitzprüfung (fand den EIGENEN
 * Betrieb des Anfragenden über die dann wirkungslose Bedingung) und wurde
 * danach als Kennung weiterbenutzt - `where: { businessId }` lieferte die
 * Zeilen ALLER Betriebe. Siehe server/middleware/betriebskennung.ts für die
 * volle Herleitung.
 *
 * Ab dem Rückgabewert dieser Funktion wird NUR NOCH die geprüfte Kennung
 * benutzt, nie wieder ein Rohwert aus `req.query`/`req.body`. Bei Fehlschlag
 * sendet die Funktion selbst die passende Antwort und liefert `null` - der
 * Aufrufer muss dann nur noch `return`.
 */
async function geprueftesBusiness(
  req: Request,
  res: Response,
): Promise<string | null> {
  const kennung = betriebskennung(req);
  if (!kennung) {
    res.status(400).json({ error: "businessId fehlt oder ist ungültig" });
    return null;
  }
  const businessId = await geprueftesBetriebsrecht(prisma, req.userId!, kennung);
  if (!businessId) {
    res.status(403).json({ error: "Kein Zugriff auf diesen Betrieb" });
    return null;
  }
  return businessId;
}

/**
 * Nur Inhaber/Admin. Siehe `ownerGuard` in server/maitr/routes.ts für dieselbe
 * Abwägung: Erzwungen wird die Rolle an genau den Zugriffen, die ändern, was
 * der GAST außerhalb des Dashboards sieht - Vorlage und Speisekarte sind hier
 * beide dieser Fall, und dieses Modul ist laut eigenem Dateikopf ohnehin "for
 * restaurant owners" gedacht.
 *
 * Gemessen: Eine Aushilfe (`BusinessMember.role` STAFF, der Vorgabewert des
 * Modells) konnte über `POST /templates/switch` die veröffentlichte
 * Website-Vorlage wechseln. ADMIN ist mitgemeint: das ist die
 * Plattformrolle, nicht eine Aushilfe.
 */
async function nurInhaber(businessId: string, userId: string): Promise<boolean> {
  const mitgliedschaft = await prisma.businessMember.findUnique({
    where: { userId_businessId: { userId, businessId } },
    select: { role: true },
  });
  return mitgliedschaft?.role === "OWNER" || mitgliedschaft?.role === "ADMIN";
}

/**
 * GET /api/dashboard/creative/templates
 * Get available templates for switching
 */
router.get("/templates", requireAuth, async (req: Request, res: Response) => {
  try {
    const businessId = await geprueftesBusiness(req, res);
    if (!businessId) return;

    // Verify business ownership
    const business = await prisma.business.findFirst({
      where: { id: businessId },
      include: {
        template: true,
      },
    });

    // Get available templates (remove isPublished filter for now since it might not exist in schema)
    const templates = await prisma.template.findMany({
      select: {
        id: true,
        name: true,
        description: true,
        category: true,
        isPremium: true,
        preview: true,
        avgRating: true,
        downloads: true,
      },
      orderBy: [
        { isPremium: "desc" },
        { avgRating: "desc" },
        { downloads: "desc" },
      ],
    });

    res.json({
      success: true,
      data: {
        currentTemplate: business?.template,
        availableTemplates: templates,
        categories: ["Modern", "Stylish", "Cozy"],
      },
    });
  } catch (error) {
    console.error("Error fetching templates:", error);
    res.status(500).json({ error: "Failed to fetch templates" });
  }
});

/**
 * POST /api/dashboard/creative/templates/switch
 * Switch to a different template
 */
router.post(
  "/templates/switch",
  requireAuth,
  async (req: Request, res: Response) => {
    try {
      const businessId = await geprueftesBusiness(req, res);
      if (!businessId) return;

      // Ändert die veröffentlichte Website-Vorlage - der Gast sieht das
      // sofort, keine Aushilfen-Aufgabe. Siehe `nurInhaber`.
      if (!(await nurInhaber(businessId, req.userId!))) {
        return res.status(403).json({ error: "nur_inhaber" });
      }

      // Validate input
      const validatedData = templateSwitchSchema.parse(req.body);

      // Verify template exists
      const template = await prisma.template.findUnique({
        where: { id: validatedData.templateId },
      });

      if (!template) {
        return res.status(404).json({ error: "Template not found" });
      }

      // Update business template
      const updatedBusiness = await prisma.business.update({
        where: { id: businessId },
        data: {
          templateId: validatedData.templateId,
          updatedAt: new Date(),
        },
        include: {
          template: true,
        },
      });

      // If preserveContent is false, we might want to reset certain fields
      // This would be a more complex operation involving configurations

      res.json({
        success: true,
        data: {
          business: updatedBusiness,
          message: `Successfully switched to ${template.name} template`,
        },
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.errors });
      }
      console.error("Error switching template:", error);
      res.status(500).json({ error: "Failed to switch template" });
    }
  },
);

/**
 * GET /api/dashboard/creative/menu
 * Get current menu structure for editing
 */
router.get("/menu", requireAuth, async (req: Request, res: Response) => {
  try {
    const businessId = await geprueftesBusiness(req, res);
    if (!businessId) return;

    // Get menu categories with items
    const categories = await prisma.menuCategory.findMany({
      where: { businessId },
      include: {
        items: {
          orderBy: { name: "asc" },
        },
        _count: {
          select: { items: true },
        },
      },
      orderBy: { sortOrder: "asc" },
    });

    // Get menu statistics
    const totalItems = await prisma.menuItem.count({
      where: {
        category: {
          businessId,
        },
      },
    });

    const averagePrice = await prisma.menuItem.aggregate({
      where: {
        category: {
          businessId,
        },
      },
      _avg: {
        price: true,
      },
    });

    res.json({
      success: true,
      data: {
        categories,
        statistics: {
          totalCategories: categories.length,
          totalItems,
          averagePrice: averagePrice._avg.price || 0,
        },
      },
    });
  } catch (error) {
    console.error("Error fetching menu:", error);
    res.status(500).json({ error: "Failed to fetch menu" });
  }
});

/**
 * POST /api/dashboard/creative/menu/categories
 * Create a new menu category
 */
router.post(
  "/menu/categories",
  requireAuth,
  async (req: Request, res: Response) => {
    try {
      const businessId = await geprueftesBusiness(req, res);
      if (!businessId) return;

      // Ändert den Aufbau der öffentlich sichtbaren Speisekarte - dieselbe
      // Kategorie wie der Vorlagenwechsel oben, keine Aushilfen-Aufgabe.
      if (!(await nurInhaber(businessId, req.userId!))) {
        return res.status(403).json({ error: "nur_inhaber" });
      }

      const { name } = req.body;

      if (!name) {
        return res.status(400).json({ error: "name is required" });
      }

      // Get next sort order
      const lastCategory = await prisma.menuCategory.findFirst({
        where: { businessId },
        orderBy: { sortOrder: "desc" },
      });

      // Create category
      const category = await prisma.menuCategory.create({
        data: {
          businessId,
          name,
          sortOrder: (lastCategory?.sortOrder || 0) + 1,
        },
        include: {
          _count: {
            select: { items: true },
          },
        },
      });

      res.json({ success: true, data: category });
    } catch (error) {
      console.error("Error creating menu category:", error);
      res.status(500).json({ error: "Failed to create menu category" });
    }
  },
);

/**
 * POST /api/dashboard/creative/menu/items
 * Add items to menu category
 */
router.post("/menu/items", requireAuth, async (req: Request, res: Response) => {
  try {
    const businessId = await geprueftesBusiness(req, res);
    if (!businessId) return;

    // Setzt Preise und Bilder auf der öffentlich sichtbaren Speisekarte fest -
    // dieselbe Kategorie wie oben, keine Aushilfen-Aufgabe.
    if (!(await nurInhaber(businessId, req.userId!))) {
      return res.status(403).json({ error: "nur_inhaber" });
    }

    // Validate input
    const validatedData = menuUpgradeSchema.parse(req.body);

    // ANLASS: imageUrl akzeptierte jede beliebige URL, auch eine, die auf
    // UNSEREN Storage-Bucket zeigt, aber unter dem Präfix eines fremden
    // Nutzers liegt - die Speisekarte hätte dann vorgetäuscht, ein Bild aus
    // dem eigenen Betrieb zu zeigen, das tatsächlich woanders hochgeladen
    // wurde. Externe Adressen außerhalb unseres Buckets bleiben erlaubt.
    for (const item of validatedData.items) {
      if (item.imageUrl && istFremdePrefixUrl(item.imageUrl, req.userId!)) {
        return res.status(400).json({
          error: "imageUrl zeigt auf fremden Storage-Bereich",
        });
      }
    }

    // Die Kategorie muss zu DIESEM Betrieb gehören, BEVOR irgendetwas
    // geschrieben wird. `MenuItem.categoryId` ist ein einspaltiger
    // Fremdschlüssel ohne begleitendes `businessId` im Schema - die Bindung
    // an den geprüften Betrieb gehört deshalb hierher (dasselbe Muster wie
    // beim Tisch in server/maitr/routes.ts, POST /reservations/walk-in).
    //
    // Gemessen: Ein Gericht landete in der Speisekarte eines fremden
    // Betriebs.
    let categoryId = validatedData.categoryId;
    if (categoryId) {
      const kategorie = await prisma.menuCategory.findFirst({
        where: { id: categoryId, businessId },
        select: { id: true },
      });
      if (!kategorie) {
        return res.status(404).json({ error: "Kategorie nicht gefunden" });
      }
    } else {
      // If no categoryId provided, create a default one
      const defaultCategory = await prisma.menuCategory.create({
        data: {
          businessId,
          name: "New Menu Items",
          sortOrder: 999,
        },
      });
      categoryId = defaultCategory.id;
    }

    // Create menu items
    const items = await Promise.all(
      validatedData.items.map((item) =>
        prisma.menuItem.create({
          data: {
            categoryId: categoryId!,
            name: item.name,
            description: item.description,
            price: item.price,
            imageUrl: item.imageUrl,
          },
        }),
      ),
    );

    res.json({
      success: true,
      data: {
        categoryId,
        items,
        message: `Added ${items.length} menu items successfully`,
      },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.errors });
    }
    console.error("Error adding menu items:", error);
    res.status(500).json({ error: "Failed to add menu items" });
  }
});

/**
 * GET /api/dashboard/creative/ai-suggestions
 * Get AI-powered menu and design suggestions
 */
router.get(
  "/ai-suggestions",
  requireAuth,
  async (req: Request, res: Response) => {
    try {
      const businessId = await geprueftesBusiness(req, res);
      if (!businessId) return;

      // Generate AI suggestions based on business type and current setup
      const suggestions = {
        templateUpgrades: [
          {
            templateId: "modern-2024",
            name: "Modern Minimal",
            reason: "Increases conversion by 23% for your business type",
            preview: "/templates/modern-preview.jpg",
          },
          {
            templateId: "stylish-premium",
            name: "Stylish Premium",
            reason: "Perfect for upscale dining experiences",
            preview: "/templates/stylish-preview.jpg",
          },
        ],
        menuImprovements: [
          {
            type: "pricing_optimization",
            title: "Optimize Pricing Strategy",
            description: "Adjust prices based on local market analysis",
            impact: "+12% revenue potential",
          },
          {
            type: "category_organization",
            title: "Reorganize Menu Categories",
            description: "Group items for better customer flow",
            impact: "+8% order completion",
          },
        ],
        colorSchemeUpgrades: [
          {
            primary: "#0d9488",
            secondary: "#7c3aed",
            name: "Maitr Brand Colors",
            description: "Optimized for trust and appetite appeal",
          },
        ],
      };

      res.json({
        success: true,
        data: suggestions,
      });
    } catch (error) {
      console.error("Error fetching AI suggestions:", error);
      res.status(500).json({ error: "Failed to fetch AI suggestions" });
    }
  },
);

export default router;
