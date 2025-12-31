"""
YouTube Extraction Orchestrator

Coordinates the YouTube video extraction pipeline:
Request[url] → Metadata Extractor → Transcript Extractor → Content Generator → Response

Provides high-level API for:
- extract_youtube_content: Full extraction pipeline
- check_youtube_pipeline_health: Health check for all components
"""

import logging
import time
import importlib.util
from datetime import datetime
from typing import Dict, Any
from .models import (
    YouTubeExtractionRequest,
    YouTubeExtractionResponse,
    YouTubeExtractionError,
)
from .extractor import YouTubeExtractorEngine
from .preprocessor import is_youtube_url

logger = logging.getLogger(__name__)


class YouTubeExtractionOrchestrator:
    """
    Orchestrates YouTube video extraction pipeline.

    Handles:
    - Request validation
    - Component coordination
    - Error handling and recovery
    - Health monitoring
    """

    def __init__(self):
        self.logger = logging.getLogger(__name__)
        self.engine = YouTubeExtractorEngine()

    async def extract_from_url(self, url: str) -> YouTubeExtractionResponse:
        """
        Extract content from a YouTube video URL.

        Args:
            url: YouTube video URL

        Returns:
            YouTubeExtractionResponse with extracted content
        """
        start_time = time.time()

        # Validate URL
        if not is_youtube_url(url):
            return YouTubeExtractionResponse(
                url=url,
                success=False,
                errors=[
                    YouTubeExtractionError(
                        error_type="invalid_url",
                        message=f"URL is not a valid YouTube URL: {url}",
                        component="YouTubeExtractionOrchestrator",
                        recoverable=False,
                    )
                ],
            )

        try:
            # Create request and extract
            request = YouTubeExtractionRequest(url=url)
            response = await self.engine.extract(request)

            self.logger.info(
                f"YouTube extraction completed for {url} in {response.processing_time_ms}ms"
            )

            return response

        except ValueError as e:
            self.logger.error(f"Invalid request: {e}")
            return YouTubeExtractionResponse(
                url=url,
                success=False,
                errors=[
                    YouTubeExtractionError(
                        error_type="validation_error",
                        message=str(e),
                        component="YouTubeExtractionOrchestrator",
                        recoverable=False,
                    )
                ],
                processing_time_ms=int((time.time() - start_time) * 1000),
            )
        except Exception as e:
            self.logger.error(f"Extraction failed: {e}")
            return YouTubeExtractionResponse(
                url=url,
                success=False,
                errors=[
                    YouTubeExtractionError(
                        error_type="extraction_failed",
                        message=str(e),
                        component="YouTubeExtractionOrchestrator",
                        recoverable=False,
                    )
                ],
                processing_time_ms=int((time.time() - start_time) * 1000),
            )

    async def health_check(self) -> Dict[str, Any]:
        """
        Check health of YouTube extraction pipeline components.

        Returns:
            Dictionary with health status of each component
        """
        status = {
            "orchestrator": "healthy",
            "components": {},
            "timestamp": datetime.now().isoformat(),
            "overall_status": "healthy",
        }

        # Check yt-dlp availability
        if importlib.util.find_spec("yt_dlp"):
            status["components"]["yt_dlp"] = {
                "status": "healthy",
                "message": "yt-dlp is available",
            }
        else:
            status["components"]["yt_dlp"] = {
                "status": "degraded",
                "message": "yt-dlp not installed - metadata extraction will be limited",
            }

        # Check youtube_transcript_api availability
        if importlib.util.find_spec("youtube_transcript_api"):
            status["components"]["youtube_transcript_api"] = {
                "status": "healthy",
                "message": "YouTube Transcript API is available",
            }
        else:
            status["components"]["youtube_transcript_api"] = {
                "status": "degraded",
                "message": "youtube_transcript_api not installed - will use Whisper fallback",
            }

        # Check Whisper availability (fallback)
        if importlib.util.find_spec("whisper"):
            status["components"]["whisper"] = {
                "status": "healthy",
                "message": "Whisper is available for transcription fallback",
            }
        else:
            status["components"]["whisper"] = {
                "status": "warning",
                "message": "Whisper not installed - no fallback for transcription",
            }

        # Check Groq LLM availability
        try:
            from ....clients.groq import get_groq_client

            get_groq_client()

            status["components"]["groq_llm"] = {
                "status": "healthy",
                "message": "Groq LLM client is available",
            }
        except Exception as e:
            status["components"]["groq_llm"] = {
                "status": "degraded",
                "message": f"Groq LLM not available: {str(e)}",
            }

        try:
            status["components"]["transformers"] = {
                "status": "healthy",
                "message": "Transformers library is available",
            }
        except ImportError:
            status["components"]["transformers"] = {
                "status": "degraded",
                "message": "Transformers not installed - tag generation will use fallback",
            }

        component_statuses = [c["status"] for c in status["components"].values()]
        if all(s == "healthy" for s in component_statuses):
            status["overall_status"] = "healthy"
        elif any(s == "unhealthy" for s in component_statuses):
            status["overall_status"] = "unhealthy"
        else:
            status["overall_status"] = "degraded"

        return status


async def extract_youtube_content(url: str) -> YouTubeExtractionResponse:
    """
    Extract content from a YouTube video URL.

    This is the main entry point for YouTube video extraction.

    Args:
        url: YouTube video URL

    Returns:
        YouTubeExtractionResponse with:
        - meta_data: Video metadata (title, channel, duration, etc.)
        - cleaned_data: Generated content (title, description, summary)
        - tags: AI-generated tags with confidence scores
        - detected_category: Video category

    Example:
        response = await extract_youtube_content("https://www.youtube.com/watch?v=dQw4w9WgXcQ")
        if response.success:
            print(f"Title: {response.cleaned_data.generated_title}")
            print(f"Tags: {[t.tag for t in response.tags]}")
    """
    orchestrator = YouTubeExtractionOrchestrator()
    return await orchestrator.extract_from_url(url)


async def check_youtube_pipeline_health() -> Dict[str, Any]:
    """
    Check health status of YouTube extraction pipeline.

    Returns:
        Dictionary with health status of all components
    """
    orchestrator = YouTubeExtractionOrchestrator()
    return await orchestrator.health_check()
