import pkg from "@prisma/client";
const { PrismaClient } = pkg;

export let prisma: PrismaClient | null = null;

function initializePrisma() {
  const dbUrl = process.env.DATABASE_URL || "";

  // Validate DATABASE_URL is configured
  if (!dbUrl) {
    const errorMessage =
      "[Prisma] FATAL: DATABASE_URL environment variable is not configured";
    console.error(errorMessage);
    throw new Error(errorMessage);
  }

  // Extract host information for logging
  const host = dbUrl.match(/ep-([a-z-]+)/)?.[1] || "unknown";
  const maskedUrl = `${dbUrl.substring(0, 30)}...${dbUrl.substring(dbUrl.length - 10)}`;

  console.log("[Prisma] Initializing database connection", {
    host: `ep-${host}`,
    databaseUrl: maskedUrl,
    timestamp: new Date().toISOString(),
  });

  const client = new PrismaClient({
    log: ["error", "warn"], // Log errors and warnings
    errorFormat: "pretty",
  });

  // Add connection error handler
  client.$on("error" as any, (error: any) => {
    console.error("[Prisma] Connection error event:", {
      code: error?.code,
      message: error?.message,
      timestamp: new Date().toISOString(),
    });
  });

  return client;
}

// Lazy initialization: only create PrismaClient when first accessed
function getPrismaInstance(): PrismaClient {
  if (!prisma) {
    try {
      prisma = initializePrisma();
      console.log("[Prisma] PrismaClient initialized successfully");
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      console.error("[Prisma] FATAL: Failed to initialize PrismaClient:", {
        message: errorMessage,
        timestamp: new Date().toISOString(),
      });
      throw error;
    }
  }
  return prisma;
}

// Handle serverless disconnect: called after each request
export async function disconnectPrisma() {
  if (prisma) {
    try {
      console.log("[Prisma] Disconnecting from database");
      await prisma.$disconnect();
      prisma = null;
      console.log("[Prisma] Successfully disconnected");
    } catch (error) {
      console.error("[Prisma] Error disconnecting:", error);
    }
  }
}

// Get singleton instance (lazy-loaded)
export default new Proxy({} as PrismaClient, {
  get(_target, prop) {
    return (getPrismaInstance() as any)[prop];
  },
});
