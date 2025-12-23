import { NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase/admin';
import { updateTagCountsOnArrayChange } from '@/lib/services/tagCountService';
import type { ContentData } from '@/types/ContentData';

interface UpdateFields {
  title?: string;
  description?: string;
  link?: string;
  contentType?: string;
  personalNotes?: string;
  readTime?: string;
  tagsId?: string[]; 
}

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function PUT(req: Request) {
  try {
    // Get the request body
    const body = await req.json();
    
    // Extract userId and contentId from the request body
    const { userId, contentId, ...updateFields } = body;
    
    // Validate required fields
    if (!userId) {
      return NextResponse.json(
        { error: 'User ID is required' },
        { status: 400 }
      );
    }
    
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

    // Get reference to the content document
    const contentRef = adminDb
      .collection('users')
      .doc(userId)
      .collection('content')
      .doc(contentId);

    // Check if content exists and get original data
    const contentDoc = await contentRef.get();
    if (!contentDoc.exists) {
      return NextResponse.json(
        { error: 'Content not found' },
        { status: 404 }
      );
    }

    const originalContentData = contentDoc.data() as ContentData;

    // Define allowed fields that can be updated
    const allowedFields = [
      'link',
      'title', 
      'description',
      'contentType',
      'contentSource',
      'personalNotes',
      'readTime',
      'tagsId'
    ];

    // Filter update fields to only include allowed ones
    const filteredUpdateFields: UpdateFields = {};
    
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

    // Validate the update fields using individual schema validations
    const validationErrors: string[] = [];

    // Validate each field if provided
    if (filteredUpdateFields.link) {
      try {
        new URL(filteredUpdateFields.link); 
      } catch {
        validationErrors.push('Invalid URL format for link');
      }
    }

    if (filteredUpdateFields.title && filteredUpdateFields.title.length > 50) {
      validationErrors.push('Title exceeds 50 character limit');
    }

    if (filteredUpdateFields.description && filteredUpdateFields.description.length > 250) {
      validationErrors.push('Description exceeds 250 character limit');
    }

    if (filteredUpdateFields.contentType && filteredUpdateFields.contentType.length > 25) {
      validationErrors.push('Content type exceeds 25 character limit');
    }

    if (filteredUpdateFields.personalNotes && filteredUpdateFields.personalNotes.length > 100) {
      validationErrors.push('Personal notes exceed 100 character limit');
    }

    if (filteredUpdateFields.readTime && !/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/.test(filteredUpdateFields.readTime)) {
      validationErrors.push('Invalid time format for readTime (should be HH:MM)');
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

    // Prepare update payload
    const updatePayload: Partial<ContentData> = {
      ...filteredUpdateFields,
      updatedAt: new Date().toISOString(),
    };

    // If link is being updated, also update contentSource automatically
    if (filteredUpdateFields.link) {
      try {
        updatePayload.contentSource = new URL(filteredUpdateFields.link).hostname;
      } catch {
        // If URL parsing fails, keep the original contentSource
      }
    }

    // Update the document
    await contentRef.update(updatePayload);

    // Update tag counts if tagsId changed
    const oldTagIds = originalContentData.tagsId || [];
    const newTagIds = filteredUpdateFields.tagsId;
    
    if (newTagIds !== undefined) { 
      await updateTagCountsOnArrayChange(userId, oldTagIds, newTagIds);
    }

    // Get the updated document
    const updatedDoc = await contentRef.get();
    const updatedData = updatedDoc.data() as ContentData;

    return NextResponse.json(
      { 
        success: true, 
        message: 'Content updated successfully',
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
    const contentId = url.searchParams.get('contentId');

    // Validate required parameters
    if (!userId) {
      return NextResponse.json(
        { error: 'User ID is required' },
        { status: 400 }
      );
    }
    
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

    // Get the content document
    const contentRef = adminDb
      .collection('users')
      .doc(userId)
      .collection('content')
      .doc(contentId);

    const contentDoc = await contentRef.get();
    
    if (!contentDoc.exists) {
      return NextResponse.json(
        { error: 'Content not found' },
        { status: 404 }
      );
    }

    const contentData = { id: contentDoc.id, ...contentDoc.data() } as ContentData & { id: string };

    return NextResponse.json(
      { 
        success: true, 
        data: contentData
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