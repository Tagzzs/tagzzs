import { NextRequest } from 'next/server';
import { createClient } from './server';

export interface AuthUser {
  id: string;
  email: string;
  user_metadata?: Record<string, unknown>;
}

export interface AuthResult {
  user: AuthUser | null;
  error: string | null;
}

/**
 * Extract user information from request headers (set by middleware)
 * This should be used in API routes after middleware has run
 */
export function getUserFromHeaders(request: NextRequest): AuthUser | null {
  const userId = request.headers.get('x-user-id');
  const userEmail = request.headers.get('x-user-email');

  if (!userId || !userEmail) {
    return null;
  }

  return {
    id: userId,
    email: userEmail,
  };
}

/**
 * Validate user session server-side
 * Use this for server components or when you need fresh session data
 */
export async function validateSession(): Promise<AuthResult> {
  try {
    const supabase = await createClient();
    const { data: { user }, error } = await supabase.auth.getUser();

    if (error) {
      return { user: null, error: error.message };
    }

    if (!user) {
      return { user: null, error: 'No user found' };
    }

    return {
      user: {
        id: user.id,
        email: user.email!,
        user_metadata: user.user_metadata,
      },
      error: null,
    };
  } catch (error) {
    return {
      user: null,
      error: error instanceof Error ? error.message : 'Unknown authentication error',
    };
  }
}

/**
 * Create an authenticated response with user context
 * Use this to standardize API responses with user information
 */
export function createAuthResponse<T>(
  data: T,
  user: AuthUser,
  status: number = 200
): Response {
  return Response.json({
    data,
    user: {
      id: user.id,
      email: user.email,
    },
    timestamp: new Date().toISOString(),
  }, { status });
}

/**
 * Create an error response for authentication failures
 */
export function createAuthError(
  message: string,
  status: number = 401
): Response {
  return Response.json({
    error: message,
    timestamp: new Date().toISOString(),
  }, { status });
}

/**
 * Middleware helper to check if a route requires authentication
 */
export function isProtectedRoute(pathname: string): boolean {
  const protectedPaths = [
    '/dashboard',
    '/api/pdf-extractor',
    '/api/tag-generation',
    '/api/content',
    '/api/tags',
    '/api/library',
  ];

  return protectedPaths.some(path => pathname.startsWith(path));
}

/**
 * Check if a route is public 
 */
export function isPublicRoute(pathname: string): boolean {
  const publicPaths = [
    '/',
    '/auth/sign-in',
    '/auth/sign-up',
    '/api/auth/sign-in',
    '/api/auth/sign-up',
  ];

  return publicPaths.includes(pathname);
}
