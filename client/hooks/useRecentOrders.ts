import { useEffect, useState, useCallback, useRef } from "react";

/**
 * Per-item order statistics
 */
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
 * Menu statistics by item ID
 */
export type MenuStats = Record<string, MenuItemStats>;

/**
 * Hook return type
 */
export interface UseRecentOrdersResult {
  stats: MenuStats;
  isLoading: boolean;
  error: Error | null;
  lastUpdated: number | null;
  refetch: () => Promise<void>;
}

/**
 * Poll for recent orders and menu statistics
 *
 * This hook fetches and updates order statistics for menu items,
 * showing social proof like "Ordered X mins ago" on popular items.
 *
 * Features:
 * - Auto-polling every 30 seconds (configurable)
 * - Error handling and retry logic
 * - Memoized stats to prevent unnecessary re-renders
 * - Manual refetch option
 *
 * @param webAppId - The web app ID to fetch stats for
 * @param pollInterval - Polling interval in milliseconds (default: 30000)
 * @param enabled - Whether polling is enabled (default: true)
 * @returns Object with stats, loading, error, and refetch
 *
 * @example
 * const { stats, isLoading } = useRecentOrders(webAppId);
 *
 * // In menu item component:
 * {stats[itemId]?.lastOrderedMinutesAgo && (
 *   <span className="text-green-600 text-sm">
 *     Ordered {stats[itemId].lastOrderedMinutesAgo} mins ago
 *   </span>
 * )}
 */
export function useRecentOrders(
  webAppId: string | null | undefined,
  pollInterval: number = 30000,
  enabled: boolean = true,
): UseRecentOrdersResult {
  const [stats, setStats] = useState<MenuStats>({});
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [lastUpdated, setLastUpdated] = useState<number | null>(null);

  // Keep track of poll timer to clean up properly
  const pollTimerRef = useRef<NodeJS.Timeout | null>(null);
  const isMountedRef = useRef(true);

  /**
   * Fetch menu statistics from the server
   */
  const fetchStats = useCallback(async () => {
    if (!webAppId || !enabled) return;

    setIsLoading(true);
    try {
      const response = await fetch(`/api/orders/${webAppId}/menu-stats`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch order stats: ${response.statusText}`);
      }

      const data: MenuStats = await response.json();

      // Only update if component is still mounted
      if (isMountedRef.current) {
        setStats(data);
        setError(null);
        setLastUpdated(Date.now());
      }
    } catch (err) {
      // Only update if component is still mounted
      if (isMountedRef.current) {
        setError(err instanceof Error ? err : new Error(String(err)));
        // Keep previous stats on error
      }
    } finally {
      if (isMountedRef.current) {
        setIsLoading(false);
      }
    }
  }, [webAppId, enabled]);

  /**
   * Manual refetch function
   */
  const refetch = useCallback(async () => {
    await fetchStats();
  }, [fetchStats]);

  /**
   * Setup polling effect
   */
  useEffect(() => {
    // Set up mounted flag
    isMountedRef.current = true;

    // Initial fetch on mount
    if (enabled && webAppId) {
      fetchStats();
    }

    // Set up polling interval
    if (enabled && webAppId && pollInterval > 0) {
      pollTimerRef.current = setInterval(() => {
        fetchStats();
      }, pollInterval);
    }

    // Cleanup on unmount or dependency change
    return () => {
      isMountedRef.current = false;

      // Clear polling timer
      if (pollTimerRef.current) {
        clearInterval(pollTimerRef.current);
        pollTimerRef.current = null;
      }
    };
  }, [webAppId, enabled, pollInterval, fetchStats]);

  return {
    stats,
    isLoading,
    error,
    lastUpdated,
    refetch,
  };
}

/**
 * Hook to get social proof text for a menu item
 *
 * @example
 * const socialProofText = useSocialProofText(stats[itemId]);
 * // Returns: "Ordered 5 mins ago" or null
 */
export function useSocialProofText(
  itemStats: MenuItemStats | undefined,
): string | null {
  if (!itemStats?.lastOrderedMinutesAgo) return null;

  const minutes = itemStats.lastOrderedMinutesAgo;

  if (minutes < 1) return "Just ordered";
  if (minutes < 60) return `Ordered ${minutes}m ago`;

  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `Ordered ${hours}h ago`;

  const days = Math.floor(hours / 24);
  return `Ordered ${days}d ago`;
}

/**
 * Hook to get formatted order count text
 *
 * @example
 * const countText = useOrderCountText(stats[itemId]);
 * // Returns: "15 orders today" or null
 */
export function useOrderCountText(
  itemStats: MenuItemStats | undefined,
): string | null {
  if (!itemStats?.dailyOrderCount) return null;

  const count = itemStats.dailyOrderCount;

  if (count === 1) return "1 order today";
  return `${count} orders today`;
}

export default useRecentOrders;
