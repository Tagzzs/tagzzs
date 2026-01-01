import { NextRequest, NextResponse } from "next/server";
import { JSDOM } from "jsdom";

export async function POST(req: NextRequest) {
  try {
    const { url } = await req.json();

    if (!url) {
      return NextResponse.json({ error: "URL is required" }, { status: 400 });
    }

    // Validate URL
    try {
      new URL(url);
    } catch {
      return NextResponse.json({ error: "Invalid URL" }, { status: 400 });
    }

    // Fetch the page content
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
      },
      signal: AbortSignal.timeout(10000), // 10s timeout
    });

    if (!response.ok) {
       // If standard fetch fails, it might be blocking bots.
       // We'll just return null so the user sees the "Upload" button.
       console.warn(`Failed to fetch URL: ${response.status}`);
       return NextResponse.json({ thumbnailUrl: null });
    }

    const html = await response.text();
    const dom = new JSDOM(html);
    const doc = dom.window.document;

    // Extract image URL from meta tags
    const getMetaContent = (selector: string) => {
        const element = doc.querySelector(selector);
        return element ? element.getAttribute('content') : null;
    };

    const thumbnailUrl = 
        getMetaContent('meta[property="og:image"]') ||
        getMetaContent('meta[name="twitter:image"]') ||
        getMetaContent('meta[property="twitter:image"]') ||
        getMetaContent('meta[name="image"]') ||
        doc.querySelector('link[rel="image_src"]')?.getAttribute('href') ||
        null;

    return NextResponse.json({ thumbnailUrl });

  } catch (error) {
    console.error("Metadata extraction error:", error);
    return NextResponse.json({ thumbnailUrl: null }, { status: 200 }); // Return null on error instead of 500
  }
}
