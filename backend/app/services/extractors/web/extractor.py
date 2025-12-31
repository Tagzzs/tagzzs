# Web Content Extractor Engine

import logging
import time
import re

import requests
from bs4 import BeautifulSoup

from .models import (
    ExtractionRequest,
    ExtractionResponse,
    CleanedData,
    MetaData,
)
from .error_handling import handle_extraction_error
from app.utils.reading_time import calculate_reading_time


class WebContentExtractor:
    """
    Lightweight web content extraction using only BeautifulSoup and requests.

    No Playwright/browser dependencies - much smaller Docker image.
    Handles:
    - HTTP requests with proper headers
    - Content extraction and cleaning with BeautifulSoup
    - Metadata extraction from meta tags
    - Error handling
    """

    def __init__(self):
        """Initialize the extractor"""
        self.logger = logging.getLogger(__name__)
        self.session = requests.Session()
        self.session.headers.update(
            {
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36"
            }
        )

    async def __aenter__(self):
        """Async context manager entry"""
        return self

    async def __aexit__(self, exc_type, exc_val, exc_tb):
        """Async context manager exit"""
        self._close_session()

    def _close_session(self):
        """Close the session"""
        try:
            self.session.close()
        except Exception as e:
            self.logger.error(f"Error closing session: {str(e)}")

    async def extract(self, request: ExtractionRequest) -> ExtractionResponse:
        """
        Main extraction method.

        Extracts content from the given URL and returns structured response.
        """
        start_time = time.time()
        url = str(request.url)

        response = ExtractionResponse(url=url)

        try:
            http_response = self.session.get(url, timeout=10)
            http_response.raise_for_status()

            raw_html = http_response.text
            response.raw_data = raw_html

            soup = BeautifulSoup(raw_html, "html.parser")

            response.meta_data = self._extract_metadata(soup, url)

            response.cleaned_data = self._extract_cleaned_content(soup)

        except Exception as e:
            response = handle_extraction_error(
                response=response,
                exception=e,
                stage="extraction",
                context={"url": url, "stage": "page_extraction"},
                url=url,
                logger=self.logger,
            )

        processing_time = int((time.time() - start_time) * 1000)
        response.processing_time_ms = processing_time

        return response

    def _extract_metadata(self, soup: BeautifulSoup, url: str) -> MetaData:
        """Extract metadata from the page"""
        try:
            meta_data = MetaData()

            title_tag = soup.find("title")
            meta_data.title = title_tag.string if title_tag else None

            meta_dict = {}
            for meta in soup.find_all("meta"):
                name = meta.get("name")
                property_attr = meta.get("property")
                content = meta.get("content")

                if (
                    name
                    and isinstance(name, str)
                    and content
                    and isinstance(content, str)
                ):
                    meta_dict[name.lower()] = content
                elif (
                    property_attr
                    and isinstance(property_attr, str)
                    and content
                    and isinstance(content, str)
                ):
                    meta_dict[property_attr.lower()] = content

            meta_data.description = meta_dict.get("description")
            meta_data.author = meta_dict.get("author")

            html_tag = soup.find("html")
            if html_tag:
                lang = html_tag.get("lang")
                if lang and isinstance(lang, str):
                    meta_data.language = lang

            if "keywords" in meta_dict:
                meta_data.keywords = [
                    k.strip() for k in meta_dict["keywords"].split(",")
                ]

            meta_data.og_title = meta_dict.get("og:title")
            meta_data.og_description = meta_dict.get("og:description")
            meta_data.og_image = meta_dict.get("og:image")
            meta_data.og_url = meta_dict.get("og:url")

            meta_data.twitter_title = meta_dict.get("twitter:title")
            meta_data.twitter_description = meta_dict.get("twitter:description")
            meta_data.twitter_image = meta_dict.get("twitter:image")
            meta_data.twitter_card = meta_dict.get("twitter:card")

            canonical_link = soup.find("link", rel="canonical")
            if canonical_link:
                href = canonical_link.get("href")
                if href and isinstance(href, str):
                    meta_data.canonical_url = href

            return meta_data

        except Exception as e:
            self.logger.error(f"Metadata extraction failed: {str(e)}")
            return MetaData()

    def _extract_cleaned_content(self, soup: BeautifulSoup) -> CleanedData:
        """Extract and clean content from the page"""
        try:
            cleaned_data = CleanedData()

            for script in soup(["script", "style", "noscript"]):
                script.decompose()

            main_content = ""
            content_selectors = [
                "main",
                "article",
                ".content",
                "#content",
                ".post-content",
                ".entry-content",
                ".article-content",
            ]

            for selector in content_selectors:
                content_elem = soup.select_one(selector)
                if content_elem:
                    main_content = content_elem.get_text(strip=True, separator=" ")
                    break

            if not main_content:
                body = soup.find("body")
                if body:
                    main_content = body.get_text(strip=True, separator=" ")

            main_content = re.sub(r"\s+", " ", main_content).strip()
            cleaned_data.main_content = main_content

            # Extract headings
            headings = []
            for h in soup.find_all(["h1", "h2", "h3", "h4", "h5", "h6"]):
                heading_text = h.get_text(strip=True)
                if heading_text:
                    headings.append(heading_text)
            cleaned_data.headings = headings

            # Extract paragraphs
            paragraphs = []
            for p in soup.find_all("p"):
                p_text = p.get_text(strip=True)
                if p_text and len(p_text) > 20:  # Minimum length to consider
                    paragraphs.append(p_text)
            cleaned_data.paragraphs = paragraphs

            # Extract links
            links = []
            for a in soup.find_all("a", href=True):
                link_text = a.get_text(strip=True)
                if link_text:
                    links.append({"text": link_text, "url": a["href"]})
            cleaned_data.links = links[:50]  # Limit to first 50 links

            # Extract images
            images = []
            for img in soup.find_all("img", src=True):
                alt_text = img.get("alt", "")
                images.append({"src": img["src"], "alt": alt_text})
            cleaned_data.images = images[:20]  # Limit to first 20 images

            # Calculate word count and reading time
            if main_content:
                words = len(main_content.split())
                cleaned_data.word_count = words
                cleaned_data.reading_time_minutes = calculate_reading_time(main_content)

            return cleaned_data

        except Exception as e:
            self.logger.error(f"Content cleaning failed: {str(e)}")
            return CleanedData()


async def extract_content(url: str) -> ExtractionResponse:
    """
    Convenience function for single content extraction.

    Args:
        url: URL to extract content from

    Returns:
        ExtractionResponse with extracted content
    """
    from pydantic import HttpUrl

    # Convert string URL to HttpUrl for validation
    validated_url = HttpUrl(url)
    request = ExtractionRequest(url=validated_url)

    async with WebContentExtractor() as extractor:
        return await extractor.extract(request)
