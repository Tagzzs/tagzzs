"""
Tag Generators Package

Automatic tag generation using zero-shot classification.
Follows low-level architecture pattern of extractors for production readiness.

Components:
- models: Request/response data structures
- extractor: Core tag generation engine
- orchestrator: Coordination and error handling

Usage:
    from app.services.refiners.tag_generators import generate_tags

    response = await generate_tags(text, top_k=5)
"""

from .orchestrator import TagGenerationOrchestrator, generate_tags

from .models import TagGenerationRequest, TagGenerationResponse, TagGenerationConfig

from .generator import TagGenerationEngine

__all__ = [
    "generate_tags",
    "TagGenerationOrchestrator",
    "TagGenerationEngine",
    "TagGenerationRequest",
    "TagGenerationResponse",
    "TagGenerationConfig",
]
