"""
Refinement Routes
API endpoints for content refinement pipelines (extract-refine combos)
"""

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, HttpUrl
from datetime import datetime
from fastapi import Request, Depends
import time
import uuid
import os
from typing import Dict, Any
from urllib.parse import urlparse
from fastapi.responses import JSONResponse
from app.api.dependencies import get_current_user
from app.utils.supabase.auth import create_auth_error

router = APIRouter(tags=["refinement"])


# Request models
class WebsiteExtractionRequest(BaseModel):
    url: str


class PDFExtractionRequest(BaseModel):
    url: HttpUrl


class ImageExtractionRequest(BaseModel):
    url: HttpUrl


class YouTubeExtractionRequest(BaseModel):
    url: str


@router.post("/refine/content")
async def refine_extracted_content(request: dict):
    """
    Phase 1 Refinement Pipeline: Extract → Summarize → Tag

    Request body:
    {
        "extracted_text": "content...",
        "source_url": "https://...",
        "source_type": "web|pdf|image",
        "title": "optional_title"
    }
    """
    try:
        from app.pipelines.refinement_pipeline import (
            process_extracted_content,
            RefinementConfig,
        )

        required_fields = ["extracted_text", "source_url", "source_type"]
        for field in required_fields:
            if field not in request or not request[field]:
                raise ValueError(f"Missing required field: {field}")

        response = await process_extracted_content(
            extracted_text=request["extracted_text"],
            source_url=request["source_url"],
            source_type=request["source_type"],
            title=request.get("title", ""),
            config=RefinementConfig(),
        )

        return response.to_dict()

    except Exception as e:
        raise HTTPException(
            status_code=500, detail=f"Phase 1 refinement failed: {str(e)}"
        )


# Validation of extraction first
rate_limit_store: Dict[str, Dict[str, Any]] = {}

RATE_LIMIT_CONFIG = {
    "windowMs": 15 * 60 * 1000,
    "maxRequests": 20,
    "blockDuration": 60 * 60 * 1000,
}

BLOCKED_DOMAINS = [
    "localhost",
    "127.0.0.1",
    "0.0.0.0",
    "192.168.",
    "10.",
    "172.16.",
    "172.17.",
    "172.18.",
    "172.19.",
    "172.20.",
    "172.21.",
    "172.22.",
    "172.23.",
    "172.24.",
    "172.25.",
    "172.26.",
    "172.27.",
    "172.28.",
    "172.29.",
    "172.30.",
    "172.31.",
]

# Helper Functions


def check_rate_limit(user_id: str):
    now = int(time.time() * 1000)
    user_limit = rate_limit_store.get(user_id)

    if not user_limit or now > user_limit["resetTime"]:
        rate_limit_store[user_id] = {
            "count": 1,
            "resetTime": now + RATE_LIMIT_CONFIG["windowMs"],
        }
        return {
            "allowed": True,
            "remainingRequests": RATE_LIMIT_CONFIG["maxRequests"] - 1,
            "resetTime": now + RATE_LIMIT_CONFIG["windowMs"],
        }

    if user_limit["count"] >= RATE_LIMIT_CONFIG["maxRequests"]:
        return {"allowed": False, "resetTime": user_limit["resetTime"]}

    user_limit["count"] += 1
    return {
        "allowed": True,
        "remainingRequests": RATE_LIMIT_CONFIG["maxRequests"] - user_limit["count"],
        "resetTime": user_limit["resetTime"],
    }


def validate_url_security(url: str):
    try:
        parsed_url = urlparse(url)
        hostname = (parsed_url.hostname or "").lower()
        for blocked_domain in BLOCKED_DOMAINS:
            if blocked_domain in hostname:
                return {
                    "safe": False,
                    "reason": "Access to internal/private networks is not allowed",
                }
        if parsed_url.scheme not in ["http", "https"]:
            return {
                "safe": False,
                "reason": "Only HTTP and HTTPS protocols are allowed",
            }
        if any(pattern in hostname for pattern in ["admin", "internal", "private"]):
            return {
                "safe": False,
                "reason": "Access to administrative or internal resources is not allowed",
            }
        return {"safe": True}
    except Exception:
        return {"safe": False, "reason": "Invalid URL format"}


def log_request(request_id, user_id, url, status, processing_time, error_message=None):
    """
    Log request for monitoring - Replicated exactly from JS
    """
    _logEntry = {
        "requestId": request_id,
        "userId": user_id,
        "url": url,
        "status": status,
        "processingTime": processing_time,
        "timestamp": datetime.utcnow().isoformat() + "Z",
        "error": error_message if error_message else None,
    }


# Called by the frontend which calls the /extract-refine endpoint
@router.post("/api/content/extract")
async def post_extract(req: Request):
    request_id = f"req_{int(time.time() * 1000)}_{uuid.uuid4().hex[:9]}"
    start_time = int(time.time() * 1000)
    user_id = None
    url = None

    try:
        # TODO: User authentication
        # Get authenticated user
        # try:
        #     user = await get_current_user(req)
        #     user_id = user["id"]
        # except Exception as auth_err:
        #     log_request(request_id, 'anonymous', 'unknown', 'error', int(time.time() * 1000) - start_time, str(auth_err))
        #     return JSONResponse(
        #         content={"error": "Authentication required to extract content"},
        #         status_code=401
        #     )

        # Rate limiting check
        rate_limit_result = check_rate_limit(user_id)
        if not rate_limit_result["allowed"]:
            log_request(
                request_id,
                user_id,
                "unknown",
                "error",
                int(time.time() * 1000) - start_time,
                "Rate limit exceeded",
            )
            reset_time = rate_limit_result["resetTime"]
            retry_after = max(0, int((reset_time - (time.time() * 1000)) / 1000))
            return JSONResponse(
                status_code=429,
                content={
                    "error": "Rate limit exceeded",
                    "details": "Too many requests. Please try again later.",
                    "resetTime": reset_time,
                },
                headers={
                    "X-RateLimit-Limit": str(RATE_LIMIT_CONFIG["maxRequests"]),
                    "X-RateLimit-Remaining": "0",
                    "X-RateLimit-Reset": str(reset_time),
                    "Retry-After": str(retry_after),
                },
            )

        # Parse request body
        try:
            body = await req.json()
        except Exception:
            log_request(
                request_id,
                user_id,
                "unknown",
                "error",
                int(time.time() * 1000) - start_time,
                "Invalid JSON format",
            )
            return JSONResponse(
                content={"error": "Invalid JSON format"}, status_code=400
            )

        # Validation (Replicating ExtractRequestSchema)
        url = body.get("url")
        if not url or not isinstance(url, str):
            log_request(
                request_id,
                user_id,
                url or "invalid",
                "error",
                int(time.time() * 1000) - start_time,
                "Request validation failed",
            )
            return JSONResponse(
                content={
                    "error": "Invalid request format",
                    "details": {"url": ["Invalid URL format"]},
                },
                status_code=400,
            )

        # Security validation
        security_check = validate_url_security(url)
        if not security_check["safe"]:
            log_request(
                request_id,
                user_id,
                url,
                "error",
                int(time.time() * 1000) - start_time,
                f"Security check failed: {security_check['reason']}",
            )
            return JSONResponse(
                content={
                    "error": "URL not allowed",
                    "details": security_check["reason"],
                },
                status_code=403,
            )

        # Extraction Pipeline logic
        try:
            pipeline_result = await extract_and_refine_auto({"url": url})

            processing_time = int(time.time() * 1000) - start_time

            if not pipeline_result or "content" not in pipeline_result:
                raise Exception("External service returned invalid response structure")
        except Exception as extract_error:
            processing_time = int(time.time() * 1000) - start_time
            log_request(
                request_id, user_id, url, "error", processing_time, str(extract_error)
            )
            return JSONResponse(
                status_code=200,
                content={
                    "result": "error",
                    "error": "Failed to extract content from the provided URL",
                    "details": str(extract_error)
                    if os.getenv("NODE_ENV") == "development"
                    else "Content extraction service is currently unavailable...",
                    "requestId": request_id,
                    "timestamp": datetime.utcnow().isoformat(),
                },
            )

        # Success Response
        log_request(request_id, user_id, url, "success", processing_time)
        return JSONResponse(
            status_code=200,
            content={
                "result": pipeline_result.get("result", "success"),
                "metadata": pipeline_result.get("metadata"),
                "content": pipeline_result.get("content"),
                "error": pipeline_result.get("error"),
                "requestId": request_id,
                "timestamp": datetime.utcnow().isoformat(),
            },
            headers={
                "X-Request-ID": request_id,
                "X-Processing-Time": str(processing_time),
                "X-RateLimit-Limit": str(RATE_LIMIT_CONFIG["maxRequests"]),
                "X-RateLimit-Remaining": str(
                    rate_limit_result.get("remainingRequests", 0)
                ),
                "X-RateLimit-Reset": str(rate_limit_result.get("resetTime", "")),
            },
        )

    except Exception as api_error:
        # Replicating status code mapping (503, 408, 502, 500)
        processing_time = int(time.time() * 1000) - start_time
        error_message = str(api_error)
        status_code = 500
        error_label = "Internal server error"

        if "rate limit" in error_message.lower() or "429" in error_message:
            status_code = 503
            error_label = "AI service rate limit"
        elif "timeout" in error_message.lower():
            status_code = 408
            error_label = "Request timeout"
        elif "network" in error_message.lower():
            status_code = 502
            error_label = "Network error"

        return JSONResponse(
            status_code=status_code,
            content={
                "error": error_label,
                "requestId": request_id,
                "timestamp": datetime.utcnow().isoformat(),
            },
        )


@router.post("/extract-refine")
async def extract_and_refine_auto(
    request: dict, current_user: Dict[str, Any] = Depends(get_current_user)
):
    """
    Universal Extract & Refine Pipeline: Auto-detect content type → Extract → Summarize → Tag

    Automatically detects the content type from the URL and routes to the appropriate extractor.
    """
    try:
        if not current_user:
            return create_auth_error("Authentication required to update profile")

        if "url" not in request or not request["url"]:
            raise ValueError("Missing required field: url")

        url = str(request["url"])
        url_lower = url.lower()

        # Detect content type
        youtube_domains = [
            "youtube.com",
            "youtu.be",
            "m.youtube.com",
            "www.youtube.com",
        ]
        is_youtube = any(domain in url_lower for domain in youtube_domains)

        if is_youtube:
            content_type = "youtube"
        elif url_lower.endswith(".pdf"):
            content_type = "pdf"
        elif any(
            url_lower.endswith(ext)
            for ext in [".jpg", ".jpeg", ".png", ".gif", ".bmp", ".webp", ".svg"]
        ):
            content_type = "image"
        else:
            content_type = "website"

        # Route to appropriate extractor
        if content_type == "youtube":
            from app.utils.supabase.supabase_client import (
                supabase,
            )  # globally initialized supabase client

            response = (
                supabase.table("extraction_queue")
                .insert(
                    {
                        "video_url": url,
                        "user_id": current_user["id"],
                        "status": "pending",
                    }
                )
                .execute()
            )

            if not response.data:
                raise ValueError("Failed to add YouTube request to queue")

            return {
                "status": "queued",
                "message": "YouTube processing started in background",
                "queue_id": response.data[0]["id"],
            }

        elif content_type == "pdf":
            from app.services.extractors.pdf.orchestrator import (
                extract_pdf_content_orchestrated,
            )
            from app.pipelines.refinement_pipeline import (
                process_extracted_content,
                RefinementConfig,
            )
            from app.utils.response_formatter import format_extract_refine_response

            extraction_response = await extract_pdf_content_orchestrated(
                str(request["url"])
            )

            if not extraction_response.success:
                raise ValueError("Failed to extract content from PDF")

            extracted_text = (
                extraction_response.cleaned_data.full_text
                if extraction_response.cleaned_data
                else ""
            )
            if not extracted_text:
                raise ValueError("No text extracted from PDF")

            refinement_response = await process_extracted_content(
                extracted_text=extracted_text,
                source_url=str(request["url"]),
                source_type="pdf",
                title=extraction_response.meta_data.title or ""
                if extraction_response.meta_data
                else "",
                config=RefinementConfig(),
            )

            refined_dict = refinement_response.to_dict()
            return format_extract_refine_response(
                title=extraction_response.meta_data.title or ""
                if extraction_response.meta_data
                else "Untitled",
                summary=refined_dict.get("summary") or "",
                tags=refined_dict.get("tags") or [],
                tags_confidence=refined_dict.get("tags_confidence"),
                url=str(request["url"]),
                content_type="pdf",
                original_text_length=len(extracted_text),
                word_count=len(extracted_text.split()),
                raw_content=extracted_text,
            )

        elif content_type == "image":
            from app.clients.image_engine import get_image_engine
            from app.pipelines.refinement_pipeline import (
                process_extracted_content,
                RefinementConfig,
            )
            from app.utils.response_formatter import format_extract_refine_response

            engine = get_image_engine()
            analysis = await engine.analyze_image(str(request["url"]))

            detected_type = analysis.get("detected_type")
            content = analysis.get("content", "")

            if detected_type == "ocr" and content.strip():
                refinement_response = await process_extracted_content(
                    extracted_text=content,
                    source_url=str(request["url"]),
                    source_type="image",
                    config=RefinementConfig(
                        summary_min_length=20, summary_max_length=150
                    ),
                )
                refined_dict = refinement_response.to_dict()
                return format_extract_refine_response(
                    title="Image Content",
                    summary=refined_dict.get("summary") or "",
                    tags=refined_dict.get("tags") or [],
                    tags_confidence=refined_dict.get("tags_confidence"),
                    url=str(request["url"]),
                    content_type="image",
                    original_text_length=len(content),
                    word_count=len(content.split()),
                    raw_content=content,
                )
            else:
                # Vision-only path or OCR failed
                from app.services.refiners.tag_generators import generate_tags

                vision_summary = (
                    content or "Image analysis completed (description-only)."
                )

                # Generate tags for the vision description
                tag_response = await generate_tags(text=vision_summary, top_k=5)
                vision_tags = (
                    [tag.name for tag in tag_response.tags]
                    if tag_response.success
                    else []
                )

                return format_extract_refine_response(
                    title="Image Content",
                    summary=vision_summary,
                    tags=vision_tags,
                    tags_confidence=None,
                    url=str(request["url"]),
                    content_type="image",
                    original_text_length=0,
                    word_count=0,
                    raw_content="",
                )

        else:  # website
            from app.services.extractors.web import extract_content
            from app.pipelines.refinement_pipeline import (
                process_extracted_content,
                RefinementConfig,
            )
            from app.utils.response_formatter import format_extract_refine_response

            extraction_response = await extract_content(str(request["url"]))

            if not extraction_response.success or not extraction_response.cleaned_data:
                raise ValueError("Failed to extract content from website")

            body_text = extraction_response.cleaned_data.main_content or ""
            if not body_text:
                paragraphs = extraction_response.cleaned_data.paragraphs or []
                body_text = "\n".join(paragraphs) if paragraphs else ""

            if not body_text:
                raise ValueError("No text content extracted from website")

            refinement_response = await process_extracted_content(
                extracted_text=body_text,
                source_url=str(request["url"]),
                source_type="web",
                title=extraction_response.meta_data.title or ""
                if extraction_response.meta_data
                else "",
                config=RefinementConfig(),
            )

            refined_dict = refinement_response.to_dict()
            return format_extract_refine_response(
                title=extraction_response.meta_data.title or ""
                if extraction_response.meta_data
                else "Untitled",
                summary=refined_dict.get("summary") or "",
                tags=refined_dict.get("tags") or [],
                tags_confidence=refined_dict.get("tags_confidence"),
                url=str(request["url"]),
                content_type="website",
                original_text_length=len(body_text),
                word_count=extraction_response.cleaned_data.word_count,
                raw_content=body_text,
            )

    except Exception as e:
        raise HTTPException(
            status_code=500, detail=f"Auto extract-refine pipeline failed: {str(e)}"
        )


@router.post("/extract-refine/website")
async def extract_and_refine_website(request: WebsiteExtractionRequest):
    """Complete pipeline: Extract website → Summarize → Tag"""
    try:
        from app.services.extractors.web import extract_content
        from app.pipelines.refinement_pipeline import (
            process_extracted_content,
            RefinementConfig,
        )
        from app.utils.response_formatter import format_extract_refine_response

        extraction_response = await extract_content(request.url)

        if not extraction_response.success or not extraction_response.cleaned_data:
            raise ValueError("Failed to extract content from website")

        body_text = extraction_response.cleaned_data.main_content or ""
        if not body_text:
            paragraphs = extraction_response.cleaned_data.paragraphs or []
            body_text = "\n".join(paragraphs) if paragraphs else ""

        if not body_text:
            raise ValueError("No text content extracted from website")

        refinement_response = await process_extracted_content(
            extracted_text=body_text,
            source_url=request.url,
            source_type="web",
            title=extraction_response.meta_data.title or ""
            if extraction_response.meta_data
            else "",
            config=RefinementConfig(),
        )

        refined_dict = refinement_response.to_dict()
        return format_extract_refine_response(
            title=extraction_response.meta_data.title or ""
            if extraction_response.meta_data
            else "Untitled",
            summary=refined_dict.get("summary", ""),
            tags=refined_dict.get("tags", []),
            tags_confidence=refined_dict.get("tags_confidence"),
            url=request.url,
            content_type="website",
            original_text_length=len(body_text),
            word_count=extraction_response.cleaned_data.word_count,
            raw_content=body_text,
        )

    except Exception as e:
        raise HTTPException(
            status_code=500, detail=f"Extract-refine website pipeline failed: {str(e)}"
        )


@router.post("/extract-refine/pdf")
async def extract_and_refine_pdf(request: PDFExtractionRequest):
    """Complete pipeline: Extract PDF → Summarize → Tag"""
    try:
        from app.services.extractors.pdf.orchestrator import (
            extract_pdf_content_orchestrated,
        )
        from app.pipelines.refinement_pipeline import (
            process_extracted_content,
            RefinementConfig,
        )
        from app.utils.response_formatter import format_extract_refine_response

        extraction_response = await extract_pdf_content_orchestrated(str(request.url))

        if not extraction_response.success:
            raise ValueError("Failed to extract content from PDF")

        extracted_text = (
            extraction_response.cleaned_data.full_text
            if extraction_response.cleaned_data
            else ""
        )
        if not extracted_text:
            raise ValueError("No text extracted from PDF")

        refinement_response = await process_extracted_content(
            extracted_text=extracted_text,
            source_url=str(request.url),
            source_type="pdf",
            title=extraction_response.meta_data.title or ""
            if extraction_response.meta_data
            else "",
            config=RefinementConfig(),
        )

        refined_dict = refinement_response.to_dict()
        return format_extract_refine_response(
            title=extraction_response.meta_data.title or ""
            if extraction_response.meta_data
            else "Untitled",
            summary=refined_dict.get("summary", ""),
            tags=refined_dict.get("tags", []),
            tags_confidence=refined_dict.get("tags_confidence"),
            url=str(request.url),
            content_type="pdf",
            original_text_length=len(extracted_text),
            word_count=len(extracted_text.split()),
            raw_content=extracted_text,
        )

    except Exception as e:
        raise HTTPException(
            status_code=500, detail=f"Extract-refine PDF pipeline failed: {str(e)}"
        )


@router.post("/extract-refine/image")
async def extract_and_refine_image(request: ImageExtractionRequest):
    """Complete pipeline: Extract image → Summarize → Tag"""
    try:
        from app.clients.image_engine import get_image_engine
        from app.pipelines.refinement_pipeline import (
            process_extracted_content,
            RefinementConfig,
        )
        from app.utils.response_formatter import format_extract_refine_response

        engine = get_image_engine()
        analysis = await engine.analyze_image(str(request.url))

        detected_type = analysis.get("detected_type")
        content = analysis.get("content", "")

        if detected_type == "ocr" and content.strip():
            # OCR exists -> refine
            refinement_response = await process_extracted_content(
                extracted_text=content,
                source_url=str(request.url),
                source_type="image",
                config=RefinementConfig(summary_min_length=20, summary_max_length=150),
            )

            refined_dict = refinement_response.to_dict()
            return format_extract_refine_response(
                title="Image Content",
                summary=refined_dict.get("summary", ""),
                tags=refined_dict.get("tags", []),
                tags_confidence=refined_dict.get("tags_confidence"),
                url=str(request.url),
                content_type="image",
                original_text_length=len(content),
                word_count=len(content.split()),
                raw_content=content,
                thumbnail_url=str(request.url),
            )
        else:
            # Vision only path
            from app.services.refiners.tag_generators import generate_tags

            vision_summary = content or "Image analysis completed (description-only)."

            # Generate tags for the vision description
            tag_response = await generate_tags(text=vision_summary, top_k=5)
            vision_tags = (
                [tag.name for tag in tag_response.tags] if tag_response.success else []
            )

            return format_extract_refine_response(
                title="Image Content",
                summary=vision_summary,
                tags=vision_tags,
                tags_confidence=None,
                url=str(request.url),
                content_type="image",
                original_text_length=0,
                word_count=0,
                raw_content="",
                thumbnail_url=str(request.url),
            )

    except Exception as e:
        raise HTTPException(
            status_code=500, detail=f"Extract-refine image pipeline failed: {str(e)}"
        )


@router.post("/extract-refine/youtube")
async def extract_and_refine_youtube(request: YouTubeExtractionRequest):
    """Complete pipeline: Extract YouTube video → Generate title/description/summary → Tag"""
    try:
        from app.services.extractors.youtube import extract_youtube_content
        from app.services.extractors.youtube.output_structuring import (
            structure_youtube_for_refine_response,
        )

        response = await extract_youtube_content(str(request.url))

        if not response.success:
            error_messages = (
                [e.message for e in response.errors]
                if response.errors
                else ["Unknown error"]
            )
            raise ValueError(
                f"Failed to extract YouTube content: {'; '.join(error_messages)}"
            )

        structured_output = structure_youtube_for_refine_response(response)
        return structured_output

    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(
            status_code=500, detail=f"YouTube extract-refine pipeline failed: {str(e)}"
        )
