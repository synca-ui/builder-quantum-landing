import { Router, Request, Response } from "express";
import prisma from "../db/prisma";
import { z } from "zod";
import {
  sendReservationPending,
  sendOwnerNotification,
} from "../utils/email";

const router = Router();

// ─── Validation Schemas ───────────────────────────────────────────────────────

const modifySchema = z.object({
  guestName: z.string().min(1).optional(),
  guestCount: z.number().min(1).optional(),
  reservationTime: z.string().datetime().optional(),
  specialRequests: z.string().optional(),
  status: z.enum(["PENDING", "CANCELLED"]).optional(),
});

const createSchema = z.object({
  configId: z.string().uuid(),
  guestName: z.string().min(1),
  guestEmail: z.string().email().optional().or(z.literal("")),
  guestPhone: z.string().optional().or(z.literal("")),
  guestCount: z.number().min(1).default(2),
  reservationTime: z.string().datetime(),
  specialRequests: z.string().optional(),
});

// ─── GET /api/public/reservations/slots ──────────────────────────────────────
/**
 * Returns available time slots for a given configId and date.
 * Slot intervals and days ahead are stored on the configuration.
 */
router.get("/slots", async (req: Request, res: Response) => {
  try {
    const { configId, date } = req.query;

    if (!configId || !date) {
      return res.status(400).json({ error: "configId und date sind erforderlich" });
    }

    const config = await prisma.configuration.findUnique({
      where: { id: configId as string },
    });

    if (!config) {
      return res.status(404).json({ error: "Konfiguration nicht gefunden" });
    }

    if (!config.reservationsEnabled) {
      return res.json({ success: true, slots: [] });
    }

    // Parse configured values
    const intervalMinutes: number = (config as any).reservationTimeSlotInterval ?? 30;
    const dayStr = date as string; // format: "YYYY-MM-DD"

    // Build slots list based on configured timeslots in config
    const rawSlots: string[] = Array.isArray((config as any).timeSlots)
      ? (config as any).timeSlots
      : ["12:00", "13:00", "18:00", "19:00", "20:00"];

    // Build all slot datetimes for the given day
    const slots = rawSlots.map((timeStr: string) => {
      const [h, m] = timeStr.split(":").map(Number);
      const dt = new Date(`${dayStr}T${String(h).padStart(2, "0")}:${String(m ?? 0).padStart(2, "0")}:00.000Z`);
      return { time: timeStr, datetime: dt.toISOString() };
    });

    // Find already-booked slots for this business on this day
    let bookedSlots: string[] = [];
    if (config.businessId) {
      const dayStart = new Date(`${dayStr}T00:00:00.000Z`);
      const dayEnd = new Date(`${dayStr}T23:59:59.999Z`);
      const existing = await prisma.reservation.findMany({
        where: {
          businessId: config.businessId,
          reservationTime: { gte: dayStart, lte: dayEnd },
          status: { notIn: ["CANCELLED"] },
        },
        select: { reservationTime: true },
      });
      bookedSlots = existing.map((r) =>
        r.reservationTime.toISOString().slice(11, 16)
      );
    }

    // Mark slots as available/unavailable
    const result = slots.map((s) => ({
      ...s,
      available: !bookedSlots.includes(s.time),
    }));

    res.json({ success: true, slots: result });
  } catch (error) {
    console.error("Error fetching slots:", error);
    res.status(500).json({ error: "Fehler beim Laden der Zeitslots" });
  }
});

// ─── GET /api/public/reservations/:id ────────────────────────────────────────
router.get("/:id", async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const reservation = await prisma.reservation.findUnique({
      where: { id: id as string },
      include: {
        business: {
          select: { name: true, logoUrl: true },
        },
      },
    });

    if (!reservation) {
      return res.status(404).json({ error: "Reservierung nicht gefunden" });
    }

    res.json({ success: true, data: reservation });
  } catch (error) {
    console.error("Error fetching public reservation:", error);
    res.status(500).json({ error: "Fehler beim Laden der Reservierung" });
  }
});

// ─── POST /api/public/reservations ───────────────────────────────────────────
router.post("/", async (req: Request, res: Response) => {
  try {
    const validatedData = createSchema.parse(req.body);
    const { configId, ...rest } = validatedData;

    const config = await prisma.configuration.findUnique({
      where: { id: configId },
      include: { business: true },
    });

    if (!config || !config.businessId || !config.business) {
      return res.status(404).json({ error: "Restaurant nicht gefunden" });
    }

    const reservation = await prisma.reservation.create({
      data: {
        businessId: config.businessId,
        guestName: rest.guestName,
        guestEmail: rest.guestEmail || null,
        guestPhone: rest.guestPhone || null,
        guestCount: rest.guestCount,
        reservationTime: new Date(rest.reservationTime),
        specialRequests: rest.specialRequests || null,
        source: "website",
      },
    });

    // Send "Anfrage erhalten" email to guest
    if (reservation.guestEmail) {
      await sendReservationPending(
        reservation.guestEmail,
        reservation.guestName,
        reservation.id,
        reservation.reservationTime,
        reservation.guestCount,
        config.business.name
      );
    }

    // Send owner notification
    const ownerEmail =
      (config as any).reservationNotificationEmail ||
      (config as any).reservationEmail ||
      null;
    if (ownerEmail) {
      await sendOwnerNotification(
        ownerEmail,
        reservation.guestName,
        reservation.guestEmail ?? null,
        reservation.guestPhone ?? null,
        reservation.id,
        reservation.reservationTime,
        reservation.guestCount,
        config.business.name,
        reservation.specialRequests ?? null
      );
    }

    res.json({ success: true, data: reservation });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.errors });
    }
    console.error("Error creating public reservation:", error);
    res.status(500).json({ error: "Fehler beim Erstellen der Reservierung" });
  }
});

// ─── PUT /api/public/reservations/:id ────────────────────────────────────────
router.put("/:id", async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const validatedData = modifySchema.parse(req.body);

    const existing = await prisma.reservation.findUnique({
      where: { id: id as string },
    });

    if (!existing) {
      return res.status(404).json({ error: "Reservierung nicht gefunden" });
    }

    if (["CANCELLED", "COMPLETED", "NO_SHOW"].includes(existing.status)) {
      return res
        .status(400)
        .json({ error: "Diese Reservierung kann nicht mehr geändert werden." });
    }

    const updateData: any = {};
    if (validatedData.guestName) updateData.guestName = validatedData.guestName;
    if (validatedData.guestCount) updateData.guestCount = validatedData.guestCount;
    if (validatedData.reservationTime)
      updateData.reservationTime = new Date(validatedData.reservationTime);
    if (validatedData.specialRequests !== undefined)
      updateData.specialRequests = validatedData.specialRequests;
    if (validatedData.status === "CANCELLED") updateData.status = "CANCELLED";

    const updated = await prisma.reservation.update({
      where: { id: id as string },
      data: updateData,
      include: { business: { select: { name: true } } },
    });

    res.json({ success: true, data: updated });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.errors });
    }
    console.error("Error modifying public reservation:", error);
    res.status(500).json({ error: "Fehler beim Ändern der Reservierung" });
  }
});

export default router;
