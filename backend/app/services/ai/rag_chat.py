"""
RAG Chat Service - Low-level architecture
Handles RAG-based chat with conversation history and context retrieval
"""

import logging
from typing import Optional, List
from dataclasses import dataclass
from datetime import datetime

# Module-level logger
logger = logging.getLogger(__name__)


@dataclass
class ContextChunk:
    """
    Represents a single chunk retrieved from the vector database.

    Attributes:
    - id: Internal chunk identifier (not DB ID)
    - content_id: ID of the original saved content
    - text: Actual chunk text
    - score: Similarity score from vector search (0–1)
    - title: Optional title metadata
    - created_at: Optional timestamp when the content was saved
    """
    id: str
    content_id: str
    text: str
    score: float
    title: Optional[str] = None
    created_at: Optional[str] = None


@dataclass
class ChatMessage:
    """
    Represents a single message in chat history.

    role:
    - 'user' or 'assistant'
    content:
    - Raw text of the message
    """
    role: str
    content: str


class RagChatService:
    """
    Core service for Retrieval-Augmented Generation (RAG) chat.

    Responsibilities:
    - Generate embeddings for user queries
    - Retrieve relevant context from vector DB
    - Format retrieved context for LLM consumption
    - Maintain conversational memory (externally or via caller)
    """

    def __init__(self):
        # Use module logger
        self.logger = logger

        # System prompt injected into LLM calls
        # Controls tone, behavior, and how retrieved context is used
        self.SYSTEM_PROMPT = """You are a knowledgeable and friendly AI assistant having a natural conversation with a user.

Your role:
- Chat naturally like a human would
- Draw upon the user's personal saved content when relevant
- When you have context from user's saved content, reference it naturally in conversation
- Go beyond just the context - use your knowledge to expand on topics intelligently
- Be conversational, not robotic
- Remember what was discussed in the conversation

When you have saved content context:
- Weave it naturally into your response
- Reference it like "Based on what you saved about..." or "In your notes, you mentioned..."
- Use it as a foundation but expand with related knowledge and insights
- Never say "I can only answer from your saved content"

Tone: Friendly, informative, conversational, intelligent"""

        # Max length for embedding inputs (used elsewhere)
        self.MAX_EMBEDDING_LENGTH = 400

    def _build_context_string(self, chunks: List[ContextChunk]) -> str:
        """
        Converts retrieved context chunks into a single formatted string.

        This string is later injected into the LLM prompt.

        Features:
        - Includes relevance score as percentage
        - Includes saved timestamp if available
        - Separates chunks with visual delimiters
        """
        if not chunks:
            return ""

        context_parts = []

        for chunk in chunks:
            # Convert similarity score to percentage for readability
            relevance_percent = int(chunk.score * 100)

            # Attempt to infer creation timestamp
            created_at = None
            if hasattr(chunk, "created_at") and chunk.created_at:
                created_at = chunk.created_at
            elif chunk.title and "created_at" in (chunk.title or ""):
                created_at = chunk.title

            # Human-readable saved timestamp
            saved_str = ""
            if created_at:
                try:
                    # Normalize ISO timestamp
                    dt = datetime.fromisoformat(created_at.replace("Z", "+00:00"))
                    created_at_str = dt.strftime("%Y-%m-%d %H:%M UTC")
                except Exception:
                    # Fallback if parsing fails
                    created_at_str = created_at

                saved_str = f" [Saved: {created_at_str}]"

            # Final formatted context block
            context_part = (
                f"[From your saved content - {relevance_percent}% relevant]"
                f"{saved_str}\n{chunk.text}"
            )
            context_parts.append(context_part)

        # Separator between chunks
        return "\n\n---\n\n".join(context_parts)

    async def _fetch_context(
        self,
        user_id: str,
        query: str,
        content_id_filter: Optional[str] = None,
        limit: int = 5,
    ) -> List[ContextChunk]:
        """
        Retrieves relevant context chunks from Chroma vector DB.

        Flow:
        1. Generate embedding for user query
        2. Load user-specific Chroma collection
        3. Perform KNN semantic search
        4. Return processed ContextChunk objects

        Args:
        - user_id: Used for multi-tenant collection routing
        - query: Natural language user query
        - content_id_filter: Optional filter to restrict to one document
        - limit: Max number of chunks returned
        """
        try:
            print("  [FETCH_CONTEXT] Starting context retrieval...")

            # Step 1: Generate query embedding
            print("  → Generating query embedding using sentence-transformers...")
            self.logger.info("[RAG_CHAT] Generating query embedding...")
            query_embedding = await self._generate_embedding(query)

            print(f"    ✅ Embedding generated: {len(query_embedding)} dimensions")
            self.logger.info(
                f"[RAG_CHAT] ✅ Generated embedding ({len(query_embedding)} dimensions)"
            )

            # Step 2: Get Chroma collection for this user
            print("  → Connecting to Chroma Cloud...")
            from app.connections import get_user_collection

            collection = get_user_collection(user_id, "chunks")
            print(f"    ✅ Collection retrieved: user_{user_id}_chunks")
            self.logger.info(f"[RAG_CHAT] ✅ Got collection: user_{user_id}_chunks")

            # Step 3: Build semantic search query
            print("  → Building Knn search query...")
            from chromadb import Search, K, Knn

            search = (
                Search()
                .rank(Knn(query=query_embedding, return_rank=True, limit=300))
                .limit(limit)
                .select(K.DOCUMENT, K.SCORE, "content_id")
            )

            # Optional content-level filtering
            if content_id_filter:
                search.where(K("content_id").eq(content_id_filter))
                print(f"    ✅ Applied content_id filter: {content_id_filter}")
                self.logger.info(
                    f"[RAG_CHAT] Applied content_id filter: {content_id_filter}"
                )

            # Step 4: Execute search
            print("  → Executing semantic search in Chroma...")
            self.logger.info(
                "[RAG_CHAT] Executing semantic search in chunks database..."
            )
            search_results = await self._execute_search(collection, search)

            print(f"    ✅ Search complete: {len(search_results)} chunks retrieved")
            self.logger.info(
                f"[RAG_CHAT] ✅ Search completed, got {len(search_results)} chunks"
            )

            return search_results

        except Exception as e:
            # Centralized error logging
            print(f"    ❌ Error: {str(e)}")
            self.logger.error(
                f"[RAG_CHAT] Error in _fetch_context: {str(e)}", exc_info=True
            )
            raise

    async def _execute_search(self, collection, search):
        """
        Executes a Chroma search query and converts results into ContextChunk objects.

        Handles:
        - Multiple result formats (dict or object)
        - Metadata extraction
        - Defensive null checks
        """
        try:
            results = collection.search(search)
            chunks = []

            # Chroma returns rows grouped per query
            if results.rows and results.rows()[0]:
                rows = results.rows()[0]
                self.logger.info(f"[RAG_CHAT] Processing {len(rows)} search results...")

                for rank, row in enumerate(rows):
                    # Support both dict-based and object-based result formats
                    if isinstance(row, dict):
                        metadata = row.get("metadata") or {}
                        score = row.get("score") or 0
                        document_text = row.get("document") or ""
                    else:
                        metadata = getattr(row, "metadata", {}) or {}
                        score = getattr(row, "score", 0) or 0
                        document_text = getattr(row, "document", "") or ""

                    # Extract content ID
                    content_id = (
                        metadata.get("content_id", "")
                        if isinstance(metadata, dict)
                        else getattr(metadata, "content_id", "")
                    )

                    # Extract creation timestamp
                    created_at = None
                    if isinstance(metadata, dict):
                        created_at = (
                            metadata.get("created_at") or metadata.get("date") or None
                        )
                    else:
                        created_at = (
                            getattr(metadata, "created_at", None) if metadata else None
                        )

                    # Only add valid chunks
                    if content_id and document_text:
                        chunk = ContextChunk(
                            id=f"chunk_{rank}",
                            content_id=content_id,
                            text=document_text,
                            score=float(score),
                            title=(
                                metadata.get("title")
                                if isinstance(metadata, dict)
                                else None
                            ),
                            created_at=created_at,
                        )
                        chunks.append(chunk)

                        self.logger.info(
                            f"[RAG_CHAT] Result {rank + 1}: "
                            f"content_id={content_id}, score={score:.4f}, created_at={created_at}"
                        )

            return chunks

        except Exception as e:
            self.logger.error(
                f"[RAG_CHAT] Error in _execute_search: {str(e)}", exc_info=True
            )
            raise
