"""
Extraction Routes
API endpoints for content extraction (website, pdf, image, video, youtube)
"""

import asyncio
from datetime import datetime

from fastapi import APIRouter, HTTPException, UploadFile, File
from pydantic import BaseModel, HttpUrl

router = APIRouter(tags=["extraction"])


# Request models
class WebsiteExtractionRequest(BaseModel):
    url: str


class PDFExtractionRequest(BaseModel):
    url: HttpUrl


class ImageExtractionRequest(BaseModel):
    url: HttpUrl


class YouTubeExtractionRequest(BaseModel):
    url: str


@router.post("/extract/website")
async def extract_website(request: WebsiteExtractionRequest):
    """Extract content from a website URL"""
    try:
        from app.services.extractors.web import extract_content

        response = await extract_content(request.url)

        return {
            "success": response.success,
            "url": response.url,
            "raw_data": response.raw_data,
            "cleaned_data": response.cleaned_data.model_dump()
            if response.cleaned_data
            else None,
            "meta_data": response.meta_data.model_dump()
            if response.meta_data
            else None,
            "extracted_time": response.extracted_time,
            "processing_time_ms": response.processing_time_ms,
            "errors": [error.model_dump() for error in response.errors]
            if response.errors
            else [],
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Extraction failed: {str(e)}")


@router.post("/extract/pdf")
async def extract_pdf(request: PDFExtractionRequest):
    """Extract content from a PDF URL using orchestrated pipeline"""
    try:
        from app.services.extractors.pdf.orchestrator import (
            extract_pdf_content_orchestrated,
        )
        from app.services.extractors.pdf.output_structuring import (
            structure_pdf_extraction_output,
        )

        response = await extract_pdf_content_orchestrated(str(request.url))
        structured_output = structure_pdf_extraction_output(response)

        return structured_output

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"PDF extraction failed: {str(e)}")


@router.post("/extract/image")
async def extract_image(request: ImageExtractionRequest):
    """Extract text content from an image URL using OCR (Image AI engine)"""
    try:
        from app.clients.image_engine import get_image_engine

        engine = get_image_engine(yolo_model="yolov8s.pt")
        result = await asyncio.to_thread(engine.analyze_image, None, str(request.url))

        cleaned_data = {
            "full_text": result.get("ocr_text", "") or "",
            "caption": result.get("caption", ""),
            "description": result.get("description", ""),
            "tags": [t["tag"] for t in result.get("tags", [])],
            "tags_with_scores": result.get("tags", []),
        }

        response = {
            "success": True,
            "url": str(request.url),
            "raw_data": None,
            "cleaned_data": cleaned_data,
            "meta_data": result.get("meta", {}),
            "extracted_time": datetime.utcnow().isoformat() + "Z",
            "processing_time_ms": None,
            "errors": [],
        }

        return response

    except Exception as e:
        raise HTTPException(
            status_code=500, detail=f"Image extraction failed: {str(e)}"
        )


@router.post("/extract/video")
async def extract_video(request: ImageExtractionRequest):
    """Extract transcript, summary and tags from a video URL"""
    try:
        from app.services.extractors.videos.orchestrator import extract_video_content
        from app.services.extractors.videos.output_structuring import (
            structure_video_extraction_output,
        )

        response = await extract_video_content(str(request.url))
        structured_output = structure_video_extraction_output(response)
        return structured_output

    except Exception as e:
        raise HTTPException(
            status_code=500, detail=f"Video extraction failed: {str(e)}"
        )


@router.post("/extract/youtube")
async def extract_youtube(request: YouTubeExtractionRequest):
    """
    Extract content from a YouTube video URL.

    Extracts:
    - Video metadata (title, description, channel, duration, views, etc.)
    - Transcript/captions (via YouTube API or Whisper fallback)
    - AI-generated title, description, and summary
    - AI-generated tags with confidence scores
    - Video category detection
    """
    try:
        from app.services.extractors.youtube import extract_youtube_content
        from app.services.extractors.youtube.output_structuring import (
            structure_youtube_extraction_output,
        )

        response = await extract_youtube_content(str(request.url))
        structured_output = structure_youtube_extraction_output(response)
        return structured_output

    except Exception as e:
        raise HTTPException(
            status_code=500, detail=f"YouTube extraction failed: {str(e)}"
        )


@router.post("/extract/video-file")
async def extract_video_file(file: UploadFile = File(...)):
    """Upload a video/audio file and extract transcript, summary and tags locally."""
    import tempfile
    import os

    try:
        suffix = os.path.splitext(file.filename)[1] or ".mp4"
        with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as tmp:
            contents = await file.read()
            tmp.write(contents)
            tmp_path = tmp.name

        from app.services.extractors.videos.orchestrator import extract_video_content
        from app.services.extractors.videos.output_structuring import (
            structure_video_extraction_output,
        )

        response = await extract_video_content(f"file://{tmp_path}")
        structured = structure_video_extraction_output(response)

        return structured

    except Exception as e:
        raise HTTPException(
            status_code=500, detail=f"Video file extraction failed: {str(e)}"
        )
    finally:
        try:
            if "tmp_path" in locals() and os.path.exists(tmp_path):
                os.remove(tmp_path)
        except Exception:
            pass
