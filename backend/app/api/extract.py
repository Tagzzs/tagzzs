"""
Extraction Routes
API endpoints for content extraction (website, pdf, image, video, youtube)
"""

from datetime import datetime

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, HttpUrl

router = APIRouter(tags=["extraction"])


# Request models
class WebsiteExtractionRequest(BaseModel):
    url: str


class PDFExtractionRequest(BaseModel):
    url: HttpUrl


class ImageExtractionRequest(BaseModel):
    url: str


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
    """Extract text content or description from an image URL using AI Vision Engine"""
    try:
        from app.clients.image_engine import get_image_engine

        engine = get_image_engine()
        result = await engine.analyze_image(str(request.url))

        return {
            "success": True,
            "detected_type": result.get("detected_type"),
            "content": result.get("content"),
            "confidence": result.get("confidence"),
            "url": str(request.url),
            "extracted_at": datetime.utcnow().isoformat() + "Z",
            "processing_time_ms": result.get("processing_time_ms"),
            "model": result.get("model"),
        }

    except Exception as e:
        raise HTTPException(
            status_code=500, detail=f"Image extraction failed: {str(e)}"
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
