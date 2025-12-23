import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase/admin';
import { getUserFromHeaders, createAuthError } from '@/utils/supabase/auth';
import { Timestamp } from 'firebase-admin/firestore';

export const dynamic = 'force-dynamic';

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp?: number;
}

interface SaveChatRequest {
  chatId: string;
  title: string;
  messages: ChatMessage[];
  contentIdFilter?: string;
}

export async function POST(req: NextRequest) {
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
      return createAuthError('Authentication required to save chats');
    }

    const userId = user.id;
    const body = await req.json() as SaveChatRequest;

    // Validate required fields
    if (!body.chatId || !body.title || !Array.isArray(body.messages)) {
      return NextResponse.json(
        { error: 'Missing required fields: chatId, title, messages' },
        { status: 400 }
      );
    }

    if (body.messages.length === 0) {
      return NextResponse.json(
        { error: 'Cannot save empty chat' },
        { status: 400 }
      );
    }

    // Reference to user's AI chats collection
    const aiChatsRef = adminDb
      .collection('users')
      .doc(userId)
      .collection('ai-chats');

    // Prepare chat data
    const chatData = {
      chatId: body.chatId,
      title: body.title,
      messages: body.messages.map(msg => ({
        role: msg.role,
        content: msg.content,
        timestamp: msg.timestamp || Date.now()
      })),
      contentIdFilter: body.contentIdFilter || null,
      messageCount: body.messages.length,
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now()
    };

    // Save to Firebase
    await aiChatsRef.doc(body.chatId).set(chatData);

    return NextResponse.json({
      success: true,
      message: 'Chat saved successfully',
      chatId: body.chatId,
      data: chatData
    });

  } catch (error) {
    console.error('[AI_CHATS_SAVE] Error:', error);
    return NextResponse.json(
      { 
        error: 'Failed to save chat',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
