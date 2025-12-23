"""
Semantic Search Routes
API endpoints for semantic search operations
"""

import logging
from fastapi import APIRouter, HTTPException, Header
from pydantic import BaseModel
from typing import Optional, List

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/search", tags=["search"])


class SemanticSearchRequest(BaseModel):
    """Request model for semantic search"""

    user_id: str
    query: str
    tags: Optional[List[str]] = None
    content_id_filter: Optional[str] = None
    limit: int = 10


class SearchResultResponse(BaseModel):
    """Individual search result"""

    content_id: str
    score: float
    rank: int


class SemanticSearchResponse(BaseModel):
    """Response model for semantic search"""

    success: bool
    query: str
    results: List[SearchResultResponse] = []
    result_count: int = 0
    error: Optional[str] = None


async def get_user_id_from_header(authorization: str = Header(None)) -> str:
    """
    Extract and validate user ID from auth header

    Header format: "Bearer <user_id>"
    """
    if not authorization:
        raise HTTPException(status_code=401, detail="Missing authorization header")

    try:
        parts = authorization.split(" ")
        if len(parts) != 2 or parts[0] != "Bearer":
            raise ValueError("Invalid header format")

        user_id = parts[1]
        if not user_id:
            raise ValueError("Empty user ID")

        return user_id

    except Exception as e:
        logger.error(f"[SEARCH_ROUTES] Error parsing auth header: {str(e)}")
        raise HTTPException(status_code=401, detail="Invalid authorization header")


@router.post("/semantic-query", response_model=SemanticSearchResponse)
async def semantic_query(request: SemanticSearchRequest):
    """
    Execute semantic search on user's content

    This endpoint:
    1. Accepts user_id in request body
    2. Generates embedding for the query using sentence-transformers
    3. Searches Chroma summaries collection with hybrid RRF ranking
    4. Optionally filters by tags and/or content_id
    5. Returns ranked results with content IDs and scores
    """
    try:
        # Validate user_id
        if not request.user_id or len(request.user_id.strip()) == 0:
            raise ValueError("user_id cannot be empty")

        logger.info(f"[SEMANTIC_QUERY] User: {request.user_id}")
        logger.info(f"[SEMANTIC_QUERY] Query: '{request.query}'")

        # Validate request
        if not request.query or len(request.query.strip()) == 0:
            raise ValueError("Query cannot be empty")

        if request.limit < 1 or request.limit > 100:
            raise ValueError("Limit must be between 1 and 100")

        # Import service
        from app.services.ai.semantic_search import SemanticSearchService

        # Execute search
        service = SemanticSearchService()
        results = await service.search(
            user_id=request.user_id,
            query=request.query,
            tags=request.tags,
            limit=request.limit,
            content_id_filter=request.content_id_filter,
        )

        logger.info(f"[SEMANTIC_QUERY] ✅ Search completed: {len(results)} results")

        # Convert to response objects
        result_responses = [
            SearchResultResponse(content_id=r.content_id, score=r.score, rank=r.rank)
            for r in results
        ]

        return SemanticSearchResponse(
            success=True,
            query=request.query,
            results=result_responses,
            result_count=len(result_responses),
        )

    except ValueError as e:
        logger.warning(f"[SEMANTIC_QUERY] Validation error: {str(e)}")
        raise HTTPException(status_code=400, detail=str(e))

    except Exception as e:
        logger.error(f"[SEMANTIC_QUERY] Error: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Semantic search failed: {str(e)}")
