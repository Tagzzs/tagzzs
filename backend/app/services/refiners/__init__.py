"""
Text Refiners Package

Collection of production-ready text refinement modules following
low-level architecture pattern of extractors (models/extractor/orchestrator).

Modules:
- summarizers: BART-based automatic summarization
- tag_generators: Zero-shot classification for tag generation
- embeddings: SentenceTransformer embeddings + Chroma Cloud storage

Usage:
    from app.services.refiners.summarizers import summarize_content
    from app.services.refiners.tag_generators import generate_tags
    from app.services.refiners.embeddings import generate_and_store_embeddings

OR use the integrated refinement pipeline:

    from app.services.refiners.refinement_pipeline import process_extracted_content

    refined = await process_extracted_content(
        extracted_text="...",
        source_url="...",
        source_type="web"
    )
"""

from .summarizers import (
    summarize_content,
    SummarizationOrchestrator,
    SummarizationEngine,
)

from .tag_generators import (
    generate_tags,
    TagGenerationOrchestrator,
    TagGenerationEngine,
)

from .embeddings import (
    generate_and_store_embeddings,
    EmbeddingsOrchestrator,
    EmbeddingGenerator,
    ChromaCloudStorage,
)

__all__ = [
    "summarize_content",
    "SummarizationOrchestrator",
    "SummarizationEngine",
    "generate_tags",
    "TagGenerationOrchestrator",
    "TagGenerationEngine",
    "generate_and_store_embeddings",
    "EmbeddingsOrchestrator",
    "EmbeddingGenerator",
    "ChromaCloudStorage",
]
