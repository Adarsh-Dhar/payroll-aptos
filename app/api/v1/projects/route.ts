import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { PrismaClient } from '@prisma/client';

// Declare global type for Prisma client
declare global {
  var prisma: PrismaClient | undefined;
}

// Create a singleton Prisma client instance
const prisma = global.prisma || new PrismaClient();

if (process.env.NODE_ENV !== 'production') {
  global.prisma = prisma;
}

const createProjectSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  repoUrl: z.string().url(),
  budget: z.number().positive(),
  lowestBounty: z.number().positive(),
  highestBounty: z.number().positive(),
  adminId: z.number().int().positive(),
  isActive: z.boolean().default(true),
  maxContributors: z.number().int().positive().optional(),
  tags: z.array(z.string()).default([]),
});

const querySchema = z.object({
  page: z.string().transform(Number).pipe(z.number().min(1)).default("1"),
  limit: z.string().transform(Number).pipe(z.number().min(1).max(100)).default("20"),
  search: z.string().optional(),
  adminId: z.string().transform(Number).optional(),
  isActive: z.string().transform(val => val === 'true').optional(),
  tags: z.string().optional(),
});

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const { page, limit, search, adminId, isActive, tags } = querySchema.parse(Object.fromEntries(searchParams));

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

    if (isActive !== undefined) {
      where.isActive = isActive;
    }

    if (tags) {
      const tagArray = tags.split(',').map(tag => tag.trim());
      where.tags = {
        hasSome: tagArray
      };
    }

    console.log('Query parameters:', { page, limit, search, adminId, isActive, tags });
    console.log('Where clause:', JSON.stringify(where, null, 2));

    // Get total count
    const total = await prisma.project.count({ where });
    console.log('Total projects found:', total);

    // Get paginated projects
    const projects = await prisma.project.findMany({
      where,
      include: {
        Admin: {
          select: {
            id: true,
            name: true,
            email: true,
          }
        },
        _count: {
          select: {
            PullRequest: true,
            Payout: true,
          }
        }
      },
      skip: (page - 1) * limit,
      take: limit,
      orderBy: { createdAt: 'desc' },
    });

    console.log('Projects fetched successfully:', projects.length);

    return NextResponse.json({
      success: true,
      data: projects.map(project => ({
        ...project,
        // Ensure bounty fields are included
        lowestBounty: project.lowestBounty || 100,
        highestBounty: project.highestBounty || 1000,
      })),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      }
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      console.error('Validation error:', error.errors);
      return NextResponse.json(
        { success: false, message: 'Invalid query parameters', errors: error.errors },
        { status: 400 }
      );
    }

    console.error('Projects fetch error:', error);
    console.error('Error stack:', error instanceof Error ? error.stack : 'No stack trace');
    
    return NextResponse.json(
      { 
        success: false, 
        message: 'Internal server error',
        error: error instanceof Error ? error.message : 'Unknown error',
        details: process.env.NODE_ENV === 'development' ? error : undefined
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    // TODO: Implement admin authentication middleware
    const body = await request.json();
    const projectData = createProjectSchema.parse(body);

    // Validate bounty range
    if (projectData.lowestBounty >= projectData.highestBounty) {
      return NextResponse.json(
        { success: false, message: 'Highest bounty must be greater than lowest bounty' },
        { status: 400 }
      );
    }

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
      data: {
        ...projectData,
        updatedAt: new Date(),
      } as any, // Use type assertion to bypass the type mismatch
      include: {
        Admin: {
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
  }
}
