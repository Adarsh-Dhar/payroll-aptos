import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

const updatePRSchema = z.object({
  title: z.string().min(1).optional(),
  description: z.string().optional(),
  state: z.enum(['open', 'closed', 'merged']).optional(),
  reviewScore: z.number().min(0).max(10).optional(),
  mergeDate: z.string().optional(),
  additions: z.number().min(0).optional(),
  deletions: z.number().min(0).optional(),
  changedFiles: z.number().min(0).optional(),
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
    reviews: [
      {
        reviewer: 'bob-coder',
        status: 'approved',
        comment: 'Great implementation! Very clean code.',
        score: 9.5,
        date: new Date().toISOString(),
      }
    ],
    commits: [
      {
        sha: 'abc123',
        message: 'Add payment processing core',
        author: 'alice-dev',
        date: new Date().toISOString(),
      },
      {
        sha: 'def456',
        message: 'Add tests for payment processing',
        author: 'alice-dev',
        date: new Date().toISOString(),
      }
    ],
    files: [
      {
        name: 'src/payment/processor.ts',
        status: 'added',
        additions: 200,
        deletions: 0,
      },
      {
        name: 'src/payment/types.ts',
        status: 'added',
        additions: 50,
        deletions: 0,
      }
    ]
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
    reviews: [],
    commits: [
      {
        sha: 'ghi789',
        message: 'Fix JWT validation logic',
        author: 'bob-coder',
        date: new Date().toISOString(),
      }
    ],
    files: [
      {
        name: 'src/auth/validator.ts',
        status: 'modified',
        additions: 15,
        deletions: 8,
      }
    ]
  }
];

export async function GET(
  request: NextRequest,
  { params }: { params: { projectId: string; prNumber: string } }
) {
  try {
    const { projectId, prNumber } = params;
    const pr = pullRequests.find(
      pr => pr.projectId === projectId && pr.number.toString() === prNumber
    );

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
    return NextResponse.json(
      { success: false, message: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { projectId: string; prNumber: string } }
) {
  try {
    const { projectId, prNumber } = params;
    const body = await request.json();
    const updateData = updatePRSchema.parse(body);

    const prIndex = pullRequests.findIndex(
      pr => pr.projectId === projectId && pr.number.toString() === prNumber
    );

    if (prIndex === -1) {
      return NextResponse.json(
        { success: false, message: 'Pull request not found' },
        { status: 404 }
      );
    }

    pullRequests[prIndex] = {
      ...pullRequests[prIndex],
      ...updateData,
      updatedAt: new Date().toISOString(),
    };

    return NextResponse.json({
      success: true,
      data: pullRequests[prIndex],
      message: 'Pull request updated successfully'
    });
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
