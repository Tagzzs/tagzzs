"""
Summarization Orchestrator

Coordinates summarization workflow with error handling and monitoring.
Implements orchestration pattern with Groq API integration.
"""

import logging
import os
from typing import Optional

from .models import SummarizationRequest, SummarizationResponse, SummarizationConfig
from .summarizer import SummarizationEngine


class SummarizationOrchestrator:
    """
    Orchestrates text summarization with error handling and monitoring.

    Architecture Flow:
    Request → SummarizationEngine (Groq API) → Response
    """

    def __init__(self, config: Optional[SummarizationConfig] = None):
        """Initialize orchestrator"""
        if config is None:
            config = SummarizationConfig(api_key=os.getenv("GROQ_API_KEY", ""))
        self.config = config
        self.logger = logging.getLogger(__name__)

        try:
            self.engine = SummarizationEngine(config)
            self.logger.info("✅ Summarization orchestrator initialized with Groq API")
        except Exception as e:
            self.logger.error(
                f"Failed to initialize summarization orchestrator: {str(e)}"
            )
            raise

    async def orchestrate_summarization(
        self, text: str, max_length: int = 180, min_length: int = 60
    ) -> SummarizationResponse:
        """
        Orchestrate complete summarization process.

        Args:
            text: Text to summarize
            max_length: Maximum summary length
            min_length: Minimum summary length

        Returns:
            SummarizationResponse with summary and metadata
        """
        self.logger.info(
            f"Starting orchestrated summarization (text length: {len(text)} chars)"
        )

        request = SummarizationRequest(
            text=text, max_length=max_length, min_length=min_length
        )

        response = await self.engine.summarize(request)

        return response

async def summarize_content(
    text: str,
    max_length: int = 180,
    min_length: int = 60,
    config: Optional[SummarizationConfig] = None,
) -> SummarizationResponse:
    """
    Convenience function for direct text summarization via Groq API.

    Args:
        text: Text to summarize
        max_length: Maximum summary length
        min_length: Minimum summary length
        config: Optional configuration

    Returns:
        SummarizationResponse with summary and metadata
    """
    orchestrator = SummarizationOrchestrator(config)
    return await orchestrator.orchestrate_summarization(text, max_length, min_length)
