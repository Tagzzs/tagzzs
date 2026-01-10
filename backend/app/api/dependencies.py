import os
import jwt
from fastapi import Request, HTTPException
from typing import Dict, Any, Optional

SUPABASE_JWT_SECRET = os.getenv("SUPABASE_JWT_SECRET")


async def get_current_user(request: Request) -> Dict[str, Any]:
    """
    Dependency to get the current user from the access_token cookie.
    Falls back to Authorization header for backward compatibility.
    """
    token = request.cookies.get("access_token")

    if not token:
        # Fallback to Authorization header
        auth_header = request.headers.get("Authorization")
        if auth_header and auth_header.startswith("Bearer "):
            token = auth_header.split(" ")[1]

    if not token:
        raise HTTPException(status_code=401, detail="Authentication required")

    if not SUPABASE_JWT_SECRET:
        # Warning only, as we might be using ES256 which doesn't need this secret
        print("Warning: SUPABASE_JWT_SECRET not set. HS256 verification will fail.")

    try:
        unverified_header = jwt.get_unverified_header(token)
        alg = unverified_header.get("alg")

        if alg == "HS256":
            if not SUPABASE_JWT_SECRET:
                raise HTTPException(
                    status_code=500,
                    detail="Server configuration error: SUPABASE_JWT_SECRET not set for HS256",
                )
            payload = jwt.decode(
                token,
                SUPABASE_JWT_SECRET,
                algorithms=["HS256"],
                options={"verify_aud": False},
            )
        elif alg == "ES256" or alg == "RS256":
            supabase_url = os.getenv("NEXT_PUBLIC_SUPABASE_URL")
            if not supabase_url:
                raise HTTPException(
                    status_code=500,
                    detail="Server configuration error: NEXT_PUBLIC_SUPABASE_URL not set for JWKS",
                )
            # Fetch JWKS
            jwks_url = f"{supabase_url}/auth/v1/.well-known/jwks.json"
            signing_key = jwt.PyJWKClient(jwks_url).get_signing_key_from_jwt(token)

            payload = jwt.decode(
                token,
                signing_key.key,
                algorithms=[alg],
                options={"verify_aud": False},
            )
        else:
            raise HTTPException(
                status_code=401, detail=f"Unsupported token algorithm: {alg}"
            )

        return {
            "id": payload.get("sub"),
            "email": payload.get("email"),
            "role": payload.get("role"),
        }
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token has expired")
    except jwt.InvalidTokenError as e:
        raise HTTPException(status_code=401, detail=f"Invalid token: {str(e)}")


async def get_optional_user(request: Request) -> Optional[Dict[str, Any]]:
    """
    Dependency to get the current user if available, else return None.
    Does not raise 401.
    """
    try:
        return await get_current_user(request)
    except HTTPException as e:
        if e.status_code == 401:
            return None
        raise e
