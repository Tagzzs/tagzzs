"""
Image OCR Extraction Package

Complete image OCR extraction pipeline with PyTesseract integration.
Supports confidence scoring, text region detection, and structured output.

Main Components:
- models: Data structures for image extraction
- preprocessor: Image enhancement and optimization
- extractor: OCR engine with confidence scoring  
- post_processor: Text cleaning and structuring
- orchestrator: Pipeline coordination
- output_structuring: JSON response formatting
- error_handling: Error management and recovery

Usage:
    from app.services.extractors.image import extract_image_content
    
    # Extract text from image URL
    response = await extract_image_content("https://example.com/image.jpg")
"""

from .orchestrator import (
    ImageExtractionOrchestrator,
    extract_image_content,
    check_image_pipeline_health
)

from .models import (
    ImageExtractionRequest,
    ImageExtractionResponse,
    TextRegion,
    BoundingBox,
    ConfidenceScore,
    ImageMetaData,
    CleanedImageData,
    ImageExtractionError
)

from .extractor import ImageExtractorEngine
from .preprocessor import ImagePreprocessor
from .post_processor import ImagePostProcessor
from .output_structuring import (
    ImageOutputStructurer,
    structure_image_extraction_output
)
from .error_handling import ImageErrorHandler, ImageErrorCategory

# Main extraction function
__all__ = [
    # Core extraction functionality
    "extract_image_content",
    "check_image_pipeline_health",
    
    # Main components
    "ImageExtractionOrchestrator",
    "ImageExtractorEngine", 
    "ImagePreprocessor",
    "ImagePostProcessor",
    "ImageOutputStructurer",
    "ImageErrorHandler",
    
    # Data models
    "ImageExtractionRequest",
    "ImageExtractionResponse", 
    "TextRegion",
    "BoundingBox",
    "ConfidenceScore",
    "ImageMetaData",
    "CleanedImageData",
    "ImageExtractionError",
    
    # Utilities
    "structure_image_extraction_output",
    "ImageErrorCategory"
]

# Package metadata
__version__ = "1.0.0"
__description__ = "Image OCR extraction pipeline with PyTesseract"
__architecture_pattern__ = "url_input → preprocessing → ocr → post_processing → output_structuring → response"