import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const databaseUrl = process.env.DATABASE_URL;
    
    if (!databaseUrl) {
      return NextResponse.json({
        success: false,
        error: 'DATABASE_URL not found in environment variables',
        nodeEnv: process.env.NODE_ENV
      });
    }

    // Test basic connection
    try {
      const { neon } = await import('@neondatabase/serverless');
      const sql = neon(databaseUrl);
      
      // Simple test query
      const result = await sql.query('SELECT 1 as test');
      
      return NextResponse.json({
        success: true,
        message: 'Database connection successful',
        testResult: result,
        databaseUrl: databaseUrl.substring(0, 20) + '...' // Show first 20 chars for security
      });
    } catch (dbError) {
      return NextResponse.json({
        success: false,
        error: 'Database connection failed',
        details: dbError instanceof Error ? dbError.message : String(dbError),
        databaseUrl: databaseUrl.substring(0, 20) + '...'
      });
    }
    
  } catch (error) {
    return NextResponse.json({
      success: false,
      error: 'Unexpected error',
      details: error instanceof Error ? error.message : String(error)
    });
  }
}
