import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const createProjectSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  repoUrl: z.string().url(),
  budget: z.number().positive(),
  adminId: z.number().int().positive(),
});

const querySchema = z.object({
  page: z.string().transform(Number).pipe(z.number().min(1)).default(1),
  limit: z.string().transform(Number).pipe(z.number().min(1).max(100)).default(20),
  search: z.string().optional(),
  adminId: z.string().transform(Number).optional(),
});

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const { page, limit, search, adminId } = querySchema.parse(Object.fromEntries(searchParams));

    // Build where clause
    const where: any = {};
    
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
      ];
    }

    if (adminId) {
      where.adminId = adminId;
    }

    // Get total count
    const total = await prisma.project.count({ where });

    // Get paginated projects
    const projects = await prisma.project.findMany({
      where,
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
        }
      },
      skip: (page - 1) * limit,
      take: limit,
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({
      success: true,
      data: projects,
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

    console.error('Projects fetch error:', error);
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
    // TODO: Implement admin authentication middleware
    const body = await request.json();
    const projectData = createProjectSchema.parse(body);

    // Verify admin exists
    const admin = await prisma.admin.findUnique({
      where: { id: projectData.adminId }
    });

    if (!admin) {
      return NextResponse.json(
        { success: false, message: 'Admin not found' },
        { status: 404 }
      );
    }

    const newProject = await prisma.project.create({
      data: projectData,
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
      data: newProject,
      message: 'Project created successfully'
    }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, message: 'Invalid input data', errors: error.errors },
        { status: 400 }
      );
    }

    console.error('Project creation error:', error);
    return NextResponse.json(
      { success: false, message: 'Internal server error' },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}
