'use client';

import { useState, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8000';

export interface ExtractedContent {
  result?: string;
  metadata?: {
    title?: string;
    thumbnailUrl?: string;
    sourceUrl?: string;
    contentType?: string;
    wordCount?: number;
  };
  content?: {
    title?: string;
    description?: string;
    summary?: string;
    tags?: string[];
    rawContent?: string;
    extracted_text?: string;
  };
  error?: string;
}

export function useExtraction() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuth();

  const extractFromUrl = useCallback(async (url: string): Promise<ExtractedContent | null> => {
    if (!user) {
      setError('Not authenticated');
      return null;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`${BACKEND_URL}/extract-refine`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({ url }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.detail || 'Extraction failed');
      }

      return await response.json();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Extraction failed';
      setError(message);
      return null;
    } finally {
      setLoading(false);
    }
  }, [user]);

  const uploadAndExtractFile = useCallback(async (file: File): Promise<ExtractedContent | null> => {
    if (!user) {
      setError('Not authenticated');
      return null;
    }

    setLoading(true);
    setError(null);

    try {
      // Step 1: Upload file to Supabase
      const formData = new FormData();
      formData.append('file', file);
      formData.append('fileType', 'content');

      const uploadResponse = await fetch(`${BACKEND_URL}/api/upload`, {
        method: 'POST',
        credentials: 'include',
        body: formData,
      });

      if (!uploadResponse.ok) {
        throw new Error('File upload failed');
      }

      const uploadData = await uploadResponse.json();
      const fileUrl = uploadData.fileUrl;

      if (!fileUrl) {
        throw new Error('No file URL returned');
      }

      // Step 2: Extract content from uploaded file URL
      const isPdf = file.type === 'application/pdf';
      const isImage = file.type.startsWith('image/');

      let extractEndpoint = '/extract-refine';
      if (isPdf) extractEndpoint = '/extract-refine/pdf';
      else if (isImage) extractEndpoint = '/extract-refine/image';

      const extractResponse = await fetch(`${BACKEND_URL}${extractEndpoint}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({ url: fileUrl }),
      });

      if (!extractResponse.ok) {
        throw new Error('Content extraction failed');
      }

      return await extractResponse.json();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Extraction failed';
      setError(message);
      return null;
    } finally {
      setLoading(false);
    }
  }, [user]);

  const refineText = useCallback(async (text: string, sourceType: string = 'ideation'): Promise<ExtractedContent | null> => {
    if (!user) {
      setError('Not authenticated');
      return null;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`${BACKEND_URL}/refine/content`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          extracted_text: text,
          source_url: '',
          source_type: sourceType,
          title: '',
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.detail || 'Refinement failed');
      }

      const data = await response.json();
      return {
        result: 'success',
        content: {
          summary: data.summary,
          tags: data.tags,
          rawContent: text,
        },
      };
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Refinement failed';
      setError(message);
      return null;
    } finally {
      setLoading(false);
    }
  }, [user]);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  return {
    loading,
    error,
    extractFromUrl,
    uploadAndExtractFile,
    refineText,
    clearError,
  };
}
