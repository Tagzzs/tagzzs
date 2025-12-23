import { adminDb } from '@/lib/firebase/admin';

// We use the admin SDK (adminDb) for server-side writes. Follow the pattern used
// in other server-side services (e.g. FirebaseUserService) which writes under
// adminDb.collection('users').doc(userId).collection('ai-chats').doc(chatId')

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp?: string;
}

export interface ContextChunk {
  id: string;
  contentId: string;
  text: string;
  score: number;
}

export interface ConversationData {
  messages: ChatMessage[];
  contextChunks?: ContextChunk[];
  lastContentId?: string | null;
  title: string;
  createdAt: string;
  updatedAt: string;
  isActive: boolean;
}

/**
 * Save a new conversation to Firestore at /users/{userId}/ai-chats/{chatId}/
 */
export const createConversation = async (
  userId: string,
  chatId: string,
  messages: ChatMessage[],
  contextChunks?: ContextChunk[],
  contentId?: string
): Promise<void> => {
  try {
    const chatRef = adminDb
      .collection('users')
      .doc(userId)
      .collection('ai-chats')
      .doc(chatId);

    const now = new Date().toISOString();
    const conversationData: ConversationData = {
      messages: messages.map((msg) => ({
        role: msg.role,
        content: msg.content,
        timestamp: (msg.timestamp && msg.timestamp.toString()) || now,
      })),
      contextChunks: contextChunks || [],
      lastContentId: contentId || null,
      title: `Chat - ${new Date().toLocaleDateString()}`,
      createdAt: now,
      updatedAt: now,
      isActive: true,
    };

    await chatRef.set(conversationData);
    console.log(`[CONVERSATIONS] Created new chat: ${userId}/${chatId}`);
  } catch (error) {
    console.error('[CONVERSATIONS] Error creating conversation:', error);
    throw error;
  }
};

/**
 * Update an existing conversation at /users/{userId}/ai-chats/{chatId}/
 */
export const updateConversation = async (
  userId: string,
  chatId: string,
  messages: ChatMessage[],
  contextChunks?: ContextChunk[],
  contentId?: string
): Promise<void> => {
  try {
    const chatRef = adminDb
      .collection('users')
      .doc(userId)
      .collection('ai-chats')
      .doc(chatId);

    const now = new Date().toISOString();

    await chatRef.update({
      messages: messages.map((msg) => ({
        role: msg.role,
        content: msg.content,
        timestamp: (msg.timestamp && msg.timestamp.toString()) || now,
      })),
      contextChunks: contextChunks || [],
      lastContentId: contentId || null,
      updatedAt: now,
    });

    console.log(`[CONVERSATIONS] Updated chat: ${userId}/${chatId}`);
  } catch (error) {
    console.error('[CONVERSATIONS] Error updating conversation:', error);
    throw error;
  }
};

/**
 * Fetch a specific conversation from /users/{userId}/ai-chats/{chatId}/
 */
export const getConversation = async (
  userId: string,
  chatId: string
): Promise<ConversationData | null> => {
  try {
    const chatRef = adminDb
      .collection('users')
      .doc(userId)
      .collection('ai-chats')
      .doc(chatId);

    const docSnap = await chatRef.get();

    if (docSnap.exists) {
      console.log(`[CONVERSATIONS] Fetched chat: ${userId}/${chatId}`);
      return docSnap.data() as ConversationData;
    }

    console.log(`[CONVERSATIONS] Chat not found: ${userId}/${chatId}`);
    return null;
  } catch (error) {
    console.error('[CONVERSATIONS] Error fetching conversation:', error);
    throw error;
  }
};

/**
 * Fetch all conversations for a user from /users/{userId}/ai-chats/
 */
export const getAllConversations = async (userId: string): Promise<Array<ConversationData & { id: string }>> => {
  try {
    const chatsRef = adminDb.collection('users').doc(userId).collection('ai-chats');
    const querySnapshot = await chatsRef.orderBy('updatedAt', 'desc').get();

    const conversations = querySnapshot.docs.map((d: FirebaseFirestore.QueryDocumentSnapshot) => ({
      id: d.id,
      ...d.data(),
    } as ConversationData & { id: string }));

    console.log(`[CONVERSATIONS] Fetched ${conversations.length} conversations for user: ${userId}`);
    return conversations;
  } catch (error) {
    console.error('[CONVERSATIONS] Error fetching all conversations:', error);
    throw error;
  }
};

/**
 * Delete a conversation from /users/{userId}/ai-chats/{chatId}/
 */
export const deleteConversation = async (userId: string, chatId: string): Promise<void> => {
  try {
    const chatRef = adminDb
      .collection('users')
      .doc(userId)
      .collection('ai-chats')
      .doc(chatId);

    const now = new Date().toISOString();
    await chatRef.update({
      isActive: false,
      updatedAt: now,
    });

    console.log(`[CONVERSATIONS] Deleted chat: ${userId}/${chatId}`);
  } catch (error) {
    console.error('[CONVERSATIONS] Error deleting conversation:', error);
    throw error;
  }
};