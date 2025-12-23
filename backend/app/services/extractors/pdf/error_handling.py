"""
Enhanced Error Handling for PDF Content Extractor

Comprehensive error handling for PDF processing with detailed debugging information,
error recovery strategies, and helpful user feedback.
"""

import traceback
import logging
from datetime import datetime
from typing import Dict, Any, Optional, List
from enum import Enum

from .models import PDFExtractionError, PDFExtractionResponse


class PDFErrorCategory(Enum):
    """Categorize PDF-specific errors for better handling and reporting"""

    NETWORK = "network"
    FILE_ACCESS = "file_access"
    PDF_CORRUPT = "pdf_corrupt"
    PDF_ENCRYPTED = "pdf_encrypted"
    PARSING = "parsing"
    EXTRACTION = "extraction"
    MEMORY = "memory"
    TIMEOUT = "timeout"
    UNSUPPORTED = "unsupported"
    SYSTEM = "system"


class PDFErrorSeverity(Enum):
    """PDF error severity levels"""

    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    CRITICAL = "critical"


class PDFErrorHandler:
    """
    Centralized error handling for PDF content extraction.

    Provides PDF-specific error categorization, detailed logging, and recovery suggestions.
    """

    def __init__(self, logger: Optional[logging.Logger] = None):
        """Initialize PDF error handler"""
        self.logger = logger or logging.getLogger(__name__)
        self.error_stats = {
            "total_errors": 0,
            "error_by_category": {},
            "error_by_type": {},
            "recent_errors": [],
        }

    def categorize_pdf_error(
        self, exception: Exception, context: Optional[Dict[str, Any]] = None
    ) -> PDFErrorCategory:
        """Categorize a PDF-related exception based on its type and context"""
        context = context or {}
        exception_str = str(exception).lower()

        # Network-related errors for PDF download
        if any(
            keyword in exception_str
            for keyword in [
                "connection",
                "timeout",
                "network",
                "dns",
                "resolve",
                "unreachable",
                "http",
            ]
        ):
            return PDFErrorCategory.NETWORK

        # File access errors
        if any(
            keyword in exception_str
            for keyword in [
                "permission",
                "access denied",
                "file not found",
                "no such file",
            ]
        ):
            return PDFErrorCategory.FILE_ACCESS

        # PDF-specific corruption errors
        if any(
            keyword in exception_str
            for keyword in [
                "corrupt",
                "invalid pdf",
                "damaged",
                "malformed",
                "bad pdf",
                "pdf error",
            ]
        ):
            return PDFErrorCategory.PDF_CORRUPT

        # Encrypted/password-protected PDFs
        if any(
            keyword in exception_str
            for keyword in ["encrypted", "password", "authentication", "decrypt"]
        ):
            return PDFErrorCategory.PDF_ENCRYPTED

        # Memory-related errors
        if any(
            keyword in exception_str
            for keyword in ["memory", "out of memory", "memoryerror"]
        ):
            return PDFErrorCategory.MEMORY

        # Timeout errors
        if any(
            keyword in exception_str for keyword in ["timeout", "timed out", "deadline"]
        ):
            return PDFErrorCategory.TIMEOUT

        # Parsing errors
        if any(
            keyword in exception_str
            for keyword in ["parse", "parsing", "syntax", "format"]
        ):
            return PDFErrorCategory.PARSING

        # Extraction errors
        if any(
            keyword in exception_str
            for keyword in ["extract", "extraction", "decode", "decompress"]
        ):
            return PDFErrorCategory.EXTRACTION

        if any(
            keyword in exception_str
            for keyword in ["unsupported", "not supported", "not implemented"]
        ):
            return PDFErrorCategory.UNSUPPORTED
        return PDFErrorCategory.SYSTEM

    def determine_severity(
        self, exception: Exception, category: PDFErrorCategory
    ) -> PDFErrorSeverity:
        """Determine error severity for PDF operations"""
        # Critical errors that prevent any functionality
        if category in [PDFErrorCategory.SYSTEM, PDFErrorCategory.MEMORY]:
            return PDFErrorSeverity.CRITICAL

        # High severity for corruption and encryption issues
        if category in [PDFErrorCategory.PDF_CORRUPT, PDFErrorCategory.PDF_ENCRYPTED]:
            return PDFErrorSeverity.HIGH

        # Medium severity for network, parsing, and extraction issues
        if category in [
            PDFErrorCategory.NETWORK,
            PDFErrorCategory.PARSING,
            PDFErrorCategory.EXTRACTION,
            PDFErrorCategory.TIMEOUT,
        ]:
            return PDFErrorSeverity.MEDIUM

        # Low severity for file access and unsupported features
        return PDFErrorSeverity.LOW

    def get_pdf_error_suggestions(
        self, category: PDFErrorCategory, exception: Exception
    ) -> List[str]:
        """Get helpful suggestions for resolving PDF-specific errors"""
        suggestions = []

        if category == PDFErrorCategory.NETWORK:
            suggestions.extend(
                [
                    "Check your internet connection",
                    "Verify the PDF URL is accessible",
                    "Try downloading the PDF manually to test accessibility",
                    "Check if the server hosting the PDF is down",
                ]
            )

        elif category == PDFErrorCategory.FILE_ACCESS:
            suggestions.extend(
                [
                    "Check if the file path is correct",
                    "Verify you have read permissions for the PDF file",
                    "Ensure the PDF file exists at the specified location",
                    "Try accessing the file with different credentials",
                ]
            )

        elif category == PDFErrorCategory.PDF_CORRUPT:
            suggestions.extend(
                [
                    "The PDF file appears to be corrupted or damaged",
                    "Try opening the PDF in a PDF viewer to verify integrity",
                    "Obtain a fresh copy of the PDF from the source",
                    "Use PDF repair tools if the file is important",
                ]
            )

        elif category == PDFErrorCategory.PDF_ENCRYPTED:
            suggestions.extend(
                [
                    "The PDF is password-protected or encrypted",
                    "Obtain the password from the document owner",
                    "Use a PDF with no encryption for testing",
                    "Consider PDF decryption tools if you have authorization",
                ]
            )

        elif category == PDFErrorCategory.MEMORY:
            suggestions.extend(
                [
                    "The PDF file may be too large for available memory",
                    "Try processing the PDF in smaller chunks",
                    "Increase system memory or use a machine with more RAM",
                    "Consider splitting large PDFs into smaller files",
                ]
            )

        elif category == PDFErrorCategory.TIMEOUT:
            suggestions.extend(
                [
                    "The PDF processing is taking longer than expected",
                    "Try increasing the timeout value",
                    "The PDF may be very large or complex",
                    "Consider processing smaller PDFs first",
                ]
            )

        elif category == PDFErrorCategory.PARSING:
            suggestions.extend(
                [
                    "The PDF structure may be non-standard or complex",
                    "Try with a different PDF to test the system",
                    "The PDF may use unsupported features or encoding",
                    "Check if the PDF was created with unusual software",
                ]
            )

        elif category == PDFErrorCategory.EXTRACTION:
            suggestions.extend(
                [
                    "Text or image extraction failed for this PDF",
                    "The PDF may have embedded content that's hard to extract",
                    "Try a simpler PDF for testing",
                    "Some PDFs have content in non-extractable formats",
                ]
            )

        elif category == PDFErrorCategory.UNSUPPORTED:
            suggestions.extend(
                [
                    "This PDF uses features not currently supported",
                    "Try with a more standard PDF format",
                    "Check if the PDF uses advanced features or encryption",
                    "Contact support if this feature is needed",
                ]
            )

        else:
            suggestions.extend(
                [
                    "Check system logs for more details",
                    "Ensure PyMUPDF (fitz) is properly installed",
                    "Try restarting the service",
                    "Contact support if the issue persists",
                ]
            )

        return suggestions

    def create_detailed_pdf_error(
        self,
        exception: Exception,
        stage: str,
        context: Optional[Dict[str, Any]] = None,
        url: Optional[str] = None,
        page_number: Optional[int] = None,
    ) -> PDFExtractionError:
        """Create a detailed PDF error with all debugging information"""
        context = context or {}

        category = self.categorize_pdf_error(exception, context)
        severity = self.determine_severity(exception, category)

        suggestions = self.get_pdf_error_suggestions(category, exception)

        error_details = {
            "exception_type": type(exception).__name__,
            "exception_str": str(exception),
            "category": category.value,
            "severity": severity.value,
            "suggestions": suggestions,
            "traceback": traceback.format_exc(),
            "context": context,
            "url": url,
            "page_number": page_number,
            "timestamp": datetime.utcnow().isoformat(),
        }

        self._update_error_stats(category, type(exception).__name__)

        self._log_error(exception, category, severity, stage, error_details)

        return PDFExtractionError(
            error_type=type(exception).__name__,
            message=str(exception),
            details=error_details,
            stage=stage,
            page_number=page_number,
        )

    def _update_error_stats(self, category: PDFErrorCategory, error_type: str):
        """Update internal error statistics"""
        self.error_stats["total_errors"] += 1

        cat_key = category.value
        self.error_stats["error_by_category"][cat_key] = (
            self.error_stats["error_by_category"].get(cat_key, 0) + 1
        )

        self.error_stats["error_by_type"][error_type] = (
            self.error_stats["error_by_type"].get(error_type, 0) + 1
        )

        # Keep recent errors (last 10)
        self.error_stats["recent_errors"].append(
            {
                "category": category.value,
                "type": error_type,
                "timestamp": datetime.utcnow().isoformat(),
            }
        )

        if len(self.error_stats["recent_errors"]) > 10:
            self.error_stats["recent_errors"] = self.error_stats["recent_errors"][-10:]

    def _log_error(
        self,
        exception: Exception,
        category: PDFErrorCategory,
        severity: PDFErrorSeverity,
        stage: str,
        details: Dict[str, Any],
    ):
        """Log error with appropriate level based on severity"""
        log_message = f"[PDF-{category.value.upper()}] {stage}: {str(exception)}"

        if severity == PDFErrorSeverity.CRITICAL:
            self.logger.critical(log_message, extra={"error_details": details})
        elif severity == PDFErrorSeverity.HIGH:
            self.logger.error(log_message, extra={"error_details": details})
        elif severity == PDFErrorSeverity.MEDIUM:
            self.logger.warning(log_message, extra={"error_details": details})
        else:
            self.logger.info(log_message, extra={"error_details": details})

    def handle_pdf_extraction_error(
        self,
        response: PDFExtractionResponse,
        exception: Exception,
        stage: str,
        context: Optional[Dict[str, Any]] = None,
        url: Optional[str] = None,
        page_number: Optional[int] = None,
    ) -> PDFExtractionResponse:
        """Handle a PDF extraction error and update the response"""
        error = self.create_detailed_pdf_error(
            exception, stage, context, url, page_number
        )
        response.add_error(
            error_type=error.error_type,
            message=error.message,
            details=error.details,
            stage=error.stage,
            page_number=error.page_number,
        )
        return response

    def get_error_summary(self) -> Dict[str, Any]:
        """Get a summary of all PDF errors handled"""
        return {
            "total_errors": self.error_stats["total_errors"],
            "errors_by_category": self.error_stats["error_by_category"],
            "errors_by_type": self.error_stats["error_by_type"],
            "recent_errors": self.error_stats["recent_errors"],
            "most_common_category": max(
                self.error_stats["error_by_category"].items(), key=lambda x: x[1]
            )[0]
            if self.error_stats["error_by_category"]
            else None,
            "most_common_type": max(
                self.error_stats["error_by_type"].items(), key=lambda x: x[1]
            )[0]
            if self.error_stats["error_by_type"]
            else None,
        }


# Global PDF error handler instance
_pdf_error_handler: Optional[PDFErrorHandler] = None


def get_pdf_error_handler(logger: Optional[logging.Logger] = None) -> PDFErrorHandler:
    """Get or create global PDF error handler instance"""
    global _pdf_error_handler

    if _pdf_error_handler is None:
        _pdf_error_handler = PDFErrorHandler(logger)

    return _pdf_error_handler


def handle_pdf_extraction_error(
    response: PDFExtractionResponse,
    exception: Exception,
    stage: str,
    context: Optional[Dict[str, Any]] = None,
    url: Optional[str] = None,
    page_number: Optional[int] = None,
    logger: Optional[logging.Logger] = None,
) -> PDFExtractionResponse:
    """
    Convenience function to handle PDF extraction errors.

    Args:
        response: The PDF extraction response to update
        exception: The exception that occurred
        stage: The stage where the error occurred
        context: Additional context information
        url: The PDF URL being processed
        page_number: The page number where error occurred (if applicable)
        logger: Optional logger instance

    Returns:
        Updated PDF extraction response with error details
    """
    error_handler = get_pdf_error_handler(logger)
    return error_handler.handle_pdf_extraction_error(
        response, exception, stage, context, url, page_number
    )


def get_pdf_error_stats() -> Dict[str, Any]:
    """Get global PDF error statistics"""
    return get_pdf_error_handler().get_error_summary()
