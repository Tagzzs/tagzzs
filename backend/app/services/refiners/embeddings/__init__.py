"""
Embeddings Package

Semantic embeddings generation and storage in Chroma Cloud.
Follows low-level architecture pattern of extractors for production readiness.

Components:
- models: Request/response data structures
- generator: Core embedding generation engine
- storage: Chroma Cloud storage layer
- orchestrator: Coordination and error handling

Usage:
    from app.services.refiners.embeddings import generate_and_store_embeddings

    response = await generate_and_store_embeddings(
        doc_id="doc123",
        text="content",
        tags=["tag1", "tag2"]
    )
"""

from .orchestrator import EmbeddingsOrchestrator, generate_and_store_embeddings

from .models import (
    EmbeddingRequest,
    EmbeddingResponse,
    EmbeddingConfig,
    EmbeddingMetadata,
)

from .generator import EmbeddingGenerator
from .storage import ChromaCloudStorage

__all__ = [
    "generate_and_store_embeddings",
    "EmbeddingsOrchestrator",
    "EmbeddingGenerator",
    "ChromaCloudStorage",
    "EmbeddingRequest",
    "EmbeddingResponse",
    "EmbeddingConfig",
    "EmbeddingMetadata",
]
