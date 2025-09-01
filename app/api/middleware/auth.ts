import { NextRequest, NextResponse } from 'next/server';
import { getToken } from 'next-auth/jwt';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function authenticateAdmin(request: NextRequest) {
  try {
    // Get the token from the request
    const token = await getToken({ 
      req: request, 
      secret: process.env.NEXTAUTH_SECRET 
    });

    if (!token) {
      return {
        success: false,
        error: 'Not authenticated',
        status: 401
      };
    }

    // Get user info from token
    const githubUsername = (token as any).githubUsername;
    if (!githubUsername) {
      return {
        success: false,
        error: 'GitHub username not found in token',
        status: 401
      };
    }

    // Find or create admin record based on GitHub username
    let admin = await prisma.admin.findFirst({
      where: {
        email: `${githubUsername}@github.com` // Use GitHub username as email
      }
    });

    if (!admin) {
      // Create new admin record
      admin = await prisma.admin.create({
        data: {
          email: `${githubUsername}@github.com`,
          name: githubUsername,
          password: `github-${Date.now()}`, // Placeholder password for GitHub users
          updatedAt: new Date()
        }
      });
    }

    return {
      success: true,
      admin
    };
  } catch (error) {
    console.error('Authentication error:', error);
    return {
      success: false,
      error: 'Authentication failed',
      status: 500
    };
  }
}

export async function authenticateDeveloper(request: NextRequest): Promise<NextResponse | null> {
  try {
    const authHeader = request.headers.get('authorization');
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { success: false, message: 'Missing or invalid authorization header' },
        { status: 401 }
      );
    }

    const token = authHeader.substring(7);
    
    // TODO: Implement proper JWT verification for developers
    // This is a mock implementation - replace with your JWT service
    if (token.startsWith('dev-jwt-')) {
      // Mock user data - replace with actual JWT payload
      const user = {
        id: 'dev-1',
        email: 'dev@example.com',
        role: 'developer',
        name: 'Developer User'
      };
      
      // Add user to request context
      (request as AuthenticatedRequest).user = user;
      return null; // Continue to handler
    }

    return NextResponse.json(
      { success: false, message: 'Invalid or expired token' },
      { status: 401 }
    );
  } catch (error) {
    return NextResponse.json(
      { success: false, message: 'Authentication error' },
      { status: 500 }
    );
  }
}
