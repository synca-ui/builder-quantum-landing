import { PrismaClient } from "@prisma/client";

// Jetzt ist PrismaClient sowohl als Wert (Klasse) als auch als Typ bekannt
export let prisma: PrismaClient | null = null;

/**
 * Initialisiert Prisma mit Validierung und Logging
 */
function initializePrisma(): PrismaClient {
  const dbUrl = process.env.DATABASE_URL || "";

  if (!dbUrl) {
    const errorMessage = "[Prisma] FATAL: DATABASE_URL variable is not configured";
    console.error(errorMessage);
    throw new Error(errorMessage);
  }

  // Host-Extraktion für das Logging
  const host = dbUrl.match(/ep-([a-z-]+)/)?.[1] || "unknown";

  console.log("[Prisma] Connecting to NeonDB", {
    host: `ep-${host}`,
    timestamp: new Date().toISOString(),
  });

  return new PrismaClient({
    log: ["error", "warn"],
    errorFormat: "pretty",
  });
}

/**
 * Singleton-Instanz (Lazy Loading)
 */
function getPrismaInstance(): PrismaClient {
  if (!prisma) {
    try {
      prisma = initializePrisma();
      console.log("[Prisma] Client initialized successfully");
    } catch (error) {
      console.error("[Prisma] Initialization failed:", error);
      throw error;
    }
  }
  return prisma;
}

/**
 * Serverless Disconnect Helper
 */
export async function disconnectPrisma() {
  if (prisma) {
    await prisma.$disconnect();
    prisma = null;
    console.log("[Prisma] Disconnected");
  }
}

// Export der Proxy-Instanz für einfachen Zugriff im Rest der App
export default new Proxy({} as PrismaClient, {
  get(_target, prop) {
    const instance = getPrismaInstance();
    return (instance as any)[prop];
  },
});