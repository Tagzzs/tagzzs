"""
Ollama AI Query Routes - Kai AI Behavior Replication

Provides REST API endpoints for querying content using Ollama with field-aware scoring,
semantic re-ranking, and tag consideration - matching Kai AI behavior exactly.

Endpoints:
- POST /ollama/query     - Field-aware semantic search with Ollama
- GET  /ollama/health    - Check Ollama service availability
"""

import logging
from typing import Optional
from fastapi import APIRouter
from pydantic import BaseModel

from app.clients import ChromaClient, EmbeddingClient
from app.clients.llm import LLMClient

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/ollama", tags=["ollama"])


class OllamaQueryRequest(BaseModel):
    """Request model for Ollama queries with conversation support."""

    query: str
    user_id: str
    top_k: int = 10
    session_id: Optional[str] = None


class OllamaHealthResponse(BaseModel):
    """Response model for health check."""

    status: str
    ollama_available: bool
    model: str
    message: str


@router.post("/query")
async def query_with_ollama(request: OllamaQueryRequest):
    """
    Query content using Ollama with field-aware embedding search (Kai AI behavior).

    Process:
    1. Generate embedding for query
    2. Multi-field comprehensive search
    3. Tag consideration and score boosting
    4. Response generation with context
    """
    try:
        logger.info(f"[OLLAMA_QUERY] User: {request.user_id}")
        logger.info(f"[OLLAMA_QUERY] Query: '{request.query[:50]}...'")
        logger.info(f"[OLLAMA_QUERY] top_k: {request.top_k}")

        # Initialize clients
        chroma_client = ChromaClient(request.user_id)
        embedding_client = EmbeddingClient()
        llm_client = LLMClient()

        # Generate query embedding
        query_embedding = await embedding_client.generate_embedding(request.query)
        if not query_embedding:
            return {
                "success": False,
                "error": "Failed to generate query embedding",
                "results": [],
                "answer": None,
            }

        # Perform comprehensive search
        search_results = chroma_client.comprehensive_search(
            query_embedding=query_embedding,
            query_text=request.query,
            top_k=request.top_k,
        )

        if not search_results:
            return {
                "success": True,
                "answer": "No relevant content found in your saved items.",
                "results": [],
                "model": llm_client.model_name,
                "status": "success",
                "chunk_count": 0,
            }

        # Format context for LLM
        context_chunks = []
        for result in search_results[:5]:  # Top 5 for context
            chunk_text = result.get("text", result.get("document", ""))
            metadata = result.get("metadata", {})
            field_type = metadata.get("field_type", "content")
            score = result.get("score", 0)

            context_chunks.append(
                {
                    "text": chunk_text,
                    "field_type": field_type,
                    "score": score,
                    "metadata": metadata,
                }
            )

        # Generate response
        answer = await llm_client.generate_contextual_response(
            query=request.query,
            context_chunks=context_chunks,
            session_id=request.session_id,
        )

        return {
            "success": True,
            "answer": answer,
            "results": search_results,
            "model": llm_client.model_name,
            "status": "success",
            "chunk_count": len(search_results),
        }

    except Exception as e:
        logger.error(f"[OLLAMA_QUERY] Error: {str(e)}", exc_info=True)
        return {"success": False, "error": str(e), "results": [], "answer": None}


@router.get("/health", response_model=OllamaHealthResponse)
async def check_ollama_health(user_id: Optional[str] = None):
    """
    Check Ollama service health and availability.
    """
    try:
        llm_client = LLMClient()
        is_available = await llm_client.check_availability()

        if is_available:
            return OllamaHealthResponse(
                status="healthy",
                ollama_available=True,
                model=llm_client.model_name,
                message="Ollama is running and model is available",
            )
        else:
            return OllamaHealthResponse(
                status="degraded",
                ollama_available=False,
                model=llm_client.model_name,
                message="Ollama service is not responding",
            )

    except Exception as e:
        logger.error(f"[OLLAMA_HEALTH] Error: {str(e)}")
        return OllamaHealthResponse(
            status="unhealthy",
            ollama_available=False,
            model="unknown",
            message=f"Health check failed: {str(e)}",
        )


@router.post("/session/create")
async def create_conversation_session(user_id: str, session_id: str):
    """
    Create a new conversation session for multi-turn chat.
    """
    try:
        # Session management will be implemented with conversation storage
        return {
            "session_id": session_id,
            "created": True,
            "message": "Session created successfully",
        }

    except Exception as e:
        logger.error(f"[SESSION_CREATE] Error: {str(e)}")
        return {
            "session_id": session_id,
            "created": False,
            "message": f"Failed to create session: {str(e)}",
        }


@router.get("/session/{session_id}/history")
async def get_conversation_history(session_id: str, max_messages: int = 10):
    """
    Retrieve conversation history for a session.
    """
    try:
        # Placeholder - will be implemented with conversation storage
        return {
            "session_id": session_id,
            "messages": [],
            "message_count": 0,
            "turns": 0,
        }

    except Exception as e:
        logger.error(f"[SESSION_HISTORY] Error: {str(e)}")
        return {
            "session_id": session_id,
            "messages": [],
            "message_count": 0,
            "error": str(e),
        }


@router.delete("/session/{session_id}")
async def clear_conversation_session(session_id: str):
    """
    Clear conversation history for a session.
    """
    try:
        return {
            "session_id": session_id,
            "cleared": True,
            "message": "Session history cleared",
        }

    except Exception as e:
        logger.error(f"[SESSION_CLEAR] Error: {str(e)}")
        return {
            "session_id": session_id,
            "cleared": False,
            "message": f"Failed to clear session: {str(e)}",
        }
