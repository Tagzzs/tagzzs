import { useEffect, useRef } from 'react';

/**
 * Custom hook to handle Instagram embed script processing
 * Triggers Instagram's embed script to process blockquote elements
 */
export function useInstagramEmbed() {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Check if Instagram embed script is already loaded
    if (!window.instgrm) {
      // Load Instagram embed script if not already present
      const script = document.createElement('script');
      script.src = '//www.instagram.com/embed.js';
      script.async = true;
      document.body.appendChild(script);

      script.onload = () => {
        // Process any Instagram embeds in the document
        if (window.instgrm?.Embeds?.process) {
          window.instgrm.Embeds.process();
        }
      };
    } else if (window.instgrm?.Embeds?.process) {
      // If script already loaded, just process embeds
      window.instgrm.Embeds.process();
    }
  }, []);

  return containerRef;
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
