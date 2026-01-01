from datetime import datetime
from typing import Dict, Any, Optional
import os
from fastapi import APIRouter, HTTPException, status, Response, Request, Depends
from fastapi.responses import RedirectResponse
from app.api.auth.schemas import SignUpRequest, SignInRequest
from app.api.auth.supabase_client import get_supabase, get_supabase_admin
from app.services.firebase.firebase_user_service import FirebaseUserService
from app.api.dependencies import get_current_user


router = APIRouter(prefix="/auth", tags=["Authentication"])


@router.get("/login/google")
async def login_google(request: Request):
    """
    Initiates the Google OAuth flow with manual PKCE.
    """
    supabase = get_supabase()

    # Determine Backend URL for the callback
    backend_url = os.environ.get("NEXT_PUBLIC_BACKEND_URL")
    if not backend_url:
        backend_url = str(request.base_url).rstrip("/")

    redirect_url = f"{backend_url}/auth/callback"

    # Generate PKCE verifier and challenge
    import secrets
    import hashlib
    import base64

    def generate_pkce_pair():
        # Generate a random 32-byte verifier
        verifier = secrets.token_urlsafe(32)
        # Calculate SHA256 hash
        digest = hashlib.sha256(verifier.encode("utf-8")).digest()
        # Base64URL encode the hash
        challenge = base64.urlsafe_b64encode(digest).rstrip(b"=").decode("utf-8")
        return verifier, challenge

    verifier, challenge = generate_pkce_pair()

    # Construct Supabase Auth URL
    # We use the underlying project URL + /auth/v1/authorize
    supabase_url = os.environ.get("NEXT_PUBLIC_SUPABASE_URL")
    if not supabase_url:
        raise HTTPException(status_code=500, detail="Supabase URL not configured")

    # Build the authorization URL manually
    # https://supabase.com/docs/guides/auth/auth-helpers/auth-ui#oauth-providers
    import urllib.parse

    params = {
        "provider": "google",
        "redirect_to": redirect_url,
        "code_challenge": challenge,
        "code_challenge_method": "S256",
    }
    query_string = urllib.parse.urlencode(params)
    auth_url = f"{supabase_url}/auth/v1/authorize?{query_string}"

    response = RedirectResponse(url=auth_url)

    # Store the verifier in a cookie so we can use it in the callback
    response.set_cookie(
        key="auth_code_verifier",
        value=verifier,
        httponly=True,
        secure=False,  # Set to True in production
        samesite="lax",
        max_age=600,  # 10 minutes expiration
    )

    return response


@router.get("/callback")
async def auth_callback(code: str, request: Request, response: Response):
    """
    Exchanges the auth code for a session using the stored PKCE verifier.
    """
    supabase = get_supabase()

    if not code:
        raise HTTPException(status_code=400, detail="Missing auth code")

    # Retrieve the code verifier from the cookie
    code_verifier = request.cookies.get("auth_code_verifier")
    if not code_verifier:
        raise HTTPException(
            status_code=400,
            detail="Missing code verifier in session. Please try logging in again.",
        )

    try:
        # 1. Exchange code for session WITH the verifier
        res = supabase.auth.exchange_code_for_session(
            {"auth_code": code, "code_verifier": code_verifier}
        )

        if not res.session or not res.user:
            raise HTTPException(status_code=400, detail="Invalid session data")

        # 2. Extract User Info
        user = res.user
        user_id = user.id
        email = user.email
        metadata = user.user_metadata or {}

        avatar_url = metadata.get("avatar_url") or metadata.get("picture")
        full_name = metadata.get("full_name") or metadata.get("name")

        # 3. Database Upsert using Admin Client (Bypass RLS)
        admin_supabase = get_supabase_admin()
        current_time = datetime.utcnow().isoformat()

        updates = {
            "userid": user_id,
            "email": email,
            "updated_at": current_time,
        }

        if full_name:
            updates["name"] = full_name
        if avatar_url:
            updates["avatar_url"] = avatar_url

        try:
            admin_supabase.table("users").upsert(
                updates, on_conflict="userid"
            ).execute()
        except Exception as e:
            print(f"Error syncing user to Supabase: {e}")

        # 4. Sync to Firebase
        FirebaseUserService.create_user_document(
            user_id=user_id, created_at=current_time
        )

        # 5. Conditional Redirect Logic
        user_data = (
            admin_supabase.table("users")
            .select("*")
            .eq("userid", user_id)
            .single()
            .execute()
        )

        is_complete = True
        if user_data.data:
            if not user_data.data.get("name"):
                is_complete = False

        frontend_url = os.environ.get(
            "NEXT_PUBLIC_FRONTEND_URL", "http://localhost:3000"
        )

        target_path = "/dashboard" if is_complete else "/onboarding"
        redirect_to = f"{frontend_url}{target_path}"

        # 6. Set Cookies
        redirect_resp = RedirectResponse(url=redirect_to, status_code=302)

        redirect_resp.set_cookie(
            key="access_token",
            value=res.session.access_token,
            httponly=True,
            secure=False,
            samesite="lax",
            max_age=res.session.expires_in,
        )
        redirect_resp.set_cookie(
            key="refresh_token",
            value=res.session.refresh_token,
            httponly=True,
            secure=False,
            samesite="lax",
            max_age=30 * 24 * 60 * 60,
        )

        # Clear the verifier cookie
        redirect_resp.delete_cookie(key="auth_code_verifier")

        return redirect_resp

    except Exception as e:
        # If possible, detailed logging
        print(f"Callback Error: {e}")
        raise HTTPException(
            status_code=500, detail=f"Authentication callback failed: {str(e)}"
        )


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
    Returns the current user based on HttpOnly cookie, verifying they exist in the DB.
    """
    user_id = user.get("id")
    if not user_id:
        raise HTTPException(status_code=401, detail="Invalid token data")

    admin_supabase = get_supabase_admin()

    # Verify user exists in our 'users' table
    # We use single() which raises an error if no row is found
    try:
        db_user = (
            admin_supabase.table("users")
            .select("*")
            .eq("userid", user_id)
            .single()
            .execute()
        )
        if not db_user.data:
            raise HTTPException(status_code=401, detail="User not found")

        # Merge DB data with Token data if needed, or just return DB data
        # For now, we return the token user data but validated
        return {"success": True, "user": user, "profile": db_user.data}

    except Exception as e:
        # User likely doesn't exist or DB error
        print(f"User validation failed: {e}")
        raise HTTPException(status_code=401, detail="User validation failed")


@router.delete("/delete")
async def delete_account(
    response: Response, user: Dict[str, Any] = Depends(get_current_user)
):
    """
    Permanently deletes the user account and all associated data.
    """
    user_id = user.get("id")
    if not user_id:
        raise HTTPException(status_code=400, detail="Invalid user session")

    admin_supabase = get_supabase_admin()

    try:
        # 1. Delete Avatar from Storage (user_avatars bucket)
        try:
            # List files in the user's folder
            files = admin_supabase.storage.from_("user_avatars").list(path=user_id)
            if files:
                # Construct exact paths to delete
                files_to_remove = [f"{user_id}/{file['name']}" for file in files]
                if files_to_remove:
                    admin_supabase.storage.from_("user_avatars").remove(files_to_remove)
                    print(
                        f"Deleted {len(files_to_remove)} avatar files for user {user_id}"
                    )
        except Exception as storage_error:
            # Log but don't fail the whole request if storage cleanup fails
            print(f"Failed to cleanup avatar storage: {storage_error}")

        # 2. Delete from public.users table
        admin_supabase.table("users").delete().eq("userid", user_id).execute()

        # 2. Delete from Supabase Auth (admin_delete_user)
        # This is critical to actually remove the account login
        admin_supabase.auth.admin.delete_user(user_id)

        # 3. Clear Cookies
        response.delete_cookie(key="access_token", httponly=True, samesite="lax")
        response.delete_cookie(key="refresh_token", httponly=True, samesite="lax")

        return {"success": True, "message": "Account deleted successfully"}

    except Exception as e:
        print(f"Delete account error: {e}")
        raise HTTPException(
            status_code=500, detail=f"Failed to delete account: {str(e)}"
        )


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
