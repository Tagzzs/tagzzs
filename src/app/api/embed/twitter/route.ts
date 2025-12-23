import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

// Request validation schema
const TwitterEmbedRequestSchema = z.object({
  url: z.string().url('Invalid URL format').refine(
    (url) => url.includes('twitter.com') || url.includes('x.com'),
    'URL must be a Twitter/X URL'
  ),
});

/**
 * Extract Twitter tweet ID from URL
 * Handles: twitter.com/user/status/ID and x.com/user/status/ID
 */

function extractTweetId(url: string): string | null {
  try {
    const match = url.match(/(?:twitter\.com|x\.com)\/\w+\/status\/(\d+)/);
    return match ? match[1] : null;
  } catch {
    return null;
  }
}

/**
 * Fetch Twitter oEmbed data
 * Uses Twitter's oEmbed API endpoint
 */

async function fetchTwitterOEmbed(
  twitterUrl: string
): Promise<{
  html: string;
  author_name?: string;
  author_url?: string;
}> {
  try {
    // Twitter oEmbed endpoint
    const oEmbedUrl = new URL('https://publish.twitter.com/oembed');
    oEmbedUrl.searchParams.set('url', twitterUrl);
    oEmbedUrl.searchParams.set('hide_media', 'false');
    oEmbedUrl.searchParams.set('hide_thread', 'false');
    oEmbedUrl.searchParams.set('omit_script', 'true');
    oEmbedUrl.searchParams.set('align', 'center');
    oEmbedUrl.searchParams.set('dnt', 'false');

    const response = await fetch(oEmbedUrl.toString(), {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
      },
    });

    if (!response.ok) {
      console.error(`Twitter oEmbed API error: ${response.status}`, await response.text());
      return getFallbackTwitterEmbed(twitterUrl);
    }

    const data = await response.json();
    return {
      html: data.html || '',
      author_name: data.author_name,
      author_url: data.author_url,
    };
  } catch (error) {
    console.error('Error fetching Twitter oEmbed:', error);
    return getFallbackTwitterEmbed(twitterUrl);
  }
}

/**
 * Fallback method for Twitter embed
 * Returns an iframe that will embed the tweet
 */

function getFallbackTwitterEmbed(twitterUrl: string): {
  html: string;
} {
  const tweetId = extractTweetId(twitterUrl);
  
  if (!tweetId) {
    return {
      html: `<p>Unable to embed tweet from <a href="${twitterUrl}" target="_blank" rel="noopener noreferrer">${twitterUrl}</a></p>`,
    };
  }

  const html = `
    <blockquote class="twitter-tweet" data-dnt="true">
      <a href="${twitterUrl}"></a>
    </blockquote>
  `;

  return { html };
}

/**
 * POST /api/embed/twitter
 * Fetch Twitter embed HTML for a given tweet URL
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
    const validationResult = TwitterEmbedRequestSchema.safeParse(body);
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

    // Validate Twitter URL format
    const tweetId = extractTweetId(url);
    if (!tweetId) {
      return NextResponse.json(
        { 
          success: false,
          error: "Invalid Twitter URL format",
          details: "URL must be in format: https://twitter.com/{user}/status/{id} or https://x.com/{user}/status/{id}"
        },
        { status: 400 }
      );
    }

    // Fetch embed data
    const embedData = await fetchTwitterOEmbed(url);

    return NextResponse.json(
      {
        success: true,
        data: {
          url,
          tweetId,
          html: embedData.html,
          author_name: embedData.author_name,
          author_url: embedData.author_url,
          provider: 'twitter',
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
    console.error('Twitter embed API error:', error);
    
    return NextResponse.json(
      { 
        success: false,
        error: "Failed to fetch Twitter embed",
        details: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/embed/twitter?url={twitterUrl}
 * Alternative GET endpoint for Twitter embed requests
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

    // Validate Twitter URL format
    const tweetId = extractTweetId(url);
    if (!tweetId) {
      return NextResponse.json(
        { 
          success: false,
          error: "Invalid Twitter URL format",
          details: "URL must be in format: https://twitter.com/{user}/status/{id} or https://x.com/{user}/status/{id}"
        },
        { status: 400 }
      );
    }

    // Fetch embed data
    const embedData = await fetchTwitterOEmbed(url);

    return NextResponse.json(
      {
        success: true,
        data: {
          url,
          tweetId,
          html: embedData.html,
          author_name: embedData.author_name,
          author_url: embedData.author_url,
          provider: 'twitter',
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
    console.error('Twitter embed API error:', error);
    
    return NextResponse.json(
      { 
        success: false,
        error: "Failed to fetch Twitter embed",
        details: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    );
  }
}