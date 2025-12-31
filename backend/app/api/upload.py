import os
import re
import time
from typing import Dict, Any
from fastapi import APIRouter, UploadFile, File, Form, Depends
from fastapi.responses import JSONResponse
from supabase import create_client, Client

# Internal imports
from app.services.token_verifier import get_current_user
from app.utils.supabase.auth import create_auth_error

router = APIRouter(prefix="/api", tags=["Storage"])

SUPABASE_URL = os.getenv("NEXT_PUBLIC_SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY")
supabase: Client = (
    create_client(SUPABASE_URL, SUPABASE_KEY) if SUPABASE_URL and SUPABASE_KEY else None
)


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
        unique_file_name = f"{timestamp}_{sanitized_name}"

        # Upload to Supabase Storage
        upload_response = supabase.storage.from_(bucket_name).upload(
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
        print(f"Upload error: {str(e)}")
        return JSONResponse(
            status_code=500,
            content={"error": "Internal server error", "details": str(e)},
        )
