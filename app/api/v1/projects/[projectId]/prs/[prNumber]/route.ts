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
      }
    });

    if (!existingPR) {
      return NextResponse.json(
        { success: false, message: 'Pull request not found' },
        { status: 404 }
      );
    }

    const updatedPR = await prisma.pullRequest.update({
      where: {
        projectId_prNumber: {
          projectId: projectIdNum,
          prNumber: prNumberNum
        }
      },
      data: updateData,
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
      data: updatedPR,
      message: 'Pull request updated successfully'
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
