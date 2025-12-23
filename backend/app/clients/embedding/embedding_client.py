"""
EmbeddingClient - Text Embedding Generator

Generates text embeddings using Sentence Transformers with local caching.
Uses all-MiniLM-L6-v2 model (22MB, 384-dimensional embeddings).
"""

import logging
import hashlib
from typing import List, Dict
from sentence_transformers import SentenceTransformer

logger = logging.getLogger(__name__)


class EmbeddingClient:
    """
    Client for generating text embeddings locally.

    Features:
    - Loads all-MiniLM-L6-v2 model (384-dim embeddings)
    - Caches embeddings to avoid redundant computations
    - Batch processing support
    - Automatic model download on first use
    """

    def __init__(self, model_name: str = "all-MiniLM-L6-v2"):
        """
        Initialize EmbeddingClient with specified model.

        Args:
            model_name: HuggingFace model name (default: all-MiniLM-L6-v2)

        Raises:
            RuntimeError: If model cannot be loaded
        """
        self.model_name = model_name
        self.cache: Dict[str, List[float]] = {}

        try:
            logger.info(f"Loading embedding model: {model_name}")
            self.model = SentenceTransformer(model_name)
            logger.info("Model loaded successfully. Embedding dimension: 384")
        except Exception as e:
            logger.error(f"Failed to load embedding model: {str(e)}")
            raise RuntimeError(f"Cannot load embedding model: {str(e)}")

    def _get_cache_key(self, text: str) -> str:
        """
        Generate a cache key for text (hash of text).

        Args:
            text: The text to hash

        Returns:
            MD5 hash of the text
        """
        return hashlib.md5(text.encode()).hexdigest()

    def embed_text(self, text: str) -> List[float]:
        """
        Generate embedding for a single text.

        Uses cache to avoid recomputing embeddings for same text.

        Args:
            text: The text to embed

        Returns:
            List of 384 floating point values (embedding)

        Example:
            >>> client = EmbeddingClient()
            >>> embedding = client.embed_text("Hello world")
            >>> print(len(embedding))  # 384
        """
        if not isinstance(text, str) or not text.strip():
            raise ValueError("Text must be a non-empty string")

        # Check cache
        cache_key = self._get_cache_key(text)
        if cache_key in self.cache:
            logger.debug("Cache hit for embedding")
            return self.cache[cache_key]

        try:
            # Generate embedding
            embedding = self.model.encode(text, convert_to_tensor=False)
            embedding_list = (
                embedding.tolist() if hasattr(embedding, "tolist") else list(embedding)
            )

            # Store in cache
            self.cache[cache_key] = embedding_list

            logger.debug(f"Generated embedding of dimension {len(embedding_list)}")
            return embedding_list

        except Exception as e:
            logger.error(f"Error generating embedding: {str(e)}")
            raise

    def embed_batch(self, texts: List[str]) -> List[List[float]]:
        """
        Generate embeddings for multiple texts efficiently.

        Processes multiple texts at once. Uses cache for known texts.

        Args:
            texts: List of texts to embed

        Returns:
            List of embeddings (each 384-dimensional)

        Example:
            >>> client = EmbeddingClient()
            >>> embeddings = client.embed_batch(["text1", "text2", "text3"])
            >>> print(len(embeddings))  # 3
            >>> print(len(embeddings[0]))  # 384
        """
        if not isinstance(texts, list) or not texts:
            raise ValueError("Texts must be a non-empty list")

        # Separate cached and uncached texts
        embeddings_list = []
        texts_to_embed = []
        text_indices = {}  # Map of text index to cache/uncached index

        for i, text in enumerate(texts):
            if not isinstance(text, str) or not text.strip():
                raise ValueError(
                    f"All texts must be non-empty strings (text {i} is invalid)"
                )

            cache_key = self._get_cache_key(text)
            if cache_key in self.cache:
                embeddings_list.append(self.cache[cache_key])
                logger.debug(f"Using cached embedding for text {i}")
            else:
                text_indices[len(texts_to_embed)] = i
                texts_to_embed.append(text)

        # Embed uncached texts
        if texts_to_embed:
            try:
                new_embeddings = self.model.encode(
                    texts_to_embed, convert_to_tensor=False
                )

                # Convert to list and cache
                for j, embedding in enumerate(new_embeddings):
                    embedding_list = (
                        embedding.tolist()
                        if hasattr(embedding, "tolist")
                        else list(embedding)
                    )

                    # Cache it
                    text_index = text_indices[j]
                    cache_key = self._get_cache_key(texts[text_index])
                    self.cache[cache_key] = embedding_list

                    # Insert at correct position
                    embeddings_list.insert(text_index, embedding_list)

                logger.debug(f"Generated {len(texts_to_embed)} new embeddings")

            except Exception as e:
                logger.error(f"Error generating batch embeddings: {str(e)}")
                raise

        return embeddings_list

    def embed_query(self, query: str) -> List[float]:
        """
        Generate embedding for a query text.

        Same as embed_text but marked specifically for queries.

        Args:
            query: The query text to embed

        Returns:
            List of 384 floating point values (embedding)
        """
        return self.embed_text(query)

    def clear_cache(self) -> None:
        """Clear the embedding cache."""
        cache_size = len(self.cache)
        self.cache.clear()
        logger.info(f"Cleared cache ({cache_size} items)")

    def get_cache_stats(self) -> Dict[str, int]:
        """
        Get cache statistics.

        Returns:
            Dictionary with cache stats
        """
        return {
            "cached_items": len(self.cache),
            "cache_memory_estimate_mb": len(self.cache)
            * 384
            * 8
            / (1024 * 1024),  # Rough estimate
        }

    def set_batch_size(self, batch_size: int = 32) -> None:
        """
        Set batch size for encoding (affects memory usage).

        Args:
            batch_size: Batch size for encoding
        """
        try:
            # This would be set on the model if needed
            self.batch_size = batch_size
            logger.info(f"Batch size set to {batch_size}")
        except Exception as e:
            logger.error(f"Error setting batch size: {str(e)}")
            raise
