import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const signinSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  name: z.string().min(2).optional(),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, password, name } = signinSchema.parse(body);

    // Check if admin already exists
    const existingAdmin = await prisma.admin.findUnique({
      where: { email }
    });

    if (existingAdmin) {
      return NextResponse.json(
        { success: false, message: 'Admin with this email already exists' },
        { status: 409 }
      );
    }

    // TODO: Implement proper password hashing with bcrypt
    // For now, we'll store the password as-is (NOT recommended for production)
    const hashedPassword = password; // Replace with bcrypt.hash(password, 10)

    // Create new admin
    const admin = await prisma.admin.create({
      data: {
        email,
        password: hashedPassword,
        name: name || email.split('@')[0], // Use email prefix as default name
      } as any
    });

    // Mock JWT token generation - replace with proper JWT library
    const token = `mock-jwt-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    return NextResponse.json({
      success: true,
      message: 'Admin account created successfully',
      token,
      user: {
        id: admin.id,
        email: admin.email,
        role: 'admin',
        name: admin.name
      }
    }, { status: 201 });

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, message: 'Invalid input data', errors: error.errors },
        { status: 400 }
      );
    }

    console.error('Signin error:', error);
    return NextResponse.json(
      { success: false, message: 'Internal server error' },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}
