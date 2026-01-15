'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8000';

export interface DraftItem {
  id: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  videoUrl: string;
  createdAt: string;
  thumbnailUrl: string | null;
  title: string | null;
}

export interface DraftResult {
  success: boolean;
  status: string;
  videoUrl: string;
  createdAt: string;
  data: {
    metadata?: {
      title?: string;
      description?: string;
      thumbnailUrl?: string;
      channelName?: string;
      duration?: string;
    };
    content?: {
      title?: string;
      description?: string;
      summary?: string;
      tags?: string[];
      rawContent?: string;
    };
  } | null;
  error: string | null;
}

export function useDrafts() {
  const [drafts, setDrafts] = useState<DraftItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuth();

  const fetchDrafts = useCallback(async () => {
    if (!user) {
      setDrafts([]);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`${BACKEND_URL}/youtube/list`, {
        credentials: 'include',
      });

      if (!response.ok) {
        // If server returns error, check if it's auth related
        if (response.status === 401) {
          setDrafts([]);
          return;
        }
        throw new Error('Unable to load drafts');
      }

      const data = await response.json();
      setDrafts(data.drafts || []);
    } catch (err) {
      // Network error - backend might not be running
      // Don't show error to user, just set empty list
      console.error('Drafts fetch error:', err);
      setDrafts([]);
      // Only set error if it's not a network issue
      if (err instanceof TypeError && err.message.includes('fetch')) {
        // Network error - backend unreachable, silently fail
        setError(null);
      } else {
        setError(err instanceof Error ? err.message : 'Unable to load drafts');
      }
    } finally {
      setLoading(false);
    }
  }, [user]);

  const queueYouTube = useCallback(async (url: string): Promise<{ success: boolean; requestId?: string; error?: string }> => {
    if (!user) {
      return { success: false, error: 'Not authenticated' };
    }

    try {
      const response = await fetch(`${BACKEND_URL}/youtube/queue`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({ url }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.detail || 'Failed to queue YouTube video');
      }

      const data = await response.json();
      return { success: true, requestId: data.requestId };
    } catch (err) {
      return { 
        success: false, 
        error: err instanceof Error ? err.message : 'Failed to queue video' 
      };
    }
  }, [user]);

  const fetchDraftResult = useCallback(async (id: string): Promise<DraftResult | null> => {
    if (!user) return null;

    try {
      const response = await fetch(`${BACKEND_URL}/youtube/result?id=${id}`, {
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error('Failed to fetch draft result');
      }

      return await response.json();
    } catch (err) {
      console.error('Error fetching draft result:', err);
      return null;
    }
  }, [user]);

  // Auto-fetch on mount
  useEffect(() => {
    fetchDrafts();
  }, [fetchDrafts]);

  return {
    drafts,
    loading,
    error,
    fetchDrafts,
    queueYouTube,
    fetchDraftResult,
  };
}
