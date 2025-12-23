import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase/admin';
import { getUserFromHeaders, createAuthError } from '@/utils/supabase/auth';

export const dynamic = 'force-dynamic';

interface DeleteChatRequest {
  chatId: string;
}

export async function DELETE(req: NextRequest) {
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
      return createAuthError('Authentication required to delete chats');
    }

    const userId = user.id;
    const body = await req.json() as DeleteChatRequest;

    if (!body.chatId) {
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
      .doc(body.chatId);

    // Check if chat exists
    const chatDoc = await chatRef.get();
    if (!chatDoc.exists) {
      return NextResponse.json(
        { error: 'Chat not found' },
        { status: 404 }
      );
    }

    // Delete the chat
    await chatRef.delete();

    return NextResponse.json({
      success: true,
      message: 'Chat deleted successfully',
      chatId: body.chatId
    });

  } catch (error) {
    console.error('[AI_CHATS_DELETE] Error:', error);
    return NextResponse.json(
      { 
        error: 'Failed to delete chat',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}