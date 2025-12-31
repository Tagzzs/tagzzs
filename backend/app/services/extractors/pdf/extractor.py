"""
PDF Content Extractor Engine

Core PDF parsing and extraction functionality using PyMUPDF (fitz).
Implements page-by-page parsing with access to low-level objects following architectural specifications.
"""

import logging
import time
import requests
import base64
from datetime import datetime
from typing import Optional, List, Tuple

import fitz  # PyMuPDF

from .models import (
    PDFExtractionRequest,
    PDFExtractionResponse,
    PDFMetaData,
    CleanedPDFData,
    PageContent,
    TextElement,
    ImageElement,
    PDFProcessingConfig,
)
from .error_handling import handle_pdf_extraction_error


class PDFParser:
    """
    PDF Parser component using PyMUPDF for low-level PDF object access.

    Handles page-by-page parsing to access streams, fonts, geometries and render pages
    as specified in the architecture.
    """

    def __init__(self, config: Optional[PDFProcessingConfig] = None):
        """Initialize PDF parser with configuration"""
        self.config = config or PDFProcessingConfig()
        self.logger = logging.getLogger(__name__)

    async def download_pdf_from_url(self, url: str) -> bytes:
        """Download PDF content from URL"""
        try:
            self.logger.info(f"Downloading PDF from URL: {url}")

            response = requests.get(url, timeout=30)
            response.raise_for_status()

            content_type = response.headers.get("content-type", "").lower()
            if "pdf" not in content_type and not url.lower().endswith(".pdf"):
                self.logger.warning(
                    f"Content-Type is '{content_type}', may not be a PDF"
                )

            pdf_bytes = response.content
            self.logger.info(f"Downloaded {len(pdf_bytes)} bytes")

            return pdf_bytes

        except Exception as e:
            self.logger.error(f"Failed to download PDF from {url}: {str(e)}")
            raise

    def open_pdf_document(self, pdf_data: bytes) -> fitz.Document:
        """Open PDF document from bytes using PyMUPDF"""
        try:
            doc = fitz.open(stream=pdf_data, filetype="pdf")
            self.logger.info(f"Opened PDF document with {doc.page_count} pages")
            return doc

        except Exception as e:
            self.logger.error(f"Failed to open PDF document: {str(e)}")
            raise

    def extract_pdf_metadata(self, doc: fitz.Document) -> PDFMetaData:
        """Extract metadata from PDF document"""
        try:
            metadata = doc.metadata

            if metadata is None:
                metadata = {}

            creation_date = None
            modification_date = None

            if metadata.get("creationDate"):
                try:
                    # PyMUPDF date format: "D:20231018..."
                    date_str = metadata["creationDate"]
                    if date_str.startswith("D:"):
                        date_str = date_str[2:16]  # Take YYYYMMDDHHMMSS part
                        creation_date = datetime.strptime(date_str, "%Y%m%d%H%M%S")
                except Exception:
                    logging.exception(f"Failed to parse creationDate: {Exception}")
                    pass

            if metadata.get("modDate"):
                try:
                    date_str = metadata["modDate"]
                    if date_str.startswith("D:"):
                        date_str = date_str[2:16]
                        modification_date = datetime.strptime(date_str, "%Y%m%d%H%M%S")
                except Exception:
                    logging.exception(f"Failed to parse modDate: {Exception}")
                    pass

            return PDFMetaData(
                title=metadata.get("title", "").strip() or None,
                author=metadata.get("author", "").strip() or None,
                subject=metadata.get("subject", "").strip() or None,
                creator=metadata.get("creator", "").strip() or None,
                producer=metadata.get("producer", "").strip() or None,
                creation_date=creation_date,
                modification_date=modification_date,
                page_count=doc.page_count,
                pdf_version=None,
                encrypted=doc.needs_pass,
                file_size_bytes=None,
            )

        except Exception as e:
            self.logger.error(f"Failed to extract PDF metadata: {str(e)}")
            return PDFMetaData(page_count=doc.page_count if doc else 0)


class PDFContentExtractor:
    """
    Content Extractor component using PyMUPDF to extract and structure text elements
    with coordinates and decode/export images from PDF objects.
    """

    def __init__(self, config: Optional[PDFProcessingConfig] = None):
        """Initialize content extractor"""
        self.config = config or PDFProcessingConfig()
        self.logger = logging.getLogger(__name__)

    def extract_text_elements(
        self, page: fitz.Page, page_number: int
    ) -> Tuple[List[TextElement], str]:
        """Extract text elements with coordinates from a PDF page"""
        text_elements = []
        raw_text = ""

        try:
            text_dict = page.get_text("dict")

            if isinstance(text_dict, dict):
                for block in text_dict.get("blocks", []):
                    if isinstance(block, dict) and "lines" in block:
                        for line in block["lines"]:
                            for span in line["spans"]:
                                text = span["text"].strip()
                                if text:
                                    bbox = span["bbox"]

                                    text_element = TextElement(
                                        text=text,
                                        x0=bbox[0],
                                        y0=bbox[1],
                                        x1=bbox[2],
                                        y1=bbox[3],
                                        font=span.get("font"),
                                        font_size=span.get("size"),
                                        page_number=page_number,
                                    )
                                    text_elements.append(text_element)
                                    raw_text += text + " "

            if not raw_text:
                raw_text = page.get_text()

            self.logger.debug(
                f"Extracted {len(text_elements)} text elements from page {page_number}"
            )

        except Exception as e:
            self.logger.error(
                f"Failed to extract text from page {page_number}: {str(e)}"
            )
            try:
                raw_text = page.get_text()
            except Exception:
                logging.exception(f"Failed to parse creationDate: {Exception}")
                pass

        return text_elements, raw_text.strip() if isinstance(raw_text, str) else ""

    def extract_images(self, page: fitz.Page, page_number: int) -> List[ImageElement]:
        """Extract images from a PDF page"""
        images = []

        if not self.config.extract_images:
            return images

        try:
            image_list = page.get_images()

            for img_index, img in enumerate(image_list):
                try:
                    xref = img[0]

                    doc = page.parent
                    if doc is not None:
                        base_image = doc.extract_image(xref)
                        image_bytes = base_image["image"]
                        image_ext = base_image["ext"]

                        # Skip if image is too large
                        if (
                            len(image_bytes)
                            > self.config.max_image_size_mb * 1024 * 1024
                        ):
                            self.logger.warning(
                                f"Skipping large image on page {page_number} ({len(image_bytes)} bytes)"
                            )
                            continue

                        image_b64 = base64.b64encode(image_bytes).decode("utf-8")

                        # Get image placement info (approximate)
                        # Note: Getting exact coordinates is complex in PyMUPDF
                        # This is a simplified approach
                        page_rect = page.rect

                        image_element = ImageElement(
                            image_data=image_b64,
                            format=image_ext.upper(),
                            width=base_image.get("width", 0),
                            height=base_image.get("height", 0),
                            x0=0,  # Simplified positioning
                            y0=0,
                            x1=page_rect.width,
                            y1=page_rect.height,
                            page_number=page_number,
                            size_bytes=len(image_bytes),
                        )

                        images.append(image_element)
                    else:
                        self.logger.warning(
                            f"Could not access document for image extraction on page {page_number}"
                        )

                except Exception as e:
                    self.logger.error(
                        f"Failed to extract image {img_index} from page {page_number}: {str(e)}"
                    )
                    continue

            self.logger.debug(f"Extracted {len(images)} images from page {page_number}")

        except Exception as e:
            self.logger.error(
                f"Failed to extract images from page {page_number}: {str(e)}"
            )

        return images

    def extract_page_content(self, page: fitz.Page, page_number: int) -> PageContent:
        """Extract complete content from a single PDF page"""
        try:
            text_elements, raw_text = self.extract_text_elements(page, page_number)

            images = self.extract_images(page, page_number)

            # Determine if page has text layer (for digital vs scanned detection)
            has_text_layer = len(text_elements) > 0 or len(raw_text.strip()) > 0

            page_content = PageContent(
                page_number=page_number,
                text_elements=text_elements,
                images=images,
                has_text_layer=has_text_layer,
                raw_text=raw_text,
            )

            self.logger.debug(
                f"Extracted content from page {page_number}: "
                f"{len(text_elements)} text elements, {len(images)} images, "
                f"has_text_layer={has_text_layer}"
            )

            return page_content

        except Exception as e:
            self.logger.error(
                f"Failed to extract content from page {page_number}: {str(e)}"
            )
            return PageContent(
                page_number=page_number,
                text_elements=[],
                images=[],
                has_text_layer=False,
                raw_text="",
            )


class PDFExtractorEngine:
    """
    Main PDF extraction engine that coordinates parsing and content extraction.

    Implements the architecture flow: Parser → Content Extractor → (Orchestrator handles workflow)
    """

    def __init__(self, config: Optional[PDFProcessingConfig] = None):
        """Initialize PDF extractor engine"""
        self.config = config or PDFProcessingConfig()
        self.parser = PDFParser(self.config)
        self.content_extractor = PDFContentExtractor(self.config)
        self.logger = logging.getLogger(__name__)

    async def extract(self, request: PDFExtractionRequest) -> PDFExtractionResponse:
        """
        Main extraction method following architecture specification.

        Extracts content from PDF URL and returns structured response.
        """
        start_time = time.time()
        url = str(request.url)

        response = PDFExtractionResponse(url=url)

        self.logger.info(f"Starting PDF extraction for URL: {url}")

        try:
            pdf_bytes = await self.parser.download_pdf_from_url(url)
            doc = self.parser.open_pdf_document(pdf_bytes)

            try:
                response.meta_data = self.parser.extract_pdf_metadata(doc)
                response.raw_data = (
                    f"PDF Document: {response.meta_data.page_count} pages, "
                    f"Size: {len(pdf_bytes)} bytes"
                )

                pages_to_process = response.meta_data.page_count
                if self.config.max_pages:
                    pages_to_process = min(pages_to_process, self.config.max_pages)

                page_contents = []
                full_text = ""
                total_images = 0
                total_text_elements = 0

                for page_num in range(pages_to_process):
                    try:
                        page = doc[page_num]
                        page_content = self.content_extractor.extract_page_content(
                            page, page_num + 1
                        )

                        page_contents.append(page_content)
                        full_text += page_content.raw_text + "\n"
                        total_images += len(page_content.images)
                        total_text_elements += len(page_content.text_elements)

                    except Exception as e:
                        response = handle_pdf_extraction_error(
                            response=response,
                            exception=e,
                            stage="page_processing",
                            context={"page_number": page_num + 1},
                            url=url,
                            page_number=page_num + 1,
                            logger=self.logger,
                        )

                response.cleaned_data = CleanedPDFData(
                    full_text=full_text.strip(),
                    pages=page_contents,
                    total_images=total_images,
                    total_text_elements=total_text_elements,
                    document_structure={
                        "page_count": len(page_contents),
                        "has_images": total_images > 0,
                        "has_text": total_text_elements > 0,
                        "digital_pages": sum(
                            1 for p in page_contents if p.has_text_layer
                        ),
                        "scanned_pages": sum(
                            1 for p in page_contents if not p.has_text_layer
                        ),
                    },
                )

            finally:
                doc.close()

        except Exception as e:
            response = handle_pdf_extraction_error(
                response=response,
                exception=e,
                stage="extraction",
                context={"url": url},
                url=url,
                logger=self.logger,
            )

        processing_time = int((time.time() - start_time) * 1000)
        response.processing_time_ms = processing_time

        self.logger.info(f"PDF extraction completed in {processing_time}ms for {url}")

        return response


async def extract_pdf_content(
    url: str, config: Optional[PDFProcessingConfig] = None
) -> PDFExtractionResponse:
    """
    Convenience function for single PDF content extraction.

    Args:
        url: URL to PDF file
        config: Optional processing configuration

    Returns:
        PDFExtractionResponse with extracted content
    """
    from pydantic import HttpUrl

    # Convert string URL to HttpUrl for validation
    validated_url = HttpUrl(url)
    request = PDFExtractionRequest(url=validated_url)

    extractor = PDFExtractorEngine(config)
    return await extractor.extract(request)
