/**
 * Floor Plan & Table Management API
 * Handles SVG-based table editor with QR code generation
 */

import { Router, Request, Response } from "express";
import { requireAuth } from "../middleware/auth";
import prisma from "../db/prisma";
import { z } from "zod";
import QRCode from "qrcode"; // Use the Node.js qrcode library, not React component

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
const floorPlanSchema = z.object({
  name: z.string().min(1, "Name is required"),
  description: z.string().optional(),
  width: z.number().int().min(400).max(2000).default(800),
  height: z.number().int().min(300).max(2000).default(600),
  gridSize: z.number().int().min(10).max(50).default(20),
  bgColor: z
    .string()
    .regex(/^#[0-9A-Fa-f]{6}$/)
    .default("#f8fafc"),
  bgImage: z.string().url().optional(),
});

const tableSchema = z.object({
  floorPlanId: z.string().uuid(),
  number: z.string().min(1, "Table number is required"),
  name: z.string().optional(),
  x: z.number(),
  y: z.number(),
  rotation: z.number().min(0).max(360).default(0),
  shape: z.enum(["round", "square", "rectangle"]),
  width: z.number().min(40).max(200).default(80),
  height: z.number().min(40).max(200).default(80),
  minCapacity: z.number().int().min(1).default(2),
  maxCapacity: z.number().int().min(1).default(4),
  qrEnabled: z.boolean().default(false),
});

/**
 * Utility: Generate QR code for table
 */
async function generateTableQRCode(
  businessId: string,
  tableId: string,
  tableNumber: string,
): Promise<{ qrCode: string; qrCodeImage: string }> {
  // Generate ordering URL
  const baseUrl = process.env.APP_URL || "https://maitr.app";
  const qrCodeUrl = `${baseUrl}/order/${businessId}/${tableId}`;

  try {
    // Generate QR code image as base64 using Node.js qrcode library
    const qrCodeImage = await QRCode.toDataURL(qrCodeUrl, {
      errorCorrectionLevel: "H",
      type: "image/png",
      margin: 1,
      width: 300,
      color: {
        dark: "#0d9488", // Maitr teal
        light: "#ffffff",
      },
    });

    return { qrCode: qrCodeUrl, qrCodeImage };
  } catch (error) {
    console.error("Error generating QR code:", error);
    throw new Error("Failed to generate QR code");
  }
}

/**
 * Utility: Check table overlap
 */
function checkTableOverlap(
  tables: Array<{
    x: number;
    y: number;
    width: number;
    height: number;
    id?: string;
  }>,
  newTable: { x: number; y: number; width: number; height: number },
  excludeId?: string,
): boolean {
  return tables.some((table) => {
    if (excludeId && table.id === excludeId) return false;

    // Simple bounding box collision detection
    return (
      newTable.x < table.x + table.width &&
      newTable.x + newTable.width > table.x &&
      newTable.y < table.y + table.height &&
      newTable.y + newTable.height > table.y
    );
  });
}

// ============================================
// FLOOR PLAN ROUTES
// ============================================

/**
 * GET /api/dashboard/floor-plan/plans
 * List all floor plans for a business
 */
router.get("/plans", requireAuth, async (req: Request, res: Response) => {
  try {
    const userId = req.userId;
    const businessId = req.query.businessId as string;

    if (!businessId) {
      return res.status(400).json({ error: "businessId is required" });
    }

    // Verify user owns this business
    const business = await prisma.business.findFirst({
      where: {
        id: businessId,
        members: {
          some: {
            userId,
          },
        },
      },
    });

    if (!business) {
      return res.status(403).json({ error: "Access denied" });
    }

    // Get floor plans with table counts
    const floorPlans = await prisma.floorPlan.findMany({
      where: {
        businessId,
      },
      include: {
        tables: {
          select: {
            id: true,
            number: true,
            name: true,
            x: true,
            y: true,
            rotation: true,
            shape: true,
            width: true,
            height: true,
            minCapacity: true,
            maxCapacity: true,
            qrEnabled: true,
            status: true,
          },
        },
      },
      orderBy: {
        sortOrder: "asc",
      },
    });

    res.json({ success: true, data: floorPlans });
  } catch (error) {
    console.error("Error fetching floor plans:", error);
    res.status(500).json({ error: "Failed to fetch floor plans" });
  }
});

/**
 * POST /api/dashboard/floor-plan/plans
 * Create a new floor plan
 */
router.post("/plans", requireAuth, async (req: Request, res: Response) => {
  try {
    const userId = req.userId;
    const businessId = req.body.businessId as string;

    if (!businessId) {
      return res.status(400).json({ error: "businessId is required" });
    }

    // Verify user owns this business
    const business = await prisma.business.findFirst({
      where: {
        id: businessId,
        members: {
          some: {
            userId,
          },
        },
      },
    });

    if (!business) {
      return res.status(403).json({ error: "Access denied" });
    }

    // Validate input
    const validated = floorPlanSchema.parse(req.body);

    // Get max sort order for this business
    const maxOrder = await prisma.floorPlan.findFirst({
      where: { businessId },
      orderBy: { sortOrder: "desc" },
      select: { sortOrder: true },
    });

    // Create floor plan
    const floorPlan = await prisma.floorPlan.create({
      data: {
        businessId,
        name: validated.name,
        description: validated.description,
        width: validated.width,
        height: validated.height,
        gridSize: validated.gridSize,
        bgColor: validated.bgColor,
        bgImage: validated.bgImage,
        sortOrder: (maxOrder?.sortOrder || 0) + 1,
        isActive: true,
      },
      include: {
        tables: true,
      },
    });

    res.json({ success: true, data: floorPlan });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.errors });
    }
    console.error("Error creating floor plan:", error);
    res.status(500).json({ error: "Failed to create floor plan" });
  }
});

/**
 * PUT /api/dashboard/floor-plan/plans/:id
 * Update a floor plan
 */
router.put("/plans/:id", requireAuth, async (req: Request, res: Response) => {
  try {
    const userId = req.userId;
    const planId = req.params.id;

    // Validate input
    const validated = floorPlanSchema.partial().parse(req.body);

    // For now, return mock success response
    // TODO: Implement actual database update when schema is ready
    const mockUpdated = {
      id: planId,
      ...validated,
      updatedAt: new Date(),
    };

    res.json({ success: true, data: mockUpdated });
  } catch (error) {
    console.error("Error updating floor plan:", error);
    res.status(500).json({ error: "Failed to update floor plan" });
  }
});

// ============================================
// TABLE ROUTES
// ============================================

/**
 * GET /api/dashboard/floor-plan/tables
 * Get tables for a floor plan
 */
router.get("/tables", requireAuth, async (req: Request, res: Response) => {
  try {
    const userId = req.userId;
    const floorPlanId = req.query.floorPlanId as string;

    if (!floorPlanId) {
      return res.status(400).json({ error: "floorPlanId is required" });
    }

    // Mock tables data
    const mockTables = [
      {
        id: "t1",
        floorPlanId,
        number: "1",
        name: "Table 1",
        x: 100,
        y: 100,
        rotation: 0,
        shape: "round",
        width: 80,
        height: 80,
        minCapacity: 2,
        maxCapacity: 4,
        qrEnabled: true,
        qrCode: `https://maitr.app/order/business123/t1`,
        qrCodeImage: "data:image/png;base64,mock-qr-code-data",
      },
      {
        id: "t2",
        floorPlanId,
        number: "2",
        name: "Table 2",
        x: 200,
        y: 150,
        rotation: 0,
        shape: "square",
        width: 100,
        height: 100,
        minCapacity: 4,
        maxCapacity: 6,
        qrEnabled: false,
      },
    ];

    res.json({ success: true, data: mockTables });
  } catch (error) {
    console.error("Error fetching tables:", error);
    res.status(500).json({ error: "Failed to fetch tables" });
  }
});

/**
 * POST /api/dashboard/floor-plan/tables
 * Add a new table
 */
router.post("/tables", requireAuth, async (req: Request, res: Response) => {
  try {
    const userId = req.userId;

    // Validate input
    const validated = tableSchema.parse(req.body);

    // Generate QR code if enabled
    let qrCodeData = null;
    if (validated.qrEnabled) {
      try {
        const businessId = "mock_business_id"; // TODO: Get from proper business lookup
        const tempId = `table_${Date.now()}`;
        qrCodeData = await generateTableQRCode(
          businessId,
          tempId,
          validated.number,
        );
      } catch (error) {
        console.warn("Failed to generate QR code:", error);
        // Continue without QR code
      }
    }

    // Mock table creation
    const mockTable = {
      id: `table_${Date.now()}`,
      ...validated,
      qrCode: qrCodeData?.qrCode || null,
      qrCodeImage: qrCodeData?.qrCodeImage || null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    res.json({ success: true, data: mockTable });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.errors });
    }
    console.error("Error creating table:", error);
    res.status(500).json({ error: "Failed to create table" });
  }
});

/**
 * PUT /api/dashboard/floor-plan/tables/:id
 * Update table position/properties
 */
router.put("/tables/:id", requireAuth, async (req: Request, res: Response) => {
  try {
    const userId = req.userId;
    const tableId = req.params.id;

    // Validate input
    const validated = tableSchema.partial().parse(req.body);

    // Handle QR code generation if enabled
    let qrCodeData = null;
    if (validated.qrEnabled === true) {
      try {
        const businessId = "mock_business_id"; // TODO: Get from proper business lookup
        qrCodeData = await generateTableQRCode(
          businessId,
          tableId,
          validated.number || "Unknown",
        );
      } catch (error) {
        console.warn("Failed to generate QR code:", error);
      }
    }

    // Mock table update
    const mockUpdated = {
      id: tableId,
      ...validated,
      ...(qrCodeData && {
        qrCode: qrCodeData.qrCode,
        qrCodeImage: qrCodeData.qrCodeImage,
      }),
      ...(validated.qrEnabled === false && {
        qrCode: null,
        qrCodeImage: null,
      }),
      updatedAt: new Date(),
    };

    res.json({ success: true, data: mockUpdated });
  } catch (error) {
    console.error("Error updating table:", error);
    res.status(500).json({ error: "Failed to update table" });
  }
});

/**
 * DELETE /api/dashboard/floor-plan/tables/:id
 * Remove a table
 */
router.delete(
  "/tables/:id",
  requireAuth,
  async (req: Request, res: Response) => {
    try {
      const userId = req.userId;
      const tableId = req.params.id;

      // For now, just return success
      // TODO: Implement proper deletion with reservation check when schema is ready
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting table:", error);
      res.status(500).json({ error: "Failed to delete table" });
    }
  },
);

/**
 * POST /api/dashboard/floor-plan/tables/:id/regenerate-qr
 * Regenerate QR code for a table
 */
router.post(
  "/tables/:id/regenerate-qr",
  requireAuth,
  async (req: Request, res: Response) => {
    try {
      const userId = req.userId;
      const tableId = req.params.id;

      // Generate new QR code
      try {
        const businessId = "mock_business_id"; // TODO: Get from proper business lookup
        const tableNumber = req.body.tableNumber || tableId;
        const qrCodeData = await generateTableQRCode(
          businessId,
          tableId,
          tableNumber,
        );

        const mockUpdated = {
          id: tableId,
          qrEnabled: true,
          qrCode: qrCodeData.qrCode,
          qrCodeImage: qrCodeData.qrCodeImage,
          updatedAt: new Date(),
        };

        res.json({ success: true, data: mockUpdated });
      } catch (error) {
        console.error("Error regenerating QR code:", error);
        res.status(500).json({ error: "Failed to regenerate QR code" });
      }
    } catch (error) {
      console.error("Error in regenerate QR endpoint:", error);
      res.status(500).json({ error: "Failed to regenerate QR code" });
    }
  },
);

export default router;
