from datetime import datetime
from typing import Dict, Any
from fastapi import APIRouter, HTTPException, status, Response, Request, Depends
from app.api.auth.schemas import SignUpRequest, SignInRequest
from app.api.auth.supabase_client import get_supabase
from app.services.firebase.firebase_user_service import FirebaseUserService
from app.api.dependencies import get_current_user


router = APIRouter(prefix="/auth", tags=["Authentication"])


@router.post("/sign-up", status_code=status.HTTP_201_CREATED)
async def sign_up(body: SignUpRequest, response: Response):
    supabase = get_supabase()

    # Attempt user creation with Supabase Auth
    try:
        res = supabase.auth.sign_up(
            {
                "email": body.email,
                "password": body.password,
                "options": {"data": {"name": body.name, "email": body.email}},
            }
        )
    except Exception as e:
        error_msg = str(e)

        # Mapping supabase errors
        if "already registered" in error_msg:
            code, message, status_code = (
                "USER_EXISTS",
                "An account with this email already exists",
                409,
            )
        elif "invalid email" in error_msg:
            code, message, status_code = (
                "INVALID_EMAIL",
                "Please provide a valid email address",
                400,
            )
        elif "at least 6 characters" in error_msg:
            code, message, status_code = (
                "WEAK_PASSWORD",
                "Password must be at least 6 characters long",
                400,
            )
        elif "signup is disabled" in error_msg:
            code, message, status_code = (
                "SIGNUP_DISABLED",
                "New account registration is currently disabled",
                403,
            )
        else:
            code, message, status_code = "AUTH_FAILED", "Failed to create account", 500

        raise HTTPException(
            status_code=status_code,
            detail={
                "success": False,
                "error": {"code": code, "message": message, "details": str(e)},
            },
        )

    if not res.user:
        raise HTTPException(status_code=500, detail="User creation was unsuccessful")

    user_id = res.user.id
    current_time = datetime.utcnow().isoformat()

    # Sync to Supabase
    try:
        supabase.table("users").upsert(
            {
                "userid": user_id,
                "name": body.name,
                "email": body.email,
                "created_at": current_time,
            },
            on_conflict="userid",
        ).execute()
    except Exception as db_error:
        # Log error but continue as auth user is already created
        print(f"Supabase DB Warning: {db_error}")

    # Create Firebase user document (Firestore)
    firebase_success = FirebaseUserService.create_user_document(
        user_id=user_id, created_at=current_time
    )

    if not firebase_success:
        # Log warning but continue
        print(f"Firebase Sync Warning: Failed to create document for {user_id}")

    # Set cookies if session is present
    if res.session:
        response.set_cookie(
            key="access_token",
            value=res.session.access_token,
            httponly=True,
            secure=False,  # Set to False for localhost development
            samesite="lax",
            max_age=res.session.expires_in,
        )
        response.set_cookie(
            key="refresh_token",
            value=res.session.refresh_token,
            httponly=True,
            secure=False,
            samesite="lax",
            max_age=30 * 24 * 60 * 60,  # 30 days roughly
        )

    # Return success response (Sensitized)
    return {
        "success": True,
        "data": {
            "user": {"id": res.user.id, "email": res.user.email, "name": body.name},
            "message": "Account created! Check your email if verification is required.",
        },
    }


@router.post("/sign-in")
async def sign_in(body: SignInRequest, response: Response):
    supabase = get_supabase()

    # Check if user exists
    try:
        # Attempt direct signin
        auth_res = supabase.auth.sign_in_with_password(
            {
                "email": body.email,
                "password": body.password,
            }
        )
    except Exception as e:
        error_msg = str(e)

        # Mapping Supabase errors relative to the previous next.js code
        if "Invalid login credentials" in error_msg:
            code, msg, status_code = (
                "INVALID_CREDENTIALS",
                "Invalid email or password",
                401,
            )
        elif "Email not confirmed" in error_msg:
            code, msg, status_code = (
                "EMAIL_NOT_CONFIRMED",
                "Email address not verified",
                401,
            )
        elif "Too many requests" in error_msg:
            code, msg, status_code = (
                "RATE_LIMIT_EXCEEDED",
                "Too many sign-in attempts",
                429,
            )
        else:
            code, msg, status_code = "AUTH_FAILED", "Authentication failed", 500

        raise HTTPException(
            status_code=status_code,
            detail={
                "success": False,
                "error": {"code": code, "message": msg, "details": error_msg},
            },
        )

    # Validate session data
    if not auth_res.user or not auth_res.session:
        raise HTTPException(status_code=500, detail="Sign-in was unsuccessful")

    # Set Cookies
    response.set_cookie(
        key="access_token",
        value=auth_res.session.access_token,
        httponly=True,
        secure=False,  # False for localhost
        samesite="lax",
        max_age=auth_res.session.expires_in,
    )
    response.set_cookie(
        key="refresh_token",
        value=auth_res.session.refresh_token,
        httponly=True,
        secure=False,
        samesite="lax",
        max_age=30 * 24 * 60 * 60,  # 30 days
    )

    # Return success response (Sensitized - no tokens in body)
    return {
        "success": True,
        "data": {
            "user": {
                "id": auth_res.user.id,
                "email": auth_res.user.email,
                "name": auth_res.user.user_metadata.get("name"),
                "emailConfirmed": bool(auth_res.user.email_confirmed_at),
                "lastSignIn": auth_res.user.last_sign_in_at,
            },
            "message": "Sign-in successful",
        },
    }


@router.post("/sign-out")
async def sign_out(request: Request, response: Response):
    """
    Signs out the current user session.
    Clears cookies and calls Supabase signout.
    """
    try:
        supabase = get_supabase()

        # Attempt to sign out using Supabase Auth
        try:
            supabase.auth.sign_out()
        except Exception:
            # We ignore errors here because we are clearing cookies anyway
            pass

        # Clear Cookies
        response.delete_cookie(key="access_token", httponly=True, samesite="lax")
        response.delete_cookie(key="refresh_token", httponly=True, samesite="lax")

        # Return success response
        return {
            "success": True,
            "data": {
                "message": "Successfully signed out",
                "loggedOut": True,
                "timestamp": datetime.utcnow().isoformat(),
            },
        }

    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail={
                "success": False,
                "error": {
                    "code": "INTERNAL_ERROR",
                    "message": "An unexpected error occurred during signout",
                    "details": str(e),
                },
            },
        )


@router.get("/me")
async def get_me(user: Dict[str, Any] = Depends(get_current_user)):
    """
    Returns the current user based on HttpOnly cookie.
    Used for client-side auth state initialization.
    """
    return {"success": True, "user": user}


@router.post("/refresh")
async def refresh_session(request: Request, response: Response):
    """
    Refreshes the session using the refresh token cookie.
    """
    refresh_token = request.cookies.get("refresh_token")

    if not refresh_token:
        raise HTTPException(status_code=401, detail="No refresh token found")

    supabase = get_supabase()

    try:
        res = supabase.auth.refresh_session(refresh_token)
        if not res.session:
            raise HTTPException(status_code=401, detail="Session refresh failed")

        # Set new cookies
        response.set_cookie(
            key="access_token",
            value=res.session.access_token,
            httponly=True,
            secure=False,
            samesite="lax",
            max_age=res.session.expires_in,
        )
        response.set_cookie(
            key="refresh_token",
            value=res.session.refresh_token,
            httponly=True,
            secure=False,
            samesite="lax",
            max_age=30 * 24 * 60 * 60,
        )

        return {"success": True, "user": {"id": res.user.id, "email": res.user.email}}
    except Exception as e:
        raise HTTPException(status_code=401, detail=f"Refresh failed: {str(e)}")
