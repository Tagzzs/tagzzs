from fastapi.responses import JSONResponse
from datetime import datetime, timezone


def create_auth_response(data: any, user: dict, status_code: int = 200) -> JSONResponse:
    """Standardize API responses with user information"""
    return JSONResponse(
        status_code=status_code,
        content={
            "data": data,
            "user": {
                "id": user.get("id"),
                "email": user.get("email"),
            },
            "timestamp": datetime.now(timezone.utc).isoformat().replace("+00:00", "Z"),
        },
    )


def create_auth_error(message: str, status_code: int = 401) -> JSONResponse:
    """Error response for authentication failures"""
    return JSONResponse(
        status_code=status_code,
        content={
            "error": message,
            "timestamp": datetime.utcnow().isoformat() + "Z",
        },
    )
