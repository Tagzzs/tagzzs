"""
PDF Extraction Orchestrator

Coordinates the extraction workflow and manages component interactions.
Implements the architecture specification for handling digital vs scanned PDFs.

Architecture Flow:
Parser → Content Extractor → Orchestrator → Response

Orchestrator Logic (as requested - skip OCR):
- If images detected on page without text layer → skip OCR, compile images in output
- Otherwise → process normally with text and images
- Compile final response with structured data
"""

import logging
from typing import List, Dict, Any, Optional

from .models import (
    PDFExtractionRequest,
    PDFExtractionResponse,
    PageContent,
    PDFProcessingConfig,
)
from .extractor import PDFExtractorEngine
from .error_handling import handle_pdf_extraction_error


class PDFExtractionOrchestrator:
    """
    Orchestrator component that coordinates the extraction workflow.

    Manages the interaction between Parser and Content Extractor components,
    handles digital vs scanned PDF logic, and compiles the final response.
    """

    def __init__(self, config: Optional[PDFProcessingConfig] = None):
        """Initialize orchestrator with configuration"""
        self.config = config or PDFProcessingConfig()
        self.extractor_engine = PDFExtractorEngine(self.config)
        self.logger = logging.getLogger(__name__)

    def analyze_document_type(self, pages: List[PageContent]) -> Dict[str, Any]:
        """
        Analyze document to determine if it's digital, scanned, or mixed.

        Returns analysis results for processing decisions.
        """
        if not pages:
            return {
                "type": "unknown",
                "total_pages": 0,
                "digital_pages": 0,
                "scanned_pages": 0,
                "mixed_document": False,
                "has_extractable_text": False,
                "has_images": False,
            }

        digital_pages = sum(1 for page in pages if page.has_text_layer)
        scanned_pages = sum(1 for page in pages if not page.has_text_layer)
        total_pages = len(pages)

        if digital_pages == total_pages:
            doc_type = "digital"
        elif scanned_pages == total_pages:
            doc_type = "scanned"
        else:
            doc_type = "mixed"

        has_extractable_text = any(
            len(page.text_elements) > 0 or len(page.raw_text.strip()) > 0
            for page in pages
        )
        has_images = any(len(page.images) > 0 for page in pages)

        analysis = {
            "type": doc_type,
            "total_pages": total_pages,
            "digital_pages": digital_pages,
            "scanned_pages": scanned_pages,
            "mixed_document": doc_type == "mixed",
            "has_extractable_text": has_extractable_text,
            "has_images": has_images,
            "text_to_image_ratio": digital_pages / total_pages
            if total_pages > 0
            else 0,
        }

        self.logger.info(
            f"Document analysis: {doc_type} document with {digital_pages}/{total_pages} digital pages"
        )

        return analysis

    def process_scanned_pages(self, pages: List[PageContent]) -> Dict[str, Any]:
        """
        Process pages that appear to be scanned (images without text layer).

        As requested by user: Skip OCR and just compile images in output.
        """
        scanned_pages = [page for page in pages if not page.has_text_layer]

        if not scanned_pages:
            return {
                "processed_pages": 0,
                "images_extracted": 0,
                "ocr_skipped": False,
                "message": "No scanned pages detected",
            }

        total_images = sum(len(page.images) for page in scanned_pages)

        processing_result = {
            "processed_pages": len(scanned_pages),
            "images_extracted": total_images,
            "ocr_skipped": True,
            "message": f"Processed {len(scanned_pages)} scanned pages, extracted {total_images} images, OCR skipped as requested",
        }

        self.logger.info(f"Scanned page processing: {processing_result['message']}")

        return processing_result

    def compile_extraction_response(
        self,
        base_response: PDFExtractionResponse,
        document_analysis: Dict[str, Any],
        scanned_processing: Dict[str, Any],
    ) -> PDFExtractionResponse:
        """
        Compile the final extraction response with all processing results.

        Implements output structuring as specified in architecture.
        """
        try:
            if not base_response.cleaned_data:
                return base_response

            enhanced_structure = {
                **base_response.cleaned_data.document_structure,
                "document_analysis": document_analysis,
                "scanned_processing": scanned_processing,
                "extraction_strategy": {
                    "ocr_used": False,
                    "text_extraction": document_analysis.get(
                        "has_extractable_text", False
                    ),
                    "image_extraction": document_analysis.get("has_images", False),
                    "processing_approach": self._determine_processing_approach(
                        document_analysis
                    ),
                },
            }

            # Update cleaned data with enhanced structure
            base_response.cleaned_data.document_structure = enhanced_structure

            # Add processing summary to raw_data
            processing_summary = (
                f"PDF processed: {document_analysis['type']} document, "
                f"{document_analysis['total_pages']} pages, "
                f"{base_response.cleaned_data.total_text_elements} text elements, "
                f"{base_response.cleaned_data.total_images} images extracted"
            )

            if base_response.raw_data:
                base_response.raw_data += f"\n{processing_summary}"
            else:
                base_response.raw_data = processing_summary

            self.logger.info(f"Compiled final response: {processing_summary}")

            return base_response

        except Exception as e:
            self.logger.error(f"Failed to compile extraction response: {str(e)}")
            return handle_pdf_extraction_error(
                response=base_response,
                exception=e,
                stage="orchestrator_compile",
                context={"document_analysis": document_analysis},
                url=base_response.url,
                logger=self.logger,
            )

    def _determine_processing_approach(self, analysis: Dict[str, Any]) -> str:
        """Determine the processing approach based on document analysis"""
        doc_type = analysis.get("type", "unknown")

        if doc_type == "digital":
            return "text_and_metadata_extraction"
        elif doc_type == "scanned":
            return "image_extraction_only"  # OCR skipped as requested
        elif doc_type == "mixed":
            return "hybrid_text_and_image_extraction"
        else:
            return "fallback_extraction"

    async def orchestrate_extraction(
        self, request: PDFExtractionRequest
    ) -> PDFExtractionResponse:
        """
        Main orchestration method that coordinates the entire extraction workflow.

        Implements the architecture specification:
        Request → Parser → Content Extractor → Orchestrator → Response
        """
        self.logger.info(f"Starting orchestrated PDF extraction for: {request.url}")

        try:
            # Step 1: Run base extraction (Parser + Content Extractor)
            base_response = await self.extractor_engine.extract(request)

            # If base extraction failed, return early
            if not base_response.success or not base_response.cleaned_data:
                self.logger.warning("Base extraction failed or returned no data")
                return base_response

            # Step 2: Analyze document type and structure
            document_analysis = self.analyze_document_type(
                base_response.cleaned_data.pages
            )

            # Step 3: Process scanned pages (skip OCR as requested)
            scanned_processing = self.process_scanned_pages(
                base_response.cleaned_data.pages
            )

            # Step 4: Compile final response with orchestrator enhancements
            final_response = self.compile_extraction_response(
                base_response, document_analysis, scanned_processing
            )

            self.logger.info(
                f"Orchestrated extraction completed successfully for: {request.url}"
            )

            return final_response

        except Exception as e:
            self.logger.error(f"Orchestration failed for {request.url}: {str(e)}")

            # Create error response if we don't have a base response
            error_response = PDFExtractionResponse(url=str(request.url))
            return handle_pdf_extraction_error(
                response=error_response,
                exception=e,
                stage="orchestrator_main",
                context={"request_url": str(request.url)},
                url=str(request.url),
                logger=self.logger,
            )


# Convenience function for orchestrated extraction
async def extract_pdf_content_orchestrated(
    url: str, config: Optional[PDFProcessingConfig] = None
) -> PDFExtractionResponse:
    """
    Convenience function for orchestrated PDF content extraction.

    This is the main entry point that follows the complete architecture:
    Request[url] → Parser → Content Extractor → Orchestrator → Response

    Args:
        url: URL to PDF file
        config: Optional processing configuration

    Returns:
        PDFExtractionResponse with complete orchestrated extraction results
    """
    from pydantic import HttpUrl

    # Convert string URL to HttpUrl for validation
    validated_url = HttpUrl(url)
    request = PDFExtractionRequest(url=validated_url)

    orchestrator = PDFExtractionOrchestrator(config)
    return await orchestrator.orchestrate_extraction(request)
