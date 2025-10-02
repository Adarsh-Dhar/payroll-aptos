import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    // Test if we can import Prisma at all
    let PrismaClient: any;
    let importError: string | null = null;
    
    try {
      const { PrismaClient: PC } = await import('@prisma/client');
      PrismaClient = PC;
    } catch (error) {
      importError = `Failed to import from @prisma/client: ${error}`;
      try {
        const { PrismaClient: PC } = await import('.prisma/client');
        PrismaClient = PC;
        importError = null;
      } catch (error2) {
        importError += ` | Failed to import from .prisma/client: ${error2}`;
      }
    }
    
    if (importError) {
      return NextResponse.json({
        success: false,
        error: 'Prisma import failed',
        details: importError,
        nodeVersion: process.version,
        nodeEnv: process.env.NODE_ENV,
        databaseUrl: process.env.DATABASE_URL ? 'exists' : 'missing'
      });
    }
    
    // Test if we can create a Prisma client
    let client: any;
    try {
      client = new PrismaClient({
        log: ['error'],
        datasources: {
          db: {
            url: process.env.DATABASE_URL,
          },
        },
      });
    } catch (error) {
      return NextResponse.json({
        success: false,
        error: 'Prisma client creation failed',
        details: error instanceof Error ? error.message : String(error),
        nodeVersion: process.version,
        nodeEnv: process.env.NODE_ENV,
        databaseUrl: process.env.DATABASE_URL ? 'exists' : 'missing'
      });
    }
    
    // Test if we can connect to the database
    try {
      await client.$connect();
      const result = await client.$queryRaw`SELECT 1 as test`;
      await client.$disconnect();
      
      return NextResponse.json({
        success: true,
        message: 'Database connection successful',
        testResult: result,
        nodeVersion: process.version,
        nodeEnv: process.env.NODE_ENV
      });
    } catch (error) {
      return NextResponse.json({
        success: false,
        error: 'Database connection failed',
        details: error instanceof Error ? error.message : String(error),
        nodeVersion: process.version,
        nodeEnv: process.env.NODE_ENV,
        databaseUrl: process.env.DATABASE_URL ? 'exists' : 'missing'
      });
    }
    
  } catch (error) {
    return NextResponse.json({
      success: false,
      error: 'Unexpected error',
      details: error instanceof Error ? error.message : String(error),
      nodeVersion: process.version,
      nodeEnv: process.env.NODE_ENV
    });
  }
}
