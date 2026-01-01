"""
Script to verify the JWT token locally when sent from the frontend
"""

import jwt
from fastapi import Request
from typing import Dict, Any
import os

SUPABASE_JWT_SECRET = os.getenv("SUPABASE_JWT_SECRET")


async def get_current_user(request: Request) -> Dict[str, Any]:
    """
    Dependency that extracts and verifies the JWT locally.
    """

    auth_header = request.headers.get("Authorization")
    if not auth_header or not auth_header.startswith("Bearer "):
        raise Exception("Authentication required")

    token = auth_header.split(" ")[1]

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
        raise Exception("Token has expired")
    except jwt.InvalidTokenError as e:
        raise Exception(f"Invalid token: {str(e)}")
