// Dynamic import approach for Vercel compatibility
const globalForPrisma = globalThis as unknown as { prisma: any | undefined }

export async function getPrisma() {
  if (globalForPrisma.prisma) return globalForPrisma.prisma
  
  try {
    // Use dynamic import to ensure Prisma is available
    const { PrismaClient } = await import('@prisma/client')
    
    const client = new PrismaClient({
      log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
      datasources: {
        db: {
          url: process.env.DATABASE_URL,
        },
      },
    })
    
    // Store in global to prevent multiple instances in development
    if (process.env.NODE_ENV !== 'production') {
      globalForPrisma.prisma = client
    }
    
    return client
  } catch (error) {
    console.error('Failed to create Prisma client:', error)
    throw new Error(`Database connection failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
  }
}
