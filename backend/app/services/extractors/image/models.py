"""
Image Content Extractor Models

Data structures for image extraction following ARCHITECTURE.md specifications.
Supports OCR with confidence scores and text region detection.
"""

from datetime import datetime
from typing import Dict, List, Optional, Union
from pydantic import BaseModel, HttpUrl, validator, Field


class ImageExtractionRequest(BaseModel):
    """
    Image extraction request containing URL to image file.
    
    Following architecture spec: Request[url] → Preprocessor → OCR → Post-processor → Response
    """
    url: HttpUrl
    
    @validator('url')
    def validate_image_url(cls, v):
        """Ensure URL is properly formatted and points to an image"""
        url_str = str(v)
        if not url_str.startswith(('http://', 'https://')):
            raise ValueError('URL must start with http:// or https://')
        # Note: Image format validation will be done during extraction
        return v


class BoundingBox(BaseModel):
    """
    Bounding box coordinates for text regions
    """
    x: int  # Left coordinate
    y: int  # Top coordinate  
    width: int  # Width of the region
    height: int  # Height of the region
    
    @property
    def x2(self) -> int:
        """Right coordinate"""
        return self.x + self.width
    
    @property
    def y2(self) -> int:
        """Bottom coordinate"""
        return self.y + self.height


class ConfidenceScore(BaseModel):
    """
    Confidence metrics for OCR extraction
    """
    overall: float = Field(..., ge=0.0, le=100.0, description="Overall confidence percentage")
    word_level: Optional[List[float]] = Field(None, description="Per-word confidence scores")
    character_level: Optional[List[float]] = Field(None, description="Per-character confidence scores")
    
    @validator('overall')
    def validate_confidence(cls, v):
        """Ensure confidence is between 0 and 100"""
        if not 0.0 <= v <= 100.0:
            raise ValueError('Confidence must be between 0 and 100')
        return v


class TextRegion(BaseModel):
    """
    Text region extracted from image with location and confidence
    """
    text: str
    bounding_box: BoundingBox
    confidence: ConfidenceScore
    language: Optional[str] = None  # Detected language
    orientation: Optional[float] = None  # Text orientation in degrees
    font_size_estimate: Optional[int] = None  # Estimated font size
    is_handwritten: Optional[bool] = None  # Whether text appears handwritten


class ImageMetaData(BaseModel):
    """
    Image metadata and processing information
    """
    # File properties
    filename: Optional[str] = None
    format: Optional[str] = None  # PNG, JPEG, TIFF, etc.
    width: Optional[int] = None
    height: Optional[int] = None
    file_size_bytes: Optional[int] = None
    color_mode: Optional[str] = None  # RGB, RGBA, L, etc.
    
    # Processing information
    source_url: str
    preprocessing_applied: List[str] = Field(default_factory=list)  # List of preprocessing steps
    ocr_engine_version: Optional[str] = None
    processing_time_ms: Optional[int] = None
    
    # Detection statistics
    total_text_regions: int = 0
    average_confidence: Optional[float] = None
    languages_detected: List[str] = Field(default_factory=list)


class CleanedImageData(BaseModel):
    """
    Processed and cleaned OCR content from image
    """
    # Raw OCR output
    full_text: str = ""  # All extracted text combined
    text_regions: List[TextRegion] = Field(default_factory=list)
    
    # Structured content
    lines: List[str] = Field(default_factory=list)  # Text organized by lines
    paragraphs: List[str] = Field(default_factory=list)  # Text organized by paragraphs
    words: List[Dict[str, Union[str, float]]] = Field(default_factory=list)  # Words with positions
    
    # Processing metrics
    total_characters: int = 0
    total_words: int = 0
    total_lines: int = 0
    overall_confidence: float = 0.0
    
    # Quality indicators
    text_density: Optional[float] = None  # Ratio of text area to image area
    clarity_score: Optional[float] = None  # Image clarity assessment


class ImageExtractionError(BaseModel):
    """
    Image extraction error with detailed context
    """
    error_type: str
    message: str
    details: Optional[Dict[str, Union[str, int, float]]] = None
    timestamp: datetime = Field(default_factory=datetime.utcnow)
    stage: Optional[str] = None  # preprocessing, ocr, post_processing
    confidence_impact: Optional[str] = None  # How error affects confidence


class ImageExtractionResponse(BaseModel):
    """
    Complete image extraction response following architecture specification.
    
    Architecture spec: Response[raw_data, cleaned_data, meta_data, extracted_time, errors, success, processing_time_ms, url, confidence_scores]
    """
    # Core architecture fields
    raw_data: Optional[str] = None  # Raw OCR output with bounding boxes
    cleaned_data: Optional[CleanedImageData] = None
    meta_data: Optional[ImageMetaData] = None
    extracted_time: datetime = Field(default_factory=datetime.utcnow)
    errors: List[ImageExtractionError] = Field(default_factory=list)
    success: bool = True
    processing_time_ms: Optional[int] = None
    url: Optional[str] = None  # Original image URL
    
    # Image-specific fields
    confidence_scores: Optional[ConfidenceScore] = None  # Overall confidence metrics
    
    @validator('success', pre=True, always=True)
    def determine_success(cls, v, values):
        """Automatically determine success based on errors"""
        errors = values.get('errors', [])
        return len(errors) == 0
    
    def add_error(self, error_type: str, message: str, 
                 details: Optional[Dict[str, Union[str, int, float]]] = None, 
                 stage: Optional[str] = None, 
                 confidence_impact: Optional[str] = None):
        """Helper method to add an error to the response"""
        error = ImageExtractionError(
            error_type=error_type,
            message=message,
            details=details or {},
            stage=stage,
            confidence_impact=confidence_impact
        )
        self.errors.append(error)
        self.success = False
    
    def has_errors(self) -> bool:
        """Check if response has any errors"""
        return len(self.errors) > 0
    
    def get_error_summary(self) -> str:
        """Get a summary of all errors for logging"""
        if not self.has_errors():
            return "No errors"
        
        error_messages = [f"{error.error_type}: {error.message}" for error in self.errors]
        return "; ".join(error_messages)


# Processing configuration
class ImageProcessingConfig(BaseModel):
    """
    Configuration for image processing behavior
    """
    # OCR settings
    ocr_engine: str = "tesseract"
    language: str = "eng"  # Tesseract language code
    psm: int = 6  # Page segmentation mode (6 = uniform block of text)
    oem: int = 3  # OCR Engine Mode (3 = default)
    
    # Preprocessing settings
    enhance_contrast: bool = True
    denoise_image: bool = True
    correct_orientation: bool = True
    resize_for_ocr: bool = True
    target_dpi: int = 300  # DPI for optimal OCR
    
    # Output settings
    include_confidence: bool = True
    min_confidence_threshold: float = 30.0  # Minimum confidence to include text
    extract_word_boxes: bool = True
    extract_char_boxes: bool = False
    
    # Performance settings
    max_image_size_mb: int = 20  # Maximum image size to process
    timeout_seconds: int = 30  # Processing timeout
    
    # Quality settings
    blur_detection: bool = True
    noise_detection: bool = True
    skew_correction: bool = True