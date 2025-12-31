"""
Agent Routes - AI Agent Query and Chat Endpoints

Provides FastAPI endpoints for:
- POST /ai-agent/query    - Execute agent for a single query
- POST /ai-agent/chat     - Multi-turn conversation with context
- GET  /ai-agent/health   - Health check and service stats
- GET  /ai-agent/tasks    - List available task types
"""

import logging
import time
from typing import Optional, List, Dict, Any
from datetime import datetime
from pydantic import BaseModel, Field
from fastapi import APIRouter, HTTPException, status, Header

from app.services.ai.react_agent import ReActAgent

logger = logging.getLogger(__name__)

# Router instance
router = APIRouter(prefix="/ai-agent", tags=["ai-agent"])

# ============================================================================
# AUTHENTICATION HELPER
# ============================================================================


def validate_user_authentication(
    x_user_id: Optional[str], request_user_id: Optional[str]
) -> str:
    """
    Validate and extract user_id from authentication sources.

    Priority order:
    1. X-User-ID header (preferred)
    2. user_id in request body (fallback)
    3. Raise error if neither provided
    """
    user_id = x_user_id or request_user_id

    if not user_id or user_id == "guest":
        logger.warning("🔴 [AUTH] Authentication failed: No valid user_id provided")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication required: Please provide X-User-ID header or user_id in request body",
        )

    logger.info(f"✅ [AUTH] User authenticated: {user_id}")
    return user_id


# ============================================================================
# REQUEST/RESPONSE MODELS
# ============================================================================


class AgentQueryRequest(BaseModel):
    """Request model for agent query endpoint"""

    query: str = Field(
        ..., description="User query to process", min_length=1, max_length=5000
    )
    conversation_history: Optional[List[Dict[str, str]]] = Field(
        default=None, description="Optional conversation history for context"
    )

    user_id: Optional[str] = Field(
        default="guest", description="User ID for tracking and personalization"
    )

    class Config:
        json_schema_extra = {
            "example": {
                "query": "What is the latest on AI?",
                "user_id": "user123",
                "conversation_history": [],
            }
        }


class AgentQueryResponse(BaseModel):
    """Response model for agent query endpoint"""

    success: bool = Field(..., description="Whether query was successful")
    query: str = Field(..., description="Original user query")
    answer: Optional[str] = Field(
        default=None, description="Generated answer or response"
    )
    status: str = Field(
        default="completed", description="Status: completed, needs_permission, error"
    )

    sources_used: List[Dict[str, str]] = Field(
        default_factory=list, description="Sources used in response"
    )
    referenced_content: List[Dict[str, Any]] = Field(
        default_factory=list,
        description="Content items referenced (for clickable UI boxes)",
    )
    execution_time_ms: int = Field(
        ..., description="Total execution time in milliseconds"
    )
    execution_steps: List[Dict[str, Any]] = Field(
        default_factory=list, description="Detailed execution trace"
    )
    error: Optional[str] = Field(default=None, description="Error message if failed")

    class Config:
        json_schema_extra = {
            "example": {
                "success": True,
                "query": "What is Python?",
                "answer": "Python is a high-level programming language...",
                "status": "completed",
                "sources_used": [{"type": "web_search", "query": "Python"}],
                "execution_time_ms": 1250,
                "execution_steps": [
                    {"step": 1, "action": "web_search", "input": "Python"},
                    {"step": 2, "action": "final_answer", "input": "Python is..."},
                ],
            }
        }


class AgentChatRequest(BaseModel):
    """Request model for multi-turn conversation"""

    message: str = Field(
        ...,
        description="Current message in conversation",
        min_length=1,
        max_length=5000,
    )
    conversation_id: str = Field(
        ..., description="Conversation ID for tracking context"
    )
    conversation_history: Optional[List[Dict[str, str]]] = Field(
        default=None, description="Previous messages for context"
    )
    user_id: Optional[str] = Field(default="guest", description="User ID")


class AgentChatResponse(BaseModel):
    """Response model for multi-turn chat"""

    success: bool = Field(..., description="Whether request was successful")
    conversation_id: str = Field(..., description="Conversation ID")
    message: str = Field(..., description="Assistant response")
    status: str = Field(
        default="completed", description="Status: completed, needs_permission, error"
    )
    sources_used: List[Dict[str, str]] = Field(
        default_factory=list, description="Sources used"
    )
    execution_time_ms: int = Field(..., description="Execution time in milliseconds")
    error: Optional[str] = Field(default=None, description="Error message if failed")


class HealthResponse(BaseModel):
    """Response model for health check"""

    status: str = Field(
        ..., description="Service status: 'healthy', 'degraded', 'unhealthy'"
    )
    timestamp: datetime = Field(default_factory=datetime.utcnow)
    agent_model: str = Field(..., description="LLM model used by agent")
    active_services: Dict[str, bool] = Field(..., description="Status of each service")


class TaskInfo(BaseModel):
    """Model for task type information"""

    name: str = Field(..., description="Tool name")
    description: str = Field(..., description="Tool description")


class TaskListResponse(BaseModel):
    """Response model for listing available tools"""

    available_tools: int = Field(..., description="Number of available tools")
    tools: List[TaskInfo] = Field(..., description="List of available tools")


# ============================================================================
# ENDPOINTS
# ============================================================================


@router.post(
    "/query",
    response_model=AgentQueryResponse,
    status_code=status.HTTP_200_OK,
    summary="Execute Agent Query",
    description="Submit a query to the async ReAct AI agent for processing.",
)
async def query_agent(
    request: AgentQueryRequest, x_user_id: Optional[str] = Header(None)
) -> AgentQueryResponse:
    """
    Execute a single query through the async ReAct agent.

    Features:
    - Async web search via DuckDuckGo
    - Knowledge base search via ChromaDB
    - 5-step reasoning loop with automatic termination
    """
    start_time = time.time()

    try:
        user_id = validate_user_authentication(x_user_id, request.user_id)

        logger.info(f"🟡 [QUERY_AGENT] Starting ReAct agent for user: {user_id}")
        logger.info(f"� [QUERY_AGENT] Query: {request.query[:100]}...")

        # Create and run the ReAct agent
        agent = ReActAgent(user_id)
        response = await agent.run(
            user_query=request.query,
            conversation_history=request.conversation_history or [],
        )

        execution_time = int((time.time() - start_time) * 1000)
        logger.info(f"✅ [QUERY_AGENT] Agent completed with status: {response.status}")

        # Format execution steps for frontend compatibility
        # Frontend expects: [{step_name: "...", status: "completed"}, ...]
        execution_trace = agent.get_execution_trace()
        formatted_steps = [
            {
                "step_name": step.get("action", "unknown"),
                "status": "completed",
                "step": step.get("step", idx + 1),
            }
            for idx, step in enumerate(execution_trace)
        ]

        return AgentQueryResponse(
            success=response.status == "completed",
            query=request.query,
            answer=response.response_text,
            status=response.status,
            sources_used=response.sources,
            referenced_content=response.referenced_content,
            execution_time_ms=execution_time,
            execution_steps=formatted_steps,
            error=None if response.status == "completed" else response.response_text,
        )

    except ValueError as ve:
        execution_time = int((time.time() - start_time) * 1000)
        logger.error(f"🔴 [QUERY_AGENT] Validation error: {str(ve)}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid request: {str(ve)}",
        )
    except Exception as e:
        execution_time = int((time.time() - start_time) * 1000)
        logger.error(f"🔴 [QUERY_AGENT] Unexpected error: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Internal server error: {str(e)}",
        )


@router.post(
    "/chat",
    response_model=AgentChatResponse,
    status_code=status.HTTP_200_OK,
    summary="Multi-Turn Conversation",
    description="Engage in multi-turn conversation with the async ReAct AI agent.",
)
async def chat_with_agent(
    request: AgentChatRequest, x_user_id: Optional[str] = Header(None)
) -> AgentChatResponse:
    """
    Engage in a multi-turn conversation with the async ReAct agent.

    Features:
    - Async web search via DuckDuckGo
    - Knowledge base search via ChromaDB
    - Conversation history support
    - 5-step reasoning loop
    """
    start_time = time.time()

    try:
        user_id = validate_user_authentication(x_user_id, request.user_id)

        logger.info(
            f"🟡 [CHAT_AGENT] Chat message from user {user_id} in conv {request.conversation_id}"
        )

        # Create and run the ReAct agent
        agent = ReActAgent(user_id)
        response = await agent.run(
            user_query=request.message,
            conversation_history=request.conversation_history or [],
        )

        execution_time = int((time.time() - start_time) * 1000)

        if response.status != "completed":
            logger.warning(f"Chat processing issue: {response.status}")
            return AgentChatResponse(
                success=False,
                conversation_id=request.conversation_id,
                message=response.response_text,
                status=response.status,
                sources_used=response.sources,
                execution_time_ms=execution_time,
                error=response.response_text,
            )

        logger.info(f"✅ [CHAT_AGENT] Chat processed successfully")

        return AgentChatResponse(
            success=True,
            conversation_id=request.conversation_id,
            message=response.response_text,
            status=response.status,
            sources_used=response.sources,
            execution_time_ms=execution_time,
        )

    except ValueError as ve:
        execution_time = int((time.time() - start_time) * 1000)
        logger.error(f"Validation error: {str(ve)}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid request: {str(ve)}",
        )
    except Exception as e:
        execution_time = int((time.time() - start_time) * 1000)
        logger.error(f"Unexpected error in chat endpoint: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Internal server error: {str(e)}",
        )


@router.get(
    "/health",
    response_model=HealthResponse,
    status_code=status.HTTP_200_OK,
    summary="Health Check",
    description="Check AI agent service health.",
)
async def health_check() -> HealthResponse:
    """Get health status of the AI agent service."""
    try:
        return HealthResponse(
            status="healthy",
            timestamp=datetime.utcnow(),
            agent_model=ReActAgent.MODEL,
            active_services={
                "groq": True,
                "duckduckgo": True,
                "chroma": True,
            },
        )

    except Exception as e:
        logger.error(f"Health check failed: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Health check failed",
        )


@router.get(
    "/tasks",
    response_model=TaskListResponse,
    status_code=status.HTTP_200_OK,
    summary="List Available Tools",
    description="Get list of available tools the agent can use.",
)
async def list_tasks() -> TaskListResponse:
    """List all available tools that the ReAct agent can use."""
    try:
        from app.services.ai.tools import Tools

        tools = [
            TaskInfo(
                name="web_search",
                description="Search the web using DuckDuckGo for real-time information",
            ),
            TaskInfo(
                name="search_knowledge_base",
                description="Search the user's saved content in ChromaDB",
            ),
            TaskInfo(
                name="ask_user_permission",
                description="Request permission from user for sensitive actions",
            ),
        ]

        return TaskListResponse(available_tools=len(tools), tools=tools)

    except Exception as e:
        logger.error(f"Failed to list tools: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve tool list",
        )
