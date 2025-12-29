# app/api/user_database/content.py
import time
import uuid
import httpx
import os
import uuid
from datetime import datetime, timezone
from typing import Optional, List
from fastapi import APIRouter, Request
from fastapi.responses import JSONResponse
from pydantic import ValidationError
from pydantic import BaseModel, Field, HttpUrl

from fastapi import APIRouter, Request, Depends

# Internal imports 
from app.services.firebase.firebase_admin_setup import admin_db
from app.services.firebase.firebase_user_service import FirebaseUserService
from app.services.token_verifier import get_current_user
from app.services.tag_count_service import update_multiple_tag_counts
from app.utils.supabase.auth import create_auth_error, create_auth_response

        
class AddContentSchema(BaseModel):
    userId: str = Field(..., min_length=1)
    link: HttpUrl
    title: str = Field(..., min_length=1)
    contentType: Optional[str] = 'article'
    description: Optional[str] = ''
    personalNotes: str = ''
    readTime: str = ''
    tagsId: List[str] = []
    thumbnailUrl: Optional[str] = None
    rawContent: str = ''

router = APIRouter(prefix="/api/user-database/content", tags=["Content Management"])


@router.post("/add")
async def add_content(req: Request):
    start_time = time.time() * 1000 # TODO: Add latency later using this and pass it as in response
    user_id = None
    content_id = None

    try:
        try:
            user = await get_current_user(req)
        except Exception as e:
            return create_auth_error(status_code=401, message="Authentication required to add content")

        user_id = user["id"]

        # BODY PARSING & TYPE CHECK
        try:
            body = await req.json()
        except Exception:
            return JSONResponse(status_code=400, content={
                "success": False,
                "error": {
                    "code": 'INVALID_JSON',
                    "message": 'Invalid JSON format in request body',
                    "details": 'Please ensure your request body contains valid JSON'
                }
            })

        if not isinstance(body, dict):
            return JSONResponse(status_code=400, content={
                "success": False,
                "error": {
                    "code": 'INVALID_REQUEST_BODY',
                    "message": 'Request body must be a valid JSON object',
                    "details": f'Expected object, received {type(body).__name__}'
                }
            })

        # Validation (Zod safeParse replication)
        data_with_user_id = {**body, "userId": user_id}
        try:
            # Pydantic validation handles URL format and required fields
            validated_data = AddContentSchema(**data_with_user_id)
        except ValidationError as e:
            return JSONResponse(status_code=400, content={
                "success": False,
                "error": {
                    "code": 'VALIDATION_ERROR',
                    "message": 'Invalid content data provided',
                    "details": e.errors()
                }
            })

        # Database availability check
        if not admin_db:
            return JSONResponse(status_code=503, content={
                "success": False,
                "error": {"code": 'SERVICE_UNAVAILABLE', "message": 'Database service is temporarily unavailable', "details": 'Please try again later'}
            })

        # User Verification
        user_ref = admin_db.collection('users').document(user_id)
        try:
            user_doc = user_ref.get()
        except Exception:
            return JSONResponse(status_code=503, content={
                "success": False,
                "error": {"code": 'DATABASE_ERROR', "message": 'Unable to verify user account', "details": 'Database connection issue, please try again'}
            })
        
        if not user_doc.exists:
            return JSONResponse(status_code=404, content={
                "success": False,
                "error": {"code": 'USER_NOT_FOUND', "message": 'User account not found in database', "details": 'Please ensure your account is properly set up'}
            })

        # ID & METADATA PREP
        content_id = str(uuid.uuid4())
        now = datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")
        embedding_metadata = {}

        # Embedding
        tagzzs_api_url = os.getenv("TAGZZS_API_URL")
        if tagzzs_api_url:
            raw_c = validated_data.rawContent or ""
            desc = validated_data.description or ""
            has_content = len(raw_c.strip()) > 0
            has_description = len(desc.strip()) > 0

            if has_content or has_description:
                try:
                    embedding_payload = {
                        "user_id": user_id,
                        "content_id": content_id,
                        "extracted_text": raw_c or desc or '',
                        "summary": desc or '',
                        "tags": validated_data.tagsId or [],
                        "source_url": str(validated_data.link),
                        "source_type": validated_data.contentType or ''
                    }
                    async with httpx.AsyncClient() as client:
                        emb_res = await client.post(f"{tagzzs_api_url}/embed/store", json=embedding_payload, timeout=10.0)
                        if emb_res.status_code == 200:
                            emb_data = emb_res.json()
                            if emb_data.get("success"):
                                embedding_metadata = {
                                    "chromaDocIds": emb_data.get("chroma_doc_ids", []),
                                    "summaryDocId": emb_data.get("summary_doc_id", ""),
                                    "chunkCount": emb_data.get("chunk_count", 0),
                                }
                except Exception:
                    pass

        # DATA MAPPING
        content_data = {
            "createdAt": now,
            "tagsId": validated_data.tagsId or [],
            "link": str(validated_data.link),
            "title": validated_data.title.strip(),
            "description": (validated_data.description or "").strip(),
            "contentType": validated_data.contentType or 'article',
            "contentSource": validated_data.link.host or '',
            "personalNotes": (validated_data.personalNotes or "").strip(),
            "readTime": validated_data.readTime or '',
            "updatedAt": now,
            "thumbnailUrl": validated_data.thumbnailUrl or None,
            "rawContent": validated_data.rawContent or '',
            "embeddingMetadata": {
                **({"chromaDocIds": embedding_metadata["chromaDocIds"]} if embedding_metadata.get("chromaDocIds") else {}),
                **({"summaryDocId": embedding_metadata["summaryDocId"]} if embedding_metadata.get("summaryDocId") else {}),
                **({"chunkCount": embedding_metadata["chunkCount"]} if embedding_metadata.get("chunkCount", 0) > 0 else {}),
            }
        }

        # Storage and count update
        content_ref = admin_db.collection('users').document(user_id).collection('content').document(content_id)
        try:
            content_ref.set(content_data)
            try:
                await FirebaseUserService.update_content_count(user_id, 1)
            except Exception: pass
        except Exception:
            return JSONResponse(status_code=500, content={
                "success": False,
                "error": {"code": 'STORAGE_FAILED', "message": 'Failed to save content to database', "details": 'Unable to store content, please try again'}
            })

        # Tag count updates
        if content_data.get("tagsId"):
            try:
                await update_multiple_tag_counts(user_id, content_data["tagsId"])
            except Exception: pass

        return create_auth_response(
            data={
                "contentId": content_id,
                "content": content_data,
                "message": 'Content added successfully with thumbnail mapping',
                "timestamp": datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")
            },
            user=user,
            status_code=201
        )

    except Exception as error:
        # Replicating the final catch block error codes
        import traceback
        traceback.print_exc()
        err_str = str(error).lower()
        if "permission-denied" in err_str:
            return JSONResponse(status_code=403, content={"success": False, "error": {"code": 'PERMISSION_DENIED', "message": 'Insufficient permissions to add content', "details": 'Please check your account permissions'}})
        
        if "unavailable" in err_str:
            return JSONResponse(status_code=503, content={"success": False, "error": {"code": 'SERVICE_UNAVAILABLE', "message": 'Database service is temporarily unavailable', "details": 'Please try again later'}})

        return JSONResponse(status_code=500, content={
            "success": False,
            "error": {"code": 'INTERNAL_ERROR', "message": 'An unexpected error occurred while adding content', "details": 'Please try again later'}
        })   
