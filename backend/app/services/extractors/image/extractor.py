"""
OCR Extraction Engine

Core OCR functionality using PyTesseract for text detection and extraction.
Provides confidence scores, bounding boxes, and detailed text region information.
"""

import logging
import time
from typing import List, Dict, Optional, Any

try:
    import pytesseract
    from pytesseract import Output as PytesseractOutput
    TESSERACT_AVAILABLE = True
    
    # Auto-detect Tesseract path on Windows if not in PATH
    def _auto_detect_tesseract_path():
        """Auto-detect Tesseract binary path on Windows common install locations"""
        import os
        import sys
        if sys.platform == 'win32':
            common_paths = [
                r'C:\Program Files\Tesseract-OCR\tesseract.exe',
                r'C:\Program Files (x86)\Tesseract-OCR\tesseract.exe',
            ]
            for path in common_paths:
                if os.path.exists(path):
                    return path
        return None
    
    # Try to auto-detect and set Tesseract path if not available in PATH
    try:
        pytesseract.get_tesseract_version()
    except pytesseract.TesseractNotFoundError:
        tesseract_path = _auto_detect_tesseract_path()
        if tesseract_path:
            pytesseract.pytesseract.tesseract_cmd = tesseract_path
            try:
                pytesseract.get_tesseract_version()
                TESSERACT_AVAILABLE = True
                TESSERACT_ERROR = None
            except Exception as e:
                TESSERACT_AVAILABLE = False
                TESSERACT_ERROR = f"Tesseract OCR found but failed to initialize: {str(e)}"
        else:
            TESSERACT_AVAILABLE = False
            TESSERACT_ERROR = "Tesseract OCR executable not found. Please install Tesseract OCR from https://github.com/tesseract-ocr/tesseract"
    except Exception as e:
        TESSERACT_AVAILABLE = False
        TESSERACT_ERROR = f"Tesseract configuration error: {str(e)}"
    else:
        TESSERACT_ERROR = None
        
except ImportError as e:
    TESSERACT_AVAILABLE = False
    TESSERACT_ERROR = f"pytesseract package not installed: {str(e)}"
    pytesseract = None
    PytesseractOutput = None

from PIL import Image

from .models import (
    ImageExtractionRequest,
    ImageExtractionResponse,
    ImageMetaData,
    CleanedImageData,
    TextRegion,
    BoundingBox,
    ConfidenceScore,
    ImageProcessingConfig
)
from .preprocessor import ImagePreprocessor
from .error_handling import handle_image_extraction_error


class OCREngine:
    """
    Core OCR engine using PyTesseract
    
    Handles text detection, extraction, and confidence scoring
    """
    
    def __init__(self, config: Optional[ImageProcessingConfig] = None):
        """Initialize OCR engine with configuration"""
        self.config = config or ImageProcessingConfig()
        self.logger = logging.getLogger(__name__)
        
        if not TESSERACT_AVAILABLE:
            raise RuntimeError(f"Tesseract OCR is not available: {TESSERACT_ERROR}")
    
    def extract_text_data(self, image: Image.Image) -> Dict[str, Any]:
        """
        Extract comprehensive text data from image using Tesseract
        
        Args:
            image: PIL Image object
            
        Returns:
            Dictionary with text data including boxes and confidence
        """
        if not TESSERACT_AVAILABLE or not pytesseract or not PytesseractOutput:
            raise RuntimeError(f"Tesseract OCR is not available: {TESSERACT_ERROR}")
        
        try:
            # Configure Tesseract
            custom_config = f'--oem {self.config.oem} --psm {self.config.psm} -l {self.config.language}'
            
            # Extract detailed text data
            data = pytesseract.image_to_data(
                image, 
                config=custom_config,
                output_type=PytesseractOutput.DICT
            )
            
            self.logger.debug(f"Extracted text data with {len(data.get('text', []))} elements")
            
            return data
            
        except Exception as e:
            self.logger.error(f"Failed to extract text data: {str(e)}")
            raise
    
    def extract_text_string(self, image: Image.Image) -> str:
        """
        Extract plain text string from image
        
        Args:
            image: PIL Image object
            
        Returns:
            Extracted text string
        """
        if not TESSERACT_AVAILABLE or not pytesseract:
            raise RuntimeError(f"Tesseract OCR is not available: {TESSERACT_ERROR}")
        
        try:
            custom_config = f'--oem {self.config.oem} --psm {self.config.psm} -l {self.config.language}'
            
            text = pytesseract.image_to_string(
                image,
                config=custom_config
            )
            
            return text.strip()
            
        except Exception as e:
            self.logger.error(f"Failed to extract text string: {str(e)}")
            raise
    
    def create_text_regions(self, data: Dict[str, Any]) -> List[TextRegion]:
        """
        Create TextRegion objects from Tesseract data
        
        Args:
            data: Tesseract output data dictionary
            
        Returns:
            List of TextRegion objects
        """
        text_regions = []
        
        try:
            # Process each detected text element
            for i in range(len(data['text'])):
                text = data['text'][i].strip()
                confidence = float(data['conf'][i])
                
                # Skip low-confidence or empty text
                if not text or confidence < self.config.min_confidence_threshold:
                    continue
                
                # Create bounding box
                bbox = BoundingBox(
                    x=int(data['left'][i]),
                    y=int(data['top'][i]),
                    width=int(data['width'][i]),
                    height=int(data['height'][i])
                )
                
                # Create confidence score
                confidence_score = ConfidenceScore(
                    overall=confidence,
                    word_level=[confidence],  # Single word for now
                    character_level=None  # Not available from this method
                )
                
                # Estimate font size based on height
                font_size_estimate = max(8, int(bbox.height * 0.7))
                
                # Create text region
                text_region = TextRegion(
                    text=text,
                    bounding_box=bbox,
                    confidence=confidence_score,
                    language=self.config.language,
                    font_size_estimate=font_size_estimate
                )
                
                text_regions.append(text_region)
            
            self.logger.debug(f"Created {len(text_regions)} text regions")
            
            return text_regions
            
        except Exception as e:
            self.logger.error(f"Failed to create text regions: {str(e)}")
            raise
    
    def calculate_overall_confidence(self, text_regions: List[TextRegion]) -> float:
        """
        Calculate overall confidence score for all extracted text
        
        Args:
            text_regions: List of TextRegion objects
            
        Returns:
            Overall confidence score (0-100)
        """
        if not text_regions:
            return 0.0
        
        # Weight by text length for more accurate overall score
        total_weighted_confidence = 0.0
        total_length = 0
        
        for region in text_regions:
            text_length = len(region.text)
            confidence = region.confidence.overall
            
            total_weighted_confidence += confidence * text_length
            total_length += text_length
        
        if total_length == 0:
            return 0.0
        
        overall_confidence = total_weighted_confidence / total_length
        return min(100.0, max(0.0, overall_confidence))


class TextDetector:
    """
    Text detection and region identification
    """
    
    def __init__(self, config: Optional[ImageProcessingConfig] = None):
        """Initialize text detector"""
        self.config = config or ImageProcessingConfig()
        self.logger = logging.getLogger(__name__)
    
    def detect_text_density(self, image: Image.Image, text_regions: List[TextRegion]) -> float:
        """
        Calculate text density (ratio of text area to image area)
        
        Args:
            image: PIL Image object
            text_regions: List of detected text regions
            
        Returns:
            Text density ratio (0.0 to 1.0)
        """
        if not text_regions:
            return 0.0
        
        image_area = image.size[0] * image.size[1]
        text_area = sum(
            region.bounding_box.width * region.bounding_box.height 
            for region in text_regions
        )
        
        density = text_area / image_area if image_area > 0 else 0.0
        return min(1.0, max(0.0, density))
    
    def organize_text_by_lines(self, text_regions: List[TextRegion]) -> List[str]:
        """
        Organize text regions into lines based on vertical position
        
        Args:
            text_regions: List of TextRegion objects
            
        Returns:
            List of text lines
        """
        if not text_regions:
            return []
        
        # Sort by vertical position (top to bottom)
        sorted_regions = sorted(text_regions, key=lambda r: r.bounding_box.y)
        
        lines = []
        current_line = []
        current_y = None
        line_height_threshold = 10  # Pixels
        
        for region in sorted_regions:
            region_y = region.bounding_box.y
            
            if current_y is None or abs(region_y - current_y) <= line_height_threshold:
                # Same line
                current_line.append(region)
                current_y = region_y
            else:
                # New line
                if current_line:
                    # Sort current line by horizontal position (left to right)
                    current_line.sort(key=lambda r: r.bounding_box.x)
                    line_text = ' '.join(r.text for r in current_line)
                    lines.append(line_text)
                
                current_line = [region]
                current_y = region_y
        
        # Add last line
        if current_line:
            current_line.sort(key=lambda r: r.bounding_box.x)
            line_text = ' '.join(r.text for r in current_line)
            lines.append(line_text)
        
        return lines


class ImageExtractorEngine:
    """
    Complete image extraction engine
    
    Orchestrates preprocessing, OCR, and result compilation
    """
    
    def __init__(self, config: Optional[ImageProcessingConfig] = None):
        """Initialize extraction engine"""
        self.config = config or ImageProcessingConfig()
        self.preprocessor = ImagePreprocessor(self.config)
        self.ocr_engine = OCREngine(self.config)
        self.text_detector = TextDetector(self.config)
        self.logger = logging.getLogger(__name__)
    
    def create_image_metadata(self, url: str, image: Image.Image, 
                            preprocessing_ops: List[str], 
                            processing_time_ms: int,
                            text_regions: List[TextRegion]) -> ImageMetaData:
        """
        Create comprehensive image metadata
        
        Args:
            url: Source URL
            image: Processed image
            preprocessing_ops: Applied preprocessing operations
            processing_time_ms: Total processing time
            text_regions: Detected text regions
            
        Returns:
            ImageMetaData object
        """
        try:
            # Calculate statistics
            total_text_regions = len(text_regions)
            average_confidence = self.ocr_engine.calculate_overall_confidence(text_regions) if text_regions else 0.0
            
            # Extract languages (simplified - could be enhanced)
            languages_detected = [self.config.language] if text_regions else []
            
            metadata = ImageMetaData(
                filename=url.split('/')[-1] if '/' in url else 'image',
                format=image.format or 'Unknown',
                width=image.size[0],
                height=image.size[1],
                file_size_bytes=None,  # We don't have the original file size here
                color_mode=image.mode,
                source_url=url,
                preprocessing_applied=preprocessing_ops,
                ocr_engine_version=f"tesseract_{pytesseract.get_tesseract_version()}" if TESSERACT_AVAILABLE and pytesseract else "tesseract_unavailable",
                processing_time_ms=processing_time_ms,
                total_text_regions=total_text_regions,
                average_confidence=average_confidence,
                languages_detected=languages_detected
            )
            
            return metadata
            
        except Exception as e:
            self.logger.warning(f"Failed to create complete metadata: {str(e)}")
            
            # Return minimal metadata
            return ImageMetaData(
                source_url=url,
                preprocessing_applied=preprocessing_ops,
                processing_time_ms=processing_time_ms,
                total_text_regions=len(text_regions)
            )
    
    def create_cleaned_data(self, text_regions: List[TextRegion], 
                          full_text: str, quality_metrics: Dict[str, float]) -> CleanedImageData:
        """
        Create cleaned and structured data from extraction results
        
        Args:
            text_regions: Detected text regions
            full_text: Complete extracted text
            quality_metrics: Image quality assessment
            
        Returns:
            CleanedImageData object
        """
        # Organize text by lines
        lines = self.text_detector.organize_text_by_lines(text_regions)
        
        # Create simple paragraphs (lines separated by empty lines)
        paragraphs = [line for line in lines if line.strip()]
        
        # Create word list with positions
        words = []
        for region in text_regions:
            for word in region.text.split():
                words.append({
                    'text': word,
                    'x': region.bounding_box.x,
                    'y': region.bounding_box.y,
                    'confidence': region.confidence.overall
                })
        
        # Calculate statistics
        total_characters = len(full_text)
        total_words = len(full_text.split()) if full_text else 0
        total_lines = len(lines)
        
        # Calculate overall confidence
        overall_confidence = self.ocr_engine.calculate_overall_confidence(text_regions)
        
        cleaned_data = CleanedImageData(
            full_text=full_text,
            text_regions=text_regions,
            lines=lines,
            paragraphs=paragraphs,
            words=words,
            total_characters=total_characters,
            total_words=total_words,
            total_lines=total_lines,
            overall_confidence=overall_confidence,
            text_density=quality_metrics.get('text_density', 0.0),
            clarity_score=quality_metrics.get('quality_score', 0.0)
        )
        
        return cleaned_data
    
    async def extract(self, request: ImageExtractionRequest) -> ImageExtractionResponse:
        """
        Main extraction method following architecture pipeline
        
        Architecture: Request[url] → Preprocessor → OCR → Post-processor → Response
        
        Args:
            request: ImageExtractionRequest object
            
        Returns:
            ImageExtractionResponse with complete extraction results
        """
        start_time = time.time()
        response = ImageExtractionResponse(url=str(request.url))
        
        try:
            self.logger.info(f"Starting image extraction for: {request.url}")
            
            # Step 1: Preprocessing (download and enhance image)
            try:
                processed_image, preprocessing_ops, quality_metrics = await self.preprocessor.preprocess_from_url(str(request.url))
            except Exception as e:
                return handle_image_extraction_error(
                    response, e, "preprocessing", 
                    context={"url": str(request.url)},
                    url=str(request.url),
                    logger=self.logger
                )
            
            # Step 2: OCR Processing
            try:
                # Extract text data with confidence scores
                text_data = self.ocr_engine.extract_text_data(processed_image)
                
                # Extract plain text
                full_text = self.ocr_engine.extract_text_string(processed_image)
                
                # Create text regions with bounding boxes and confidence
                text_regions = self.ocr_engine.create_text_regions(text_data)
                
                # Calculate text density
                quality_metrics['text_density'] = self.text_detector.detect_text_density(processed_image, text_regions)
                
            except Exception as e:
                return handle_image_extraction_error(
                    response, e, "ocr",
                    context={"preprocessing_applied": preprocessing_ops},
                    url=str(request.url),
                    logger=self.logger
                )
            
            # Step 3: Create response data
            processing_time_ms = int((time.time() - start_time) * 1000)
            
            try:
                # Create metadata
                metadata = self.create_image_metadata(
                    str(request.url), processed_image, preprocessing_ops, 
                    processing_time_ms, text_regions
                )
                
                # Create cleaned data
                cleaned_data = self.create_cleaned_data(text_regions, full_text, quality_metrics)
                
                # Create overall confidence score
                overall_confidence = ConfidenceScore(
                    overall=cleaned_data.overall_confidence,
                    word_level=[region.confidence.overall for region in text_regions],
                    character_level=None  # Not implemented yet
                )
                
                # Create raw data (JSON representation of text boxes)
                raw_data = {
                    'text_regions': [
                        {
                            'text': region.text,
                            'bbox': {
                                'x': region.bounding_box.x,
                                'y': region.bounding_box.y,
                                'width': region.bounding_box.width,
                                'height': region.bounding_box.height
                            },
                            'confidence': region.confidence.overall
                        }
                        for region in text_regions
                    ],
                    'full_text': full_text,
                    'total_regions': len(text_regions)
                }
                
                # Populate response
                response.raw_data = str(raw_data)
                response.cleaned_data = cleaned_data
                response.meta_data = metadata
                response.confidence_scores = overall_confidence
                response.processing_time_ms = processing_time_ms
                response.success = True
                
                self.logger.info(f"Extraction completed successfully: {len(text_regions)} regions, {len(full_text)} characters")
                
            except Exception as e:
                return handle_image_extraction_error(
                    response, e, "post_processing",
                    context={"text_regions_count": len(text_regions) if 'text_regions' in locals() else 0},
                    url=str(request.url),
                    logger=self.logger
                )
            
            return response
            
        except Exception as e:
            self.logger.error(f"Unexpected error in image extraction: {str(e)}")
            return handle_image_extraction_error(
                response, e, "unknown",
                context={"unexpected_error": True},
                url=str(request.url),
                logger=self.logger
            )


# Convenience function for image extraction
async def extract_image_content(url: str, config: Optional[ImageProcessingConfig] = None) -> ImageExtractionResponse:
    """
    Convenience function for image content extraction
    
    Args:
        url: Image URL
        config: Optional processing configuration
    
    Returns:
        ImageExtractionResponse with extraction results
    """
    from pydantic import HttpUrl
    
    # Convert string URL to HttpUrl for validation
    validated_url = HttpUrl(url)
    request = ImageExtractionRequest(url=validated_url)
    
    engine = ImageExtractorEngine(config)
    return await engine.extract(request)