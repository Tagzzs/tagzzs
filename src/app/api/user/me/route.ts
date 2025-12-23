import { NextRequest, NextResponse } from 'next/server';
import { getUserFromHeaders, validateSession } from '@/utils/supabase/auth';

export const dynamic = 'force-dynamic';

/**
 * GET /api/user/me
 * Returns the current authenticated user's ID
 * Uses headers from middleware or falls back to session validation
 */

export async function GET(req: NextRequest) {
  try {
    // Try to get user from headers
    let user = getUserFromHeaders(req);

    if (!user) {
      const authResult = await validateSession();
      if (authResult.user) {
        user = authResult.user;
      }
    }

    if (!user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    return NextResponse.json(
      {
        success: true,
        userId: user.id,
        email: user.email,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('[USER_ME] Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to get user information',
      },
      { status: 500 }
    );
  }
}
