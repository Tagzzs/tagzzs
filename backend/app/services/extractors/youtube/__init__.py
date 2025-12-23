"""
YouTube Video Extractor Package

Production-ready YouTube video content extraction with:
- Video metadata extraction (title, description, channel, views, etc.)
- Transcript/caption extraction via YouTube API
- Whisper transcription fallback
- AI-generated title, description, and summary
- Zero-shot tag classification

Components:
- models: Request/response data structures
- extractor: Core extraction engine
- preprocessor: Audio download utilities
- orchestrator: Pipeline coordination
- output_structuring: Response formatting

Usage:
    from app.services.extractors.youtube import extract_youtube_content

    # Extract content from a YouTube video
    response = await extract_youtube_content("https://www.youtube.com/watch?v=VIDEO_ID")

    if response.success:
        print(f"Title: {response.cleaned_data.generated_title}")
        print(f"Summary: {response.cleaned_data.generated_summary}")
        print(f"Tags: {[t.tag for t in response.tags]}")

Environment Variables:
    GROQ_API_KEY: Required for LLM content generation
    GROQ_MODEL: LLM model to use (default: llama-3.1-70b-versatile)
    VIDEO_TAG_MODEL: Zero-shot classifier model (default: facebook/bart-large-mnli)
    YTDLP_COOKIES_FILE: Path to YouTube cookies file (optional)
    YTDLP_PROXY: Proxy URL for yt-dlp (optional)
    YTDLP_VERBOSE: Enable verbose yt-dlp logging (optional)
"""

from .models import (
    YouTubeExtractionRequest,
    YouTubeExtractionResponse,
    YouTubeMetaData,
    YouTubeCleanedData,
    TranscriptSegment,
    YouTubeExtractionError,
    GeneratedTag,
)

from .extractor import (
    YouTubeExtractorEngine,
    YouTubeMetadataExtractor,
    YouTubeTranscriptExtractor,
    YouTubeContentGenerator,
    YouTubeTagGenerator,
    extract_video_id,
    format_duration,
)

from .preprocessor import (
    download_audio_for_transcription,
    extract_video_metadata_fast,
    cleanup_temp_files,
    is_youtube_url,
)

from .orchestrator import (
    YouTubeExtractionOrchestrator,
    extract_youtube_content,
    check_youtube_pipeline_health,
)

from .output_structuring import (
    structure_youtube_extraction_output,
    structure_youtube_for_refine_response,
)

__all__ = [
    "YouTubeExtractionRequest",
    "YouTubeExtractionResponse",
    "YouTubeMetaData",
    "YouTubeCleanedData",
    "TranscriptSegment",
    "YouTubeExtractionError",
    "GeneratedTag",
    "YouTubeExtractorEngine",
    "YouTubeMetadataExtractor",
    "YouTubeTranscriptExtractor",
    "YouTubeContentGenerator",
    "YouTubeTagGenerator",
    "extract_video_id",
    "format_duration",
    "download_audio_for_transcription",
    "extract_video_metadata_fast",
    "cleanup_temp_files",
    "is_youtube_url",
    "YouTubeExtractionOrchestrator",
    "extract_youtube_content",
    "check_youtube_pipeline_health",
    "structure_youtube_extraction_output",
    "structure_youtube_for_refine_response",
]
