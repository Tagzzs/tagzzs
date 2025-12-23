"""
Refinement Routes
API endpoints for content refinement pipelines (extract-refine combos)
"""

import asyncio
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, HttpUrl

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


@router.post("/extract-refine")
async def extract_and_refine_auto(request: dict):
    """
    Universal Extract & Refine Pipeline: Auto-detect content type → Extract → Summarize → Tag

    Automatically detects the content type from the URL and routes to the appropriate extractor.
    """
    try:
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
            from app.services.extractors.youtube import extract_youtube_content
            from app.services.extractors.youtube.output_structuring import (
                structure_youtube_for_refine_response,
            )

            response = await extract_youtube_content(str(request["url"]))

            if not response.success:
                error_messages = (
                    [e.message for e in response.errors]
                    if response.errors
                    else ["Unknown error"]
                )
                raise ValueError(
                    f"Failed to extract YouTube content: {'; '.join(error_messages)}"
                )

            return structure_youtube_for_refine_response(response)

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

            engine = get_image_engine(yolo_model="yolov8s.pt")
            analysis = await asyncio.to_thread(
                engine.analyze_image, None, str(request["url"])
            )

            ocr_text = analysis.get("ocr_text", "") or ""
            if ocr_text.strip():
                refinement_response = await process_extracted_content(
                    extracted_text=ocr_text,
                    source_url=str(request["url"]),
                    source_type="image",
                    config=RefinementConfig(),
                )
                refined_dict = refinement_response.to_dict()
                return format_extract_refine_response(
                    title="Image Content",
                    summary=refined_dict.get("summary") or "",
                    tags=refined_dict.get("tags") or [],
                    tags_confidence=refined_dict.get("tags_confidence"),
                    url=str(request["url"]),
                    content_type="image",
                    original_text_length=len(ocr_text),
                    word_count=len(ocr_text.split()),
                    raw_content=ocr_text,
                )
            else:
                # Vision-only fallback
                caption = analysis.get("caption") or ""
                tags = [t["tag"] for t in analysis.get("tags", [])]
                vision_summary = caption or "Image analysis completed (vision-only)."
                return format_extract_refine_response(
                    title="Image Content",
                    summary=vision_summary,
                    tags=tags,
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
        from app.services.refiners.refinement_pipeline import (
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
        from app.services.refiners.refinement_pipeline import (
            process_extracted_content,
            RefinementConfig,
        )
        from app.utils.response_formatter import format_extract_refine_response

        engine = get_image_engine(yolo_model="yolov8s.pt")
        analysis = await asyncio.to_thread(engine.analyze_image, None, str(request.url))

        ocr_text = analysis.get("ocr_text", "") or ""
        if not ocr_text.strip():
            # Vision only path
            caption = analysis.get("caption") or ""
            tags = [t["tag"] for t in analysis.get("tags", [])]
            vision_summary = caption or "Image analysis completed (vision-only)."
            return format_extract_refine_response(
                title="Image Content",
                summary=vision_summary,
                tags=tags,
                tags_confidence=None,
                url=str(request.url),
                content_type="image",
                original_text_length=0,
                word_count=0,
                raw_content="",
            )

        # OCR exists -> refine
        refinement_response = await process_extracted_content(
            extracted_text=ocr_text,
            source_url=str(request.url),
            source_type="image",
            config=RefinementConfig(),
        )

        refined_dict = refinement_response.to_dict()
        return format_extract_refine_response(
            title="Image Content",
            summary=refined_dict.get("summary", ""),
            tags=refined_dict.get("tags", []),
            tags_confidence=refined_dict.get("tags_confidence"),
            url=str(request.url),
            content_type="image",
            original_text_length=len(ocr_text),
            word_count=len(ocr_text.split()),
            raw_content=ocr_text,
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
