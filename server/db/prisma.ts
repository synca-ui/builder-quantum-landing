import pkg from "@prisma/client";
const { PrismaClient } = pkg;

export let prisma: PrismaClient | null = null;

function initializePrisma() {
  const dbUrl = process.env.DATABASE_URL || "";
  const host = dbUrl.match(/ep-([a-z-]+)/)?.[1] || "unknown";
  console.log(`[Prisma] Initializing connection to database: ep-${host}`);

  return new PrismaClient({
    log: ["error"], // Only log errors to reduce noise
  });
}

// Lazy initialization: only create PrismaClient when first accessed
function getPrismaInstance(): PrismaClient {
  if (!prisma) {
    prisma = initializePrisma();
  }
  return prisma;
}

// Handle serverless disconnect: called after each request
export async function disconnectPrisma() {
  if (prisma) {
    await prisma.$disconnect();
    prisma = null;
  }
}

// Get singleton instance (lazy-loaded)
export default new Proxy({} as PrismaClient, {
  get(_target, prop) {
    return (getPrismaInstance() as any)[prop];
  },
});
