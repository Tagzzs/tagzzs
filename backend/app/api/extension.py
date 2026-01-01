from datetime import datetime, timezone
import uuid
import os
from typing import Optional, Dict, Any
from fastapi import APIRouter, Request, Depends, Header, HTTPException
from fastapi.responses import JSONResponse
from pydantic import BaseModel

# Internal imports
from app.services.firebase.firebase_admin_setup import admin_db
from app.api.dependencies import get_current_user


router = APIRouter(prefix="/api/extension", tags=["Extension"])

# Extension Secrets (should be in env vars)
EXTENSION_IDS = [
    "tagzs-chrome-extension-v1",
    "tagzs-firefox-extension-v1",
    "tagzs-safari-extension-v1",
    "tagzs-edge-extension-v1",
    "tagzs-web-interface-v1",
]
EXTENSION_SECRET_KEY = os.getenv("EXTENSION_SECRET_KEY", "tagzs-ext-secret-2025")


class ConnectionRequest(BaseModel):
    browserType: str
    deviceFingerprint: str
    deviceName: Optional[str] = None


class SaveContentRequest(BaseModel):
    url: str
    personalNotes: Optional[str] = ""
    autoTags: bool = True


def validate_extension_headers(
    x_extension_id: str = Header(None),
    x_extension_version: str = Header(None),
    x_extension_secret: str = Header(None),
):
    if not x_extension_id or x_extension_id not in EXTENSION_IDS:
        raise HTTPException(status_code=400, detail="Invalid extension ID")

    if not x_extension_secret or x_extension_secret != EXTENSION_SECRET_KEY:
        raise HTTPException(status_code=403, detail="Invalid extension credentials")

    if not x_extension_version:
        raise HTTPException(status_code=400, detail="Extension version required")

    return {"extensionId": x_extension_id, "extensionVersion": x_extension_version}


@router.post("/connections")
async def create_connection(
    request: Request,
    body: ConnectionRequest,
    user: Dict[str, Any] = Depends(get_current_user),
    ext_info: Dict = Depends(validate_extension_headers),
):
    try:
        user_id = user["id"]

        # Generate new API Key
        api_key = f"tagzs_{uuid.uuid4().hex}"
        connection_id = str(uuid.uuid4())
        now = datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")

        connection_data = {
            "id": connection_id,
            "browserType": body.browserType,
            "deviceFingerprint": body.deviceFingerprint,
            "deviceName": body.deviceName or f"{body.browserType} Extension",
            "extensionId": ext_info["extensionId"],
            "extensionVersion": ext_info["extensionVersion"],
            "apiKey": api_key,  # Store securely?
            "apiKeyPreview": f"{api_key[:8]}...",
            "userAgent": request.headers.get("user-agent", ""),
            "ipAddress": request.client.host if request.client else "",
            "connectedAt": now,
            "lastActivity": now,
            "isActive": True,
            "totalContentSaved": 0,
            "totalAPICallsMade": 0,
        }

        ref = (
            admin_db.collection("users")
            .document(user_id)
            .collection("extension_connections")
            .document(connection_id)
        )
        ref.set(connection_data)

        return JSONResponse(
            status_code=201,
            content={
                "success": True,
                "data": {
                    "connectionId": connection_id,
                    "apiKey": api_key,
                    "apiKeyPreview": connection_data["apiKeyPreview"],
                    "deviceName": connection_data["deviceName"],
                    "status": "connected",
                    "userEmail": user["email"],
                    "message": "Extension connection created successfully",
                },
            },
        )

    except Exception as e:
        print(f"Connection Error: {e}")
        return JSONResponse(
            status_code=500, content={"success": False, "error": str(e)}
        )


@router.get("/connections")
async def list_connections(user: Dict[str, Any] = Depends(get_current_user)):
    try:
        user_id = user["id"]

        connections_ref = (
            admin_db.collection("users")
            .document(user_id)
            .collection("extension_connections")
        )
        docs = connections_ref.order_by("connectedAt", direction="DESCENDING").stream()

        connections = []
        for doc in docs:
            data = doc.to_dict()
            if "apiKey" in data:
                del data["apiKey"]
            connections.append(data)

        return {
            "success": True,
            "data": {
                "connections": connections,
            },
        }

    except Exception as e:
        return JSONResponse(
            status_code=500, content={"success": False, "error": str(e)}
        )


@router.delete("/connections")
async def delete_connection(id: str, user: Dict[str, Any] = Depends(get_current_user)):
    try:
        user_id = user["id"]
        ref = (
            admin_db.collection("users")
            .document(user_id)
            .collection("extension_connections")
            .document(id)
        )

        if not ref.get().exists:
            return JSONResponse(
                status_code=404, content={"error": "Connection not found"}
            )

        ref.delete()

        return {"success": True, "message": "Connection disconnected"}

    except Exception as e:
        return JSONResponse(
            status_code=500, content={"success": False, "error": str(e)}
        )


@router.post("/save")
async def save_content(
    body: SaveContentRequest, user: Dict[str, Any] = Depends(get_current_user)
):
    try:
        user_id = user["id"]
        url = body.url

        if not url:
            return JSONResponse(status_code=400, content={"error": "URL is required"})

        # 1. Extract
        try:
            from app.services.extractors.web import extract_content

            extraction_result = await extract_content(url)

            if not extraction_result.success:
                return JSONResponse(
                    status_code=400,
                    content={"error": f"Extraction failed: {extraction_result.error}"},
                )

            # 2. Map Extraction to Content Data
            extracted_title = (
                extraction_result.cleaned_data.title
                if extraction_result.cleaned_data
                else "Untitled"
            )
            extracted_summary = (
                extraction_result.cleaned_data.summary
                if extraction_result.cleaned_data
                else ""
            )
            extracted_text = (
                extraction_result.cleaned_data.text
                if extraction_result.cleaned_data
                else ""
            )

            thumbnail_url = (
                extraction_result.meta_data.thumbnail_url
                or extraction_result.meta_data.image_url
                if extraction_result.meta_data
                else None
            )

            description = (
                extracted_summary or extracted_text[:500] if extracted_text else ""
            )

            content_id = str(uuid.uuid4())
            now = datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")

            # 3. Embedding
            embedding_metadata = {}
            if extracted_text or description:
                try:
                    from app.api.embed import embed_and_store_chunks

                    embedding_payload = {
                        "user_id": user_id,
                        "content_id": content_id,
                        "extracted_text": extracted_text or description,
                        "summary": description,
                        "tags": [],
                        "source_url": url,
                        "source_type": "article",
                    }
                    emb_data = await embed_and_store_chunks(embedding_payload)
                    if emb_data.get("success"):
                        embedding_metadata = {
                            "chromaDocIds": emb_data.get("chroma_doc_ids", []),
                            "summaryDocId": emb_data.get("summary_doc_id", ""),
                            "chunkCount": emb_data.get("chunk_count", 0),
                        }
                except Exception as e:
                    print(f"Embedding failed: {e}")

            # 4. Save to DB
            content_data = {
                "createdAt": now,
                "tagsId": [],
                "link": url,
                "title": extracted_title,
                "description": description,
                "contentType": "article",
                "contentSource": url.split("/")[2] if "//" in url else url,
                "personalNotes": body.personalNotes or "",
                "readTime": "",
                "updatedAt": now,
                "thumbnailUrl": str(thumbnail_url) if thumbnail_url else None,
                "rawContent": extracted_text,
                "embeddingMetadata": embedding_metadata,
                "processingTime": extraction_result.processing_time_ms,
            }

            ref = (
                admin_db.collection("users")
                .document(user_id)
                .collection("content")
                .document(content_id)
            )
            ref.set(content_data)

            # Update counts
            try:
                from app.services.firebase.firebase_user_service import (
                    FirebaseUserService,
                )

                await FirebaseUserService.update_content_count(user_id, 1)
            except Exception:
                pass

            return JSONResponse(
                status_code=201,
                content={
                    "success": True,
                    "data": {
                        "id": content_id,
                        "title": extracted_title,
                        "link": url,
                        "description": description,
                        "savedAt": now,
                    },
                },
            )

        except ImportError:
            return JSONResponse(
                status_code=500, content={"error": "Extraction service not available"}
            )
        except Exception as e:
            import traceback

            traceback.print_exc()
            return JSONResponse(
                status_code=500, content={"error": f"Extraction error: {str(e)}"}
            )

    except Exception as e:
        return JSONResponse(
            status_code=500, content={"success": False, "error": str(e)}
        )
