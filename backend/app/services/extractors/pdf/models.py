"""
PDF Content Extractor Models

Data structures for PDF extraction following ARCHITECTURE.md specifications.
Supports both digital and scanned PDFs with page-by-page processing.
"""

from datetime import datetime
from typing import Dict, List, Optional, Any
from pydantic import BaseModel, HttpUrl, validator


class PDFExtractionRequest(BaseModel):
    """
    PDF extraction request containing URL to PDF file.

    Following architecture spec: Request[url] → Parser → Content Extractor → Orchestrator
    """

    url: HttpUrl

    @validator("url")
    def validate_pdf_url(cls, v):
        """Ensure URL is properly formatted and points to PDF"""
        url_str = str(v)
        if not url_str.startswith(("http://", "https://")):
            raise ValueError("URL must start with http:// or https://")
        # Note: PDF validation will be done during extraction
        return v


class TextElement(BaseModel):
    """
    Text element with coordinates for structured text extraction.

    Following architecture spec: TextElement[text, x0, y0, x1, y1, font, font_size, page_number]
    """

    text: str
    x0: float  # Left coordinate
    y0: float
    x1: float
    y1: float
    font: Optional[str] = None
    font_size: Optional[float] = None
    page_number: int


class ImageElement(BaseModel):
    """
    Image element extracted from PDF. (Base64 encoded)

    Following architecture spec: ImageElement[image_data, format, width, height, x0, y0, x1, y1, page_number, size_bytes]
    """

    image_data: str
    format: str
    width: int
    height: int
    x0: float
    y0: float
    x1: float
    y1: float
    page_number: int
    size_bytes: int


class PageContent(BaseModel):
    """
    Content extracted from a single PDF page.

    Following architecture spec: PageContent[page_number, text_elements, images, has_text_layer, raw_text]
    """

    page_number: int
    text_elements: List[TextElement] = []
    images: List[ImageElement] = []
    has_text_layer: bool = True  # True for digital PDFs, False for scanned
    raw_text: str = ""


class PDFMetaData(BaseModel):
    """
    PDF document metadata.

    Following architecture spec: MetaData[title, author, subject, creator, producer, creation_date, modification_date, page_count, pdf_version, encrypted, file_size_bytes]
    """

    title: Optional[str] = None
    author: Optional[str] = None
    subject: Optional[str] = None
    creator: Optional[str] = None
    producer: Optional[str] = None
    creation_date: Optional[datetime] = None
    modification_date: Optional[datetime] = None
    page_count: int = 0
    pdf_version: Optional[str] = None
    encrypted: bool = False
    file_size_bytes: Optional[int] = None


class CleanedPDFData(BaseModel):
    """
    Processed and cleaned PDF content.

    Following architecture spec: CleanedData[full_text, pages, total_images, total_text_elements, document_structure]
    """

    full_text: str = ""  # All text combined
    pages: List[PageContent] = []
    total_images: int = 0
    total_text_elements: int = 0
    document_structure: Dict[str, Any] = {}  # For future enhancements


class PDFExtractionError(BaseModel):
    """
    PDF extraction error with detailed context.

    Following architecture spec: Error[error_type, message, details, timestamp, stage, page_number]
    """

    error_type: str
    message: str
    details: Optional[Dict[str, Any]] = None
    timestamp: datetime = datetime.utcnow()
    stage: Optional[str] = None  # parser, extractor, orchestrator
    page_number: Optional[int] = None


class PDFExtractionResponse(BaseModel):
    """
    Complete PDF extraction response following architecture specification.

    Architecture spec: Response[raw_data, cleaned_data, meta_data, extracted_time, errors, success, processing_time_ms, url]
    """

    # Core architecture fields
    raw_data: Optional[str] = None
    cleaned_data: Optional[CleanedPDFData] = None
    meta_data: Optional[PDFMetaData] = None
    extracted_time: datetime = datetime.utcnow()
    errors: List[PDFExtractionError] = []
    success: bool = True
    processing_time_ms: Optional[int] = None
    url: Optional[str] = None

    @validator("success", pre=True, always=True)
    def determine_success(cls, v, values):
        """Automatically determine success based on errors"""
        errors = values.get("errors", [])
        return len(errors) == 0

    def add_error(
        self,
        error_type: str,
        message: str,
        details: Optional[Dict[str, Any]] = None,
        stage: Optional[str] = None,
        page_number: Optional[int] = None,
    ):
        """Helper method to add an error to the response"""
        error = PDFExtractionError(
            error_type=error_type,
            message=message,
            details=details or {},
            stage=stage,
            page_number=page_number,
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

        error_messages = [
            f"{error.error_type}: {error.message}" for error in self.errors
        ]
        return "; ".join(error_messages)


# Processing configuration
class PDFProcessingConfig(BaseModel):
    """
    Configuration for PDF processing behavior:
    - extract_images: Whether to extract images
    - extract_text: Whether to extract text content
    - preserve_formatting: Whether to keep original formatting
    - max_pages: Limit processing to first N pages
    - skip_ocr: Whether to skip OCR for scanned PDFs
    - image_format: Format for extracted images
    - max_image_size_mb: Max size per image to extract
    """

    extract_images: bool = True
    extract_text: bool = True
    preserve_formatting: bool = True
    max_pages: Optional[int] = None
    skip_ocr: bool = True
    image_format: str = "PNG"
    max_image_size_mb: int = 10
