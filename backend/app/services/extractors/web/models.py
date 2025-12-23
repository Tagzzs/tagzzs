"""
Web Content Extractor Models

Data structures for request/response following ARCHITECTURE.md specifications.
Simple, clean models for web content extraction pipeline.
"""

from datetime import datetime
from typing import Dict, List, Optional, Any
from pydantic import BaseModel, HttpUrl, validator


class ExtractionRequest(BaseModel):
    """
    Simple extraction request containing only the URL to extract from.

    Following architecture spec: Request[url] → Extractor
    """

    url: HttpUrl

    @validator("url")
    def validate_url(cls, v):
        """Ensure URL is properly formatted"""
        if not str(v).startswith(("http://", "https://")):
            raise ValueError("URL must start with http:// or https://")
        return v


class MetaData(BaseModel):
    """
    Extracted metadata from the web page.

    Contains key information about the page like title, description, etc.
    """

    title: Optional[str] = None
    description: Optional[str] = None
    keywords: Optional[List[str]] = None
    author: Optional[str] = None
    language: Optional[str] = None
    canonical_url: Optional[str] = None
    og_title: Optional[str] = None
    og_description: Optional[str] = None
    og_image: Optional[str] = None
    og_url: Optional[str] = None
    twitter_title: Optional[str] = None
    twitter_description: Optional[str] = None
    twitter_image: Optional[str] = None
    twitter_card: Optional[str] = None


class CleanedData(BaseModel):
    """
    Cleaned and processed content from the web page.

    Contains the main textual content after processing.
    """

    main_content: Optional[str] = None
    headings: Optional[List[str]] = None
    paragraphs: Optional[List[str]] = None
    links: Optional[List[Dict[str, str]]] = None
    images: Optional[List[Dict[str, str]]] = None
    word_count: Optional[int] = None
    reading_time_minutes: Optional[int] = None


class ExtractionError(BaseModel):
    """
    Error information with debug details.

    Provides helpful error context for debugging.
    """

    error_type: str
    message: str
    details: Optional[Dict[str, Any]] = None
    timestamp: datetime = datetime.utcnow()
    stage: Optional[str] = None  # Which stage of extraction failed


class ExtractionResponse(BaseModel):
    """
    Complete extraction response with all data and metadata.

    Following architecture spec: Extractor → Response[raw_html, cleaned_data, meta_data, extracted_time, errors]
    """

    raw_data: Optional[str] = None
    cleaned_data: Optional[CleanedData] = None
    meta_data: Optional[MetaData] = None
    extracted_time: datetime = datetime.utcnow()
    errors: List[ExtractionError] = []

    # Additional fields for system info
    success: bool = True
    processing_time_ms: Optional[int] = None
    url: Optional[str] = None  # Original URL that was extracted

    @validator("success", pre=True, always=True)
    def determine_success(cls, v, values):
        """Automatically determine success based on errors"""
        errors = values.get("errors", [])
        return len(errors) == 0

    def add_error(
        self,
        error_type: str,
        message: str,
        details: Optional[Dict[str, Any]] = None,
        stage: Optional[str] = None,
    ):
        """Helper method to add an error to the response"""
        error = ExtractionError(
            error_type=error_type, message=message, details=details or {}, stage=stage
        )
        self.errors.append(error)
        self.success = False

    def has_errors(self) -> bool:
        """Check if response has any errors"""
        return len(self.errors) > 0

    def get_error_summary(self) -> str:
        """Get a summary of all errors for logging"""
        if not self.has_errors():
            return "No errors"

        error_messages = [
            f"{error.error_type}: {error.message}" for error in self.errors
        ]
        return "; ".join(error_messages)
