"""
Embeddings Orchestrator

Coordinates embeddings generation and storage workflow.
Implements orchestration pattern consistent with extractors.
"""

import logging
import time
import os
from typing import Optional, List
from datetime import datetime

from .models import (
    EmbeddingResponse,
    EmbeddingConfig,
    EmbeddingMetadata,
)
from .generator import EmbeddingGenerator
from .storage import ChromaCloudStorage


class EmbeddingsOrchestrator:
    """
    Orchestrates embeddings generation and storage.

    Architecture Flow:
    Request → EmbeddingGenerator → ChromaCloudStorage → Response

    Uses FastAPI's Depends for Chroma collection injection.
    """

    def __init__(self, config: Optional[EmbeddingConfig] = None):
        """Initialize orchestrator"""
        if config is None:
            # Create config from environment variables
            config = EmbeddingConfig(
                chroma_api_key=os.getenv("CHROMA_API_KEY", ""),
                chroma_host=os.getenv("CHROMA_HOST", "api.trychroma.com"),
            )
        self.config = config
        self.logger = logging.getLogger(__name__)

        try:
            self.generator = EmbeddingGenerator(config)
            self.logger.info("✅ Embeddings orchestrator initialized")
        except Exception as e:
            self.logger.error(f"Failed to initialize embeddings orchestrator: {str(e)}")
            raise

    async def orchestrate_embedding_storage(
        self,
        doc_id: str,
        text: str,
        metadata: EmbeddingMetadata,
        collection=None,
    ) -> EmbeddingResponse:
        """
        Orchestrate complete embedding generation and storage process.

        Args:
            doc_id: Document ID
            text: Text to embed
            metadata: Document metadata
            collection: Chroma collection (optional, can be injected via FastAPI Depends)

        Returns:
            EmbeddingResponse with storage status
        """
        start_time = time.time()

        response = EmbeddingResponse(
            success=False,
            doc_id=doc_id,
            embedding_dimension=self.config.embedding_dimension,
            text_length=len(text),
            metadata=metadata,
            storage_status="pending",
            processing_time_ms=0,
            chroma_collection=self.config.chroma_collection,
        )

        try:
            self.logger.info(f"Starting orchestrated embedding for doc_id: {doc_id}")

            self.logger.debug("Generating embedding...")
            embedding = await self.generator.generate_single_embedding(text)

            if collection is not None:
                self.logger.debug("Storing in Chroma Cloud...")
                storage = ChromaCloudStorage(collection)
                await storage.store_embedding(doc_id, text, embedding, metadata)

            response.success = True
            response.storage_status = "stored"
            response.stored_at = datetime.utcnow()

            self.logger.info(f"✅ Successfully stored embedding for {doc_id}")

        except Exception as e:
            self.logger.error(f"Embedding storage failed: {str(e)}")
            response.storage_status = "failed"
            response.errors.append(str(e))
            response.success = False

        # Calculate processing time
        response.processing_time_ms = int((time.time() - start_time) * 1000)

        return response

async def generate_and_store_embeddings(
    doc_id: str,
    text: str,
    source_url: str,
    tags: Optional[List[str]] = None,
    summary: Optional[str] = None,
    source_type: str = "web",
    config: Optional[EmbeddingConfig] = None,
    collection=None,
) -> EmbeddingResponse:
    """
    Convenience function for direct embedding generation and storage in Chroma Cloud.

    Can be used standalone or with FastAPI Depends for collection injection.

    Args:
        doc_id: Document ID
        text: Text to embed
        source_url: Source URL
        tags: Optional list of tags
        summary: Optional summary text
        source_type: Type of source ("web", "pdf", "image")
        config: Optional configuration
        collection: Chroma collection (optional, can be injected via Depends)

    Returns:
        EmbeddingResponse with storage status
    """
    orchestrator = EmbeddingsOrchestrator(config)

    metadata = EmbeddingMetadata(
        source_url=source_url,
        tags=tags or [],
        summary=summary,
        source_type=source_type,
        content_length=len(text),
    )

    return await orchestrator.orchestrate_embedding_storage(
        doc_id, text, metadata, collection
    )
