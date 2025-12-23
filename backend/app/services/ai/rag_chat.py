"""
RAG Chat Service - Low-level architecture
Handles RAG-based chat with conversation history and context retrieval
"""

import logging
from typing import Optional, List
from dataclasses import dataclass
from datetime import datetime

logger = logging.getLogger(__name__)


@dataclass
class ContextChunk:
    """Context chunk retrieved from vector database"""

    id: str
    content_id: str
    text: str
    score: float
    title: Optional[str] = None
    created_at: Optional[str] = None  # new: ISO timestamp when content was saved


@dataclass
class ChatMessage:
    """Chat message in conversation history"""

    role: str  # 'user' or 'assistant'
    content: str


class RagChatService:
    """
    Service for RAG-based chat with conversation history

    Architecture:
    ...
    """

    def __init__(self):
        self.logger = logger
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

        self.MAX_EMBEDDING_LENGTH = 400  # Conservative limit for embedding model

    # ... other methods unchanged (chat, etc.) ...

    def _build_context_string(self, chunks: List[ContextChunk]) -> str:
        """
        Build context string from retrieved chunks

        Each context part now includes saved timestamp if available.
        """
        if not chunks:
            return ""

        context_parts = []
        for chunk in chunks:
            relevance_percent = int(chunk.score * 100)
            created_at = None
            if hasattr(chunk, "created_at") and chunk.created_at:
                created_at = chunk.created_at
            elif chunk.title and "created_at" in (chunk.title or ""):
                # defensive fallback
                created_at = chunk.title

            saved_str = ""
            if created_at:
                # try to create a readable timestamp
                try:
                    dt = datetime.fromisoformat(created_at.replace("Z", "+00:00"))
                    created_at_str = dt.strftime("%Y-%m-%d %H:%M UTC")
                except Exception:
                    created_at_str = created_at
                saved_str = f" [Saved: {created_at_str}]"

            context_part = f"[From your saved content - {relevance_percent}% relevant]{saved_str}\n{chunk.text}"
            context_parts.append(context_part)

        return "\n\n---\n\n".join(context_parts)

    async def _fetch_context(
        self,
        user_id: str,
        query: str,
        content_id_filter: Optional[str] = None,
        limit: int = 5,
    ) -> List[ContextChunk]:
        """
        Fetch relevant context chunks from Chroma

        Args:
            user_id: User ID for collection routing
            query: Search query
            content_id_filter: Optional content ID filter
            limit: Max chunks to retrieve

        Returns:
            List of ContextChunk objects
        """
        try:
            print("  [FETCH_CONTEXT] Starting context retrieval...")

            # Generate query embedding
            print("  → Generating query embedding using sentence-transformers...")
            self.logger.info("[RAG_CHAT] Generating query embedding...")
            query_embedding = await self._generate_embedding(query)
            print(f"    ✅ Embedding generated: {len(query_embedding)} dimensions")
            self.logger.info(
                f"[RAG_CHAT] ✅ Generated embedding ({len(query_embedding)} dimensions)"
            )

            # Get chunks collection from Chroma
            print("  → Connecting to Chroma Cloud...")
            from chroma_connection import get_user_collection

            collection = get_user_collection(user_id, "chunks")
            print(f"    ✅ Collection retrieved: user_{user_id}_chunks")
            self.logger.info(f"[RAG_CHAT] ✅ Got collection: user_{user_id}_chunks")

            # Build search query
            print("  → Building Knn search query...")
            from chromadb import Search, K, Knn

            search = (
                Search()
                .rank(Knn(query=query_embedding, return_rank=True, limit=300))
                .limit(limit)
                .select(K.DOCUMENT, K.SCORE, "content_id")
            )

            # Add content filter if provided
            if content_id_filter:
                search.where(K("content_id").eq(content_id_filter))
                print(f"    ✅ Applied content_id filter: {content_id_filter}")
                self.logger.info(
                    f"[RAG_CHAT] Applied content_id filter: {content_id_filter}"
                )

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
            print(f"    ❌ Error: {str(e)}")
            self.logger.error(
                f"[RAG_CHAT] Error in _fetch_context: {str(e)}", exc_info=True
            )
            raise

    async def _execute_search(self, collection, search):
        """
        Execute Chroma search and process results

        Args:
            collection: Chroma collection
            search: Search query object

        Returns:
            List of ContextChunk objects
        """
        try:
            results = collection.search(search)
            chunks = []

            if results.rows and results.rows()[0]:
                rows = results.rows()[0]
                self.logger.info(f"[RAG_CHAT] Processing {len(rows)} search results...")

                for rank, row in enumerate(rows):
                    # Handle both dict and object responses
                    if isinstance(row, dict):
                        metadata = row.get("metadata") or {}
                        score = row.get("score") or 0
                        document_text = row.get("document") or ""
                    else:
                        metadata = getattr(row, "metadata", {}) or {}
                        score = getattr(row, "score", 0) or 0
                        document_text = getattr(row, "document", "") or ""

                    content_id = (
                        metadata.get("content_id", "")
                        if isinstance(metadata, dict)
                        else getattr(metadata, "content_id", "")
                    )

                    # Attempt to pull created_at from metadata (if present)
                    created_at = None
                    if isinstance(metadata, dict):
                        created_at = (
                            metadata.get("created_at") or metadata.get("date") or None
                        )
                    else:
                        created_at = (
                            getattr(metadata, "created_at", None) if metadata else None
                        )

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

    # The rest of the file (chat method and others) remains unchanged.
