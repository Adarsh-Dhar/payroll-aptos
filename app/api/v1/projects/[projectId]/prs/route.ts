import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
const createPRSchema = z.object({
  prNumber: z.number().positive(),
  title: z.string().min(1),
  description: z.string().optional(),
  additions: z.number().min(0),
  deletions: z.number().min(0),
  hasTests: z.boolean().default(false),
  linkedIssue: z.string().optional(),
  merged: z.boolean().default(false),
  score: z.number().min(0).max(10),
  amountPaid: z.number().min(0).default(0),
  developerId: z.number().int().positive(),
});

const querySchema = z.object({
  page: z.string().transform(Number).pipe(z.number().min(1)).default('1'),
  limit: z.string().transform(Number).pipe(z.number().min(1).max(100)).default('20'),
  merged: z.string().transform(val => val === 'true').optional(),
  developerId: z.string().transform(Number).optional(),
  search: z.string().optional(),
});

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
) {
  try {
    const { projectId } = await params;
    const projectIdNum = parseInt(projectId);
    const { searchParams } = new URL(request.url);
    const { page, limit, merged, developerId, search } = querySchema.parse(Object.fromEntries(searchParams));

    if (isNaN(projectIdNum)) {
      return NextResponse.json(
        { success: false, message: 'Invalid project ID' },
        { status: 400 }
      );
    }

    // Verify project exists
    const project = await prisma.project.findUnique({
      where: { id: projectIdNum }
    });

    if (!project) {
      return NextResponse.json(
        { success: false, message: 'Project not found' },
        { status: 404 }
      );
    }

    // Build where clause
    const where: Record<string, unknown> = { projectId: projectIdNum };
    
    if (merged !== undefined) {
      where.merged = merged;
    }

    if (developerId) {
      where.developerId = developerId;
    }

    if (search) {
      where.OR = [
        { title: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
      ];
    }

    // Get total count
    const total = await prisma.pullRequest.count({ where });

    // Get paginated PRs
    const pullRequests = await prisma.pullRequest.findMany({
      where,
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
          }
        }
      },
      skip: (page - 1) * limit,
      take: limit,
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({
      success: true,
      data: pullRequests,
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

    console.error('PRs fetch error:', error);
    return NextResponse.json(
      { success: false, message: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: { projectId: string } }
) {
  try {
    const { projectId } = params;
    const projectIdNum = parseInt(projectId);
    const body = await request.json();
    const prData = createPRSchema.parse(body);

    if (isNaN(projectIdNum)) {
      return NextResponse.json(
        { success: false, message: 'Invalid project ID' },
        { status: 400 }
      );
    }

    // Verify project exists
    const project = await prisma.project.findUnique({
      where: { id: projectIdNum }
    });

    if (!project) {
      return NextResponse.json(
        { success: false, message: 'Project not found' },
        { status: 404 }
      );
    }

    // Verify developer exists
    const developer = await prisma.developer.findUnique({
      where: { id: prData.developerId }
    });

    if (!developer) {
      return NextResponse.json(
        { success: false, message: 'Developer not found' },
        { status: 404 }
      );
    }

    // Check if PR already exists
    const existingPR = await prisma.pullRequest.findUnique({
      where: {
        projectId_prNumber: {
          projectId: projectIdNum,
          prNumber: prData.prNumber
        }
      }
    });

    if (existingPR) {
      return NextResponse.json({
        success: false,
        message: 'Pull request already exists',
        data: existingPR
      }, { status: 409 });
    }

    // Calculate bounty amount using the formula: L + (D * x / 10)
    // where L = lowest bounty, D = difference between highest and lowest, x = score
    const lowestBounty = project.lowestBounty;
    const highestBounty = project.highestBounty;
    const difference = highestBounty - lowestBounty;
    const score = prData.score;
    
    const bountyAmount = lowestBounty + (difference * score / 10);

    const newPR = await prisma.pullRequest.create({
      data: {
        ...prData,
        projectId: projectIdNum,
        bountyAmount: bountyAmount,
        updatedAt: new Date(),
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
            lowestBounty: true,
            highestBounty: true,
          }
        }
      }
    });

    return NextResponse.json({
      success: true,
      data: newPR,
      message: 'Pull request created successfully',
      bountyCalculation: {
        lowestBounty,
        highestBounty,
        difference,
        score,
        calculatedBounty: bountyAmount,
        formula: `L + (D × x / 10) = ${lowestBounty} + (${difference} × ${score} / 10) = ${bountyAmount}`
      }
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, message: 'Invalid input data', errors: error.errors },
        { status: 400 }
      );
    }

    console.error('PR creation error:', error);
    return NextResponse.json(
      { success: false, message: 'Internal server error' },
      { status: 500 }
    );
  }
}
