// db/prisma.ts
import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

// Validiere DATABASE_URL
const dbUrl = process.env.DATABASE_URL;
if (!dbUrl) {
  console.error("[Prisma] FATAL: DATABASE_URL is not configured");
  throw new Error("DATABASE_URL environment variable is required");
}

// Log connection info (ohne sensitive Daten)
const host = dbUrl.match(/ep-([a-z0-9-]+)/)?.[1] || "unknown";
console.log("[Prisma] Connecting to NeonDB", {
  host: `ep-${host}`,
  timestamp: new Date().toISOString(),
});

// Singleton Pattern - erstelle nur eine Instanz
export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log:
      process.env.NODE_ENV === "development"
        ? ["query", "error", "warn"]
        : ["error", "warn"],
    errorFormat: "pretty",
  });

// In Development: speichere global um HMR zu überleben
if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}

// Default export für: import prisma from "../db/prisma"
export default prisma;

// Serverless Disconnect Helper
export async function disconnectPrisma() {
  await prisma.$disconnect();
  console.log("[Prisma] Disconnected");
}

console.log("[Prisma] Client initialized successfully");
