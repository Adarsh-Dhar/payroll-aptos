import { NextRequest, NextResponse } from 'next/server';

export interface AuthenticatedRequest extends NextRequest {
  user?: {
    id: string;
    email: string;
    role: string;
    name: string;
  };
}

export async function authenticateAdmin(request: NextRequest): Promise<NextResponse | null> {
  try {
    const authHeader = request.headers.get('authorization');
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { success: false, message: 'Missing or invalid authorization header' },
        { status: 401 }
      );
    }

    const token = authHeader.substring(7);
    
    // TODO: Implement proper JWT verification
    // This is a mock implementation - replace with your JWT service
    if (token.startsWith('mock-jwt-')) {
      // Mock user data - replace with actual JWT payload
      const user = {
        id: 'admin-1',
        email: 'admin@devpaystream.com',
        role: 'admin',
        name: 'Admin User'
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
