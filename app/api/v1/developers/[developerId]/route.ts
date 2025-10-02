import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ developerId: string }> }
) {
  try {
    const { developerId } = await params;
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
            PullRequest: true,
            Payout: true,
          }
        },
        PullRequest: {
          take: 10,
          orderBy: { createdAt: 'desc' },
          include: {
            Project: {
              select: {
                id: true,
                name: true,
              }
            }
          }
        },
        Payout: {
          take: 10,
          orderBy: { paidAt: 'desc' },
          include: {
            Project: {
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
    const totalEarnings = developer.Payout.reduce((sum, payout) => sum + payout.amount, 0);
    const activeProjects = new Set(developer.Payout.map(p => p.projectId)).size;
    const averageScore = developer.PullRequest.length > 0 ? 
      developer.PullRequest.reduce((sum, pr) => sum + pr.score, 0) / developer.PullRequest.length : 0;

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
        totalPRs: project._count.PullRequest,
        mergedPRs: project.PullRequest.filter(pr => pr.merged).length,
        totalEarnings: project.PullRequest.reduce((sum, pr) => sum + pr.amountPaid, 0),
        averageScore: project.PullRequest.length > 0 ? 
          project.PullRequest.reduce((sum, pr) => sum + pr.score, 0) / project.PullRequest.length : 0,
      })),
      recentActivity: [
        ...developer.PullRequest.slice(0, 5).map(pr => ({
          type: 'pr_merged',
          project: pr.Project.name,
          date: pr.createdAt,
          amount: pr.amountPaid,
        })),
        ...developer.Payout.slice(0, 5).map(payout => ({
          type: 'payout',
          project: payout.Project.name,
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
  } finally {}
}
