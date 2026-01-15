"""
Refinement Pipeline Orchestrator - Phase 1 Only

Phase 1 Pipeline (Extract → Summarize → Tag):
Simplified pipeline for content refinement WITHOUT embeddings.

Flow:
1. Extracted text from URL/PDF/Image
2. Generate summary (BART model)
3. Generate tags (zero-shot classification)
4. Return refined content

Embeddings are handled separately in Phase 2 via /embed/store endpoint.

Usage:
    from app.services.refiners.refinement_pipeline import process_extracted_content

    refined = await process_extracted_content(
        extracted_text="Raw text...",
        source_url="https://example.com",
        source_type="web"
    )
"""

import logging
import time
from typing import Optional, Dict, Any
from datetime import datetime

from app.services.refiners.summarizers import summarize_content
from app.services.refiners.tag_generators import generate_tags


class RefinementConfig:
    """Configuration for refinement pipeline"""

    def __init__(
        self,
        summary_max_length: int = 500,
        summary_min_length: int = 100,
        top_tags: int = 5,
        chroma_collection: str = "tagzs_refined_content",
    ):
        """Initialize refinement configuration"""
        self.summary_max_length = summary_max_length
        self.summary_min_length = summary_min_length
        self.top_tags = top_tags
        self.chroma_collection = chroma_collection


class RefinementPipelineResponse:
    """Response from Phase 1 refinement pipeline (no embeddings)"""

    def __init__(self):
        self.success: bool = False
        self.title: str = ""
        self.summary: Optional[str] = None
        self.tags: list = []
        self.extracted_text: str = ""
        self.source_url: str = ""
        self.source_type: str = "web"
        self.metadata: Dict[str, Any] = {}
        self.processing_times_ms: Dict[str, int] = {}
        self.errors: list = []
        self.created_at: Optional[datetime] = None

    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary for JSON response"""
        return {
            "success": self.success,
            "title": self.title,
            "summary": self.summary,
            "tags": self.tags,
            "extracted_text": self.extracted_text,
            "source_url": self.source_url,
            "source_type": self.source_type,
            "metadata": self.metadata,
            "processing_times_ms": self.processing_times_ms,
            "total_time_ms": sum(self.processing_times_ms.values()),
            "errors": self.errors,
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }


class RefinementPipeline:
    """
    Phase 1 refinement pipeline orchestrator (Extract → Summarize → Tag).

    No embeddings or Chroma storage in Phase 1.
    Embeddings are handled separately in Phase 2 via /embed/store endpoint.
    """

    def __init__(self, config: Optional[RefinementConfig] = None):
        """Initialize refinement pipeline"""
        self.config = config or RefinementConfig()
        self.logger = logging.getLogger(__name__)
        self.logger.info("✅ Phase 1 refinement pipeline initialized (no embeddings)")

    async def process_extracted_content(
        self,
        extracted_text: str,
        source_url: str,
        source_type: str = "web",
        title: str = "",
    ) -> RefinementPipelineResponse:
        """
        Process extracted content through Phase 1 pipeline.

        Phase 1 ONLY: Extract → Summarize → Tag
        No embeddings or Chroma storage here.

        Args:
            extracted_text: Extracted and cleaned text from source
            source_url: Source URL/path
            source_type: Type of source ("web", "pdf", "image")
            title: Optional title

        Returns:
            RefinementPipelineResponse with summary and tags only
        """
        start_time = time.time()
        response = RefinementPipelineResponse()
        response.extracted_text = extracted_text
        response.source_url = source_url
        response.source_type = source_type
        response.title = title
        response.metadata = {
            "source_url": source_url,
            "source_type": source_type,
            "extraction_time": datetime.utcnow().isoformat(),
        }

        try:
            if not extracted_text or len(extracted_text.strip()) < 5:
                raise ValueError(
                    "Extracted text too short for processing (minimum 5 chars)"
                )

            self.logger.info(
                f"🚀 Starting Phase 1 pipeline for {source_type} from {source_url}"
            )

            # ========== STEP 1: SUMMARIZATION ==========
            summarization_start = time.time()
            try:
                # Check if enough text for summarization
                if len(extracted_text) < 50:
                    self.logger.info(
                        "ℹ️ Text too short for summarization, using original text"
                    )
                    response.summary = extracted_text
                    response.processing_times_ms["summarization"] = 0
                else:
                    self.logger.info("📝 Step 1/2: Summarizing content...")

                    summary_response = await summarize_content(
                        text=extracted_text,
                        max_length=self.config.summary_max_length,
                        min_length=self.config.summary_min_length,
                    )

                    if summary_response.success:
                        response.summary = summary_response.summary
                        response.processing_times_ms["summarization"] = (
                            summary_response.processing_time_ms
                        )
                        self.logger.info(
                            f"✅ Summarization complete: {len(response.summary)} chars"
                        )
                    else:
                        self.logger.warning(
                            f"⚠️ Summarization failed: {summary_response.errors}"
                        )
                        response.errors.extend(summary_response.errors)
                        response.summary = extracted_text[
                            : self.config.summary_max_length
                        ]
                        response.processing_times_ms["summarization"] = (
                            summary_response.processing_time_ms
                        )

            except Exception as e:
                error_msg = f"Summarization failed: {str(e)}"
                self.logger.error(error_msg)
                response.errors.append(error_msg)
                response.summary = extracted_text[: self.config.summary_max_length]
                response.processing_times_ms["summarization"] = int(
                    (time.time() - summarization_start) * 1000
                )

            # ========== STEP 2: TAG GENERATION ==========
            tagging_start = time.time()
            try:
                tagging_text = response.summary if response.summary else extracted_text

                # Check if enough text for tag generation
                if len(tagging_text) < 20:
                    self.logger.info("ℹ️ Text too short for AI tagging, skipping")
                    response.tags = []
                    response.processing_times_ms["tagging"] = 0
                else:
                    self.logger.info("🏷️  Step 2/2: Generating tags...")

                    tag_response = await generate_tags(
                        text=tagging_text, top_k=self.config.top_tags
                    )

                    if tag_response.success:
                        response.tags = [tag.name for tag in tag_response.tags]
                        response.processing_times_ms["tagging"] = (
                            tag_response.processing_time_ms
                        )
                        self.logger.info(f"✅ Tag generation complete: {response.tags}")
                    else:
                        self.logger.warning(
                            f"⚠️ Tag generation failed: {tag_response.errors}"
                        )
                        response.errors.extend(tag_response.errors)
                        response.tags = []
                        response.processing_times_ms["tagging"] = (
                            tag_response.processing_time_ms
                        )

            except Exception as e:
                error_msg = f"Tag generation failed: {str(e)}"
                self.logger.error(error_msg)
                response.errors.append(error_msg)
                response.tags = []
                response.processing_times_ms["tagging"] = int(
                    (time.time() - tagging_start) * 1000
                )

            response.success = response.summary is not None and len(response.tags) > 0
            response.created_at = datetime.utcnow()

            total_time = int((time.time() - start_time) * 1000)
            self.logger.info(
                f"✅ Phase 1 pipeline complete (success={response.success}, "
                f"total_time={total_time}ms, errors={len(response.errors)})"
            )

            return response

        except Exception as e:
            self.logger.error(f"Phase 1 pipeline failed: {str(e)}")
            response.success = False
            response.errors.append(f"Pipeline failed: {str(e)}")
            response.created_at = datetime.utcnow()
            return response


# ========== CONVENIENCE FUNCTIONS ==========


async def process_extracted_content(
    extracted_text: str,
    source_url: str,
    source_type: str = "web",
    title: str = "",
    config: Optional[RefinementConfig] = None,
) -> RefinementPipelineResponse:
    """
    Convenience function to process extracted content through Phase 1 refinement pipeline.

    Phase 1 workflow (no embeddings):
    1. Summarize using BART
    2. Generate tags using zero-shot classification

    Note: Embeddings are handled separately in Phase 2 via /embed/store endpoint

    Args:
        extracted_text: Cleaned text extracted from source
        source_url: URL or path of source
        source_type: Type ("web", "pdf", "image")
        title: Optional title
        config: Optional refinement configuration

    Returns:
        RefinementPipelineResponse with summary and tags only

    Example:
        response = await process_extracted_content(
            extracted_text="Article content...",
            source_url="https://example.com/article",
            source_type="web",
            title="Article Title"
        )
        print(f"Summary: {response.summary}")
        print(f"Tags: {response.tags}")
    """
    pipeline = RefinementPipeline(config)
    return await pipeline.process_extracted_content(
        extracted_text=extracted_text,
        source_url=source_url,
        source_type=source_type,
        title=title,
    )
