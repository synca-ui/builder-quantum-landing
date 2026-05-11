import { Router, Request, Response } from "express";
import { requireAuth } from "../middleware/auth";
import prisma from "../db/prisma";
import { z } from "zod";
import { sendReservationConfirmation } from "../utils/email";

const router = Router();

// Validation schema
const reservationSchema = z.object({
  configId: z.string().uuid(),
  guestName: z.string().min(1),
  guestEmail: z.string().email().optional().or(z.literal("")),
  guestPhone: z.string().optional().or(z.literal("")),
  guestCount: z.number().min(1).default(2),
  reservationTime: z.string().datetime(),
  specialRequests: z.string().optional(),
});

/**
 * Ensure a Business exists for the given configuration
 */
async function ensureBusinessForConfig(configId: string, userId: string) {
  const config = await prisma.configuration.findFirst({
    where: { id: configId, userId }
  });
  if (!config) throw new Error("Configuration not found or unauthorized");

  if (config.businessId) {
    return config.businessId;
  }

  // Create a new business
  const business = await prisma.business.create({
    data: {
      slug: `biz-${configId.substring(0, 8)}`,
      name: config.businessName || "My Restaurant",
      status: "PUBLISHED",
      members: {
        create: {
          userId,
          role: "OWNER"
        }
      }
    }
  });

  // Link to config
  await prisma.configuration.update({
    where: { id: configId },
    data: { businessId: business.id }
  });

  return business.id;
}

/**
 * GET /api/dashboard/reservations
 * Get all reservations for a config
 */
router.get("/", requireAuth, async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;
    const configId = req.query.configId as string;

    if (!configId) {
      return res.status(400).json({ error: "configId is required" });
    }

    const businessId = await ensureBusinessForConfig(configId, userId);

    const reservations = await prisma.reservation.findMany({
      where: { businessId },
      orderBy: { reservationTime: "asc" }
    });

    res.json({ success: true, data: reservations });
  } catch (error) {
    console.error("Error fetching reservations:", error);
    res.status(500).json({ error: "Failed to fetch reservations" });
  }
});

/**
 * POST /api/dashboard/reservations
 * Create a new reservation manually
 */
router.post("/", requireAuth, async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;
    const validatedData = reservationSchema.parse(req.body);
    const { configId, ...rest } = validatedData;

    const businessId = await ensureBusinessForConfig(configId, userId);

    const reservation = await prisma.reservation.create({
      data: {
        businessId,
        guestName: rest.guestName,
        guestEmail: rest.guestEmail || null,
        guestPhone: rest.guestPhone || null,
        guestCount: rest.guestCount,
        reservationTime: new Date(rest.reservationTime),
        specialRequests: rest.specialRequests || null,
        source: "dashboard"
      }
    });

    res.json({ success: true, data: reservation });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.errors });
    }
    console.error("Error creating reservation:", error);
    res.status(500).json({ error: "Failed to create reservation" });
  }
});

/**
 * PUT /api/dashboard/reservations/:id/status
 * Update reservation status
 */
router.put("/:id/status", requireAuth, async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;
    const { id } = req.params;
    const { status } = req.body;

    const reservation = await prisma.reservation.findUnique({
      where: { id: id as string },
      include: { business: { include: { members: true } } }
    }) as any;

    if (!reservation) {
      return res.status(404).json({ error: "Reservation not found" });
    }

    // Verify ownership
    const isMember = reservation.business?.members?.some(m => m.userId === userId);
    if (!isMember) {
      return res.status(403).json({ error: "Unauthorized" });
    }

    const updated = await prisma.reservation.update({
      where: { id: id as string },
      data: { status }
    });

    // Send confirmation email if status changed to CONFIRMED
    if (status === "CONFIRMED" && reservation.status !== "CONFIRMED" && reservation.guestEmail) {
      await sendReservationConfirmation(
        reservation.guestEmail,
        reservation.guestName,
        reservation.id,
        reservation.reservationTime,
        reservation.guestCount,
        reservation.business.name
      );
    }

    res.json({ success: true, data: updated });
  } catch (error) {
    console.error("Error updating reservation status:", error);
    res.status(500).json({ error: "Failed to update reservation" });
  }
});

export default router;
