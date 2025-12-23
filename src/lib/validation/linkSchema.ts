import { z } from "zod";

// URL validation constants
const URL_MAX_LENGTH = 2048; 

// Blocked domains for security
const BLOCKED_DOMAINS = [
  'localhost',
  '127.0.0.1',
  '0.0.0.0',
];

// Production-ready URL validation with security checks
const urlValidator = z
  .string()
  .min(1, "URL is required")
  .max(URL_MAX_LENGTH, `URL must be less than ${URL_MAX_LENGTH} characters`)
  .url("Please provide a valid URL")
  .refine((url) => {
    try {
      const parsedUrl = new URL(url);
      
      // Only allow HTTP and HTTPS protocols
      if (!['http:', 'https:'].includes(parsedUrl.protocol)) {
        return false;
      }
      
      // Block potentially dangerous domains
      const hostname = parsedUrl.hostname.toLowerCase();
      return !BLOCKED_DOMAINS.some(blocked => 
        hostname === blocked || hostname.endsWith(`.${blocked}`)
      );
    } catch {
      return false;
    }
  }, "URL contains invalid protocol or blocked domain")
  .transform((url) => {
    // Normalize URL format
    try {
      const parsedUrl = new URL(url);
      // Normalize domain to lowercase, keep path case-sensitive
      return `${parsedUrl.protocol}//${parsedUrl.hostname.toLowerCase()}${parsedUrl.port ? `:${parsedUrl.port}` : ''}${parsedUrl.pathname}${parsedUrl.search}${parsedUrl.hash}`;
    } catch {
      return url;
    }
  });

// Basic link validation schema
export const LinkSchema = z.object({
  url: urlValidator,
});

// Batch link validation for multiple URLs
export const BatchLinkSchema = z.object({
  urls: z
    .array(z.string().url("Invalid URL format"))
    .min(1, "At least one URL is required")
    .max(100, "Maximum 100 URLs allowed per batch")
    .refine((urls) => {
      const uniqueUrls = new Set(urls);
      return uniqueUrls.size === urls.length;
    }, "Duplicate URLs are not allowed"),
});

// Export types for TypeScript
export type Link = z.infer<typeof LinkSchema>;
export type BatchLinks = z.infer<typeof BatchLinkSchema>;

// Export validation constants for reuse
export const VALIDATION_CONSTANTS = {
  URL_MAX_LENGTH,
  BLOCKED_DOMAINS,
} as const;
