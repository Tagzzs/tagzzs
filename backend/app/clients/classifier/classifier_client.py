"""
Centralized Zero-Shot Classifier Client

Manages singleton zero-shot classification pipeline to avoid:
- Repeated model loading (slow, memory intensive)
- CUDA memory leaks from multiple model instances
- Cache issues requiring __pycache__ removal

Thread-safe singleton pattern ensures:
- Model loaded once per process
- Proper CUDA memory management
- Consistent device usage
"""

import logging
import os
import threading
from typing import Optional, Any, List, Dict

logger = logging.getLogger(__name__)

# Thread-safe singleton
_classifier_pipeline = None
_classifier_lock = threading.Lock()
_classifier_device = None


class ClassifierClientManager:
    """
    Manages zero-shot classification pipeline lifecycle.
    
    Usage:
        classifier = ClassifierClientManager.get_classifier()
        result = classifier(text, candidate_labels, multi_label=True)
    """
    
    _instance: Optional['ClassifierClientManager'] = None
    _lock = threading.Lock()
    
    def __init__(self, model_name: Optional[str] = None, device: Optional[int] = None):
        """
        Initialize classifier pipeline.
        
        Args:
            model_name: HuggingFace model name. Defaults to facebook/bart-large-mnli
            device: GPU device index or -1 for CPU. Defaults to auto-detect.
        """
        try:
            from transformers import pipeline
            import torch
        except ImportError:
            raise ImportError("transformers and torch packages required. Install with: pip install transformers torch")
        
        self.model_name = model_name or os.environ.get("VIDEO_TAG_MODEL", "facebook/bart-large-mnli")
        
        # Handle 'small' model alias
        if self.model_name == "small":
            self.model_name = "typeform/distilbert-base-uncased-mnli"
        
        # Auto-detect device
        if device is None:
            self.device = 0 if torch.cuda.is_available() else -1
        else:
            self.device = device
        
        device_name = f"cuda:{self.device}" if self.device >= 0 else "cpu"
        logger.info(f"Initializing zero-shot classifier on {device_name} with model: {self.model_name}")
        
        try:
            self.classifier = pipeline(
                "zero-shot-classification",
                model=self.model_name,
                device=self.device
            )
            logger.info(f"✅ Zero-shot classifier initialized successfully on {device_name}")
        except Exception as e:
            logger.error(f"Failed to initialize classifier: {str(e)}")
            raise
    
    @classmethod
    def get_instance(cls, model_name: Optional[str] = None, force_reinit: bool = False) -> 'ClassifierClientManager | None':
        """
        Get or create singleton instance of ClassifierClientManager.
        
        Thread-safe implementation using double-checked locking.
        
        Args:
            model_name: Optional model name. If different from current, will reinitialize.
            force_reinit: Force reinitialization even if instance exists.
            
        Returns:
            ClassifierClientManager singleton instance or None if initialization fails
        """
        # Check if we need to reinitialize
        needs_reinit = (
            cls._instance is None or 
            force_reinit or
            (model_name is not None and cls._instance.model_name != model_name)
        )
        
        if needs_reinit:
            with cls._lock:
                # Double-check after acquiring lock
                if cls._instance is None or force_reinit or (model_name is not None and cls._instance.model_name != model_name):
                    try:
                        # Clean up old instance if exists
                        if cls._instance is not None:
                            cls._cleanup_instance()
                        cls._instance = cls(model_name)
                    except Exception as e:
                        logger.error(f"Failed to create ClassifierClientManager: {str(e)}")
                        raise
        return cls._instance
    
    @classmethod
    def _cleanup_instance(cls):
        """Clean up CUDA memory from old instance"""
        try:
            import torch
            if cls._instance is not None:
                del cls._instance.classifier
                cls._instance = None
                if torch.cuda.is_available():
                    torch.cuda.empty_cache()
                logger.info("Cleaned up previous classifier instance")
        except Exception as e:
            logger.warning(f"Error during classifier cleanup: {e}")
    
    @classmethod
    def get_classifier(cls, model_name: Optional[str] = None) -> Any:
        """
        Get the underlying classifier pipeline.
        
        Args:
            model_name: Optional model name.
            
        Returns:
            transformers pipeline for zero-shot classification
        """
        manager = cls.get_instance(model_name)
        if manager is None:
            raise RuntimeError("Failed to initialize ClassifierClientManager")
        return manager.classifier
    
    @classmethod
    def reset(cls):
        """Reset the singleton instance. Useful for testing or memory cleanup."""
        with cls._lock:
            cls._cleanup_instance()
            logger.info("ClassifierClientManager singleton reset")
    
    def classify(
        self,
        text: str,
        candidate_labels: List[str],
        multi_label: bool = True,
        truncate: bool = True,
        max_length: int = 3000
    ) -> Any:
        """
        Classify text with candidate labels.
        
        Args:
            text: Text to classify
            candidate_labels: List of possible labels
            multi_label: Whether multiple labels can apply
            truncate: Whether to truncate long text
            max_length: Maximum text length if truncating
            
        Returns:
            Classification result with 'labels' and 'scores'
        """
        if truncate and len(text) > max_length:
            text = text[:max_length]
        
        return self.classifier(text, candidate_labels, multi_label=multi_label)


def get_classifier(model_name: Optional[str] = None) -> Any:
    """
    Convenience function to get zero-shot classifier pipeline.
    
    Returns:
        transformers pipeline for zero-shot classification
        
    Example:
        classifier = get_classifier()
        result = classifier("This is about AI", ["technology", "sports", "cooking"])
    """
    return ClassifierClientManager.get_classifier(model_name)


def classify_text(
    text: str,
    candidate_labels: List[str],
    multi_label: bool = True,
    model_name: Optional[str] = None
) -> Dict[str, Any]:
    """
    Convenience function to classify text.
    
    Args:
        text: Text to classify
        candidate_labels: List of possible labels
        multi_label: Whether multiple labels can apply
        model_name: Optional model name
        
    Returns:
        Classification result dict with 'labels' and 'scores'
        
    Example:
        result = classify_text("Python tutorial", ["programming", "cooking", "sports"])
        print(result['labels'][0])  # "programming"
    """
    manager = ClassifierClientManager.get_instance(model_name)
    if manager is None:
        raise RuntimeError("Failed to initialize ClassifierClientManager")
    return manager.classify(text, candidate_labels, multi_label=multi_label)


def reset_classifier():
    """Reset classifier to free CUDA memory"""
    ClassifierClientManager.reset()
