"""
Chat Routes-optimised
API endpoints for RAG-based chat operations
"""

import logging
from fastapi import APIRouter
from pydantic import BaseModel
from typing import Optional, List

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/ai-chat", tags=["chat"])


class ChatMessage(BaseModel):
    """Chat message in conversation history"""

    role: str  # 'user' or 'assistant'
    content: str


class RagChatRequest(BaseModel):
    """Request model for RAG chat"""

    user_id: str
    query: str
    fetch_context: bool = False
    conversation_history: Optional[List[ChatMessage]] = None
    content_id_filter: Optional[str] = None


class ContextChunkResponse(BaseModel):
    """Context chunk in response"""

    id: str
    content_id: str
    text: str
    score: float
    title: Optional[str] = None


class RagChatResponse(BaseModel):
    """Response model for RAG chat"""

    success: bool
    answer: Optional[str] = None
    context: Optional[str] = None
    chunks: Optional[List[ContextChunkResponse]] = None
    error: Optional[str] = None


@router.post("/with-rag", response_model=RagChatResponse)
async def rag_chat_endpoint(request: RagChatRequest) -> RagChatResponse:
    """
    RAG-based chat endpoint with conversation history persistence

    Integrates:
    1. Semantic search from chunks database
    2. Groq LLM for conversational responses
    3. Returns context chunks if fetch_context=true
    """
    try:
        logger.info(
            f"[CHAT_ENDPOINT] Received chat request from user: {request.user_id}"
        )
        logger.info(f"[CHAT_ENDPOINT] Query: '{request.query}'")
        logger.info(f"[CHAT_ENDPOINT] Fetch context: {request.fetch_context}")

        # Validate input
        if not request.user_id or not isinstance(request.user_id, str):
            logger.error("[CHAT_ENDPOINT] Invalid user_id")
            return RagChatResponse(
                success=False, error="user_id must be a non-empty string"
            )

        if not request.query or not isinstance(request.query, str):
            logger.error("[CHAT_ENDPOINT] Invalid query")
            return RagChatResponse(
                success=False, error="query must be a non-empty string"
            )

        # Prepare conversation history
        conversation_history = []
        if request.conversation_history:
            conversation_history = [
                {"role": msg.role, "content": msg.content}
                for msg in request.conversation_history
            ]

        # Import and use RAG chat service
        from app.services.ai.rag_chat import RagChatService

        service = RagChatService()

        # Execute RAG chat
        result = await service.chat(
            user_id=request.user_id,
            query=request.query,
            conversation_history=conversation_history,
            fetch_context=request.fetch_context,
            content_id_filter=request.content_id_filter,
        )

        if not result.get("success"):
            logger.error(f"[CHAT_ENDPOINT] Chat failed: {result.get('error')}")
            return RagChatResponse(
                success=False, error=result.get("error", "Chat failed")
            )

        logger.info("[CHAT_ENDPOINT] ✅ Chat completed successfully")

        # Build response
        response_data = {"success": True, "answer": result.get("answer")}

        if request.fetch_context:
            if "context" in result:
                response_data["context"] = result["context"]
            if "chunks" in result:
                response_data["chunks"] = result["chunks"]

        return RagChatResponse(**response_data)

    except Exception as e:
        logger.error(f"[CHAT_ENDPOINT] ❌ Unexpected error: {str(e)}", exc_info=True)
        return RagChatResponse(success=False, error=f"Chat failed: {str(e)}")
