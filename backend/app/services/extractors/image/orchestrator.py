"""
Image OCR Orchestrator

Simple orchestrator that coordinates image extraction using the existing ImageExtractorEngine.
Adds output structuring and monitoring capabilities to the core extraction pipeline.

Architecture Flow:
URL Request → ImageExtractorEngine → Output Structuring → Enhanced Response
"""

import logging
import time
from typing import Optional, Dict, Any
from datetime import datetime
from pydantic import HttpUrl

from .models import (
    ImageExtractionRequest,
    ImageExtractionResponse
)
from .extractor import ImageExtractorEngine
from .output_structuring import ImageOutputStructurer


class ImageExtractionOrchestrator:
    """
    Simple orchestrator that coordinates image extraction and output structuring.
    
    Uses the existing ImageExtractorEngine as the core processing engine and adds
    output structuring and monitoring capabilities.
    """
    
    def __init__(self):
        """Initialize orchestrator with core components"""
        self.logger = logging.getLogger(__name__)
        
        # Initialize core components
        self.extractor = ImageExtractorEngine()
        self.output_structurer = ImageOutputStructurer()
        
        self.logger.info("Image extraction orchestrator initialized")
    
    async def extract_from_url(self, url: str, **kwargs) -> ImageExtractionResponse:
        """
        Extract text content from image URL with enhanced output structuring.
        
        Args:
            url: Image URL to extract from
            **kwargs: Additional extraction options
        
        Returns:
            ImageExtractionResponse with structured output
        """
        start_time = time.time()
        
        self.logger.info(f"Starting orchestrated image extraction for: {url}")
        
        try:
            # Convert string URL to HttpUrl for the request
            http_url = HttpUrl(url)
            request = ImageExtractionRequest(url=http_url)
            
            # Use the core extractor engine
            response = await self.extractor.extract(request)
            
            # Enhance response with structured output
            if response.success:
                try:
                    structured_output = self.output_structurer.structure_response_for_api(response)
                    # Add structured content to response (safely)
                    response_dict = response.dict()
                    response_dict['structured_output'] = structured_output
                    
                    self.logger.debug("Added structured output to response")
                    
                except Exception as e:
                    self.logger.warning(f"Failed to add structured output: {str(e)}")
                    # Continue with original response if structuring fails
            
            # Update processing time
            processing_time = int((time.time() - start_time) * 1000)
            response.processing_time_ms = processing_time
            
            self.logger.info(
                f"Orchestrated extraction completed in {processing_time}ms: "
                f"Success={response.success}, "
                f"Regions={len(response.cleaned_data.text_regions) if response.cleaned_data else 0}"
            )
            
            return response
            
        except Exception as e:
            self.logger.error(f"Orchestrated image extraction failed: {str(e)}")
            
            # Create basic error response
            processing_time = int((time.time() - start_time) * 1000)
            
            return ImageExtractionResponse(
                raw_data="",
                cleaned_data=None,
                meta_data=None,
                extracted_time=datetime.now(),
                errors=[],
                success=False,
                processing_time_ms=processing_time,
                url=url,
                confidence_scores=None
            )
    
    async def extract_with_options(self, url: str, options: Optional[Dict[str, Any]] = None) -> ImageExtractionResponse:
        """
        Extract with custom options (delegated to extractor engine).
        
        Args:
            url: Image URL to extract from
            options: Custom extraction options
        
        Returns:
            ImageExtractionResponse with extraction results
        """
        if options is None:
            options = {}
            
        return await self.extract_from_url(url, **options)
    
    async def health_check(self) -> Dict[str, Any]:
        """
        Perform health check on orchestrator components.
        
        Returns status for monitoring purposes.
        """
        health_status = {
            "orchestrator": "healthy",
            "components": {},
            "timestamp": datetime.now().isoformat()
        }
        
        try:
            # Check extractor engine
            if hasattr(self.extractor, '__dict__'):
                health_status["components"]["extractor"] = "healthy"
            else:
                health_status["components"]["extractor"] = "unknown"
            
            # Check output structurer
            if hasattr(self.output_structurer, '__dict__'):
                health_status["components"]["output_structurer"] = "healthy"
            else:
                health_status["components"]["output_structurer"] = "unknown"
            
            # Overall status
            if all(status == "healthy" for status in health_status["components"].values()):
                health_status["overall_status"] = "healthy"
            else:
                health_status["overall_status"] = "degraded"
                
        except Exception as e:
            health_status["orchestrator"] = f"error: {str(e)}"
            health_status["overall_status"] = "unhealthy"
        
        return health_status
    
    def get_pipeline_info(self) -> Dict[str, Any]:
        """
        Get information about the orchestrated image extraction pipeline.
        """
        return {
            "pipeline_type": "orchestrated_image_ocr_extraction",
            "components": [
                "image_extractor_engine",
                "output_structurer"
            ],
            "supported_formats": ["jpg", "jpeg", "png", "bmp", "tiff", "webp"],
            "ocr_engine": "tesseract",
            "features": [
                "text_extraction_with_confidence",
                "image_preprocessing", 
                "text_region_detection",
                "structured_output_formatting",
                "downstream_json_schema"
            ],
            "architecture_pattern": "url_input → extractor_engine → output_structuring → enhanced_response"
        }
    
    def get_extraction_stats(self) -> Dict[str, Any]:
        """
        Get basic extraction statistics.
        """
        return {
            "orchestrator_version": "1.0.0",
            "engine_info": self.extractor.__class__.__name__ if self.extractor else "unknown",
            "structurer_info": self.output_structurer.__class__.__name__ if self.output_structurer else "unknown",
            "capabilities": [
                "url_based_extraction",
                "structured_output",
                "confidence_scoring",
                "error_handling"
            ]
        }


# Convenience function for orchestrated extraction
async def extract_image_content(url: str, **kwargs) -> ImageExtractionResponse:
    """
    Convenience function for orchestrated image content extraction.
    
    This provides a simple interface to the orchestrated extraction pipeline
    that includes both core extraction and output structuring.
    
    Args:
        url: Image URL to extract from
        **kwargs: Additional extraction options
    
    Returns:
        ImageExtractionResponse with structured output
    """
    orchestrator = ImageExtractionOrchestrator()
    return await orchestrator.extract_from_url(url, **kwargs)


# Health check function
async def check_image_pipeline_health() -> Dict[str, Any]:
    """
    Check health of the image extraction pipeline.
    
    Returns:
        Dict with health status information
    """
    orchestrator = ImageExtractionOrchestrator()
    return await orchestrator.health_check()