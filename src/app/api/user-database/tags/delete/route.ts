import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase/admin';
import { getUserFromHeaders, createAuthError } from '@/utils/supabase/auth';
import { FirebaseUserService } from '@/lib/services/firebaseUserService';

export async function DELETE(req: NextRequest) {
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
      return createAuthError('Authentication required to delete tags');
    }

    const userId = user.id;

    // Get the request body
    const body = await req.json();
    const { tagId } = body;
    
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

    // If tagId is provided, delete specific tag
    if (tagId) {
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

      // Before deleting the tag, update any content that uses this tagId
      // Remove this tagId from their tagsId array
      const contentCollection = adminDb
        .collection('users')
        .doc(userId)
        .collection('content');
      
      const contentSnapshot = await contentCollection.get();
      
      if (!contentSnapshot.empty) {
        const batch = adminDb.batch();
        contentSnapshot.docs.forEach((contentDoc) => {
          const content = contentDoc.data();
          if (Array.isArray(content.tagsId)) {
            const updatedTagsId = content.tagsId.filter((id: string) => id !== tagId);
            batch.update(contentDoc.ref, { 
              tagsId: updatedTagsId,
              updatedAt: new Date().toISOString()
            });
          }
        });
        await batch.commit();
      }

      // Delete the tag document
      await tagRef.delete();

      // Update user's totalTags count (decrement by 1)
      try {
        await FirebaseUserService.updateTagsCount(userId, -1);
      } catch (_countError) {
        
      }

      return NextResponse.json(
        { 
          success: true, 
          message: 'Tag deleted successfully',
          tagId,
          userId
        },
        { status: 200 }
      );
    } else {
      // If no tagId provided, delete all tags for the user
      
      // First, update all content to remove all tag references
      const contentCollection = adminDb
        .collection('users')
        .doc(userId)
        .collection('content');
      
      const contentSnapshot = await contentCollection.get();
      
      if (!contentSnapshot.empty) {
        const contentBatch = adminDb.batch();
        contentSnapshot.docs.forEach((contentDoc) => {
          contentBatch.update(contentDoc.ref, { 
            tagsId: [],
            updatedAt: new Date().toISOString()
          });
        });
        await contentBatch.commit();
      }
      
      // Delete all tags in the user's tags collection
      const tagsCollection = adminDb
        .collection('users')
        .doc(userId)
        .collection('tags');
      
      const tagsSnapshot = await tagsCollection.get();
      const tagsBatch = adminDb.batch();
      
      // Add all tag documents to batch delete
      tagsSnapshot.docs.forEach((doc) => {
        tagsBatch.delete(doc.ref);
      });
      
      // Execute batch delete
      await tagsBatch.commit();
      try {
        const userRef = adminDb.collection('users').doc(userId);
        await userRef.update({
          totalTags: 0,
          updatedAt: new Date().toISOString(),
        });
      } catch (_countError) {
        
      }

      return NextResponse.json(
        { 
          success: true, 
          message: 'All tags deleted successfully',
          userId,
          deletedTagsCount: tagsSnapshot.docs.length
        },
        { status: 200 }
      );
    }

  } catch (_error) {
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}