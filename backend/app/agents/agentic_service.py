"""
AgenticAIService - Main Orchestrator

Manages the complete agent lifecycle and coordinates all components.
"""

import logging
import time
from typing import Dict, Any, Optional, List

from .state import AgentState
from .nodes import AgentNodes

logger = logging.getLogger(__name__)


class AgenticAIService:
    """
    Main service orchestrator for the agentic AI system.

    Manages:
    - Agent node execution
    - State initialization
    - Execution tracking
    - Error handling
    - Result formatting
    """

    def __init__(self, user_id: str):
        """
        Initialize AgenticAIService for a specific user.

        Args:
            user_id: The user's unique identifier

        Raises:
            ValueError: If user_id is invalid
        """
        if not user_id or not isinstance(user_id, str):
            raise ValueError("user_id must be a non-empty string")

        self.user_id = user_id
        self.nodes = AgentNodes(user_id)

        logger.info(f"AgenticAIService initialized for user: {user_id}")

    def execute_agent(
        self,
        query: str,
        conversation_history: Optional[List[Dict[str, str]]] = None,
        content_id_filter: Optional[str] = None,
        task_type: Optional[str] = None,
    ) -> Dict[str, Any]:
        """
        Execute the agent for a given query.

        Args:
            query: The user's query
            conversation_history: Optional conversation context
            content_id_filter: Optional filter for specific content
            task_type: Optional task type to constrain agent behavior

        Returns:
            Dictionary with agent results
        """
        if not query or not isinstance(query, str):
            raise ValueError("query must be a non-empty string")

        start_time = time.time()

        try:
            # Initialize state
            state = AgentState(
                user_id=self.user_id,
                query=query,
                conversation_history=conversation_history or [],
                content_id_filter=content_id_filter,
                task_type=task_type,
            )

            logger.info(f"Starting agent execution for query: {query[:100]}...")

            # Execute nodes in sequence with routing
            state = self._execute_agent_flow(state)

            # Calculate execution time
            execution_time = int((time.time() - start_time) * 1000)
            state.total_execution_time_ms = execution_time

            logger.info(f"Agent execution completed in {execution_time}ms")

            # Format and return results
            return self._format_response(state)

        except Exception as e:
            logger.error(f"Agent execution failed: {str(e)}")
            execution_time = int((time.time() - start_time) * 1000)

            return {
                "success": False,
                "error": str(e),
                "execution_time_ms": execution_time,
            }

    def _execute_agent_flow(self, state: AgentState) -> AgentState:
        """
        Execute the agent flow with conditional routing.

        Flow:
        1. TaskRouter - Classify task
        2. Route to ContentRetrieval or MetadataQuery
        3. Process based on task type
        4. ResponseGeneration
        5. Validation
        """
        try:
            # Step 1: Task Router
            state = self.nodes.task_router(state)
            if state.error_message:
                return state

            # Step 2: Route based on task type
            if state.task_type == "METADATA_QUERY":
                state = self.nodes.metadata_query(state)
            else:
                state = self.nodes.content_retrieval(state)

                if state.error_message:
                    return state

                # Step 3: Process based on task type
                if state.task_type == "SUMMARIZE":
                    state = self.nodes.summarization(state)
                elif state.task_type == "ANALYZE":
                    state = self.nodes.analysis(state)
                elif state.task_type == "COMPARE":
                    state = self.nodes.comparison(state)
                elif state.task_type == "EXTRACT_INSIGHTS":
                    state = self.nodes.insight_extraction(state)
                # SEARCH goes directly to ResponseGeneration

            # Step 4: Response Generation
            state = self.nodes.response_generation(state)

            if state.error_message:
                return state

            # Step 5: Validation
            state = self.nodes.validation(state)

            return state

        except Exception as e:
            logger.error(f"Agent flow error: {str(e)}")
            state.set_error(f"Agent execution failed: {str(e)}")
            return state

    def _format_response(self, state: AgentState) -> Dict[str, Any]:
        """Format agent state into response dictionary."""
        response = {
            "success": state.error_message is None,
            "task_type": state.task_type,
            "task_confidence": float(state.task_confidence),
            "final_answer": state.final_answer,
            "reasoning": state.reasoning,
            "confidence_score": float(state.confidence_score),
            "execution_steps": state.execution_steps,
            "execution_time_ms": state.total_execution_time_ms,
            "sources_used": state.sources_used,
            "error": state.error_message,
        }

        return response

    def get_available_tasks(self) -> List[Dict[str, Any]]:
        """Get information about available task types."""
        tasks = [
            {
                "type": "SEARCH",
                "description": "Simple semantic search through content",
                "examples": ["What is AI?", "Tell me about Python"],
            },
            {
                "type": "SUMMARIZE",
                "description": "Summarize multiple items or documents",
                "examples": [
                    "Summarize all my AI articles",
                    "Give me an overview of...",
                ],
            },
            {
                "type": "ANALYZE",
                "description": "Extract patterns and relationships from content",
                "examples": ["Analyze trends in...", "What patterns emerge from..."],
            },
            {
                "type": "COMPARE",
                "description": "Compare features or characteristics",
                "examples": [
                    "Compare Python and JavaScript",
                    "What's the difference between...",
                ],
            },
            {
                "type": "EXTRACT_INSIGHTS",
                "description": "Find key insights and takeaways",
                "examples": [
                    "What insights can you find?",
                    "Extract key learnings from...",
                ],
            },
            {
                "type": "METADATA_QUERY",
                "description": "Filter content by metadata without semantic search",
                "examples": ["List all PDFs", "Show me content with tag AI"],
            },
        ]

        return tasks

    def get_service_stats(self) -> Dict[str, Any]:
        """Get service statistics."""
        return {
            "user_id": self.user_id,
            "service_status": "active",
            "available_tasks": 6,
        }
