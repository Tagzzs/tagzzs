import { NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { signUpSchema } from "@/lib/validation/authSchemas";
import { FirebaseUserService } from "@/lib/services/firebaseUserService";

export const dynamic = 'force-dynamic';

/**
 * POST /api/auth/sign-up
 * Creates a new user account with email and password
 * 
 * @param req - Request object containing user registration data
 * @returns JSON response with user data or error message
 */

export async function POST(req: Request) {

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
    const validationResult = signUpSchema.safeParse(body);
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

    const { name, email, password } = validationResult.data;
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

    // Attempt user creation with Supabase Auth
    const { error: authError, data: authData } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          name: name,
          email: email,
        }
      }
    });

    if (authError) {
      // Handle specific Supabase authentication errors
      switch (authError.message) {
        case "User already registered":
        case "Email address is already registered":
          return NextResponse.json(
            {
              success: false,
              error: {
                code: 'USER_EXISTS',
                message: 'An account with this email already exists',
                details: 'Please try signing in instead or use a different email address'
              }
            },
            { status: 409 }
          );
        case "Invalid email":
          return NextResponse.json(
            {
              success: false,
              error: {
                code: 'INVALID_EMAIL',
                message: 'Please provide a valid email address',
                details: 'The email format provided is not valid'
              }
            },
            { status: 400 }
          );
        case "Password should be at least 6 characters":
          return NextResponse.json(
            {
              success: false,
              error: {
                code: 'WEAK_PASSWORD',
                message: 'Password does not meet security requirements',
                details: 'Password must be at least 6 characters long'
              }
            },
            { status: 400 }
          );
        case "Signup is disabled":
          return NextResponse.json(
            {
              success: false,
              error: {
                code: 'SIGNUP_DISABLED',
                message: 'New account registration is currently disabled',
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
                message: 'Failed to create account',
                details: 'An unexpected error occurred during account creation'
              }
            },
            { status: 500 }
          );
      }
    }

    // Validate auth response
    if (!authData?.user) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'AUTH_FAILED',
            message: 'Failed to create account',
            details: 'User creation was unsuccessful'
          }
        },
        { status: 500 }
      );
    }
    // Create user profile and metadata
    try {
      const currentTime = new Date().toISOString();
      // Use upsert to handle potential race conditions
      const { error: profileError } = await supabase
        .from('users')
        .upsert([
          {
            userid: authData.user.id,
            name: name,
            email: email,
            created_at: currentTime,
          }
        ], {
          onConflict: 'userid',
          ignoreDuplicates: false
        });

      if (profileError) {
        // Continue with warning as auth user is already created
      } else {
      }

      // Create Firebase user document
      const firebaseSuccess = await FirebaseUserService.createUserDocument({
        userId: authData.user.id,
        createdAt: currentTime,
        totalContent: 0,
        totalTags: 0,
      });

      if (!firebaseSuccess) {
        // Continue with warning as auth user is already created
      } else {
      }

    } catch (_profileError) {
      // Continue as auth user is created successfully
    }

    // Return success response
    return NextResponse.json(
      {
        success: true,
        data: {
          user: {
            id: authData.user.id,
            name: name,
            email: authData.user.email,
            emailConfirmed: !!authData.user.email_confirmed_at,
            createdAt: authData.user.created_at
          },
          message: authData.user.email_confirmed_at
            ? "Account created successfully! You can now sign in."
            : "Account created successfully! Please check your email to verify your account."
        }
      },
      { 
        status: 201,
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
