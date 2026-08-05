import { Request, Response } from "express";
import prisma from "../db/prisma";
import { z } from "zod";

// ─── Validation Schemas ───────────────────────────────────────────────────────

const createOrderSchema = z.object({
  webAppId: z.string().uuid(),
  menuItemId: z.string().max(255).optional(),
  menuItemName: z.string().min(1).max(255),
  orderSource: z.enum(["stripe", "pos_api", "manual"]),
  userAvatarUrl: z.string().url().max(2048).optional(),
});

/**
 * POST /api/orders/create
 * Record a new order event (for social proof badges)
 * Requires authentication (requireAuth middleware in server/index.ts)
 *
 * Body: {
 *   webAppId: string (uuid),
 *   menuItemId?: string,
 *   menuItemName: string,
 *   orderSource: 'stripe' | 'pos_api' | 'manual',
 *   userAvatarUrl?: string
 * }
 */
export async function handleCreateOrder(req: Request, res: Response) {
  try {
    const validatedData = createOrderSchema.parse(req.body);

    const event = await prisma.orderEvent.create({
      data: {
        webAppId: validatedData.webAppId,
        orderId: `order-${Date.now()}`,
        menuItemId: validatedData.menuItemId || null,
        menuItemName: validatedData.menuItemName,
        orderSource: validatedData.orderSource,
        userAvatarUrl: validatedData.userAvatarUrl || null,
      },
      select: {
        id: true,
        orderedAt: true,
      },
    });

    return res.json({
      success: true,
      event,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ success: false, error: error.errors });
    }
    console.error("Create order error:", error);
    return res.status(500).json({
      success: false,
      error: "Failed to create order",
    });
  }
}

/**
 * GET /api/orders/:webAppId/recent
 * Fetch recent orders for a website (last 1 hour, limit 10)
 */
export async function handleGetRecentOrders(req: Request, res: Response) {
  try {
    const { webAppId } = req.params;

    if (!webAppId) {
      return res.status(400).json({
        success: false,
        error: "webAppId is required",
      });
    }

    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);

    const orders = await prisma.orderEvent.findMany({
      where: {
        webAppId,
        orderedAt: {
          gt: oneHourAgo,
        },
      },
      orderBy: {
        orderedAt: "desc",
      },
      take: 10,
      select: {
        id: true,
        orderId: true,
        menuItemId: true,
        menuItemName: true,
        orderedAt: true,
        orderSource: true,
        userAvatarUrl: true,
      },
    });

    const ordersWithMinutesAgo = orders.map((order) => ({
      ...order,
      minutesAgo: Math.round((Date.now() - order.orderedAt.getTime()) / 60000),
    }));

    return res.json({
      success: true,
      orders: ordersWithMinutesAgo,
    });
  } catch (error) {
    console.error("Get recent orders error:", error);
    return res.status(500).json({
      success: false,
      error: "Failed to fetch orders",
    });
  }
}

/**
 * GET /api/orders/:webAppId/menu-stats
 * Get per-menu-item statistics (last ordered time, recent count)
 * Used to populate UI with social proof data
 */
export async function handleGetMenuStats(req: Request, res: Response) {
  try {
    const { webAppId } = req.params;

    if (!webAppId) {
      return res.status(400).json({
        success: false,
        error: "webAppId is required",
      });
    }

    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

    // Limit to last 24h to avoid unbounded queries
    const orders = await prisma.orderEvent.findMany({
      where: {
        webAppId,
        orderedAt: { gt: oneDayAgo },
      },
      select: {
        menuItemId: true,
        menuItemName: true,
        orderedAt: true,
      },
    });

    const statsMap: Record<string, any> = {};

    orders.forEach((order) => {
      const key = order.menuItemId || order.menuItemName;
      if (!statsMap[key]) {
        statsMap[key] = {
          lastOrderedAt: null,
          recentCount: 0,
          dailyCount: 0,
          minutesAgo: null,
        };
      }

      const stats = statsMap[key];
      if (!stats.lastOrderedAt || order.orderedAt > stats.lastOrderedAt) {
        stats.lastOrderedAt = order.orderedAt;
      }

      if (order.orderedAt > oneHourAgo) {
        stats.recentCount++;
      }

      if (order.orderedAt > oneDayAgo) {
        stats.dailyCount++;
      }
    });

    Object.values(statsMap).forEach((stat: any) => {
      if (stat.lastOrderedAt) {
        stat.minutesAgo = Math.round(
          (Date.now() - stat.lastOrderedAt.getTime()) / 60000,
        );
      }
    });

    return res.json({
      success: true,
      stats: statsMap,
    });
  } catch (error) {
    console.error("Get menu stats error:", error);
    return res.status(500).json({
      success: false,
      error: "Failed to fetch menu stats",
    });
  }
}

/**
 * POST /api/orders/:webAppId/clear-old
 * Admin endpoint to clean up old order events (older than 7 days)
 */
export async function handleClearOldOrders(req: Request, res: Response) {
  try {
    const { webAppId } = req.params;

    if (!webAppId) {
      return res.status(400).json({
        success: false,
        error: "webAppId is required",
      });
    }

    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

    await prisma.orderEvent.deleteMany({
      where: {
        webAppId,
        orderedAt: {
          lt: sevenDaysAgo,
        },
      },
    });

    return res.json({
      success: true,
      message: "Old orders cleared",
    });
  } catch (error) {
    console.error("Clear old orders error:", error);
    return res.status(500).json({
      success: false,
      error: "Failed to clear orders",
    });
  }
}
