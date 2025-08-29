import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function GET(
  request: NextRequest,
  { params }: { params: { developerId: string } }
) {
  try {
    const { developerId } = params;
    const developerIdNum = parseInt(developerId);

    if (isNaN(developerIdNum)) {
      return NextResponse.json(
        { success: false, message: 'Invalid developer ID' },
        { status: 400 }
      );
    }

    const developer = await prisma.developer.findUnique({
      where: { id: developerIdNum },
      include: {
        _count: {
          select: {
            prs: true,
            payouts: true,
          }
        },
        prs: {
          take: 10,
          orderBy: { createdAt: 'desc' },
          include: {
            project: {
              select: {
                id: true,
                name: true,
              }
            }
          }
        },
        payouts: {
          take: 10,
          orderBy: { paidAt: 'desc' },
          include: {
            project: {
              select: {
                id: true,
                name: true,
              }
            }
          }
        }
      }
    });

    if (!developer) {
      return NextResponse.json(
        { success: false, message: 'Developer not found' },
        { status: 404 }
      );
    }

    // Calculate additional stats
    const totalEarnings = developer.payouts.reduce((sum, payout) => sum + payout.amount, 0);
    const activeProjects = new Set(developer.payouts.map(p => p.projectId)).size;
    const averageScore = developer.prs.length > 0 ? 
      developer.prs.reduce((sum, pr) => sum + pr.score, 0) / developer.prs.length : 0;

    // Get project breakdown
    const projectBreakdown = await prisma.project.findMany({
      where: {
        pullRequests: {
          some: {
            developerId: developerIdNum
          }
        }
      },
      include: {
        _count: {
          select: {
            pullRequests: {
              where: {
                developerId: developerIdNum
              }
            },
            payouts: {
              where: {
                developerId: developerIdNum
              }
            }
          }
        },
        pullRequests: {
          where: {
            developerId: developerIdNum
          },
          select: {
            score: true,
            amountPaid: true,
            merged: true,
          }
        }
      }
    });

    const developerWithStats = {
      ...developer,
      totalEarnings,
      activeProjects,
      averageScore: Math.round(averageScore * 10) / 10,
      projectBreakdown: projectBreakdown.map(project => ({
        id: project.id,
        name: project.name,
        totalPRs: project._count.pullRequests,
        mergedPRs: project.pullRequests.filter(pr => pr.merged).length,
        totalEarnings: project.pullRequests.reduce((sum, pr) => sum + pr.amountPaid, 0),
        averageScore: project.pullRequests.length > 0 ? 
          project.pullRequests.reduce((sum, pr) => sum + pr.score, 0) / project.pullRequests.length : 0,
      })),
      recentActivity: [
        ...developer.prs.slice(0, 5).map(pr => ({
          type: 'pr_merged',
          project: pr.project.name,
          date: pr.createdAt,
          amount: pr.amountPaid,
        })),
        ...developer.payouts.slice(0, 5).map(payout => ({
          type: 'payout',
          project: payout.project.name,
          date: payout.paidAt,
          amount: payout.amount,
        }))
      ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).slice(0, 10)
    };

    return NextResponse.json({
      success: true,
      data: developerWithStats
    });
  } catch (error) {
    console.error('Developer fetch error:', error);
    return NextResponse.json(
      { success: false, message: 'Internal server error' },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}
