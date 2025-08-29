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

    // Find admin by email
    const admin = await prisma.admin.findUnique({
      where: { email }
    });

    if (!admin) {
      return NextResponse.json(
        { success: false, message: 'Invalid credentials' },
        { status: 401 }
      );
    }

    // TODO: Implement proper password hashing and verification
    // For now, we'll use a simple check - replace with bcrypt in production
    if (password === 'admin123') {
      // Mock JWT token generation - replace with proper JWT library
      const token = `mock-jwt-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      
      return NextResponse.json({
        success: true,
        token,
        user: {
          id: admin.id,
          email: admin.email,
          role: 'admin',
          name: admin.name || 'Admin User'
        }
      });
    }

    return NextResponse.json(
      { success: false, message: 'Invalid credentials' },
      { status: 401 }
    );
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, message: 'Invalid input data', errors: error.errors },
        { status: 400 }
      );
    }

    console.error('Login error:', error);
    return NextResponse.json(
      { success: false, message: 'Internal server error' },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}
