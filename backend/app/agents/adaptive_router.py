"""
Adaptive Agent Router - Dynamic query classification and routing strategy

Classifies queries by:
1. Intent complexity (simple vs analytical vs synthesis)
2. Query length and specificity
3. Entity count (multi-document, multi-faceted questions)
4. Temporal references (real-time data needed?)
5. LLM-based semantic analysis

Routes to optimal execution paths:
- FAST_PATH: Simple factual queries → Direct RAG + respond
- ANALYTICAL_PATH: Analytical queries → Multi-step reasoning + refinement
- SYNTHESIS_PATH: Synthesis tasks → Retrieve, refine, cross-reference
"""

import logging
from typing import Dict, Any
from enum import Enum
import re
from app.clients import LLMClient

logger = logging.getLogger(__name__)


class QueryComplexity(Enum):
    """Query complexity levels."""

    SIMPLE = "SIMPLE"  # Factual, direct questions
    ANALYTICAL = "ANALYTICAL"  # "Why", "How", pattern detection
    SYNTHESIS = "SYNTHESIS"  # Multi-step, comparison, insight extraction
    REAL_TIME = "REAL_TIME"  # Requires current information


class ExecutionPath(Enum):
    """Execution paths optimized for different query types."""

    CONVERSATION_PATH = "CONVERSATION_PATH"  # Direct response, no retrieval (<1s)
    FAST_PATH = "FAST_PATH"  # ContentRetrieval → ResponseGeneration (3-5s)
    ANALYTICAL_PATH = (
        "ANALYTICAL_PATH"  # ContentRetrieval → Analysis → ResponseGeneration (5-10s)
    )
    SYNTHESIS_PATH = "SYNTHESIS_PATH"  # ContentRetrieval → Comparison/Synthesis → ResponseGeneration (8-15s)
    METADATA_PATH = "METADATA_PATH"  # MetadataQuery → ResponseGeneration (1-3s)


class AdaptiveRouter:
    """Dynamically routes queries to optimal execution strategies."""

    def __init__(self, llm_client: LLMClient):
        """Initialize router with LLM client for semantic analysis."""
        self.llm_client = llm_client
        self.llm_client = llm_client

    def classify_query(self, query: str) -> Dict[str, Any]:
        """
        Comprehensive query classification with complexity detection.

        Returns:
        {
            'complexity': QueryComplexity enum,
            'execution_path': ExecutionPath enum,
            'task_type': str (SEARCH, SUMMARIZE, ANALYZE, COMPARE, etc.),
            'confidence': float (0.0-1.0),
            'rationale': str,
            'use_web_search': bool,
            'parallel_retrieval': bool,
            'require_refinement': bool
        }
        """
        try:
            # Step 1: Heuristic-based pre-classification (fast)
            heuristic_result = self._heuristic_classify(query)

            # Step 2: LLM-based semantic analysis (optional, can be gated by complexity)
            if heuristic_result["confidence"] < 0.7:
                logger.info(
                    f"[ADAPTIVE_ROUTER] Low confidence ({heuristic_result['confidence']:.2f}), "
                    f"running LLM-based refinement..."
                )
                semantic_result = self._semantic_classify(query)
                # Merge results (LLM confidence often higher for edge cases)
                return self._merge_classifications(heuristic_result, semantic_result)

            # Step 3: Determine execution path based on complexity
            execution_path = self._select_execution_path(
                heuristic_result["complexity"],
                heuristic_result["task_type"],
                query,
            )

            heuristic_result["execution_path"] = execution_path

            logger.info(
                f"[ADAPTIVE_ROUTER] Query classified → "
                f"Complexity: {heuristic_result['complexity']}, "
                f"Task: {heuristic_result['task_type']}, "
                f"Path: {execution_path}"
            )

            return heuristic_result

        except Exception as e:
            logger.error(f"[ADAPTIVE_ROUTER] Classification error: {str(e)}")
            # Fallback to safe default
            return {
                "complexity": QueryComplexity.SIMPLE.value,
                "execution_path": ExecutionPath.FAST_PATH.value,
                "task_type": "SEARCH",
                "confidence": 0.5,
                "rationale": "Error in classification; using safe default",
                "use_web_search": False,
                "parallel_retrieval": False,
                "require_refinement": False,
            }

    def _heuristic_classify(self, query: str) -> Dict[str, Any]:
        """Fast heuristic-based classification using keywords and patterns."""
        query_lower = query.lower()
        query_len = len(query.split())
        question_words = re.findall(
            r"\b(why|how|what|when|where|who|which)\b", query_lower
        )

        # Default values
        task_type = "SEARCH"
        complexity = QueryComplexity.SIMPLE
        confidence = 0.6
        use_web_search = False
        parallel_retrieval = False
        require_refinement = False

        # ========== CONVERSATION DETECTION ==========
        # Simple greetings, small talk, general knowledge questions (no content retrieval needed)
        conversation_keywords = [
            "hello",
            "hi",
            "hey",
            "how are you",
            "thanks",
            "thank you",
            "what is",
            "who is",
            "when is",
            "where is",  # General knowledge
            "tell me",
            "explain",
            "define",
            "what does",  # General knowledge
            "your name",
            "what are you",
            "who are you",  # About the AI itself
        ]

        if query_len <= 10 and any(kw in query_lower for kw in conversation_keywords):
            # Check if it's actually about the system/general knowledge
            if not any(
                word in query_lower
                for word in [
                    "about",
                    "regarding",
                    "document",
                    "content",
                    "file",
                    "pdf",
                    "search",
                    "find",
                ]
            ):
                task_type = "CONVERSATION"
                complexity = QueryComplexity.SIMPLE
                confidence = 0.95
                # No retrieval needed for conversation
                return {
                    "complexity": complexity.value,
                    "execution_path": ExecutionPath.CONVERSATION_PATH.value,
                    "task_type": task_type,
                    "confidence": confidence,
                    "rationale": "Conversational query; no content retrieval needed",
                    "use_web_search": False,
                    "parallel_retrieval": False,
                    "require_refinement": False,
                }

        # ========== COMPLEXITY & TASK DETECTION ==========

        # Explicit comparison/synthesis queries
        if any(
            word in query_lower
            for word in ["compare", "difference", "versus", "vs", "contrast"]
        ):
            task_type = "COMPARE"
            complexity = QueryComplexity.SYNTHESIS
            confidence = 0.9
            parallel_retrieval = True  # Retrieve multiple items simultaneously

        # Analysis/Pattern queries
        elif any(
            word in query_lower
            for word in ["analyze", "analysis", "pattern", "relationship", "cause"]
        ):
            task_type = "ANALYZE"
            complexity = QueryComplexity.ANALYTICAL
            confidence = 0.85
            require_refinement = True

        # Insight extraction
        elif any(
            word in query_lower
            for word in ["extract", "find", "discover", "trend", "insight", "takeaway"]
        ):
            task_type = "EXTRACT_INSIGHTS"
            complexity = QueryComplexity.ANALYTICAL
            confidence = 0.8
            require_refinement = True

        # Summarization
        elif any(
            word in query_lower
            for word in ["summarize", "summary", "overview", "brief", "tldr"]
        ):
            task_type = "SUMMARIZE"
            complexity = QueryComplexity.SIMPLE
            confidence = 0.9

        # Metadata queries
        elif any(
            word in query_lower
            for word in ["list", "count", "all", "show", "get", "filter"]
        ) and any(
            word in query_lower
            for word in ["tag", "type", "source", "pdf", "web", "date"]
        ):
            task_type = "METADATA_QUERY"
            complexity = QueryComplexity.SIMPLE
            confidence = 0.85

        # ========== COMPLEXITY MODIFIERS ==========

        # Long queries often more complex
        if query_len > 20:
            complexity = (
                QueryComplexity.SYNTHESIS
                if complexity == QueryComplexity.ANALYTICAL
                else complexity
            )
            confidence *= 0.95
            require_refinement = True

        # Multiple question words → analytical
        if len(question_words) > 1:
            complexity = QueryComplexity.ANALYTICAL
            confidence *= 0.9
            require_refinement = True

        # "Why" and "How" are inherently analytical
        if "why" in question_words or "how" in question_words:
            complexity = QueryComplexity.ANALYTICAL
            confidence = max(confidence, 0.8)
            require_refinement = True

        # ========== WEB SEARCH TRIGGERS ==========

        # Real-time queries
        if any(
            word in query_lower
            for word in [
                "today",
                "now",
                "current",
                "latest",
                "recent",
                "trending",
                "breaking",
            ]
        ):
            complexity = QueryComplexity.REAL_TIME
            use_web_search = True
            confidence = max(confidence, 0.75)

        # ========== PARALLELIZATION HINTS ==========

        # Multiple entities suggest parallel retrieval
        entity_count = len(re.findall(r"\b(?:and|or|,)\b", query_lower))
        if entity_count > 2:
            parallel_retrieval = True

        return {
            "complexity": complexity.value,
            "execution_path": None,  # Will be set later
            "task_type": task_type,
            "confidence": min(confidence, 1.0),
            "rationale": f"Heuristic detection: {task_type} ({complexity.value})",
            "use_web_search": use_web_search,
            "parallel_retrieval": parallel_retrieval,
            "require_refinement": require_refinement,
        }

    def _semantic_classify(self, query: str) -> Dict[str, Any]:
        """LLM-based semantic classification for edge cases."""
        prompt = f"""Analyze this query and determine:
1. Query complexity: SIMPLE, ANALYTICAL, or SYNTHESIS
2. Task type: SEARCH, SUMMARIZE, ANALYZE, COMPARE, EXTRACT_INSIGHTS, or METADATA_QUERY
3. Confidence (0.0-1.0)
4. Reasoning

Query: "{query}"

Respond as JSON:
{{
    "complexity": "SIMPLE|ANALYTICAL|SYNTHESIS",
    "task_type": "SEARCH|SUMMARIZE|ANALYZE|COMPARE|EXTRACT_INSIGHTS|METADATA_QUERY",
    "confidence": 0.85,
    "reasoning": "..."
}}"""

        try:
            response = self.llm_client.call_llm(
                prompt,
                system_prompt="You are an expert query classifier. Be precise and confident.",
            )

            # Parse JSON response (simplified)
            import json

            result = json.loads(response)
            return {
                "complexity": result.get("complexity", "SIMPLE"),
                "task_type": result.get("task_type", "SEARCH"),
                "confidence": float(result.get("confidence", 0.6)),
                "rationale": result.get("reasoning", "LLM-based classification"),
                "use_web_search": False,  # LLM doesn't know this
                "parallel_retrieval": False,
                "require_refinement": "ANALYTICAL" in result.get("complexity", ""),
            }
        except Exception as e:
            logger.error(f"[ADAPTIVE_ROUTER] LLM semantic classification failed: {e}")
            return {}

    def _merge_classifications(self, heuristic: Dict, semantic: Dict) -> Dict[str, Any]:
        """Merge heuristic and semantic classifications, favoring higher confidence."""
        if semantic.get("confidence", 0) > heuristic.get("confidence", 0):
            logger.info(
                "[ADAPTIVE_ROUTER] Semantic classification has higher confidence; using it"
            )
            result = semantic.copy()
            # Keep heuristic's web_search hint
            result["use_web_search"] = heuristic.get("use_web_search", False)
            result["parallel_retrieval"] = heuristic.get("parallel_retrieval", False)
        else:
            result = heuristic.copy()

        return result

    def _select_execution_path(
        self, complexity: str, task_type: str, query: str
    ) -> str:
        """Select optimal execution path based on complexity and task type."""

        # Conversation queries (no retrieval needed)
        if task_type == "CONVERSATION":
            return ExecutionPath.CONVERSATION_PATH.value

        # METADATA_QUERY always uses metadata path
        if task_type == "METADATA_QUERY":
            return ExecutionPath.METADATA_PATH.value

        # Simple factual searches → FAST_PATH
        if complexity == QueryComplexity.SIMPLE.value and task_type == "SEARCH":
            return ExecutionPath.FAST_PATH.value

        # Analytical queries → ANALYTICAL_PATH with multi-step reasoning
        if complexity == QueryComplexity.ANALYTICAL.value:
            return ExecutionPath.ANALYTICAL_PATH.value

        # Synthesis tasks (compare, analyze multi-items) → SYNTHESIS_PATH
        if complexity == QueryComplexity.SYNTHESIS.value or task_type in [
            "COMPARE",
            "ANALYZE",
        ]:
            return ExecutionPath.SYNTHESIS_PATH.value

        # Real-time queries benefit from web search + fast path
        if complexity == QueryComplexity.REAL_TIME.value:
            return ExecutionPath.FAST_PATH.value  # Will add web search in parallel

        # Default
        return ExecutionPath.FAST_PATH.value

    def get_execution_strategy(self, classification: Dict[str, Any]) -> Dict[str, Any]:
        """
        Convert classification to execution strategy with concrete steps.

        Returns optimized node sequence and parallelization hints.
        """
        path = classification["execution_path"]

        strategies = {
            ExecutionPath.CONVERSATION_PATH.value: {
                "node_sequence": ["TaskRouter", "ResponseGeneration", "Validation"],
                "parallel_steps": [],
                "timeout_ms": 1000,
                "max_retrievals": 0,  # No content retrieval
                "use_cache": True,
                "rationale": "Direct response for conversational queries; no content retrieval needed",
            },
            ExecutionPath.FAST_PATH.value: {
                "node_sequence": [
                    "TaskRouter",
                    "ContentRetrieval",
                    "ResponseGeneration",
                    "Validation",
                ],
                "parallel_steps": [],
                "timeout_ms": 3000,
                "max_retrievals": 3,
                "use_cache": True,
                "rationale": "Optimized for quick factual queries",
            },
            ExecutionPath.ANALYTICAL_PATH.value: {
                "node_sequence": [
                    "TaskRouter",
                    "ContentRetrieval",
                    "Analysis",
                    "ResponseGeneration",
                    "Validation",
                ],
                "parallel_steps": [],
                "timeout_ms": 8000,
                "max_retrievals": 5,
                "use_cache": False,
                "rationale": "Multi-step reasoning for analytical queries",
            },
            ExecutionPath.SYNTHESIS_PATH.value: {
                "node_sequence": [
                    "TaskRouter",
                    "ContentRetrieval",
                    "Comparison",
                    "ResponseGeneration",
                    "Validation",
                ],
                "parallel_steps": [
                    "ContentRetrieval"
                ],  # Parallel retrieval of multiple items
                "timeout_ms": 10000,
                "max_retrievals": 10,
                "use_cache": False,
                "rationale": "Comprehensive retrieval and cross-referencing",
            },
            ExecutionPath.METADATA_PATH.value: {
                "node_sequence": [
                    "TaskRouter",
                    "MetadataQuery",
                    "ResponseGeneration",
                    "Validation",
                ],
                "parallel_steps": [],
                "timeout_ms": 2000,
                "max_retrievals": 0,  # Metadata-based, no embeddings
                "use_cache": True,
                "rationale": "Fast metadata-based filtering",
            },
        }

        strategy = strategies.get(path, strategies[ExecutionPath.FAST_PATH.value])

        # Inject classification metadata
        strategy["classification"] = classification
        strategy["use_web_search"] = classification.get("use_web_search", False)
        strategy["require_refinement"] = classification.get("require_refinement", False)

        return strategy
