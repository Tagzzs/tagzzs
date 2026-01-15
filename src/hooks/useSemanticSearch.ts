'use client';

import { useState, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';

export interface SearchResult {
  contentId: string;
  score: number;
  rank: number;
}

interface UseSemanticSearchReturn {
  results: SearchResult[];
  loading: boolean;
  error: string | null;
  search: (query: string) => Promise<SearchResult[]>;
  clearResults: () => void;
}

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8000';

/**
 * Hook for performing semantic search on user's content.
 * Uses the backend's vector search with embeddings.
 */
export function useSemanticSearch(): UseSemanticSearchReturn {
  const { user } = useAuth();
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const search = useCallback(async (query: string): Promise<SearchResult[]> => {
    if (!user) {
      setError('Authentication required');
      return [];
    }

    if (!query.trim()) {
      setResults([]);
      return [];
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`${BACKEND_URL}/search/semantic-query`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          user_id: user.id,
          query: query.trim(),
          limit: 10,
        }),
      });

      if (!response.ok) {
        throw new Error(`Search failed: ${response.status}`);
      }

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || 'Search failed');
      }

      const searchResults: SearchResult[] = data.results.map((r: any) => ({
        contentId: r.content_id,
        score: r.score,
        rank: r.rank,
      }));

      setResults(searchResults);
      return searchResults;
    } catch (err) {
      console.error('[useSemanticSearch] Search error:', err);
      const errorMessage = err instanceof Error ? err.message : 'Search failed';
      setError(errorMessage);
      return [];
    } finally {
      setLoading(false);
    }
  }, [user]);

  const clearResults = useCallback(() => {
    setResults([]);
    setError(null);
  }, []);

  return {
    results,
    loading,
    error,
    search,
    clearResults,
  };
}

export default useSemanticSearch;
