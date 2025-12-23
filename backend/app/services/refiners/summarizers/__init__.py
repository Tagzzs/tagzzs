"""
Summarizers Package

Text summarization module using BART (Large CNN).
Follows low-level architecture pattern of extractors for production readiness.

Components:
- models: Request/response data structures
- extractor: Core summarization engine
- orchestrator: Coordination and error handling

Usage:
    from app.services.refiners.summarizers import summarize_content

    response = await summarize_content(text, max_length=180, min_length=60)
"""

from .orchestrator import SummarizationOrchestrator, summarize_content

from .models import SummarizationRequest, SummarizationResponse, SummarizationConfig

from .summarizer import SummarizationEngine

__all__ = [
    "summarize_content",
    "SummarizationOrchestrator",
    "SummarizationEngine",
    "SummarizationRequest",
    "SummarizationResponse",
    "SummarizationConfig",
]
