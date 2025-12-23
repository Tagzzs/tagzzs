# Error Handling for Web Content Extractor

import traceback
import logging
from datetime import datetime
from typing import Dict, Any, Optional, List
from enum import Enum

from .models import ExtractionError, ExtractionResponse


class ErrorCategory(Enum):
    """Categorize errors for better handling and reporting"""

    NETWORK = "network"
    BROWSER = "browser"
    PARSING = "parsing"
    VALIDATION = "validation"
    TIMEOUT = "timeout"
    CONTENT = "content"
    SYSTEM = "system"


class ErrorSeverity(Enum):
    """Error severity levels"""

    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    CRITICAL = "critical"


class ErrorHandler:
    """
    Centralized error handling for the web content extractor.

    Provides error categorization, detailed logging, and recovery suggestions.
    """

    def __init__(self, logger: Optional[logging.Logger] = None):
        """Initialize error handler"""
        self.logger = logger or logging.getLogger(__name__)
        self.error_stats = {
            "total_errors": 0,
            "error_by_category": {},
            "error_by_type": {},
            "recent_errors": [],
        }

    def categorize_error(
        self, exception: Exception, context: Optional[Dict[str, Any]] = None
    ) -> ErrorCategory:
        """Categorize an exception based on its type and context"""
        context = context or {}

        # Network-related errors
        if any(
            keyword in str(exception).lower()
            for keyword in [
                "connection",
                "timeout",
                "network",
                "dns",
                "resolve",
                "unreachable",
            ]
        ):
            return ErrorCategory.NETWORK

        # Browser-related errors
        if any(
            keyword in str(exception).lower()
            for keyword in ["browser", "playwright", "chromium", "page", "context"]
        ):
            return ErrorCategory.BROWSER

        # Timeout errors
        if any(
            keyword in str(exception).lower()
            for keyword in ["timeout", "timed out", "deadline"]
        ):
            return ErrorCategory.TIMEOUT

        # Parsing errors
        if any(
            keyword in str(exception).lower()
            for keyword in ["parse", "parsing", "beautifulsoup", "html", "xml"]
        ):
            return ErrorCategory.PARSING

        # Validation errors
        if any(
            keyword in str(exception).lower()
            for keyword in ["validation", "invalid", "url", "format"]
        ):
            return ErrorCategory.VALIDATION

        # Content errors
        if any(
            keyword in str(exception).lower()
            for keyword in ["content", "empty", "missing", "not found"]
        ):
            return ErrorCategory.CONTENT

        # Default to system error
        return ErrorCategory.SYSTEM

    def determine_severity(
        self, exception: Exception, category: ErrorCategory
    ) -> ErrorSeverity:
        """Determine error severity"""
        # Critical errors that prevent any functionality
        if category in [ErrorCategory.SYSTEM, ErrorCategory.BROWSER]:
            return ErrorSeverity.CRITICAL

        # High severity for network issues that block extraction
        if category == ErrorCategory.NETWORK:
            return ErrorSeverity.HIGH

        # Medium severity for timeouts and parsing issues
        if category in [ErrorCategory.TIMEOUT, ErrorCategory.PARSING]:
            return ErrorSeverity.MEDIUM

        # Low severity for validation and content issues
        return ErrorSeverity.LOW

    def get_error_suggestions(
        self, category: ErrorCategory, exception: Exception
    ) -> List[str]:
        """Get helpful suggestions for resolving errors"""
        suggestions = []

        if category == ErrorCategory.NETWORK:
            suggestions.extend(
                [
                    "Check your internet connection",
                    "Verify the URL is accessible",
                    "Try again in a few moments (temporary network issue)",
                    "Check if the website is down using a service like downforeveryoneorjustme.com",
                ]
            )

        elif category == ErrorCategory.TIMEOUT:
            suggestions.extend(
                [
                    "The website may be slow to respond",
                    "Try increasing the timeout value",
                    "Check if the website is overloaded",
                    "Consider retrying the request",
                ]
            )

        elif category == ErrorCategory.BROWSER:
            suggestions.extend(
                [
                    "Browser instance may have crashed",
                    "Try restarting the extraction service",
                    "Check system resources (memory, CPU)",
                    "Ensure Playwright is properly installed",
                ]
            )

        elif category == ErrorCategory.PARSING:
            suggestions.extend(
                [
                    "The webpage may have unusual HTML structure",
                    "Content may be dynamically loaded (JavaScript)",
                    "Try waiting longer for page load",
                    "The website may be using non-standard markup",
                ]
            )

        elif category == ErrorCategory.VALIDATION:
            suggestions.extend(
                [
                    "Check the URL format (must start with http:// or https://)",
                    "Ensure the URL is properly encoded",
                    "Verify the domain name is valid",
                ]
            )

        elif category == ErrorCategory.CONTENT:
            suggestions.extend(
                [
                    "The webpage may be empty or contain no text content",
                    "Content may be behind authentication",
                    "The page may require JavaScript to display content",
                    "Try accessing the URL directly in a browser",
                ]
            )

        else:  # SYSTEM
            suggestions.extend(
                [
                    "Check system logs for more details",
                    "Ensure all dependencies are installed",
                    "Try restarting the service",
                    "Contact support if the issue persists",
                ]
            )

        return suggestions

    def create_detailed_error(
        self,
        exception: Exception,
        stage: str,
        context: Optional[Dict[str, Any]] = None,
        url: Optional[str] = None,
    ) -> ExtractionError:
        """Create a detailed error with all debugging information"""
        context = context or {}

        # Categorize and assess severity
        category = self.categorize_error(exception, context)
        severity = self.determine_severity(exception, category)

        # Get suggestions
        suggestions = self.get_error_suggestions(category, exception)

        # Create detailed error information
        error_details = {
            "exception_type": type(exception).__name__,
            "exception_str": str(exception),
            "category": category.value,
            "severity": severity.value,
            "suggestions": suggestions,
            "traceback": traceback.format_exc(),
            "context": context,
            "url": url,
            "timestamp": datetime.utcnow().isoformat(),
        }

        # Update error statistics
        self._update_error_stats(category, type(exception).__name__)

        # Log the error
        self._log_error(exception, category, severity, stage, error_details)

        return ExtractionError(
            error_type=type(exception).__name__,
            message=str(exception),
            details=error_details,
            stage=stage,
        )

    def _update_error_stats(self, category: ErrorCategory, error_type: str):
        """Update internal error statistics"""
        self.error_stats["total_errors"] += 1

        # Update category stats
        cat_key = category.value
        self.error_stats["error_by_category"][cat_key] = (
            self.error_stats["error_by_category"].get(cat_key, 0) + 1
        )

        # Update type stats
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
        category: ErrorCategory,
        severity: ErrorSeverity,
        stage: str,
        details: Dict[str, Any],
    ):
        """Log error with appropriate level based on severity"""
        log_message = f"[{category.value.upper()}] {stage}: {str(exception)}"

        if severity == ErrorSeverity.CRITICAL:
            self.logger.critical(log_message, extra={"error_details": details})
        elif severity == ErrorSeverity.HIGH:
            self.logger.error(log_message, extra={"error_details": details})
        elif severity == ErrorSeverity.MEDIUM:
            self.logger.warning(log_message, extra={"error_details": details})
        else:
            self.logger.info(log_message, extra={"error_details": details})

    def handle_extraction_error(
        self,
        response: ExtractionResponse,
        exception: Exception,
        stage: str,
        context: Optional[Dict[str, Any]] = None,
        url: Optional[str] = None,
    ) -> ExtractionResponse:
        """Handle an extraction error and update the response"""
        error = self.create_detailed_error(exception, stage, context, url)
        response.add_error(
            error_type=error.error_type,
            message=error.message,
            details=error.details,
            stage=error.stage,
        )
        return response

    def get_error_summary(self) -> Dict[str, Any]:
        """Get a summary of all errors handled"""
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


# Global error handler instance
_error_handler: Optional[ErrorHandler] = None


def get_error_handler(logger: Optional[logging.Logger] = None) -> ErrorHandler:
    """Get or create global error handler instance"""
    global _error_handler

    if _error_handler is None:
        _error_handler = ErrorHandler(logger)

    return _error_handler


def handle_extraction_error(
    response: ExtractionResponse,
    exception: Exception,
    stage: str,
    context: Optional[Dict[str, Any]] = None,
    url: Optional[str] = None,
    logger: Optional[logging.Logger] = None,
) -> ExtractionResponse:
    """
    Convenience function to handle extraction errors.

    Args:
        response: The extraction response to update
        exception: The exception that occurred
        stage: The stage where the error occurred
        context: Additional context information
        url: The URL being processed
        logger: Optional logger instance

    Returns:
        Updated extraction response with error details
    """
    error_handler = get_error_handler(logger)
    return error_handler.handle_extraction_error(
        response, exception, stage, context, url
    )


def get_error_stats() -> Dict[str, Any]:
    """Get global error statistics"""
    return get_error_handler().get_error_summary()
