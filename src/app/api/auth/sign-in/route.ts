import { NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { signInSchema } from "@/lib/validation/authSchemas";

export const dynamic = 'force-dynamic';

/**
 * POST /api/auth/sign-in
 * Authenticates user with email and password
 * 
 * @param req - Request object containing user credentials
 * @returns JSON response with authentication result
 */

export async function POST(req: Request) {
  let email: string | null = null;

  try {
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
    const validationResult = signInSchema.safeParse(body);
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

    const { email: userEmail, password } = validationResult.data;
    email = userEmail;
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

    // Check if user exists before attempting authentication
    const { data: userData, error: userCheckError } = await supabase.auth.admin.listUsers();
    
    if (!userCheckError && userData) {
      const userExists = userData.users.some(user => user.email === email);
      
      if (!userExists) {
        return NextResponse.json(
          {
            success: false,
            error: {
              code: 'USER_NOT_FOUND',
              message: 'User does not exist. Please sign up to create an account.',
              details: 'No account found with this email address'
            }
          },
          { status: 404 }
        );
      }
    }

    // Attempt authentication
    const { error: authError, data: authData } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (authError) {
      // Handle specific authentication errors
      switch (authError.message) {
        case "Invalid login credentials":
          return NextResponse.json(
            {
              success: false,
              error: {
                code: 'INVALID_CREDENTIALS',
                message: 'Invalid email or password. Please check your credentials and try again.',
                details: 'The email or password you entered is incorrect'
              }
            },
            { status: 401 }
          );
        case "Email not confirmed":
          return NextResponse.json(
            {
              success: false,
              error: {
                code: 'EMAIL_NOT_CONFIRMED',
                message: 'Email address not verified',
                details: 'Please check your email and click the verification link'
              }
            },
            { status: 401 }
          );
        case "Too many requests":
          return NextResponse.json(
            {
              success: false,
              error: {
                code: 'RATE_LIMIT_EXCEEDED',
                message: 'Too many sign-in attempts',
                details: 'Please wait a moment before trying again'
              }
            },
            { status: 429 }
          );
        case "Signups not allowed for this instance":
          return NextResponse.json(
            {
              success: false,
              error: {
                code: 'SIGNIN_DISABLED',
                message: 'Sign-in is currently disabled',
                details: 'Please contact support for assistance'
              }
            },
            { status: 403 }
          );
        default:
          return NextResponse.json(
            {
              success: false,
              error: {
                code: 'AUTH_FAILED',
                message: 'Authentication failed',
                details: 'An unexpected error occurred during sign-in'
              }
            },
            { status: 500 }
          );
      }
    }

    // Validate authentication response
    if (!authData?.user || !authData?.session) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'AUTH_FAILED',
            message: 'Authentication failed',
            details: 'Sign-in was unsuccessful'
          }
        },
        { status: 500 }
      );
    }

    // Return success response
    return NextResponse.json(
      {
        success: true,
        data: {
          user: {
            id: authData.user.id,
            email: authData.user.email,
            name: authData.user.user_metadata?.name || authData.user.user_metadata?.full_name,
            emailConfirmed: !!authData.user.email_confirmed_at,
            lastSignIn: authData.user.last_sign_in_at
          },
          session: {
            accessToken: authData.session.access_token,
            refreshToken: authData.session.refresh_token,
            expiresAt: authData.session.expires_at,
            expiresIn: authData.session.expires_in
          },
          message: "Sign-in successful"
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