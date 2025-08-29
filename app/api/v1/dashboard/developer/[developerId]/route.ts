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
    
    // TODO: Implement developer authentication middleware
    
    if (isNaN(developerIdNum)) {
      return NextResponse.json(
        { success: false, message: 'Invalid developer ID' },
        { status: 400 }
      );
    }

    const developer = await prisma.developer.findUnique({
      where: { id: developerIdNum }
    });

    if (!developer) {
      return NextResponse.json(
        { success: false, message: 'Developer not found' },
        { status: 404 }
      );
    }

    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    // Get developer's PRs and payouts
    const [developerPRs, developerPayouts] = await Promise.all([
      prisma.pullRequest.findMany({
        where: { developerId: developerIdNum },
        include: {
          project: {
            select: {
              id: true,
              name: true,
            }
          }
        },
        orderBy: { createdAt: 'desc' }
      }),
      prisma.payout.findMany({
        where: { developerId: developerIdNum },
        include: {
          project: {
            select: {
              id: true,
              name: true,
            }
          }
        },
        orderBy: { paidAt: 'desc' }
      })
    ]);

    // Calculate metrics
    const totalEarnings = developerPayouts.reduce((sum, p) => sum + p.amount, 0);
    const mergedPRs = developerPRs.filter(pr => pr.merged).length;
    const openPRs = developerPRs.filter(pr => !pr.merged).length;
    const totalPRs = developerPRs.length;
    const averageScore = developerPRs.length > 0 ? 
      developerPRs.reduce((sum, pr) => sum + pr.score, 0) / developerPRs.length : 0;

    // Recent activity (last 30 days)
    const recentPRs = developerPRs.filter(pr => 
      new Date(pr.createdAt) > thirtyDaysAgo
    );
    const recentPayouts = developerPayouts.filter(payout => 
      new Date(payout.paidAt) > thirtyDaysAgo
    );

    // Monthly earnings (last 6 months)
    const monthlyEarnings = [];
    for (let i = 5; i >= 0; i--) {
      const monthStart = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthEnd = new Date(now.getFullYear(), now.getMonth() - i + 1, 0);
      
      const monthPayouts = developerPayouts.filter(payout => {
        const payoutDate = new Date(payout.paidAt);
        return payoutDate >= monthStart && payoutDate <= monthEnd;
      });

      monthlyEarnings.push({
        month: monthStart.toLocaleDateString('en-US', { month: 'short', year: 'numeric' }),
        earnings: monthPayouts.reduce((sum, p) => sum + p.amount, 0),
        prs: monthPayouts.length,
      });
    }

    // Project breakdown
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

    const projectBreakdownWithStats = projectBreakdown.map(project => ({
      id: project.id,
      name: project.name,
      totalPRs: project._count.pullRequests,
      mergedPRs: project.pullRequests.filter(pr => pr.merged).length,
      totalEarnings: project.pullRequests.reduce((sum, pr) => sum + pr.amountPaid, 0),
      averageScore: project.pullRequests.length > 0 ? 
        project.pullRequests.reduce((sum, pr) => sum + pr.score, 0) / project.pullRequests.length : 0,
    }));

    // Recent PRs with details
    const recentPRDetails = recentPRs.slice(0, 5).map(pr => ({
      id: pr.id,
      prNumber: pr.prNumber,
      title: pr.title,
      projectName: pr.project.name,
      merged: pr.merged,
      amountPaid: pr.amountPaid,
      score: pr.score,
      createdAt: pr.createdAt,
    }));

    // Recent payouts
    const recentPayoutDetails = recentPayouts.slice(0, 5).map(payout => ({
      id: payout.id,
      amount: payout.amount,
      projectName: payout.project.name,
      paidAt: payout.paidAt,
    }));

    // Combine recent activity
    const recentActivity = [
      ...recentPRDetails.map(pr => ({
        type: 'pr_merged',
        project: pr.projectName,
        date: pr.createdAt,
        amount: pr.amountPaid,
      })),
      ...recentPayoutDetails.map(payout => ({
        type: 'payout',
        project: payout.projectName,
        date: payout.paidAt,
        amount: payout.amount,
      }))
    ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).slice(0, 10);

    return NextResponse.json({
      success: true,
      data: {
        profile: {
          id: developer.id,
          githubId: developer.githubId,
          username: developer.username,
          joinedAt: developer.createdAt,
        },
        overview: {
          totalEarnings,
          totalPRs,
          mergedPRs,
          openPRs,
          averageScore: Math.round(averageScore * 10) / 10,
          activeProjects: projectBreakdownWithStats.length,
        },
        recentActivity: {
          pullRequests: recentPRs.length,
          payouts: recentPayouts.length,
          lastActivity: recentActivity.length > 0 ? 
            recentActivity[0].date : developer.createdAt,
        },
        monthlyEarnings,
        projectBreakdown: projectBreakdownWithStats,
        recentPRs: recentPRDetails,
        recentPayouts: recentPayoutDetails,
        activityFeed: recentActivity,
        performance: {
          prSuccessRate: totalPRs > 0 ? (mergedPRs / totalPRs) * 100 : 0,
          averageEarningsPerPR: mergedPRs > 0 ? totalEarnings / mergedPRs : 0,
          responseTime: '2.3 days', // TODO: Calculate actual response time
          codeQuality: averageScore > 8 ? 'Excellent' : averageScore > 7 ? 'Good' : 'Average',
        }
      }
    });
  } catch (error) {
    console.error('Developer dashboard error:', error);
    return NextResponse.json(
      { success: false, message: 'Internal server error' },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}
