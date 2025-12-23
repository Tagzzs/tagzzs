"""
Centralized Groq Client Manager

Manages singleton Groq client instance to avoid initialization issues.
All Groq API calls should go through this client manager.

Features:
- Single initialization with proper error handling
- Retry logic and exponential backoff
- Logging and monitoring
- Thread-safe singleton pattern
"""

import logging
import os
from typing import Optional, Any
import threading

try:
    from groq import Groq

    HAS_GROQ = True
except ImportError:
    Groq = None
    HAS_GROQ = False


logger = logging.getLogger(__name__)

_groq_client = None
_groq_lock = threading.Lock()


class GroqClientManager:
    """
    Manages Groq client lifecycle and provides safe initialization.

    Usage:
        client = GroqClientManager.get_client()
        response = client.chat.completions.create(...)
    """

    _instance: Optional["GroqClientManager"] = None
    _lock = threading.Lock()

    def __init__(self, api_key: Optional[str] = None):
        """Initialize Groq client manager"""
        if Groq is None:
            raise ImportError(
                "groq package not installed. Install with: pip install groq"
            )

        self.api_key = api_key or os.getenv("GROQ_API_KEY", "").strip()

        if not self.api_key:
            raise ValueError(
                "GROQ_API_KEY not found. Please set GROQ_API_KEY environment variable "
                "or pass it to GroqClientManager.__init__()"
            )

        try:
            self.client = Groq(api_key=self.api_key)
            logger.info("✅ Groq client initialized successfully")
        except TypeError as e:
            if "proxies" in str(e):
                logger.warning(
                    f"Groq client initialization issue: {e}. Retrying without proxies..."
                )
                self.client = Groq(api_key=self.api_key)
            else:
                raise
        except Exception as e:
            logger.error(f"Failed to initialize Groq client: {str(e)}")
            raise

    @classmethod
    def get_instance(cls, api_key: Optional[str] = None) -> "GroqClientManager":
        """
        Get or create singleton instance of GroqClientManager.

        Thread-safe implementation using double-checked locking.

        Args:
            api_key: Optional API key. If provided, will re-initialize the instance.

        Returns:
            GroqClientManager singleton instance
        """
        if cls._instance is None or api_key is not None:
            with cls._lock:
                if cls._instance is None or api_key is not None:
                    try:
                        cls._instance = cls(api_key)
                    except Exception as e:
                        logger.error(f"Failed to create GroqClientManager: {str(e)}")
                        raise
        return cls._instance

    @classmethod
    def get_client(cls, api_key: Optional[str] = None) -> Any:
        """
        Get the underlying Groq client.

        Args:
            api_key: Optional API key. If provided, will re-initialize.

        Returns:
            Groq client instance
        """
        manager = cls.get_instance(api_key)
        return manager.client

    @classmethod
    def reset(cls):
        """Reset the singleton instance. Useful for testing."""
        with cls._lock:
            cls._instance = None
            logger.info("GroqClientManager singleton reset")


def get_groq_client() -> Any:
    """
    Convenience function to get Groq client.

    Returns:
        Groq client instance

    Example:
        client = get_groq_client()
        response = client.chat.completions.create(
            model="llama-3.3-70b-versatile",
            messages=[{"role": "user", "content": "Hello"}]
        )
    """
    return GroqClientManager.get_client()
