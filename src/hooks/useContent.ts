'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';

export interface ContentItem {
  id: string;
  title: string;
  description: string;
  link: string;
  contentType: string;
  contentSource: string;
  thumbnailUrl: string | null;
  readTime: number;
  personalNotes: string;
  tagsId: string[];
  createdAt: string;
  updatedAt: string;
}

interface UseContentOptions {
  /** Initial limit for pagination */
  limit?: number;
  /** Auto-refresh on window focus */
  revalidateOnFocus?: boolean;
  /** Stale time in milliseconds before background revalidation */
  staleTime?: number;
}

interface UseContentReturn {
  content: ContentItem[];
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
  hasMore: boolean;
  loadMore: () => Promise<void>;
}

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8000';

/**
 * Hook to fetch user content with SWR-style caching and smart revalidation.
 * 
 * Features:
 * - Auto-refresh on window focus (configurable)
 * - Stale-while-revalidate pattern
 * - No unnecessary API calls - uses cached data when fresh
 * - Pagination support with loadMore
 */
export function useContent(options: UseContentOptions = {}): UseContentReturn {
  const {
    limit = 50,
    revalidateOnFocus = true,
    staleTime = 60000, // 1 minute stale time
  } = options;

  const { user } = useAuth();
  const [content, setContent] = useState<ContentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [offset, setOffset] = useState(0);

  // Track last fetch time for stale-while-revalidate
  const lastFetchTime = useRef<number>(0);
  const isFetching = useRef<boolean>(false);

  const fetchContent = useCallback(async (isLoadMore = false) => {
    if (!user) {
      setContent([]);
      setLoading(false);
      return;
    }

    // Prevent concurrent fetches
    if (isFetching.current) return;

    // Check if data is still fresh (not stale)
    const now = Date.now();
    if (!isLoadMore && content.length > 0 && (now - lastFetchTime.current) < staleTime) {
      setLoading(false);
      return;
    }

    isFetching.current = true;
    
    // Only show loading spinner on initial load, not on background revalidation
    if (content.length === 0 || isLoadMore) {
      setLoading(true);
    }
    
    setError(null);

    try {
      const currentOffset = isLoadMore ? offset : 0;
      
      const response = await fetch(`${BACKEND_URL}/api/user-database/content/get`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          limit,
          offset: currentOffset,
          sortBy: 'newest',
        }),
      });

      if (!response.ok) {
        if (response.status === 401) {
          throw new Error('Authentication required');
        }
        throw new Error(`Failed to fetch content: ${response.status}`);
      }

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error?.message || 'Failed to fetch content');
      }

      const items: ContentItem[] = data.data || [];
      
      if (isLoadMore) {
        setContent(prev => [...prev, ...items]);
        setOffset(currentOffset + items.length);
      } else {
        setContent(items);
        setOffset(items.length);
      }

      setHasMore(data.pagination?.hasMore || false);
      lastFetchTime.current = Date.now();
    } catch (err) {
      console.error('[useContent] Fetch error:', err);
      setError(err instanceof Error ? err.message : 'Unknown error occurred');
    } finally {
      setLoading(false);
      isFetching.current = false;
    }
  }, [user, offset, limit, staleTime, content.length]);

  // Initial fetch
  useEffect(() => {
    fetchContent();
  }, [user]); // Only refetch when user changes

  // Revalidate on window focus
  useEffect(() => {
    if (!revalidateOnFocus) return;

    const handleFocus = () => {
      // Only revalidate if data is stale
      const now = Date.now();
      if ((now - lastFetchTime.current) >= staleTime) {
        fetchContent();
      }
    };

    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
  }, [revalidateOnFocus, staleTime, fetchContent]);

  const refetch = useCallback(async () => {
    lastFetchTime.current = 0; // Force refetch by marking as stale
    await fetchContent();
  }, [fetchContent]);

  const loadMore = useCallback(async () => {
    if (hasMore && !loading) {
      await fetchContent(true);
    }
  }, [hasMore, loading, fetchContent]);

  return {
    content,
    loading,
    error,
    refetch,
    hasMore,
    loadMore,
  };
}

export default useContent;
