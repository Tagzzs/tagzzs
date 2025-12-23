import { useState, useEffect, useRef } from 'react';
import { Loader2, AlertCircle, ExternalLink } from 'lucide-react';

interface RedditEmbedProps {
  fileUrl: string;
  fileName: string;
}

/**
 * Component to handle Reddit embed rendering
 * Uses Reddit oEmbed API to fetch and display posts
 */
export function RedditEmbed({ fileUrl }: RedditEmbedProps) {
  const [redditHtml, setRedditHtml] = useState<string | null>(null);
  const [redditLoading, setRedditLoading] = useState(true);
  const [redditError, setRedditError] = useState<string | null>(null);
  const redditContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const fetchRedditEmbed = async () => {
      try {
        setRedditLoading(true);
        setRedditError(null);

        const response = await fetch('/api/embed/reddit', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ url: fileUrl }),
        });

        if (!response.ok) {
          throw new Error(`Failed to fetch Reddit embed: ${response.status}`);
        }

        const data = await response.json();
        if (!data.success) {
          throw new Error(data.error || 'Unknown error fetching Reddit embed');
        }

        setRedditHtml(data.data.html);

        // Trigger Reddit embed script to process the blockquote
        if (window.ramp?.convert) {
          window.ramp.convert();
        } else {
          // Load Reddit embed script if not already present
          const script = document.createElement('script');
          script.src = 'https://embed.redditmedia.com/widgets/platform.js';
          script.async = true;
          script.charset = 'utf-8';
          document.body.appendChild(script);
        }
      } catch (err) {
        console.error('Reddit embed fetch error:', err);
        setRedditError(err instanceof Error ? err.message : 'Failed to load Reddit embed');
      } finally {
        setRedditLoading(false);
      }
    };

    fetchRedditEmbed();
  }, [fileUrl]);

  if (redditLoading) {
    return (
      <div className="flex items-center justify-center bg-gray-50 dark:bg-gray-800 rounded-lg p-4 h-[70vh]">
        <div className="text-center">
          <Loader2 className="h-8 w-8 text-[#7C3AED] animate-spin mx-auto mb-2" />
          <p className="text-sm text-gray-600 dark:text-gray-300">Loading Reddit post...</p>
        </div>
      </div>
    );
  }

  if (redditError) {
    return (
      <div className="flex items-center justify-center bg-gray-50 dark:bg-gray-800 rounded-lg p-4 h-[70vh]">
        <div className="text-center max-w-md">
          <AlertCircle className="h-8 w-8 text-red-500 mx-auto mb-2" />
          <p className="text-sm text-gray-600 dark:text-gray-300 mb-4">{redditError}</p>
          <a 
            href={fileUrl} 
            target="_blank" 
            rel="noopener noreferrer"
            className="text-blue-600 hover:underline inline-flex items-center gap-2"
          >
            <ExternalLink className="h-4 w-4" />
            Open on Reddit
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center bg-gray-50 dark:bg-gray-800 rounded-lg p-4 overflow-y-auto max-h-[70vh]">
      <div 
        ref={redditContainerRef}
        className="w-full flex justify-center"
        dangerouslySetInnerHTML={{
          __html: redditHtml || '',
        }}
      />
    </div>
  );
}

// Type definition for Reddit embed script
declare global {
  interface Window {
    ramp?: {
      convert: () => void;
    };
  }
}
