"""
Centralized Image AI Engine Client

Manages singleton ImageAIEngineHybrid instance to avoid:
- Repeated YOLO/CLIP/BLIP model loading (slow, memory intensive)
- CUDA memory leaks from multiple model instances
- Cache issues requiring __pycache__ removal

Thread-safe singleton pattern ensures:
- Models loaded once per process
- Proper CUDA memory management
- Consistent device usage
"""

import logging
import threading
from typing import Optional, Any

logger = logging.getLogger(__name__)

# Thread-safe singleton
_image_engine = None
_image_engine_lock = threading.Lock()


class ImageEngineManager:
    """
    Manages ImageAIEngineHybrid instance lifecycle.

    Usage:
        engine = ImageEngineManager.get_engine()
        result = engine.analyze_image(None, image_url)
    """

    _instance: Optional[Any] = None
    _lock = threading.Lock()

    def __init__(
        self,
        yolo_model: str = "yolov8s.pt",
        clip_model: str = "openai/clip-vit-base-patch32",
        caption_model: str = "Salesforce/blip-image-captioning-base",
        device: Optional[str] = None,
    ):
        """
        Initialize image AI engine.

        Args:
            yolo_model: YOLO model file path
            clip_model: CLIP model name from HuggingFace
            caption_model: BLIP caption model name
            device: 'cuda' or 'cpu'. Defaults to auto-detect.
        """
        try:
            from app.services.extractors.image.image_ai_engine import ImageAIEngineHybrid
        except ImportError:
            raise ImportError("image_ai_engine module not available")

        logger.info(f"Initializing ImageAIEngine with YOLO={yolo_model}")

        try:
            self.engine = ImageAIEngineHybrid(
                yolo_model=yolo_model,
                clip_model=clip_model,
                caption_model=caption_model,
                device=device,
            )
            logger.info(
                f"✅ ImageAIEngine initialized successfully on device: {self.engine.device}"
            )
        except Exception as e:
            logger.error(f"Failed to initialize image engine: {str(e)}")
            raise

    @classmethod
    def get_instance(
        cls, yolo_model: str = "yolov8s.pt", force_reinit: bool = False
    ) -> "ImageEngineManager":
        """
        Get or create singleton instance of ImageEngineManager.

        Thread-safe implementation using double-checked locking.

        Args:
            yolo_model: YOLO model to use
            force_reinit: Force reinitialization even if instance exists

        Returns:
            ImageEngineManager singleton instance
        """
        if cls._instance is None or force_reinit:
            with cls._lock:
                if cls._instance is None or force_reinit:
                    try:
                        cls._instance = cls(yolo_model=yolo_model)
                    except Exception as e:
                        logger.error(f"Failed to create ImageEngineManager: {str(e)}")
                        raise
        return cls._instance

    @classmethod
    def get_engine(cls, yolo_model: str = "yolov8s.pt") -> Any:
        """
        Get the underlying image AI engine.

        Args:
            yolo_model: YOLO model to use

        Returns:
            ImageAIEngineHybrid instance
        """
        manager = cls.get_instance(yolo_model=yolo_model)
        return manager.engine

    @classmethod
    def _cleanup_instance(cls):
        """Clean up CUDA memory from old instance"""
        try:
            import torch

            if cls._instance is not None:
                del cls._instance.engine
                cls._instance = None
                if torch.cuda.is_available():
                    torch.cuda.empty_cache()
                logger.info("Cleaned up previous image engine instance")
        except Exception as e:
            logger.warning(f"Error during image engine cleanup: {e}")

    @classmethod
    def reset(cls):
        """Reset the singleton instance. Useful for testing or memory cleanup."""
        with cls._lock:
            cls._cleanup_instance()
            logger.info("ImageEngineManager singleton reset")


def get_image_engine(yolo_model: str = "yolov8s.pt") -> Any:
    """
    Convenience function to get image AI engine.

    Args:
        yolo_model: YOLO model to use (default: yolov8s.pt)

    Returns:
        ImageAIEngineHybrid instance

    Example:
        engine = get_image_engine()
        result = engine.analyze_image(None, "https://example.com/image.jpg")
    """
    return ImageEngineManager.get_engine(yolo_model=yolo_model)


def reset_image_engine():
    """Reset image engine to free CUDA memory"""
    ImageEngineManager.reset()
