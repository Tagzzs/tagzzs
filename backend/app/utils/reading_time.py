"""Utility function to calculate reading time"""

import math


def calculate_reading_time(text: str, words_per_minute: int = 200) -> int:
    """
    Calculate reading time in minutes for given text.

    Args:
        text: The text content to calculate reading time for
        words_per_minute: Average reading speed (default: 200 wpm)

    Returns:
        Reading time in minutes (rounded up)

    Example:
        >>> calculate_reading_time("This is a sample text. " * 100)
        2
    """
    if not text or not isinstance(text, str):
        return 0

    words = len(text.split())

    reading_time = math.ceil(words / words_per_minute)

    return max(1, reading_time)
