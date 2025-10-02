// Minimal, robust loader that imports the already generated client directly
// from .prisma/client to avoid bundling issues with @prisma/client stubs.
const globalForPrisma = globalThis as unknown as { prisma: any | undefined };

export async function getPrisma() {
  if (globalForPrisma.prisma) return globalForPrisma.prisma;
  let PrismaClientCtor: any;
  try {
    // Import the generated client directly
    const mod = await import('.prisma/client');
    PrismaClientCtor = (mod as unknown as { PrismaClient: any }).PrismaClient;
  } catch (directErr) {
    // Fallback to package import
    const mod = await import('@prisma/client');
    PrismaClientCtor = (mod as unknown as { PrismaClient: any }).PrismaClient;
  }
  
  const client = new PrismaClientCtor({
    log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
    // Force binary engine for production
    ...(process.env.NODE_ENV === 'production' && {
      datasources: {
        db: {
          url: process.env.DATABASE_URL,
        },
      },
      // Explicitly set engine type for production
      __internal: {
        engine: {
          binaryTargets: ['rhel-openssl-3.0.x'],
        },
      },
    }),
  });
  
  if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = client;
  return client;
}
