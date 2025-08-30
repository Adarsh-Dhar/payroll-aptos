import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const updatePRSchema = z.object({
  title: z.string().min(1).optional(),
  description: z.string().optional(),
  merged: z.boolean().optional(),
  score: z.number().min(0).max(10).optional(),
  amountPaid: z.number().min(0).optional(),
  additions: z.number().min(0).optional(),
  deletions: z.number().min(0).optional(),
  hasTests: z.boolean().optional(),
  linkedIssue: z.string().optional(),
});

export async function GET(
  request: NextRequest,
  { params }: { params: { projectId: string; prNumber: string } }
) {
  try {
    const { projectId, prNumber } = params;
    const projectIdNum = parseInt(projectId);
    const prNumberNum = parseInt(prNumber);

    if (isNaN(projectIdNum) || isNaN(prNumberNum)) {
      return NextResponse.json(
        { success: false, message: 'Invalid project ID or PR number' },
        { status: 400 }
      );
    }

    const pr = await prisma.pullRequest.findUnique({
      where: {
        projectId_prNumber: {
          projectId: projectIdNum,
          prNumber: prNumberNum
        }
      },
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
            repoUrl: true,
          }
        }
      }
    });

    if (!pr) {
      return NextResponse.json(
        { success: false, message: 'Pull request not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: pr
    });
  } catch (error) {
    console.error('PR fetch error:', error);
    return NextResponse.json(
      { success: false, message: 'Internal server error' },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { projectId: string; prNumber: string } }
) {
  try {
    const { projectId, prNumber } = params;
    const projectIdNum = parseInt(projectId);
    const prNumberNum = parseInt(prNumber);
    const body = await request.json();
    const updateData = updatePRSchema.parse(body);

    if (isNaN(projectIdNum) || isNaN(prNumberNum)) {
      return NextResponse.json(
        { success: false, message: 'Invalid project ID or PR number' },
        { status: 400 }
      );
    }

    // Check if PR exists
    const existingPR = await prisma.pullRequest.findUnique({
      where: {
        projectId_prNumber: {
          projectId: projectIdNum,
          prNumber: prNumberNum
        }
      },
      include: {
        Project: {
          select: {
            lowestBounty: true,
            highestBounty: true,
          }
        }
      }
    });

    if (!existingPR) {
      return NextResponse.json(
        { success: false, message: 'Pull request not found' },
        { status: 404 }
      );
    }

    // If score is being updated, recalculate bounty amount
    let finalUpdateData: any = { ...updateData, updatedAt: new Date() };
    
    if (updateData.score !== undefined) {
      const lowestBounty = existingPR.Project.lowestBounty;
      const highestBounty = existingPR.Project.highestBounty;
      const difference = highestBounty - lowestBounty;
      const newScore = updateData.score;
      
      const newBountyAmount = lowestBounty + (difference * newScore / 10);
      finalUpdateData = {
        ...finalUpdateData,
        bountyAmount: newBountyAmount,
      };
    }

    const updatedPR = await prisma.pullRequest.update({
      where: {
        projectId_prNumber: {
          projectId: projectIdNum,
          prNumber: prNumberNum
        }
      },
      data: finalUpdateData,
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
            lowestBounty: true,
            highestBounty: true,
          }
        }
      }
    });

    return NextResponse.json({
      success: true,
      data: updatedPR,
      message: 'Pull request updated successfully',
      ...(updateData.score !== undefined && {
        bountyCalculation: {
          lowestBounty: existingPR.Project.lowestBounty,
          highestBounty: existingPR.Project.highestBounty,
          difference: existingPR.Project.highestBounty - existingPR.Project.lowestBounty,
          score: updateData.score,
          calculatedBounty: finalUpdateData.bountyAmount,
          formula: `L + (D × x / 10) = ${existingPR.Project.lowestBounty} + (${existingPR.Project.highestBounty - existingPR.Project.lowestBounty} × ${updateData.score} / 10) = ${finalUpdateData.bountyAmount}`
        }
      })
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, message: 'Invalid input data', errors: error.errors },
        { status: 400 }
      );
    }

    console.error('PR update error:', error);
    return NextResponse.json(
      { success: false, message: 'Internal server error' },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}
