# app/api/user_database/content.py
import time
import uuid
import httpx
import os
import uuid
from datetime import datetime, timezone
from typing import Optional, List, Dict, Any, Union
from fastapi import APIRouter, Request, Depends
from fastapi.responses import JSONResponse
from pydantic import ValidationError
from pydantic import BaseModel, Field, HttpUrl
from supabase import create_client, Client

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


class EmbeddingMetadata(BaseModel):
    chromaDocIds: Optional[List[str]] = None
    summaryDocId: Optional[str] = None
    chunkCount: Optional[int] = None


class ContentDataSchema(BaseModel):
    createdAt: str
    tagsId: List[str]
    link: str
    title: str
    description: str
    contentType: str
    contentSource: str
    personalNotes: str
    readTime: str
    updatedAt: str
    thumbnailUrl: Optional[str] = None 
    rawContent: Optional[str] = None
    embeddingMetadata: Optional[EmbeddingMetadata] = None


    class Config:
        populate_by_name = True


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
            return create_auth_error(message="Authentication required to add content") # Status code parameter was redundant

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


@router.delete("/delete")
async def delete_content(request: Request, user: Dict[str, Any] = Depends(get_current_user)):
    try:
        if not user:
            return create_auth_error('Authentication required to delete content')

        user_id = user.get("id")

        # Get the request body
        body = await request.json()
        content_id: Optional[str] = body.get("contentId")

        if not content_id:
            return JSONResponse(
                content={'error': 'Content ID is required'},
                status_code=400
            )

        # Check if user exists in Firebase
        user_ref = admin_db.collection('users').document(user_id)
        user_doc = user_ref.get()

        if not user_doc.exists:
            return JSONResponse(
                content={'error': 'User not found'},
                status_code=404
            )

        # If content_id is provided, delete specific content
        if content_id:
            content_ref = user_ref.collection('content').document(content_id)

            # Check if content exists and get its data
            content_doc = content_ref.get()
            if not content_doc.exists:
                return JSONResponse(
                    content={'error': 'Content not found'},
                    status_code=404
                )

            try:
                raw_data = content_doc.to_dict()
                content_data = ContentDataSchema.model_validate(raw_data)
            except Exception as val_error:
                print(f"Validation Error: {val_error}")
                return JSONResponse(content={'error': 'Stored content data is invalid'}, status_code=500)

            # Delete thumbnail from Supabase Storage if it exists
            thumbnail_url = content_data.thumbnailUrl
            if thumbnail_url:
                try:
                    supabase_url = os.getenv("NEXT_PUBLIC_SUPABASE_URL")
                    supabase_key = os.getenv("SUPABASE_SERVICE_ROLE_KEY")

                    if supabase_url and supabase_key:
                        supabase: Client = create_client(supabase_url, supabase_key)

                        # Extract the file name from the thumbnail URL
                        url_parts = thumbnail_url.split('/')
                        file_name = url_parts[-1]

                        if file_name:
                            supabase.storage.from_('user_thumbnails').remove([file_name])
                
                except Exception as storage_error:
                    print(f'Warning: Error deleting thumbnail: {storage_error}')
                    # content will still be deleted from database

            # Delete the content document
            content_ref.delete()

            # Update user's totalContent count
            try:
                await FirebaseUserService.update_content_count(user_id, -1)
            except Exception:
                pass

            # Update tag counts if content had tags
            tags_id = content_data.tagsId
            if tags_id and len(tags_id) > 0:
                await update_multiple_tag_counts(user_id, tags_id)

            return JSONResponse(
                content={
                    'success': True,
                    'message': 'Content deleted successfully',
                    'contentId': content_id,
                    'userId': user_id
                },
                status_code=200
            )
        
        else:
            content_collection = user_ref.collection('content')
            
            content_snapshot = content_collection.get()
            batch = admin_db.batch()
            for doc in content_snapshot:
                batch.delete(doc.reference)
            batch.delete(user_ref)
            batch.commit()

            return JSONResponse(
                content={
                    'success': True,
                    'message': 'User and all associated content deleted successfully',
                    'userId': user_id,
                    'deletedContentCount': len(content_snapshot)
                },
                status_code=200
            )

    except Exception as e:
        import traceback
        traceback.print_exc()
        return JSONResponse(
            content={'error': 'Internal server error'},
            status_code=500
        )
