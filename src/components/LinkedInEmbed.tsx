import { useState, useEffect, useRef } from 'react';
import { Loader2, AlertCircle, ExternalLink } from 'lucide-react';

interface LinkedInEmbedProps {
  fileUrl: string;
  fileName: string;
}

/**
 * Component to handle LinkedIn embed rendering
 * Uses LinkedIn Posts oEmbed API to fetch and display posts
 */
export function LinkedInEmbed({ fileUrl }: LinkedInEmbedProps) {
  const [linkedinHtml, setLinkedinHtml] = useState<string | null>(null);
  const [linkedinLoading, setLinkedinLoading] = useState(true);
  const [linkedinError, setLinkedinError] = useState<string | null>(null);
  const linkedinContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const fetchLinkedinEmbed = async () => {
      try {
        setLinkedinLoading(true);
        setLinkedinError(null);

        const response = await fetch('/api/embed/linkedin', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ url: fileUrl }),
        });

        if (!response.ok) {
          throw new Error(`Failed to fetch LinkedIn embed: ${response.status}`);
        }

        const data = await response.json();
        if (!data.success) {
          throw new Error(data.error || 'Unknown error fetching LinkedIn embed');
        }

        setLinkedinHtml(data.data.html);

        // Trigger LinkedIn embed script to process the iframe
        if (window.IN?.parse && linkedinContainerRef.current) {
          window.IN.parse(linkedinContainerRef.current);
        } else {
          // Load LinkedIn embed script if not already present
          const script = document.createElement('script');
          script.src = 'https://www.linkedin.com/embed.js';
          script.async = true;
          script.charset = 'utf-8';
          document.body.appendChild(script);
        }
      } catch (err) {
        console.error('LinkedIn embed fetch error:', err);
        setLinkedinError(err instanceof Error ? err.message : 'Failed to load LinkedIn embed');
      } finally {
        setLinkedinLoading(false);
      }
    };

    fetchLinkedinEmbed();
  }, [fileUrl]);

  if (linkedinLoading) {
    return (
      <div className="flex items-center justify-center bg-gray-50 dark:bg-gray-800 rounded-lg p-4 h-[70vh]">
        <div className="text-center">
          <Loader2 className="h-8 w-8 text-[#7C3AED] animate-spin mx-auto mb-2" />
          <p className="text-sm text-gray-600 dark:text-gray-300">Loading LinkedIn post...</p>
        </div>
      </div>
    );
  }

  if (linkedinError) {
    return (
      <div className="flex items-center justify-center bg-gray-50 dark:bg-gray-800 rounded-lg p-4 h-[70vh]">
        <div className="text-center max-w-md">
          <AlertCircle className="h-8 w-8 text-red-500 mx-auto mb-2" />
          <p className="text-sm text-gray-600 dark:text-gray-300 mb-4">{linkedinError}</p>
          <a 
            href={fileUrl} 
            target="_blank" 
            rel="noopener noreferrer"
            className="text-blue-600 hover:underline inline-flex items-center gap-2"
          >
            <ExternalLink className="h-4 w-4" />
            Open on LinkedIn
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center bg-gray-50 dark:bg-gray-800 rounded-lg p-4 overflow-y-auto max-h-[70vh]">
      <div 
        ref={linkedinContainerRef}
        className="w-full flex justify-center"
        dangerouslySetInnerHTML={{
          __html: linkedinHtml || '',
        }}
      />
    </div>
  );
}

// Type definition for LinkedIn embed script
declare global {
  interface Window {
    IN?: {
      parse: (element?: HTMLElement) => void;
    };
  }
}
