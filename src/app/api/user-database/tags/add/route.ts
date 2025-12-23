import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase/admin';
import { addTagSchema } from '@/lib/validation/tagsSchema';
import { FirebaseUserService } from '@/lib/services/firebaseUserService';
import { generateTagSlug } from '@/lib/utils/tagSlug';
import type { TagsData } from '@/types/TagsData';
import { getUserFromHeaders, createAuthError } from '@/utils/supabase/auth';

export const dynamic = 'force-dynamic';

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
      return createAuthError('Authentication required to add tags');
    }

    const userId = user.id;

    // Get the request body
    const body = await req.json();
    
    // Map frontend fields to database fields and add userId for validation
    const dataWithUserId = {
      tagName: body.tagName,
      colorCode: body.colorCode || body.tagColor,
      description: body.description,
      userId: userId
    };
    
    // Validate the request body against the schema
    const validationResult = addTagSchema.safeParse(dataWithUserId);
    
    if (!validationResult.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: validationResult.error.issues },
        { status: 400 }
      );
    }

    const validatedData = validationResult.data;

    // Generate tag ID from tag name using slug format
    const tagId = generateTagSlug(validatedData.tagName);
    
    if (!tagId) {
      return NextResponse.json(
        { error: 'Invalid tag name - unable to generate valid tag ID', details: 'Tag name contains no valid characters' },
        { status: 400 }
      );
    }
    
    const now = new Date().toISOString();

    // Count existing content that uses this tag 
    const contentCollection = adminDb
      .collection('users')
      .doc(userId)
      .collection('content');
    
    const contentSnapshot = await contentCollection.where('tagsId', 'array-contains', tagId).get();
    const currentContentCount = contentSnapshot.size;

    // Prepare tag data according to TagsData type
    const tagData: TagsData = {
      createdAt: now,
      tagName: validatedData.tagName,
      colorCode: validatedData.colorCode,
      description: validatedData.description || '',
      contentCount: currentContentCount,
      updatedAt: now,
    };

    // Store in Firebase under user's tags collection
    const tagRef = adminDb
      .collection('users')
      .doc(userId)
      .collection('tags')
      .doc(tagId);

    await tagRef.set(tagData);

    // Update user's totalTags count
    try {
      await FirebaseUserService.updateTagsCount(userId, 1);
    } catch (_countError) {
      
    }

    return NextResponse.json(
      { 
        success: true, 
        tagId,
        message: 'Tag added successfully',
        data: tagData
      },
      { status: 201 }
    );

  } catch (_error) {
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}