import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

// Request validation schema
const LinkedInEmbedRequestSchema = z.object({
  url: z.string().url('Invalid URL format').refine(
    (url) => url.includes('linkedin.com'),
    'URL must be a LinkedIn URL'
  ),
});

/**
 * Extract LinkedIn post ID from URL
 * Handles: linkedin.com/feed/update/urn:li:share:ID
 */

function extractLinkedInPostId(url: string): string | null {
  try {
    // LinkedIn post URLs typically contain urn:li:share:ID
    const match = url.match(/urn:li:share:(\d+)/);
    if (match) {
      return match[1];
    }
    
    // Alternative format: /posts/ID
    const postMatch = url.match(/\/posts\/(\d+)/);
    if (postMatch) {
      return postMatch[1];
    }
    
    return null;
  } catch {
    return null;
  }
}

/**
 * Fetch LinkedIn oEmbed data
 * Uses LinkedIn's oEmbed API endpoint
 */

async function fetchLinkedInOEmbed(
  linkedinUrl: string
): Promise<{
  html: string;
  author_name?: string;
}> {
  try {
    // LinkedIn oEmbed endpoint
    const oEmbedUrl = new URL('https://www.linkedin.com/oembed');
    oEmbedUrl.searchParams.set('url', linkedinUrl);
    oEmbedUrl.searchParams.set('maxwidth', '550');

    const response = await fetch(oEmbedUrl.toString(), {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
      },
    });

    if (!response.ok) {
      console.error(`LinkedIn oEmbed API error: ${response.status}`, await response.text());
      return getFallbackLinkedInEmbed(linkedinUrl);
    }

    const data = await response.json();
    return {
      html: data.html || '',
      author_name: data.author_name,
    };
  } catch (error) {
    console.error('Error fetching LinkedIn oEmbed:', error);
    return getFallbackLinkedInEmbed(linkedinUrl);
  }
}

/**
 * Fallback method for LinkedIn embed
 * Returns an iframe that will embed the post
 */

function getFallbackLinkedInEmbed(linkedinUrl: string): {
  html: string;
} {
  const html = `
    <iframe 
      src="https://www.linkedin.com/embed/feed/update/${linkedinUrl.split('/')[linkedinUrl.split('/').length - 1]}"
      height="550"
      width="100%"
      frameborder="0"
      allowfullscreen=""
      title="LinkedIn Embed">
    </iframe>
  `;

  return { html };
}

/**
 * POST /api/embed/linkedin
 * Fetch LinkedIn embed HTML for a given post URL
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
    const validationResult = LinkedInEmbedRequestSchema.safeParse(body);
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

    // Validate LinkedIn URL format (optional, as LinkedIn URLs vary)
    const postId = extractLinkedInPostId(url);
    if (!postId && !url.includes('linkedin.com/feed')) {
      console.warn('LinkedIn URL format may be non-standard:', url);
    }

    // Fetch embed data
    const embedData = await fetchLinkedInOEmbed(url);

    return NextResponse.json(
      {
        success: true,
        data: {
          url,
          postId: postId || 'unknown',
          html: embedData.html,
          author_name: embedData.author_name,
          provider: 'linkedin',
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
    console.error('LinkedIn embed API error:', error);
    
    return NextResponse.json(
      { 
        success: false,
        error: "Failed to fetch LinkedIn embed",
        details: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/embed/linkedin?url={linkedinUrl}
 * Alternative GET endpoint for LinkedIn embed requests
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

    // Validate LinkedIn URL format
    const postId = extractLinkedInPostId(url);
    if (!postId && !url.includes('linkedin.com/feed')) {
      console.warn('LinkedIn URL format may be non-standard:', url);
    }

    // Fetch embed data
    const embedData = await fetchLinkedInOEmbed(url);

    return NextResponse.json(
      {
        success: true,
        data: {
          url,
          postId: postId || 'unknown',
          html: embedData.html,
          author_name: embedData.author_name,
          provider: 'linkedin',
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
    console.error('LinkedIn embed API error:', error);
    
    return NextResponse.json(
      { 
        success: false,
        error: "Failed to fetch LinkedIn embed",
        details: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    );
  }
}
