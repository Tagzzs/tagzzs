import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase/admin';
import { getUserFromHeaders, createAuthError } from '@/utils/supabase/auth';

export const dynamic = 'force-dynamic';

interface ChatListItem {
  chatId: string;
  title: string;
  messageCount: number;
  createdAt: number;
  updatedAt: number;
  preview: string;
}

export async function GET(req: NextRequest) {
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
      return createAuthError('Authentication required to retrieve chats');
    }

    const userId = user.id;

    // Reference to user's AI chats collection
    const aiChatsRef = adminDb
      .collection('users')
      .doc(userId)
      .collection('ai-chats');

    // Fetch all chats sorted by most recent first
    const snapshot = await aiChatsRef
      .orderBy('updatedAt', 'desc')
      .get();

    if (snapshot.empty) {
      return NextResponse.json({
        success: true,
        chats: [],
        count: 0
      });
    }

    // Format chat data
    const chats: ChatListItem[] = snapshot.docs.map(doc => {
      const data = doc.data();
      const messages = Array.isArray(data.messages) ? data.messages : [];
      
      // Get preview from last message
      let preview = 'No messages';
      if (messages.length > 0) {
        const lastMessage = messages[messages.length - 1];
        preview = (lastMessage.content || 'No content').substring(0, 60);
        if (preview.length === 60) preview += '...';
      }

      return {
        chatId: data.chatId || doc.id,
        title: data.title || 'Untitled Chat',
        messageCount: data.messageCount || messages.length || 0,
        createdAt: data.createdAt?.toMillis?.() || Date.now(),
        updatedAt: data.updatedAt?.toMillis?.() || Date.now(),
        preview: preview
      };
    });

    return NextResponse.json({
      success: true,
      chats: chats,
      count: chats.length
    });

  } catch (error) {
    console.error('[AI_CHATS_LIST] Error:', error);
    return NextResponse.json(
      { 
        error: 'Failed to retrieve chats',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
