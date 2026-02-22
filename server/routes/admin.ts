/**
 * Admin Dashboard API - Reservations, SEO, and System Management
 * Handles administrative functions for restaurant owners
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
const reservationUpdateSchema = z.object({
  status: z.enum([
    "PENDING",
    "CONFIRMED",
    "ARRIVED",
    "COMPLETED",
    "CANCELLED",
    "NO_SHOW",
  ]),
  notes: z.string().optional(),
});

/**
 * GET /api/dashboard/admin/reservations
 * Get reservations with filtering and pagination
 */
router.get(
  "/reservations",
  requireAuth,
  async (req: Request, res: Response) => {
    try {
      const userId = req.userId;
      const businessId = req.query.businessId as string;
      const status = req.query.status as string;
      const date = req.query.date as string;
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 20;

      if (!businessId) {
        return res.status(400).json({ error: "businessId is required" });
      }

      // Verify business ownership
      const business = await prisma.business.findFirst({
        where: {
          id: businessId,
          members: { some: { userId } },
        },
      });

      if (!business) {
        return res.status(403).json({ error: "Access denied" });
      }

      // Build filter conditions
      const where: any = { businessId };

      if (status && status !== "ALL") {
        where.status = status;
      }

      if (date) {
        const filterDate = new Date(date);
        const nextDay = new Date(filterDate);
        nextDay.setDate(nextDay.getDate() + 1);

        where.reservationTime = {
          gte: filterDate,
          lt: nextDay,
        };
      }

      // Get reservations with pagination
      const [reservations, total] = await Promise.all([
        (prisma as any).reservation.findMany({
          where,
          include: {
            table: {
              select: {
                id: true,
                number: true,
                name: true,
              },
            },
          },
          orderBy: { reservationTime: "desc" },
          skip: (page - 1) * limit,
          take: limit,
        }),
        (prisma as any).reservation.count({ where }),
      ]);

      // Get status statistics
      const statusStats = await (prisma as any).reservation.groupBy({
        by: ["status"],
        where: { businessId },
        _count: { status: true },
      });

      const statusCounts = statusStats.reduce((acc: any, stat: any) => {
        acc[stat.status] = stat._count.status;
        return acc;
      }, {});

      res.json({
        success: true,
        data: {
          reservations,
          pagination: {
            page,
            limit,
            total,
            totalPages: Math.ceil(total / limit),
          },
          statistics: {
            total,
            statusCounts,
          },
        },
      });
    } catch (error) {
      console.error("Error fetching reservations:", error);
      res.status(500).json({ error: "Failed to fetch reservations" });
    }
  },
);

/**
 * PUT /api/dashboard/admin/reservations/:id
 * Update reservation status
 */
router.put(
  "/reservations/:id",
  requireAuth,
  async (req: Request, res: Response) => {
    try {
      const userId = req.userId;
      const reservationId = req.params.id;
      const businessId = req.body.businessId;

      if (!businessId) {
        return res.status(400).json({ error: "businessId is required" });
      }

      // Verify business ownership
      const business = await prisma.business.findFirst({
        where: {
          id: businessId,
          members: { some: { userId } },
        },
      });

      if (!business) {
        return res.status(403).json({ error: "Access denied" });
      }

      // Validate input
      const validatedData = reservationUpdateSchema.parse(req.body);

      // Update reservation
      const reservation = await (prisma as any).reservation.update({
        where: {
          id: reservationId,
          businessId, // Ensure reservation belongs to business
        },
        data: {
          status: validatedData.status,
          updatedAt: new Date(),
        },
        include: {
          table: {
            select: {
              id: true,
              number: true,
              name: true,
            },
          },
        },
      });

      res.json({ success: true, data: reservation });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.errors });
      }
      console.error("Error updating reservation:", error);
      res.status(500).json({ error: "Failed to update reservation" });
    }
  },
);

/**
 * GET /api/dashboard/admin/seo
 * Get SEO status and recommendations
 */
router.get("/seo", requireAuth, async (req: Request, res: Response) => {
  try {
    const userId = req.userId;
    const businessId = req.query.businessId as string;

    if (!businessId) {
      return res.status(400).json({ error: "businessId is required" });
    }

    // Verify business ownership
    const business = await prisma.business.findFirst({
      where: {
        id: businessId,
        members: { some: { userId } },
      },
      include: {
        configurations: {
          take: 1,
          orderBy: { updatedAt: "desc" },
        },
      },
    });

    if (!business) {
      return res.status(403).json({ error: "Access denied" });
    }

    const config = business.configurations?.[0] || null;

    // Analyze SEO status
    const seoAnalysis = {
      score: 0,
      issues: [] as string[],
      recommendations: [] as string[],
      checklist: {
        hasBusinessName: {
          status: !!business.name,
          title: "Business Name Set",
          description: "Essential for search visibility",
        },
        hasDescription: {
          status: !!business.description,
          title: "Business Description",
          description: "Helps customers understand your restaurant",
        },
        hasLogo: {
          status: !!business.logoUrl,
          title: "Logo Uploaded",
          description: "Improves brand recognition",
        },
        hasCuisineType: {
          status: !!business.cuisine,
          title: "Cuisine Type Specified",
          description: "Helps customers find the right food",
        },
        hasOpeningHours: {
          status: !!business.openingHours,
          title: "Opening Hours Set",
          description: "Critical for local search results",
        },
        hasContactInfo: {
          status: !!business.contactInfo,
          title: "Contact Information",
          description: "Makes it easy for customers to reach you",
        },
        hasSocialLinks: {
          status: !!business.socialLinks,
          title: "Social Media Links",
          description: "Increases online presence",
        },
        hasMenu: {
          status:
            config?.menuItems &&
            Array.isArray(config.menuItems) &&
            config.menuItems.length > 0,
          title: "Menu Items Added",
          description: "Shows customers what you offer",
        },
      },
    };

    // Calculate score
    const checklistItems = Object.values(seoAnalysis.checklist);
    const completedItems = checklistItems.filter((item) => item.status).length;
    seoAnalysis.score = Math.round(
      (completedItems / checklistItems.length) * 100,
    );

    // Generate recommendations
    checklistItems.forEach((item) => {
      if (!item.status) {
        seoAnalysis.recommendations.push(
          `Complete: ${item.title} - ${item.description}`,
        );
      }
    });

    // Add specific SEO issues
    if (seoAnalysis.score < 50) {
      seoAnalysis.issues.push(
        "Low SEO completeness may hurt search visibility",
      );
    }
    if (!business.cuisine) {
      seoAnalysis.issues.push(
        "Missing cuisine type affects local search results",
      );
    }
    if (!config?.publishedUrl) {
      seoAnalysis.issues.push(
        "Website not published - no search engine visibility",
      );
    }

    res.json({
      success: true,
      data: seoAnalysis,
    });
  } catch (error) {
    console.error("Error fetching SEO analysis:", error);
    res.status(500).json({ error: "Failed to fetch SEO analysis" });
  }
});

/**
 * GET /api/dashboard/admin/analytics-summary
 * Get high-level analytics summary for admin view
 */
router.get(
  "/analytics-summary",
  requireAuth,
  async (req: Request, res: Response) => {
    try {
      const userId = req.userId;
      const businessId = req.query.businessId as string;

      if (!businessId) {
        return res.status(400).json({ error: "businessId is required" });
      }

      // Verify business ownership
      const business = await prisma.business.findFirst({
        where: {
          id: businessId,
          members: { some: { userId } },
        },
      });

      if (!business) {
        return res.status(403).json({ error: "Access denied" });
      }

      // Get latest analytics
      const latestAnalytics = await (prisma as any).analyticsSnapshot.findFirst(
        {
          where: { businessId },
          orderBy: { date: "desc" },
        },
      );

      // Get counts for various entities
      const [reservationCount, staffCount, tableCount, orderCount] =
        await Promise.all([
          (prisma as any).reservation?.count({ where: { businessId } }) || 0,
          (prisma as any).staff?.count({
            where: { businessId, isActive: true },
          }) || 0,
          (prisma as any).table?.count({ where: { businessId } }) || 0,
          (prisma as any).order?.count({ where: { businessId } }) || 0,
        ]);

      // Get recent activity
      const recentReservations = await (prisma as any).reservation.findMany({
        where: { businessId },
        orderBy: { createdAt: "desc" },
        take: 5,
        select: {
          id: true,
          guestName: true,
          guestCount: true,
          reservationTime: true,
          status: true,
          createdAt: true,
        },
      });

      res.json({
        success: true,
        data: {
          analytics: latestAnalytics,
          counts: {
            reservations: reservationCount,
            staff: staffCount,
            tables: tableCount,
            orders: orderCount,
          },
          recentActivity: {
            reservations: recentReservations,
          },
          businessStatus: {
            name: business.name,
            status: business.status,
            maitrScore: business.maitrScore,
            lastUpdated: business.updatedAt,
          },
        },
      });
    } catch (error) {
      console.error("Error fetching analytics summary:", error);
      res.status(500).json({ error: "Failed to fetch analytics summary" });
    }
  },
);

/**
 * GET /api/dashboard/admin/system-health
 * Get system health status for admin dashboard
 */
router.get(
  "/system-health",
  requireAuth,
  async (req: Request, res: Response) => {
    try {
      const userId = req.userId;
      const businessId = req.query.businessId as string;

      if (!businessId) {
        return res.status(400).json({ error: "businessId is required" });
      }

      // Verify business ownership
      const business = await prisma.business.findFirst({
        where: {
          id: businessId,
          members: { some: { userId } },
        },
      });

      if (!business) {
        return res.status(403).json({ error: "Access denied" });
      }

      // Check various system components
      const healthChecks = {
        database: { status: "healthy", message: "Database connection active" },
        analytics: { status: "unknown", message: "Checking analytics data..." },
        qrCodes: {
          status: "unknown",
          message: "Checking QR code generation...",
        },
        reservations: {
          status: "unknown",
          message: "Checking reservation system...",
        },
      };

      // Check analytics data freshness
      try {
        const latestAnalytics = await (
          prisma as any
        ).analyticsSnapshot.findFirst({
          where: { businessId },
          orderBy: { date: "desc" },
        });

        if (latestAnalytics) {
          const daysSinceUpdate = Math.floor(
            (Date.now() - latestAnalytics.date.getTime()) /
              (1000 * 60 * 60 * 24),
          );
          if (daysSinceUpdate <= 1) {
            healthChecks.analytics = {
              status: "healthy",
              message: "Analytics data up to date",
            };
          } else {
            healthChecks.analytics = {
              status: "warning",
              message: `Analytics data ${daysSinceUpdate} days old`,
            };
          }
        } else {
          healthChecks.analytics = {
            status: "error",
            message: "No analytics data found",
          };
        }
      } catch (error) {
        healthChecks.analytics = {
          status: "error",
          message: "Analytics system unavailable",
        };
      }

      // Check QR codes
      try {
        const tablesWithQR = await (prisma as any).table.count({
          where: { businessId, qrEnabled: true, qrCode: { not: null } },
        });

        if (tablesWithQR > 0) {
          healthChecks.qrCodes = {
            status: "healthy",
            message: `${tablesWithQR} QR codes active`,
          };
        } else {
          healthChecks.qrCodes = {
            status: "warning",
            message: "No QR codes configured",
          };
        }
      } catch (error) {
        healthChecks.qrCodes = {
          status: "error",
          message: "QR code system unavailable",
        };
      }

      // Check reservation system
      try {
        const recentReservations = await (prisma as any).reservation.count({
          where: {
            businessId,
            createdAt: {
              gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // Last 7 days
            },
          },
        });

        healthChecks.reservations = {
          status: "healthy",
          message: `${recentReservations} reservations in last 7 days`,
        };
      } catch (error) {
        healthChecks.reservations = {
          status: "error",
          message: "Reservation system unavailable",
        };
      }

      // Calculate overall health
      const statuses = Object.values(healthChecks).map((check) => check.status);
      const overallStatus = statuses.includes("error")
        ? "error"
        : statuses.includes("warning")
          ? "warning"
          : "healthy";

      res.json({
        success: true,
        data: {
          overallStatus,
          checks: healthChecks,
          timestamp: new Date().toISOString(),
        },
      });
    } catch (error) {
      console.error("Error checking system health:", error);
      res.status(500).json({ error: "Failed to check system health" });
    }
  },
);

export default router;
