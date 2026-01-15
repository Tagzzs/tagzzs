'use client';

import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useAuth } from '@/contexts/AuthContext';

export interface Tag {
  id: string;
  tagName: string;
  tagColor: string;
  description: string;
  contentCount: number;
  parentId: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface TagNode extends Tag {
  children: TagNode[];
  level: number;
}

interface UseTagsOptions {
  /** Auto-refresh on window focus */
  revalidateOnFocus?: boolean;
  /** Stale time in milliseconds before background revalidation (default: 5 min for tags) */
  staleTime?: number;
}

interface UseTagsReturn {
  tags: Tag[];
  tagTree: TagNode[];
  tagsMap: Map<string, Tag>;
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
  getTagById: (id: string) => Tag | undefined;
  getTagsByIds: (ids: string[]) => Tag[];
}

import { useAuthenticatedApi } from '@/hooks/use-authenticated-api';

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8000';

export function useTags(options: UseTagsOptions = {}): UseTagsReturn {
  const {
    revalidateOnFocus = true,
    staleTime = 300000, // 5 minutes stale time for tags
  } = options;

  const { user } = useAuth();
  const api = useAuthenticatedApi(); // Use the authenticated API hook
  const [tags, setTags] = useState<Tag[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Track last fetch time for stale-while-revalidate
  const lastFetchTime = useRef<number>(0);
  const isFetching = useRef<boolean>(false);

  const fetchTags = useCallback(async () => {
    if (!user) {
      setTags([]);
      setLoading(false);
      return;
    }

    // Prevent concurrent fetches
    if (isFetching.current) return;

    // Check if data is still fresh (not stale)
    const now = Date.now();
    if (tags.length > 0 && (now - lastFetchTime.current) < staleTime) {
      setLoading(false);
      return;
    }

    isFetching.current = true;
    
    // Only show loading spinner on initial load
    if (tags.length === 0) {
      setLoading(true);
    }
    
    setError(null);

    try {
      const data = await api.post(`${BACKEND_URL}/api/user-database/tags/get`, {});

      if (!data.success) {
        throw new Error(data.error?.message || 'Failed to fetch tags');
      }

      // Map backend response ensuring parentId is included
      const items: Tag[] = (data.data || []).map((t: any) => ({
        id: t.id,
        tagName: t.tagName,
        tagColor: t.tagColor || '#808080',
        description: t.description || '',
        contentCount: t.contentCount || 0,
        parentId: t.parentId || null,
        createdAt: t.createdAt,
        updatedAt: t.updatedAt,
      }));
      setTags(items);
      lastFetchTime.current = Date.now();
    } catch (err) {
      console.error('[useTags] Fetch error:', err);
      setError(err instanceof Error ? err.message : 'Unknown error occurred');
      // If authentication expired, invalidating tags might be appropriate
      if (err instanceof Error && err.message === 'Authentication expired') {
        setTags([]);
      }
    } finally {
      setLoading(false);
      isFetching.current = false;
    }
  }, [user, staleTime, tags.length, api]);

  // Create a Map for O(1) lookups
  const tagsMap = useMemo(() => {
    const map = new Map<string, Tag>();
    tags.forEach(tag => map.set(tag.id, tag));
    return map;
  }, [tags]);

  // Build hierarchical tree from flat tags using parent_id
  const tagTree = useMemo(() => {
    const nodeMap: Record<string, TagNode> = {};
    const roots: TagNode[] = [];

    // Create TagNode for each tag
    tags.forEach((tag) => {
      nodeMap[tag.id] = { ...tag, children: [], level: 0 };
    });

    // Build tree by linking children to parents
    tags.forEach((tag) => {
      const node = nodeMap[tag.id];
      if (tag.parentId && nodeMap[tag.parentId]) {
        const parent = nodeMap[tag.parentId];
        node.level = parent.level + 1;
        parent.children.push(node);
      } else {
        roots.push(node);
      }
    });

    // Sort alphabetically
    const sortNodes = (nodes: TagNode[]) => {
      nodes.sort((a, b) => a.tagName.localeCompare(b.tagName));
      nodes.forEach((n) => sortNodes(n.children));
    };
    sortNodes(roots);

    return roots;
  }, [tags]);

  // Helper to get a single tag by ID
  const getTagById = useCallback((id: string): Tag | undefined => {
    return tagsMap.get(id);
  }, [tagsMap]);

  // Helper to get multiple tags by IDs
  const getTagsByIds = useCallback((ids: string[]): Tag[] => {
    return ids.map(id => tagsMap.get(id)).filter((tag): tag is Tag => tag !== undefined);
  }, [tagsMap]);

  // Initial fetch
  useEffect(() => {
    fetchTags();
  }, [user]); // Only refetch when user changes

  // Revalidate on window focus
  useEffect(() => {
    if (!revalidateOnFocus) return;

    const handleFocus = () => {
      // Only revalidate if data is stale
      const now = Date.now();
      if ((now - lastFetchTime.current) >= staleTime) {
        fetchTags();
      }
    };

    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
  }, [revalidateOnFocus, staleTime, fetchTags]);

  const refetch = useCallback(async () => {
    lastFetchTime.current = 0; // Force refetch by marking as stale
    await fetchTags();
  }, [fetchTags]);

  return {
    tags,
    tagTree,
    tagsMap,
    loading,
    error,
    refetch,
    getTagById,
    getTagsByIds,
  };
}

export default useTags;
