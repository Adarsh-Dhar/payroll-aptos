let PrismaClient: any

// Try to import Prisma client in different ways
try {
  // First try: Direct import from @prisma/client
  const { PrismaClient: PC } = require('@prisma/client')
  PrismaClient = PC
  console.log('Successfully imported PrismaClient from @prisma/client')
} catch (error) {
  console.log('Failed to import from @prisma/client, trying .prisma/client:', error.message)
  try {
    // Second try: Import from generated client
    const { PrismaClient: PC } = require('.prisma/client')
    PrismaClient = PC
    console.log('Successfully imported PrismaClient from .prisma/client')
  } catch (error2) {
    console.error('Failed to import PrismaClient from both locations:', error2)
    throw new Error('Prisma client not found. Please run "prisma generate"')
  }
}

const globalForPrisma = globalThis as unknown as { prisma: any | undefined }

export function getPrisma() {
  if (globalForPrisma.prisma) return globalForPrisma.prisma
  
  console.log('Creating new Prisma client...')
  console.log('DATABASE_URL exists:', !!process.env.DATABASE_URL)
  console.log('NODE_ENV:', process.env.NODE_ENV)
  
  try {
    // Create Prisma client with explicit configuration for Vercel
    const client = new PrismaClient({
      log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
      datasources: {
        db: {
          url: process.env.DATABASE_URL,
        },
      },
    })
    
    console.log('Prisma client created successfully')
    
    // Store in global to prevent multiple instances in development
    if (process.env.NODE_ENV !== 'production') {
      globalForPrisma.prisma = client
    }
    
    return client
  } catch (error) {
    console.error('Failed to create Prisma client:', error)
    console.error('Error details:', error)
    throw new Error('Database connection failed. Please check your configuration.')
  }
}
