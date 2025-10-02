import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
  try {
    // TODO: Implement admin authentication middleware
    
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    // Get overview metrics
    const [
      totalProjects,
      totalDevelopers,
      totalPRs,
      mergedPRs,
      totalPayouts,
      recentPRs,
      recentPayouts
    ] = await Promise.all([
      prisma.project.count(),
      prisma.developer.count(),
      prisma.pullRequest.count(),
      prisma.pullRequest.count({ where: { merged: true } }),
      prisma.payout.aggregate({
        _sum: { amount: true }
      }),
      prisma.pullRequest.count({
        where: { createdAt: { gte: thirtyDaysAgo } }
      }),
      prisma.payout.count({
        where: { paidAt: { gte: thirtyDaysAgo } }
      })
    ]);

    // Get payouts information
    const projectsWithPayouts = await prisma.project.findMany({
      select: {
        Payout: {
          select: { amount: true }
        }
      }
    });

    const totalBudget = 0;
    const totalSpent = projectsWithPayouts.reduce((sum, project) => 
      sum + project.Payout.reduce((payoutSum, payout) => payoutSum + payout.amount, 0), 0
    );

    // Get top performing developers
    const topDevelopers = await prisma.developer.findMany({
      select: {
        id: true,
        username: true,
        githubId: true,
        _count: {
          select: {
            PullRequest: true,
            Payout: true,
          }
        },
        Payout: {
          select: { amount: true }
        }
      },
      orderBy: {
        Payout: {
          _count: 'desc'
        }
      },
      take: 5
    });

    const topDevelopersWithStats = topDevelopers.map(dev => {
      const totalEarnings = dev.Payout.reduce((sum, payout) => sum + payout.amount, 0);
      return {
        id: dev.id,
        username: dev.username,
        githubId: dev.githubId,
        totalEarnings,
        totalPRs: dev._count.PullRequest,
        totalPayouts: dev._count.Payout,
        averageEarnings: dev._count.Payout > 0 ? totalEarnings / dev._count.Payout : 0,
      };
    });

    // Get project performance
    const projectPerformance = await prisma.project.findMany({
      select: {
        id: true,
        name: true,
        _count: {
          select: {
            PullRequest: true,
            Payout: true,
          }
        },
        PullRequest: {
          select: {
            merged: true,
            score: true,
          }
        },
        Payout: {
          select: { amount: true }
        }
      }
    });

    const projectPerformanceWithStats = projectPerformance.map(project => {
      const mergedPRs = project.PullRequest.filter(pr => pr.merged).length;
      const totalPayouts = project.Payout.reduce((sum, p) => sum + p.amount, 0);
      const averageScore = project.PullRequest.length > 0 ? 
        project.PullRequest.reduce((sum, pr) => sum + pr.score, 0) / project.PullRequest.length : 0;
      
      return {
        id: project.id,
        name: project.name,
        totalPRs: project._count.PullRequest,
        mergedPRs,
        totalPayouts,
        budgetUtilization: 0,
        averageScore: Math.round(averageScore * 10) / 10,
      };
    });

    // Monthly trends (last 3 months)
    const monthlyData = [];
    for (let i = 2; i >= 0; i--) {
      const monthStart = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthEnd = new Date(now.getFullYear(), now.getMonth() - i + 1, 0);
      
      const [monthPRs, monthPayouts] = await Promise.all([
        prisma.pullRequest.count({
          where: {
            createdAt: { gte: monthStart, lte: monthEnd }
          }
        }),
        prisma.payout.aggregate({
          where: {
            paidAt: { gte: monthStart, lte: monthEnd }
          },
          _sum: { amount: true }
        })
      ]);

      monthlyData.push({
        month: monthStart.toLocaleDateString('en-US', { month: 'short', year: 'numeric' }),
        pullRequests: monthPRs,
        payouts: monthPayouts._sum.amount || 0,
        mergedPRs: 0, // TODO: Add merged PR count for the month
      });
    }

    return NextResponse.json({
      success: true,
      data: {
        overview: {
          totalInitialFunding: totalBudget,
          totalSpent,
          remainingInitialFunding: totalBudget - totalSpent,
          totalProjects,
          totalDevelopers,
          totalPRs,
          mergedPRs,
          openPRs: totalPRs - mergedPRs,
        },
        recentActivity: {
          pullRequests: recentPRs,
          payouts: recentPayouts,
          newDevelopers: 0, // TODO: Add new developers count for the month
        },
        monthlyTrends: monthlyData,
        topDevelopers: topDevelopersWithStats,
        projectPerformance: projectPerformanceWithStats,
        quickStats: {
          averagePRScore: 8.5, // TODO: Calculate from actual PR scores
          averagePayoutAmount: totalPayouts._sum.amount && mergedPRs > 0 ? 
            totalPayouts._sum.amount / mergedPRs : 0,
          projectSuccessRate: totalPRs > 0 ? (mergedPRs / totalPRs) * 100 : 0,
          fundingUtilizationRate: totalBudget > 0 ? (totalSpent / totalBudget) * 100 : 0,
        }
      }
    });
  } catch (error) {
    console.error('Admin dashboard error:', error);
    return NextResponse.json(
      { success: false, message: 'Internal server error' },
      { status: 500 }
    );
  }
}
