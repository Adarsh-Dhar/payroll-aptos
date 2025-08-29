import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { PrismaClient } from '@prisma/client';

// Declare global type for Prisma client
declare global {
  var prisma: PrismaClient | undefined;
}

// Create a singleton Prisma client instance
const prisma = global.prisma || new PrismaClient();

if (process.env.NODE_ENV !== 'production') {
  global.prisma = prisma;
}

const querySchema = z.object({
  page: z.string().transform(Number).pipe(z.number().min(1)).default('1'),
  limit: z.string().transform(Number).pipe(z.number().min(1).max(100)).default('20'),
  merged: z.string().transform(val => val === 'true').optional(),
  search: z.string().optional(),
  projectId: z.string().transform(Number).optional(),
});

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const { page, limit, merged, search, projectId } = querySchema.parse(Object.fromEntries(searchParams));

    console.log('Contributor PRs query parameters:', { page, limit, merged, search, projectId });

    // TODO: Implement contributor authentication middleware
    // For now, we'll use a mock developer ID - this should be replaced with actual auth
    const mockDeveloperId = 1; // This should come from the authenticated user

    // Build where clause
    const where: any = { developerId: mockDeveloperId };
    
    if (merged !== undefined) {
      where.merged = merged;
    }

    if (projectId) {
      where.projectId = projectId;
    }

    if (search) {
      where.OR = [
        { title: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
      ];
    }

    console.log('Where clause:', JSON.stringify(where, null, 2));

    // Get total count
    const total = await prisma.pullRequest.count({ where });
    console.log('Total PRs found:', total);

    // Get paginated PRs
    const pullRequests = await prisma.pullRequest.findMany({
      where,
      include: {
        project: {
          select: {
            id: true,
            name: true,
            repoUrl: true,
          }
        },
        developer: {
          select: {
            id: true,
            username: true,
            githubId: true,
          }
        }
      },
      skip: (page - 1) * limit,
      take: limit,
      orderBy: { createdAt: 'desc' },
    });

    console.log('PRs fetched successfully:', pullRequests.length);

    // Calculate additional stats
    const totalEarnings = pullRequests.reduce((sum, pr) => sum + pr.amountPaid, 0);
    const mergedPRs = pullRequests.filter(pr => pr.merged).length;
    const openPRs = pullRequests.filter(pr => !pr.merged).length;
    const averageScore = pullRequests.length > 0 ? 
      pullRequests.reduce((sum, pr) => sum + pr.score, 0) / pullRequests.length : 0;

    return NextResponse.json({
      success: true,
      data: pullRequests,
      stats: {
        totalEarnings,
        mergedPRs,
        openPRs,
        totalPRs: pullRequests.length,
        averageScore: Math.round(averageScore * 10) / 10,
      },
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      }
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      console.error('Validation error:', error.errors);
      return NextResponse.json(
        { success: false, message: 'Invalid query parameters', errors: error.errors },
        { status: 400 }
      );
    }

    console.error('Contributor PRs fetch error:', error);
    console.error('Error stack:', error instanceof Error ? error.stack : 'No stack trace');
    
    return NextResponse.json(
      { 
        success: false, 
        message: 'Internal server error',
        error: error instanceof Error ? error.message : 'Unknown error',
        details: process.env.NODE_ENV === 'development' ? error : undefined
      },
      { status: 500 }
    );
  }
}
