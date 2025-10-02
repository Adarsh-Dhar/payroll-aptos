// Minimal, robust loader that imports the already generated client directly
// from .prisma/client to avoid bundling issues with @prisma/client stubs.
const globalForPrisma = globalThis as unknown as { prisma: any | undefined };

export async function getPrisma() {
  if (globalForPrisma.prisma) return globalForPrisma.prisma;
  let PrismaClientCtor: any;
  
  // Force WASM engine in production
  if (process.env.NODE_ENV === 'production') {
    try {
      const mod = await import('@prisma/client/wasm');
      PrismaClientCtor = (mod as unknown as { PrismaClient: any }).PrismaClient;
    } catch (wasmErr) {
      console.error('Failed to load WASM Prisma client:', wasmErr);
      // Fallback to regular client
      const mod = await import('@prisma/client');
      PrismaClientCtor = (mod as unknown as { PrismaClient: any }).PrismaClient;
    }
  } else {
    try {
      // Import the generated client directly for development
      const mod = await import('.prisma/client');
      PrismaClientCtor = (mod as unknown as { PrismaClient: any }).PrismaClient;
    } catch (directErr) {
      // Fallback to package import
      const mod = await import('@prisma/client');
      PrismaClientCtor = (mod as unknown as { PrismaClient: any }).PrismaClient;
    }
  }
  
  const client = new PrismaClientCtor({
    log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
    ...(process.env.NODE_ENV === 'production' && {
      datasources: {
        db: {
          url: process.env.DATABASE_URL,
        },
      },
    }),
  });
  
  if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = client;
  return client;
}
