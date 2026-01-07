import { PrismaClient } from '@prisma/client';

let prisma: PrismaClient;
let connectionPromise: Promise<void> | null = null;

function initializePrisma() {
  const dbUrl = process.env.DATABASE_URL || '';
  const host = dbUrl.match(/ep-([a-z-]+)/)?.[1] || 'unknown';
  console.log(`[Prisma] Initializing connection to database: ep-${host}`);

  const client = new PrismaClient({
    log: ['warn', 'error'],
  });

  // Test connection in background, don't block server startup
  if (!connectionPromise) {
    connectionPromise = (async () => {
      try {
        await (client as any).$queryRawUnsafe('SELECT 1');
        console.log('[Prisma] ✅ Database connection successful');
      } catch (err: any) {
        console.error('[Prisma] ⚠️  Initial connection test failed:', err?.message || String(err));
        // Don't throw - let server start anyway, will retry on first query
      }
    })();
  }

  return client;
}

if (process.env.NODE_ENV === 'production') {
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
