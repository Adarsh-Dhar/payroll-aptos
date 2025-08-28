import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

const createPayoutSchema = z.object({
  developerId: z.string().min(1),
  amount: z.number().positive(),
  description: z.string().optional(),
  type: z.enum(['pr_reward', 'bonus', 'manual']).default('pr_reward'),
  status: z.enum(['pending', 'processing', 'completed', 'failed']).default('pending'),
  reference: z.string().optional(), // PR number or other reference
});

const querySchema = z.object({
  page: z.string().transform(Number).pipe(z.number().min(1)).default(1),
  limit: z.string().transform(Number).pipe(z.number().min(1).max(100)).default(20),
  status: z.enum(['pending', 'processing', 'completed', 'failed']).optional(),
  developerId: z.string().optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
});

// Mock data - replace with your database
let payouts = [
  {
    id: '1',
    projectId: '1',
    developerId: '1',
    developerName: 'Alice Developer',
    amount: 150,
    description: 'Payment for PR #42 - Add payment processing feature',
    type: 'pr_reward',
    status: 'completed',
    reference: 'PR #42',
    processedAt: new Date().toISOString(),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    transactionId: 'tx_123456789',
  },
  {
    id: '2',
    projectId: '2',
    developerId: '1',
    developerName: 'Alice Developer',
    amount: 200,
    description: 'Payment for PR #15 - Implement rate limiting',
    type: 'pr_reward',
    status: 'completed',
    reference: 'PR #15',
    processedAt: new Date().toISOString(),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    transactionId: 'tx_987654321',
  },
  {
    id: '3',
    projectId: '1',
    developerId: '2',
    developerName: 'Bob Coder',
    amount: 75,
    description: 'Bonus for code review contributions',
    type: 'bonus',
    status: 'pending',
    reference: 'Review Bonus',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }
];

export async function GET(
  request: NextRequest,
  { params }: { params: { projectId: string } }
) {
  try {
    const { projectId } = params;
    const { searchParams } = new URL(request.url);
    const { page, limit, status, developerId, startDate, endDate } = querySchema.parse(Object.fromEntries(searchParams));

    let filteredPayouts = payouts.filter(payout => payout.projectId === projectId);

    // Apply filters
    if (status) {
      filteredPayouts = filteredPayouts.filter(payout => payout.status === status);
    }

    if (developerId) {
      filteredPayouts = filteredPayouts.filter(payout => payout.developerId === developerId);
    }

    if (startDate || endDate) {
      filteredPayouts = filteredPayouts.filter(payout => {
        const payoutDate = new Date(payout.createdAt);
        if (startDate && payoutDate < new Date(startDate)) return false;
        if (endDate && payoutDate > new Date(endDate)) return false;
        return true;
      });
    }

    // Apply pagination
    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + limit;
    const paginatedPayouts = filteredPayouts.slice(startIndex, endIndex);

    // Calculate summary
    const totalAmount = filteredPayouts.reduce((sum, payout) => sum + payout.amount, 0);
    const completedAmount = filteredPayouts
      .filter(payout => payout.status === 'completed')
      .reduce((sum, payout) => sum + payout.amount, 0);

    return NextResponse.json({
      success: true,
      data: paginatedPayouts,
      summary: {
        totalPayouts: filteredPayouts.length,
        totalAmount,
        completedAmount,
        pendingAmount: totalAmount - completedAmount,
      },
      pagination: {
        page,
        limit,
        total: filteredPayouts.length,
        totalPages: Math.ceil(filteredPayouts.length / limit),
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
    const payoutData = createPayoutSchema.parse(body);

    const newPayout = {
      id: Date.now().toString(),
      projectId,
      developerName: 'Developer', // TODO: Fetch from developer data
      ...payoutData,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    payouts.push(newPayout);

    return NextResponse.json({
      success: true,
      data: newPayout,
      message: 'Payout created successfully'
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
