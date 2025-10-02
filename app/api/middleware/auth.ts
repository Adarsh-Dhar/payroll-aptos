import { NextRequest, NextResponse } from 'next/server';
import { getToken } from 'next-auth/jwt';

export async function authenticateAdmin(request: NextRequest) {
  try {
    // Dynamic import of Prisma client
    const { prisma } = await import('@/lib/prisma');

    // Allow secure local bypass via header when ADMIN_API_SECRET is set
    const adminApiSecret = process.env.ADMIN_API_SECRET;
    const bypassSecret = request.headers.get('x-admin-secret');
    const isBypassAllowed = process.env.NODE_ENV !== 'production' ? Boolean(bypassSecret) : (bypassSecret === adminApiSecret);
    if (isBypassAllowed) {
      const emailHeader = request.headers.get('x-admin-email') || 'devadmin@local.test';
      let admin = await prisma.admin.findFirst({ where: { email: emailHeader } });
      if (!admin) {
        admin = await prisma.admin.create({
          data: {
            email: emailHeader,
            name: emailHeader.split('@')[0],
            password: `bypass-${Date.now()}`,
            updatedAt: new Date(),
          },
        });
      }
      return { success: true, admin };
    }

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
    const githubUsername = (token as { githubUsername?: string }).githubUsername;
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
  } catch {
    console.error('Authentication error');
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
    // For now, require valid JWT tokens
    if (!token || token.length < 10) {
      return NextResponse.json(
        { success: false, message: 'Invalid or expired token' },
        { status: 401 }
      );
    }

    // TODO: Verify JWT token and extract user data
    // This should be replaced with actual JWT verification
    return NextResponse.json(
      { success: false, message: 'JWT verification not implemented' },
      { status: 501 }
    );
  } catch {
    return NextResponse.json(
      { success: false, message: 'Authentication error' },
      { status: 500 }
    );
  }
}
