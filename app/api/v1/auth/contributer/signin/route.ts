import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const signinSchema = z.object({
  githubId: z.string().min(1),
  username: z.string().min(2),
  email: z.string().email().optional(),
  password: z.string().min(6).optional(),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { githubId, username, email, password } = signinSchema.parse(body);

    // Check if contributor already exists
    const existingContributor = await prisma.developer.findUnique({
      where: { githubId }
    });

    if (existingContributor) {
      return NextResponse.json(
        { success: false, message: 'Contributor with this GitHub ID already exists' },
        { status: 409 }
      );
    }

    // Check if username is already taken
    const existingUsername = await prisma.developer.findFirst({
      where: { username }
    });

    if (existingUsername) {
      return NextResponse.json(
        { success: false, message: 'Username already taken' },
        { status: 409 }
      );
    }

    // Create new contributor
    const contributor = await prisma.developer.create({
      data: {
        githubId,
        username,
        email,
        password: password || null, // Optional password for GitHub OAuth users
      } as any
    });

    // Mock JWT token generation - replace with proper JWT library
    const token = `mock-jwt-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    return NextResponse.json({
      success: true,
      message: 'Contributor account created successfully',
      token,
              user: {
          id: contributor.id,
          githubId: contributor.githubId,
          username: contributor.username,
          email: (contributor as any).email,
          role: 'contributor'
        }
    }, { status: 201 });

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, message: 'Invalid input data', errors: error.errors },
        { status: 400 }
      );
    }

    console.error('Contributor signin error:', error);
    return NextResponse.json(
      { success: false, message: 'Internal server error' },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}
