"""
Image OCR Output Structuring

Transforms extracted image content into structured JSON schemas for downstream applications.
Implements the architecture specification for standardized output format with confidence scores.

Architecture Response Format:
{
    "raw_data": str,
    "cleaned_data": structured_object,
    "meta_data": metadata_object,
    "extracted_time": datetime,
    "errors": error_list,
    "success": bool,
    "processing_time_ms": int,
    "url": str,
    "confidence_scores": confidence_object
}
"""

import logging
from typing import List, Dict, Any, Optional
from datetime import datetime

from .models import (
    ImageExtractionResponse,
    CleanedImageData,
    TextRegion,
    ImageMetaData
)


class ImageOutputStructurer:
    """
    Output structuring component that transforms extracted content into 
    standardized JSON schemas for downstream applications.
    
    Implements the architecture specification for response formatting with confidence scores.
    """
    
    def __init__(self):
        """Initialize output structurer"""
        self.logger = logging.getLogger(__name__)
    
    def structure_text_regions(self, text_regions: List[TextRegion]) -> Dict[str, Any]:
        """
        Structure text regions into hierarchical format with confidence data.
        
        Returns structured text region data for downstream consumption.
        """
        if not text_regions:
            return {
                "regions": [],
                "by_confidence": {"high": [], "medium": [], "low": []},
                "by_location": {"top": [], "middle": [], "bottom": []},
                "statistics": {
                    "total_regions": 0,
                    "average_confidence": 0.0,
                    "confidence_distribution": {"high": 0, "medium": 0, "low": 0}
                }
            }
        
        regions_data = []
        confidence_levels = {"high": [], "medium": [], "low": []}
        
        # Calculate image bounds for location categorization
        min_y = min(region.bounding_box.y for region in text_regions)
        max_y = max(region.bounding_box.y2 for region in text_regions)
        height = max_y - min_y
        third_height = height / 3
        
        total_confidence = 0.0
        
        for i, region in enumerate(text_regions):
            # Structure individual region
            region_data = {
                "id": f"region_{i}",
                "text": region.text,
                "bounding_box": {
                    "x": region.bounding_box.x,
                    "y": region.bounding_box.y,
                    "width": region.bounding_box.width,
                    "height": region.bounding_box.height,
                    "x2": region.bounding_box.x2,
                    "y2": region.bounding_box.y2
                },
                "confidence": {
                    "overall": region.confidence.overall,
                    "word_level": region.confidence.word_level or [],
                    "character_level": region.confidence.character_level or []
                },
                "properties": {
                    "language": region.language,
                    "orientation": region.orientation,
                    "font_size_estimate": region.font_size_estimate,
                    "is_handwritten": region.is_handwritten,
                    "word_count": len(region.text.split()),
                    "character_count": len(region.text)
                }
            }
            
            regions_data.append(region_data)
            total_confidence += region.confidence.overall
            
            # Categorize by confidence
            confidence = region.confidence.overall
            if confidence >= 80:
                confidence_levels["high"].append(region_data)
            elif confidence >= 50:
                confidence_levels["medium"].append(region_data)
            else:
                confidence_levels["low"].append(region_data)
        
        # Categorize by location (top, middle, bottom)
        location_categories = {"top": [], "middle": [], "bottom": []}
        for region_data in regions_data:
            y_pos = region_data["bounding_box"]["y"]
            if y_pos < min_y + third_height:
                location_categories["top"].append(region_data)
            elif y_pos < min_y + 2 * third_height:
                location_categories["middle"].append(region_data)
            else:
                location_categories["bottom"].append(region_data)
        
        # Calculate statistics
        average_confidence = total_confidence / len(text_regions) if text_regions else 0.0
        confidence_distribution = {
            "high": len(confidence_levels["high"]),
            "medium": len(confidence_levels["medium"]),
            "low": len(confidence_levels["low"])
        }
        
        structured_regions = {
            "regions": regions_data,
            "by_confidence": confidence_levels,
            "by_location": location_categories,
            "statistics": {
                "total_regions": len(text_regions),
                "average_confidence": average_confidence,
                "confidence_distribution": confidence_distribution
            }
        }
        
        self.logger.debug(f"Structured {len(text_regions)} text regions")
        
        return structured_regions
    
    def structure_content_analysis(self, cleaned_data: CleanedImageData) -> Dict[str, Any]:
        """
        Structure content analysis data from cleaned OCR results.
        
        Returns structured content analysis for downstream consumption.
        """
        if not cleaned_data:
            return {
                "text_analysis": {},
                "structure_analysis": {},
                "quality_metrics": {}
            }
        
        # Text analysis
        text_analysis = {
            "full_text": cleaned_data.full_text,
            "lines": cleaned_data.lines,
            "paragraphs": cleaned_data.paragraphs,
            "words": cleaned_data.words,
            "statistics": {
                "total_characters": cleaned_data.total_characters,
                "total_words": cleaned_data.total_words,
                "total_lines": cleaned_data.total_lines,
                "average_words_per_line": cleaned_data.total_words / max(1, cleaned_data.total_lines),
                "average_chars_per_word": cleaned_data.total_characters / max(1, cleaned_data.total_words)
            }
        }
        
        # Structure analysis
        structure_analysis = {
            "reading_order": [region.text for region in cleaned_data.text_regions],
            "text_density": cleaned_data.text_density,
            "layout_detection": {
                "has_structure": len(cleaned_data.paragraphs) > 1,
                "paragraph_count": len(cleaned_data.paragraphs),
                "line_count": len(cleaned_data.lines),
                "estimated_columns": self._estimate_column_count(cleaned_data.text_regions)
            }
        }
        
        # Quality metrics
        quality_metrics = {
            "overall_confidence": cleaned_data.overall_confidence,
            "clarity_score": cleaned_data.clarity_score,
            "text_density": cleaned_data.text_density,
            "completeness_score": self._calculate_completeness_score(cleaned_data),
            "readability_score": self._calculate_readability_score(cleaned_data.full_text)
        }
        
        content_analysis = {
            "text_analysis": text_analysis,
            "structure_analysis": structure_analysis,
            "quality_metrics": quality_metrics
        }
        
        return content_analysis
    
    def structure_metadata(self, meta_data: Optional[ImageMetaData]) -> Dict[str, Any]:
        """
        Structure image metadata into standardized format.
        
        Returns structured metadata for downstream consumption.
        """
        if not meta_data:
            return {
                "image_properties": {},
                "processing_info": {},
                "extraction_metrics": {}
            }
        
        structured_metadata = {
            "image_properties": {
                "filename": meta_data.filename,
                "format": meta_data.format,
                "dimensions": {
                    "width": meta_data.width,
                    "height": meta_data.height,
                    "aspect_ratio": (meta_data.width or 0) / (meta_data.height or 1) if meta_data.height else 0
                },
                "file_size_bytes": meta_data.file_size_bytes,
                "color_mode": meta_data.color_mode,
                "source_url": meta_data.source_url
            },
            "processing_info": {
                "preprocessing_applied": meta_data.preprocessing_applied,
                "ocr_engine_version": meta_data.ocr_engine_version,
                "processing_time_ms": meta_data.processing_time_ms,
                "languages_detected": meta_data.languages_detected
            },
            "extraction_metrics": {
                "total_text_regions": meta_data.total_text_regions,
                "average_confidence": meta_data.average_confidence,
                "extraction_success_rate": (meta_data.average_confidence or 0) / 100.0
            }
        }
        
        return structured_metadata
    
    def create_downstream_json_schema(self, response: ImageExtractionResponse) -> Dict[str, Any]:
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
                "confidence": {}
            }
        
        # Structure core content
        text_regions_data = self.structure_text_regions(response.cleaned_data.text_regions)
        content_analysis = self.structure_content_analysis(response.cleaned_data)
        metadata = self.structure_metadata(response.meta_data)
        
        # Create downstream schema
        downstream_schema = {
            "success": response.success,
            "url": response.url,
            "extracted_time": response.extracted_time.isoformat() if response.extracted_time else None,
            "processing_time_ms": response.processing_time_ms,
            
            # Document structure
            "document": {
                "type": "image_ocr",
                "format": metadata.get("image_properties", {}).get("format", "unknown"),
                "dimensions": metadata.get("image_properties", {}).get("dimensions", {}),
                "text_regions_count": len(response.cleaned_data.text_regions),
                "processing_steps": metadata.get("processing_info", {}).get("preprocessing_applied", [])
            },
            
            # Content sections
            "content": {
                "text_regions": text_regions_data,
                "analysis": content_analysis,
                "extracted_text": {
                    "full_text": response.cleaned_data.full_text,
                    "structured_text": {
                        "lines": response.cleaned_data.lines,
                        "paragraphs": response.cleaned_data.paragraphs,
                        "words_with_positions": response.cleaned_data.words
                    }
                }
            },
            
            # Metadata
            "metadata": metadata,
            
            # Confidence information
            "confidence": {
                "overall_scores": response.confidence_scores.dict() if response.confidence_scores else {},
                "region_confidence": text_regions_data.get("statistics", {}),
                "quality_assessment": content_analysis.get("quality_metrics", {})
            },
            
            # Summary statistics
            "summary": {
                "total_text_extracted": len(response.cleaned_data.full_text),
                "regions_detected": len(response.cleaned_data.text_regions),
                "overall_confidence": response.cleaned_data.overall_confidence,
                "processing_quality": "high" if response.cleaned_data.overall_confidence > 80 else 
                                    "medium" if response.cleaned_data.overall_confidence > 50 else "low",
                "text_density": response.cleaned_data.text_density
            },
            
            # Errors (if any)
            "errors": [
                {
                    "stage": error.stage,
                    "error_type": error.error_type,
                    "message": error.message,
                    "confidence_impact": error.confidence_impact,
                    "timestamp": error.timestamp.isoformat() if error.timestamp else None
                }
                for error in response.errors
            ]
        }
        
        self.logger.info(f"Created downstream JSON schema: {downstream_schema['summary']}")
        
        return downstream_schema
    
    def _estimate_column_count(self, text_regions: List[TextRegion]) -> int:
        """
        Estimate number of text columns in the image
        
        Args:
            text_regions: List of text regions
            
        Returns:
            Estimated column count
        """
        if not text_regions:
            return 0
        
        # Simple heuristic: group regions by horizontal position
        x_positions = [region.bounding_box.x for region in text_regions]
        
        # Find significant gaps in x positions
        x_positions.sort()
        gaps = []
        for i in range(1, len(x_positions)):
            gap = x_positions[i] - x_positions[i-1]
            gaps.append(gap)
        
        if not gaps:
            return 1
        
        # Look for large gaps that might indicate column separations
        avg_gap = sum(gaps) / len(gaps)
        large_gaps = [gap for gap in gaps if gap > avg_gap * 2]
        
        return len(large_gaps) + 1
    
    def _calculate_completeness_score(self, cleaned_data: CleanedImageData) -> float:
        """
        Calculate how complete the text extraction appears to be
        
        Args:
            cleaned_data: Cleaned OCR data
            
        Returns:
            Completeness score (0-100)
        """
        if not cleaned_data.text_regions:
            return 0.0
        
        # Factors that indicate completeness:
        # 1. High average confidence
        # 2. Good text density
        # 3. Reasonable text structure (words, sentences)
        
        confidence_factor = cleaned_data.overall_confidence / 100.0
        density_factor = min(1.0, (cleaned_data.text_density or 0) * 10)  # Scale text density
        
        # Structure factor (presence of sentences, punctuation)
        text = cleaned_data.full_text
        sentence_endings = text.count('.') + text.count('!') + text.count('?')
        structure_factor = min(1.0, sentence_endings / max(1, len(text.split()) / 10))
        
        completeness = (confidence_factor * 0.5 + density_factor * 0.3 + structure_factor * 0.2) * 100
        
        return min(100.0, max(0.0, completeness))
    
    def _calculate_readability_score(self, text: str) -> float:
        """
        Calculate basic readability score for extracted text
        
        Args:
            text: Extracted text
            
        Returns:
            Readability score (0-100)
        """
        if not text.strip():
            return 0.0
        
        words = text.split()
        if not words:
            return 0.0
        
        # Simple readability metrics
        avg_word_length = sum(len(word) for word in words) / len(words)
        sentence_count = text.count('.') + text.count('!') + text.count('?')
        avg_sentence_length = len(words) / max(1, sentence_count)
        
        # Optimal ranges for readability
        word_length_score = max(0, 100 - abs(avg_word_length - 5) * 10)
        sentence_length_score = max(0, 100 - abs(avg_sentence_length - 15) * 3)
        
        readability = (word_length_score + sentence_length_score) / 2
        
        return min(100.0, max(0.0, readability))
    
    def structure_response_for_api(self, response: ImageExtractionResponse) -> Dict[str, Any]:
        """
        Structure the complete response for API output following architecture specification.
        
        This is the main method that creates the final structured output.
        """
        try:
            # Create base API response following architecture
            api_response = {
                "raw_data": response.raw_data,
                "cleaned_data": response.cleaned_data.dict() if response.cleaned_data else None,
                "meta_data": response.meta_data.dict() if response.meta_data else None,
                "extracted_time": response.extracted_time.isoformat() if response.extracted_time else None,
                "errors": [error.dict() for error in response.errors],
                "success": response.success,
                "processing_time_ms": response.processing_time_ms,
                "url": response.url,
                "confidence_scores": response.confidence_scores.dict() if response.confidence_scores else None
            }
            
            # Add downstream-optimized schema
            api_response["structured_content"] = self.create_downstream_json_schema(response)
            
            self.logger.info(f"Structured API response for {response.url}")
            
            return api_response
            
        except Exception as e:
            self.logger.error(f"Failed to structure API response: {str(e)}")
            
            # Return minimal error response
            return {
                "raw_data": response.raw_data if hasattr(response, 'raw_data') else None,
                "cleaned_data": None,
                "meta_data": None,
                "extracted_time": datetime.now().isoformat(),
                "errors": [{"message": f"Output structuring failed: {str(e)}", "error_type": "output_structuring"}],
                "success": False,
                "processing_time_ms": 0,
                "url": response.url if hasattr(response, 'url') else "unknown",
                "confidence_scores": None
            }


# Convenience function for output structuring
def structure_image_extraction_output(response: ImageExtractionResponse) -> Dict[str, Any]:
    """
    Convenience function for structuring image extraction output.
    
    This is the main entry point for output structuring that creates
    the final JSON response following architecture specifications.
    
    Args:
        response: ImageExtractionResponse from extractor
    
    Returns:
        Dict with structured JSON output for API response
    """
    structurer = ImageOutputStructurer()
    return structurer.structure_response_for_api(response)