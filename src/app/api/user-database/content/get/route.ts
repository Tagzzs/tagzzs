import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase/admin';
import { getUserFromHeaders, createAuthError } from '@/utils/supabase/auth';

export const dynamic = 'force-dynamic';

/**
 * POST /api/user-database/content/get
 * Retrieves all content for the authenticated user
 * 
 * @param req - Request object with optional filters
 * @returns JSON response with user's content or error
 */
export async function POST(req: NextRequest) {
  try {
    // Try to get authenticated user from request headers
    let user = getUserFromHeaders(req);

    if (!user) {
      try {
        const { validateSession } = await import('@/utils/supabase/auth');
        const authResult = await validateSession();
        if (authResult.user) {
          user = authResult.user;
        }
      } catch (_sessionError) {
      }
    }
    
    if (!user) {
      return createAuthError('Authentication required to access content');
    }

    const userId = user.id;

    // Parse request body for optional filters
    let body = {};
    try {
      body = await req.json();
    } catch {
      // Body is optional for this endpoint
    }

    const { 
      limit,             
      offset = 0,           
      tagId, 
      contentType, 
      sortBy = 'newest'     
    } = body as {
      limit?: number;
      offset?: number;
      tagId?: string;
      contentType?: string;
      sortBy?: string;
    };

    let query: any = adminDb
      .collection('users')
      .doc(userId)
      .collection('content');

    // Filter by tag if specified
    if (tagId && typeof tagId === 'string') {
      query = query.where('tagsId', '==', tagId);
    }

    // Filter by content type if specified
    if (contentType && typeof contentType === 'string') {
      query = query.where('contentType', '==', contentType);
    }

    // Apply sorting
    switch (sortBy) {
      case 'oldest':
        query = query.orderBy('createdAt', 'asc');
        break;
      case 'title':
        query = query.orderBy('title', 'asc');
        break;
      case 'updated':
        query = query.orderBy('updatedAt', 'desc');
        break;
      case 'newest':
      default:
        query = query.orderBy('createdAt', 'desc');
        break;
    }

    // Apply pagination if specified
    if (typeof limit === 'number' && limit > 0 && limit <= 100) {
      query = query.limit(limit);
    }

    if (typeof offset === 'number' && offset >= 0) {
      query = query.offset(offset);
    }

    const contentSnapshot = await query.get();
    
    const contentList = contentSnapshot.docs.map((doc: any) => ({
      id: doc.id,
      ...doc.data()
    }));
    return NextResponse.json(
      { 
        success: true, 
        data: contentList,
        count: contentList.length,
        pagination: {
          limit: limit || null,
          offset: offset || null,
          hasMore: limit ? contentSnapshot.docs.length === limit : false
        }
      },
      { status: 200 }
    );

  } catch (_error) {
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'An unexpected error occurred while fetching content'
        }
      },
      { status: 500 }
    );
  }
}
