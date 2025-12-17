/**
 * Order Service
 * Business logic for order tracking and social proof statistics
 */

import { supabase } from '../supabase';

export interface OrderEvent {
  id: string;
  webAppId: string;
  menuItemId?: string;
  menuItemName: string;
  orderSource: 'stripe' | 'pos' | 'manual' | 'other';
  amount?: number;
  currency?: string;
  userAvatarUrl?: string;
  userEmail?: string;
  customerId?: string;
  metadata?: Record<string, string>;
  createdAt: string;
}

export interface MenuItemStats {
  itemId?: string;
  itemName?: string;
  lastOrderedAt?: string;
  lastOrderedMinutesAgo?: number;
  recentOrderCount?: number;
  dailyOrderCount?: number;
  userAvatarUrl?: string;
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

    // Sanitize and prepare data
    const orderData = {
      web_app_id: webAppId,
      menu_item_id: additionalData?.menuItemId,
      menu_item_name: sanitizeString(menuItemName, 255),
      order_source: sanitizeOrderSource(orderSource),
      amount: additionalData?.amount || null,
      currency: additionalData?.currency || 'USD',
      user_avatar_url: additionalData?.userAvatarUrl || null,
      user_email: sanitizeEmail(additionalData?.userEmail),
      customer_id: additionalData?.customerId || null,
      metadata: additionalData?.metadata || null,
      created_at: new Date().toISOString()
    };

    // Insert into database
    const { data, error } = await supabase
      .from('order_events')
      .insert([orderData])
      .select()
      .single();

    if (error) {
      console.error('Failed to create order event:', error);
      return null;
    }

    return {
      id: data.id,
      webAppId: data.web_app_id,
      menuItemId: data.menu_item_id,
      menuItemName: data.menu_item_name,
      orderSource: data.order_source,
      amount: data.amount,
      currency: data.currency,
      userAvatarUrl: data.user_avatar_url,
      userEmail: data.user_email,
      customerId: data.customer_id,
      metadata: data.metadata,
      createdAt: data.created_at
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
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();

    const { data, error } = await supabase
      .from('order_events')
      .select('*')
      .eq('web_app_id', webAppId)
      .gte('created_at', oneHourAgo)
      .order('created_at', { ascending: false })
      .limit(maxCount);

    if (error) {
      console.error('Failed to get recent orders:', error);
      return [];
    }

    return (data || []).map(event => ({
      id: event.id,
      webAppId: event.web_app_id,
      menuItemId: event.menu_item_id,
      menuItemName: event.menu_item_name,
      orderSource: event.order_source,
      amount: event.amount,
      currency: event.currency,
      userAvatarUrl: event.user_avatar_url,
      userEmail: event.user_email,
      customerId: event.customer_id,
      metadata: event.metadata,
      createdAt: event.created_at
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
    const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000).toISOString();
    const twentyFourHoursAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString();

    // Get all orders from past 24 hours
    const { data, error } = await supabase
      .from('order_events')
      .select('*')
      .eq('web_app_id', webAppId)
      .gte('created_at', twentyFourHoursAgo)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Failed to get menu item stats:', error);
      return {};
    }

    // Group by menu item and calculate statistics
    const stats: Record<string, MenuItemStats> = {};
    const currentTime = now.getTime();

    for (const event of data || []) {
      const itemKey = event.menu_item_id || event.menu_item_name;
      if (!itemKey) continue;

      if (!stats[itemKey]) {
        stats[itemKey] = {
          itemId: event.menu_item_id,
          itemName: event.menu_item_name,
          lastOrderedAt: event.created_at,
          lastOrderedMinutesAgo: 0,
          recentOrderCount: 0,
          dailyOrderCount: 0,
          userAvatarUrl: event.user_avatar_url
        };
      }

      // Update last ordered time
      if (!stats[itemKey].lastOrderedAt || new Date(event.created_at) > new Date(stats[itemKey].lastOrderedAt!)) {
        stats[itemKey].lastOrderedAt = event.created_at;
        stats[itemKey].userAvatarUrl = event.user_avatar_url || stats[itemKey].userAvatarUrl;
      }

      // Count orders in last hour (recent)
      if (event.created_at >= oneHourAgo) {
        stats[itemKey].recentOrderCount = (stats[itemKey].recentOrderCount || 0) + 1;
      }

      // Count orders in last 24 hours (daily)
      stats[itemKey].dailyOrderCount = (stats[itemKey].dailyOrderCount || 0) + 1;
    }

    // Calculate minutes since last order
    for (const key in stats) {
      if (stats[key].lastOrderedAt) {
        const lastOrderTime = new Date(stats[key].lastOrderedAt!).getTime();
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
    const cutoffDate = new Date(Date.now() - olderThanDays * 24 * 60 * 60 * 1000).toISOString();

    const { data, error } = await supabase
      .from('order_events')
      .delete()
      .eq('web_app_id', webAppId)
      .lt('created_at', cutoffDate);

    if (error) {
      console.error('Failed to clear old orders:', error);
      return 0;
    }

    console.log(`Cleared orders older than ${olderThanDays} days for webapp ${webAppId}`);
    return data?.length || 0;
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
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

    const { data, error } = await supabase
      .from('order_events')
      .select('*')
      .eq('web_app_id', webAppId)
      .gte('created_at', twentyFourHoursAgo);

    if (error) {
      console.error('Failed to get order stats summary:', error);
      return {
        totalOrders: 0,
        totalRevenue: 0,
        uniqueItems: 0,
        topItem: null
      };
    }

    const orders = data || [];
    const totalRevenue = orders.reduce((sum, order) => sum + (order.amount || 0), 0);
    const uniqueItems = new Set(orders.map(o => o.menu_item_id || o.menu_item_name)).size;

    // Find top item
    const itemCounts: Record<string, number> = {};
    for (const order of orders) {
      const key = order.menu_item_id || order.menu_item_name;
      itemCounts[key] = (itemCounts[key] || 0) + 1;
    }

    const topItem = Object.entries(itemCounts).sort((a, b) => b[1] - a[1])[0];

    return {
      totalOrders: orders.length,
      totalRevenue: totalRevenue / 100, // Convert from cents
      uniqueItems,
      topItem: topItem ? { name: topItem[0], count: topItem[1] } : null
    };
  } catch (error) {
    console.error('Error getting order stats summary:', error);
    return {
      totalOrders: 0,
      totalRevenue: 0,
      uniqueItems: 0,
      topItem: null
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
 * Sanitize email input
 */
function sanitizeEmail(email: string | undefined | null): string | null {
  if (!email) return null;
  const sanitized = String(email).toLowerCase().trim();
  // Basic email validation
  if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(sanitized)) {
    return sanitized;
  }
  return null;
}

/**
 * Validate and sanitize order source
 */
function sanitizeOrderSource(source: string | undefined): string {
  const validSources = ['stripe', 'pos', 'manual', 'other'];
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
  getOrderStatsSummary
};
