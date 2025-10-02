import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';

const querySchema = z.object({
  page: z.string().transform(Number).pipe(z.number().min(1)).default('1'),
  limit: z.string().transform(Number).pipe(z.number().min(1).max(100)).default('20'),
  projectId: z.string().transform(Number).optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
});

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ developerId: string }> }
) {
  try {
    const { developerId } = await params;
    const developerIdNum = parseInt(developerId);
    const { searchParams } = new URL(request.url);
    const { page, limit, projectId, startDate, endDate } = querySchema.parse(Object.fromEntries(searchParams));

    if (isNaN(developerIdNum)) {
      return NextResponse.json(
        { success: false, message: 'Invalid developer ID' },
        { status: 400 }
      );
    }

    // Verify developer exists
    const developer = await prisma.developer.findUnique({
      where: { id: developerIdNum }
    });

    if (!developer) {
      return NextResponse.json(
        { success: false, message: 'Developer not found' },
        { status: 404 }
      );
    }

    // Build where clause
    const where: Record<string, unknown> = { developerId: developerIdNum };
    
    if (projectId) {
      where.projectId = projectId;
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
        Developer: {
          select: {
            id: true,
            username: true,
            githubId: true,
          }
        },
        Project: {
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

    // Get project breakdown
    const projectBreakdown = await prisma.project.findMany({
      where: {
        PullRequest: {
          some: {
            developerId: developerIdNum
          }
        }
      },
      include: {
        _count: {
          select: {
            PullRequest: {
              where: {
                developerId: developerIdNum
              }
            },
            Payout: {
              where: {
                developerId: developerIdNum
              }
            }
          }
        },
        PullRequest: {
          where: {
            developerId: developerIdNum
          },
          select: {
            score: true,
            amountPaid: true,
            merged: true,
          }
        },
        Payout: {
          where: {
            developerId: developerIdNum
          },
          select: {
            amount: true,
            paidAt: true,
          }
        }
      }
    });

    const projectBreakdownWithStats = projectBreakdown.map(project => {
      const projectPayouts = project.Payout;
      const totalProjectAmount = projectPayouts.reduce((sum: number, p: { amount: number }) => sum + p.amount, 0);
      
      return {
        id: project.id,
        name: project.name,
        totalPRs: project._count.PullRequest,
        mergedPRs: project.PullRequest.filter(pr => pr.merged).length,
        totalEarnings: project.PullRequest.reduce((sum, pr) => sum + pr.amountPaid, 0),
        averageScore: project.PullRequest.length > 0 ? 
          project.PullRequest.reduce((sum, pr) => sum + pr.score, 0) / project.PullRequest.length : 0,
        payoutCount: project._count.Payout,
        totalPayouts: totalProjectAmount,
        averagePayout: project._count.Payout > 0 ? totalProjectAmount / project._count.Payout : 0,
      };
    });

    return NextResponse.json({
      success: true,
      data: payouts,
      summary: {
        totalPayouts: total,
        totalAmount,
        averagePayout: total > 0 ? totalAmount / total : 0,
      },
      projectBreakdown: projectBreakdownWithStats,
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

    console.error('Developer payouts fetch error:', error);
    return NextResponse.json(
      { success: false, message: 'Internal server error' },
      { status: 500 }
    );
  }
}
