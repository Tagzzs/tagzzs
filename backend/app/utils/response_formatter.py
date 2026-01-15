"""Response formatter for extract-refine pipelines"""

import uuid
from datetime import datetime
from typing import Optional, List, Dict, Any
from app.utils.reading_time import calculate_reading_time


def generate_request_id() -> str:
    """Generate unique request ID with timestamp and UUID"""
    timestamp = int(datetime.utcnow().timestamp() * 1000)
    unique_id = str(uuid.uuid4())[:8]
    return f"req_{timestamp}_{unique_id}"


def get_current_timestamp() -> str:
    """Get current timestamp in ISO 8601 format"""
    return datetime.utcnow().isoformat(timespec="milliseconds") + "Z"


def extract_domain_info(url: str) -> Dict[str, str]:
    """
    Extract domain and subdomain from URL.

    Args:
        url: The full URL

    Returns:
        Dictionary with domain and subdomain
    """
    from urllib.parse import urlparse

    parsed = urlparse(url)
    host = parsed.netloc.lower()

    domain = host.replace("www.", "")
    subdomain = "www" if host.startswith("www.") else ""

    return {"domain": domain, "subdomain": subdomain}


def format_extract_refine_response(
    title: str,
    summary: str,
    tags: List[str],
    tags_confidence: Optional[List[float]] = None,
    url: str = "",
    content_type: str = "website",
    original_text_length: int = 0,
    word_count: Optional[int] = None,
    raw_content: str = "",
    thumbnail_url: Optional[str] = None,
) -> Dict[str, Any]:
    """
    Format extract-refine pipeline response in standardized format.

    Args:
        title: Document title
        summary: Generated summary
        tags: List of generated tags
        tags_confidence: Confidence scores for each tag (optional)
        url: Source URL
        content_type: Type of content (website, pdf, image)
        original_text_length: Length of original extracted text
        word_count: Word count of original content (optional)
        raw_content: Raw extracted content for saving/chunking

    Returns:
        Formatted response dictionary
    """
    if word_count is None:
        # original_text_length is char count, estimate ~5 chars per word
        word_count = (
            original_text_length // 5 if isinstance(original_text_length, int) else 0
        )

    summary_word_count = len(summary.split())
    reading_time = calculate_reading_time(summary)

    domain_info = extract_domain_info(url) if url else {"domain": "", "subdomain": ""}

    response = {
        "result": "success",
        "metadata": {
            "originalUrl": url,
            "normalizedUrl": url,
            "domain": domain_info["domain"],
            "subdomain": domain_info["subdomain"],
            "contentType": content_type,
            "thumbnailUrl": thumbnail_url,
        },
        "content": {
            "title": title,
            "summary": summary,
            "metadata": {
                "wordCount": summary_word_count,
                "readingTime": reading_time,
                "style": "detailed",
                "originalLength": original_text_length
                if isinstance(original_text_length, int)
                else len(original_text_length),
            },
            "tags": tags,
            "rawContent": raw_content,
        },
        "requestId": generate_request_id(),
        "timestamp": get_current_timestamp(),
    }

    return response
