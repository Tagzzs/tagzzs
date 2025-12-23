"""
YouTube Video Preprocessor

Handles downloading audio/video from YouTube for processing.
Used as fallback when YouTube Transcript API is not available.
"""

import logging
import os
import tempfile
from typing import Optional

logger = logging.getLogger(__name__)


def download_audio_for_transcription(
    url: str,
    target_dir: Optional[str] = None,
    format: str = "mp3",
    quality: str = "192",
) -> str:
    """
    Download audio from YouTube video for Whisper transcription.

    Args:
        url: YouTube video URL
        target_dir: Directory to save the audio file (default: temp directory)
        format: Audio format (default: mp3)
        quality: Audio quality in kbps (default: 192)

    Returns:
        Path to the downloaded audio file

    Raises:
        RuntimeError: If yt-dlp is not available or download fails
    """
    try:
        from yt_dlp import YoutubeDL
    except ImportError:
        raise RuntimeError(
            "yt-dlp is required for downloading YouTube audio. Install with: pip install yt-dlp"
        )

    if target_dir is None:
        target_dir = tempfile.mkdtemp(prefix="youtube_audio_")

    out_template = os.path.join(target_dir, "youtube_audio_%(id)s.%(ext)s")

    # Get environment configuration
    cookies_file = os.environ.get("YTDLP_COOKIES_FILE")
    proxy = os.environ.get("YTDLP_PROXY")
    verbose = os.environ.get("YTDLP_VERBOSE", "").lower() in ("1", "true", "yes")

    ydl_opts = {
        "format": "bestaudio/best",
        "outtmpl": out_template,
        "quiet": not verbose,
        "no_warnings": not verbose,
        "noplaylist": True,
        "geo_bypass": True,
        "http_headers": {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36",
            "Accept-Language": "en-US,en;q=0.9",
        },
        "postprocessors": [
            {
                "key": "FFmpegExtractAudio",
                "preferredcodec": format,
                "preferredquality": quality,
            }
        ],
        "extract_flat": False,
    }

    # Add optional configurations
    if cookies_file and os.path.exists(cookies_file):
        ydl_opts["cookiefile"] = cookies_file
        logger.info(f"Using cookies file: {cookies_file}")

    if proxy:
        ydl_opts["proxy"] = proxy
        logger.info(f"Using proxy: {proxy}")

    try:
        with YoutubeDL(ydl_opts) as ydl:
            logger.info(f"Downloading audio from: {url}")
            info = ydl.extract_info(url, download=True)

            # Get the output filename
            video_id = info.get("id", "unknown")
            expected_filename = os.path.join(
                target_dir, f"youtube_audio_{video_id}.{format}"
            )

            # Check if file exists
            if os.path.exists(expected_filename):
                logger.info(f"Audio downloaded successfully: {expected_filename}")
                return expected_filename

            # Try to find the file if extension is different
            for ext in [format, "webm", "m4a", "opus", "mp3", "wav"]:
                alt_filename = os.path.join(
                    target_dir, f"youtube_audio_{video_id}.{ext}"
                )
                if os.path.exists(alt_filename):
                    logger.info(f"Audio downloaded successfully (alt): {alt_filename}")
                    return alt_filename

            # Last resort: find any audio file in target_dir
            for file in os.listdir(target_dir):
                if file.startswith("youtube_audio_"):
                    filepath = os.path.join(target_dir, file)
                    logger.info(f"Audio downloaded successfully (found): {filepath}")
                    return filepath

            raise RuntimeError(f"Could not find downloaded audio file in {target_dir}")

    except Exception as e:
        logger.error(f"Failed to download audio from {url}: {e}")
        raise RuntimeError(f"Audio download failed: {e}")


def extract_video_metadata_fast(url: str) -> dict:
    """
    Quickly extract video metadata without downloading.

    Args:
        url: YouTube video URL

    Returns:
        Dictionary with video metadata
    """
    try:
        from yt_dlp import YoutubeDL
    except ImportError:
        return {}

    ydl_opts = {
        "quiet": True,
        "no_warnings": True,
        "skip_download": True,
        "extract_flat": False,
    }

    try:
        with YoutubeDL(ydl_opts) as ydl:
            info = ydl.extract_info(url, download=False)
            return {
                "id": info.get("id"),
                "title": info.get("title"),
                "description": info.get("description"),
                "duration": info.get("duration"),
                "uploader": info.get("uploader"),
                "channel_id": info.get("channel_id"),
                "view_count": info.get("view_count"),
                "like_count": info.get("like_count"),
                "upload_date": info.get("upload_date"),
                "thumbnail": info.get("thumbnail"),
                "tags": info.get("tags", []),
                "categories": info.get("categories", []),
            }
    except Exception as e:
        logger.warning(f"Failed to extract metadata: {e}")
        return {}


def cleanup_temp_files(file_path: str) -> bool:
    """
    Clean up temporary audio files after processing.

    Args:
        file_path: Path to the file to clean up

    Returns:
        True if cleanup successful, False otherwise
    """
    try:
        if file_path and os.path.exists(file_path):
            os.remove(file_path)
            logger.debug(f"Cleaned up temp file: {file_path}")

            # Also try to remove parent temp directory if empty
            parent_dir = os.path.dirname(file_path)
            if parent_dir.startswith(tempfile.gettempdir()) and not os.listdir(
                parent_dir
            ):
                os.rmdir(parent_dir)
                logger.debug(f"Cleaned up temp directory: {parent_dir}")

            return True
    except Exception as e:
        logger.warning(f"Failed to cleanup temp file {file_path}: {e}")
    return False


def is_youtube_url(url: str) -> bool:
    """
    Check if a URL is a valid YouTube URL.

    Args:
        url: URL to check

    Returns:
        True if URL is a YouTube URL
    """
    youtube_patterns = [
        "youtube.com/watch",
        "youtu.be/",
        "youtube.com/embed/",
        "youtube.com/shorts/",
        "youtube.com/v/",
        "m.youtube.com/watch",
    ]

    url_lower = url.lower()
    return any(pattern in url_lower for pattern in youtube_patterns)
