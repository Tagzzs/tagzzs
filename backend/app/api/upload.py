import re
import time
from typing import Dict, Any
from fastapi import APIRouter, UploadFile, File, Form, Depends
from fastapi.responses import JSONResponse
from app.utils.supabase.supabase_client import supabase
from pydantic import BaseModel, HttpUrl

# Internal imports
from app.api.dependencies import get_current_user
from app.utils.supabase.auth import create_auth_error

router = APIRouter(prefix="/api", tags=["Storage"])


@router.post("/upload")
async def upload_file(
    file: UploadFile = File(...),
    fileType: str = Form("content"),
    user: Dict[str, Any] = Depends(get_current_user),
):
    try:
        if not supabase:
            return JSONResponse(
                status_code=500,
                content={
                    "error": "Server configuration error: Missing Supabase credentials"
                },
            )

        if not user:
            return create_auth_error("Authentication required to update profile")

        max_size = 10 * 1024 * 1024
        bucket_name = "user_uploads"

        if fileType == "thumbnail":
            max_size = 2 * 1024 * 1024
            bucket_name = "user_thumbnails"

            # Validate thumbnail is an image
            if not file.content_type.startswith("image/"):
                return JSONResponse(
                    status_code=400,
                    content={"error": "Thumbnail must be an image file"},
                )

        elif fileType == "avatar":
            max_size = 2 * 1024 * 1024
            bucket_name = "user_avatars"

            if not file.content_type.startswith("image/"):
                return JSONResponse(
                    status_code=400,
                    content={"error": "Avatar must be an image file"},
                )

        # Validate file size
        file_content = await file.read()
        file_size = len(file_content)

        if file_size > max_size:
            return JSONResponse(
                status_code=400,
                content={
                    "error": f"File size exceeds {max_size / (1024 * 1024)}MB limit"
                },
            )

        # Generate unique filename
        timestamp = int(time.time() * 1000)
        sanitized_name = re.sub(r"[^a-zA-Z0-9.-]", "_", file.filename)

        if fileType == "avatar":
            unique_file_name = f"{user['id']}/{timestamp}_{sanitized_name}"
        else:
            # Match avatar structure: user_id/timestamp_filename
            unique_file_name = f"{user['id']}/{timestamp}_{sanitized_name}"

        # Upload to Supabase Storage
        supabase.storage.from_(bucket_name).upload(
            path=unique_file_name,
            file=file_content,
            file_options={"content-type": file.content_type, "upsert": "false"},
        )

        public_url_data = supabase.storage.from_(bucket_name).get_public_url(
            unique_file_name
        )

        return JSONResponse(
            status_code=201,
            content={
                "success": True,
                "fileName": unique_file_name,
                "fileUrl": public_url_data,
                "fileSize": file_size,
                "fileType": file.content_type,
                "originalName": file.filename,
                "bucket": bucket_name,
            },
        )

    except Exception as e:
        return JSONResponse(
            status_code=500,
            content={"error": "Internal server error", "details": str(e)},
        )


class UploadFromUrlSchema(BaseModel):
    imageUrl: HttpUrl


@router.post("/upload/from-url")
async def upload_from_url(
    body: UploadFromUrlSchema,
    user: Dict[str, Any] = Depends(get_current_user),
):
    import httpx

    try:
        if not supabase:
            return JSONResponse(
                status_code=500,
                content={
                    "error": "Server configuration error: Missing Supabase credentials"
                },
            )

        if not user:
            return create_auth_error("Authentication required")

        image_url = str(body.imageUrl)

        # Fetch image
        async with httpx.AsyncClient() as client:
            resp = await client.get(image_url, follow_redirects=True)
            if resp.status_code != 200:
                return JSONResponse(
                    status_code=400,
                    content={"error": f"Failed to fetch image: {resp.status_code}"},
                )
            file_content = resp.content
            content_type = resp.headers.get("content-type", "image/jpeg")

        # Basic validation
        bucket_name = "user_uploads"

        timestamp = int(time.time() * 1000)
        # Try to guess extension
        ext = "jpg"
        if "png" in content_type:
            ext = "png"
        elif "webp" in content_type:
            ext = "webp"
        elif "gif" in content_type:
            ext = "gif"

        # Match avatar structure: user_id/filename
        unique_file_name = f"{user['id']}/preview_{timestamp}.{ext}"

        # Upload
        supabase.storage.from_(bucket_name).upload(
            path=unique_file_name,
            file=file_content,
            file_options={"content-type": content_type, "upsert": "false"},
        )

        public_url_data = supabase.storage.from_(bucket_name).get_public_url(
            unique_file_name
        )

        return JSONResponse(
            status_code=201,
            content={
                "success": True,
                "fileUrl": public_url_data,
                "fileName": unique_file_name,
                "bucket": bucket_name,
            },
        )

    except Exception as e:
        return JSONResponse(
            status_code=500,
            content={"error": "Internal server error", "details": str(e)},
        )
