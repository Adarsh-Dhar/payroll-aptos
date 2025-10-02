import { NextRequest, NextResponse } from 'next/server';
export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
import { z } from 'zod';
import { authenticateAdmin, type AuthenticateAdminResult } from '../../middleware/auth';
import { Database } from '@/lib/database';

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
  budget: z.number().nonnegative().optional(),
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

    // Use the new Database class instead of Prisma
    const result = await Database.getProjects({
      page,
      limit,
      search,
      adminId,
      isActive,
      tags: tags ? tags.split(',').map(tag => tag.trim()) : undefined
    });

    return NextResponse.json({
      success: true,
      data: result.projects,
      pagination: {
        page,
        limit,
        total: result.total,
        totalPages: result.totalPages,
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
    const authResult: AuthenticateAdminResult = await authenticateAdmin(request);

    console.log('authResult', authResult);
    
    if (!authResult.success) {
      return NextResponse.json(
        { success: false, message: authResult.error },
        { status: authResult.status || 401 }
      );
    }

    // Database instance after auth

    const { admin } = authResult;
    if (!admin) {
      return NextResponse.json(
        { success: false, message: 'Admin data not found after authentication' },
        { status: 500 }
      );
    }
    
    const body = await request.json();
    
    // Remove adminId from body since we'll use the authenticated user's ID
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
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
    const adminCheck = await Database.getAdminById(projectData.adminId);

    if (!adminCheck) {
      return NextResponse.json(
        { success: false, message: 'Admin not found' },
        { status: 404 }
      );
    }

    // Create project using the new Database class
    const newProject = await Database.createProject({
      name: projectData.name,
      description: projectData.description,
      repoUrl: projectData.repoUrl,
      adminId: projectData.adminId,
      isActive: projectData.isActive,
      maxContributors: projectData.maxContributors,
      tags: projectData.tags,
      highestBounty: projectData.highestBounty,
      lowestBounty: projectData.lowestBounty,
      budget: projectData.budget
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
