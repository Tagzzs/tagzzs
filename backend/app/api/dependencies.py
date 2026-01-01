import os
import jwt
from fastapi import Request, HTTPException
from typing import Dict, Any

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
        raise HTTPException(
            status_code=500,
            detail="Server configuration error: SUPABASE_JWT_SECRET not set",
        )

    try:
        # Locally verify the signature, expiration, and audience
        payload = jwt.decode(
            token,
            SUPABASE_JWT_SECRET,
            algorithms=["HS256"],
            options={"verify_aud": False},
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
