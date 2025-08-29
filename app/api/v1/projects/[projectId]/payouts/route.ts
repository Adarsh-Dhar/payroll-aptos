import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const createPayoutSchema = z.object({
  developerId: z.number().int().positive(),
  amount: z.number().positive(),
});

const querySchema = z.object({
  page: z.string().transform(Number).pipe(z.number().min(1)).default('1'),
  limit: z.string().transform(Number).pipe(z.number().min(1).max(100)).default('20'),
  developerId: z.string().transform(Number).optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
});

export async function GET(
  request: NextRequest,
  { params }: { params: { projectId: string } }
) {
  try {
    const { projectId } = params;
    const projectIdNum = parseInt(projectId);
    const { searchParams } = new URL(request.url);
    const { page, limit, developerId, startDate, endDate } = querySchema.parse(Object.fromEntries(searchParams));

    if (isNaN(projectIdNum)) {
      return NextResponse.json(
        { success: false, message: 'Invalid project ID' },
        { status: 400 }
      );
    }

    // Verify project exists
    const project = await prisma.project.findUnique({
      where: { id: projectIdNum }
    });

    if (!project) {
      return NextResponse.json(
        { success: false, message: 'Project not found' },
        { status: 404 }
      );
    }

    // Build where clause
    const where: any = { projectId: projectIdNum };
    
    if (developerId) {
      where.developerId = developerId;
    }

    if (startDate || endDate) {
      where.paidAt = {};
      if (startDate) {
        where.paidAt.gte = new Date(startDate);
      }
      if (endDate) {
        where.paidAt.lte = new Date(endDate);
      }
    }

    // Get total count
    const total = await prisma.payout.count({ where });

    // Get paginated payouts
    const payouts = await prisma.payout.findMany({
      where,
      include: {
        developer: {
          select: {
            id: true,
            username: true,
            githubId: true,
          }
        },
        project: {
          select: {
            id: true,
            name: true,
          }
        }
      },
      skip: (page - 1) * limit,
      take: limit,
      orderBy: { paidAt: 'desc' },
    });

    // Calculate summary
    const totalAmount = payouts.reduce((sum, payout) => sum + payout.amount, 0);

    return NextResponse.json({
      success: true,
      data: payouts,
      summary: {
        totalPayouts: total,
        totalAmount,
        averagePayout: total > 0 ? totalAmount / total : 0,
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
      return NextResponse.json(
        { success: false, message: 'Invalid query parameters', errors: error.errors },
        { status: 400 }
      );
    }

    console.error('Payouts fetch error:', error);
    return NextResponse.json(
      { success: false, message: 'Internal server error' },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: { projectId: string } }
) {
  try {
    const { projectId } = params;
    const projectIdNum = parseInt(projectId);
    const body = await request.json();
    const payoutData = createPayoutSchema.parse(body);

    if (isNaN(projectIdNum)) {
      return NextResponse.json(
        { success: false, message: 'Invalid project ID' },
        { status: 400 }
      );
    }

    // Verify project exists
    const project = await prisma.project.findUnique({
      where: { id: projectIdNum }
    });

    if (!project) {
      return NextResponse.json(
        { success: false, message: 'Project not found' },
        { status: 404 }
      );
    }

    // Verify developer exists
    const developer = await prisma.developer.findUnique({
      where: { id: payoutData.developerId }
    });

    if (!developer) {
      return NextResponse.json(
        { success: false, message: 'Developer not found' },
        { status: 404 }
      );
    }

    const newPayout = await prisma.payout.create({
      data: {
        ...payoutData,
        projectId: projectIdNum,
      },
      include: {
        developer: {
          select: {
            id: true,
            username: true,
            githubId: true,
          }
        },
        project: {
          select: {
            id: true,
            name: true,
          }
        }
      }
    });

    return NextResponse.json({
      success: true,
      data: newPayout,
      message: 'Payout created successfully'
    }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, message: 'Invalid input data', errors: error.errors },
        { status: 400 }
      );
    }

    console.error('Payout creation error:', error);
    return NextResponse.json(
      { success: false, message: 'Internal server error' },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}
