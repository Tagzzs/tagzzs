import { NextResponse, NextRequest } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { adminDb } from '@/lib/firebase/admin';
import { updateMultipleTagCounts } from '@/lib/services/tagCountService';
import { FirebaseUserService } from '@/lib/services/firebaseUserService';
import { getUserFromHeaders, createAuthError } from '@/utils/supabase/auth';
import type { ContentData } from '@/types/ContentData';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function DELETE(req: NextRequest) {
  try {
    // Get authenticated user from request headers (set by middleware)
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
      return createAuthError('Authentication required to delete content');
    }

    const userId = user.id;

    // Get the request body
    const body = await req.json();
    const { contentId } = body;

    if (!contentId) {
      return NextResponse.json(
        { error: 'Content ID is required' },
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

    // If contentId is provided, delete specific content
    if (contentId) {
      // Get reference to the content document
      const contentRef = adminDb
        .collection('users')
        .doc(userId)
        .collection('content')
        .doc(contentId);

      // Check if content exists and get its data
      const contentDoc = await contentRef.get();
      if (!contentDoc.exists) {
        return NextResponse.json(
          { error: 'Content not found' },
          { status: 404 }
        );
      }

      const contentData = contentDoc.data() as ContentData;

      // Delete thumbnail from Supabase Storage if it exists
      if (contentData.thumbnailUrl) {
        try {
          const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
          const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

          if (supabaseUrl && supabaseServiceKey) {
            const supabase = createClient(supabaseUrl, supabaseServiceKey, {
              auth: {
                autoRefreshToken: false,
                persistSession: false
              }
            });

            // Extract the file name from the thumbnail URL
            // URL format: https://[project-id].supabase.co/storage/v1/object/public/user_thumbnails/[filename]
            const urlParts = contentData.thumbnailUrl.split('/');
            const fileName = urlParts[urlParts.length - 1];

            if (fileName) {
              const { error: deleteError } = await supabase.storage
                .from('user_thumbnails')
                .remove([fileName]);

              if (deleteError) {
                console.warn('Failed to delete thumbnail from storage:', deleteError);
                // content will still be deleted from database
              }
            }
          }
        } catch (storageError) {
          console.warn('Error deleting thumbnail:', storageError);
          // content will still be deleted from database
        }
      }

      // Delete the content document
      await contentRef.delete();

      // Update user's totalContent count
      try {
        await FirebaseUserService.updateContentCount(userId, -1);
      } catch (_countError) {

      }

      // Update tag counts if content had tags
      if (contentData.tagsId && contentData.tagsId.length > 0) {
        await updateMultipleTagCounts(userId, contentData.tagsId);
      }

      return NextResponse.json(
        { 
          success: true, 
          message: 'Content deleted successfully',
          contentId,
          userId
        },
        { status: 200 }
      );
    } else {
      // If no contentId provided, delete the entire user and all their content
      
      // First, delete all content in the user's content collection
      const contentCollection = adminDb
        .collection('users')
        .doc(userId)
        .collection('content');
      
      const contentSnapshot = await contentCollection.get();
      const batch = adminDb.batch();
      
      // Add all content documents to batch delete
      contentSnapshot.docs.forEach((doc) => {
        batch.delete(doc.ref);
      });
      
      // Add user document to batch delete
      batch.delete(userRef);
      
      // Execute batch delete
      await batch.commit();

      return NextResponse.json(
        { 
          success: true, 
          message: 'User and all associated content deleted successfully',
          userId,
          deletedContentCount: contentSnapshot.docs.length
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