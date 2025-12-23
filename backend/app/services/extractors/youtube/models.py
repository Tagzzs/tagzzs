"""
YouTube Video Extractor Models

Data structures for YouTube video extraction following architecture specifications.
Extracts video metadata, transcript/captions, and generates title, description, tags.
"""

from datetime import datetime
from typing import List, Optional
from pydantic import BaseModel, field_validator


class YouTubeExtractionRequest(BaseModel):
    """
    YouTube extraction request containing video URL.

    Supports various YouTube URL formats:
    - https://www.youtube.com/watch?v=VIDEO_ID
    - https://youtu.be/VIDEO_ID
    - https://www.youtube.com/embed/VIDEO_ID
    - https://www.youtube.com/shorts/VIDEO_ID
    """

    url: str

    @field_validator("url", mode="before")
    @classmethod
    def validate_youtube_url(cls, v):
        """Ensure URL is a valid YouTube URL"""
        url_str = str(v).strip()
        if not url_str.startswith(("http://", "https://")):
            raise ValueError("URL must start with http:// or https://")

        # Check if it's a YouTube URL
        valid_domains = [
            "youtube.com",
            "www.youtube.com",
            "m.youtube.com",
            "youtu.be",
            "www.youtu.be",
        ]
        from urllib.parse import urlparse

        parsed = urlparse(url_str)
        if not any(domain in parsed.netloc for domain in valid_domains):
            raise ValueError("URL must be a valid YouTube URL")

        return url_str


class TranscriptSegment(BaseModel):
    """
    Single transcript/caption segment with timing information.
    """

    start: float  # Start time in seconds
    end: float  # End time in seconds
    text: str  # Transcript text
    duration: Optional[float] = None


class YouTubeMetaData(BaseModel):
    """
    YouTube video metadata extracted from the platform.
    """

    video_id: str
    original_title: Optional[str] = None
    original_description: Optional[str] = None
    channel_name: Optional[str] = None
    channel_id: Optional[str] = None
    upload_date: Optional[datetime] = None
    duration_seconds: Optional[int] = None
    view_count: Optional[int] = None
    like_count: Optional[int] = None
    comment_count: Optional[int] = None
    thumbnail_url: Optional[str] = None
    category: Optional[str] = None
    original_tags: List[str] = []
    is_live: bool = False
    is_short: bool = False
    language: Optional[str] = None


class YouTubeCleanedData(BaseModel):
    """
    Processed and cleaned YouTube video content.
    """

    # Generated content (AI-enhanced)
    generated_title: str = ""
    generated_description: str = ""
    generated_summary: str = ""

    # Extracted transcript
    full_transcript: str = ""
    transcript_segments: List[TranscriptSegment] = []
    transcript_language: Optional[str] = None
    transcript_source: str = ""  # "youtube_api", "whisper", "auto_generated"

    # Content analysis
    word_count: int = 0
    duration_formatted: str = ""  # e.g., "10:30"


class YouTubeExtractionError(BaseModel):
    """
    Error details for failed extraction steps.
    """

    error_type: str
    message: str
    component: str  # Which component failed
    timestamp: datetime = datetime.now()
    recoverable: bool = True


class GeneratedTag(BaseModel):
    """
    AI-generated tag with confidence score.
    """

    tag: str
    confidence: float
    slug: Optional[str] = None


class YouTubeExtractionResponse(BaseModel):
    """
    Complete YouTube extraction response.

    Contains:
    - Original video metadata
    - Extracted/generated content (title, description, tags)
    - Processing information
    """

    url: str
    success: bool = False

    # Metadata from YouTube
    meta_data: Optional[YouTubeMetaData] = None

    # Cleaned/processed data
    cleaned_data: Optional[YouTubeCleanedData] = None

    # Generated tags with confidence scores
    tags: List[GeneratedTag] = []

    # Content type detection
    content_type: str = "youtube"
    detected_category: Optional[str] = (
        None  # e.g., "tutorial", "entertainment", "music"
    )

    # Processing info
    processing_time_ms: Optional[int] = None
    extracted_time: Optional[datetime] = None

    # Errors if any
    errors: List[YouTubeExtractionError] = []

    class Config:
        arbitrary_types_allowed = True
