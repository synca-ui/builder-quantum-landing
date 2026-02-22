/**
 * Dashboard Insights API
 * Provides analytics data for the Bento grid dashboard
 */

import { Router, Request, Response } from "express";
import { requireAuth } from "../middleware/auth";
import prisma from "../db/prisma";
import { z } from "zod";

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
const periodSchema = z.enum(["daily", "weekly", "monthly", "yearly"]);
// Note: dateRangeSchema can be used for future filtering endpoints

/**
 * GET /api/dashboard/insights/overview
 * Returns current metrics for dashboard cards
 */
router.get("/overview", requireAuth, async (req: Request, res: Response) => {
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

    // Get today's date range
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    // Get analytics snapshots for today and yesterday
    const todayAnalytics = await prisma.analyticsSnapshot.findFirst({
      where: {
        businessId,
        date: {
          gte: today,
          lt: tomorrow,
        },
        period: "daily",
      },
    });

    const yesterdayAnalytics = await prisma.analyticsSnapshot.findFirst({
      where: {
        businessId,
        date: {
          gte: yesterday,
          lt: today,
        },
        period: "daily",
      },
    });

    // Use analytics data or fallback to default values
    const currentMetrics = {
      revenue: todayAnalytics?.revenue || 0,
      orders: todayAnalytics?.orders || 0,
      uniqueVisitors: todayAnalytics?.uniqueVisitors || 0,
      qrScans: todayAnalytics?.qrScans || 0,
    };

    const previousMetrics = {
      revenue: yesterdayAnalytics?.revenue || 0,
      orders: yesterdayAnalytics?.orders || 0,
      uniqueVisitors: yesterdayAnalytics?.uniqueVisitors || 0,
      qrScans: yesterdayAnalytics?.qrScans || 0,
    };

    // Calculate changes
    const calculateChange = (current: number, previous: number): number => {
      if (previous === 0) return current > 0 ? 100 : 0;
      return ((current - previous) / previous) * 100;
    };

    // Get today's reservations
    const todayReservations = await prisma.reservation.count({
      where: {
        businessId,
        reservationTime: {
          gte: today,
          lt: tomorrow,
        },
        status: {
          in: ["CONFIRMED", "ARRIVED"],
        },
      },
    });

    const totalReservations = await prisma.reservation.count({
      where: {
        businessId,
        reservationTime: {
          gte: today,
          lt: tomorrow,
        },
      },
    });

    // Get active tables count
    const activeTables = await prisma.table.count({
      where: {
        businessId,
        status: "OCCUPIED",
      },
    });

    res.json({
      success: true,
      data: {
        revenue: {
          current: Number(currentMetrics.revenue),
          previous: Number(previousMetrics.revenue),
          change: calculateChange(
            Number(currentMetrics.revenue),
            Number(previousMetrics.revenue),
          ),
        },
        orders: {
          current: currentMetrics.orders,
          previous: previousMetrics.orders,
          change: calculateChange(
            currentMetrics.orders,
            previousMetrics.orders,
          ),
        },
        visitors: {
          current: currentMetrics.uniqueVisitors,
          previous: previousMetrics.uniqueVisitors,
          change: calculateChange(
            currentMetrics.uniqueVisitors,
            previousMetrics.uniqueVisitors,
          ),
        },
        qrScans: {
          current: currentMetrics.qrScans,
          previous: previousMetrics.qrScans,
          change: calculateChange(
            currentMetrics.qrScans,
            previousMetrics.qrScans,
          ),
        },
        reservations: {
          current: todayReservations,
          total: totalReservations,
        },
        activeTables,
      },
    });
  } catch (error) {
    console.error("Error fetching overview:", error);
    res.status(500).json({ error: "Failed to fetch overview" });
  }
});

/**
 * GET /api/dashboard/insights/revenue-chart
 * Returns revenue data for chart visualization
 */
router.get(
  "/revenue-chart",
  requireAuth,
  async (req: Request, res: Response) => {
    try {
      const userId = req.userId;
      const businessId = req.query.businessId as string;
      const days = parseInt(req.query.days as string) || 30;

      if (!businessId) {
        return res.status(400).json({ error: "businessId is required" });
      }

      // Verify access
      const business = await prisma.business.findFirst({
        where: {
          id: businessId,
          members: { some: { userId } },
        },
      });

      if (!business) {
        return res.status(403).json({ error: "Access denied" });
      }

      // Get analytics data for the specified period
      const endDate = new Date();
      endDate.setHours(0, 0, 0, 0);
      const startDate = new Date(endDate);
      startDate.setDate(startDate.getDate() - days);

      const analytics = await prisma.analyticsSnapshot.findMany({
        where: {
          businessId,
          date: {
            gte: startDate,
            lte: endDate,
          },
          period: "daily",
        },
        orderBy: {
          date: "asc",
        },
      });

      // Create a complete date range and fill missing days with zero data
      const chartData = [];
      for (let i = days; i >= 0; i--) {
        const date = new Date();
        date.setDate(date.getDate() - i);
        date.setHours(0, 0, 0, 0);

        const dateStr = date.toISOString().split("T")[0];

        // Find analytics for this date
        const dayAnalytics = analytics.find(
          (a) => a.date.toISOString().split("T")[0] === dateStr,
        );

        chartData.push({
          date: dateStr,
          revenue: dayAnalytics ? Number(dayAnalytics.revenue) : 0,
          orders: dayAnalytics ? dayAnalytics.orders : 0,
          avgOrderValue: dayAnalytics ? Number(dayAnalytics.avgOrderValue) : 0,
        });
      }

      res.json({
        success: true,
        data: chartData,
      });
    } catch (error) {
      console.error("Error fetching revenue chart:", error);
      res.status(500).json({ error: "Failed to fetch revenue chart" });
    }
  },
);

/**
 * GET /api/dashboard/insights/traffic-sources
 * Returns traffic source breakdown
 */
router.get(
  "/traffic-sources",
  requireAuth,
  async (req: Request, res: Response) => {
    try {
      const userId = req.userId;
      const businessId = req.query.businessId as string;

      if (!businessId) {
        return res.status(400).json({ error: "businessId is required" });
      }

      // Verify access
      const business = await prisma.business.findFirst({
        where: {
          id: businessId,
          members: { some: { userId } },
        },
      });

      if (!business) {
        return res.status(403).json({ error: "Access denied" });
      }

      // Get traffic sources from analytics snapshots for the last 30 days
      const endDate = new Date();
      endDate.setHours(23, 59, 59, 999);
      const startDate = new Date(endDate);
      startDate.setDate(startDate.getDate() - 30);
      startDate.setHours(0, 0, 0, 0);

      const analytics = await prisma.analyticsSnapshot.findMany({
        where: {
          businessId,
          date: {
            gte: startDate,
            lte: endDate,
          },
          period: "daily",
        },
      });

      // Aggregate traffic sources
      const sourceTotals = analytics.reduce(
        (totals, snapshot) => ({
          direct: totals.direct + snapshot.trafficDirect,
          google: totals.google + snapshot.trafficGoogle,
          facebook: totals.facebook + snapshot.trafficFacebook,
          instagram: totals.instagram + snapshot.trafficInstagram,
          "qr-code": totals["qr-code"] + snapshot.trafficQR,
          other: totals.other + snapshot.trafficOther,
        }),
        {
          direct: 0,
          google: 0,
          facebook: 0,
          instagram: 0,
          "qr-code": 0,
          other: 0,
        },
      );

      // Convert to array and calculate percentages
      const total = Object.values(sourceTotals).reduce(
        (sum, val) => sum + val,
        0,
      );
      const sourceData = Object.entries(sourceTotals).map(
        ([source, count]) => ({
          source,
          count,
          percentage: total > 0 ? (count / total) * 100 : 0,
        }),
      );

      res.json({
        success: true,
        data: sourceData,
      });
    } catch (error) {
      console.error("Error fetching traffic sources:", error);
      res.status(500).json({ error: "Failed to fetch traffic sources" });
    }
  },
);

/**
 * GET /api/dashboard/insights/popular-items
 * Returns most popular menu items
 */
router.get(
  "/popular-items",
  requireAuth,
  async (req: Request, res: Response) => {
    try {
      const userId = req.userId;
      const businessId = req.query.businessId as string;
      const limit = parseInt(req.query.limit as string) || 5;

      if (!businessId) {
        return res.status(400).json({ error: "businessId is required" });
      }

      // Verify access
      const business = await prisma.business.findFirst({
        where: {
          id: businessId,
          members: { some: { userId } },
        },
      });

      if (!business) {
        return res.status(403).json({ error: "Access denied" });
      }

      // Get popular items from analytics snapshots for the last 30 days
      const endDate = new Date();
      endDate.setHours(23, 59, 59, 999);
      const startDate = new Date(endDate);
      startDate.setDate(startDate.getDate() - 30);
      startDate.setHours(0, 0, 0, 0);

      const analytics = await prisma.analyticsSnapshot.findMany({
        where: {
          businessId,
          date: {
            gte: startDate,
            lte: endDate,
          },
          period: "daily",
        },
        select: {
          popularItems: true,
        },
      });

      // Aggregate popular items across all snapshots
      const itemCounts: Record<string, number> = {};

      analytics.forEach((snapshot) => {
        const items = Array.isArray(snapshot.popularItems)
          ? snapshot.popularItems
          : [];
        items.forEach((item: any) => {
          if (item.name && typeof item.count === "number") {
            itemCounts[item.name] = (itemCounts[item.name] || 0) + item.count;
          }
        });
      });

      // Convert to array and sort by count
      const popularItems = Object.entries(itemCounts)
        .map(([name, count]) => ({ name, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, limit);

      // If no data available, return sample data for better UX
      if (popularItems.length === 0) {
        const sampleItems = [
          "Margherita Pizza",
          "Caesar Salad",
          "Grilled Chicken",
          "Fish & Chips",
          "Beef Burger",
        ].slice(0, limit);

        return res.json({
          success: true,
          data: sampleItems.map((name) => ({ name, count: 0 })),
          note: "No data available yet. Start collecting analytics to see real popular items.",
        });
      }

      res.json({
        success: true,
        data: popularItems,
      });
    } catch (error) {
      console.error("Error fetching popular items:", error);
      res.status(500).json({ error: "Failed to fetch popular items" });
    }
  },
);

export default router;
