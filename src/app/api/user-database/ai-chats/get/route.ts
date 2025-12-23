import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase/admin';
import { getUserFromHeaders, createAuthError } from '@/utils/supabase/auth';

export const dynamic = 'force-dynamic';

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
}

interface ChatData {
  chatId: string;
  title: string;
  messages: ChatMessage[];
  contentIdFilter?: string;
  messageCount: number;
  createdAt: number;
  updatedAt: number;
}

export async function GET(req: NextRequest, context?: { params?: { chatId?: string } }) {
  try {
    // Get authenticated user
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
      return createAuthError('Authentication required to retrieve chat');
    }

    const userId = user.id;

    // chatId may be passed as search param (?chatId=) or as route param
    const url = new URL(req.url);
    const chatIdFromQuery = url.searchParams.get('chatId');
    const chatId = chatIdFromQuery || context?.params?.chatId;

    if (!chatId) {
      return NextResponse.json(
        { error: 'Chat ID is required' },
        { status: 400 }
      );
    }

    // Reference to the specific chat document
    const chatRef = adminDb
      .collection('users')
      .doc(userId)
      .collection('ai-chats')
      .doc(chatId);

    const chatDoc = await chatRef.get();

    if (!chatDoc.exists) {
      return NextResponse.json(
        { error: 'Chat not found' },
        { status: 404 }
      );
    }

    const data = chatDoc.data();

    if (!data) {
      return NextResponse.json(
        { error: 'Chat data is invalid' },
        { status: 500 }
      );
    }

    // Format response
    const chatData: ChatData = {
      chatId: data.chatId || chatDoc.id,
      title: data.title || 'Untitled Chat',
      messages: Array.isArray(data.messages) ? data.messages : [],
      contentIdFilter: data.contentIdFilter || null,
      messageCount: data.messageCount || (Array.isArray(data.messages) ? data.messages.length : 0),
      createdAt: data.createdAt?.toMillis?.() || Date.now(),
      updatedAt: data.updatedAt?.toMillis?.() || Date.now()
    };

    return NextResponse.json({
      success: true,
      data: chatData
    });

  } catch (error) {
    console.error('[AI_CHATS_GET] Error:', error);
    return NextResponse.json(
      { 
        error: 'Failed to retrieve chat',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
