"""
Semantic Search Service - Low-level architecture
Handles semantic search operations with Chroma vector database
"""

import logging
from typing import Optional, List
from dataclasses import dataclass

logger = logging.getLogger(__name__)


@dataclass
class SearchResult:
    """Semantic search result item"""

    content_id: str
    score: float
    rank: int
    date: Optional[str] = None


class SemanticSearchService:
    """
    Service for semantic search operations using RRF (Reciprocal Rank Fusion)

    Architecture:
    1. Accept query from API layer
    2. Generate embedding via HuggingFace
    3. Execute RRF hybrid search combining:
       - Embedding-based Knn search (weight 2.0) - semantic meaning
       - Text-based Knn search (weight 1.0) - keyword matching
    4. Filter results by tags and/or content_id if provided
    5. Return ranked results with RRF scores
    """

    def __init__(self):
        self.logger = logger

    async def _execute_rrf_search(
        self,
        user_id: str,
        query: str,
        tags: Optional[List] = None,
        limit: int = 10,
        content_id_filter: Optional[str] = None,
    ) -> List[SearchResult]:
        """
        Execute semantic search

        Args:
            user_id: User ID for Chroma collection routing
            query: Search query text
            tags: Optional list of tags to filter by
            limit: Maximum results to return
            content_id_filter: Optional content ID to filter results

        Returns:
            List of SearchResult objects ranked by relevance
        """
        try:
            self.logger.info(f"[SEMANTIC_SEARCH] Starting search for user: {user_id}")
            self.logger.info(f"[SEMANTIC_SEARCH] Query: '{query}'")

            if tags:
                self.logger.info(f"[SEMANTIC_SEARCH] Tags filter: {tags}")
            if content_id_filter:
                self.logger.info(
                    f"[SEMANTIC_SEARCH] Content ID filter: {content_id_filter}"
                )

            query_embedding = await self._generate_embedding(query)
            self.logger.info(
                f"[SEMANTIC_SEARCH] ✅ Generated embedding ({len(query_embedding)} dimensions)"
            )

            from app.connections import get_user_collection

            collection = get_user_collection(user_id, "summaries")
            self.logger.info(
                f"[SEMANTIC_SEARCH] ✅ Got collection: user_{user_id}_summaries"
            )

            where_filter = self._build_where_filter(tags, content_id_filter)

            search_results = await self._search_chroma(
                collection=collection,
                query_embedding=query_embedding,
                query_text=query,
                where_filter=where_filter,
                limit=limit,
            )

            self.logger.info(
                f"[SEMANTIC_SEARCH] ✅ Search complete: {len(search_results)} results"
            )

            return search_results

        except Exception as e:
            self.logger.error(f"[SEMANTIC_SEARCH] ❌ Error: {str(e)}")
            raise

    async def _generate_embedding(self, query: str) -> List[float]:
        """Generate embedding for query using HuggingFace"""
        try:
            from app.services.refiners.embeddings.generator import EmbeddingGenerator

            max_length = 400
            truncated_query = query[:max_length] if len(query) > max_length else query

            generator = EmbeddingGenerator()
            embeddings = await generator.generate_embeddings([truncated_query])

            if not embeddings or len(embeddings) == 0:
                raise ValueError("Failed to generate embedding")

            return embeddings[0]

        except Exception as e:
            self.logger.error(f"[SEMANTIC_SEARCH] Error generating embedding: {str(e)}")
            raise

    def _build_where_filter(
        self, tags: Optional[list] = None, content_id_filter: Optional[str] = None
    ) -> Optional[dict]:
        """Build Chroma where filter"""
        filters = []

        if tags and len(tags) > 0:
            tag_filter = {"tags": {"$in": tags}}
            filters.append(tag_filter)
            self.logger.info(f"[SEMANTIC_SEARCH] Added tag filter: {tags}")
        if content_id_filter:
            content_filter = {"content_id": {"$eq": content_id_filter}}
            filters.append(content_filter)
            self.logger.info(
                f"[SEMANTIC_SEARCH] Added content_id filter: {content_id_filter}"
            )

        if len(filters) == 0:
            return None
        elif len(filters) == 1:
            return filters[0]
        else:
            return {"$and": filters}

    async def _search_chroma(
        self,
        collection,
        query_embedding: List[float],
        query_text: str,
        where_filter: Optional[dict],
        limit: int,
    ) -> List[SearchResult]:
        """Execute Chroma RRF hybrid search combining embedding and text search"""
        try:
            from chromadb import Search, K, Knn, Rrf

            self.logger.info("[SEMANTIC_SEARCH] Building RRF hybrid search query...")

            # Build RRF ranking combining embedding-based and text-based search
            # Embedding search (weight 2.0): More important for semantic matching
            # Text search (weight 1.0): Keyword matching support
            hybrid_rank = Rrf(
                ranks=[
                    Knn(query=query_embedding, return_rank=True, limit=300),
                    Knn(query=query_text, return_rank=True, limit=300),
                ],
                weights=[2.0, 1.0],  # Embedding 2x more important than text
                k=60,
            )

            # Build search query with RRF ranking
            search = (
                Search()
                .rank(hybrid_rank)
                .limit(limit)
                .select(K.DOCUMENT, K.SCORE, "content_id")
            )

            # Apply filter if provided
            if where_filter:
                search.where(where_filter)
                self.logger.info(f"[SEMANTIC_SEARCH] Applied filter: {where_filter}")

            # Execute search
            self.logger.info("[SEMANTIC_SEARCH] Executing RRF hybrid search...")
            results = collection.search(search)

            # Process results
            processed_results = []

            if results.rows and results.rows()[0]:
                rows = results.rows()[0]
                self.logger.info(
                    f"[SEMANTIC_SEARCH] Got {len(rows)} results from Chroma"
                )

                for rank, row in enumerate(rows):
                    # Handle both dict and object responses
                    if isinstance(row, dict):
                        metadata = row.get("metadata") or {}
                        score = row.get("score") or 0
                        row.get("document") or ""
                    else:
                        metadata = getattr(row, "metadata", {}) or {}
                        score = getattr(row, "score", 0) or 0
                        getattr(row, "document", "") or ""

                    content_id = (
                        metadata.get("content_id", "")
                        if isinstance(metadata, dict)
                        else getattr(metadata, "content_id", "")
                    )
                    created_at = (
                        metadata.get("created_at")
                        if isinstance(metadata, dict)
                        else getattr(metadata, "created_at", None)
                    )

                    if content_id:
                        search_result = SearchResult(
                            content_id=content_id,
                            score=float(score),
                            rank=rank + 1,
                            date=created_at,
                        )
                        processed_results.append(search_result)

                        self.logger.info(
                            f"[SEMANTIC_SEARCH] Result {rank + 1}: "
                            f"content_id={content_id}, score={score:.4f}, created_at={created_at}"
                        )
            else:
                self.logger.info("[SEMANTIC_SEARCH] No results returned from Chroma")

            return processed_results

        except Exception as e:
            self.logger.error(f"[SEMANTIC_SEARCH] Error during Chroma search: {str(e)}")
            raise
