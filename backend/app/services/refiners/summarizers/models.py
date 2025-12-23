"""
Summarization Request/Response Models

Data structures for summarization pipeline using Groq API.
Following architecture pattern with free-tier API integration.
"""

from pydantic import BaseModel, validator
from typing import List
from datetime import datetime


class SummarizationRequest(BaseModel):
    """Request model for text summarization via Groq API"""

    text: str
    max_length: int = 180
    min_length: int = 60

    @validator("text")
    def validate_text(cls, v):
        """Ensure text is not empty"""
        if not v.strip():
            raise ValueError("Text cannot be empty")
        if len(v) < 20:
            raise ValueError("Text must be at least 20 characters")
        return v.strip()

    @validator("max_length")
    def validate_max_length(cls, v):
        """Ensure valid max length"""
        if v < 50:
            raise ValueError("Max length must be at least 50")
        if v > 1000:
            raise ValueError("Max length must not exceed 1000")
        return v

    @validator("min_length")
    def validate_min_length(cls, v):
        """Ensure valid min length"""
        if v < 30:
            raise ValueError("Min length must be at least 30")
        return v


class SummarizationResponse(BaseModel):
    """Response model for summarization via Groq API"""

    success: bool
    text: str
    summary: str
    compression_ratio: float  # original_length / summary_length
    word_count_original: int
    word_count_summary: int
    processing_time_ms: int
    model_used: str = "llama-3.3-70b-versatile"
    generated_at: datetime = datetime.utcnow()
    api_provider: str = "groq"
    errors: List[str] = []


class SummarizationConfig(BaseModel):
    """Configuration for summarization engine using Groq API"""

    model_name: str = (
        "llama-3.1-8b-instant"
    )
    api_key: str = ""  # Will be loaded from environment

    # Summarization parameters
    max_length: int = 180
    min_length: int = 60
    temperature: float = 0.7
    top_p: float = 0.9

    # API settings
    timeout: int = 30
    max_retries: int = 3
    retry_delay: int = 1  # seconds
