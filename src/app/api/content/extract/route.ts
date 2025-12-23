import { NextRequest, NextResponse } from "next/server";
import { getUserFromHeaders, createAuthError } from "@/utils/supabase/auth";
import { z } from "zod";

// Request validation schema
const ExtractRequestSchema = z.object({
  url: z.string().url('Invalid URL format'),
  options: z.object({
    enableSummarization: z.boolean().default(true),
    enableTagGeneration: z.boolean().default(true),
    maxLength: z.number().min(50).max(1000).default(200),
    timeout: z.number().min(5000).max(60000).default(30000),
  }).optional().default(() => ({
    enableSummarization: true,
    enableTagGeneration: true,
    maxLength: 200,
    timeout: 30000,
  }))
});

// Interface for pipeline result
interface PipelineResult {
  metadata: unknown;
  result?: string;
  content?: Record<string, unknown>;
  error?: string;
}

// Rate limiting
const rateLimitStore = new Map<string, { count: number; resetTime: number }>();

const RATE_LIMIT_CONFIG = {
  windowMs: 15 * 60 * 1000,
  maxRequests: 20,
  blockDuration: 60 * 60 * 1000,
};

// Blocked domains for security
const BLOCKED_DOMAINS = [
  'localhost',
  '127.0.0.1',
  '0.0.0.0',
  '192.168.',
  '10.',
  '172.16.',
  '172.17.',
  '172.18.',
  '172.19.',
  '172.20.',
  '172.21.',
  '172.22.',
  '172.23.',
  '172.24.',
  '172.25.',
  '172.26.',
  '172.27.',
  '172.28.',
  '172.29.',
  '172.30.',
  '172.31.',
];

function checkRateLimit(userId: string): { allowed: boolean; remainingRequests?: number; resetTime?: number } {
  const now = Date.now();
  const userLimit = rateLimitStore.get(userId);

  if (!userLimit || now > userLimit.resetTime) {
    rateLimitStore.set(userId, {
      count: 1,
      resetTime: now + RATE_LIMIT_CONFIG.windowMs
    });
    return { allowed: true, remainingRequests: RATE_LIMIT_CONFIG.maxRequests - 1, resetTime: now + RATE_LIMIT_CONFIG.windowMs };
  }

  if (userLimit.count >= RATE_LIMIT_CONFIG.maxRequests) {
    return { allowed: false, resetTime: userLimit.resetTime };
  }

  userLimit.count++;
  return { 
    allowed: true, 
    remainingRequests: RATE_LIMIT_CONFIG.maxRequests - userLimit.count,
    resetTime: userLimit.resetTime 
  };
}

/**
 * URL security validation
 */

function validateUrlSecurity(url: string): { safe: boolean; reason?: string } {
  try {
    const parsedUrl = new URL(url);
    
    // Check for blocked domains
    const hostname = parsedUrl.hostname.toLowerCase();
    for (const blockedDomain of BLOCKED_DOMAINS) {
      if (hostname.includes(blockedDomain)) {
        return { safe: false, reason: 'Access to internal/private networks is not allowed' };
      }
    }

    // Only allow HTTP/HTTPS
    if (!['http:', 'https:'].includes(parsedUrl.protocol)) {
      return { safe: false, reason: 'Only HTTP and HTTPS protocols are allowed' };
    }

    // Block suspicious patterns
    if (hostname.includes('admin') || hostname.includes('internal') || hostname.includes('private')) {
      return { safe: false, reason: 'Access to administrative or internal resources is not allowed' };
    }
    return { safe: true };
  } catch {
    return { safe: false, reason: 'Invalid URL format' };
  }
}

/**
 * Generate unique request ID for tracking
 */

function generateRequestId(): string {
  return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Log request for monitoring
 */

function logRequest(requestId: string, userId: string, url: string, status: 'success' | 'error', processingTime: number, errorMessage?: string) {
  const _logEntry = {
    requestId,
    userId,
    url,
    status,
    processingTime,
    timestamp: new Date().toISOString(),
    error: errorMessage || undefined,
  };
}

export async function POST(req: NextRequest) {
  const requestId = generateRequestId();
  const startTime = Date.now();
  let userId: string | undefined;
  let url: string | undefined;

  try {
    // Get authenticated user from request headers
    const user = getUserFromHeaders(req);
    
    if (!user) {
      logRequest(requestId, 'anonymous', 'unknown', 'error', Date.now() - startTime, 'Authentication required');
      return createAuthError('Authentication required to extract content');
    }

    userId = user.id;

    // Rate limiting check
    const rateLimitResult = checkRateLimit(userId);
    if (!rateLimitResult.allowed) {
      logRequest(requestId, userId, 'unknown', 'error', Date.now() - startTime, 'Rate limit exceeded');
      return NextResponse.json(
        { 
          error: "Rate limit exceeded",
          details: "Too many requests. Please try again later.",
          resetTime: rateLimitResult.resetTime 
        },
        { 
          status: 429,
          headers: {
            'X-RateLimit-Limit': RATE_LIMIT_CONFIG.maxRequests.toString(),
            'X-RateLimit-Remaining': '0',
            'X-RateLimit-Reset': rateLimitResult.resetTime?.toString() || '',
            'Retry-After': Math.ceil((rateLimitResult.resetTime! - Date.now()) / 1000).toString(),
          }
        }
      );
    }

    // Parse and validate request body
    let body;
    try {
      body = await req.json();
    } catch {
      logRequest(requestId, userId, 'unknown', 'error', Date.now() - startTime, 'Invalid JSON format');
      return NextResponse.json(
        { error: "Invalid JSON format" },
        { status: 400 }
      );
    }

    // Validate request schema
    const validationResult = ExtractRequestSchema.safeParse(body);
    if (!validationResult.success) {
      logRequest(requestId, userId, body.url || 'invalid', 'error', Date.now() - startTime, 'Request validation failed');
      return NextResponse.json(
        { 
          error: "Invalid request format", 
          details: validationResult.error.flatten().fieldErrors 
        },
        { status: 400 }
      );
    }

    const { url: validatedUrl, options } = validationResult.data;
    url = validatedUrl;

    // Security validation
    const securityCheck = validateUrlSecurity(validatedUrl);
    if (!securityCheck.safe) {
      logRequest(requestId, userId, validatedUrl, 'error', Date.now() - startTime, `Security check failed: ${securityCheck.reason}`);
      return NextResponse.json(
        { 
          error: "URL not allowed",
          details: securityCheck.reason 
        },
        { status: 403 }
      );
    }

    let pipelineResult: PipelineResult;
    let processingTime: number;
    const extractionTimeout = options.timeout + 60000; // Add buffer time

    try {
      const response = await fetch(`${process.env.TAGZZS_API_URL}/extract-refine/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ url: validatedUrl }),
        signal: AbortSignal.timeout(extractionTimeout),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`External service returned ${response.status}: ${errorText}`);
      }

      pipelineResult = await response.json();
      processingTime = Date.now() - startTime;
      
      // Validate that we have proper content
      if (!pipelineResult?.content) {
        throw new Error('External service returned invalid response structure');
      }
    } catch (extractError) {
      processingTime = Date.now() - startTime;
      const errorMessage = extractError instanceof Error ? extractError.message : 'Unknown extraction error';
      logRequest(requestId, userId, validatedUrl, 'error', processingTime, `Extraction failed: ${errorMessage}`);
      return NextResponse.json(
        {
          result: 'error',
          error: 'Failed to extract content from the provided URL',
          details: process.env.NODE_ENV === 'development' ? errorMessage : 'Content extraction service is currently unavailable. Please ensure:\n\n1. The extraction service is running at http://localhost:8000\n2. The URL is publicly accessible (no login required)\n3. The website allows automated content extraction\n\nTry these URLs for testing:\n• https://dev.to/any-article\n• https://medium.com/any-article\n• https://wikipedia.org/wiki/topic\n• Public blog posts or news articles',
          requestId,
          timestamp: new Date().toISOString()
        },
        { status: 200 }
      );
    }
    
    // Validate response format and add rawContent
    const response = {
      result: pipelineResult?.result || 'success',
      metadata: pipelineResult?.metadata,
      content: pipelineResult?.content,
      error: pipelineResult?.error,
      requestId,
      timestamp: new Date().toISOString(),
    };

    logRequest(requestId, userId, validatedUrl, 'success', processingTime);

    return NextResponse.json(response, { 
      status: 200,
      headers: {
        'X-Request-ID': requestId,
        'X-Processing-Time': processingTime.toString(),
        'X-RateLimit-Limit': RATE_LIMIT_CONFIG.maxRequests.toString(),
        'X-RateLimit-Remaining': rateLimitResult.remainingRequests?.toString() || '0',
        'X-RateLimit-Reset': rateLimitResult.resetTime?.toString() || '',
      }
    });
        
  } catch (apiError) {
    const processingTime = Date.now() - startTime;
    const errorMessage = apiError instanceof Error ? apiError.message : 'Unknown error';
    
    logRequest(requestId, userId || 'unknown', url || 'unknown', 'error', processingTime, errorMessage);
    
    // Handle specific error types
    if (apiError instanceof Error) {
      // Groq API errors
      if (errorMessage.includes('GROQ_API_KEY') || errorMessage.includes('api key')) {
        return NextResponse.json(
          { 
            error: "Service configuration error",
            details: "AI service is misconfigured. Please contact support.",
            requestId 
          },
          { status: 503 }
        );
      }
      
      // Rate limit errors from Groq
      if (errorMessage.includes('rate limit') || errorMessage.includes('429')) {
        return NextResponse.json(
          { 
            error: "AI service rate limit",
            details: "AI service is temporarily overloaded. Please try again later.",
            requestId 
          },
          { status: 503 }
        );
      }
      
      if (errorMessage.includes('timeout')) {
        return NextResponse.json(
          { 
            error: "Request timeout",
            details: "The content extraction took too long to complete",
            requestId 
          },
          { status: 408 }
        );
      }
      
      if (errorMessage.includes('network') || errorMessage.includes('fetch')) {
        return NextResponse.json(
          { 
            error: "Network error",
            details: "Unable to fetch the requested URL",
            requestId 
          },
          { status: 502 }
        );
      }
    }

    return NextResponse.json(
      { 
        error: "Internal server error",
        requestId,
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    );
  }
}

// Health check endpoint
export async function GET() {
  return NextResponse.json(
    { 
      status: 'healthy',
      service: 'content-extraction-api',
      timestamp: new Date().toISOString(),
      version: '1.0.0'
    },
    { status: 200 }
  );
}