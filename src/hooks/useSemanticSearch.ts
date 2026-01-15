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

import { useAuthenticatedApi } from '@/hooks/use-authenticated-api';

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8000';

export function useSemanticSearch(): UseSemanticSearchReturn {
  const { user } = useAuth();
  const api = useAuthenticatedApi();
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
      const data = await api.post(`${BACKEND_URL}/search/semantic-query`, {
        user_id: user.id,
        query: query.trim(),
        limit: 10,
      });

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
  }, [user, api]);

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
