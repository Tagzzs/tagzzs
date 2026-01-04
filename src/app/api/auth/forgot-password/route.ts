import { NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { z } from "zod";

export const dynamic = 'force-dynamic';

// Validation schema for forgot password request
const forgotPasswordSchema = z.object({
  email: z.string().email("Please provide a valid email address"),
});
const rateLimitStore = new Map<string, {count: number; resetTime:number }>();
const RATE_LIMIT = { windowMs: 15*60*1000, maxRequests: 5 };

function checkRateLimit(key: string){
  const now = Date.now();
  const entry = rateLimitStore.get(key);
  if (!entry || now > entry.resetTime){
    rateLimitStore.set(key, { count: 1, resetTime: now + RATE_LIMIT.windowMs});
    return { allowed: true, remaining: RATE_LIMIT.maxRequests - 1, reset: now + RATE_LIMIT.windowMs };
  }
  if (entry.count >= RATE_LIMIT.maxRequests) {
    return { allowed: false, remaining: 0, reset: entry.resetTime };
  }
  entry.count += 1;
  return { allowed: true, remaining: RATE_LIMIT.maxRequests - entry.count, reset: entry.resetTime };
}

/**
 * POST /api/auth/forgot-password
 * Sends a password reset email to the user
 * 
 * @param req - Request object containing user email
 * @returns JSON response with reset email status
 */

export async function POST(req: Request) {
  
  let email: string | null = null;

  try {
    // Rate limiting check
    const _clientIP = req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || 'unknown';
    // Parse and validate request body
    let body;
    try { 
      body = await req.json();
    } catch (_parseError) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'INVALID_JSON',
            message: 'Invalid JSON format in request body',
            details: 'Please ensure your request body contains valid JSON'
          }
        },
        { status: 400 }
      );
    }

    // Validate input schema
    const validationResult = forgotPasswordSchema.safeParse(body);
    if (!validationResult.success) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid input data provided',
            details: validationResult.error.flatten().fieldErrors
          }
        },
        { status: 400 }
      );
    }

    email = validationResult.data.email;
    // Initialize Supabase client
    const supabase = await createClient();
    if (!supabase) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'SERVICE_UNAVAILABLE',
            message: 'Authentication service is temporarily unavailable',
            details: 'Please try again later'
          }
        },
        { status: 503 }
      );
    }

    // Check if user exists in database (optional, for better UX)
    const { data: userData, error: userCheckError } = await supabase
      .from('users')
      .select('email')
      .eq('email', email)
      .single();

    if (userCheckError || !userData) {
      // Return success anyway to prevent email enumeration attacks
      return NextResponse.json(
        {
          success: true,
          data: {
            message: "If an account with that email exists, a password reset link has been sent.",
            emailSent: true
          }
        },
        { status: 200 }
      );
    }

    const key = `${_clientIP}:${email ?? "anon"}`
    const rl = checkRateLimit(key);
    if(!rl.allowed){
      return NextResponse.json(
        { success: false, error: { code: 'RATE_LIMIT_EXCEEDED', message: 'Too many requests', details: 'Please try again later'}},
        { status: 429, headers: {
          'X-RateLimit-Limit': RATE_LIMIT.maxRequests.toString(),
          'X-RateLimit-Remamining': rl.remaining.toString(),
          'X-RateLimit-Reset': rl.reset.toString(),
          'Retry-After': Math.ceil((rl.reset - Date.now()) / 1000).toString(),
        }}
      );
    }

    // Send password reset email
    const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/auth/reset-password`,
    });

    if (resetError) {
      // Handle specific reset errors
      switch (resetError.message) {
        case "For security purposes, you can only request this once every 60 seconds":
          return NextResponse.json(
            {
              success: false,
              error: {
                code: 'RATE_LIMIT_EXCEEDED',
                message: 'Too many password reset requests',
                details: 'Please wait 60 seconds before requesting another reset'
              }
            },
            { status: 429 }
          );
        case "Email rate limit exceeded":
          return NextResponse.json(
            {
              success: false,
              error: {
                code: 'EMAIL_RATE_LIMIT',
                message: 'Email rate limit exceeded',
                details: 'Please try again later'
              }
            },
            { status: 429 }
          );
        default:
          // Return success to prevent email enumeration
          return NextResponse.json(
            {
              success: true,
              data: {
                message: "If an account with that email exists, a password reset link has been sent.",
                emailSent: true
              }
            },
            { status: 200 }
          );
      }
    }

    // Return success response
    return NextResponse.json(
      {
        success: true,
        data: {
          message: "Password reset instructions have been sent to your email address.",
          emailSent: true,
          email: email
        }
      },
      { 
        status: 200,
        headers: {
          'Content-Type': 'application/json',
        }
      }
    );

  } catch (error) {
    // Handle different types of errors
    if (error instanceof SyntaxError) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'INVALID_JSON',
            message: 'Invalid JSON format in request body',
            details: 'Please ensure your request body contains valid JSON'
          }
        },
        { status: 400 }
      );
    }

    if (error instanceof TypeError) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'INVALID_REQUEST',
            message: 'Invalid request format',
            details: 'Please check your request parameters and try again'
          }
        },
        { status: 400 }
      );
    }

    // Generic server error
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'An unexpected error occurred',
          details: 'Please try again later or contact support if the problem persists'
        }
      },
      { status: 500 }
    );
  }
}