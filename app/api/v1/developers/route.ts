import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

const createDeveloperSchema = z.object({
  githubUsername: z.string().min(1),
  email: z.string().email().optional(),
  name: z.string().min(1).optional(),
  avatarUrl: z.string().url().optional(),
});

const querySchema = z.object({
  page: z.string().transform(Number).pipe(z.number().min(1)).default(1),
  limit: z.string().transform(Number).pipe(z.number().min(1).max(100)).default(20),
  search: z.string().optional(),
  active: z.string().transform(val => val === 'true').optional(),
});

// Mock data - replace with your database
let developers = [
  {
    id: '1',
    githubUsername: 'alice-dev',
    email: 'alice@example.com',
    name: 'Alice Developer',
    avatarUrl: 'https://github.com/alice-dev.png',
    totalEarnings: 2500,
    activeProjects: 3,
    totalPRs: 15,
    averageScore: 8.5,
    joinedAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: '2',
    githubUsername: 'bob-coder',
    email: 'bob@example.com',
    name: 'Bob Coder',
    avatarUrl: 'https://github.com/bob-coder.png',
    totalEarnings: 1800,
    activeProjects: 2,
    totalPRs: 12,
    averageScore: 7.8,
    joinedAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }
];

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const { page, limit, search, active } = querySchema.parse(Object.fromEntries(searchParams));

    let filteredDevelopers = developers;

    // Apply filters
    if (search) {
      filteredDevelopers = filteredDevelopers.filter(dev =>
        dev.githubUsername.toLowerCase().includes(search.toLowerCase()) ||
        dev.name?.toLowerCase().includes(search.toLowerCase()) ||
        dev.email?.toLowerCase().includes(search.toLowerCase())
      );
    }

    if (active !== undefined) {
      filteredDevelopers = filteredDevelopers.filter(dev => dev.activeProjects > 0);
    }

    // Apply pagination
    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + limit;
    const paginatedDevelopers = filteredDevelopers.slice(startIndex, endIndex);

    return NextResponse.json({
      success: true,
      data: paginatedDevelopers,
      pagination: {
        page,
        limit,
        total: filteredDevelopers.length,
        totalPages: Math.ceil(filteredDevelopers.length / limit),
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

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const developerData = createDeveloperSchema.parse(body);

    // Check if developer already exists
    const existingDeveloper = developers.find(
      dev => dev.githubUsername === developerData.githubUsername
    );

    if (existingDeveloper) {
      return NextResponse.json({
        success: false,
        message: 'Developer already exists',
        data: existingDeveloper
      }, { status: 409 });
    }

    const newDeveloper = {
      id: Date.now().toString(),
      ...developerData,
      totalEarnings: 0,
      activeProjects: 0,
      totalPRs: 0,
      averageScore: 0,
      joinedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    developers.push(newDeveloper);

    return NextResponse.json({
      success: true,
      data: newDeveloper,
      message: 'Developer registered successfully'
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
