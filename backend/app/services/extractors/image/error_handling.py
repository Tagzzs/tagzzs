"""
Image Extraction Error Handling

Comprehensive error handling system for image OCR extraction pipeline.
Provides categorized errors, recovery suggestions, and detailed context.
"""

import logging
from datetime import datetime
from enum import Enum
from typing import Dict, Optional, List, Any

from .models import ImageExtractionResponse


class ImageErrorCategory(Enum):
    """
    Categories of image extraction errors for better error management
    """
    # Input/Download errors
    DOWNLOAD_FAILED = "download_failed"
    INVALID_URL = "invalid_url"
    TIMEOUT = "timeout"
    
    # Image format/quality errors
    UNSUPPORTED_FORMAT = "unsupported_format"
    CORRUPTED_IMAGE = "corrupted_image"
    IMAGE_TOO_LARGE = "image_too_large"
    IMAGE_TOO_SMALL = "image_too_small"
    POOR_QUALITY = "poor_quality"
    
    # OCR processing errors
    OCR_ENGINE_ERROR = "ocr_engine_error"
    TESSERACT_NOT_FOUND = "tesseract_not_found"
    LANGUAGE_NOT_SUPPORTED = "language_not_supported"
    NO_TEXT_DETECTED = "no_text_detected"
    LOW_CONFIDENCE = "low_confidence"
    
    # Preprocessing errors
    PREPROCESSING_FAILED = "preprocessing_failed"
    ORIENTATION_DETECTION_FAILED = "orientation_detection_failed"
    ENHANCEMENT_FAILED = "enhancement_failed"
    
    # Post-processing errors
    TEXT_CLEANING_FAILED = "text_cleaning_failed"
    STRUCTURING_FAILED = "structuring_failed"
    
    # System errors
    MEMORY_ERROR = "memory_error"
    PERMISSION_ERROR = "permission_error"
    UNKNOWN_ERROR = "unknown_error"


class ImageErrorHandler:
    """
    Centralized error handler for image extraction pipeline
    """
    
    def __init__(self):
        """Initialize error handler"""
        self.logger = logging.getLogger(__name__)
    
    def get_error_severity(self, category: ImageErrorCategory) -> str:
        """
        Determine error severity level
        
        Args:
            category: Error category
            
        Returns:
            Severity level (critical, high, medium, low)
        """
        critical_errors = {
            ImageErrorCategory.TESSERACT_NOT_FOUND,
            ImageErrorCategory.MEMORY_ERROR,
            ImageErrorCategory.PERMISSION_ERROR
        }
        
        high_errors = {
            ImageErrorCategory.DOWNLOAD_FAILED,
            ImageErrorCategory.CORRUPTED_IMAGE,
            ImageErrorCategory.UNSUPPORTED_FORMAT,
            ImageErrorCategory.OCR_ENGINE_ERROR
        }
        
        medium_errors = {
            ImageErrorCategory.IMAGE_TOO_LARGE,
            ImageErrorCategory.POOR_QUALITY,
            ImageErrorCategory.PREPROCESSING_FAILED,
            ImageErrorCategory.NO_TEXT_DETECTED
        }
        
        if category in critical_errors:
            return "critical"
        elif category in high_errors:
            return "high"
        elif category in medium_errors:
            return "medium"
        else:
            return "low"
    
    def get_recovery_suggestions(self, category: ImageErrorCategory) -> List[str]:
        """
        Get recovery suggestions for specific error categories
        
        Args:
            category: Error category
            
        Returns:
            List of recovery suggestions
        """
        suggestions = {
            ImageErrorCategory.DOWNLOAD_FAILED: [
                "Check if the URL is accessible",
                "Verify internet connection",
                "Try again later if server is temporarily unavailable",
                "Check if the image requires authentication"
            ],
            
            ImageErrorCategory.UNSUPPORTED_FORMAT: [
                "Convert image to supported format (PNG, JPEG, TIFF, BMP)",
                "Check if image format is correctly identified",
                "Use image conversion tool before processing"
            ],
            
            ImageErrorCategory.CORRUPTED_IMAGE: [
                "Try downloading the image again",
                "Verify image file integrity",
                "Use image repair tools if available",
                "Request a new copy of the image"
            ],
            
            ImageErrorCategory.IMAGE_TOO_LARGE: [
                "Resize image to smaller dimensions",
                "Compress image file size",
                "Process image in sections",
                "Increase system memory limits"
            ],
            
            ImageErrorCategory.POOR_QUALITY: [
                "Enhance image contrast and brightness",
                "Apply noise reduction filters",
                "Increase image resolution if possible",
                "Use manual correction tools"
            ],
            
            ImageErrorCategory.TESSERACT_NOT_FOUND: [
                "Install Tesseract OCR engine",
                "Add Tesseract to system PATH",
                "Verify Tesseract installation",
                "Check pytesseract configuration"
            ],
            
            ImageErrorCategory.NO_TEXT_DETECTED: [
                "Verify image contains readable text",
                "Try different OCR settings or PSM modes",
                "Enhance image quality before OCR",
                "Check if text is in supported language"
            ],
            
            ImageErrorCategory.LOW_CONFIDENCE: [
                "Improve image quality and resolution",
                "Apply preprocessing filters",
                "Try different OCR engine modes",
                "Manually verify extracted text"
            ]
        }
        
        return suggestions.get(category, ["Contact support for assistance"])
    
    def categorize_error(self, exception: Exception, stage: str) -> ImageErrorCategory:
        """
        Categorize error based on exception type and processing stage
        
        Args:
            exception: The exception that occurred
            stage: Processing stage where error occurred
            
        Returns:
            Appropriate error category
        """
        error_message = str(exception).lower()
        
        # Network/download errors
        if "timeout" in error_message or "timed out" in error_message:
            return ImageErrorCategory.TIMEOUT
        elif "connection" in error_message or "network" in error_message:
            return ImageErrorCategory.DOWNLOAD_FAILED
        elif "url" in error_message or "invalid" in error_message and stage == "download":
            return ImageErrorCategory.INVALID_URL
        
        # Image format errors
        elif "format" in error_message or "cannot identify image file" in error_message:
            return ImageErrorCategory.UNSUPPORTED_FORMAT
        elif "truncated" in error_message or "corrupt" in error_message:
            return ImageErrorCategory.CORRUPTED_IMAGE
        
        # Size/quality errors
        elif "too large" in error_message or "memory" in error_message:
            return ImageErrorCategory.IMAGE_TOO_LARGE
        elif "too small" in error_message or "empty" in error_message:
            return ImageErrorCategory.IMAGE_TOO_SMALL
        
        # OCR-specific errors
        elif "tesseract" in error_message:
            if "not found" in error_message or "not installed" in error_message:
                return ImageErrorCategory.TESSERACT_NOT_FOUND
            else:
                return ImageErrorCategory.OCR_ENGINE_ERROR
        elif "language" in error_message and "not supported" in error_message:
            return ImageErrorCategory.LANGUAGE_NOT_SUPPORTED
        
        # Stage-specific categorization
        elif stage == "preprocessing":
            return ImageErrorCategory.PREPROCESSING_FAILED
        elif stage == "ocr":
            return ImageErrorCategory.OCR_ENGINE_ERROR
        elif stage == "post_processing":
            return ImageErrorCategory.TEXT_CLEANING_FAILED
        
        # System errors
        elif isinstance(exception, MemoryError):
            return ImageErrorCategory.MEMORY_ERROR
        elif isinstance(exception, PermissionError):
            return ImageErrorCategory.PERMISSION_ERROR
        
        return ImageErrorCategory.UNKNOWN_ERROR
    
    def create_error_context(self, exception: Exception, stage: str, 
                           url: Optional[str] = None, **kwargs) -> Dict[str, Any]:
        """
        Create detailed error context for debugging
        
        Args:
            exception: The exception that occurred
            stage: Processing stage where error occurred
            url: Image URL if available
            **kwargs: Additional context information
            
        Returns:
            Error context dictionary
        """
        context = {
            "exception_type": type(exception).__name__,
            "exception_message": str(exception),
            "processing_stage": stage,
            "timestamp": datetime.utcnow().isoformat()
        }
        
        if url:
            context["image_url"] = url
        
        # Add any additional context
        context.update(kwargs)
        
        return context


def handle_image_extraction_error(
    response: ImageExtractionResponse,
    exception: Exception,
    stage: str,
    context: Optional[Dict[str, Any]] = None,
    url: Optional[str] = None,
    logger: Optional[logging.Logger] = None
) -> ImageExtractionResponse:
    """
    Main error handling function for image extraction pipeline
    
    Args:
        response: Current response object
        exception: Exception that occurred
        stage: Processing stage where error occurred
        context: Additional context information
        url: Image URL if available
        logger: Logger instance
        
    Returns:
        Updated response object with error information
    """
    handler = ImageErrorHandler()
    
    if logger is None:
        logger = logging.getLogger(__name__)
    
    # Categorize the error
    error_category = handler.categorize_error(exception, stage)
    severity = handler.get_error_severity(error_category)
    suggestions = handler.get_recovery_suggestions(error_category)
    
    # Create detailed error context
    error_context = handler.create_error_context(
        exception, stage, url, **(context or {})
    )
    error_context["severity"] = severity
    error_context["recovery_suggestions"] = suggestions
    
    # Determine confidence impact
    confidence_impact = "high" if severity in ["critical", "high"] else "medium"
    
    # Add error to response
    response.add_error(
        error_type=error_category.value,
        message=str(exception),
        details=error_context,
        stage=stage,
        confidence_impact=confidence_impact
    )
    
    # Log the error
    log_message = f"Image extraction error in {stage}: {error_category.value} - {str(exception)}"
    if severity == "critical":
        logger.critical(log_message)
    elif severity == "high":
        logger.error(log_message)
    elif severity == "medium":
        logger.warning(log_message)
    else:
        logger.info(log_message)
    
    return response


def validate_image_requirements(url: str, max_size_mb: int = 20) -> Optional[str]:
    """
    Validate image requirements before processing
    
    Args:
        url: Image URL to validate
        max_size_mb: Maximum allowed file size in MB
        
    Returns:
        Error message if validation fails, None if successful
    """
    # URL validation
    if not url.startswith(('http://', 'https://')):
        return "URL must start with http:// or https://"
    
    # Basic format check from URL extension
    supported_extensions = {'.png', '.jpg', '.jpeg', '.tiff', '.tif', '.bmp', '.gif'}
    url_lower = url.lower()
    
    if not any(url_lower.endswith(ext) for ext in supported_extensions):
        # This is just a warning, not a hard failure
        # Some images might not have extensions in URL
        pass
    
    return None  # Validation passed