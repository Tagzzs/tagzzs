"""
Web Content Extractor Package

Components:
- models: Request/response data structures
- extractor: Core Playwright-based extraction engine

Usage:
    from app.services.extractors.web import WebContentExtractor, extract_content
    from app.services.extractors.web.models import ExtractionRequest, DebugConfig

    # Usage
    response = await extract_content("https://example.com")
"""

from .models import (
    ExtractionRequest,
    ExtractionResponse,
    CleanedData,
    MetaData,
    ExtractionError,
)

from .extractor import WebContentExtractor, extract_content
from .error_handling import get_error_handler, handle_extraction_error, get_error_stats

__all__ = [
    "ExtractionRequest",
    "ExtractionResponse",
    "CleanedData",
    "MetaData",
    "ExtractionError",
    "WebContentExtractor",
    "extract_content",
    "get_error_handler",
    "handle_extraction_error",
    "get_error_stats",
]
