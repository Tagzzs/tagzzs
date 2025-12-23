"""
Ollama AI Service - Comprehensive Knowledge Base Retriever

Implements a sophisticated retrieval-augmented generation (RAG) system that:

1. RETRIEVAL PHASE:
   - Interprets user query and expands into search terms + semantic vectors
   - Retrieves candidates using vector similarity + keyword/metadata filters
   - Considers ALL fields: title, description, personal_notes, tags, date, embeddings, raw_content
   - Ranks by semantic similarity, exact matches, recency, and content relevance

2. WEIGHTING STRATEGY (description > title > personal_notes > tags):
   - Description (1.0): Curated structured information
   - Title (0.95): Direct, concise information
   - Personal Notes (0.90): User-added context and annotations
   - Tags (0.85): Explicit keywords and categorization
   - Vector Embeddings (0.4): High priority for semantic matching
   - Raw Data (0.70): Full content but less structured (fallback)
   - Chunks (0.60): Semantic segments (embeddings used for ranking)

3. RANKING CRITERIA:
   - Semantic similarity from embeddings (40% weight)
   - Exact/close matches in title, tags, description (60% weight)
   - Recency/date relevance when time-sensitive
   - Raw content and personal notes availability

4. ANSWER GENERATION:
   - Use only grounded information from retrieved documents
   - Synthesize evidence from multiple documents
   - Tailor response to user's specific question
   - Indicate uncertainty if context is weak

5. OUTPUT:
   - Concise, well-structured answer
   - No description of retrieval steps
   - Clarify ambiguous queries before answering
"""

import logging
import math
from typing import List, Dict, Optional, Any
import requests
from dataclasses import dataclass
from datetime import datetime

logger = logging.getLogger(__name__)


@dataclass
class SearchResult:
    """Search result with comprehensive field-aware scoring."""

    content: str
    metadata: Dict[str, Any]
    source_field: (
        str  # 'title', 'description', 'personal_notes', 'tags', 'raw_data', 'chunks'
    )
    relevance_score: (
        float  # Combined score: (field_weight × 0.6) + (vector_similarity × 0.4)
    )
    field_weight: float  # Weight based on field type (0.60 - 1.0)
    vector_similarity: float  # Embedding similarity (0 - 1)
    semantic_score: Optional[float] = None  # Entity/semantic match score
    combined_relevance: Optional[float] = None  # Final score after re-ranking
    tags: Optional[List[str]] = None  # Extracted tags
    date: Optional[str] = None  # Document date for recency scoring
    personal_notes: Optional[str] = None  # User annotations


class OllamaAIService:
    """
    Comprehensive RAG-based AI service using Ollama for knowledge base Q&A.

    Retrieval Pipeline:
    1. Parse query → expand to search terms + semantic vectors
    2. Search all fields (title, description, notes, tags, embeddings, raw_data)
    3. Filter by metadata (tags, date, content type)
    4. Rank by: semantic similarity (40%) + field relevance (60%)
    5. Apply recency boost if query is time-sensitive
    6. Return top-k most relevant documents

    Answer Generation:
    - Synthesize from retrieved documents only
    - Ground all claims in source material
    - Merge evidence from multiple sources
    - Indicate uncertainty if needed
    """

    # Field weights (Custom Priority: description > title > personal_notes > tags)
    FIELD_WEIGHTS = {
        "description": 1.0,  # Highest priority - curated structured information
        "title": 0.95,  # Second priority - direct, concise information
        "personal_notes": 0.90,  # Third priority - user-added context and annotations
        "tags": 0.85,  # Fourth priority - explicit categorization/keywords
        "summary": 0.80,  # Synthesized content
        "raw_data": 0.70,  # Full content but less structured
        "chunks": 0.60,  # Semantic segments (embeddings used for ranking)
    }

    # Vector embedding weight in relevance calculation (high priority)
    VECTOR_EMBEDDING_WEIGHT = 0.45  # Increased to 0.45 for better semantic accuracy
    FIELD_WEIGHT_FACTOR = 0.55  # Balanced weight distribution

    # Enhanced ranking parameters for accuracy improvements
    SEMANTIC_SIMILARITY_THRESHOLD = 0.25  # Minimum similarity threshold
    EXACT_MATCH_BOOST = 1.2  # Boost factor for exact keyword matches
    PARTIAL_MATCH_BOOST = 1.1  # Boost for partial matches
    SEMANTIC_RERANK_THRESHOLD = 0.6  # Re-rank if confidence > 60%

    def __init__(
        self,
        ollama_host: str = "http://localhost:11434",
        model_name: str = "llama3.1:8b",
        chroma_client=None,
        embedding_client=None,
        semantic_service=None,
    ):
        """
        Initialize Ollama AI Service with llama3.1:8b model and conversation history.

        Args:
            ollama_host: Ollama server URL (default: localhost:11434)
            model_name: Ollama model to use (default: llama3.1:8b)
            chroma_client: ChromaClient for embeddings search
            embedding_client: EmbeddingClient for query embeddings
            semantic_service: SemanticEnrichmentService for entity extraction
        """
        self.ollama_host = ollama_host.rstrip("/")
        self.model_name = model_name
        self.chroma_client = chroma_client
        self.embedding_client = embedding_client
        self.semantic_service = semantic_service

        # Conversation history storage: {session_id: [{'role': 'user'|'assistant', 'content': str}, ...]}
        self.conversation_history: Dict[str, List[Dict[str, str]]] = {}

        # Verify Ollama is available
        if not self._check_ollama_health():
            logger.warning(
                f"⚠️  Ollama not available at {self.ollama_host}. "
                "Falling back to pattern matching only."
            )
            self.available = False
        else:
            logger.info(f"✅ Connected to Ollama at {self.ollama_host}")
            self.available = True

            # Verify model is available
            if not self._check_model_available():
                logger.warning(
                    f"⚠️  Model '{self.model_name}' not found. Pull it with: "
                    f"ollama pull {self.model_name}"
                )
                self.available = False
            else:
                logger.info(f"✅ Model '{self.model_name}' available")

        logger.info(
            f"[OLLAMA] Using model: {self.model_name} with conversation history support"
        )

    def _check_ollama_health(self) -> bool:
        """Check if Ollama server is running and accessible."""
        try:
            response = requests.get(f"{self.ollama_host}/api/tags", timeout=2)
            return response.status_code == 200
        except Exception as e:
            logger.debug(f"Ollama health check failed: {e}")
            return False

    def _check_model_available(self) -> bool:
        """Check if the specified model is available in Ollama."""
        try:
            response = requests.get(f"{self.ollama_host}/api/tags", timeout=2)
            if response.status_code == 200:
                data = response.json()
                models = [
                    m.get("name", "").split(":")[0] for m in data.get("models", [])
                ]
                return self.model_name in models or any(
                    self.model_name in m for m in models
                )
            return False
        except Exception as e:
            logger.debug(f"Model check failed: {e}")
            return False

    # ============ CONVERSATION HISTORY MANAGEMENT ============

    def create_session(self, session_id: str) -> None:
        """
        Create a new conversation session.

        Args:
            session_id: Unique identifier for the conversation session
        """
        if session_id not in self.conversation_history:
            self.conversation_history[session_id] = []
            logger.info(f"[SESSION] Created new conversation session: {session_id}")

    def add_to_history(self, session_id: str, role: str, content: str) -> None:
        """
        Add a message to the conversation history.

        Args:
            session_id: Session identifier
            role: 'user' or 'assistant'
            content: Message content
        """
        if session_id not in self.conversation_history:
            self.create_session(session_id)

        self.conversation_history[session_id].append({"role": role, "content": content})
        logger.debug(f"[SESSION] Added {role} message to {session_id}")

    def get_session_history(
        self, session_id: str, max_messages: int = 10
    ) -> List[Dict[str, str]]:
        """
        Get conversation history for a session (limited to last max_messages).

        Args:
            session_id: Session identifier
            max_messages: Maximum number of messages to return

        Returns:
            List of conversation messages
        """
        if session_id not in self.conversation_history:
            return []

        history = self.conversation_history[session_id]
        return history[-max_messages:] if len(history) > max_messages else history

    def clear_session(self, session_id: str) -> None:
        """
        Clear conversation history for a session.

        Args:
            session_id: Session identifier
        """
        if session_id in self.conversation_history:
            self.conversation_history[session_id] = []
            logger.info(f"[SESSION] Cleared conversation history for {session_id}")

    def get_session_context(self, session_id: str) -> str:
        """
        Get formatted conversation context for Ollama system prompt.

        Args:
            session_id: Session identifier

        Returns:
            Formatted conversation context
        """
        history = self.get_session_history(session_id, max_messages=5)

        if not history:
            return "This is the beginning of a new conversation."

        context = "Conversation history:\n"
        for msg in history:
            context += f"\n{msg['role'].capitalize()}: {msg['content'][:200]}"  # First 200 chars

        return context

    def _expand_query(self, query: str) -> Dict[str, Any]:
        """
        Expand user query into search terms and semantic interpretation.

        Returns:
            {
                'original': original query,
                'keywords': [extracted keywords],
                'search_terms': [expanded search terms],
                'is_complex': bool (multi-part query),
                'is_time_sensitive': bool,
                'query_type': 'factual|definition|comparison|recent|how-to|other'
            }
        """
        import re

        query_lower = query.lower()

        # Extract keywords (non-stop words, length > 2)
        stop_words = {
            "the",
            "a",
            "an",
            "and",
            "or",
            "but",
            "in",
            "on",
            "at",
            "to",
            "for",
            "of",
            "is",
            "are",
            "was",
            "were",
            "be",
            "by",
            "with",
            "from",
            "as",
            "that",
            "this",
            "these",
            "those",
            "what",
            "which",
            "who",
            "when",
            "where",
            "why",
            "how",
        }
        words = re.findall(r"\b\w+\b", query_lower)
        keywords = [w for w in words if w not in stop_words and len(w) > 2]

        # Generate search term variations
        search_terms = keywords.copy()
        for kw in keywords[:3]:  # Expand top 3 keywords
            # Add singular/plural variations
            if kw.endswith("s") and len(kw) > 3:
                search_terms.append(kw[:-1])  # Remove 's' for singular

        # Detect query characteristics
        is_complex = (
            len(keywords) > 4 or " and " in query_lower or " or " in query_lower
        )
        is_time_sensitive = any(
            word in query_lower
            for word in [
                "recent",
                "latest",
                "new",
                "today",
                "yesterday",
                "this week",
                "this month",
                "when",
                "how old",
                "current",
            ]
        )

        # Classify query type
        query_type = "other"
        if any(word in query_lower for word in ["what", "who", "define", "what is"]):
            query_type = "definition"
        elif any(
            word in query_lower for word in ["how", "explain", "steps", "process"]
        ):
            query_type = "how-to"
        elif any(
            word in query_lower for word in ["compare", "vs", "versus", "difference"]
        ):
            query_type = "comparison"
        elif is_time_sensitive:
            query_type = "recent"
        else:
            query_type = "factual"

        return {
            "original": query,
            "keywords": keywords,
            "search_terms": list(set(search_terms)),  # Deduplicate
            "is_complex": is_complex,
            "is_time_sensitive": is_time_sensitive,
            "query_type": query_type,
        }

    def _calculate_recency_score(
        self, date_str: Optional[str], is_time_sensitive: bool = False
    ) -> float:
        """
        Calculate recency boost for time-sensitive queries.

        Returns: 0.0 - 1.0 boost factor
        - Recent (< 1 week): 1.0 boost
        - 1-4 weeks: 0.8 boost
        - 1-3 months: 0.6 boost
        - Older: 0.3 boost
        - No date: 0.4 (neutral)
        """
        if not is_time_sensitive:
            return 1.0  # No boost for non-time-sensitive queries

        if not date_str:
            return 0.4  # Unknown date gets moderate penalty

        try:
            doc_date = datetime.fromisoformat(date_str.replace("Z", "+00:00"))
            days_old = (datetime.now(doc_date.tzinfo) - doc_date).days

            if days_old < 7:
                return 1.0  # Very recent
            elif days_old < 30:
                return 0.8  # Recent
            elif days_old < 90:
                return 0.6  # Within 3 months
            else:
                return 0.3  # Older content
        except Exception:
            return 0.4  # Parse error - neutral

    def _calculate_exact_match_score(
        self, query_keywords: List[str], result_data: Dict[str, Any]
    ) -> float:
        """
        Calculate exact/partial match score across title, tags, and description.
        Enhanced with multi-field bonuses and boost factors.

        Returns: 0.0 - 1.0 score
        - Exact title match: 1.0 (boosted to 1.2)
        - Multiple keyword matches: 0.8
        - Tag matches: 0.7
        - Description matches: 0.6
        - No matches: 0.0
        """
        if not query_keywords:
            return 0.0

        scores = []
        multi_field_bonus = 0.0
        fields_matched = 0

        # Check title (highest weight)
        title = (result_data.get("metadata", {}).get("title", "") or "").lower()
        if title:
            matching_keywords = sum(1 for kw in query_keywords if kw in title)
            if matching_keywords == len(query_keywords) and len(query_keywords) > 0:
                # Exact match - apply boost
                scores.append(1.0 * self.EXACT_MATCH_BOOST)  # 1.2x boost
                fields_matched += 1
            elif matching_keywords > 0:
                scores.append(
                    0.9
                    * (matching_keywords / len(query_keywords))
                    * self.PARTIAL_MATCH_BOOST
                )
                fields_matched += 1

        # Check tags
        tags = result_data.get("metadata", {}).get("tags", []) or []
        if tags:
            tag_matches = sum(
                1 for tag in tags if any(kw in tag.lower() for kw in query_keywords)
            )
            if tag_matches > 0:
                scores.append(0.7 * (tag_matches / max(len(tags), 1)))
                fields_matched += 1

        # Check description
        description = (
            result_data.get("metadata", {}).get("description", "") or ""
        ).lower()
        if description:
            matching_keywords = sum(1 for kw in query_keywords if kw in description)
            if matching_keywords > 0:
                scores.append(0.6 * (matching_keywords / len(query_keywords)))
                fields_matched += 1

        # Multi-field match bonus (matches in multiple fields increases confidence)
        if fields_matched > 1:
            multi_field_bonus = 0.1 + (0.1 * (fields_matched - 1))  # Up to 0.3

        max_score = max(scores) if scores else 0.0
        return min(max_score + multi_field_bonus, 1.0)  # Cap at 1.0

    def _calculate_multi_factor_rank(
        self,
        result: Dict[str, Any],
        vector_similarity: float,
        query_keywords: List[str],
        is_time_sensitive: bool = False,
    ) -> float:
        """
        Calculate comprehensive ranking score combining multiple factors.

        Enhanced with better weighting and semantic filtering.

        Factors:
        1. Semantic similarity (embeddings): 45% weight
        2. Exact match scoring: 35% weight
        3. Recency bonus (if time-sensitive): 15% weight
        4. Content completeness: 5% weight

        Returns: 0.0 - 1.0 final ranking score
        """
        # Apply semantic similarity threshold to filter noise
        if vector_similarity < self.SEMANTIC_SIMILARITY_THRESHOLD:
            return 0.0

        # 1. Vector similarity (45% - increased for better semantic accuracy)
        semantic_factor = vector_similarity * 0.45

        # 2. Exact match score (35%)
        exact_match = self._calculate_exact_match_score(query_keywords, result)
        exact_match_factor = exact_match * 0.35

        # 3. Recency bonus (15%)
        date_str = result.get("metadata", {}).get("date")
        recency_score = self._calculate_recency_score(date_str, is_time_sensitive)
        recency_factor = recency_score * 0.15

        # 4. Content completeness (5% - reduced to prioritize semantic accuracy)
        # Check if content has personal notes (user-curated = higher quality)
        has_personal_notes = bool(result.get("metadata", {}).get("personal_notes"))
        completeness_score = 0.8 if has_personal_notes else 0.5
        completeness_factor = completeness_score * 0.05

        # Combined score
        final_score = (
            semantic_factor + exact_match_factor + recency_factor + completeness_factor
        )
        return min(final_score, 1.0)  # Cap at 1.0

    def _assess_confidence(
        self, results: List[Dict[str, Any]], query_expansion: Dict[str, Any]
    ) -> Dict[str, Any]:
        """
        Assess confidence in the retrieved context.

        Returns:
            {
                'confidence_level': 'high|medium|low',
                'has_exact_matches': bool,
                'has_recent_content': bool,
                'has_user_notes': bool,
                'avg_relevance': float,
                'coverage': float (0.0-1.0),
                'recommendation': 'direct_answer|synthesized|uncertain|ask_clarification'
            }
        """
        if not results:
            return {
                "confidence_level": "low",
                "has_exact_matches": False,
                "has_recent_content": False,
                "has_user_notes": False,
                "avg_relevance": 0.0,
                "coverage": 0.0,
                "recommendation": "ask_clarification",
            }

        # Calculate metrics
        relevances = [r.get("relevance_score", 0) for r in results]
        avg_relevance = sum(relevances) / len(relevances) if relevances else 0

        # Check for exact matches
        has_exact_matches = any(r.get("combined_relevance", 0) > 0.85 for r in results)

        # Check for recent content
        has_recent_content = any(
            self._calculate_recency_score(r.get("metadata", {}).get("date"), True) > 0.8
            for r in results
        )

        # Check for user notes
        has_user_notes = any(
            r.get("metadata", {}).get("personal_notes") for r in results
        )

        # Determine coverage (how well keywords are matched)
        keywords = query_expansion.get("keywords", [])
        if keywords:
            keyword_matches = set()
            for result in results:
                for kw in keywords:
                    if any(
                        kw in str(v).lower()
                        for v in result.get("metadata", {}).values()
                    ):
                        keyword_matches.add(kw)
            coverage = len(keyword_matches) / len(keywords)
        else:
            coverage = 1.0 if results else 0.0

        # Determine confidence level and recommendation
        if avg_relevance > 0.85 and has_exact_matches and coverage > 0.8:
            confidence_level = "high"
            recommendation = "direct_answer"
        elif avg_relevance > 0.70 and coverage > 0.6:
            confidence_level = "medium"
            recommendation = "synthesized"
        elif avg_relevance > 0.50:
            confidence_level = "low"
            recommendation = "uncertain"
        else:
            confidence_level = "low"
            recommendation = "ask_clarification"

        return {
            "confidence_level": confidence_level,
            "has_exact_matches": has_exact_matches,
            "has_recent_content": has_recent_content,
            "has_user_notes": has_user_notes,
            "avg_relevance": round(avg_relevance, 3),
            "coverage": round(coverage, 3),
            "recommendation": recommendation,
        }

    def search_relevant_content(
        self, query: str, user_id: str, top_k: int = 10
    ) -> List[Dict[str, Any]]:
        """
        Multi-field comprehensive search with multi-factor ranking.

        Implements knowledge base retrieval:
        1. Expand query to search terms and semantic interpretation
        2. Search across all fields (title, description, notes, tags, embeddings, raw_data)
        3. Rank by: semantic similarity (40%) + exact match (35%) + recency (15%) + completeness (10%)
        4. Apply priority-based filtering (metadata before raw data)
        5. Return top-k most relevant results with confidence assessment

        Args:
            query: User's search query
            user_id: User ID for scoped search
            top_k: Number of results to return

        Returns:
            List of ranked search results with multi-factor scoring
        """
        if not self.chroma_client or not self.embedding_client:
            logger.warning("Chroma or Embedding client not configured")
            return []

        try:
            # STEP 1: Expand query to extract keywords and determine characteristics
            query_expansion = self._expand_query(query)
            logger.info(
                f"[KB_SEARCH] Query type: {query_expansion['query_type']}, "
                f"keywords: {query_expansion['keywords']}, "
                f"time_sensitive: {query_expansion['is_time_sensitive']}"
            )
            # Generate embedding for query
            try:
                query_embedding = self.embedding_client.embed_text(query)
            except Exception as e:
                logger.error(f"Failed to generate query embedding: {e}")
                return []

            if not query_embedding:
                logger.warning("Failed to generate query embedding")
                return []

            logger.info(f"[KB_SEARCH] Starting multi-field search for: {query[:80]}...")

            # Search chunks collection (contains all fields with metadata)
            chunk_results = self.chroma_client.search_chunks(
                query_embedding=query_embedding,
                top_k=top_k * 2,  # Get more for filtering and ranking
            )

            if not chunk_results:
                logger.warning("No results from Chroma search")
                return []

            all_results = []

            # Process each chunk result with MULTI-FACTOR RANKING
            for chunk in chunk_results:
                # Handle data structure from ChromaClient
                # ChromaClient returns: {"content": str, "metadata": dict, "distance": float}
                metadata = chunk.get("metadata", {})
                document = chunk.get(
                    "content", chunk.get("document", chunk.get("text", ""))
                )
                distance = chunk.get("distance", 0.5)

                # Skip if no document content
                if not document:
                    logger.debug("Skipping result with empty content")
                    continue

                # Convert distance to similarity using exponential decay (more accurate than linear)
                # This provides better gradient for relevance scoring
                if distance is not None:
                    # Exponential decay: similarity = e^(-distance^2)
                    # This gives sharp distinction between similar items and dissimilar ones
                    vector_similarity = math.exp(-(distance**2))
                else:
                    vector_similarity = 0.8

                vector_similarity = min(max(vector_similarity, 0), 1)  # Clamp to 0-1

                # Calculate multi-factor ranking score
                chunk_dict = {
                    "document": document,
                    "metadata": metadata,
                    "vector_similarity": vector_similarity,
                }

                multi_factor_score = self._calculate_multi_factor_rank(
                    chunk_dict,
                    vector_similarity,
                    query_expansion["keywords"],
                    query_expansion["is_time_sensitive"],
                )

                # Determine source field for backward compatibility
                source_field = metadata.get("source_field", "raw_data")
                field_weight = self.FIELD_WEIGHTS.get(source_field, 0.6)

                # Extract tags
                tags = []
                tags_str = metadata.get("tags", "")
                if isinstance(tags_str, str) and tags_str:
                    tags = [t.strip() for t in tags_str.split(",") if t.strip()]
                elif isinstance(tags_str, list):
                    tags = tags_str

                # Create result with multi-factor scoring
                result = SearchResult(
                    content=document,
                    metadata=metadata,
                    source_field=source_field,
                    relevance_score=multi_factor_score,  # Now using multi-factor score
                    field_weight=field_weight,
                    vector_similarity=vector_similarity,
                    combined_relevance=multi_factor_score,  # Multi-factor is the combined score
                    tags=tags,
                    date=metadata.get("date"),
                )

                all_results.append(result)

            # Also search summaries collection if available
            try:
                summary_results = self.chroma_client.search_summaries(
                    query_embedding=query_embedding, top_k=top_k
                )

                if summary_results:
                    for chunk in summary_results:
                        # Handle data structure from ChromaClient
                        # ChromaClient returns: {"content": str, "metadata": dict, "distance": float}
                        metadata = chunk.get("metadata", {})
                        document = chunk.get(
                            "content", chunk.get("document", chunk.get("text", ""))
                        )
                        distance = chunk.get("distance", 0.5)

                        # Skip if no document content
                        if not document:
                            logger.debug("Skipping summary result with empty content")
                            continue

                        # Convert distance to similarity using exponential decay (improved accuracy)
                        if distance is not None:
                            vector_similarity = math.exp(-(distance**2))
                        else:
                            vector_similarity = 0.8

                        vector_similarity = min(max(vector_similarity, 0), 1)

                        chunk_dict = {
                            "document": document,
                            "metadata": metadata,
                            "vector_similarity": vector_similarity,
                        }

                        multi_factor_score = self._calculate_multi_factor_rank(
                            chunk_dict,
                            vector_similarity,
                            query_expansion["keywords"],
                            query_expansion["is_time_sensitive"],
                        )

                        source_field = "summary"
                        field_weight = self.FIELD_WEIGHTS.get("summary", 0.8)

                        tags = []
                        tags_str = metadata.get("tags", "")
                        if isinstance(tags_str, str) and tags_str:
                            tags = [t.strip() for t in tags_str.split(",") if t.strip()]
                        elif isinstance(tags_str, list):
                            tags = tags_str

                        result = SearchResult(
                            content=document,
                            metadata=metadata,
                            source_field=source_field,
                            relevance_score=multi_factor_score,
                            field_weight=field_weight,
                            vector_similarity=vector_similarity,
                            combined_relevance=multi_factor_score,
                            tags=tags,
                            date=metadata.get("date"),
                        )

                        all_results.append(result)
            except Exception as e:
                logger.debug(f"Summary search not available: {e}")

            # Remove duplicates by content_id
            seen_ids = set()
            deduplicated = []
            for result in all_results:
                content_id = result.metadata.get("content_id")
                if content_id:
                    if content_id not in seen_ids:
                        deduplicated.append(result)
                        seen_ids.add(content_id)
                else:
                    deduplicated.append(result)

            # Apply semantic re-ranking for complex queries (as before)
            if self.semantic_service and len(query.split()) > 5:
                deduplicated = self._apply_semantic_reranking(deduplicated, query)

            # Priority-based filtering: fetch from metadata fields BEFORE raw_data
            priority_fields = [
                "description",
                "title",
                "personal_notes",
                "tags",
                "summary",
            ]
            priority_results = []
            chunks_results = []
            raw_data_results = []

            for result in deduplicated:
                if result.source_field in priority_fields:
                    priority_results.append(result)
                elif result.source_field == "chunks":
                    chunks_results.append(result)
                elif result.source_field == "raw_data":
                    raw_data_results.append(result)

            # Sort all groups by their multi-factor relevance score
            priority_results.sort(
                key=lambda r: r.combined_relevance or r.relevance_score, reverse=True
            )
            chunks_results.sort(
                key=lambda r: r.combined_relevance or r.relevance_score, reverse=True
            )
            raw_data_results.sort(
                key=lambda r: r.combined_relevance or r.relevance_score, reverse=True
            )

            # Combine in priority order
            final_results = priority_results + chunks_results + raw_data_results
            final_results = final_results[:top_k]

            # CRITICAL: Apply minimum relevance threshold for personalized content-only mode
            # Only include results with sufficient relevance to the query
            MIN_RELEVANCE_THRESHOLD = 0.35  # Only results with >35% relevance are used
            filtered_results = [
                r
                for r in final_results
                if (r.combined_relevance or r.relevance_score)
                >= MIN_RELEVANCE_THRESHOLD
            ]

            if len(filtered_results) < len(final_results):
                filtered_out = len(final_results) - len(filtered_results)
                logger.info(
                    f"[KB_SEARCH] Filtered out {filtered_out} low-relevance results "
                    f"(below {MIN_RELEVANCE_THRESHOLD:.0%} threshold)"
                )

            # Assess confidence in retrieved context
            confidence = self._assess_confidence(filtered_results, query_expansion)

            logger.info(
                f"[KB_SEARCH] Retrieved {len(filtered_results)} high-relevance results, "
                f"confidence={confidence['confidence_level']}, "
                f"recommendation={confidence['recommendation']}"
            )

            # Convert to dict format for compatibility (use filtered_results)
            result_dicts = []
            for result in filtered_results:
                result_dict = {
                    "document": result.content,
                    "metadata": {
                        "source_field": result.source_field,
                        "relevance_score": result.combined_relevance
                        or result.relevance_score,
                        "field_weight": result.field_weight,
                        "vector_similarity": result.vector_similarity,
                        "semantic_score": result.semantic_score,
                        "tags": result.tags,
                        "confidence": confidence,
                        **result.metadata,
                    },
                }
                result_dicts.append(result_dict)

            return result_dicts

        except Exception as e:
            logger.error(f"Error in knowledge base search: {e}", exc_info=True)
            return []

    def _apply_semantic_reranking(
        self, results: List[SearchResult], query: str
    ) -> List[SearchResult]:
        """
        Apply semantic re-ranking like Kai AI does (matches agent_nodes.py logic).
        Enhanced with confidence threshold filtering.

        For complex queries, re-rank by semantic matching:
        - Synthetic/analytical: vector score × 0.3 + semantic × 0.7
        - Others: vector score × 0.5 + semantic × 0.5

        Args:
            results: List of search results to re-rank
            query: Original query for semantic analysis

        Returns:
            Results with updated combined_relevance scores
        """
        try:
            if not self.semantic_service:
                return results

            # Extract entities from query
            query_entities = self.semantic_service.extract_semantic_entities(query)

            for result in results:
                # Extract entities from content
                content_entities = self.semantic_service.extract_semantic_entities(
                    result.content
                )

                # Simple semantic score: how many query entities appear in content
                semantic_matches = 0
                if query_entities and content_entities:
                    # Count matching properties
                    for q_entity in query_entities:
                        for c_entity in content_entities:
                            if (
                                q_entity.get("name", "").lower()
                                == c_entity.get("name", "").lower()
                            ):
                                semantic_matches += 1

                # Calculate semantic score (0-1)
                max_matches = max(len(query_entities), 1)
                semantic_score = min(semantic_matches / max_matches, 1.0)
                result.semantic_score = semantic_score

                # Determine if query is complex
                is_complex = len(query.split()) > 10

                # Combine scores like Kai AI
                if is_complex:
                    combined = result.relevance_score * 0.3 + semantic_score * 0.7
                else:
                    combined = result.relevance_score * 0.5 + semantic_score * 0.5

                # Apply confidence threshold (only re-rank if confidence is sufficient)
                if combined >= self.SEMANTIC_RERANK_THRESHOLD:
                    result.combined_relevance = combined
                else:
                    # Fall back to original relevance score if confidence is low
                    result.combined_relevance = result.relevance_score

            return results

        except Exception as e:
            logger.debug(f"Semantic re-ranking failed: {e}")
            # If semantic re-ranking fails, use original scores
            for result in results:
                result.combined_relevance = result.relevance_score
            return results

    def generate_response_with_context(
        self,
        query: str,
        context_content: List[Dict[str, Any]],
        session_id: Optional[str] = None,
    ) -> str:
        """
        Generate intelligent response using Ollama with field-aware context and conversation history.

        IMPORTANT: Responses are STRICTLY LIMITED to saved database content only.
        If no relevant content is found, the system will NOT use LLM base knowledge.

        Supports multi-turn conversations with llama3.1:8b model.

        Matches Kai AI behavior:
        1. Organize retrieved content by field type (title, description, tags, notes, raw_data)
        2. Build context with field awareness and relevance scores
        3. Extract semantic entities for relationship understanding
        4. Include conversation history if available
        5. Determine response complexity from query
        6. Generate response with Ollama using field-aware system prompt
        7. ENFORCE: Only answer if content found in database

        Args:
            query: User's original query
            context_content: Retrieved content chunks with metadata
            session_id: Optional session ID to include conversation history

        Returns:
            Generated response from Ollama (ONLY from provided content)
        """
        # CRITICAL: If no content found, refuse to answer
        if not context_content:
            logger.warning(
                f"[CONTENT_ONLY] No relevant content found for query: {query[:80]}"
            )
            response = f"I couldn't find any relevant information about '{query}' in your saved content. Please ensure you have saved relevant notes, documents, or content on this topic."
            # Store in conversation history
            if session_id:
                self.add_to_history(session_id, "assistant", response)
            return response

        if not self.available:
            return self._generate_fallback_response(query, context_content)

        try:
            # Organize content by field type (matches ResponseGeneration node)
            field_grouped = self._organize_by_field(context_content)

            # Build context with field awareness
            context_parts = []
            field_order = [
                "title",
                "description",
                "tags",
                "personal_notes",
                "raw_data",
                "chunks",
            ]

            for field in field_order:
                if field in field_grouped and field_grouped[field]:
                    context_parts.append(f"\n**{self._format_field_name(field)}:**")
                    for idx, item in enumerate(field_grouped[field][:3], 1):
                        content = item.get("content", item.get("document", ""))[:400]
                        metadata = item.get("metadata", {})
                        relevance = metadata.get("relevance_score", 0)
                        tags = metadata.get("tags", [])

                        # Include tags if available
                        tags_str = f" [Tags: {', '.join(tags)}]" if tags else ""
                        context_parts.append(
                            f"{idx}. [Relevance: {relevance:.0%}] {content}{tags_str}"
                        )

            content_context = "\n".join(context_parts)

            # Get conversation history context if session provided
            conversation_context = ""
            if session_id:
                session_context = self.get_session_context(session_id)
                conversation_context = f"\nCONVERSATION CONTEXT:\n{session_context}\n"

            # Extract semantic entities for complex understanding
            semantic_context = ""
            if self.semantic_service:
                try:
                    content_text = "\n".join(
                        [
                            c.get("content", c.get("document", ""))
                            for c in context_content[:5]
                        ]
                    )

                    query_entities = self.semantic_service.extract_semantic_entities(
                        query
                    )
                    content_entities = self.semantic_service.extract_semantic_entities(
                        content_text
                    )

                    if query_entities or content_entities:
                        semantic_context = f"\nSEMANTIC CONTEXT:\nQuery Entities: {query_entities}\nContent Entities: {content_entities}\n"
                except Exception as e:
                    logger.debug(f"Semantic extraction failed: {e}")

            # Determine answer complexity
            query_length = len(query.split())
            is_complex = query_length > 10

            # Build prompt with field awareness (matches Kai AI's ResponseGeneration)
            # CRITICAL: Instructions emphasize ONLY using provided content
            if is_complex:
                prompt = f"""You are Kai, a personal knowledge assistant that ONLY answers based on the user's saved content.

CRITICAL INSTRUCTIONS - FOLLOW STRICTLY:
1. You MUST ONLY use information from the provided content context below
2. Do NOT use your base knowledge or training data
3. If the provided content does not contain information to answer the query, respond with: "I don't have this information in your saved content"
4. Always cite which source field you're referencing (Title, Description, Tags, Notes, Content)
5. If information is not explicitly or clearly in the provided content, you must NOT infer or hallucinate
6. Be honest about content limitations

{conversation_context}{semantic_context}

USER'S SAVED CONTENT (organized by field type):
{content_context}

User Query: {query}

RESPONSE GUIDELINES:
- Use ONLY information from the provided content above
- If content is insufficient, say so clearly
- Provide thorough analysis using ALL relevant sources
- Cite source types when referencing information
- Highlight connections between different saved items
- If needed, quote directly from saved content

Generate a comprehensive answer using ONLY the provided saved content."""
            else:
                prompt = f"""You are Kai, a personal knowledge assistant that ONLY answers based on the user's saved content.

CRITICAL INSTRUCTIONS - FOLLOW STRICTLY:
1. You MUST ONLY use information from the provided content context below
2. Do NOT use your base knowledge or training data
3. If the provided content does not contain information to answer the query, respond with: "I don't have this information in your saved content"
4. Always cite which source field you're referencing (Title, Description, Tags, Notes, Content)
5. If information is not explicitly in the provided content, you MUST NOT infer or make assumptions
6. Be honest and direct

{conversation_context}{semantic_context}

USER'S SAVED CONTENT (organized by field type):
{content_context}

User Query: {query}

RESPONSE GUIDELINES:
- Answer directly based on provided saved content
- If content is missing, say so clearly
- Keep response concise and relevant
- Cite your source type (Title/Description/Tags/Notes/Content)
- When appropriate, quote directly from saved content

Generate a concise answer using ONLY the provided saved content."""

            logger.info(
                f"[OLLAMA_RESPONSE] Generating personalized response (complex={is_complex}, content_sources={len(context_content)}) with session: {session_id}"
            )

            response = self._call_ollama(prompt)

            return response

        except Exception as e:
            logger.error(f"Error generating response: {e}", exc_info=True)
            return self._generate_fallback_response(query, context_content)

    def _organize_by_field(self, chunks: List[Dict[str, Any]]) -> Dict[str, list]:
        """
        Organize chunks by their source field (matches Kai AI's _organize_by_field).

        Args:
            chunks: List of retrieved chunks with metadata

        Returns:
            Dictionary with field names as keys and lists of chunks as values
        """
        field_grouped = {}

        for chunk in chunks:
            metadata = chunk.get("metadata", {})
            source_field = metadata.get("source_field", "raw_data")

            if source_field not in field_grouped:
                field_grouped[source_field] = []

            field_grouped[source_field].append(chunk)

        return field_grouped

    def _format_field_name(self, field: str) -> str:
        """Format field name for display."""
        name_map = {
            "title": "Title",
            "tags": "Tags",
            "description": "Description",
            "personal_notes": "Personal Notes",
            "raw_data": "Raw Data",
            "chunks": "Content Chunks",
            "summary": "Summary",
        }
        return name_map.get(field, field.replace("_", " ").title())

    def _call_ollama(self, prompt: str) -> str:
        """Call Ollama API and get response."""
        try:
            response = requests.post(
                f"{self.ollama_host}/api/generate",
                json={
                    "model": self.model_name,
                    "prompt": prompt,
                    "stream": False,
                    "temperature": 0.7,
                    "num_ctx": 32768,  # Extended context window for processing large saved content (no token limits)
                },
                timeout=300,  # Extended timeout to handle large context processing
            )

            if response.status_code == 200:
                data = response.json()
                return data.get("response", "").strip()
            else:
                logger.error(f"Ollama API error: {response.status_code}")
                return ""

        except requests.Timeout:
            logger.error("Ollama request timeout")
            return ""
        except Exception as e:
            logger.error(f"Error calling Ollama: {e}")
            return ""

    def _generate_fallback_response(
        self, query: str, context_content: List[Dict[str, Any]]
    ) -> str:
        """
        Fallback response when Ollama is unavailable or no content found.
        CRITICAL: Ensures responses are ONLY from saved content.
        """
        if not context_content:
            return f"I don't have information about '{query}' in your saved content. Please save relevant notes or documents on this topic to get personalized answers."

        # Simple keyword matching fallback from saved content
        response_parts = ["Based on your saved content:\n"]

        for i, chunk in enumerate(context_content[:3], 1):
            # Handle both 'content' (from ChromaClient) and 'document' keys
            text = chunk.get("content", chunk.get("document", chunk.get("text", "")))[
                :200
            ]
            metadata = chunk.get("metadata", {})
            source_field = metadata.get("source_field", "Unknown")
            tags = metadata.get("tags", [])
            tags_str = f" (Tags: {', '.join(tags[:2])})" if tags else ""
            response_parts.append(
                f"{i}. From {source_field}{tags_str}:\n   {text}...\n"
            )

        return "".join(response_parts)

    def answer_query(
        self,
        query: str,
        user_id: str,
        top_k: int = 10,
        session_id: Optional[str] = None,
    ) -> Dict[str, Any]:
        """
        Complete pipeline with conversation history: search → generate response.

        Supports multi-turn conversations within a session.

        Args:
            query: User's question
            user_id: User ID for scoped search
            top_k: Number of content chunks to retrieve
            session_id: Optional session ID for conversation history

        Returns:
            Dictionary with response, sources, relevance scores, and metadata
        """
        # Use user_id as session_id if not provided
        session_id = session_id or user_id

        # Create or retrieve session
        self.create_session(session_id)

        # Multi-field search with field-aware scoring
        content_chunks = self.search_relevant_content(query, user_id, top_k)

        # Generate response with conversation history context
        response = self.generate_response_with_context(
            query=query, context_content=content_chunks, session_id=session_id
        )

        # Add to conversation history
        self.add_to_history(session_id, "user", query)
        self.add_to_history(session_id, "assistant", response)

        # Build sources summary with field type and tags
        sources_summary = self._get_sources_summary(content_chunks[:3])

        # Add sources to response
        if sources_summary:
            response += f"\n\n**📚 Sources Used:** {sources_summary}"

        # Build result matching Kai AI output structure
        return {
            "query": query,
            "response": response,
            "sources": [
                {
                    "text": chunk.get("document", chunk.get("content", ""))[:300],
                    "field": chunk.get("metadata", {}).get("source_field", "raw_data"),
                    "relevance": chunk.get("metadata", {}).get("relevance_score", 0.5),
                    "tags": chunk.get("metadata", {}).get("tags", []),
                    "metadata": chunk.get("metadata", {}),
                }
                for chunk in content_chunks[:5]
            ],
            "model": self.model_name,
            "status": "success" if response else "no_response",
            "chunk_count": len(content_chunks),
            "session_id": session_id,
            "conversation_turns": len(self.conversation_history[session_id]) // 2,
        }

    def _get_sources_summary(self, content_chunks: List[Dict[str, Any]]) -> str:
        """
        Build sources summary with field type and tags.

        Args:
            content_chunks: List of source chunks

        Returns:
            Formatted sources summary string
        """
        if not content_chunks:
            return ""

        sources_info = []
        for chunk in content_chunks:
            metadata = chunk.get("metadata", {})
            source_field = metadata.get("source_field", "Unknown")
            tags = metadata.get("tags", [])

            tag_str = f" (Tags: {', '.join(tags[:3])})" if tags else ""
            sources_info.append(f"{source_field}{tag_str}")

        return " • ".join(sources_info)


# Global instance
_ollama_service = None


def get_ollama_service(
    ollama_host: str = "http://localhost:11434",
    model_name: str = "llama2",
    chroma_client=None,
    embedding_client=None,
    semantic_service=None,
) -> OllamaAIService:
    """
    Get or create global Ollama AI service instance with semantic enrichment.

    Args:
        ollama_host: Ollama server URL
        model_name: Model to use
        chroma_client: Chroma client for embeddings
        embedding_client: Embedding client for query embeddings
        semantic_service: SemanticEnrichmentService for entity extraction

    Returns:
        OllamaAIService instance
    """
    global _ollama_service
    if _ollama_service is None:
        _ollama_service = OllamaAIService(
            ollama_host=ollama_host,
            model_name=model_name,
            chroma_client=chroma_client,
            embedding_client=embedding_client,
            semantic_service=semantic_service,
        )
    return _ollama_service


def reset_ollama_service():
    """Reset the global service instance."""
    global _ollama_service
    _ollama_service = None
