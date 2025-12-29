from datetime import datetime
from fastapi import APIRouter, HTTPException, status
from app.api.auth.schemas import SignUpRequest, SignInRequest
from app.api.auth.supabase_client import get_supabase
from app.services.firebase.firebase_user_service import FirebaseUserService

router = APIRouter(prefix="/auth", tags=["Authentication"])


@router.post("/sign-up", status_code=status.HTTP_201_CREATED)
async def sign_up(body: SignUpRequest):
    supabase = get_supabase()

    # Attempt user creation with Supabase Auth
    try:
        res = supabase.auth.sign_up({
            "email": body.email,
            "password": body.password,
            "options": {
                "data": {
                    "name": body.name,
                    "email": body.email
                }
            }
        })
    except Exception as e:
        error_msg = str(e)

        # Mapping supabase errors
        if "already registered" in error_msg:
            code, message, status_code = "USER_EXISTS", "An account with this email already exists", 409
        elif "invalid email" in error_msg:
            code, message, status_code = "INVALID_EMAIL", "Please provide a valid email address", 400
        elif "at least 6 characters" in error_msg:
            code, message, status_code = "WEAK_PASSWORD", "Password must be at least 6 characters long", 400
        elif "signup is disabled" in error_msg:
            code, message, status_code = "SIGNUP_DISABLED", "New account registration is currently disabled", 403
        else:
            code, message, status_code = "AUTH_FAILED", "Failed to create account", 500

        raise HTTPException(
            status_code=status_code,
            detail={
                "success": False,
                "error": {
                    "code": code,
                    "message": message,
                    "details": str(e)
                }
            }
        )

    if not res.user:
        raise HTTPException(status_code=500, detail="User creation was unsuccessful")

    user_id = res.user.id
    current_time = datetime.utcnow().isoformat()

    # Sync to Supabase
    try:
        supabase.table('users').upsert({
            "userid": user_id,
            "name": body.name,
            "email": body.email,
            "created_at": current_time,
        }, on_conflict="userid").execute()
    except Exception as db_error:
        # Log error but continue as auth user is already created
        print(f"Supabase DB Warning: {db_error}")

    # Create Firebase user document (Firestore)
    firebase_success = FirebaseUserService.create_user_document(
        user_id=user_id,
        created_at=current_time
    )

    if not firebase_success:
        # Log warning but continue
        print(f"Firebase Sync Warning: Failed to create document for {user_id}")

    # Return success response
    return {
        "success": True,
        "data": {
            "user": {
                "id": res.user.id,
                "email": res.user.email,
                "name": body.name
            },
            "session": {
                "accessToken": res.session.access_token,
                "refreshToken": res.session.refresh_token,
                "expiresAt": res.session.expires_at
            } if res.session else None,  # TODO: Will be used for email confirmation later.
            "message": "Account created! Check your email if verification is required."
        }
    }


@router.post("/sign-in")
async def sign_in(body: SignInRequest):
    supabase = get_supabase()

    # Check if user exists
    try:
        # Attempt direct signin
        auth_res = supabase.auth.sign_in_with_password({
            "email": body.email,
            "password": body.password,
        })
    except Exception as e:
        error_msg = str(e)

        # Mapping Supabase errors relative to the previous next.js code
        if "Invalid login credentials" in error_msg:
            code, msg, status_code = "INVALID_CREDENTIALS", "Invalid email or password", 401
        elif "Email not confirmed" in error_msg:
            code, msg, status_code = "EMAIL_NOT_CONFIRMED", "Email address not verified", 401
        elif "Too many requests" in error_msg:
            code, msg, status_code = "RATE_LIMIT_EXCEEDED", "Too many sign-in attempts", 429
        else:
            code, msg, status_code = "AUTH_FAILED", "Authentication failed", 500

        raise HTTPException(
            status_code=status_code,
            detail={
                "success": False,
                "error": {
                    "code": code,
                    "message": msg,
                    "details": error_msg
                }
            }
        )

    # Validate session data
    if not auth_res.user or not auth_res.session:
        raise HTTPException(status_code=500, detail="Sign-in was unsuccessful")

    # Return success response
    return {
        "success": True,
        "data": {
            "user": {
                "id": auth_res.user.id,
                "email": auth_res.user.email,
                "name": auth_res.user.user_metadata.get("name"),
                "emailConfirmed": bool(auth_res.user.email_confirmed_at),
                "lastSignIn": auth_res.user.last_sign_in_at
            },
            "session": {
                "accessToken": auth_res.session.access_token,
                "refreshToken": auth_res.session.refresh_token,
                "expiresAt": auth_res.session.expires_at,
                "expiresIn": auth_res.session.expires_in
            },
            "message": "Sign-in successful"
        }
    }


from fastapi import APIRouter, HTTPException, Request, status
from .supabase_client import get_supabase
from datetime import datetime


@router.post("/sign-out")
async def sign_out(request: Request):
    """
    Signs out the current user session.
    Equivalent to sign_out_route.ts.
    """
    try:
        supabase = get_supabase()

        # Extract token from Authorization header
        auth_header = request.headers.get("Authorization")
        if not auth_header:
            # If no header, user is effectively signed out
            return {
                "success": True,
                "data": {
                    "message": "Already signed out or no session found",
                    "loggedOut": True,
                    "timestamp": datetime.utcnow().isoformat()
                }
            }

        # Attempt to sign out using Supabase Auth
        try:
            supabase.auth.sign_out()
        except Exception as signout_error:
            error_msg = str(signout_error)
            if "Invalid session" in error_msg or "No session found" in error_msg:
                pass  # Already logged out, treat as success
            elif "Network error" in error_msg:
                raise HTTPException(
                    status_code=503,
                    detail={
                        "success": False,
                        "error": {
                            "code": "NETWORK_ERROR",
                            "message": "Network error during signout",
                            "details": error_msg
                        }
                    }
                )
            else:
                raise HTTPException(
                    status_code=500,
                    detail={
                        "success": False,
                        "error": {
                            "code": "SIGNOUT_FAILED",
                            "message": "Failed to sign out",
                            "details": error_msg
                        }
                    }
                )

        # Return success response
        return {
            "success": True,
            "data": {
                "message": "Successfully signed out",
                "loggedOut": True,
                "timestamp": datetime.utcnow().isoformat()
            }
        }

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail={
                "success": False,
                "error": {
                    "code": "INTERNAL_ERROR",
                    "message": "An unexpected error occurred during signout",
                    "details": str(e)
                }
            }
        )
