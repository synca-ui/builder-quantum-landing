import prisma from "../db/prisma";

interface AuditContext {
  userId: string;
  ipAddress?: string;
  userAgent?: string;
}

/**
 *  Create audit logger for a request
 * Usage:
 *   const audit = createAuditLogger(req);
 *   await audit("config_created", configId, true);
 */
export function createAuditLogger(context: AuditContext) {
  return async (
    action: string,
    resourceId: string,
    success: boolean = true,
    errorMessage?: string,
    changes?: { before?: any; after?: any },
  ) => {
    try {
      await prisma.auditLog.create({
        data: {
          userId: context.userId,
          action,
          resource: "configuration",
          resourceId,
          ipAddress: context.ipAddress,
          userAgent: context.userAgent?.substring(0, 500), // Limit length
          success,
          errorMessage: errorMessage?.substring(0, 255),
          changes: changes || null,
        },
      });
    } catch (error) {
      // Don't throw - audit logging should never break the main flow
      console.error("[AuditLog] Failed to create audit log:", error);
    }
  };
}

/**
 * ✅ Helper: Query audit logs for a user (for compliance)
 */
export async function getUserAuditLogs(
  userId: string,
  limit: number = 100,
  offset: number = 0,
) {
  return prisma.auditLog.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    take: limit,
    skip: offset,
  });
}

/**
 * ✅ Helper: Query audit logs for a specific resource
 */
export async function getResourceAuditLogs(
  resourceId: string,
  limit: number = 50,
) {
  return prisma.auditLog.findMany({
    where: { resourceId },
    orderBy: { createdAt: "desc" },
    take: limit,
  });
}

/**
 * ✅ Helper: Generate compliance report
 */
export async function generateComplianceReport(
  userId: string,
  startDate: Date,
  endDate: Date,
) {
  const logs = await prisma.auditLog.findMany({
    where: {
      userId,
      createdAt: {
        gte: startDate,
        lte: endDate,
      },
    },
    orderBy: { createdAt: "desc" },
  });

  const summary = {
    totalActions: logs.length,
    successfulActions: logs.filter((l) => l.success).length,
    failedActions: logs.filter((l) => !l.success).length,
    actionBreakdown: {} as Record<string, number>,
    ipAddresses: new Set<string>(),
  };

  logs.forEach((log) => {
    summary.actionBreakdown[log.action] =
      (summary.actionBreakdown[log.action] || 0) + 1;
    if (log.ipAddress) {
      summary.ipAddresses.add(log.ipAddress);
    }
  });

  return {
    period: { startDate, endDate },
    summary,
    logs,
  };
}
