import { NextRequest, NextResponse } from "next/server";
import { getUserFromHeaders, validateSession } from "@/utils/supabase/auth";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

interface SearchResult {
  content_id: string;
  score: number;
  rank: number;
}

interface SemanticQueryResponse {
  success: boolean;
  query?: string;
  results?: SearchResult[];
  result_count?: number;
  error?: string;
}

export async function POST(
  request: NextRequest
): Promise<NextResponse<SemanticQueryResponse>> {
  try {
    // Get authenticated user from headers
    let user = getUserFromHeaders(request);

    if (!user) {
      const authResult = await validateSession();
      if (authResult.user) {
        user = authResult.user;
      }
    }

    if (!user) {
      return NextResponse.json(
        { success: false, error: "Authentication required" },
        { status: 401 }
      );
    }

    const userId = user.id;
    console.log(`[SEMANTIC_QUERY_PROXY] User: ${userId}`);

    // Parse request body
    const body = await request.json();
    const { query, tags, content_id_filter, limit } = body;

    // Validate inputs
    if (!query || typeof query !== "string") {
      return NextResponse.json(
        { success: false, error: "Query must be a non-empty string" },
        { status: 400 }
      );
    }

    console.log(`[SEMANTIC_QUERY_PROXY] Query: "${query}"`);
    if (tags && tags.length > 0) {
      console.log(`[SEMANTIC_QUERY_PROXY] Tags filter: [${tags.join(", ")}]`);
    }
    if (content_id_filter) {
      console.log(`[SEMANTIC_QUERY_PROXY] Content ID filter: ${content_id_filter}`);
    }

    // Get Python backend URL from environment
    const backendUrl = process.env.TAGZZS_API_URL || "http://localhost:8000";
    const searchUrl = `${backendUrl}/search/semantic-query`;

    console.log(`[SEMANTIC_QUERY_PROXY] Forwarding to Python backend: ${searchUrl}`);

    // Prepare request body for Python backend
    const backendRequestBody = {
      user_id: userId,
      query,
      tags: tags || undefined,
      content_id_filter: content_id_filter || undefined,
      limit: limit || 10,
    };

    // Forward request to Python backend
    console.log("[SEMANTIC_QUERY_PROXY] Sending request to Python backend...");
    const pythonResponse = await fetch(searchUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(backendRequestBody),
    });

    // Parse Python backend response
    const pythonData = await pythonResponse.json();

    if (!pythonResponse.ok) {
      console.error(
        `[SEMANTIC_QUERY_PROXY] Python backend error (${pythonResponse.status}):`,
        pythonData
      );

      return NextResponse.json(
        {
          success: false,
          error: pythonData.error || "Search failed in Python backend",
        },
        { status: pythonResponse.status }
      );
    }

    // Return Python backend response to client
    return NextResponse.json(pythonData);
  } catch (error) {
    console.error("[SEMANTIC_QUERY_PROXY] ❌ Error:", error);

    const errorMessage =
      error instanceof Error ? error.message : "Unknown error occurred";

    return NextResponse.json(
      {
        success: false,
        error: `Search proxy failed: ${errorMessage}`,
      },
      { status: 500 }
    );
  }
}