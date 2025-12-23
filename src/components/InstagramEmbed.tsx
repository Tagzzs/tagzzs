import { useState, useEffect, useRef } from 'react';
import { Loader2, AlertCircle, ExternalLink } from 'lucide-react';

interface InstagramEmbedProps {
  fileUrl: string;
  fileName: string;
}

/**
 * Component to handle Instagram embed rendering
 * Uses Meta oEmbed API to fetch and display Instagram posts
 */
export function InstagramEmbed({ fileUrl }: InstagramEmbedProps) {
  const [instagramHtml, setInstagramHtml] = useState<string | null>(null);
  const [instagramLoading, setInstagramLoading] = useState(true);
  const [instagramError, setInstagramError] = useState<string | null>(null);
  const instagramContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const fetchInstagramEmbed = async () => {
      try {
        setInstagramLoading(true);
        setInstagramError(null);

        const response = await fetch('/api/embed/instagram', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ url: fileUrl }),
        });

        if (!response.ok) {
          throw new Error(`Failed to fetch Instagram embed: ${response.status}`);
        }

        const data = await response.json();
        if (!data.success) {
          throw new Error(data.error || 'Unknown error fetching Instagram embed');
        }

        setInstagramHtml(data.data.html);

        // Trigger Instagram embed script to process the blockquote
        if (window.instgrm?.Embeds?.process) {
          window.instgrm.Embeds.process();
        } else {
          // Load Instagram embed script if not already present
          const script = document.createElement('script');
          script.src = '//www.instagram.com/embed.js';
          script.async = true;
          document.body.appendChild(script);
        }
      } catch (err) {
        console.error('Instagram embed fetch error:', err);
        setInstagramError(err instanceof Error ? err.message : 'Failed to load Instagram embed');
      } finally {
        setInstagramLoading(false);
      }
    };

    fetchInstagramEmbed();
  }, [fileUrl]);

  if (instagramLoading) {
    return (
      <div className="flex items-center justify-center bg-gray-50 dark:bg-gray-800 rounded-lg p-4 h-[70vh]">
        <div className="text-center">
          <Loader2 className="h-8 w-8 text-[#7C3AED] animate-spin mx-auto mb-2" />
          <p className="text-sm text-gray-600 dark:text-gray-300">Loading Instagram post...</p>
        </div>
      </div>
    );
  }

  if (instagramError) {
    return (
      <div className="flex items-center justify-center bg-gray-50 dark:bg-gray-800 rounded-lg p-4 h-[70vh]">
        <div className="text-center max-w-md">
          <AlertCircle className="h-8 w-8 text-red-500 mx-auto mb-2" />
          <p className="text-sm text-gray-600 dark:text-gray-300 mb-4">{instagramError}</p>
          <a 
            href={fileUrl} 
            target="_blank" 
            rel="noopener noreferrer"
            className="text-blue-600 hover:underline inline-flex items-center gap-2"
          >
            <ExternalLink className="h-4 w-4" />
            Open on Instagram
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
      <div 
        ref={instagramContainerRef}
        className="w-full flex justify-center"
        dangerouslySetInnerHTML={{
          __html: instagramHtml || '',
        }}
      />
    </div>
  );
}

// Type definition for Instagram embed script
declare global {
  interface Window {
    instgrm?: {
      Embeds?: {
        process: () => void;
      };
    };
  }
}
