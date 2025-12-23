"""
PDF Content Extractor Package

Provides PDF content extraction capabilities following the architecture specification.
"""

# Core extraction functionality
from .orchestrator import (
    PDFExtractionOrchestrator,
    extract_pdf_content_orchestrated
)

# Data models
from .models import (
    PDFExtractionRequest,
    PDFExtractionResponse,
    CleanedPDFData,
    PageContent,
    TextElement,
    ImageElement,
    PDFMetaData,
    PDFExtractionError,
    PDFProcessingConfig
)

# Core engine components
from .extractor import (
    PDFExtractorEngine
)

# Output formatting
from .output_structuring import (
    PDFOutputStructurer,
    structure_pdf_extraction_output
)

# Error handling
from .error_handling import (
    PDFErrorCategory,
    handle_pdf_extraction_error
)

__all__ = [
    "extract_pdf_content_orchestrated",
    "structure_pdf_extraction_output",
    "PDFExtractionOrchestrator",
    "PDFExtractorEngine",
    "PDFOutputStructurer",
    "PDFExtractionRequest",
    "PDFExtractionResponse",
    "CleanedPDFData",
    "PageContent",
    "TextElement",
    "ImageElement",
    "PDFMetaData",
    "PDFProcessingConfig",
    "PDFExtractionError",
    "PDFErrorCategory",
    "handle_pdf_extraction_error"
]