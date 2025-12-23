"""
Summarization Engine

Core summarization logic using Groq API.
Low-level implementation following extractor pattern with free-tier integration.
"""

import logging
import time
import os
import asyncio
from typing import Optional

from app.clients import get_groq_client
from .models import SummarizationRequest, SummarizationResponse, SummarizationConfig
from .text_chunker import TextChunker


class SummarizationEngine:
    """
    Core summarization engine using Groq API (LLaMA model).

    Implements low-level summarization following architecture pattern:
    Text Input → Extract Useful Chunks → Groq API Call → Structured Output

    Uses free-tier Groq API with LLaMA 3.1 70B model.
    """

    def __init__(self, config: Optional[SummarizationConfig] = None):
        """Initialize summarization engine"""
        if config is None:
            config = SummarizationConfig(api_key=os.getenv("GROQ_API_KEY", ""))
        self.config = config
        self.logger = logging.getLogger(__name__)

        try:
            # Use centralized Groq client manager instead of direct initialization
            self.client = get_groq_client()
            self.logger.info(
                f"✅ Groq client initialized with model: {self.config.model_name}"
            )
        except Exception as e:
            self.logger.error(f"Failed to initialize Groq client: {str(e)}")
            raise

    async def summarize(self, request: SummarizationRequest) -> SummarizationResponse:
        """
        Summarize text using Groq API with smart chunking for large texts.

        Strategy:
        - If text < 3000 chars: Direct summarization
        - If text >= 3000 chars:
          1. Split into overlapping chunks using TextChunker
          2. Summarize each chunk individually
          3. Combine chunk summaries
          4. Generate final summary from combined summaries

        Args:
            request: SummarizationRequest with text and parameters

        Returns:
            SummarizationResponse with summary and metadata
        """
        start_time = time.time()

        response = SummarizationResponse(
            success=False,
            text=request.text,
            summary="",
            compression_ratio=0.0,
            word_count_original=len(request.text.split()),
            word_count_summary=0,
            processing_time_ms=0,
        )

        try:
            self.logger.info(
                f"Starting text summarization via Groq API (text length: {len(request.text)} chars)"
            )

            # Decide summarization strategy based on text length
            if len(request.text) < 3000:
                # Direct summarization for short text
                self.logger.info("📝 Using direct summarization (text < 3000 chars)")
                summary = await self._summarize_direct(
                    request.text, request.min_length, request.max_length
                )
            else:
                # Multi-level summarization for long text
                self.logger.info(
                    f"📚 Using chunk-based summarization (text >= 3000 chars, {len(request.text)} chars)"
                )
                summary = await self._summarize_with_chunks(
                    request.text, request.min_length, request.max_length
                )

            response.summary = summary
            response.word_count_summary = len(summary.split())
            response.compression_ratio = response.word_count_original / max(
                response.word_count_summary, 1
            )
            response.success = True

            self.logger.info(
                f"✅ Summarization complete. Compression ratio: {response.compression_ratio:.2f}x"
            )

        except Exception as e:
            self.logger.error(f"Summarization failed: {str(e)}")
            response.errors.append(str(e))
            response.success = False

        # Calculate processing time
        response.processing_time_ms = int((time.time() - start_time) * 1000)

        return response

    async def _summarize_direct(
        self, text: str, min_length: int, max_length: int
    ) -> str:
        """
        Direct summarization for text < 3000 chars.

        Args:
            text: Text to summarize
            min_length: Minimum summary length
            max_length: Maximum summary length

        Returns:
            Summary text
        """
        # Truncate text to avoid exceeding token limits (~3000 chars = ~750 tokens)
        max_text_chars = 3000
        text_to_summarize = (
            text[:max_text_chars] if len(text) > max_text_chars else text
        )
        if len(text) > max_text_chars:
            text_to_summarize += "..."

        prompt = f"""Please provide a concise summary of the following text. 
The summary should be between {min_length} and {max_length} words.
Keep the summary factual and preserve the key information.

Text to summarize:
{text_to_summarize}

Summary:"""

        return await self._call_groq_api(prompt)

    async def _summarize_with_chunks(
        self, text: str, min_length: int, max_length: int
    ) -> str:
        """
        Multi-level summarization for text >= 3000 chars.

        Steps:
        1. Extract overlapping chunks from text
        2. Summarize each chunk
        3. Combine all chunk summaries
        4. Generate final summary

        Args:
            text: Long text to summarize
            min_length: Minimum summary length
            max_length: Maximum summary length

        Returns:
            Final summary
        """
        # Step 1: Extract overlapping chunks
        chunks, chunk_info = TextChunker.get_chunk_info(text, num_chunks=3)
        self.logger.info(
            f"Extracted {chunk_info['num_chunks']} chunks (total: {chunk_info['total_extracted']} chars)"
        )

        # Step 2: Summarize each chunk individually
        self.logger.info(f"Summarizing {len(chunks)} chunks individually...")
        chunk_summaries = []

        for i, chunk in enumerate(chunks, 1):
            try:
                self.logger.info(
                    f"  📄 Summarizing chunk {i}/{len(chunks)} ({len(chunk)} chars)..."
                )

                chunk_prompt = f"""Please provide a summary of this text section. 
Keep it concise and preserve key information.

Text:
{chunk}

Summary:"""

                chunk_summary = await self._call_groq_api(chunk_prompt)
                chunk_summaries.append(chunk_summary)
                self.logger.info(f"  ✅ Chunk {i} summary: {len(chunk_summary)} chars")

            except Exception as e:
                self.logger.warning(f"Failed to summarize chunk {i}: {str(e)}")
                chunk_summaries.append(chunk[:500])  # Fallback to truncated chunk

        # Step 3: Combine all chunk summaries
        combined_summaries = "\n\n".join(chunk_summaries)
        self.logger.info(f"Combined chunk summaries: {len(combined_summaries)} chars")

        # Step 4: Generate final summary from combined summaries
        # Truncate combined summaries to avoid exceeding token limits (~2000 chars = ~500 tokens)
        max_summary_chars = 2000
        if len(combined_summaries) > max_summary_chars:
            self.logger.info(
                f"Truncating combined summaries from {len(combined_summaries)} to {max_summary_chars} chars"
            )
            combined_summaries = combined_summaries[:max_summary_chars] + "..."

        self.logger.info("Generating final summary from combined chunk summaries...")
        final_prompt = f"""Please provide a final concise summary based on these summaries. 
The summary should be between {min_length} and {max_length} words.
Combine information from all sections and preserve key points.

Summaries to consolidate:
{combined_summaries}

Final Summary:"""

        final_summary = await self._call_groq_api(final_prompt)
        self.logger.info(f"Final summary generated: {len(final_summary)} chars")

        return final_summary

    async def _call_groq_api(self, prompt: str) -> str:
        """
        Call Groq API with retry logic.

        Args:
            prompt: The prompt to send to API

        Returns:
            API response text

        Raises:
            Exception: If all retries fail
        """
        retry_count = 0
        while retry_count < self.config.max_retries:
            try:
                message = self.client.chat.completions.create(
                    model=self.config.model_name,
                    max_tokens=512,
                    temperature=self.config.temperature,
                    top_p=self.config.top_p,
                    messages=[{"role": "user", "content": prompt}],
                )

                return message.choices[0].message.content.strip()

            except Exception as e:
                retry_count += 1
                if retry_count >= self.config.max_retries:
                    raise
                self.logger.warning(
                    f"API call failed, retrying ({retry_count}/{self.config.max_retries}): {str(e)}"
                )
                await asyncio.sleep(self.config.retry_delay)

        raise RuntimeError("Failed to get response from Groq API after all retries")
