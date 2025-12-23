import { useState, useEffect, useRef } from 'react';
import { Loader2, AlertCircle, ExternalLink } from 'lucide-react';

interface TwitterEmbedProps {
  fileUrl: string;
  fileName: string;
}

/**
 * Component to handle Twitter/X embed rendering
 * Uses Twitter oEmbed API to fetch and display tweets
 */
export function TwitterEmbed({ fileUrl }: TwitterEmbedProps) {
  const [twitterHtml, setTwitterHtml] = useState<string | null>(null);
  const [twitterLoading, setTwitterLoading] = useState(true);
  const [twitterError, setTwitterError] = useState<string | null>(null);
  const twitterContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const fetchTwitterEmbed = async () => {
      try {
        setTwitterLoading(true);
        setTwitterError(null);

        const response = await fetch('/api/embed/twitter', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ url: fileUrl }),
        });

        if (!response.ok) {
          throw new Error(`Failed to fetch Twitter embed: ${response.status}`);
        }

        const data = await response.json();
        if (!data.success) {
          throw new Error(data.error || 'Unknown error fetching Twitter embed');
        }

        setTwitterHtml(data.data.html);

        // Trigger Twitter embed script to process the iframe
        if (window.twttr?.widgets?.load) {
          window.twttr.widgets.load();
        } else {
          // Load Twitter embed script if not already present
          const script = document.createElement('script');
          script.src = 'https://platform.twitter.com/widgets.js';
          script.async = true;
          script.charset = 'utf-8';
          document.body.appendChild(script);
        }
      } catch (err) {
        console.error('Twitter embed fetch error:', err);
        setTwitterError(err instanceof Error ? err.message : 'Failed to load Twitter embed');
      } finally {
        setTwitterLoading(false);
      }
    };

    fetchTwitterEmbed();
  }, [fileUrl]);

  if (twitterLoading) {
    return (
      <div className="flex items-center justify-center bg-gray-50 dark:bg-gray-800 rounded-lg p-4 h-[70vh]">
        <div className="text-center">
          <Loader2 className="h-8 w-8 text-[#7C3AED] animate-spin mx-auto mb-2" />
          <p className="text-sm text-gray-600 dark:text-gray-300">Loading tweet...</p>
        </div>
      </div>
    );
  }

  if (twitterError) {
    return (
      <div className="flex items-center justify-center bg-gray-50 dark:bg-gray-800 rounded-lg p-4 h-[70vh]">
        <div className="text-center max-w-md">
          <AlertCircle className="h-8 w-8 text-red-500 mx-auto mb-2" />
          <p className="text-sm text-gray-600 dark:text-gray-300 mb-4">{twitterError}</p>
          <a 
            href={fileUrl} 
            target="_blank" 
            rel="noopener noreferrer"
            className="text-blue-600 hover:underline inline-flex items-center gap-2"
          >
            <ExternalLink className="h-4 w-4" />
            Open on Twitter
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
      <div 
        ref={twitterContainerRef}
        className="w-full flex justify-center"
        dangerouslySetInnerHTML={{
          __html: twitterHtml || '',
        }}
      />
    </div>
  );
}

// Type definition for Twitter embed script
declare global {
  interface Window {
    twttr?: {
      widgets?: {
        load: () => void;
      };
    };
  }
}
