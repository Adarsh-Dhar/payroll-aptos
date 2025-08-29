import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, password } = loginSchema.parse(body);

    // Find contributor by email
    const contributor = await prisma.developer.findFirst({
      where: { 
        email: email,
        password: password // TODO: Replace with bcrypt.compare(password, contributor.password)
      } as any
    });

    if (!contributor) {
      return NextResponse.json(
        { success: false, message: 'Invalid credentials' },
        { status: 401 }
      );
    }

    // Mock JWT token generation - replace with proper JWT library
    const token = `mock-jwt-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    return NextResponse.json({
      success: true,
      token,
              user: {
          id: contributor.id,
          githubId: contributor.githubId,
          username: contributor.username,
          email: (contributor as any).email,
          role: 'contributor'
        }
    });

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, message: 'Invalid input data', errors: error.errors },
        { status: 400 }
      );
    }

    console.error('Contributor login error:', error);
    return NextResponse.json(
      { success: false, message: 'Internal server error' },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}
