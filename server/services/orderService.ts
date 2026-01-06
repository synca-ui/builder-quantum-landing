/**
 * Order Service
 * Business logic for order tracking and social proof statistics
 */

import prisma from '../db/prisma';

export interface OrderEvent {
  id: string;
  webAppId: string;
  menuItemId?: string | null;
  menuItemName: string;
  orderSource: string;
  userAvatarUrl?: string | null;
  createdAt: Date;
}

export interface MenuItemStats {
  itemId?: string | null;
  itemName?: string;
  lastOrderedAt?: Date | null;
  lastOrderedMinutesAgo?: number;
  recentOrderCount?: number;
  dailyOrderCount?: number;
  userAvatarUrl?: string | null;
}

/**
 * Create an order event
 */
export async function createOrderEvent(
  webAppId: string,
  menuItemName: string,
  orderSource: string = 'manual',
  additionalData?: Partial<OrderEvent>
): Promise<OrderEvent | null> {
  try {
    // Validate required fields
    if (!webAppId || !menuItemName) {
      console.warn('Missing required fields for order event');
      return null;
    }

    const event = await prisma.orderEvent.create({
      data: {
        webAppId,
        menuItemId: additionalData?.menuItemId || null,
        menuItemName: sanitizeString(menuItemName, 255),
        orderSource: sanitizeOrderSource(orderSource),
        userAvatarUrl: additionalData?.userAvatarUrl || null,
      },
    });

    return {
      id: event.id,
      webAppId: event.webAppId,
      menuItemId: event.menuItemId,
      menuItemName: event.menuItemName,
      orderSource: event.orderSource,
      userAvatarUrl: event.userAvatarUrl,
      createdAt: event.orderedAt,
    };
  } catch (error) {
    console.error('Error creating order event:', error);
    return null;
  }
}

/**
 * Get recent orders for a web app (last 1 hour, max 10)
 */
export async function getRecentOrders(webAppId: string, maxCount: number = 10): Promise<OrderEvent[]> {
  try {
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);

    const orders = await prisma.orderEvent.findMany({
      where: {
        webAppId,
        orderedAt: {
          gt: oneHourAgo,
        },
      },
      orderBy: {
        orderedAt: 'desc',
      },
      take: maxCount,
    });

    return orders.map((event) => ({
      id: event.id,
      webAppId: event.webAppId,
      menuItemId: event.menuItemId,
      menuItemName: event.menuItemName,
      orderSource: event.orderSource,
      userAvatarUrl: event.userAvatarUrl,
      createdAt: event.orderedAt,
    }));
  } catch (error) {
    console.error('Error fetching recent orders:', error);
    return [];
  }
}

/**
 * Get menu item statistics
 * Returns per-item stats: last order time, recent count, daily count
 */
export async function getMenuItemStats(webAppId: string): Promise<Record<string, MenuItemStats>> {
  try {
    const now = new Date();
    const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
    const twentyFourHoursAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

    // Get all orders from past 24 hours
    const orders = await prisma.orderEvent.findMany({
      where: {
        webAppId,
        orderedAt: {
          gte: twentyFourHoursAgo,
        },
      },
      orderBy: {
        orderedAt: 'desc',
      },
    });

    // Group by menu item and calculate statistics
    const stats: Record<string, MenuItemStats> = {};
    const currentTime = now.getTime();

    for (const event of orders) {
      const itemKey = event.menuItemId || event.menuItemName;
      if (!itemKey) continue;

      if (!stats[itemKey]) {
        stats[itemKey] = {
          itemId: event.menuItemId,
          itemName: event.menuItemName,
          lastOrderedAt: event.orderedAt,
          lastOrderedMinutesAgo: 0,
          recentOrderCount: 0,
          dailyOrderCount: 0,
          userAvatarUrl: event.userAvatarUrl,
        };
      }

      // Update last ordered time
      if (!stats[itemKey].lastOrderedAt || event.orderedAt > stats[itemKey].lastOrderedAt!) {
        stats[itemKey].lastOrderedAt = event.orderedAt;
        stats[itemKey].userAvatarUrl = event.userAvatarUrl || stats[itemKey].userAvatarUrl;
      }

      // Count orders in last hour (recent)
      if (event.orderedAt >= oneHourAgo) {
        stats[itemKey].recentOrderCount = (stats[itemKey].recentOrderCount || 0) + 1;
      }

      // Count orders in last 24 hours (daily)
      stats[itemKey].dailyOrderCount = (stats[itemKey].dailyOrderCount || 0) + 1;
    }

    // Calculate minutes since last order
    for (const key in stats) {
      if (stats[key].lastOrderedAt) {
        const lastOrderTime = stats[key].lastOrderedAt!.getTime();
        const minutesAgo = Math.round((currentTime - lastOrderTime) / (1000 * 60));
        stats[key].lastOrderedMinutesAgo = minutesAgo;
      }
    }

    return stats;
  } catch (error) {
    console.error('Error calculating menu item stats:', error);
    return {};
  }
}

/**
 * Clear old order events (older than days)
 * Used for cleanup and reducing database size
 */
export async function clearOldOrders(webAppId: string, olderThanDays: number = 7): Promise<number> {
  try {
    const cutoffDate = new Date(Date.now() - olderThanDays * 24 * 60 * 60 * 1000);

    const result = await prisma.orderEvent.deleteMany({
      where: {
        webAppId,
        orderedAt: {
          lt: cutoffDate,
        },
      },
    });

    console.log(`Cleared orders older than ${olderThanDays} days for webapp ${webAppId}`);
    return result.count;
  } catch (error) {
    console.error('Error clearing old orders:', error);
    return 0;
  }
}

/**
 * Get statistics summary for a web app
 */
export async function getOrderStatsSummary(webAppId: string) {
  try {
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

    const orders = await prisma.orderEvent.findMany({
      where: {
        webAppId,
        orderedAt: {
          gte: twentyFourHoursAgo,
        },
      },
    });

    const uniqueItems = new Set(orders.map((o) => o.menuItemId || o.menuItemName)).size;

    // Find top item
    const itemCounts: Record<string, number> = {};
    for (const order of orders) {
      const key = order.menuItemId || order.menuItemName;
      itemCounts[key] = (itemCounts[key] || 0) + 1;
    }

    const topItem = Object.entries(itemCounts).sort((a, b) => b[1] - a[1])[0];

    return {
      totalOrders: orders.length,
      totalRevenue: 0, // Not tracked in new schema
      uniqueItems,
      topItem: topItem ? { name: topItem[0], count: topItem[1] } : null,
    };
  } catch (error) {
    console.error('Error getting order stats summary:', error);
    return {
      totalOrders: 0,
      totalRevenue: 0,
      uniqueItems: 0,
      topItem: null,
    };
  }
}

/**
 * Utility functions
 */

/**
 * Sanitize string input
 */
function sanitizeString(str: string | undefined | null, maxLength: number = 255): string {
  if (!str) return '';
  return String(str).slice(0, maxLength).trim();
}

/**
 * Validate and sanitize order source
 */
function sanitizeOrderSource(source: string | undefined): string {
  const validSources = ['stripe', 'pos_api', 'manual'];
  if (!source || !validSources.includes(source.toLowerCase())) {
    return 'manual';
  }
  return source.toLowerCase();
}

export default {
  createOrderEvent,
  getRecentOrders,
  getMenuItemStats,
  clearOldOrders,
  getOrderStatsSummary,
};
