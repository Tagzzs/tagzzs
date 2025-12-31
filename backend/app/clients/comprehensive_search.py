"""
Comprehensive Search Engine - Multi-Field Content Retrieval

Implements sophisticated search across multiple content fields:
- Title (highest relevance weight)
- Description/metadata
- Personal notes
- Raw data/full content

Provides:
1. Multi-field search execution
2. Intelligent result ranking by field relevance + semantic similarity
3. Result deduplication
4. Source context preservation
"""

import logging
from typing import Optional, List, Dict, Any
from dataclasses import dataclass
from app.connections import get_user_collection

logger = logging.getLogger(__name__)


@dataclass
class SearchResult:
    """
    Comprehensive search result with full context from all available fields.

    Includes information from: title, description, tags, personal notes, raw data,
    and vector embeddings (through similarity distance).
    """

    content: str
    metadata: Dict[str, Any]
    source_field: (
        str  # 'title', 'description', 'tags', 'personal_notes', 'raw_data', 'chunks'
    )
    relevance_score: (
        float  # Combined score: (field_weight × 0.7) + (vector_similarity × 0.3)
    )
    field_weight: float  # Weight based on field reliability (0.6-1.0)
    similarity_distance: Optional[float] = (
        None  # Vector embedding distance (lower = more similar)
    )
    vector_similarity: Optional[float] = None  # Normalized vector similarity (0-1)
    content_id: Optional[str] = None
    source_type: Optional[str] = None  # pdf, web, image, etc.
    tags: Optional[List[str]] = None  # Tags/keywords for content classification

    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary format."""
        return {
            "content": self.content,
            "metadata": self.metadata,
            "source_field": self.source_field,
            "relevance_score": self.relevance_score,
            "field_weight": self.field_weight,
            "similarity_distance": self.similarity_distance,
            "vector_similarity": self.vector_similarity,
            "content_id": self.content_id,
            "source_type": self.source_type,
            "tags": self.tags,
        }


class ComprehensiveSearchEngine:
    """
    Multi-field search engine for accurate content retrieval.

    Searches across ALL content fields:
    1. Title (weight: 1.0) - Most reliable structured content
    2. Description/metadata (weight: 0.9) - Curated metadata
    3. Tags (weight: 0.95) - Explicit categorization/keywords
    4. Personal notes (weight: 0.8) - User annotations
    5. Raw data/full content (weight: 0.7) - Complete content
    6. Chunks (weight: 0.6) - Semantic segments

    Combines vector embeddings (semantic similarity) with field reliability weights.
    Uses 70/30 formula: (field_weight × 0.7) + (vector_similarity × 0.3)
    """

    # Field relevance weights (highest = best/most reliable for answers)
    # These weights reflect the reliability and specificity of each field
    FIELD_WEIGHTS = {
        "title": 1.0,  # Most reliable - direct, concise, verified
        "tags": 0.95,  # Explicit categorization/keywords
        "description": 0.9,  # Curated structured information
        "personal_notes": 0.8,  # User-added context and annotations
        "raw_data": 0.7,  # Full content but less structured
        "chunks": 0.6,  # Semantic segments from embeddings
    }

    def __init__(self, user_id: str):
        """
        Initialize search engine for a specific user.

        Args:
            user_id: The user's unique identifier
        """
        self.user_id = user_id
        self.chunks_collection = get_user_collection(user_id, "chunks")
        self.summaries_collection = get_user_collection(user_id, "summaries")

        logger.info(f"ComprehensiveSearchEngine initialized for user: {user_id}")

    def comprehensive_search(
        self,
        query_embedding: List[float],
        query_text: str,
        top_k: int = 10,
        where_filter: Optional[Dict[str, Any]] = None,
    ) -> List[SearchResult]:
        """
        Execute comprehensive multi-field search.

        Searches across all content fields and returns ranked results.

        Args:
            query_embedding: The query embedding vector
            query_text: The original query text for context
            top_k: Number of results to return
            where_filter: Optional metadata filter

        Returns:
            List of SearchResult objects ranked by relevance
        """
        try:
            all_results = []

            # Search chunks collection (contains all fields)
            logger.info(
                f"[COMPREHENSIVE_SEARCH] Starting multi-field search for query: {query_text[:80]}..."
            )

            # Execute main search on chunks collection
            chunk_results = self.chunks_collection.query(
                query_embeddings=[query_embedding],
                n_results=top_k * 2,  # Get more to account for filtering
                where=where_filter,
                include=["documents", "metadatas", "distances"],
            )

            logger.info(
                f"[COMPREHENSIVE_SEARCH] Retrieved {len(chunk_results.get('documents', [[]])[0])} initial results"
            )

            # Process chunk results with ALL fields (title, description, tags, notes, raw_data, chunks)
            if chunk_results["documents"] and len(chunk_results["documents"]) > 0:
                for i, doc in enumerate(chunk_results["documents"][0]):
                    metadata = (
                        chunk_results["metadatas"][0][i]
                        if chunk_results["metadatas"]
                        else {}
                    )
                    distance = (
                        chunk_results["distances"][0][i]
                        if chunk_results["distances"]
                        else None
                    )

                    # Determine which field this result came from
                    source_field = metadata.get("source_field", "raw_data")
                    field_weight = self.FIELD_WEIGHTS.get(source_field, 0.6)

                    # Calculate vector similarity from distance (0-1 range)
                    vector_similarity = (
                        self._distance_to_similarity(distance)
                        if distance is not None
                        else 0.8
                    )

                    # Calculate relevance score using weighted formula
                    # field_weight (70%) emphasizes trusted sources like title/description/tags
                    # vector_similarity (30%) adds semantic relevance from embeddings
                    relevance_score = (field_weight * 0.7) + (vector_similarity * 0.3)

                    # Extract tags if available
                    tags = None
                    if "tags" in metadata:
                        tags_str = metadata.get("tags", "")
                        if isinstance(tags_str, str):
                            tags = [t.strip() for t in tags_str.split(",") if t.strip()]
                        elif isinstance(tags_str, list):
                            tags = tags_str

                    result = SearchResult(
                        content=doc,
                        metadata=metadata,
                        source_field=source_field,
                        relevance_score=relevance_score,
                        field_weight=field_weight,
                        similarity_distance=distance,
                        vector_similarity=vector_similarity,
                        content_id=metadata.get("content_id"),
                        source_type=metadata.get("source_type"),
                        tags=tags,
                    )

                    all_results.append(result)

            # Also search summaries collection for quick overviews
            logger.info(
                "[COMPREHENSIVE_SEARCH] Searching summaries collection for overview..."
            )
            summary_results = self.summaries_collection.query(
                query_embeddings=[query_embedding],
                n_results=top_k,
                where=where_filter,
                include=["documents", "metadatas", "distances"],
            )

            if summary_results["documents"] and len(summary_results["documents"]) > 0:
                for i, doc in enumerate(summary_results["documents"][0]):
                    metadata = (
                        summary_results["metadatas"][0][i]
                        if summary_results["metadatas"]
                        else {}
                    )
                    distance = (
                        summary_results["distances"][0][i]
                        if summary_results["distances"]
                        else None
                    )

                    # Summary results get a boost for being summaries (more synthesized)
                    source_field = "summary"
                    field_weight = 0.85  # High weight but slightly below title

                    vector_similarity = (
                        self._distance_to_similarity(distance)
                        if distance is not None
                        else 0.8
                    )
                    relevance_score = (field_weight * 0.7) + (vector_similarity * 0.3)

                    # Extract tags if available
                    tags = None
                    if "tags" in metadata:
                        tags_str = metadata.get("tags", "")
                        if isinstance(tags_str, str):
                            tags = [t.strip() for t in tags_str.split(",") if t.strip()]
                        elif isinstance(tags_str, list):
                            tags = tags_str

                    result = SearchResult(
                        content=doc,
                        metadata=metadata,
                        source_field=source_field,
                        relevance_score=relevance_score,
                        field_weight=field_weight,
                        similarity_distance=distance,
                        vector_similarity=vector_similarity,
                        content_id=metadata.get("content_id"),
                        source_type=metadata.get("source_type"),
                        tags=tags,
                    )

                    all_results.append(result)

            # Remove duplicates (same content_id)
            seen_ids = set()
            deduplicated_results = []
            for result in all_results:
                if result.content_id:
                    if result.content_id not in seen_ids:
                        deduplicated_results.append(result)
                        seen_ids.add(result.content_id)
                else:
                    # If no content_id, include it
                    deduplicated_results.append(result)

            # Sort by relevance score (highest first)
            sorted_results = sorted(
                deduplicated_results, key=lambda x: x.relevance_score, reverse=True
            )

            # Return top-k results
            final_results = sorted_results[:top_k]

            logger.info(
                f"[COMPREHENSIVE_SEARCH] Returning {len(final_results)} results"
            )
            for i, result in enumerate(final_results[:3], 1):
                logger.info(
                    f"  Result {i}: field={result.source_field}, "
                    f"relevance={result.relevance_score:.3f}, "
                    f"content_preview={result.content[:60]}..."
                )

            return final_results

        except Exception as e:
            logger.error(f"[COMPREHENSIVE_SEARCH] Error: {str(e)}", exc_info=True)
            raise

    def search_by_field(
        self,
        query_embedding: List[float],
        field_name: str,
        top_k: int = 5,
        where_filter: Optional[Dict[str, Any]] = None,
    ) -> List[SearchResult]:
        """
        Search within a specific field only.

        Args:
            query_embedding: The query embedding vector
            field_name: Which field to search ('title', 'description', 'personal_notes', 'raw_data')
            top_k: Number of results
            where_filter: Optional metadata filter

        Returns:
            List of SearchResult objects from that field
        """
        try:
            logger.info(f"[SEARCH_BY_FIELD] Searching field: {field_name}")

            # Add field filter to where clause
            field_filter = {"source_field": {"$eq": field_name}}
            combined_filter = field_filter

            if where_filter:
                combined_filter = {"$and": [field_filter, where_filter]}

            # Execute search
            results = self.chunks_collection.query(
                query_embeddings=[query_embedding],
                n_results=top_k,
                where=combined_filter,
                include=["documents", "metadatas", "distances"],
            )

            field_results = []
            if results["documents"] and len(results["documents"]) > 0:
                for i, doc in enumerate(results["documents"][0]):
                    metadata = (
                        results["metadatas"][0][i] if results["metadatas"] else {}
                    )
                    distance = (
                        results["distances"][0][i] if results["distances"] else None
                    )

                    field_weight = self.FIELD_WEIGHTS.get(field_name, 0.6)
                    vector_similarity = (
                        self._distance_to_similarity(distance)
                        if distance is not None
                        else 0.8
                    )
                    relevance_score = (field_weight * 0.7) + (vector_similarity * 0.3)

                    # Extract tags if available
                    tags = None
                    if "tags" in metadata:
                        tags_str = metadata.get("tags", "")
                        if isinstance(tags_str, str):
                            tags = [t.strip() for t in tags_str.split(",") if t.strip()]
                        elif isinstance(tags_str, list):
                            tags = tags_str

                    result = SearchResult(
                        content=doc,
                        metadata=metadata,
                        source_field=field_name,
                        relevance_score=relevance_score,
                        field_weight=field_weight,
                        similarity_distance=distance,
                        vector_similarity=vector_similarity,
                        content_id=metadata.get("content_id"),
                        source_type=metadata.get("source_type"),
                        tags=tags,
                    )

                    field_results.append(result)

            logger.info(
                f"[SEARCH_BY_FIELD] Found {len(field_results)} results in {field_name}"
            )
            return field_results

        except Exception as e:
            logger.error(f"[SEARCH_BY_FIELD] Error: {str(e)}", exc_info=True)
            raise

    @staticmethod
    def _distance_to_similarity(distance: float) -> float:
        """
        Convert distance metric to similarity (0-1 range).

        Uses exponential decay: similarity = e^(-distance)
        This ensures closer matches have higher similarity.

        Args:
            distance: Vector distance

        Returns:
            Similarity score (0-1)
        """
        import math

        if distance is None or distance < 0:
            return 0.5

        # Exponential decay
        similarity = math.exp(-distance)

        # Clamp to [0, 1]
        return min(max(similarity, 0.0), 1.0)

    def get_field_statistics(self) -> Dict[str, Any]:
        """
        Get statistics about content distribution across fields.

        Returns:
            Dictionary with field counts and statistics
        """
        try:
            logger.info("[FIELD_STATS] Calculating field statistics...")

            stats = {}

            for field_name in self.FIELD_WEIGHTS.keys():
                try:
                    # Count documents in each field
                    results = self.chunks_collection.get(
                        where={"source_field": {"$eq": field_name}}
                    )
                    count = len(results.get("ids", []))
                    stats[field_name] = {
                        "count": count,
                        "weight": self.FIELD_WEIGHTS[field_name],
                    }
                except Exception as e:
                    logger.warning(
                        f"Could not get stats for field {field_name}: {str(e)}"
                    )
                    stats[field_name] = {
                        "count": 0,
                        "weight": self.FIELD_WEIGHTS[field_name],
                    }

            return stats

        except Exception as e:
            logger.error(f"[FIELD_STATS] Error: {str(e)}")
            return {}
