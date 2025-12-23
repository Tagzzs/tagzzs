"""
YouTube Extraction Output Structuring

Converts YouTubeExtractionResponse to standardized API response format.
"""

from typing import Dict, Any

from .models import YouTubeExtractionResponse


def structure_youtube_extraction_output(
    response: YouTubeExtractionResponse,
) -> Dict[str, Any]:
    """
    Structure YouTube extraction response for API output.

    Args:
        response: YouTubeExtractionResponse from extraction pipeline

    Returns:
        Structured dictionary for JSON API response
    """
    # Build tags list
    tags = []
    if response.tags:
        tags = [
            {"tag": t.tag, "confidence": t.confidence, "slug": t.slug}
            for t in response.tags
        ]

    # Build errors list
    errors = []
    if response.errors:
        errors = [
            {
                "type": e.error_type,
                "message": e.message,
                "component": e.component,
                "recoverable": e.recoverable,
            }
            for e in response.errors
        ]

    # Build metadata section
    metadata = {}
    if response.meta_data:
        metadata = {
            "videoId": response.meta_data.video_id,
            "originalTitle": response.meta_data.original_title,
            "originalDescription": response.meta_data.original_description,
            "channelName": response.meta_data.channel_name,
            "channelId": response.meta_data.channel_id,
            "uploadDate": response.meta_data.upload_date.isoformat()
            if response.meta_data.upload_date
            else None,
            "durationSeconds": response.meta_data.duration_seconds,
            "viewCount": response.meta_data.view_count,
            "likeCount": response.meta_data.like_count,
            "commentCount": response.meta_data.comment_count,
            "thumbnailUrl": response.meta_data.thumbnail_url,
            "category": response.meta_data.category,
            "originalTags": response.meta_data.original_tags,
            "isLive": response.meta_data.is_live,
            "isShort": response.meta_data.is_short,
            "language": response.meta_data.language,
        }

    # Build content section
    content = {}
    if response.cleaned_data:
        content = {
            "title": response.cleaned_data.generated_title,
            "description": response.cleaned_data.generated_description,
            "summary": response.cleaned_data.generated_summary,
            "transcript": response.cleaned_data.full_transcript,
            "transcriptLanguage": response.cleaned_data.transcript_language,
            "transcriptSource": response.cleaned_data.transcript_source,
            "wordCount": response.cleaned_data.word_count,
            "durationFormatted": response.cleaned_data.duration_formatted,
        }

    return {
        "success": response.success,
        "url": response.url,
        "contentType": response.content_type,
        "detectedCategory": response.detected_category,
        "metadata": metadata,
        "content": content,
        "tags": tags,
        "processingTimeMs": response.processing_time_ms,
        "extractedTime": response.extracted_time.isoformat()
        if response.extracted_time
        else None,
        "errors": errors,
    }


def structure_youtube_for_refine_response(
    response: YouTubeExtractionResponse, include_transcript: bool = True
) -> Dict[str, Any]:
    """
    Structure YouTube extraction for extract-refine endpoint response.

    This format matches the standardized response from format_extract_refine_response
    used by other extractors (PDF, website, image).

    Args:
        response: YouTubeExtractionResponse from extraction pipeline
        include_transcript: Whether to include full transcript in rawContent

    Returns:
        Structured dictionary matching extract-refine response format
    """
    from app.utils.reading_time import calculate_reading_time
    from app.utils.response_formatter import (
        generate_request_id,
        get_current_timestamp,
        extract_domain_info,
    )

    # Get generated content
    title = ""
    summary = ""
    description = ""
    word_count = 0
    transcript = ""

    if response.cleaned_data:
        title = response.cleaned_data.generated_title or ""
        summary = response.cleaned_data.generated_summary or ""
        description = response.cleaned_data.generated_description or ""
        word_count = response.cleaned_data.word_count or 0
        transcript = response.cleaned_data.full_transcript or ""

    # Fall back to original title if generated is empty
    if not title and response.meta_data:
        title = response.meta_data.original_title or "YouTube Video"

    # Get tags as list of strings
    tags = [t.tag for t in response.tags] if response.tags else []

    # Calculate reading time from summary
    reading_time = (
        calculate_reading_time(summary)
        if summary
        else {"minutes": 0, "seconds": 0, "formatted": "0 min"}
    )

    # Extract domain info
    domain_info = extract_domain_info(response.url)

    # Build response matching format_extract_refine_response structure
    return {
        "result": "success" if response.success else "error",
        "metadata": {
            "originalUrl": response.url,
            "normalizedUrl": response.url,
            "domain": domain_info["domain"],
            "subdomain": domain_info["subdomain"],
            "contentType": "youtube",
            "videoId": response.meta_data.video_id if response.meta_data else None,
            "channelName": response.meta_data.channel_name
            if response.meta_data
            else None,
            "durationSeconds": response.meta_data.duration_seconds
            if response.meta_data
            else None,
            "thumbnailUrl": response.meta_data.thumbnail_url
            if response.meta_data
            else None,
            "detectedCategory": response.detected_category,
        },
        "content": {
            "title": title,
            "description": description,
            "summary": summary,
            "metadata": {
                "wordCount": len(summary.split()) if summary else 0,
                "readingTime": reading_time,
                "style": "detailed",
                "originalLength": len(transcript) if transcript else 0,
                "transcriptWordCount": word_count,
            },
            "tags": tags,
            "rawContent": transcript if include_transcript else "",
        },
        "requestId": generate_request_id(),
        "timestamp": get_current_timestamp(),
        "processingTimeMs": response.processing_time_ms,
        "errors": [
            {"type": e.error_type, "message": e.message} for e in response.errors
        ]
        if response.errors
        else [],
    }
