"""
Image OCR Post-processing Module

Cleans and structures extracted text from OCR output.
Removes noise, corrects common OCR errors, and organizes content.
"""

import logging
import re
from typing import List, Dict, Tuple, Optional, Any
from collections import Counter

from .models import (
    CleanedImageData,
    TextRegion,
    ConfidenceScore,
    ImageProcessingConfig
)


class TextCleaner:
    """
    Text cleaning engine for OCR output
    
    Removes noise, corrects common OCR errors, and standardizes text
    """
    
    def __init__(self, config: Optional[ImageProcessingConfig] = None):
        """Initialize text cleaner"""
        self.config = config or ImageProcessingConfig()
        self.logger = logging.getLogger(__name__)
        
        # Common OCR error mappings
        self.ocr_corrections = {
            # Common character substitutions
            '0': ['O', 'o'],  # Zero vs O
            '1': ['I', 'l', '|'],  # One vs I/l
            '5': ['S'],  # Five vs S
            '8': ['B'],  # Eight vs B
            'rn': ['m'],  # rn vs m
            'cl': ['d'],  # cl vs d
            'vv': ['w'],  # vv vs w
            
            # Common word corrections
            'teh': 'the',
            'adn': 'and',
            'taht': 'that',
            'wiht': 'with',
            'thier': 'their',
            'recieve': 'receive',
        }
        
        # Characters that are commonly misrecognized
        self.noise_patterns = [
            r'[^\w\s\.\,\?\!\;\:\-\(\)\[\]\{\}\"\'@#$%&*+=/<>]',  # Unusual characters
            r'\s+',  # Multiple spaces
            r'^\s+|\s+$',  # Leading/trailing spaces
        ]
    
    def remove_noise_characters(self, text: str) -> str:
        """
        Remove noise characters from OCR output
        
        Args:
            text: Raw OCR text
            
        Returns:
            Cleaned text
        """
        cleaned = text
        
        # Remove unusual characters
        cleaned = re.sub(self.noise_patterns[0], ' ', cleaned)
        
        # Normalize whitespace
        cleaned = re.sub(self.noise_patterns[1], ' ', cleaned)
        cleaned = re.sub(self.noise_patterns[2], '', cleaned)
        
        return cleaned
    
    def correct_common_errors(self, text: str) -> str:
        """
        Correct common OCR recognition errors
        
        Args:
            text: Text to correct
            
        Returns:
            Corrected text
        """
        corrected = text
        
        # Apply word-level corrections
        for error, correction in self.ocr_corrections.items():
            if isinstance(correction, str):
                # Simple word replacement
                corrected = re.sub(r'\b' + re.escape(error) + r'\b', correction, corrected, flags=re.IGNORECASE)
        
        return corrected
    
    def fix_line_breaks(self, text: str) -> str:
        """
        Fix inappropriate line breaks in OCR text
        
        Args:
            text: Text with potential line break issues
            
        Returns:
            Text with corrected line breaks
        """
        # Join lines that were inappropriately split
        # Look for lowercase letter followed by newline and lowercase letter
        fixed = re.sub(r'([a-z])\n([a-z])', r'\1 \2', text)
        
        # Join lines where word is split across lines (hyphenated)
        fixed = re.sub(r'([a-z])-\n([a-z])', r'\1\2', fixed)
        
        return fixed
    
    def standardize_punctuation(self, text: str) -> str:
        """
        Standardize punctuation marks
        
        Args:
            text: Text to standardize
            
        Returns:
            Text with standardized punctuation
        """
        standardized = text
        
        # Fix multiple periods
        standardized = re.sub(r'\.{2,}', '...', standardized)
        
        # Fix spacing around punctuation
        standardized = re.sub(r'\s*([,.!?;:])\s*', r'\1 ', standardized)
        
        # Remove space before punctuation
        standardized = re.sub(r'\s+([,.!?;:])', r'\1', standardized)
        
        return standardized.strip()
    
    def clean_text(self, text: str) -> str:
        """
        Apply complete text cleaning pipeline
        
        Args:
            text: Raw OCR text
            
        Returns:
            Cleaned text
        """
        if not text.strip():
            return ""
        
        # Apply cleaning steps
        cleaned = self.remove_noise_characters(text)
        cleaned = self.fix_line_breaks(cleaned)
        cleaned = self.correct_common_errors(cleaned)
        cleaned = self.standardize_punctuation(cleaned)
        
        return cleaned.strip()


class ConfidenceAnalyzer:
    """
    Analyzes and adjusts confidence scores based on text quality
    """
    
    def __init__(self):
        """Initialize confidence analyzer"""
        self.logger = logging.getLogger(__name__)
    
    def analyze_text_quality(self, text: str) -> Dict[str, float]:
        """
        Analyze text quality indicators
        
        Args:
            text: Text to analyze
            
        Returns:
            Dictionary with quality metrics
        """
        if not text.strip():
            return {'overall_quality': 0.0}
        
        metrics = {}
        
        # Word ratio (real words vs gibberish)
        words = text.split()
        if words:
            # Simple heuristic: words with vowels are more likely to be real
            vowel_words = sum(1 for word in words if any(v in word.lower() for v in 'aeiou'))
            metrics['word_quality'] = vowel_words / len(words) * 100
        else:
            metrics['word_quality'] = 0.0
        
        # Character diversity (too many repeated chars might indicate noise)
        if len(text) > 0:
            char_counts = Counter(text.lower())
            most_common_ratio = char_counts.most_common(1)[0][1] / len(text)
            metrics['character_diversity'] = (1 - most_common_ratio) * 100
        else:
            metrics['character_diversity'] = 0.0
        
        # Punctuation ratio (reasonable amount of punctuation)
        punctuation_count = sum(1 for char in text if char in '.,!?;:')
        if len(text) > 0:
            punct_ratio = punctuation_count / len(text)
            # Optimal punctuation ratio is around 5-15%
            if 0.05 <= punct_ratio <= 0.15:
                metrics['punctuation_quality'] = 100.0
            else:
                metrics['punctuation_quality'] = max(0, 100 - abs(punct_ratio - 0.1) * 500)
        else:
            metrics['punctuation_quality'] = 50.0
        
        # Overall quality score
        metrics['overall_quality'] = (
            metrics['word_quality'] * 0.5 +
            metrics['character_diversity'] * 0.3 +
            metrics['punctuation_quality'] * 0.2
        )
        
        return metrics
    
    def adjust_confidence_scores(self, text_regions: List[TextRegion]) -> List[TextRegion]:
        """
        Adjust confidence scores based on text quality analysis
        
        Args:
            text_regions: List of TextRegion objects
            
        Returns:
            List of TextRegion objects with adjusted confidence scores
        """
        adjusted_regions = []
        
        for region in text_regions:
            # Analyze text quality
            quality_metrics = self.analyze_text_quality(region.text)
            
            # Adjust confidence based on quality
            quality_factor = quality_metrics['overall_quality'] / 100.0
            adjusted_confidence = region.confidence.overall * (0.5 + 0.5 * quality_factor)
            
            # Create new confidence score
            adjusted_confidence_score = ConfidenceScore(
                overall=min(100.0, max(0.0, adjusted_confidence)),
                word_level=region.confidence.word_level,
                character_level=region.confidence.character_level
            )
            
            # Create adjusted region
            adjusted_region = TextRegion(
                text=region.text,
                bounding_box=region.bounding_box,
                confidence=adjusted_confidence_score,
                language=region.language,
                orientation=region.orientation,
                font_size_estimate=region.font_size_estimate,
                is_handwritten=region.is_handwritten
            )
            
            adjusted_regions.append(adjusted_region)
        
        return adjusted_regions


class StructuringEngine:
    """
    Structures OCR output into organized content
    """
    
    def __init__(self, config: Optional[ImageProcessingConfig] = None):
        """Initialize structuring engine"""
        self.config = config or ImageProcessingConfig()
        self.logger = logging.getLogger(__name__)
    
    def detect_document_structure(self, text_regions: List[TextRegion]) -> Dict[str, List[TextRegion]]:
        """
        Detect document structure (headers, paragraphs, lists, etc.)
        
        Args:
            text_regions: List of TextRegion objects
            
        Returns:
            Dictionary categorizing text regions by type
        """
        structure = {
            'headers': [],
            'paragraphs': [],
            'lists': [],
            'captions': [],
            'other': []
        }
        
        for region in text_regions:
            text = region.text.strip()
            
            # Skip empty regions
            if not text:
                continue
            
            # Detect headers (larger font, short text, often uppercase)
            if (region.font_size_estimate and region.font_size_estimate > 16 and
                len(text.split()) <= 10 and
                (text.isupper() or text.istitle())):
                structure['headers'].append(region)
            
            # Detect lists (starting with bullets, numbers, etc.)
            elif re.match(r'^[\•\-\*\d+\.\)]\s+', text):
                structure['lists'].append(region)
            
            # Detect captions (often start with "Figure", "Table", etc.)
            elif re.match(r'^(Figure|Table|Chart|Image|Photo)\s+\d*', text, re.IGNORECASE):
                structure['captions'].append(region)
            
            # Regular paragraphs
            elif len(text.split()) > 3:
                structure['paragraphs'].append(region)
            
            # Everything else
            else:
                structure['other'].append(region)
        
        return structure
    
    def create_reading_order(self, text_regions: List[TextRegion]) -> List[TextRegion]:
        """
        Organize text regions in logical reading order
        
        Args:
            text_regions: List of TextRegion objects
            
        Returns:
            List of TextRegion objects in reading order
        """
        if not text_regions:
            return []
        
        # Sort by vertical position first (top to bottom)
        # Then by horizontal position (left to right) for same vertical level
        def sort_key(region):
            return (region.bounding_box.y, region.bounding_box.x)
        
        return sorted(text_regions, key=sort_key)
    
    def create_structured_content(self, text_regions: List[TextRegion]) -> Dict[str, Any]:
        """
        Create structured content representation
        
        Args:
            text_regions: List of TextRegion objects
            
        Returns:
            Dictionary with structured content
        """
        # Order regions logically
        ordered_regions = self.create_reading_order(text_regions)
        
        # Detect document structure
        structure = self.detect_document_structure(ordered_regions)
        
        # Create structured output
        structured_content = {
            'reading_order': [region.text for region in ordered_regions],
            'document_structure': {
                'headers': [region.text for region in structure['headers']],
                'paragraphs': [region.text for region in structure['paragraphs']],
                'lists': [region.text for region in structure['lists']],
                'captions': [region.text for region in structure['captions']],
                'other': [region.text for region in structure['other']]
            },
            'statistics': {
                'total_regions': len(text_regions),
                'headers_count': len(structure['headers']),
                'paragraphs_count': len(structure['paragraphs']),
                'lists_count': len(structure['lists']),
                'captions_count': len(structure['captions'])
            }
        }
        
        return structured_content


class ImagePostProcessor:
    """
    Main post-processing engine for image OCR results
    
    Combines text cleaning, confidence adjustment, and content structuring
    """
    
    def __init__(self, config: Optional[ImageProcessingConfig] = None):
        """Initialize post-processor"""
        self.config = config or ImageProcessingConfig()
        self.text_cleaner = TextCleaner(self.config)
        self.confidence_analyzer = ConfidenceAnalyzer()
        self.structuring_engine = StructuringEngine(self.config)
        self.logger = logging.getLogger(__name__)
    
    def process_text_regions(self, text_regions: List[TextRegion]) -> Tuple[List[TextRegion], str]:
        """
        Process and clean text regions
        
        Args:
            text_regions: Raw text regions from OCR
            
        Returns:
            Tuple of (cleaned_text_regions, full_cleaned_text)
        """
        cleaned_regions = []
        cleaned_texts = []
        
        for region in text_regions:
            # Clean the text
            cleaned_text = self.text_cleaner.clean_text(region.text)
            
            # Skip regions with no meaningful text after cleaning
            if not cleaned_text.strip():
                continue
            
            # Create cleaned region
            cleaned_region = TextRegion(
                text=cleaned_text,
                bounding_box=region.bounding_box,
                confidence=region.confidence,
                language=region.language,
                orientation=region.orientation,
                font_size_estimate=region.font_size_estimate,
                is_handwritten=region.is_handwritten
            )
            
            cleaned_regions.append(cleaned_region)
            cleaned_texts.append(cleaned_text)
        
        # Combine all cleaned text
        full_cleaned_text = ' '.join(cleaned_texts)
        
        return cleaned_regions, full_cleaned_text
    
    def post_process(self, cleaned_data: CleanedImageData) -> CleanedImageData:
        """
        Apply complete post-processing pipeline
        
        Args:
            cleaned_data: Initial cleaned data from OCR
            
        Returns:
            Enhanced CleanedImageData with post-processing applied
        """
        try:
            self.logger.info("Starting post-processing of OCR results")
            
            # Process text regions
            processed_regions, processed_full_text = self.process_text_regions(cleaned_data.text_regions)
            
            # Adjust confidence scores based on text quality
            confidence_adjusted_regions = self.confidence_analyzer.adjust_confidence_scores(processed_regions)
            
            # Create structured content
            structured_content = self.structuring_engine.create_structured_content(confidence_adjusted_regions)
            
            # Recalculate statistics
            total_characters = len(processed_full_text)
            total_words = len(processed_full_text.split()) if processed_full_text else 0
            total_lines = len(structured_content['reading_order'])
            
            # Calculate new overall confidence
            if confidence_adjusted_regions:
                overall_confidence = sum(region.confidence.overall for region in confidence_adjusted_regions) / len(confidence_adjusted_regions)
            else:
                overall_confidence = 0.0
            
            # Create enhanced cleaned data
            enhanced_data = CleanedImageData(
                full_text=processed_full_text,
                text_regions=confidence_adjusted_regions,
                lines=structured_content['reading_order'],
                paragraphs=structured_content['document_structure']['paragraphs'],
                words=[
                    {
                        'text': word,
                        'x': region.bounding_box.x,
                        'y': region.bounding_box.y,
                        'confidence': region.confidence.overall
                    }
                    for region in confidence_adjusted_regions
                    for word in region.text.split()
                ],
                total_characters=total_characters,
                total_words=total_words,
                total_lines=total_lines,
                overall_confidence=overall_confidence,
                text_density=cleaned_data.text_density,  # Keep original
                clarity_score=cleaned_data.clarity_score  # Keep original
            )
            
            self.logger.info(f"Post-processing completed: {len(confidence_adjusted_regions)} regions processed")
            
            return enhanced_data
            
        except Exception as e:
            self.logger.error(f"Post-processing failed: {str(e)}")
            # Return original data if post-processing fails
            return cleaned_data


# Convenience function for post-processing
def post_process_ocr_results(cleaned_data: CleanedImageData, 
                           config: Optional[ImageProcessingConfig] = None) -> CleanedImageData:
    """
    Convenience function for post-processing OCR results
    
    Args:
        cleaned_data: CleanedImageData from OCR extraction
        config: Optional processing configuration
    
    Returns:
        Enhanced CleanedImageData
    """
    post_processor = ImagePostProcessor(config)
    return post_processor.post_process(cleaned_data)