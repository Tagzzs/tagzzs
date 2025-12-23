"""
Agent State

Defines the state object that tracks all information throughout agent execution.
Implements autonomous task routing and execution for various task types.
"""

import logging
from dataclasses import dataclass, field
from typing import Optional, List, Dict, Any
from datetime import datetime

logger = logging.getLogger(__name__)


@dataclass
class AgentState:
    """
    Complete state object for agent execution.

    Tracks all information throughout the agent's lifecycle.
    """

    # User and query information
    user_id: str
    query: str
    conversation_history: List[Dict[str, str]] = field(default_factory=list)

    # Filtering
    content_id_filter: Optional[str] = None

    # Task classification
    task_type: Optional[str] = (
        None  # CONVERSATION, SEARCH, SUMMARIZE, ANALYZE, COMPARE, EXTRACT_INSIGHTS, METADATA_QUERY
    )
    task_confidence: float = 0.0

    # Adaptive routing metadata
    query_complexity: Optional[str] = None  # SIMPLE, ANALYTICAL, SYNTHESIS, REAL_TIME
    execution_path: Optional[str] = (
        None  # CONVERSATION_PATH, FAST_PATH, ANALYTICAL_PATH, SYNTHESIS_PATH, METADATA_PATH
    )
    execution_strategy: Dict[str, Any] = field(default_factory=dict)
    use_web_search: bool = False
    require_refinement: bool = False

    # Retrieved data
    query_embedding: Optional[List[float]] = None
    query_intent: Optional[Any] = None
    retrieved_chunks: List[Dict[str, Any]] = field(default_factory=list)
    retrieved_summaries: List[Dict[str, Any]] = field(default_factory=list)

    # Processing results
    intermediate_results: Dict[str, Any] = field(default_factory=dict)
    analysis_results: Dict[str, Any] = field(default_factory=dict)

    # Final output
    final_answer: str = ""
    reasoning: str = ""
    execution_steps: List[Dict[str, Any]] = field(default_factory=list)
    confidence_score: float = 0.0
    sources_used: List[Dict[str, Any]] = field(default_factory=list)

    # Metadata
    total_execution_time_ms: int = 0
    error_message: Optional[str] = None
    timestamp: str = field(default_factory=lambda: datetime.now().isoformat())

    def add_execution_step(self, step_name: str, status: str = "completed") -> None:
        """Add an execution step to tracking."""
        self.execution_steps.append(
            {
                "step": step_name,
                "status": status,
                "timestamp": datetime.now().isoformat(),
            }
        )
        logger.debug(f"Execution step: {step_name} ({status})")

    def set_error(self, error_msg: str) -> None:
        """Set error state."""
        self.error_message = error_msg
        logger.error(f"Agent error: {error_msg}")

    def to_dict(self) -> Dict[str, Any]:
        """Convert state to dictionary."""
        return {
            "user_id": self.user_id,
            "query": self.query,
            "task_type": self.task_type,
            "task_confidence": self.task_confidence,
            "final_answer": self.final_answer,
            "reasoning": self.reasoning,
            "execution_steps": self.execution_steps,
            "confidence_score": self.confidence_score,
            "sources_used": self.sources_used,
            "total_execution_time_ms": self.total_execution_time_ms,
            "error": self.error_message,
        }
