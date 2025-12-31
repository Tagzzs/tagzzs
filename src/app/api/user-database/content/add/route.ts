import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase/admin';
import { addContentSchema } from '@/lib/validation/contentSchemas';
import { updateMultipleTagCounts } from '@/lib/services/tagCountService';
import { FirebaseUserService } from '@/lib/services/firebaseUserService';
import { v4 as uuidv4 } from 'uuid';
import type { ContentData } from '@/types/ContentData';
import { getUserFromHeaders, createAuthError, createAuthResponse } from '@/utils/supabase/auth';

export const dynamic = 'force-dynamic';

/**
 * POST /api/user-database/content/add
 * Adds new content to user's content database
 * 
 * @param req - Request object containing content data
 * @returns JSON response with created content data or error
 */
export async function POST(req: NextRequest) {
  const startTime = Date.now();
  let userId: string | null = null;
  let contentId: string | null = null;

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
      return createAuthError('Authentication required to add content');
    }

    userId = user.id;
    // Parse and validate request body
    let body;
    try {
      body = await req.json();
    } catch (_parseError) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'INVALID_JSON',
            message: 'Invalid JSON format in request body',
            details: 'Please ensure your request body contains valid JSON'
          }
        },
        { status: 400 }
      );
    }

    if (typeof body !== 'object' || body === null) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'INVALID_REQUEST_BODY',
            message: 'Request body must be a valid JSON object',
            details: 'Expected object, received ' + typeof body
          }
        },
        { status: 400 }
      );
    }

    // Log incoming data for debugging
    // Add userId to the content data for validation
    const dataWithUserId = {
      ...body,
      userId: userId
    };
    
    // Validate the request body against the schema
    const validationResult = addContentSchema.safeParse(dataWithUserId);
    
    if (!validationResult.success) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid content data provided',
            details: validationResult.error.flatten().fieldErrors
          }
        },
        { status: 400 }
      );
    }

    const validatedData = validationResult.data;

    // Validate URL format
    let parsedUrl: URL;
    try {
      parsedUrl = new URL(validatedData.link);
    } catch {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'INVALID_URL',
            message: 'Invalid URL format provided',
            details: 'Please provide a valid HTTP or HTTPS URL'
          }
        },
        { status: 400 }
      );
    }

    // Check if Firebase admin is available
    if (!adminDb) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'SERVICE_UNAVAILABLE',
            message: 'Database service is temporarily unavailable',
            details: 'Please try again later'
          }
        },
        { status: 503 }
      );
    }

    // Check if user exists in Firebase with retry logic
    const userRef = adminDb.collection('users').doc(userId);
    let userDoc;
    
    try {
      userDoc = await userRef.get();
    } catch (_dbError) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'DATABASE_ERROR',
            message: 'Unable to verify user account',
            details: 'Database connection issue, please try again'
          }
        },
        { status: 503 }
      );
    }
    
    if (!userDoc.exists) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'USER_NOT_FOUND',
            message: 'User account not found in database',
            details: 'Please ensure your account is properly set up'
          }
        },
        { status: 404 }
      );
    }

    // Generate unique content ID and timestamps
    contentId = uuidv4();
    const now = new Date().toISOString();
    let embeddingMetadata: {
      chromaDocIds?: string[];
      summaryDocId?: string;
      chunkCount?: number;
    } = {};

    // Store extracted content and embedding in external service
    try {
      const tagzzsApiUrl = process.env.NEXT_PUBLIC_BACKEND_URL;
      if (!tagzzsApiUrl) {
      } else {
        const hasContent = validatedData.rawContent && validatedData.rawContent.trim().length > 0;
        const hasDescription = validatedData.description && validatedData.description.trim().length > 0;
        
        if (!hasContent && !hasDescription) {
        } else {
          const embeddingPayload = {
            user_id: userId,
            content_id: contentId,
            extracted_text: validatedData.rawContent || validatedData.description || '',
            summary: validatedData.description || '',
            tags: validatedData.tagsId || [],
            source_url: validatedData.link,
            source_type: validatedData.contentType || ''
          };
          const embeddingResponse = await fetch(`${tagzzsApiUrl}/embed/store`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(embeddingPayload)
          });

          if (!embeddingResponse.ok) {
            const _embeddingErrorText = await embeddingResponse.text();
            // Don't throw - continue without embedding if service fails
          } else {
            const embeddingData = await embeddingResponse.json();
            
            if (!embeddingData.success) {
            } else {
              // Store embedding metadata for later use
              embeddingMetadata = {
                chromaDocIds: embeddingData.chroma_doc_ids || [],
                summaryDocId: embeddingData.summary_doc_id || '',
                chunkCount: embeddingData.chunk_count || 0,
              };
            }
          }
        }
      }
    } catch (_embedError) {
      // continue without embedding if there's an error
    }

    // Map thumbnail with content
    const contentData: ContentData = {
      createdAt: now,
      tagsId: validatedData.tagsId || [],
      link: validatedData.link,
      title: validatedData.title.trim(),
      description: validatedData.description?.trim() || '',
      contentType: validatedData.contentType || 'article',
      contentSource: parsedUrl.hostname || '',
      personalNotes: validatedData.personalNotes?.trim() || '',
      readTime: validatedData.readTime || '',
      updatedAt: now,
      thumbnailUrl: validatedData.thumbnailUrl || null,
      rawContent: validatedData.rawContent || '',
      embeddingMetadata: {
        ...(embeddingMetadata.chromaDocIds && embeddingMetadata.chromaDocIds.length > 0 && { chromaDocIds: embeddingMetadata.chromaDocIds }),
        ...(embeddingMetadata.summaryDocId && { summaryDocId: embeddingMetadata.summaryDocId }),
        ...(embeddingMetadata.chunkCount && embeddingMetadata.chunkCount > 0 && { chunkCount: embeddingMetadata.chunkCount }),
      },
    };
    
    const contentRef = adminDb
      .collection('users')
      .doc(userId)
      .collection('content')
      .doc(contentId);

    try {
      await contentRef.set(contentData);
      // Update user's totalContent count
      try {
        await FirebaseUserService.updateContentCount(userId, 1);
      } catch (_countError) {
      }
    } catch (_dbError) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'STORAGE_FAILED',
            message: 'Failed to save content to database',
            details: 'Unable to store content, please try again'
          }
        },
        { status: 500 }
      );
    }

    // Update tag counts if content has tags
    if (contentData.tagsId && contentData.tagsId.length > 0) {
      try {
        await updateMultipleTagCounts(userId, contentData.tagsId);
      } catch (_tagError) {
      }
    }
    // Return success response
    return createAuthResponse(
      {
        success: true, 
        data: {
          contentId,
          content: contentData,
          message: 'Content added successfully with thumbnail mapping',
          timestamp: now
        }
      },
      user,
      201
    );

  } catch (error) {
    if (error instanceof SyntaxError) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'INVALID_JSON',
            message: 'Invalid JSON format in request body',
            details: 'Please ensure your request body contains valid JSON'
          }
        },
        { status: 400 }
      );
    }

    if (error instanceof TypeError) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'INVALID_REQUEST',
            message: 'Invalid request format',
            details: 'Please check your request parameters and try again'
          }
        },
        { status: 400 }
      );
    }

    // Check if it's a Firebase error
    if (error && typeof error === 'object' && 'code' in error) {
      const firebaseError = error as { code: string; message?: string };
      switch (firebaseError.code) {
        case 'permission-denied':
          return NextResponse.json(
            {
              success: false,
              error: {
                code: 'PERMISSION_DENIED',
                message: 'Insufficient permissions to add content',
                details: 'Please check your account permissions'
              }
            },
            { status: 403 }
          );
        case 'unavailable':
          return NextResponse.json(
            {
              success: false,
              error: {
                code: 'SERVICE_UNAVAILABLE',
                message: 'Database service is temporarily unavailable',
                details: 'Please try again later'
              }
            },
            { status: 503 }
          );
        default:
      }
    }

    // Generic server error
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'An unexpected error occurred while adding content',
          details: 'Please try again later or contact support if the problem persists'
        }
      },
      { status: 500 }
    );
  }
}