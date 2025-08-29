import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const updateProjectSchema = z.object({
  name: z.string().min(1).optional(),
  description: z.string().optional(),
  repoUrl: z.string().url().optional(),
  budget: z.number().positive().optional(),
  adminId: z.number().int().positive().optional(),
});

export async function GET(
  request: NextRequest,
  { params }: { params: { projectId: string } }
) {
  try {
    const { projectId } = params;
    const projectIdNum = parseInt(projectId);

    if (isNaN(projectIdNum)) {
      return NextResponse.json(
        { success: false, message: 'Invalid project ID' },
        { status: 400 }
      );
    }

    const project = await prisma.project.findUnique({
      where: { id: projectIdNum },
      include: {
        admin: {
          select: {
            id: true,
            name: true,
            email: true,
          }
        },
        _count: {
          select: {
            pullRequests: true,
            payouts: true,
          }
        },
        pullRequests: {
          take: 5,
          orderBy: { createdAt: 'desc' },
          include: {
            developer: {
              select: {
                id: true,
                username: true,
              }
            }
          }
        },
        payouts: {
          take: 5,
          orderBy: { paidAt: 'desc' },
          include: {
            developer: {
              select: {
                id: true,
                username: true,
              }
            }
          }
        }
      }
    });

    if (!project) {
      return NextResponse.json(
        { success: false, message: 'Project not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: project
    });
  } catch (error) {
    console.error('Project fetch error:', error);
    return NextResponse.json(
      { success: false, message: 'Internal server error' },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { projectId: string } }
) {
  try {
    // TODO: Implement admin authentication middleware
    const { projectId } = params;
    const projectIdNum = parseInt(projectId);
    const body = await request.json();
    const updateData = updateProjectSchema.parse(body);

    if (isNaN(projectIdNum)) {
      return NextResponse.json(
        { success: false, message: 'Invalid project ID' },
        { status: 400 }
      );
    }

    // Check if project exists
    const existingProject = await prisma.project.findUnique({
      where: { id: projectIdNum }
    });

    if (!existingProject) {
      return NextResponse.json(
        { success: false, message: 'Project not found' },
        { status: 404 }
      );
    }

    // If adminId is being updated, verify the new admin exists
    if (updateData.adminId) {
      const admin = await prisma.admin.findUnique({
        where: { id: updateData.adminId }
      });

      if (!admin) {
        return NextResponse.json(
          { success: false, message: 'Admin not found' },
          { status: 404 }
        );
      }
    }

    const updatedProject = await prisma.project.update({
      where: { id: projectIdNum },
      data: updateData,
      include: {
        admin: {
          select: {
            id: true,
            name: true,
            email: true,
          }
        }
      }
    });

    return NextResponse.json({
      success: true,
      data: updatedProject,
      message: 'Project updated successfully'
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, message: 'Invalid input data', errors: error.errors },
        { status: 400 }
      );
    }

    console.error('Project update error:', error);
    return NextResponse.json(
      { success: false, message: 'Internal server error' },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { projectId: string } }
) {
  try {
    // TODO: Implement admin authentication middleware
    const { projectId } = params;
    const projectIdNum = parseInt(projectId);

    if (isNaN(projectIdNum)) {
      return NextResponse.json(
        { success: false, message: 'Invalid project ID' },
        { status: 400 }
      );
    }

    // Check if project exists
    const project = await prisma.project.findUnique({
      where: { id: projectIdNum }
    });

    if (!project) {
      return NextResponse.json(
        { success: false, message: 'Project not found' },
        { status: 404 }
      );
    }

    // Delete related records first (due to foreign key constraints)
    await prisma.payout.deleteMany({
      where: { projectId: projectIdNum }
    });

    await prisma.pullRequest.deleteMany({
      where: { projectId: projectIdNum }
    });

    // Delete the project
    await prisma.project.delete({
      where: { id: projectIdNum }
    });

    return NextResponse.json({
      success: true,
      message: 'Project deleted successfully',
      data: project
    });
  } catch (error) {
    console.error('Project deletion error:', error);
    return NextResponse.json(
      { success: false, message: 'Internal server error' },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}
