import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const createDeveloperSchema = z.object({
  githubId: z.string().min(1),
  username: z.string().min(1),
});

const querySchema = z.object({
  page: z.string().transform(Number).pipe(z.number().min(1)).default('1'),
  limit: z.string().transform(Number).pipe(z.number().min(1).max(100)).default('20'),
  search: z.string().optional(),
  active: z.string().transform(val => val === 'true').optional(),
});

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const { page, limit, search, active } = querySchema.parse(Object.fromEntries(searchParams));

    // Build where clause
    const where: any = {};
    
    if (search) {
      where.OR = [
        { username: { contains: search, mode: 'insensitive' } },
        { githubId: { contains: search, mode: 'insensitive' } },
      ];
    }

    // Get total count
    const total = await prisma.developer.count({ where });

    // Get paginated developers
    const developers = await prisma.developer.findMany({
      where,
      include: {
        _count: {
          select: {
            prs: true,
            payouts: true,
          }
        },
        payouts: {
          select: {
            amount: true,
            paidAt: true,
            projectId: true,
          }
        }
      },
      skip: (page - 1) * limit,
      take: limit,
      orderBy: { createdAt: 'desc' },
    });

    // Calculate additional stats
    const developersWithStats = developers.map(dev => {
      const totalEarnings = dev.payouts.reduce((sum, payout) => sum + payout.amount, 0);
      const activeProjects = new Set(dev.payouts.map(p => p.projectId)).size;
      
      return {
        ...dev,
        totalEarnings,
        activeProjects,
        averageScore: dev._count.prs > 0 ? 8.5 : 0, // TODO: Calculate from actual PR scores
      };
    });

    return NextResponse.json({
      success: true,
      data: developersWithStats,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      }
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, message: 'Invalid query parameters', errors: error.errors },
        { status: 400 }
      );
    }

    console.error('Developers fetch error:', error);
    return NextResponse.json(
      { success: false, message: 'Internal server error' },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const developerData = createDeveloperSchema.parse(body);

    // Check if developer already exists
    const existingDeveloper = await prisma.developer.findUnique({
      where: { githubId: developerData.githubId }
    });

    if (existingDeveloper) {
      return NextResponse.json({
        success: false,
        message: 'Developer already exists',
        data: existingDeveloper
      }, { status: 409 });
    }

    const newDeveloper = await prisma.developer.create({
      data: developerData,
      include: {
        _count: {
          select: {
            prs: true,
            payouts: true,
          }
        }
      }
    });

    return NextResponse.json({
      success: true,
      data: newDeveloper,
      message: 'Developer registered successfully'
    }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, message: 'Invalid input data', errors: error.errors },
        { status: 400 }
      );
    }

    console.error('Developer creation error:', error);
    return NextResponse.json(
      { success: false, message: 'Internal server error' },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}
