"""
YouTube Video Extractor Engine

Production-level YouTube video extraction engine that:
1. Extracts video metadata (title, description, channel, etc.)
2. Extracts transcript/captions (YouTube API or Whisper fallback)
3. Generates enhanced title, description, and summary using LLM
4. Generates relevant tags using zero-shot classification

Strategy:
- Primary: Use youtube_transcript_api for captions (fastest, no download needed)
- Fallback: Use yt-dlp to download audio + Whisper for transcription
- Enhancement: Use Groq LLM for title/description/summary generation
- Tags: Zero-shot classification or LLM-based tag generation
"""

import logging
import os
import re
import time
from datetime import datetime
from typing import List, Optional, Tuple, Dict, Any

from app.services.extractors.youtube.models import (
    YouTubeExtractionRequest,
    YouTubeExtractionResponse,
    YouTubeMetaData,
    YouTubeCleanedData,
    TranscriptSegment,
    YouTubeExtractionError,
    GeneratedTag,
)

logger = logging.getLogger(__name__)


def extract_video_id(url: str) -> Optional[str]:
    """
    Extract YouTube video ID from various URL formats.

    Supports:
    - https://www.youtube.com/watch?v=VIDEO_ID
    - https://youtu.be/VIDEO_ID
    - https://www.youtube.com/embed/VIDEO_ID
    - https://www.youtube.com/shorts/VIDEO_ID
    - https://www.youtube.com/v/VIDEO_ID
    """
    patterns = [
        r"(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/|youtube\.com\/shorts\/|youtube\.com\/v\/)([A-Za-z0-9_-]{11})",
        r"(?:youtube\.com\/watch\?.*v=)([A-Za-z0-9_-]{11})",
    ]

    for pattern in patterns:
        match = re.search(pattern, url)
        if match:
            return match.group(1)

    return None


def format_duration(seconds: int) -> str:
    """Format duration from seconds to HH:MM:SS or MM:SS"""
    if seconds < 3600:
        return f"{seconds // 60}:{seconds % 60:02d}"
    else:
        hours = seconds // 3600
        minutes = (seconds % 3600) // 60
        secs = seconds % 60
        return f"{hours}:{minutes:02d}:{secs:02d}"


class YouTubeMetadataExtractor:
    """Extracts metadata from YouTube videos using yt-dlp"""

    def __init__(self):
        self.logger = logging.getLogger(__name__)

    def extract_metadata(self, url: str, video_id: str) -> YouTubeMetaData:
        """Extract video metadata using yt-dlp without downloading"""
        try:
            from yt_dlp import YoutubeDL
        except ImportError:
            self.logger.warning("yt-dlp not available, returning minimal metadata")
            return YouTubeMetaData(video_id=video_id)

        ydl_opts = {
            "quiet": True,
            "no_warnings": True,
            "extract_flat": False,
            "skip_download": True,
            "geo_bypass": True,
        }

        # Add cookies if available
        cookies_file = os.environ.get("YTDLP_COOKIES_FILE")
        if cookies_file:
            ydl_opts["cookiefile"] = cookies_file

        try:
            with YoutubeDL(ydl_opts) as ydl:
                info = ydl.extract_info(url, download=False)

                # Parse upload date
                upload_date = None
                if info.get("upload_date"):
                    try:
                        upload_date = datetime.strptime(info["upload_date"], "%Y%m%d")
                    except ValueError:
                        pass

                return YouTubeMetaData(
                    video_id=video_id,
                    original_title=info.get("title"),
                    original_description=info.get("description", ""),
                    channel_name=info.get("uploader") or info.get("channel"),
                    channel_id=info.get("channel_id"),
                    upload_date=upload_date,
                    duration_seconds=info.get("duration"),
                    view_count=info.get("view_count"),
                    like_count=info.get("like_count"),
                    comment_count=info.get("comment_count"),
                    thumbnail_url=info.get("thumbnail"),
                    category=info.get("categories", [None])[0]
                    if info.get("categories")
                    else None,
                    original_tags=info.get("tags", []) or [],
                    is_live=info.get("is_live", False),
                    is_short=info.get("duration", 0) <= 60 and "shorts" in url.lower(),
                    language=info.get("language"),
                )
        except Exception as e:
            self.logger.error(f"Failed to extract metadata: {e}")
            return YouTubeMetaData(video_id=video_id)


class YouTubeTranscriptExtractor:
    """Extracts transcript/captions from YouTube videos"""

    def __init__(self):
        self.logger = logging.getLogger(__name__)

    def extract_transcript(
        self, video_id: str
    ) -> Tuple[str, List[TranscriptSegment], str, str]:
        """
        Extract transcript from YouTube video.

        Returns:
            Tuple of (full_text, segments, language, source)
        """
        # Try YouTube Transcript API first
        try:
            return self._extract_via_youtube_api(video_id)
        except Exception as e:
            self.logger.warning(f"YouTube Transcript API failed: {e}")

        # Return empty if no transcript available
        # Whisper fallback will be handled at orchestrator level if needed
        return "", [], "", "unavailable"

    def _extract_via_youtube_api(
        self, video_id: str
    ) -> Tuple[str, List[TranscriptSegment], str, str]:
        """Extract transcript using youtube_transcript_api"""
        try:
            from youtube_transcript_api import YouTubeTranscriptApi
            from youtube_transcript_api._errors import (
                NoTranscriptFound,
                TranscriptsDisabled,
                VideoUnavailable,
            )
        except ImportError:
            raise RuntimeError("youtube_transcript_api not installed")

        try:
            api = YouTubeTranscriptApi()
            transcript_data = None
            source = "unavailable"
            language = "en"

            try:
                # Try English variants first
                transcript_data = api.fetch(
                    video_id, languages=["en", "en-US", "en-GB"]
                )
                source = "youtube_en"
            except (NoTranscriptFound, TranscriptsDisabled, VideoUnavailable):
                try:
                    # List all available transcripts and pick the first one
                    transcript_list = api.list(video_id)
                    available_transcripts = list(transcript_list)

                    if available_transcripts:
                        # Prefer manually created transcripts over auto-generated
                        manual_transcripts = [
                            t for t in available_transcripts if not t.is_generated
                        ]
                        auto_transcripts = [
                            t for t in available_transcripts if t.is_generated
                        ]

                        selected_transcript = None
                        if manual_transcripts:
                            selected_transcript = manual_transcripts[0]
                            source = "youtube_manual"
                        elif auto_transcripts:
                            selected_transcript = auto_transcripts[0]
                            source = "youtube_auto"

                        if selected_transcript:
                            language = selected_transcript.language_code
                            transcript_data = selected_transcript.fetch()
                            self.logger.info(
                                f"Using {source} transcript in language: {language}"
                            )
                        else:
                            raise RuntimeError(
                                f"No usable transcript found for video {video_id}"
                            )
                    else:
                        raise RuntimeError(
                            f"No transcripts available for video {video_id}"
                        )
                except (NoTranscriptFound, TranscriptsDisabled, VideoUnavailable) as e:
                    # No transcript available - will fall back to Whisper
                    raise RuntimeError(
                        f"No transcript available for video {video_id}: {e}"
                    )

            if not transcript_data:
                raise RuntimeError(f"No transcript data found for video {video_id}")

            # Build segments and full text
            segments = []
            texts = []

            # Access objects as attributes (not dictionary items)
            for item in transcript_data:
                segment = TranscriptSegment(
                    start=item.start,
                    end=item.start + item.duration,
                    text=item.text,
                    duration=item.duration,
                )
                segments.append(segment)
                texts.append(item.text)

            full_text = " ".join(texts)

            return full_text, segments, language, source

        except (NoTranscriptFound, TranscriptsDisabled, VideoUnavailable) as e:
            raise RuntimeError(f"Transcript not available: {e}")


class YouTubeContentGenerator:
    """Generates enhanced content (title, description, summary, tags) using LLM"""

    def __init__(self):
        self.logger = logging.getLogger(__name__)
        self._groq_client = None

    def _get_groq_client(self):
        """Lazy load Groq client"""
        if self._groq_client is None:
            try:
                from app.clients.groq.groq_client import get_groq_client

                self._groq_client = get_groq_client()
            except Exception as e:
                self.logger.error(f"Failed to initialize Groq client: {e}")
                raise
        return self._groq_client

    async def generate_content(
        self,
        transcript: str,
        original_title: Optional[str],
        original_description: Optional[str],
        channel_name: Optional[str],
        duration_seconds: Optional[int],
    ) -> Dict[str, Any]:
        """
        Generate enhanced title, description, summary, and tags using Groq LLM.

        Returns dict with: title, description, summary, tags, category
        """
        try:
            client = self._get_groq_client()

            # Prepare context
            context_parts = []
            if original_title:
                context_parts.append(f"Original Title: {original_title}")
            if channel_name:
                context_parts.append(f"Channel: {channel_name}")
            if duration_seconds:
                context_parts.append(f"Duration: {format_duration(duration_seconds)}")

            context = "\n".join(context_parts)

            # Truncate transcript for LLM (keep first 4000 chars for context)
            transcript_excerpt = (
                transcript[:4000] if len(transcript) > 4000 else transcript
            )

            # Single comprehensive prompt for all generation tasks
            prompt = f"""Analyze this YouTube video and generate metadata. Focus on extracting KEY information from the transcript.

VIDEO CONTEXT:
{context}

TRANSCRIPT EXCERPT:
{transcript_excerpt}

Generate ONLY a valid JSON object with these EXACT fields (do not include explanations or markdown):
{{
  "title": "A clear, concise title (max 70 chars) that describes the main topic of the video",
  "description": "A 2-3 sentence description (max 200 chars) explaining what the video is about and what viewers will learn",
  "summary": "A detailed 3-5 sentence summary of the video content based on the transcript",
  "tags": ["tag1", "tag2", "tag3", "tag4", "tag5"],
  "category": "education"
}}

IMPORTANT: 
- Return ONLY valid JSON, no markdown formatting, no code blocks, no explanations
- The "description" field MUST be 2-3 complete sentences
- All fields must be present
- Tags should be relevant keywords/topics from the video
- Category must be one of: education, technology, entertainment, music, gaming, news, tutorial, review, vlog, sports, cooking, travel, science, business, health, comedy, documentary, how-to, interview, other"""

            response = client.chat.completions.create(
                model=os.getenv("GROQ_MODEL", "llama-3.3-70b-versatile"),
                messages=[
                    {
                        "role": "system",
                        "content": "You are a content analysis expert. Generate accurate, engaging metadata for videos. Always respond with valid JSON only.",
                    },
                    {"role": "user", "content": prompt},
                ],
                temperature=0.3,
                max_tokens=1000,
            )

            result_text = response.choices[0].message.content.strip()

            # Parse JSON response
            import json

            # Clean up potential markdown code blocks
            if result_text.startswith("```"):
                result_text = re.sub(r"^```(?:json)?\n?", "", result_text)
                result_text = re.sub(r"\n?```$", "", result_text)

            result = json.loads(result_text)

            # Validate that description was generated
            description = result.get("description", "").strip()
            if not description:
                self.logger.warning(
                    f"LLM returned empty description. Full response: {result}"
                )

            return {
                "title": result.get("title", original_title or "Untitled Video"),
                "description": description,
                "summary": result.get("summary", ""),
                "tags": result.get("tags", []),
                "category": result.get("category", "other"),
            }

        except Exception as e:
            self.logger.error(f"LLM content generation failed: {e}")
            import traceback

            self.logger.error(f"Traceback: {traceback.format_exc()}")
            # Fallback to basic extraction
            return self._fallback_generation(
                transcript, original_title, original_description
            )

    def _fallback_generation(
        self,
        transcript: str,
        original_title: Optional[str],
        original_description: Optional[str],
    ) -> Dict[str, Any]:
        """Fallback content generation without LLM"""
        # Use original title or extract from first sentence
        title = original_title or "YouTube Video"

        # Generate basic summary from first few sentences
        sentences = re.split(r"[.!?]+", transcript)
        summary = ". ".join(sentences[:3]).strip()
        if summary and not summary.endswith("."):
            summary += "."

        # Basic description
        description = (
            original_description[:200] if original_description else summary[:200]
        )

        # Extract basic tags using frequency analysis
        tags = self._extract_basic_tags(transcript)

        return {
            "title": title,
            "description": description,
            "summary": summary,
            "tags": tags,
            "category": "other",
        }

    def _extract_basic_tags(self, text: str, top_k: int = 8) -> List[str]:
        """Extract basic tags using word frequency"""
        # Common stopwords to filter out
        stopwords = {
            "about",
            "after",
            "again",
            "also",
            "among",
            "because",
            "before",
            "being",
            "between",
            "could",
            "their",
            "there",
            "which",
            "would",
            "these",
            "other",
            "where",
            "while",
            "those",
            "using",
            "have",
            "from",
            "this",
            "that",
            "with",
            "what",
            "when",
            "will",
            "your",
            "more",
            "some",
            "into",
            "them",
            "been",
            "than",
            "then",
            "very",
            "just",
            "over",
            "such",
            "only",
            "like",
            "going",
            "know",
            "really",
            "right",
            "think",
            "video",
            "youtube",
            "watch",
            "channel",
        }

        # Extract words (4+ chars)
        words = re.findall(r"\b[a-z]{4,}\b", text.lower())

        # Count frequencies
        freq = {}
        for word in words:
            if word not in stopwords:
                freq[word] = freq.get(word, 0) + 1

        # Sort by frequency and return top tags
        sorted_words = sorted(freq.items(), key=lambda x: x[1], reverse=True)
        return [word for word, _ in sorted_words[:top_k]]


class YouTubeTagGenerator:
    """Generates tags with confidence scores using zero-shot classification"""

    def __init__(self):
        self.logger = logging.getLogger(__name__)

    async def generate_tags(
        self, text: str, existing_tags: List[str] = None, top_k: int = 10
    ) -> List[GeneratedTag]:
        """
        Generate tags with confidence scores using centralized Groq-based tag generator.
        """
        try:
            from app.services.refiners.tag_generators import generate_tags

            # Use the central tag generation service
            response = await generate_tags(text=text, top_k=top_k)

            if response.success:
                return [
                    GeneratedTag(
                        tag=tag.name, confidence=tag.score, slug=self._to_slug(tag.name)
                    )
                    for tag in response.tags
                ]

            self.logger.warning(f"Central tag generation failed: {response.errors}")

        except Exception as e:
            self.logger.warning(f"Central tag generation service failed: {e}")

        # Fallback to existing tags if any
        if existing_tags:
            return [
                GeneratedTag(tag=tag, confidence=0.8, slug=self._to_slug(tag))
                for tag in existing_tags[:top_k]
            ]
        return []

    def _to_slug(self, text: str) -> str:
        """Convert text to URL-friendly slug"""
        slug = text.lower().strip()
        slug = re.sub(r"[^\w\s-]", "", slug)
        slug = re.sub(r"[-\s]+", "-", slug)
        return slug


class YouTubeExtractorEngine:
    """
    Main YouTube video extraction engine.

    Orchestrates:
    1. Video ID extraction from URL
    2. Metadata extraction via yt-dlp
    3. Transcript extraction via YouTube API or Whisper
    4. Content generation (title, description, summary) via LLM
    5. Tag generation via zero-shot classification
    """

    def __init__(self):
        self.logger = logging.getLogger(__name__)
        self.metadata_extractor = YouTubeMetadataExtractor()
        self.transcript_extractor = YouTubeTranscriptExtractor()
        self.content_generator = YouTubeContentGenerator()
        self.tag_generator = YouTubeTagGenerator()

    async def extract(
        self, request: YouTubeExtractionRequest
    ) -> YouTubeExtractionResponse:
        """
        Extract all content from a YouTube video.

        Returns YouTubeExtractionResponse with metadata, transcript,
        generated content, and tags.
        """
        start_time = time.time()
        url = str(request.url)
        errors = []

        # Initialize response
        response = YouTubeExtractionResponse(url=url, extracted_time=datetime.now())

        try:
            # Step 1: Extract video ID
            video_id = extract_video_id(url)
            if not video_id:
                raise ValueError(f"Could not extract video ID from URL: {url}")

            self.logger.info(f"Extracting YouTube video: {video_id}")

            # Step 2: Extract metadata
            try:
                meta_data = self.metadata_extractor.extract_metadata(url, video_id)
                response.meta_data = meta_data
            except Exception as e:
                self.logger.warning(f"Metadata extraction failed: {e}")
                errors.append(
                    YouTubeExtractionError(
                        error_type="metadata_extraction",
                        message=str(e),
                        component="YouTubeMetadataExtractor",
                        recoverable=True,
                    )
                )
                meta_data = YouTubeMetaData(video_id=video_id)
                response.meta_data = meta_data

            # Step 3: Extract transcript
            full_transcript = ""
            transcript_segments = []
            transcript_language = ""
            transcript_source = ""

            try:
                (
                    full_transcript,
                    transcript_segments,
                    transcript_language,
                    transcript_source,
                ) = self.transcript_extractor.extract_transcript(video_id)
                self.logger.info(
                    f"Transcript extracted via {transcript_source}, length: {len(full_transcript)}"
                )
            except Exception as e:
                self.logger.warning(f"Transcript extraction failed: {e}")
                errors.append(
                    YouTubeExtractionError(
                        error_type="transcript_extraction",
                        message=str(e),
                        component="YouTubeTranscriptExtractor",
                        recoverable=True,
                    )
                )
                # Try Whisper fallback
                try:
                    full_transcript, transcript_segments = await self._whisper_fallback(
                        url
                    )
                    transcript_source = "whisper"
                    self.logger.info(
                        f"Whisper fallback successful, length: {len(full_transcript)}"
                    )
                except Exception as we:
                    self.logger.error(f"Whisper fallback also failed: {we}")
                    errors.append(
                        YouTubeExtractionError(
                            error_type="whisper_fallback",
                            message=str(we),
                            component="WhisperTranscription",
                            recoverable=False,
                        )
                    )

            # Step 4: Generate content (title, description, summary)
            generated_content = {
                "title": meta_data.original_title or "YouTube Video",
                "description": meta_data.original_description or "",
                "summary": "",
                "tags": [],
                "category": "other",
            }

            if full_transcript:
                try:
                    generated_content = await self.content_generator.generate_content(
                        transcript=full_transcript,
                        original_title=meta_data.original_title,
                        original_description=meta_data.original_description,
                        channel_name=meta_data.channel_name,
                        duration_seconds=meta_data.duration_seconds,
                    )
                except Exception as e:
                    self.logger.warning(f"Content generation failed: {e}")
                    errors.append(
                        YouTubeExtractionError(
                            error_type="content_generation",
                            message=str(e),
                            component="YouTubeContentGenerator",
                            recoverable=True,
                        )
                    )

            # Step 5: Generate tags with confidence scores
            tags = []
            if full_transcript:
                try:
                    tags = await self.tag_generator.generate_tags(
                        text=full_transcript,
                        existing_tags=generated_content.get("tags", []),
                        top_k=10,
                    )
                except Exception as e:
                    self.logger.warning(f"Tag generation failed: {e}")
                    # Use tags from content generator as fallback
                    tags = [
                        GeneratedTag(
                            tag=t,
                            confidence=0.7,
                            slug=re.sub(r"[^\w-]", "-", t.lower()),
                        )
                        for t in generated_content.get("tags", [])
                    ]

            # Build cleaned data
            cleaned_data = YouTubeCleanedData(
                generated_title=generated_content.get("title", ""),
                generated_description=generated_content.get("description", ""),
                generated_summary=generated_content.get("summary", ""),
                full_transcript=full_transcript,
                transcript_segments=transcript_segments,
                transcript_language=transcript_language,
                transcript_source=transcript_source,
                word_count=len(full_transcript.split()) if full_transcript else 0,
                duration_formatted=format_duration(meta_data.duration_seconds)
                if meta_data.duration_seconds
                else "",
            )

            # Update response
            response.success = True
            response.cleaned_data = cleaned_data
            response.tags = tags
            response.detected_category = generated_content.get("category", "other")
            response.errors = errors
            response.processing_time_ms = int((time.time() - start_time) * 1000)

            return response

        except Exception as e:
            self.logger.error(f"YouTube extraction failed: {e}")
            response.success = False
            response.errors.append(
                YouTubeExtractionError(
                    error_type="extraction_failed",
                    message=str(e),
                    component="YouTubeExtractorEngine",
                    recoverable=False,
                )
            )
            response.processing_time_ms = int((time.time() - start_time) * 1000)
            return response

    async def _whisper_fallback(self, url: str) -> Tuple[str, List[TranscriptSegment]]:
        """Download audio and transcribe with Whisper as fallback"""
        import asyncio
        from .preprocessor import download_audio_for_transcription

        # Download audio
        audio_path = await asyncio.to_thread(download_audio_for_transcription, url)

        # Transcribe with Whisper
        try:
            import whisper
        except ImportError:
            raise RuntimeError("whisper is required for audio transcription")

        def transcribe():
            model = whisper.load_model("base")  # Use smaller model for speed
            result = model.transcribe(audio_path)

            segments = []
            for s in result.get("segments", []):
                segments.append(
                    TranscriptSegment(
                        start=s["start"],
                        end=s["end"],
                        text=s["text"],
                        duration=s["end"] - s["start"],
                    )
                )

            full_text = result.get("text", "")
            return full_text, segments

        import asyncio

        full_text, segments = await asyncio.to_thread(transcribe)

        # Cleanup temp file
        try:
            import os

            if os.path.exists(audio_path):
                os.remove(audio_path)
        except Exception as e:
            self.logger.warning(
                f"Failed to delete temp audio file: {audio_path}. Error: {e}"
            )
            pass

        return full_text, segments
