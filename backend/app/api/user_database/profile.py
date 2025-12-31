import os
from datetime import datetime, timezone
from typing import Optional, List, Dict, Any
from fastapi import APIRouter, Request, Depends
from fastapi.responses import JSONResponse
from pydantic import BaseModel, Field, HttpUrl, model_validator, ValidationError
from supabase import create_client, Client

# Internal imports
from app.services.token_verifier import get_current_user
from app.utils.supabase.auth import create_auth_error


# Schema
def format_validation_errors(exc: ValidationError) -> List[Dict[str, str]]:
    """Converts Pydantic errors into the structured ProfileUpdateError format."""
    return [
        {"field": ".".join(map(str, error["loc"])), "message": error["msg"]}
        for error in exc.errors()
    ]


class ProfileUpdateSchema(BaseModel):
    name: Optional[str] = Field(None, min_length=1, max_length=255)
    avatar_url: Optional[HttpUrl] = None

    @model_validator(mode="after")
    def check_at_least_one_field(self) -> "ProfileUpdateSchema":
        provided_fields = self.model_dump(exclude_unset=True)
        if not provided_fields:
            raise ValueError("At least one field must be provided")
        return self


router = APIRouter(prefix="/api/user-database", tags=["Profile Change"])


supabase_url = os.getenv("NEXT_PUBLIC_SUPABASE_URL")
supabase_key = os.getenv("SUPABASE_SERVICE_ROLE_KEY")
supabase: Client = (
    create_client(supabase_url, supabase_key) if supabase_url and supabase_key else None
)


@router.post("/profile")
async def update_profile(
    request: Request, user: Dict[str, Any] = Depends(get_current_user)
):
    try:
        if not user:
            return create_auth_error("Authentication required to update profile")

        if not supabase:
            return JSONResponse(
                status_code=500, content={"error": "Supabase configuration missing"}
            )

        user_id = user.get("id")

        # Parse and Validate Body
        try:
            body = await request.json()
            validation_data = ProfileUpdateSchema(**body)
        except ValidationError as exc:
            return JSONResponse(
                status_code=400,
                content={
                    "success": False,
                    "error": "Validation failed",
                    "code": "VALIDATION_ERROR",
                    "details": format_validation_errors(exc),
                },
            )
        except Exception:
            return JSONResponse(status_code=400, content={"error": "Invalid JSON body"})

        fields_to_update = validation_data.model_dump(exclude_unset=True)
        if "avatar_url" in fields_to_update and fields_to_update["avatar_url"]:
            fields_to_update["avatar_url"] = str(fields_to_update["avatar_url"])

        # Check if user exists (Equivalent to .select("*").eq().single())
        check_user = supabase.table("users").select("*").eq("userid", user_id).execute()

        if not check_user.data:
            return JSONResponse(
                status_code=404,
                content={
                    "success": False,
                    "error": "User not found",
                    "code": "USER_NOT_FOUND",
                    "details": "The requested user record does not exist in the database.",
                },
            )

        # Perform Update
        current_time = datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")
        profile_update_data = {
            **fields_to_update,
            "updated_at": current_time,
        }

        update_result = (
            supabase.table("users")
            .update(profile_update_data)
            .eq("userid", user_id)
            .execute()
        )

        if not update_result.data:
            return JSONResponse(
                status_code=500,
                content={
                    "success": False,
                    "error": "Failed to update profile",
                    "code": "PROFILE_UPDATE_ERROR",
                },
            )

        return JSONResponse(
            status_code=200,
            content={
                "success": True,
                "message": "Profile updated successfully",
                "profile": update_result.data[0],
                "fieldsUpdated": list(fields_to_update.keys()),
                "cacheInvalidated": True,
                "timestamp": current_time,
            },
        )

    except Exception as e:
        return JSONResponse(
            status_code=500,
            content={
                "success": False,
                "error": "Internal server error",
                "code": "INTERNAL_ERROR",
                "details": str(e),
            },
        )
