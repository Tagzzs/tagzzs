import { NextRequest, NextResponse } from 'next/server';
import { getUserFromHeaders, createAuthError } from '@/utils/supabase/auth';

export const dynamic = 'force-dynamic';

interface ExtensionSaveRequest {
  url: string;
  personalNotes?: string;
  autoTags?: boolean; 
}

/**
 * POST /api/extension/save
 * Unified endpoint that leverages existing endpoints for extracting and saving content
 */

export async function POST(request: NextRequest) {
  try {
    // Authenticate user from request headers
    let user = getUserFromHeaders(request);
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

    if (!user || !user.id) {
      return createAuthError('Authentication required to save content');
    }

    // Parse and validate request body
    let body: ExtensionSaveRequest;
    try {
      body = await request.json();
    } catch (_parseError) {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid JSON format in request body',
          step: 'parsing',
        },
        { status: 400 }
      );
    }

    const { url, personalNotes = '', autoTags = true } = body;

    if (!url || !url.trim()) {
      return NextResponse.json(
        {
          success: false,
          error: 'URL is required',
          step: 'validation',
        },
        { status: 400 }
      );
    }
    
    // Step 1: Extract content from URL using existing extraction API
    // Create headers for internal request, removing content-length to avoid mismatch
    const extractHeaders = new Headers(request.headers);
    extractHeaders.delete('content-length');

    const extractBody = JSON.stringify({
      url,
      options: {
        enableSummarization: true,
        enableTagGeneration: autoTags,
        maxLength: 200,
        timeout: 30000,
      },
    });

    const extractRequest = new Request(new URL('/api/content/extract', request.url), {
      method: 'POST',
      headers: extractHeaders,
      body: extractBody,
    });

    const extractResponse = await fetch(extractRequest);

    if (!extractResponse.ok) {
      const errorData = await extractResponse.json().catch(() => ({}));
      const errorMessage = errorData.error || `Extraction failed with status ${extractResponse.status}`;
      return NextResponse.json(
        {
          success: false,
          error: errorMessage,
          step: 'extraction',
        },
        { status: extractResponse.status }
      );
    }

    const extractedData = await extractResponse.json();

    // Log the extraction response for debugging
    // Check for extraction errors (extraction API returns error field on success status 200)
    if (extractedData.error || extractedData.result === 'error') {
      const errorMessage = extractedData.error || extractedData.details || 'Failed to extract content';
      return NextResponse.json(
        {
          success: false,
          error: errorMessage,
          step: 'extraction',
        },
        { status: 400 }
      );
    }

    if (!extractedData.content) {
      return NextResponse.json(
        {
          success: false,
          error: 'Failed to extract content from URL',
          step: 'extraction',
        },
        { status: 400 }
      );
    }

    const extracted = extractedData.content;
    // Step 2: Save content using existing add content API
    // Map extracted content to the expected schema
    const extractedTitle = extracted.title || 'Untitled';
    const extractedSummary = extracted.summary || '';
    const extractedRawContent = extracted.rawContent || '';
    const extractedMetadata = extracted.metadata || {};
    const extractedTags = extracted.tags || [];

    // Build description from summary or raw content
    const buildDescription = () => {
      if (extractedSummary && extractedSummary.length > 0) {
        return extractedSummary.substring(0, 500);
      }
      if (extractedRawContent && extractedRawContent.length > 0) {
        return extractedRawContent.substring(0, 500);
      }
      return '';
    };

    const contentData = {
      link: url,
      title: extractedTitle,
      contentType: extractedMetadata.contentType || 'article',
      description: buildDescription(),
      personalNotes: personalNotes,
      tagsId: [],
      rawContent: extractedRawContent, // Full extracted text content
      thumbnailUrl: extractedMetadata.imageUrl && typeof extractedMetadata.imageUrl === 'string' && extractedMetadata.imageUrl.trim() ? extractedMetadata.imageUrl : '',
    };
    // Create headers for internal request, removing content-length to avoid mismatch
    const saveHeaders = new Headers(request.headers);
    saveHeaders.delete('content-length');

    const saveBody = JSON.stringify(contentData);

    const saveRequest = new Request(new URL('/api/user-database/content/add', request.url), {
      method: 'POST',
      headers: saveHeaders,
      body: saveBody,
    });

    const saveResponse = await fetch(saveRequest);

    if (!saveResponse.ok) {
      const errorData = await saveResponse.json().catch(() => ({}));
      const errorMessage = errorData.error?.message || errorData.error || `Save failed with status ${saveResponse.status}`;
      return NextResponse.json(
        {
          success: false,
          error: errorMessage,
          step: 'saving',
        },
        { status: saveResponse.status }
      );
    }

    const saveResult = await saveResponse.json();

    // Handle wrapped response from createAuthResponse
    const responseData = saveResult.data;

    if (!responseData || !responseData.success) {
      return NextResponse.json(
        {
          success: false,
          error: responseData?.error?.message || 'Failed to save content',
          step: 'saving',
        },
        { status: 400 }
      );
    }

    // Return complete result to extension
    const savedContent = responseData.data || {};
    return NextResponse.json({
      success: true,
      data: {
        id: savedContent.contentId,
        title: extractedTitle,
        link: url,
        description: contentData.description,
        tagsCount: extractedTags?.length || 0,
        tags: extractedTags || [],
        contentType: contentData.contentType,
        savedAt: new Date().toISOString(),
      },
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Internal server error';
    return NextResponse.json(
      {
        success: false,
        error: errorMessage,
        step: 'unknown',
      },
      { status: 500 }
    );
  }
}
