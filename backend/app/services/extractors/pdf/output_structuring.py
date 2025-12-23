"""
PDF Output Structuring

Transforms extracted PDF content into structured JSON schemas for downstream applications.
Implements the architecture specification for standardized output format.

Architecture Response Format:
{
    "raw_data": str,
    "cleaned_data": structured_object,
    "meta_data": metadata_object,
    "extracted_time": datetime,
    "errors": error_list,
    "success": bool,
    "processing_time_ms": int,
    "url": str
}
"""

import logging
from typing import List, Dict, Any, Optional
from datetime import datetime

from .models import (
    PDFExtractionResponse,
    PageContent,
    PDFMetaData,
)


class PDFOutputStructurer:
    """
    Output structuring component that transforms extracted content into
    standardized JSON schemas for downstream applications.

    Implements the architecture specification for response formatting.
    """

    def __init__(self):
        """Initialize output structurer"""
        self.logger = logging.getLogger(__name__)

    def structure_text_content(self, pages: List[PageContent]) -> Dict[str, Any]:
        """
        Structure text content from all pages into hierarchical format.

        Returns structured text data for downstream consumption.
        """
        if not pages:
            return {
                "full_text": "",
                "text_by_pages": [],
                "text_elements": [],
                "text_statistics": {
                    "total_characters": 0,
                    "total_words": 0,
                    "total_lines": 0,
                    "pages_with_text": 0,
                },
            }

        full_text_parts = []
        text_by_pages = []
        all_text_elements = []

        total_chars = 0
        total_words = 0
        total_lines = 0
        pages_with_text = 0

        for page_num, page in enumerate(pages, 1):
            page_text = page.raw_text.strip()

            if page_text:
                pages_with_text += 1
                full_text_parts.append(f"--- Page {page_num} ---\n{page_text}")

                total_chars += len(page_text)
                total_words += len(page_text.split())
                total_lines += page_text.count("\n") + 1

                page_text_data = {
                    "page_number": page_num,
                    "text": page_text,
                    "has_text_layer": page.has_text_layer,
                    "character_count": len(page_text),
                    "word_count": len(page_text.split()),
                    "line_count": page_text.count("\n") + 1,
                }
                text_by_pages.append(page_text_data)

            for element in page.text_elements:
                element_data = {
                    "page_number": page_num,
                    "text": element.text,
                    "coordinates": {
                        "x0": element.x0,
                        "y0": element.y0,
                        "x1": element.x1,
                        "y1": element.y1,
                    },
                    "font_info": {"font": element.font, "font_size": element.font_size},
                    "element_type": "text_block",
                }
                all_text_elements.append(element_data)

        structured_text = {
            "full_text": "\n\n".join(full_text_parts),
            "text_by_pages": text_by_pages,
            "text_elements": all_text_elements,
            "text_statistics": {
                "total_characters": total_chars,
                "total_words": total_words,
                "total_lines": total_lines,
                "pages_with_text": pages_with_text,
            },
        }

        self.logger.debug(
            f"Structured text content: {total_words} words across {pages_with_text} pages"
        )

        return structured_text

    def structure_image_content(self, pages: List[PageContent]) -> Dict[str, Any]:
        """
        Structure image content from all pages into standardized format.

        Returns structured image data for downstream consumption.
        """
        if not pages:
            return {
                "images": [],
                "images_by_pages": [],
                "image_statistics": {
                    "total_images": 0,
                    "pages_with_images": 0,
                    "image_formats": [],
                    "total_size_bytes": 0,
                },
            }

        all_images = []
        images_by_pages = []

        total_images = 0
        pages_with_images = 0
        image_formats = set()
        total_size_bytes = 0

        for page_num, page in enumerate(pages, 1):
            page_images = []

            for img_idx, image in enumerate(page.images):
                image_data = {
                    "page_number": page_num,
                    "image_index": img_idx,
                    "image_id": f"page_{page_num}_img_{img_idx}",
                    "coordinates": {
                        "x0": image.x0,
                        "y0": image.y0,
                        "x1": image.x1,
                        "y1": image.y1,
                        "width": image.width,
                        "height": image.height,
                    },
                    "format": image.format,
                    "size_bytes": image.size_bytes,
                    "base64_data": image.image_data,
                    "element_type": "image",
                }

                all_images.append(image_data)
                page_images.append(image_data)

                total_images += 1
                image_formats.add(image.format)
                total_size_bytes += image.size_bytes

            if page_images:
                pages_with_images += 1
                images_by_pages.append(
                    {
                        "page_number": page_num,
                        "image_count": len(page_images),
                        "images": page_images,
                    }
                )

        structured_images = {
            "images": all_images,
            "images_by_pages": images_by_pages,
            "image_statistics": {
                "total_images": total_images,
                "pages_with_images": pages_with_images,
                "image_formats": list(image_formats),
                "total_size_bytes": total_size_bytes,
            },
        }

        self.logger.debug(
            f"Structured image content: {total_images} images across {pages_with_images} pages"
        )

        return structured_images

    def structure_document_metadata(
        self, meta_data: Optional[PDFMetaData]
    ) -> Dict[str, Any]:
        """
        Structure document metadata into standardized format.

        Returns structured metadata for downstream consumption.
        """
        if not meta_data:
            return {"document_info": {}, "processing_info": {}, "file_properties": {}}

        structured_metadata = {
            "document_info": {
                "title": meta_data.title,
                "author": meta_data.author,
                "subject": meta_data.subject,
                "creator": meta_data.creator,
                "producer": meta_data.producer,
                "creation_date": meta_data.creation_date.isoformat()
                if meta_data.creation_date
                else None,
                "modification_date": meta_data.modification_date.isoformat()
                if meta_data.modification_date
                else None,
            },
            "processing_info": {
                "page_count": meta_data.page_count,
                "file_size": meta_data.file_size_bytes,
                "is_encrypted": meta_data.encrypted,
                "pdf_version": meta_data.pdf_version,
            },
            "file_properties": {
                "has_text_layer": meta_data.page_count
                > 0,  # Will be updated based on pages
                "has_images": False,  # Will be updated based on content
                "extraction_method": "digital_text_extraction",  # Will be updated by orchestrator
                "ocr_used": False,
            },
        }

        return structured_metadata

    def create_downstream_json_schema(
        self, response: PDFExtractionResponse
    ) -> Dict[str, Any]:
        """
        Create comprehensive JSON schema optimized for downstream applications.

        This provides a flattened, easily consumable format for API clients.
        """
        if not response.cleaned_data:
            return {
                "success": False,
                "error": "No cleaned data available",
                "document": {},
                "content": {},
                "metadata": {},
            }

        text_content = self.structure_text_content(response.cleaned_data.pages)
        image_content = self.structure_image_content(response.cleaned_data.pages)
        metadata = self.structure_document_metadata(response.meta_data)

        if metadata.get("file_properties"):
            metadata["file_properties"]["has_text_layer"] = (
                text_content["text_statistics"]["pages_with_text"] > 0
            )
            metadata["file_properties"]["has_images"] = (
                image_content["image_statistics"]["total_images"] > 0
            )

        downstream_schema = {
            "success": response.success,
            "url": response.url,
            "extracted_time": response.extracted_time.isoformat()
            if response.extracted_time
            else None,
            "processing_time_ms": response.processing_time_ms,
            "document": {
                "page_count": len(response.cleaned_data.pages),
                "document_type": response.cleaned_data.document_structure.get(
                    "document_analysis", {}
                ).get("type", "unknown"),
                "extraction_strategy": response.cleaned_data.document_structure.get(
                    "extraction_strategy", {}
                ),
                "structure": response.cleaned_data.document_structure,
            },
            "content": {
                "text": text_content,
                "images": image_content,
                "combined_elements": self._combine_content_elements(
                    text_content, image_content
                ),
            },
            "metadata": metadata,
            "summary": {
                "total_text_elements": text_content["text_statistics"]["total_words"],
                "total_images": image_content["image_statistics"]["total_images"],
                "pages_processed": len(response.cleaned_data.pages),
                "digital_pages": response.cleaned_data.document_structure.get(
                    "document_analysis", {}
                ).get("digital_pages", 0),
                "scanned_pages": response.cleaned_data.document_structure.get(
                    "document_analysis", {}
                ).get("scanned_pages", 0),
                "ocr_skipped": True,
            },
            "errors": [
                {
                    "stage": error.stage,
                    "error_type": error.error_type,
                    "message": error.message,
                    "details": error.details,
                    "timestamp": error.timestamp.isoformat()
                    if error.timestamp
                    else None,
                }
                for error in response.errors
            ],
        }

        self.logger.info(
            f"Created downstream JSON schema: {downstream_schema['summary']}"
        )

        return downstream_schema

    def _combine_content_elements(
        self, text_content: Dict[str, Any], image_content: Dict[str, Any]
    ) -> List[Dict[str, Any]]:
        """
        Combine text and image elements into a single ordered list by page and position.

        This provides a unified view of all content elements for downstream processing.
        """
        combined_elements = []

        for element in text_content.get("text_elements", []):
            element["content_type"] = "text"
            combined_elements.append(element)

        for element in image_content.get("images", []):
            element["content_type"] = "image"
            combined_elements.append(element)

        combined_elements.sort(
            key=lambda x: (x["page_number"], x["coordinates"].get("y0", 0))
        )

        return combined_elements

    def structure_response_for_api(
        self, response: PDFExtractionResponse
    ) -> Dict[str, Any]:
        """
        Structure the complete response for API output following architecture specification.

        This is the main method that creates the final structured output.
        """
        try:
            api_response = {
                "raw_data": response.raw_data,
                "cleaned_data": response.cleaned_data.dict()
                if response.cleaned_data
                else None,
                "meta_data": response.meta_data.dict() if response.meta_data else None,
                "extracted_time": response.extracted_time.isoformat()
                if response.extracted_time
                else None,
                "errors": [error.dict() for error in response.errors],
                "success": response.success,
                "processing_time_ms": response.processing_time_ms,
                "url": response.url,
            }

            api_response["structured_content"] = self.create_downstream_json_schema(
                response
            )

            self.logger.info(f"Structured API response for {response.url}")

            return api_response

        except Exception as e:
            self.logger.error(f"Failed to structure API response: {str(e)}")

            return {
                "raw_data": response.raw_data
                if hasattr(response, "raw_data")
                else None,
                "cleaned_data": None,
                "meta_data": None,
                "extracted_time": datetime.now().isoformat(),
                "errors": [
                    {
                        "message": f"Output structuring failed: {str(e)}",
                        "category": "output_structuring",
                    }
                ],
                "success": False,
                "processing_time_ms": 0,
                "url": response.url if hasattr(response, "url") else "unknown",
            }


def structure_pdf_extraction_output(response: PDFExtractionResponse) -> Dict[str, Any]:
    """
    Convenience function for structuring PDF extraction output.

    This is the main entry point for output structuring that creates
    the final JSON response following architecture specifications.

    Args:
        response: PDFExtractionResponse from orchestrator

    Returns:
        Dict with structured JSON output for API response
    """
    structurer = PDFOutputStructurer()
    return structurer.structure_response_for_api(response)
