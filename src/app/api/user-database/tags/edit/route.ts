import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase/admin';
import { getUserFromHeaders, createAuthError } from '@/utils/supabase/auth';
import type { TagsData } from '@/types/TagsData';

interface TagUpdateFields {
  tagName?: string;
  tagColor?: string;
  description?: string;
}

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function PUT(req: NextRequest) {
  try {
    // Try to get authenticated user from request headers 
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
      return createAuthError('Authentication required to edit tags');
    }

    const userId = user.id;

    // Get the request body
    const body = await req.json();
    
    // Extract tagId from the request body
    const { tagId, ...updateFields } = body;
    
    // Validate required fields
    if (!tagId) {
      return NextResponse.json(
        { error: 'Tag ID is required' },
        { status: 400 }
      );
    }

    // Check if user exists in Firebase
    const userRef = adminDb.collection('users').doc(userId);
    const userDoc = await userRef.get();
    
    if (!userDoc.exists) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    // Get reference to the tag document
    const tagRef = adminDb
      .collection('users')
      .doc(userId)
      .collection('tags')
      .doc(tagId);

    // Check if tag exists
    const tagDoc = await tagRef.get();
    if (!tagDoc.exists) {
      return NextResponse.json(
        { error: 'Tag not found' },
        { status: 404 }
      );
    }

    // Define allowed fields that can be updated
    const allowedFields = [
      'tagName',
      'tagColor', 
      'description'
    ];

    // Filter update fields to only include allowed ones
    const filteredUpdateFields: TagUpdateFields = {};
    
    for (const [key, value] of Object.entries(updateFields)) {
      if (allowedFields.includes(key) && value !== undefined && value !== null) {
        (filteredUpdateFields as Record<string, unknown>)[key] = value;
      }
    }

    // Check if there are any valid fields to update
    if (Object.keys(filteredUpdateFields).length === 0) {
      return NextResponse.json(
        { 
          error: 'No valid fields provided for update',
          allowedFields: allowedFields
        },
        { status: 400 }
      );
    }

    // Validate the update fields using individual validations
    const validationErrors: string[] = [];

    if (filteredUpdateFields.tagName && filteredUpdateFields.tagName.length > 50) {
      validationErrors.push('Tag name exceeds 50 character limit');
    }

    if (filteredUpdateFields.tagColor && !/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/.test(filteredUpdateFields.tagColor)) {
      validationErrors.push('Invalid color code format (must be hex color like #FF0000)');
    }

    if (filteredUpdateFields.description && filteredUpdateFields.description.length > 300) {
      validationErrors.push('Description exceeds 300 character limit');
    }

    // Return validation errors if any
    if (validationErrors.length > 0) {
      return NextResponse.json(
        { 
          error: 'Validation failed',
          details: validationErrors
        },
        { status: 400 }
      );
    }

    // Calculate current contentCount by counting content that uses this tagId
    const contentCollection = adminDb
      .collection('users')
      .doc(userId)
      .collection('content');
    
    const contentSnapshot = await contentCollection.where('tagsId', 'array-contains', tagId).get();
    const currentContentCount = contentSnapshot.size;

    // map frontend fields to database fields
    const updatePayload: Partial<TagsData> = {
      contentCount: currentContentCount, 
      updatedAt: new Date().toISOString(),
    };

    // Map frontend fields to database fields
    if (filteredUpdateFields.tagName) {
      updatePayload.tagName = filteredUpdateFields.tagName;
    }
    if (filteredUpdateFields.tagColor) {
      updatePayload.colorCode = filteredUpdateFields.tagColor; 
    }
    if (filteredUpdateFields.description) {
      updatePayload.description = filteredUpdateFields.description;
    }

    // Update the document
    await tagRef.update(updatePayload);

    // Get the updated document
    const updatedDoc = await tagRef.get();
    const updatedData = updatedDoc.data() as TagsData;

    return NextResponse.json(
      { 
        success: true, 
        message: 'Tag updated successfully',
        updatedFields: Object.keys(filteredUpdateFields),
        data: updatedData
      },
      { status: 200 }
    );

  } catch (_error) {
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const userId = url.searchParams.get('userId');
    const tagId = url.searchParams.get('tagId');

    // Validate required parameters
    if (!userId) {
      return NextResponse.json(
        { error: 'User ID is required' },
        { status: 400 }
      );
    }
    
    if (!tagId) {
      return NextResponse.json(
        { error: 'Tag ID is required' },
        { status: 400 }
      );
    }

    // Check if user exists in Firebase
    const userRef = adminDb.collection('users').doc(userId);
    const userDoc = await userRef.get();
    
    if (!userDoc.exists) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    // Get the tag document
    const tagRef = adminDb
      .collection('users')
      .doc(userId)
      .collection('tags')
      .doc(tagId);

    const tagDoc = await tagRef.get();
    
    if (!tagDoc.exists) {
      return NextResponse.json(
        { error: 'Tag not found' },
        { status: 404 }
      );
    }

    const tagData = { id: tagDoc.id, ...tagDoc.data() } as TagsData & { id: string };

    return NextResponse.json(
      { 
        success: true, 
        data: tagData
      },
      { status: 200 }
    );

  } catch (_error) {
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}