import { PrismaClient } from '@prisma/client'

declare global {
  var __prisma: PrismaClient | undefined
}

// Create a function to get or create Prisma client
function getPrismaClient() {
  if (globalThis.__prisma) {
    return globalThis.__prisma
  }
  
  const prisma = new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
  })
  
  if (process.env.NODE_ENV !== 'production') {
    globalThis.__prisma = prisma
  }
  
  return prisma
}

// Export the prisma client
export const prisma = getPrismaClient()
