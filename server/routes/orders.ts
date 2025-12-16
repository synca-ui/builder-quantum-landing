import { Request, Response } from "express";
import { sql } from "../sql";

/**
 * POST /api/orders/create
 * Record a new order event (for social proof badges)
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
    const {
      webAppId,
      menuItemId,
      menuItemName,
      orderSource,
      userAvatarUrl
    } = req.body;

    if (!webAppId || !menuItemName || !orderSource) {
      return res.status(400).json({
        success: false,
        error: "Missing required fields: webAppId, menuItemName, orderSource"
      });
    }

    // Insert into order_events table
    const result = await sql`
      INSERT INTO public.order_events (
        web_app_id,
        order_id,
        menu_item_id,
        menu_item_name,
        ordered_at,
        order_source,
        user_avatar_url
      )
      VALUES (
        ${webAppId},
        ${`order-${Date.now()}`},
        ${menuItemId || null},
        ${menuItemName},
        now(),
        ${orderSource},
        ${userAvatarUrl || null}
      )
      RETURNING id, ordered_at;
    `;

    return res.json({
      success: true,
      event: result[0]
    });
  } catch (error) {
    console.error("Create order error:", error);
    return res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : "Failed to create order"
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
        error: "webAppId is required"
      });
    }

    // Fetch recent orders
    const orders = await sql`
      SELECT 
        id,
        order_id,
        menu_item_id,
        menu_item_name,
        ordered_at,
        order_source,
        user_avatar_url,
        EXTRACT(EPOCH FROM (now() - ordered_at)) / 60 AS minutes_ago
      FROM public.order_events
      WHERE 
        web_app_id = ${webAppId}
        AND ordered_at > now() - interval '1 hour'
      ORDER BY ordered_at DESC
      LIMIT 10;
    `;

    return res.json({
      success: true,
      orders: orders || []
    });
  } catch (error) {
    console.error("Get recent orders error:", error);
    return res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : "Failed to fetch orders"
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
        error: "webAppId is required"
      });
    }

    // Aggregate stats per menu item
    const stats = await sql`
      SELECT 
        menu_item_id,
        menu_item_name,
        MAX(ordered_at) as last_ordered_at,
        COUNT(*) FILTER (WHERE ordered_at > now() - interval '1 hour') as recent_count,
        COUNT(*) FILTER (WHERE ordered_at > now() - interval '24 hours') as daily_count
      FROM public.order_events
      WHERE web_app_id = ${webAppId}
      GROUP BY menu_item_id, menu_item_name
      ORDER BY last_ordered_at DESC;
    `;

    // Transform to key-value format
    const statsMap: Record<string, any> = {};
    (stats || []).forEach((stat: any) => {
      const key = stat.menu_item_id || stat.menu_item_name;
      statsMap[key] = {
        lastOrderedAt: stat.last_ordered_at,
        recentCount: stat.recent_count || 0,
        dailyCount: stat.daily_count || 0,
        minutesAgo: stat.last_ordered_at
          ? Math.round((Date.now() - new Date(stat.last_ordered_at).getTime()) / 60000)
          : null
      };
    });

    return res.json({
      success: true,
      stats: statsMap
    });
  } catch (error) {
    console.error("Get menu stats error:", error);
    return res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : "Failed to fetch menu stats"
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
        error: "webAppId is required"
      });
    }

    const result = await sql`
      DELETE FROM public.order_events
      WHERE 
        web_app_id = ${webAppId}
        AND ordered_at < now() - interval '7 days';
    `;

    return res.json({
      success: true,
      message: "Old orders cleared"
    });
  } catch (error) {
    console.error("Clear old orders error:", error);
    return res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : "Failed to clear orders"
    });
  }
}
