/**
 * Staff Management API - Live Dashboard
 * Handles staff, shifts, and absence management with conflict resolution
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
const staffSchema = z.object({
  email: z.string().email(),
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  phone: z.string().optional(),
  position: z.string().default("Staff"),
  hourlyRate: z.number().positive().optional(),
  permissions: z.array(z.string()).default([]),
});

const shiftSchema = z.object({
  staffId: z.string().uuid(),
  date: z.string().datetime(),
  startTime: z.string().datetime(),
  endTime: z.string().datetime(),
  breakDuration: z.number().min(0).default(0),
  shiftType: z.enum(['REGULAR', 'OVERTIME', 'HOLIDAY', 'EMERGENCY']).default('REGULAR'),
  position: z.string().optional(),
  notes: z.string().optional(),
  hourlyRate: z.number().positive().optional(),
});

const absenceSchema = z.object({
  staffId: z.string().uuid(),
  startDate: z.string().datetime(),
  endDate: z.string().datetime(),
  absenceType: z.enum(['VACATION', 'SICK_LEAVE', 'PERSONAL', 'EMERGENCY', 'TRAINING', 'OTHER']),
  reason: z.string().optional(),
  notes: z.string().optional(),
});

/**
 * GET /api/dashboard/staff
 * Get all staff members for a business
 */
router.get('/', requireAuth, async (req: Request, res: Response) => {
  try {
    const userId = req.userId;
    const businessId = req.query.businessId as string;

    if (!businessId) {
      return res.status(400).json({ error: 'businessId is required' });
    }

    // Verify business ownership
    const business = await prisma.business.findFirst({
      where: {
        id: businessId,
        members: { some: { userId } },
      },
    });

    if (!business) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Get staff with recent shifts and absences
    const staff = await (prisma as any).staff.findMany({
      where: {
        businessId,
        isActive: true,
      },
      include: {
        shifts: {
          where: {
            date: {
              gte: new Date(new Date().getTime() - 30 * 24 * 60 * 60 * 1000), // Last 30 days
            },
          },
          orderBy: { date: 'desc' },
          take: 5,
        },
        absences: {
          where: {
            status: 'APPROVED',
            endDate: {
              gte: new Date(),
            },
          },
          orderBy: { startDate: 'asc' },
          take: 3,
        },
        _count: {
          select: {
            shifts: true,
            absences: true,
          },
        },
      },
      orderBy: [
        { position: 'asc' },
        { firstName: 'asc' },
      ],
    });

    res.json({ success: true, data: staff });
  } catch (error) {
    console.error('Error fetching staff:', error);
    res.status(500).json({ error: 'Failed to fetch staff' });
  }
});

/**
 * POST /api/dashboard/staff
 * Create new staff member
 */
router.post('/', requireAuth, async (req: Request, res: Response) => {
  try {
    const userId = req.userId;
    const businessId = req.body.businessId;

    if (!businessId) {
      return res.status(400).json({ error: 'businessId is required' });
    }

    // Verify business ownership
    const business = await prisma.business.findFirst({
      where: {
        id: businessId,
        members: { some: { userId } },
      },
    });

    if (!business) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Validate input
    const validatedData = staffSchema.parse(req.body);

    // Create staff member
    const staff = await (prisma as any).staff.create({
      data: {
        businessId,
        ...validatedData,
        permissions: JSON.stringify(validatedData.permissions),
      },
    });

    res.json({ success: true, data: staff });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.errors });
    }
    console.error('Error creating staff:', error);
    res.status(500).json({ error: 'Failed to create staff member' });
  }
});

/**
 * GET /api/dashboard/staff/shifts
 * Get shifts with optional date range filtering
 */
router.get('/shifts', requireAuth, async (req: Request, res: Response) => {
  try {
    const userId = req.userId;
    const businessId = req.query.businessId as string;
    const startDate = req.query.startDate as string;
    const endDate = req.query.endDate as string;

    if (!businessId) {
      return res.status(400).json({ error: 'businessId is required' });
    }

    // Verify business ownership
    const business = await prisma.business.findFirst({
      where: {
        id: businessId,
        members: { some: { userId } },
      },
    });

    if (!business) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Build date filter
    const dateFilter: any = {};
    if (startDate) dateFilter.gte = new Date(startDate);
    if (endDate) dateFilter.lte = new Date(endDate);

    // Get shifts
    const shifts = await (prisma as any).shift.findMany({
      where: {
        businessId,
        ...(Object.keys(dateFilter).length > 0 && { date: dateFilter }),
      },
      include: {
        staff: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            position: true,
          },
        },
      },
      orderBy: [
        { date: 'asc' },
        { startTime: 'asc' },
      ],
    });

    res.json({ success: true, data: shifts });
  } catch (error) {
    console.error('Error fetching shifts:', error);
    res.status(500).json({ error: 'Failed to fetch shifts' });
  }
});

/**
 * POST /api/dashboard/staff/shifts
 * Create new shift with conflict detection
 */
router.post('/shifts', requireAuth, async (req: Request, res: Response) => {
  try {
    const userId = req.userId;
    const businessId = req.body.businessId;

    if (!businessId) {
      return res.status(400).json({ error: 'businessId is required' });
    }

    // Verify business ownership
    const business = await prisma.business.findFirst({
      where: {
        id: businessId,
        members: { some: { userId } },
      },
    });

    if (!business) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Validate input
    const validatedData = shiftSchema.parse(req.body);

    // Check for conflicts
    const conflicts = await checkShiftConflicts(
      businessId,
      validatedData.staffId,
      new Date(validatedData.startTime),
      new Date(validatedData.endTime)
    );

    if (conflicts.length > 0) {
      return res.status(409).json({
        error: 'Shift conflicts detected',
        conflicts: conflicts,
      });
    }

    // Create shift
    const shift = await (prisma as any).shift.create({
      data: {
        businessId,
        ...validatedData,
        date: new Date(validatedData.date),
        startTime: new Date(validatedData.startTime),
        endTime: new Date(validatedData.endTime),
      },
      include: {
        staff: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            position: true,
          },
        },
      },
    });

    res.json({ success: true, data: shift });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.errors });
    }
    console.error('Error creating shift:', error);
    res.status(500).json({ error: 'Failed to create shift' });
  }
});

/**
 * POST /api/dashboard/staff/conflicts/check
 * Check for shift conflicts without creating
 */
router.post('/conflicts/check', requireAuth, async (req: Request, res: Response) => {
  try {
    const userId = req.userId;
    const { businessId, staffId, startTime, endTime } = req.body;

    if (!businessId || !staffId || !startTime || !endTime) {
      return res.status(400).json({ error: 'businessId, staffId, startTime, and endTime are required' });
    }

    // Verify business ownership
    const business = await prisma.business.findFirst({
      where: {
        id: businessId,
        members: { some: { userId } },
      },
    });

    if (!business) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const conflicts = await checkShiftConflicts(
      businessId,
      staffId,
      new Date(startTime),
      new Date(endTime)
    );

    res.json({
      success: true,
      data: {
        hasConflicts: conflicts.length > 0,
        conflicts: conflicts,
      },
    });
  } catch (error) {
    console.error('Error checking conflicts:', error);
    res.status(500).json({ error: 'Failed to check conflicts' });
  }
});

/**
 * Utility function to check for shift conflicts
 */
async function checkShiftConflicts(
  businessId: string,
  staffId: string,
  startTime: Date,
  endTime: Date,
  excludeShiftId?: string
): Promise<any[]> {
  const conflicts = [];

  // Check for overlapping shifts
  const overlappingShifts = await (prisma as any).shift.findMany({
    where: {
      businessId,
      staffId,
      ...(excludeShiftId && { id: { not: excludeShiftId } }),
      OR: [
        {
          AND: [
            { startTime: { lte: startTime } },
            { endTime: { gt: startTime } },
          ],
        },
        {
          AND: [
            { startTime: { lt: endTime } },
            { endTime: { gte: endTime } },
          ],
        },
        {
          AND: [
            { startTime: { gte: startTime } },
            { endTime: { lte: endTime } },
          ],
        },
      ],
    },
    include: {
      staff: {
        select: {
          firstName: true,
          lastName: true,
        },
      },
    },
  });

  if (overlappingShifts.length > 0) {
    conflicts.push({
      type: 'shift_overlap',
      message: 'Staff member already has a shift during this time',
      details: overlappingShifts,
    });
  }

  // Check for approved absences
  const shiftDate = new Date(startTime.toDateString());
  const absences = await (prisma as any).absence.findMany({
    where: {
      businessId,
      staffId,
      status: 'APPROVED',
      startDate: { lte: shiftDate },
      endDate: { gte: shiftDate },
    },
  });

  if (absences.length > 0) {
    conflicts.push({
      type: 'absence_conflict',
      message: 'Staff member has approved absence during this period',
      details: absences,
    });
  }

  return conflicts;
}

export default router;
