"""
Tag Generation Orchestrator

Coordinates tag generation workflow with error handling and monitoring.
Implements orchestration pattern with Groq API integration.
"""

import logging
import os
from typing import Optional

from .models import TagGenerationRequest, TagGenerationResponse, TagGenerationConfig
from .generator import TagGenerationEngine


class TagGenerationOrchestrator:
    """
    Orchestrates tag generation with error handling and monitoring.

    Architecture Flow:
    Request → TagGenerationEngine (Groq API) → Response
    """

    def __init__(self, config: Optional[TagGenerationConfig] = None):
        """Initialize orchestrator"""
        if config is None:
            config = TagGenerationConfig(api_key=os.getenv("GROQ_API_KEY", ""))
        self.config = config
        self.logger = logging.getLogger(__name__)

        try:
            self.engine = TagGenerationEngine(config)
            self.logger.info("✅ Tag generation orchestrator initialized with Groq API")
        except Exception as e:
            self.logger.error(
                f"Failed to initialize tag generation orchestrator: {str(e)}"
            )
            raise

    async def orchestrate_tag_generation(
        self, text: str, top_k: int = 5
    ) -> TagGenerationResponse:
        """
        Orchestrate complete tag generation process.

        Args:
            text: Text to generate tags for
            top_k: Number of tags to return

        Returns:
            TagGenerationResponse with tags and metadata
        """
        self.logger.info(
            f"Starting orchestrated tag generation (text length: {len(text)} chars)"
        )

        request = TagGenerationRequest(text=text, top_k=top_k)

        response = await self.engine.generate(request)

        return response

async def generate_tags(
    text: str, top_k: int = 5, config: Optional[TagGenerationConfig] = None
) -> TagGenerationResponse:
    """
    Convenience function for direct tag generation via Groq API.

    Args:
        text: Text to generate tags for
        top_k: Number of tags to return
        config: Optional configuration

    Returns:
        TagGenerationResponse with tags and metadata
    """
    orchestrator = TagGenerationOrchestrator(config)
    return await orchestrator.orchestrate_tag_generation(text, top_k)
