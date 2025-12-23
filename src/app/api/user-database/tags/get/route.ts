import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase/admin';
import { generateTagSlug } from '@/lib/utils/tagSlug';
import { getUserFromHeaders, createAuthError } from '@/utils/supabase/auth';

export const dynamic = 'force-dynamic';

/**
 * POST /api/user-database/tags/get
 * Retrieves tags for the authenticated user
 * - If tagName is provided: returns specific tag data
 * - If no tagName: returns all user's tags
 * 
 * @param req - Request object with optional tagName
 * @returns JSON response with tag(s) data
 */
export async function POST(req: NextRequest) {
  try {
    // Try to get authenticated user from request headers (set by middleware)
    let user = getUserFromHeaders(req);
    
    // validate session directly
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
      return createAuthError('Authentication required to access tags');
    }

    const userId = user.id;

    // Parse request body
    let body = {};
    try {
      body = await req.json();
    } catch {
      
    }

    const { tagName } = body as { tagName?: string };

    // Reference to user's tags collection
    const tagsRef = adminDb
      .collection('users')
      .doc(userId)
      .collection('tags');

    // search for specific tag
    if (tagName && typeof tagName === 'string') {
      // Convert tagName to slug format for ID lookup
      const tagId = generateTagSlug(tagName);
      
      if (!tagId) {
        return NextResponse.json(
          {
            success: true,
            found: false,
            tagId: null,
            message: 'Invalid tag name'
          },
          { status: 200 }
        );
      }
      
      // Direct lookup using the slugified tag name as ID
      const tagDocSnapshot = await tagsRef.doc(tagId).get();

      if (!tagDocSnapshot.exists) {
        return NextResponse.json(
          {
            success: true,
            found: false,
            tagId: null,
            message: 'Tag not found'
          },
          { status: 200 }
        );
      }

      const tagData = tagDocSnapshot.data();

      return NextResponse.json(
        {
          success: true,
          found: true,
          tagId: tagDocSnapshot.id,
          data: {
            id: tagDocSnapshot.id,
            tagName: tagData?.tagName,
            tagColor: tagData?.colorCode,
            description: tagData?.description,
            contentCount: tagData?.contentCount,
            createdAt: tagData?.createdAt,
            updatedAt: tagData?.updatedAt
          }
        },
        { status: 200 }
      );
    }

    // If no tagName provided, return all tags
    
    const allTagsSnapshot = await tagsRef.orderBy('createdAt', 'desc').get();
    
    const allTags = allTagsSnapshot.docs.map((doc: any) => ({
      id: doc.id,
      tagName: doc.data().tagName,
      tagColor: doc.data().colorCode,
      description: doc.data().description,
      contentCount: doc.data().contentCount,
      createdAt: doc.data().createdAt,
      updatedAt: doc.data().updatedAt
    }));

    return NextResponse.json(
      {
        success: true,
        data: allTags,
        count: allTags.length
      },
      { status: 200 }
    );

  } catch (_error) {
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'An unexpected error occurred while retrieving tags'
        }
      },
      { status: 500 }
    );
  }
}
