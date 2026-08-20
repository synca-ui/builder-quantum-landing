/**
 * Staff Management API - Live Dashboard
 * Handles staff, shifts, and absence management with conflict resolution
 */

import { Router, Request, Response } from "express";
import { requireAuth } from "../middleware/auth";
import prisma from "../db/prisma";
import { z } from "zod";
import {
  betriebskennung,
  geprueftesBetriebsrecht,
} from "../middleware/betriebskennung";

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
  shiftType: z
    .enum(["REGULAR", "OVERTIME", "HOLIDAY", "EMERGENCY"])
    .default("REGULAR"),
  position: z.string().optional(),
  notes: z.string().optional(),
  hourlyRate: z.number().positive().optional(),
});

const absenceSchema = z.object({
  staffId: z.string().uuid(),
  startDate: z.string().datetime(),
  endDate: z.string().datetime(),
  absenceType: z.enum([
    "VACATION",
    "SICK_LEAVE",
    "PERSONAL",
    "EMERGENCY",
    "TRAINING",
    "OTHER",
  ]),
  reason: z.string().optional(),
  notes: z.string().optional(),
});

/**
 * Betriebskennung lesen und die Mitgliedschaft prüfen.
 *
 * ANLASS: Hier stand an jeder Route `req.query.businessId as string` bzw.
 * `req.body.businessId` - ein `as string` prüft zur Laufzeit nichts. Express
 * parst mit `qs`, und `?businessId[not]=zzz` wird zu `{ businessId: { not:
 * "zzz" } }`. Dieses Objekt bestand die Besitzprüfung (fand den EIGENEN
 * Betrieb des Anfragenden über die dann wirkungslose Bedingung) und wurde
 * danach als Kennung weiterbenutzt - `where: { businessId }` lieferte die
 * Zeilen ALLER Betriebe. Siehe server/middleware/betriebskennung.ts für die
 * volle Herleitung.
 *
 * Ab dem Rückgabewert dieser Funktion wird NUR NOCH die geprüfte Kennung
 * benutzt, nie wieder ein Rohwert aus `req.query`/`req.body`. Bei Fehlschlag
 * sendet die Funktion selbst die passende Antwort und liefert `null` - der
 * Aufrufer muss dann nur noch `return`.
 */
async function geprueftesBusiness(
  req: Request,
  res: Response,
): Promise<string | null> {
  const kennung = betriebskennung(req);
  if (!kennung) {
    res.status(400).json({ error: "businessId fehlt oder ist ungültig" });
    return null;
  }
  const businessId = await geprueftesBetriebsrecht(prisma, req.userId!, kennung);
  if (!businessId) {
    res.status(403).json({ error: "Kein Zugriff auf diesen Betrieb" });
    return null;
  }
  return businessId;
}

/**
 * Nur Inhaber/Admin. Siehe `ownerGuard` in server/maitr/routes.ts für dieselbe
 * Abwägung: Dort hängen an `requireVenueAccess` (dem Äquivalent zu
 * `geprueftesBusiness` hier) bewusst ALLE Lesewege und die alltäglichen
 * Schreibwege, weil auch Aushilfen ihre Arbeit erledigen können müssen -
 * erzwungen wird die Rolle nur an den Zugriffen, die eine HR- oder
 * Gehaltsentscheidung sind.
 *
 * Gemessen: Eine Aushilfe (`BusinessMember.role` STAFF, der Vorgabewert des
 * Modells) konnte über `POST /` Personal samt Gehalt (`hourlyRate`) und
 * Berechtigungen anlegen. ADMIN ist mitgemeint: das ist die Plattformrolle,
 * nicht eine Aushilfe.
 */
async function nurInhaber(businessId: string, userId: string): Promise<boolean> {
  const mitgliedschaft = await prisma.businessMember.findUnique({
    where: { userId_businessId: { userId, businessId } },
    select: { role: true },
  });
  return mitgliedschaft?.role === "OWNER" || mitgliedschaft?.role === "ADMIN";
}

/**
 * GET /api/dashboard/staff
 * Get all staff members for a business
 */
router.get("/", requireAuth, async (req: Request, res: Response) => {
  try {
    const businessId = await geprueftesBusiness(req, res);
    if (!businessId) return;

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
          orderBy: { date: "desc" },
          take: 5,
        },
        absences: {
          where: {
            status: "APPROVED",
            endDate: {
              gte: new Date(),
            },
          },
          orderBy: { startDate: "asc" },
          take: 3,
        },
        _count: {
          select: {
            shifts: true,
            absences: true,
          },
        },
      },
      orderBy: [{ position: "asc" }, { firstName: "asc" }],
    });

    res.json({ success: true, data: staff });
  } catch (error) {
    console.error("Error fetching staff:", error);
    res.status(500).json({ error: "Failed to fetch staff" });
  }
});

/**
 * POST /api/dashboard/staff
 * Create new staff member
 */
router.post("/", requireAuth, async (req: Request, res: Response) => {
  try {
    const businessId = await geprueftesBusiness(req, res);
    if (!businessId) return;

    // Legt Gehalt und Berechtigungen einer neuen Person fest - eine
    // Einstellungsentscheidung, keine Aushilfen-Aufgabe. Siehe `nurInhaber`.
    if (!(await nurInhaber(businessId, req.userId!))) {
      return res.status(403).json({ error: "nur_inhaber" });
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
    console.error("Error creating staff:", error);
    res.status(500).json({ error: "Failed to create staff member" });
  }
});

/**
 * GET /api/dashboard/staff/shifts
 * Get shifts with optional date range filtering
 *
 * Kein Rollenriegel: Eine Aushilfe muss ihren eigenen Dienstplan sehen können.
 */
router.get("/shifts", requireAuth, async (req: Request, res: Response) => {
  try {
    const businessId = await geprueftesBusiness(req, res);
    if (!businessId) return;

    const startDate = req.query.startDate as string;
    const endDate = req.query.endDate as string;

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
      orderBy: [{ date: "asc" }, { startTime: "asc" }],
    });

    res.json({ success: true, data: shifts });
  } catch (error) {
    console.error("Error fetching shifts:", error);
    res.status(500).json({ error: "Failed to fetch shifts" });
  }
});

/**
 * POST /api/dashboard/staff/shifts
 * Create new shift with conflict detection
 */
router.post("/shifts", requireAuth, async (req: Request, res: Response) => {
  try {
    const businessId = await geprueftesBusiness(req, res);
    if (!businessId) return;

    // Weist einer Person Arbeitszeit zu und kann ihre Vergütung für diese
    // Schicht überschreiben (`hourlyRate`) - eine Personaleinsatz- und
    // Gehaltsentscheidung, keine Aushilfen-Aufgabe. Die Aushilfe darf ihren
    // Plan nur SEHEN (siehe GET /shifts oben).
    if (!(await nurInhaber(businessId, req.userId!))) {
      return res.status(403).json({ error: "nur_inhaber" });
    }

    // Validate input
    const validatedData = shiftSchema.parse(req.body);

    // Die Person muss zu DIESEM Betrieb gehören, BEVOR irgendetwas
    // geschrieben oder mitgeliefert wird. `Shift.staffId` ist ein
    // einspaltiger Fremdschlüssel ohne begleitendes `businessId` im Schema -
    // die Bindung an den geprüften Betrieb gehört deshalb hierher (dasselbe
    // Muster wie beim Tisch in server/maitr/routes.ts, POST /reservations/walk-in).
    //
    // Gemessen: Mit der `businessId` des eigenen Betriebs und einer `staffId`
    // aus einem FREMDEN Betrieb antwortete diese Route 200 - und lieferte
    // durch ihr `include` sofort Vorname, Nachname und Position der fremden
    // Person mit.
    const staffMitglied = await (prisma as any).staff.findFirst({
      where: { id: validatedData.staffId, businessId },
      select: { id: true },
    });
    if (!staffMitglied) {
      return res.status(404).json({ error: "Mitarbeiter nicht gefunden" });
    }

    // Check for conflicts
    const conflicts = await checkShiftConflicts(
      businessId,
      validatedData.staffId,
      new Date(validatedData.startTime),
      new Date(validatedData.endTime),
    );

    if (conflicts.length > 0) {
      return res.status(409).json({
        error: "Shift conflicts detected",
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
    console.error("Error creating shift:", error);
    res.status(500).json({ error: "Failed to create shift" });
  }
});

/**
 * POST /api/dashboard/staff/conflicts/check
 * Check for shift conflicts without creating
 *
 * Kein Rollenriegel: schreibt nichts, ist ein reiner Verfügbarkeitscheck.
 */
router.post(
  "/conflicts/check",
  requireAuth,
  async (req: Request, res: Response) => {
    try {
      const businessId = await geprueftesBusiness(req, res);
      if (!businessId) return;

      const { staffId, startTime, endTime } = req.body;

      // `staffId` durchläuft hier - anders als bei POST /shifts - kein
      // Zod-Schema, das eine Zeichenkette erzwingt. Derselbe Grund wie bei
      // `businessId` in server/middleware/betriebskennung.ts gilt also auch
      // hier: nur eine nicht-leere Zeichenkette gilt.
      if (
        typeof staffId !== "string" ||
        staffId.length === 0 ||
        !startTime ||
        !endTime
      ) {
        return res.status(400).json({
          error: "staffId, startTime und endTime sind erforderlich",
        });
      }

      // Dieselbe Prüfung wie in POST /shifts: Gemessen taugte diese Route
      // genauso als Orakel für fremdes Personal - und lieferte dabei zusätzlich
      // deren Arbeitszeiten mit.
      const staffMitglied = await (prisma as any).staff.findFirst({
        where: { id: staffId, businessId },
        select: { id: true },
      });
      if (!staffMitglied) {
        return res.status(404).json({ error: "Mitarbeiter nicht gefunden" });
      }

      const conflicts = await checkShiftConflicts(
        businessId,
        staffId,
        new Date(startTime),
        new Date(endTime),
      );

      res.json({
        success: true,
        data: {
          hasConflicts: conflicts.length > 0,
          conflicts: conflicts,
        },
      });
    } catch (error) {
      console.error("Error checking conflicts:", error);
      res.status(500).json({ error: "Failed to check conflicts" });
    }
  },
);

/**
 * Utility function to check for shift conflicts
 */
async function checkShiftConflicts(
  businessId: string,
  staffId: string,
  startTime: Date,
  endTime: Date,
  excludeShiftId?: string,
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
          AND: [{ startTime: { lt: endTime } }, { endTime: { gte: endTime } }],
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
      type: "shift_overlap",
      message: "Staff member already has a shift during this time",
      details: overlappingShifts,
    });
  }

  // Check for approved absences
  const shiftDate = new Date(startTime.toDateString());
  const absences = await (prisma as any).absence.findMany({
    where: {
      businessId,
      staffId,
      status: "APPROVED",
      startDate: { lte: shiftDate },
      endDate: { gte: shiftDate },
    },
  });

  if (absences.length > 0) {
    conflicts.push({
      type: "absence_conflict",
      message: "Staff member has approved absence during this period",
      details: absences,
    });
  }

  return conflicts;
}

export default router;
