import { NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";

export const dynamic = 'force-dynamic';

/**
 * POST /api/auth/sign-out
 * Signs out the current user session
 * 
 * @param req - Request object (optional, for future session validation)
 * @returns JSON response with sign-out result
 */

export async function POST(req: Request) {
  try {
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

    // Check if user has an active session
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
      } else {
      }
    } catch (_sessionError) {
      // Continue with sign-out even if we can't get user info
    }

    // Attempt to sign out
    const { error: signoutError } = await supabase.auth.signOut();

    if (signoutError) {
      // Handle specific signout errors
      switch (signoutError.message) {
        case "Invalid session":
        case "No session found":
          // User was already logged out, this is actually success
          break;
        case "Network error":
          return NextResponse.json(
            {
              success: false,
              error: {
                code: 'NETWORK_ERROR',
                message: 'Network error during signout',
                details: 'Please check your connection and try again'
              }
            },
            { status: 503 }
          );
        default:
          return NextResponse.json(
            {
              success: false,
              error: {
                code: 'SIGNOUT_FAILED',
                message: 'Failed to sign out',
                details: 'An unexpected error occurred during signout'
              }
            },
            { status: 500 }
          );
      }
    }

    // Return success response
    return NextResponse.json(
      {
        success: true,
        data: {
          message: "Successfully signed out",
          loggedOut: true,
          timestamp: new Date().toISOString()
        }
      },
      { 
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          // Clear any auth-related cookies/headers if needed
        }
      }
    );

  } catch (error) {
    // Handle different types of errors
    if (error instanceof TypeError) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'INVALID_REQUEST',
            message: 'Invalid request format',
            details: 'Please check your request and try again'
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
          message: 'An unexpected error occurred during signout',
          details: 'Please try again later or contact support if the problem persists'
        }
      },
      { status: 500 }
    );
  }
}
