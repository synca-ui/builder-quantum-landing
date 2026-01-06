import { PrismaClient } from '@prisma/client';

let prisma: PrismaClient;

if (process.env.NODE_ENV === 'production') {
  prisma = new PrismaClient();
} else {
  // In development, use a global variable to avoid multiple instances
  const globalWithPrisma = global as unknown as { prisma?: PrismaClient };
  if (!globalWithPrisma.prisma) {
    const dbUrl = process.env.DATABASE_URL || '';
    const host = dbUrl.match(/ep-([a-z-]+)/)?.[1] || 'unknown';
    console.log(`[Prisma] Connecting to database: ep-${host}`);

    globalWithPrisma.prisma = new PrismaClient({
      log: ['warn', 'error'],
    });
  }
  prisma = globalWithPrisma.prisma;
}

export default prisma;
