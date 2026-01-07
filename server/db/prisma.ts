import { PrismaClient } from "@prisma/client";

let prisma: PrismaClient;

function initializePrisma() {
  const dbUrl = process.env.DATABASE_URL || "";
  const host = dbUrl.match(/ep-([a-z-]+)/)?.[1] || "unknown";
  console.log(`[Prisma] Initializing connection to database: ep-${host}`);

  return new PrismaClient({
    log: ["error"], // Only log errors to reduce noise
  });
}

if (process.env.NODE_ENV === "production") {
  prisma = initializePrisma();
} else {
  // In development, use a global variable to avoid multiple instances
  const globalWithPrisma = global as unknown as { prisma?: PrismaClient };
  if (!globalWithPrisma.prisma) {
    globalWithPrisma.prisma = initializePrisma();
  }
  prisma = globalWithPrisma.prisma;
}

export default prisma;
