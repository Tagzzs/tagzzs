"""
Embedding Generator Engine

Core embedding generation using sentence-transformers locally.
Uses lightweight all-MiniLM-L6-v2 model for 384-dim embeddings.
"""

import logging
import os
from typing import List, Optional

try:
    from sentence_transformers import SentenceTransformer
except ImportError:
    SentenceTransformer = None

from .models import EmbeddingConfig


class EmbeddingGenerator:
    """
    Core embedding generation engine using sentence-transformers locally.

    Uses all-MiniLM-L6-v2 model - lightweight (22MB) and fast.
    Generates 384-dimensional embeddings.
    """

    def __init__(self, config: Optional[EmbeddingConfig] = None):
        """Initialize embedding generator"""
        if config is None:
            config = EmbeddingConfig(
                chroma_api_key=os.getenv("CHROMA_API_KEY", ""),
                chroma_host=os.getenv("CHROMA_HOST", "api.trychroma.com"),
            )
        self.config = config
        self.logger = logging.getLogger(__name__)

        if SentenceTransformer is None:
            raise RuntimeError(
                "sentence-transformers package is required for embedding generation"
            )

        # Model will be cached locally after first download
        model_name = "sentence-transformers/all-MiniLM-L6-v2"
        self.logger.info(f"Loading embedding model: {model_name}")
        self.model = SentenceTransformer(model_name)
        self.logger.info(
            f"✅ Embedding generator initialized. Model embedding dim: {self.model.get_sentence_embedding_dimension()}"
        )

    async def generate_embeddings(self, texts: List[str]) -> List[List[float]]:
        """
        Generate embeddings for multiple texts using local sentence-transformers model.

        Args:
            texts: List of texts to embed

        Returns:
            List of embedding vectors (384 dimensions each)
        """
        if not texts:
            return []

        try:
            self.logger.debug(f"Generating embeddings for {len(texts)} texts")
            embeddings = self.model.encode(texts, convert_to_tensor=False)

            embeddings_list = [embedding.tolist() for embedding in embeddings]

            self.logger.debug(
                f"Generated {len(embeddings_list)} embeddings ({len(embeddings_list[0])} dims each)"
            )
            return embeddings_list

        except Exception as e:
            self.logger.error(f"Failed to generate embeddings: {str(e)}")
            raise

    async def generate_single_embedding(self, text: str) -> List[float]:
        """
        Generate embedding for a single text.

        Args:
            text: Text to embed

        Returns:
            Embedding vector as list of floats
        """
        embeddings = await self.generate_embeddings([text])
        return embeddings[0] if embeddings else []

    async def generate_embeddings_batch(
        self, texts: List[str], batch_size: int = 32
    ) -> List[List[float]]:
        """
        Generate embeddings for texts in batches.

        Args:
            texts: List of texts to embed
            batch_size: Size of each batch

        Returns:
            List of embedding vectors
        """
        all_embeddings = []

        for i in range(0, len(texts), batch_size):
            batch = texts[i : i + batch_size]
            self.logger.debug(
                f"Processing batch {i // batch_size + 1} ({len(batch)} texts)"
            )
            batch_embeddings = await self.generate_embeddings(batch)
            all_embeddings.extend(batch_embeddings)

        return all_embeddings
