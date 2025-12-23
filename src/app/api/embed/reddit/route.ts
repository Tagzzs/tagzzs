import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

// Request validation schema
const RedditEmbedRequestSchema = z.object({
  url: z.string().url('Invalid URL format').refine(
    (url) => url.includes('reddit.com'),
    'URL must be a Reddit URL'
  ),
});

/**
 * Extract Reddit post ID from URL
 * Handles: reddit.com/r/subreddit/comments/ID/title
 */

function extractRedditPostId(url: string): string | null {
  try {
    // Reddit post URLs typically have /comments/ID/
    const match = url.match(/\/comments\/([a-zA-Z0-9]+)/);
    if (match) {
      return match[1];
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * Fetch Reddit oEmbed data
 * Uses Reddit's oEmbed API endpoint
 */
async function fetchRedditOEmbed(
  redditUrl: string
): Promise<{
  html: string;
  author?: string;
  title?: string;
}> {
  try {
    // Reddit oEmbed endpoint
    const oEmbedUrl = new URL('https://www.reddit.com/oembed');
    
    // Ensure URL is in the correct format for Reddit API
    let apiUrl = redditUrl;
    if (!redditUrl.includes('?')) {
      apiUrl = redditUrl + '?utm_source=share&utm_medium=web2x';
    }
    
    oEmbedUrl.searchParams.set('url', apiUrl);
    oEmbedUrl.searchParams.set('maxheight', '600');

    const response = await fetch(oEmbedUrl.toString(), {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
      },
    });

    if (!response.ok) {
      console.error(`Reddit oEmbed API error: ${response.status}`, await response.text());
      return getFallbackRedditEmbed(redditUrl);
    }

    const data = await response.json();
    return {
      html: data.html || '',
      author: data.author_name,
      title: data.title,
    };
  } catch (error) {
    console.error('Error fetching Reddit oEmbed:', error);
    return getFallbackRedditEmbed(redditUrl);
  }
}

/**
 * Fallback method for Reddit embed
 * Returns an iframe that will embed the post
 */

function getFallbackRedditEmbed(redditUrl: string): {
  html: string;
} {
  const postId = extractRedditPostId(redditUrl);
  
  if (!postId) {
    return {
      html: `<p>Unable to embed Reddit post from <a href="${redditUrl}" target="_blank" rel="noopener noreferrer">${redditUrl}</a></p>`,
    };
  }

  const html = `
    <blockquote class="reddit-embed-bq" data-embed-height="500">
      <a href="${redditUrl}"></a>
    </blockquote>
    <script async="" src="https://embed.redditmedia.com/widgets/platform.js" charset="UTF-8"></script>
  `;

  return { html };
}

/**
 * POST /api/embed/reddit
 * Fetch Reddit embed HTML for a given post URL
 */

export async function POST(req: NextRequest) {
  try {
    // Parse and validate request body
    let body;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json(
        { 
          success: false,
          error: "Invalid JSON format" 
        },
        { status: 400 }
      );
    }

    // Validate request schema
    const validationResult = RedditEmbedRequestSchema.safeParse(body);
    if (!validationResult.success) {
      return NextResponse.json(
        { 
          success: false,
          error: "Invalid request format",
          details: validationResult.error.flatten().fieldErrors 
        },
        { status: 400 }
      );
    }

    const { url } = validationResult.data;

    // Validate Reddit URL format (optional, as Reddit URLs vary)
    const postId = extractRedditPostId(url);
    if (!postId) {
      console.warn('Reddit URL format may be non-standard:', url);
    }

    // Fetch embed data
    const embedData = await fetchRedditOEmbed(url);

    return NextResponse.json(
      {
        success: true,
        data: {
          url,
          postId: postId || 'unknown',
          html: embedData.html,
          author: embedData.author,
          title: embedData.title,
          provider: 'reddit',
          type: 'rich',
        },
        timestamp: new Date().toISOString(),
      },
      { 
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'public, max-age=86400', // Cache for 24 hours
        }
      }
    );

  } catch (error) {
    console.error('Reddit embed API error:', error);
    
    return NextResponse.json(
      { 
        success: false,
        error: "Failed to fetch Reddit embed",
        details: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/embed/reddit?url={redditUrl}
 * Alternative GET endpoint for Reddit embed requests
 */

export async function GET(req: NextRequest) {
  try {
    const url = req.nextUrl.searchParams.get('url');

    if (!url) {
      return NextResponse.json(
        { 
          success: false,
          error: "Missing 'url' query parameter"
        },
        { status: 400 }
      );
    }

    // Validate Reddit URL format (optional)
    const postId = extractRedditPostId(url);
    if (!postId) {
      console.warn('Reddit URL format may be non-standard:', url);
    }

    // Fetch embed data
    const embedData = await fetchRedditOEmbed(url);

    return NextResponse.json(
      {
        success: true,
        data: {
          url,
          postId: postId || 'unknown',
          html: embedData.html,
          author: embedData.author,
          title: embedData.title,
          provider: 'reddit',
          type: 'rich',
        },
        timestamp: new Date().toISOString(),
      },
      { 
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'public, max-age=86400',
        }
      }
    );

  } catch (error) {
    console.error('Reddit embed API error:', error);
    
    return NextResponse.json(
      { 
        success: false,
        error: "Failed to fetch Reddit embed",
        details: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    );
  }
}
