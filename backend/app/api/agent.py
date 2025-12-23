"""
Agent Routes - AI Agent Query and Chat Endpoints

Provides FastAPI endpoints for:
- POST /ai-agent/query    - Execute agent for a single query
- POST /ai-agent/chat     - Multi-turn conversation with context
- GET  /ai-agent/health   - Health check and service stats
- GET  /ai-agent/tasks    - List available task types
"""

import logging
from typing import Optional, List, Dict, Any
from datetime import datetime
from pydantic import BaseModel, Field
from fastapi import APIRouter, HTTPException, status, Header

from app.agents.agentic_service import AgenticAIService

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
    content_id_filter: Optional[str] = Field(
        default=None,
        description="Optional filter to limit search to specific content_id",
    )
    task_type: Optional[str] = Field(
        default=None,
        description="Optional task type filter to constrain agent behavior",
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
                "content_id_filter": None,
                "task_type": "SEARCH",
            }
        }


class ExecutionStep(BaseModel):
    """Model for a single execution step"""

    step_name: str = Field(..., description="Name of the execution step")
    status: str = Field(
        ..., description="Status: completed, failed, skipped, in_progress"
    )
    timestamp: Optional[datetime] = Field(None, description="When step executed")


class AgentQueryResponse(BaseModel):
    """Response model for agent query endpoint"""

    success: bool = Field(..., description="Whether query was successful")
    task_type: Optional[str] = Field(default=None, description="Classified task type")
    task_confidence: Optional[float] = Field(
        default=None, description="Confidence in task classification (0-1)"
    )
    query: str = Field(..., description="Original user query")
    answer: Optional[str] = Field(
        default=None, description="Generated answer or response"
    )
    sources_used: Optional[List[Dict[str, Any]]] = Field(
        default=None, description="Sources used in response"
    )
    confidence_score: Optional[float] = Field(
        default=None, description="Confidence in answer quality (0-1)"
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
                "task_type": "SEARCH",
                "task_confidence": 0.85,
                "query": "What is Python?",
                "answer": "Python is a high-level programming language...",
                "confidence_score": 0.72,
                "execution_time_ms": 1250,
                "execution_steps": [
                    {"step_name": "TaskRouter", "status": "completed"},
                    {"step_name": "ContentRetrieval", "status": "completed"},
                    {"step_name": "ResponseGeneration", "status": "completed"},
                    {"step_name": "Validation", "status": "completed"},
                ],
                "sources_used": [],
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
    user_id: Optional[str] = Field(default="guest", description="User ID")
    content_id_filter: Optional[str] = Field(
        None, description="Optional content filter"
    )


class ChatMessage(BaseModel):
    """Model for a chat message"""

    role: str = Field(..., description="Role: 'user' or 'assistant'")
    content: str = Field(..., description="Message content")
    timestamp: datetime = Field(default_factory=datetime.utcnow)


class AgentChatResponse(BaseModel):
    """Response model for multi-turn chat"""

    success: bool = Field(..., description="Whether request was successful")
    conversation_id: str = Field(..., description="Conversation ID")
    message: str = Field(..., description="Assistant response")
    task_type: Optional[str] = Field(default=None, description="Classified task type")
    confidence_score: Optional[float] = Field(
        default=None, description="Answer confidence (0-1)"
    )
    execution_time_ms: int = Field(..., description="Execution time in milliseconds")
    error: Optional[str] = Field(default=None, description="Error message if failed")


class HealthResponse(BaseModel):
    """Response model for health check"""

    status: str = Field(
        ..., description="Service status: 'healthy', 'degraded', 'unhealthy'"
    )
    timestamp: datetime = Field(default_factory=datetime.utcnow)
    available_tasks: int = Field(..., description="Number of available task types")
    active_services: Dict[str, bool] = Field(..., description="Status of each service")


class TaskInfo(BaseModel):
    """Model for task type information"""

    type: str = Field(..., description="Task type identifier")
    name: str = Field(..., description="Human-readable task name")
    description: str = Field(..., description="Task description")


class TaskListResponse(BaseModel):
    """Response model for listing available tasks"""

    available_tasks: int = Field(..., description="Number of available task types")
    tasks: List[TaskInfo] = Field(..., description="List of available tasks")


# ============================================================================
# ENDPOINTS
# ============================================================================


@router.post(
    "/query",
    response_model=AgentQueryResponse,
    status_code=status.HTTP_200_OK,
    summary="Execute Agent Query",
    description="Submit a query to the AI agent for processing.",
)
async def query_agent(
    request: AgentQueryRequest, x_user_id: Optional[str] = Header(None)
) -> AgentQueryResponse:
    """Execute a single query through the AI agent system."""
    try:
        user_id = validate_user_authentication(x_user_id, request.user_id)

        service = AgenticAIService(user_id)
        logger.info(
            f"🟡 [QUERY_AGENT] AgenticAIService initialized for user: {user_id}"
        )

        result = service.execute_agent(
            query=request.query,
            conversation_history=request.conversation_history or [],
            content_id_filter=request.content_id_filter,
            task_type=request.task_type,
        )

        logger.info(
            f"🟡 [QUERY_AGENT] Agent execution result - Success: {result.get('success')}"
        )

        if not result["success"]:
            logger.warning(f"🔴 [QUERY_AGENT] Query failed: {result.get('error')}")
            return AgentQueryResponse(
                success=False,
                query=request.query,
                answer=None,
                execution_time_ms=result.get("execution_time_ms", 0),
                error=result.get("error", "Unknown error"),
            )

        logger.info(
            f"✅ [QUERY_AGENT] Query processed successfully. Task: {result.get('task_type')}"
        )

        return AgentQueryResponse(
            success=True,
            task_type=result.get("task_type"),
            task_confidence=result.get("task_confidence"),
            query=request.query,
            answer=result.get("final_answer"),
            sources_used=result.get("sources_used"),
            confidence_score=result.get("confidence_score"),
            execution_time_ms=result.get("execution_time_ms", 0),
            execution_steps=result.get("execution_steps", []),
            error=None,
        )

    except ValueError as ve:
        logger.error(f"🔴 [QUERY_AGENT] Validation error: {str(ve)}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid request: {str(ve)}",
        )
    except Exception as e:
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
    description="Engage in multi-turn conversation with the AI agent.",
)
async def chat_with_agent(
    request: AgentChatRequest, x_user_id: Optional[str] = Header(None)
) -> AgentChatResponse:
    """Engage in a multi-turn conversation with the AI agent."""
    try:
        user_id = validate_user_authentication(x_user_id, request.user_id)

        logger.info(
            f"🟡 [CHAT_AGENT] Chat message from user {user_id} in conv {request.conversation_id}"
        )

        service = AgenticAIService(user_id)

        result = service.execute_agent(
            query=request.message,
            conversation_history=[],
            content_id_filter=request.content_id_filter,
        )

        if not result["success"]:
            logger.warning(f"Chat processing failed: {result.get('error')}")
            return AgentChatResponse(
                success=False,
                conversation_id=request.conversation_id,
                message="I encountered an error processing your message. Please try again.",
                error=result.get("error"),
                execution_time_ms=result.get("execution_time_ms", 0),
            )

        logger.info(f"Chat processed. Task: {result.get('task_type')}")

        return AgentChatResponse(
            success=True,
            conversation_id=request.conversation_id,
            message=result.get("final_answer", ""),
            task_type=result.get("task_type"),
            confidence_score=result.get("confidence_score"),
            execution_time_ms=result.get("execution_time_ms", 0),
        )

    except ValueError as ve:
        logger.error(f"Validation error: {str(ve)}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid request: {str(ve)}",
        )
    except Exception as e:
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
        service = AgenticAIService("health_check")
        stats = service.get_service_stats()

        status_code = "healthy"

        return HealthResponse(
            status=status_code,
            timestamp=datetime.utcnow(),
            available_tasks=stats.get("available_tasks", 0),
            active_services={
                "chroma": True,
                "embedding": True,
                "llm": True,
                "orchestrator": True,
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
    summary="List Available Tasks",
    description="Get list of available task types.",
)
async def list_tasks() -> TaskListResponse:
    """List all available task types that the agent can handle."""
    try:
        service = AgenticAIService("task_list")
        tasks_info = service.get_available_tasks()

        tasks = []
        for task_info in tasks_info:
            tasks.append(
                TaskInfo(
                    type=task_info["type"],
                    name=task_info["type"].replace("_", " ").title(),
                    description=task_info["description"],
                )
            )

        return TaskListResponse(available_tasks=len(tasks), tasks=tasks)

    except Exception as e:
        logger.error(f"Failed to list tasks: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve task list",
        )
