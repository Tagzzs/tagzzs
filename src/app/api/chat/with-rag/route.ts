import { NextRequest, NextResponse } from 'next/server';
import { getUserFromHeaders, validateSession } from '@/utils/supabase/auth';
import {
  createConversation,
  updateConversation,
  getConversation,
} from '@/lib/firebase/conversations';
import { adminDb } from '@/lib/firebase/admin';
import { v4 as uuidv4 } from 'uuid';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

interface ChatWithRagResponse {
  success: boolean;
  answer?: string;
  context?: string;
  chunks?: Array<{
    id: string;
    content_id: string;
    text: string;
    score: number;
    title?: string;
  }>;
  error?: string;
}

// Helper function to fetch content title from Firestore
async function getContentTitle(userId: string, contentId: string): Promise<string | null> {
  try {
    const contentDoc = await adminDb
      .collection('users')
      .doc(userId)
      .collection('content')
      .doc(contentId)
      .get();

    if (contentDoc.exists) {
      return contentDoc.data()?.title || null;
    }
    return null;
  } catch (error) {
    console.error(`[RAG_CHAT_PROXY] Error fetching content title for ${contentId}:`, error);
    return null;
  }
}

export async function POST(
  request: NextRequest
): Promise<NextResponse<ChatWithRagResponse>> {
  try {
    // Get authenticated user from headers (set by middleware)
    let user = getUserFromHeaders(request);

    // Fallback: If no user from headers, validate session directly
    if (!user) {
      const authResult = await validateSession();
      if (authResult.user) {
        user = authResult.user;
      }
    }

    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      );
    }

    const userId = user.id;
    console.log(`[RAG_CHAT_PROXY] User: ${userId}`);

    // Parse request body
    const body = await request.json();
    const {
      query,
      fetch_context = false,
      conversation_history = [],
      content_id_filter,
      conversation_id: passedConversationId,
    } = body;

    // Validate inputs
    if (!query || typeof query !== 'string') {
      return NextResponse.json(
        { success: false, error: 'Query must be a non-empty string' },
        { status: 400 }
      );
    }

    console.log(`[RAG_CHAT_PROXY] Query: "${query}"`);
    if (fetch_context) {
      console.log(`[RAG_CHAT_PROXY] Fetching context`);
    }
    if (content_id_filter) {
      console.log(`[RAG_CHAT_PROXY] Content ID filter: ${content_id_filter}`);
    }

    // Generate or use provided conversation ID
    const conversationId = passedConversationId || `chat_${uuidv4()}`;
    console.log(`[RAG_CHAT_PROXY] Conversation ID: ${conversationId}`);

    // Get Python backend URL from environment
    const backendUrl = process.env.TAGZZS_API_URL || 'http://localhost:8000';
    const chatUrl = `${backendUrl}/ai-chat/with-rag`;

    console.log(`[RAG_CHAT_PROXY] Forwarding to Python backend: ${chatUrl}`);

    // Prepare request body for Python backend
    const backendRequestBody = {
      user_id: userId,
      query,
      fetch_context: fetch_context,
      conversation_history: conversation_history || [],
      content_id_filter: content_id_filter || undefined,
    };

    // Forward request to Python backend
    const pythonResponse = await fetch(chatUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(backendRequestBody),
    });

    // Parse Python backend response
    const pythonData = await pythonResponse.json();
    if (!pythonResponse.ok) {
      console.error(
        `[RAG_CHAT_PROXY] Python backend error (${pythonResponse.status}):`,
        pythonData
      );

      return NextResponse.json(
        {
          success: false,
          error: pythonData.detail || pythonData.error || 'Chat failed in Python backend',
        },
        { status: pythonResponse.status }
      );
    }
    // Enrich chunks with content titles from Firebase
    const enrichedResponse = pythonData;
    if (pythonData.chunks && pythonData.chunks.length > 0) {
      pythonData.chunks.forEach((chunk: {id: string; content_id: string; score: number; text?: string; title?: string}, index: number) => {
        console.log(`  Chunk ${index}:`, {
          id: chunk.id,
          content_id: chunk.content_id,
          score: chunk.score,
          text_length: chunk.text?.length || 0,
          title: chunk.title || 'NO_TITLE',
        });
      });
      
      const enrichedChunks = await Promise.all(
        pythonData.chunks.map(async (chunk: {id: string; content_id: string; score: number; text?: string; title?: string}, index: number) => {
          const title = await getContentTitle(userId, chunk.content_id);
          console.log(`[RAG_CHAT_PROXY] Chunk ${index} enrichment:`, {
            content_id: chunk.content_id,
            fetched_title: title,
          });
          return {
            ...chunk,
            title: title || undefined,
          };
        })
      );

      enrichedResponse.chunks = enrichedChunks;
    } else {
      console.log('[RAG_CHAT_PROXY] No chunks in backend response to enrich');
    }

    // Save conversation to Firestore (backend doesn't handle persistence)
    try {
      const updatedHistory = [
        ...conversation_history,
        {
          role: 'user',
          content: query,
        },
        {
          role: 'assistant',
          content: pythonData.answer,
        },
      ];

      const existingConversation = await getConversation(userId, conversationId);

      if (existingConversation) {
        await updateConversation(
          userId,
          conversationId,
          updatedHistory,
          pythonData.chunks || [],
          content_id_filter
        );
      } else {
        await createConversation(
          userId,
          conversationId,
          updatedHistory,
          pythonData.chunks || [],
          content_id_filter
        );
      }
    } catch (firestoreError) {
      console.error('[RAG_CHAT_PROXY] Error saving to Firestore:', firestoreError);
      // Continue - don't fail the response due to Firestore error
    }

    // Return enriched response to client
    console.log('[RAG_CHAT_PROXY] Final Response to Client:');
    console.log(JSON.stringify(enrichedResponse, null, 2));
    return NextResponse.json(enrichedResponse);
  } catch (error) {
    console.error('[RAG_CHAT_PROXY] ❌ Error:', error);

    const errorMessage =
      error instanceof Error ? error.message : 'Unknown error occurred';

    return NextResponse.json(
      {
        success: false,
        error: `Chat proxy failed: ${errorMessage}`,
      },
      { status: 500 }
    );
  }
}
