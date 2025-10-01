import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { PrismaClient } from '@prisma/client';
import { authenticateAdmin } from '../../middleware/auth';

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
  // Accept but don't persist initialFunding; it's not a DB column
  initialFunding: z.number().optional(),
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


    // Get total count
    const total = await prisma.project.count({ where });

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
    // Authenticate admin user
    const authResult = await authenticateAdmin(request);
    
    if (!authResult.success) {
      return NextResponse.json(
        { success: false, message: authResult.error },
        { status: authResult.status || 401 }
      );
    }

    const { admin } = authResult;
    if (!admin) {
      return NextResponse.json(
        { success: false, message: 'Admin data not found after authentication' },
        { status: 500 }
      );
    }
    
    const body = await request.json();
    
    // Remove adminId from body since we'll use the authenticated user's ID
    const { adminId, ...projectDataWithoutAdminId } = body;
    
    const projectData = createProjectSchema.parse({
      ...projectDataWithoutAdminId,
      adminId: admin.id // Use authenticated admin's ID
    });

    // Validate bounty range
    if (projectData.lowestBounty >= projectData.highestBounty) {
      return NextResponse.json(
        { success: false, message: 'Highest bounty must be greater than lowest bounty' },
        { status: 400 }
      );
    }

    // Verify admin exists (should always exist after authentication)
    const adminCheck = await prisma.admin.findUnique({
      where: { id: projectData.adminId }
    });

    if (!adminCheck) {
      return NextResponse.json(
        { success: false, message: 'Admin not found' },
        { status: 404 }
      );
    }

    // Strip non-persisted fields before writing to DB
    const { initialFunding, ...projectCreateData } = projectData as any;

    let newProject;
    try {
      newProject = await prisma.project.create({
        data: {
          ...projectCreateData,
          updatedAt: new Date(),
        } as any,
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
    } catch (e: any) {
      const message = e?.message || '';
      // Fallback for legacy DBs that still have a NOT NULL budget column
      if (message.includes('budget')) {
        const now = new Date();
        const params = [
          projectCreateData.name,
          projectCreateData.description ?? null,
          projectCreateData.repoUrl,
          projectCreateData.adminId,
          now,
          projectCreateData.isActive ?? true,
          projectCreateData.maxContributors ?? null,
          projectCreateData.tags ?? [],
          projectCreateData.highestBounty,
          projectCreateData.lowestBounty,
          now,
          // Provide a sensible default budget (use highestBounty as starter)
          projectCreateData.highestBounty || 0
        ];

        // Attempt raw insert including budget column; works even if Prisma schema is behind DB
        const insertSql = `
          INSERT INTO "Project" (
            "name", "description", "repoUrl", "adminId",
            "createdAt", "isActive", "maxContributors", "tags",
            "highestBounty", "lowestBounty", "updatedAt", "budget"
          ) VALUES (
            $1, $2, $3, $4,
            $5, $6, $7, $8,
            $9, $10, $11, $12
          ) RETURNING *
        `;

        const rows = await prisma.$queryRawUnsafe<any[]>(insertSql, ...params);
        const inserted = rows && rows[0];
        if (!inserted) throw e;

        // Hydrate Admin selection to match include
        const withAdmin = await prisma.project.findUnique({
          where: { id: inserted.id },
          include: {
            Admin: {
              select: { id: true, name: true, email: true }
            }
          }
        });
        newProject = withAdmin || inserted;
      } else {
        throw e;
      }
    }

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
