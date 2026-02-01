/**
 * Staff & Shift Management API
 * Handles employee scheduling with conflict detection
 */

import express from 'express';
import { PrismaClient } from '@prisma/client';
import { requireAuth } from '../middleware/auth';
import { z } from 'zod';

const router = express.Router();
const prisma = new PrismaClient();

// Validation schemas
const employeeSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  email: z.string().email('Invalid email'),
  phone: z.string().optional(),
  position: z.enum(['server', 'chef', 'bartender', 'host', 'manager']),
  avatarUrl: z.string().url().optional(),
  hourlyRate: z.number().positive().optional(),
});

const shiftSchema = z.object({
  employeeId: z.string().uuid(),
  date: z.string().datetime(),
  startTime: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/, 'Invalid time format'),
  endTime: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/, 'Invalid time format'),
  position: z.string(),
  notes: z.string().optional(),
});

const absenceSchema = z.object({
  employeeId: z.string().uuid(),
  startDate: z.string().datetime(),
  endDate: z.string().datetime(),
  reason: z.enum(['vacation', 'sick', 'personal', 'emergency']),
  notes: z.string().optional(),
});

/**
 * Utility: Check for shift conflicts
 */
async function checkShiftConflicts(
  employeeId: string,
  date: Date,
  startTime: string,
  endTime: string,
  excludeShiftId?: string
): Promise<{ hasConflict: boolean; conflicts: any[] }> {
  const dateStart = new Date(date);
  dateStart.setHours(0, 0, 0, 0);
  const dateEnd = new Date(dateStart);
  dateEnd.setDate(dateEnd.getDate() + 1);

  // Check for overlapping shifts
  const existingShifts = await prisma.shift.findMany({
    where: {
      employeeId,
      date: {
        gte: dateStart,
        lt: dateEnd,
      },
      status: {
        not: 'cancelled',
      },
      ...(excludeShiftId && { id: { not: excludeShiftId } }),
    },
  });

  const conflicts = existingShifts.filter((shift) => {
    // Check if times overlap
    return !(endTime <= shift.startTime || startTime >= shift.endTime);
  });

  // Check for absences
  const absences = await prisma.absence.findMany({
    where: {
      employeeId,
      startDate: { lte: date },
      endDate: { gte: date },
    },
  });

  return {
    hasConflict: conflicts.length > 0 || absences.length > 0,
    conflicts: [
      ...conflicts.map((s) => ({ type: 'shift', data: s })),
      ...absences.map((a) => ({ type: 'absence', data: a })),
    ],
  };
}

/**
 * Utility: Calculate total hours for a date
 */
async function calculateDailyHours(employeeId: string, date: Date): Promise<number> {
  const dateStart = new Date(date);
  dateStart.setHours(0, 0, 0, 0);
  const dateEnd = new Date(dateStart);
  dateEnd.setDate(dateEnd.getDate() + 1);

  const shifts = await prisma.shift.findMany({
    where: {
      employeeId,
      date: {
        gte: dateStart,
        lt: dateEnd,
      },
      status: {
        not: 'cancelled',
      },
    },
  });

  let totalMinutes = 0;
  shifts.forEach((shift) => {
    const [startHour, startMin] = shift.startTime.split(':').map(Number);
    const [endHour, endMin] = shift.endTime.split(':').map(Number);
    const minutes = (endHour * 60 + endMin) - (startHour * 60 + startMin);
    totalMinutes += minutes;
  });

  return totalMinutes / 60;
}

// ============================================
// EMPLOYEE ROUTES
// ============================================

/**
 * GET /api/dashboard/staff/employees
 * List all employees for a business
 */
router.get('/employees', requireAuth, async (req, res) => {
  try {
    const userId = req.auth.userId;
    const businessId = req.query.businessId as string;

    if (!businessId) {
      return res.status(400).json({ error: 'businessId is required' });
    }

    // Verify access
    const business = await prisma.business.findFirst({
      where: {
        id: businessId,
        members: { some: { userId } },
      },
    });

    if (!business) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const employees = await prisma.employee.findMany({
      where: { businessId },
      orderBy: { name: 'asc' },
    });

    res.json({ success: true, data: employees });
  } catch (error) {
    console.error('Error fetching employees:', error);
    res.status(500).json({ error: 'Failed to fetch employees' });
  }
});

/**
 * POST /api/dashboard/staff/employees
 * Create a new employee
 */
router.post('/employees', requireAuth, async (req, res) => {
  try {
    const userId = req.auth.userId;
    const businessId = req.body.businessId as string;

    if (!businessId) {
      return res.status(400).json({ error: 'businessId is required' });
    }

    // Verify access
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
    const validated = employeeSchema.parse(req.body);

    const employee = await prisma.employee.create({
      data: {
        businessId,
        ...validated,
      },
    });

    res.json({ success: true, data: employee });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.errors });
    }
    console.error('Error creating employee:', error);
    res.status(500).json({ error: 'Failed to create employee' });
  }
});

// ============================================
// SHIFT ROUTES
// ============================================

/**
 * GET /api/dashboard/staff/shifts
 * Get shifts for a date range
 */
router.get('/shifts', requireAuth, async (req, res) => {
  try {
    const userId = req.auth.userId;
    const businessId = req.query.businessId as string;
    const startDate = req.query.startDate as string;
    const endDate = req.query.endDate as string;

    if (!businessId || !startDate || !endDate) {
      return res.status(400).json({ error: 'Missing required parameters' });
    }

    // Verify access
    const business = await prisma.business.findFirst({
      where: {
        id: businessId,
        members: { some: { userId } },
      },
    });

    if (!business) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const shifts = await prisma.shift.findMany({
      where: {
        businessId,
        date: {
          gte: new Date(startDate),
          lte: new Date(endDate),
        },
      },
      include: {
        employee: {
          select: {
            id: true,
            name: true,
            position: true,
            avatarUrl: true,
          },
        },
      },
      orderBy: [{ date: 'asc' }, { startTime: 'asc' }],
    });

    res.json({ success: true, data: shifts });
  } catch (error) {
    console.error('Error fetching shifts:', error);
    res.status(500).json({ error: 'Failed to fetch shifts' });
  }
});

/**
 * POST /api/dashboard/staff/shifts
 * Create a new shift with conflict checking
 */
router.post('/shifts', requireAuth, async (req, res) => {
  try {
    const userId = req.auth.userId;
    const businessId = req.body.businessId as string;

    if (!businessId) {
      return res.status(400).json({ error: 'businessId is required' });
    }

    // Verify access
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
    const validated = shiftSchema.parse(req.body);

    // Check for conflicts
    const date = new Date(validated.date);
    const { hasConflict, conflicts } = await checkShiftConflicts(
      validated.employeeId,
      date,
      validated.startTime,
      validated.endTime
    );

    if (hasConflict) {
      return res.status(409).json({
        error: 'Shift conflict detected',
        conflicts,
      });
    }

    // Check daily hour limit (max 12 hours)
    const dailyHours = await calculateDailyHours(validated.employeeId, date);
    const [startHour, startMin] = validated.startTime.split(':').map(Number);
    const [endHour, endMin] = validated.endTime.split(':').map(Number);
    const shiftHours = (endHour * 60 + endMin - startHour * 60 - startMin) / 60;

    if (dailyHours + shiftHours > 12) {
      return res.status(400).json({
        error: 'Daily hour limit exceeded',
        message: `Employee would work ${(dailyHours + shiftHours).toFixed(1)} hours (max 12)`,
      });
    }

    // Create shift
    const shift = await prisma.shift.create({
      data: {
        businessId,
        employeeId: validated.employeeId,
        date,
        startTime: validated.startTime,
        endTime: validated.endTime,
        position: validated.position,
        notes: validated.notes,
      },
      include: {
        employee: {
          select: {
            id: true,
            name: true,
            position: true,
            avatarUrl: true,
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
 * PUT /api/dashboard/staff/shifts/:id
 * Update a shift with conflict checking
 */
router.put('/shifts/:id', requireAuth, async (req, res) => {
  try {
    const userId = req.auth.userId;
    const shiftId = req.params.id;
    const businessId = req.body.businessId as string;

    // Verify access and ownership
    const shift = await prisma.shift.findFirst({
      where: {
        id: shiftId,
        business: {
          members: { some: { userId } },
        },
      },
    });

    if (!shift) {
      return res.status(404).json({ error: 'Shift not found' });
    }

    // Validate input
    const validated = shiftSchema.partial().parse(req.body);

    // If time or date changed, check conflicts
    if (validated.date || validated.startTime || validated.endTime) {
      const date = validated.date ? new Date(validated.date) : shift.date;
      const startTime = validated.startTime || shift.startTime;
      const endTime = validated.endTime || shift.endTime;
      const employeeId = validated.employeeId || shift.employeeId;

      const { hasConflict, conflicts } = await checkShiftConflicts(
        employeeId,
        date,
        startTime,
        endTime,
        shiftId
      );

      if (hasConflict) {
        return res.status(409).json({
          error: 'Shift conflict detected',
          conflicts,
        });
      }
    }

    // Update shift
    const updated = await prisma.shift.update({
      where: { id: shiftId },
      data: {
        ...(validated.date && { date: new Date(validated.date) }),
        ...(validated.startTime && { startTime: validated.startTime }),
        ...(validated.endTime && { endTime: validated.endTime }),
        ...(validated.position && { position: validated.position }),
        ...(validated.notes !== undefined && { notes: validated.notes }),
      },
      include: {
        employee: {
          select: {
            id: true,
            name: true,
            position: true,
            avatarUrl: true,
          },
        },
      },
    });

    res.json({ success: true, data: updated });
  } catch (error) {
    console.error('Error updating shift:', error);
    res.status(500).json({ error: 'Failed to update shift' });
  }
});

/**
 * DELETE /api/dashboard/staff/shifts/:id
 * Cancel a shift
 */
router.delete('/shifts/:id', requireAuth, async (req, res) => {
  try {
    const userId = req.auth.userId;
    const shiftId = req.params.id;

    // Verify access
    const shift = await prisma.shift.findFirst({
      where: {
        id: shiftId,
        business: {
          members: { some: { userId } },
        },
      },
    });

    if (!shift) {
      return res.status(404).json({ error: 'Shift not found' });
    }

    // Update status to cancelled instead of deleting
    await prisma.shift.update({
      where: { id: shiftId },
      data: { status: 'cancelled' },
    });

    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting shift:', error);
    res.status(500).json({ error: 'Failed to delete shift' });
  }
});

// ============================================
// ABSENCE ROUTES
// ============================================

/**
 * GET /api/dashboard/staff/absences
 * Get absences for employees
 */
router.get('/absences', requireAuth, async (req, res) => {
  try {
    const userId = req.auth.userId;
    const businessId = req.query.businessId as string;
    const employeeId = req.query.employeeId as string;

    if (!businessId) {
      return res.status(400).json({ error: 'businessId is required' });
    }

    // Verify access
    const business = await prisma.business.findFirst({
      where: {
        id: businessId,
        members: { some: { userId } },
      },
    });

    if (!business) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const absences = await prisma.absence.findMany({
      where: {
        employee: {
          businessId,
          ...(employeeId && { id: employeeId }),
        },
      },
      include: {
        employee: {
          select: {
            id: true,
            name: true,
            position: true,
          },
        },
      },
      orderBy: { startDate: 'desc' },
    });

    res.json({ success: true, data: absences });
  } catch (error) {
    console.error('Error fetching absences:', error);
    res.status(500).json({ error: 'Failed to fetch absences' });
  }
});

/**
 * POST /api/dashboard/staff/absences
 * Create a new absence
 */
router.post('/absences', requireAuth, async (req, res) => {
  try {
    const userId = req.auth.userId;
    const businessId = req.body.businessId as string;

    // Verify employee belongs to user's business
    const employee = await prisma.employee.findFirst({
      where: {
        id: req.body.employeeId,
        business: {
          members: { some: { userId } },
        },
      },
    });

    if (!employee) {
      return res.status(404).json({ error: 'Employee not found' });
    }

    // Validate input
    const validated = absenceSchema.parse(req.body);

    const absence = await prisma.absence.create({
      data: {
        employeeId: validated.employeeId,
        startDate: new Date(validated.startDate),
        endDate: new Date(validated.endDate),
        reason: validated.reason,
        notes: validated.notes,
      },
      include: {
        employee: {
          select: {
            id: true,
            name: true,
            position: true,
          },
        },
      },
    });

    res.json({ success: true, data: absence });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.errors });
    }
    console.error('Error creating absence:', error);
    res.status(500).json({ error: 'Failed to create absence' });
  }
});

export default router;
