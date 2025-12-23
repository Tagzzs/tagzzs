/**
 * Tag Slug Generator
 * Converts tag names to clean, URL-friendly slugs for use as tag IDs
 * 
 * Rules:
 * - Spaces → hyphens (Web Development → web-development)
 * - Lowercase everything
 * - Remove special characters except hyphens
 * - Convert dots to hyphens (React.js → react-js)
 * - Remove duplicate hyphens
 * - Trim hyphens from start/end
 */

export function generateTagSlug(tagName: string): string {
  if (!tagName || typeof tagName !== 'string') {
    return '';
  }

  return tagName
    .toLowerCase()           
    .trim()                 
    .replace(/\./g, '-')     
    .replace(/[^\w\s-]/g, '')  
    .replace(/\s+/g, '-')    
    .replace(/-+/g, '-')     
    .replace(/^-+|-+$/g, '');  
}

/**
 * Validate tag slug
 * Ensures slug is valid and not empty
 */
export function isValidTagSlug(slug: string): boolean {
  if (!slug || typeof slug !== 'string') return false;
  // Should only contain lowercase letters, numbers, and hyphens
  // Should not start or end with hyphen
  return /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug);
}

/**
 * Examples:
 * "JavaScript" → "javascript"
 * "Web Development" → "web-development"
 * "React.js" → "react-js"
 * "C++" → "c"
 * "Node.js" → "node-js"
 * "Machine Learning" → "machine-learning"
 * "TypeScript" → "typescript"
 * "Vue.js" → "vue-js"
 * "ASP.NET" → "asp-net"
 * "C#" → "c"
 * "F#" → "f"
 */