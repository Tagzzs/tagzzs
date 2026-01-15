'use client';

import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { useAuth } from './AuthContext';
import { useAuthenticatedApi } from '@/hooks/use-authenticated-api';

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8000';

// Message types
export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
}

export interface ChatListItem {
  chatId: string;
  title: string;
  messageCount: number;
  createdAt: number;
  updatedAt: number;
  preview: string;
}

interface ChatContextType {
  // State
  messages: ChatMessage[];
  currentChatId: string | null;
  chatList: ChatListItem[];
  isLoading: boolean;
  isSending: boolean;

  // Actions
  sendMessage: (text: string) => Promise<void>;
  loadChat: (chatId: string) => Promise<void>;
  newChat: () => void;
  deleteChat: (chatId: string) => Promise<void>;
  refreshChatList: () => Promise<void>;
}

const ChatContext = createContext<ChatContextType | undefined>(undefined);

// Generate UUID for messages
function generateId(): string {
  return crypto.randomUUID?.() || `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

export function ChatProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const api = useAuthenticatedApi();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [currentChatId, setCurrentChatId] = useState<string | null>(null);
  const [chatList, setChatList] = useState<ChatListItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSending, setIsSending] = useState(false);

  // Refresh chat list from backend
  const refreshChatList = useCallback(async () => {
    if (!user?.id) return;

    try {
      const data = await api.get(`${BACKEND_URL}/api/user-database/ai-chats/list`);

      if (data.success && data.chats) {
        setChatList(data.chats);
      }
    } catch (error) {
      console.error('Failed to fetch chat list:', error);
    }
  }, [user?.id, api]);

  // Load chat list on mount (when user is authenticated)
  useEffect(() => {
    if (user?.id) {
      refreshChatList();
    }
  }, [user?.id, refreshChatList]);

  // Load a specific chat
  const loadChat = useCallback(async (chatId: string) => {
    if (!user?.id) return;

    setIsLoading(true);
    try {
      const data = await api.get(
        `${BACKEND_URL}/api/user-database/ai-chats/get?chatId=${encodeURIComponent(chatId)}`
      );

      if (data.success && data.chat) {
        setCurrentChatId(chatId);
        setMessages(data.chat.messages || []);
      }
    } catch (error) {
      console.error('Failed to load chat:', error);
    } finally {
      setIsLoading(false);
    }
  }, [user?.id, api]);

  // Start a new chat
  const newChat = useCallback(() => {
    setCurrentChatId(null);
    setMessages([]);
  }, []);

  // Delete a chat
  const deleteChat = useCallback(async (chatId: string) => {
    if (!user?.id) return;

    try {
      await api.delete(
        `${BACKEND_URL}/api/user-database/ai-chats/delete?chatId=${encodeURIComponent(chatId)}`
      );

      // If we deleted the current chat, clear it
      if (currentChatId === chatId) {
        newChat();
      }
      // Refresh list
      await refreshChatList();
      
    } catch (error) {
      console.error('Failed to delete chat:', error);
    }
  }, [user?.id, currentChatId, newChat, refreshChatList, api]);

  // Save current chat to backend
  const saveChat = useCallback(async (msgs: ChatMessage[], chatId: string) => {
    if (!user?.id || msgs.length === 0) return;

    try {
      // Generate title from first user message
      const firstUserMsg = msgs.find(m => m.role === 'user');
      const title = firstUserMsg?.content.slice(0, 50) || 'New Chat';

      await api.post(`${BACKEND_URL}/api/user-database/ai-chats/save`, {
        chatId,
        title,
        messages: msgs,
      });

      // Refresh chat list after saving
      await refreshChatList();
    } catch (error) {
      console.error('Failed to save chat:', error);
    }
  }, [user?.id, refreshChatList, api]);

  // Send a message and get AI response
  const sendMessage = useCallback(async (text: string) => {
    if (!user?.id || !text.trim() || isSending) return;

    const chatId = currentChatId || generateId();
    if (!currentChatId) {
      setCurrentChatId(chatId);
    }

    // Add user message
    const userMessage: ChatMessage = {
      id: generateId(),
      role: 'user',
      content: text.trim(),
      timestamp: Date.now(),
    };

    const updatedMessages = [...messages, userMessage];
    setMessages(updatedMessages);
    setIsSending(true);

    try {
      // Call RAG chat API
      const data = await api.post(`${BACKEND_URL}/ai-chat/with-rag`, {
        user_id: user.id,
        query: text.trim(),
        conversation_history: messages.map(m => ({
          role: m.role === 'user' ? 'user' : 'assistant',
          content: m.content,
        })),
      });

      let aiContent = 'Sorry, I encountered an error. Please try again.';

      if (data.success && data.answer) {
        aiContent = data.answer;
      }

      // Add AI response
      const aiMessage: ChatMessage = {
        id: generateId(),
        role: 'assistant',
        content: aiContent,
        timestamp: Date.now(),
      };

      const finalMessages = [...updatedMessages, aiMessage];
      setMessages(finalMessages);

      // Save to backend
      await saveChat(finalMessages, chatId);
    } catch (error) {
      console.error('Chat error:', error);
      
      // Add error message
      const errorMessage: ChatMessage = {
        id: generateId(),
        role: 'assistant',
        content: 'Sorry, I encountered an error. Please try again.',
        timestamp: Date.now(),
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsSending(false);
    }
  }, [user?.id, currentChatId, messages, isSending, saveChat, api]);

  const value: ChatContextType = {
    messages,
    currentChatId,
    chatList,
    isLoading,
    isSending,
    sendMessage,
    loadChat,
    newChat,
    deleteChat,
    refreshChatList,
  };

  return <ChatContext.Provider value={value}>{children}</ChatContext.Provider>;
}

export function useChat() {
  const context = useContext(ChatContext);
  if (context === undefined) {
    throw new Error('useChat must be used within a ChatProvider');
  }
  return context;
}

export default ChatProvider;
