import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

const createPRSchema = z.object({
  number: z.number().positive(),
  title: z.string().min(1),
  description: z.string().optional(),
  author: z.string().min(1),
  githubUrl: z.string().url(),
  state: z.enum(['open', 'closed', 'merged']).default('open'),
  baseBranch: z.string().default('main'),
  headBranch: z.string(),
  additions: z.number().min(0).optional(),
  deletions: z.number().min(0).optional(),
  changedFiles: z.number().min(0).optional(),
  reviewScore: z.number().min(0).max(10).optional(),
  mergeDate: z.string().optional(),
});

const querySchema = z.object({
  page: z.string().transform(Number).pipe(z.number().min(1)).default(1),
  limit: z.string().transform(Number).pipe(z.number().min(1).max(100)).default(20),
  state: z.enum(['open', 'closed', 'merged']).optional(),
  author: z.string().optional(),
  search: z.string().optional(),
});

// Mock data - replace with your database
let pullRequests = [
  {
    id: '1',
    projectId: '1',
    number: 42,
    title: 'Add payment processing feature',
    description: 'Implements secure payment processing with Stripe integration',
    author: 'alice-dev',
    githubUrl: 'https://github.com/devpaystream/core/pull/42',
    state: 'merged',
    baseBranch: 'main',
    headBranch: 'feature/payment-processing',
    additions: 450,
    deletions: 23,
    changedFiles: 12,
    reviewScore: 9.2,
    mergeDate: new Date().toISOString(),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    earnings: 150,
  },
  {
    id: '2',
    projectId: '1',
    number: 43,
    title: 'Fix authentication bug',
    description: 'Resolves issue with JWT token validation',
    author: 'bob-coder',
    githubUrl: 'https://github.com/devpaystream/core/pull/43',
    state: 'open',
    baseBranch: 'main',
    headBranch: 'fix/auth-bug',
    additions: 15,
    deletions: 8,
    changedFiles: 3,
    reviewScore: 7.5,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    earnings: 0,
  },
  {
    id: '3',
    projectId: '2',
    number: 15,
    title: 'Implement rate limiting',
    description: 'Adds rate limiting middleware for API endpoints',
    author: 'alice-dev',
    githubUrl: 'https://github.com/devpaystream/gateway/pull/15',
    state: 'merged',
    baseBranch: 'main',
    headBranch: 'feature/rate-limiting',
    additions: 320,
    deletions: 45,
    changedFiles: 8,
    reviewScore: 8.8,
    mergeDate: new Date().toISOString(),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    earnings: 200,
  }
];

export async function GET(
  request: NextRequest,
  { params }: { params: { projectId: string } }
) {
  try {
    const { projectId } = params;
    const { searchParams } = new URL(request.url);
    const { page, limit, state, author, search } = querySchema.parse(Object.fromEntries(searchParams));

    let filteredPRs = pullRequests.filter(pr => pr.projectId === projectId);

    // Apply filters
    if (state) {
      filteredPRs = filteredPRs.filter(pr => pr.state === state);
    }

    if (author) {
      filteredPRs = filteredPRs.filter(pr => pr.author === author);
    }

    if (search) {
      filteredPRs = filteredPRs.filter(pr =>
        pr.title.toLowerCase().includes(search.toLowerCase()) ||
        pr.description?.toLowerCase().includes(search.toLowerCase())
      );
    }

    // Apply pagination
    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + limit;
    const paginatedPRs = filteredPRs.slice(startIndex, endIndex);

    return NextResponse.json({
      success: true,
      data: paginatedPRs,
      pagination: {
        page,
        limit,
        total: filteredPRs.length,
        totalPages: Math.ceil(filteredPRs.length / limit),
      }
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, message: 'Invalid query parameters', errors: error.errors },
        { status: 400 }
      );
    }

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
    const body = await request.json();
    const prData = createPRSchema.parse(body);

    // Check if PR already exists
    const existingPR = pullRequests.find(
      pr => pr.projectId === projectId && pr.number === prData.number
    );

    if (existingPR) {
      return NextResponse.json({
        success: false,
        message: 'Pull request already exists',
        data: existingPR
      }, { status: 409 });
    }

    const newPR = {
      id: Date.now().toString(),
      projectId,
      ...prData,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      earnings: 0,
    };

    pullRequests.push(newPR);

    return NextResponse.json({
      success: true,
      data: newPR,
      message: 'Pull request created successfully'
    }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, message: 'Invalid input data', errors: error.errors },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { success: false, message: 'Internal server error' },
      { status: 500 }
    );
  }
}
