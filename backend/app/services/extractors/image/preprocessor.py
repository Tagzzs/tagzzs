"""
Image Preprocessing Module

Enhances images for optimal OCR extraction through various preprocessing techniques.
Includes orientation correction, noise reduction, contrast enhancement, and quality assessment.
"""

import logging
import io
import numpy as np
from typing import Optional, Tuple, List, Dict
from PIL import Image, ImageEnhance, ImageFilter, ImageOps
import requests

from .models import ImageProcessingConfig


class ImagePreprocessor:
    """
    Image preprocessing engine for OCR optimization
    
    Applies various enhancement techniques to improve OCR accuracy:
    - Orientation correction
    - Noise reduction
    - Contrast enhancement
    - DPI optimization
    - Format conversion
    """
    
    def __init__(self, config: Optional[ImageProcessingConfig] = None):
        """Initialize preprocessor with configuration"""
        self.config = config or ImageProcessingConfig()
        self.logger = logging.getLogger(__name__)
        self.applied_operations: List[str] = []
    
    def download_image(self, url: str) -> bytes:
        """
        Download image from URL
        
        Args:
            url: Image URL
            
        Returns:
            Image bytes
            
        Raises:
            Exception: If download fails
        """
        try:
            self.logger.info(f"Downloading image from: {url}")
            
            headers = {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
            }
            
            response = requests.get(
                url, 
                headers=headers, 
                timeout=self.config.timeout_seconds,
                stream=True
            )
            response.raise_for_status()
            
            # Check content length
            content_length = response.headers.get('content-length')
            if content_length:
                size_mb = int(content_length) / (1024 * 1024)
                if size_mb > self.config.max_image_size_mb:
                    raise ValueError(f"Image too large: {size_mb:.1f}MB (max: {self.config.max_image_size_mb}MB)")
            
            image_data = response.content
            
            # Final size check
            size_mb = len(image_data) / (1024 * 1024)
            if size_mb > self.config.max_image_size_mb:
                raise ValueError(f"Image too large: {size_mb:.1f}MB (max: {self.config.max_image_size_mb}MB)")
            
            self.logger.info(f"Downloaded image: {size_mb:.2f}MB")
            return image_data
            
        except requests.RequestException as e:
            self.logger.error(f"Failed to download image from {url}: {str(e)}")
            raise
        except Exception as e:
            self.logger.error(f"Error downloading image: {str(e)}")
            raise
    
    def load_image(self, image_data: bytes) -> Image.Image:
        """
        Load image from bytes and perform basic validation
        
        Args:
            image_data: Raw image bytes
            
        Returns:
            PIL Image object
            
        Raises:
            Exception: If image cannot be loaded or is invalid
        """
        try:
            # Load image
            image = Image.open(io.BytesIO(image_data))
            
            # Verify image
            image.verify()
            
            # Reload for processing (verify() closes the file)
            image = Image.open(io.BytesIO(image_data))
            
            # Basic validation
            if image.size[0] < 10 or image.size[1] < 10:
                raise ValueError("Image too small for processing")
            
            self.logger.info(f"Loaded image: {image.size[0]}x{image.size[1]}, mode: {image.mode}, format: {image.format}")
            
            return image
            
        except Exception as e:
            self.logger.error(f"Failed to load image: {str(e)}")
            raise
    
    def assess_image_quality(self, image: Image.Image) -> Dict[str, float]:
        """
        Assess image quality metrics for OCR suitability
        
        Args:
            image: PIL Image object
            
        Returns:
            Dictionary with quality metrics
        """
        try:
            # Convert to grayscale for analysis
            gray_image = image.convert('L')
            img_array = np.array(gray_image)
            
            # Calculate various quality metrics
            metrics = {}
            
            # Brightness (mean intensity)
            metrics['brightness'] = float(np.mean(img_array))
            
            # Contrast (standard deviation)
            metrics['contrast'] = float(np.std(img_array))
            
            # Sharpness (Laplacian variance)
            try:
                from scipy import ndimage
                laplacian_var = ndimage.variance(ndimage.laplace(img_array))
                metrics['sharpness'] = float(laplacian_var)
            except ImportError:
                # Fallback without scipy
                metrics['sharpness'] = float(np.var(img_array))
            
            # Noise estimation (local variance)
            if img_array.size > 100:
                # Sample random patches for noise estimation
                patches = []
                for _ in range(10):
                    y = np.random.randint(0, max(1, img_array.shape[0] - 10))
                    x = np.random.randint(0, max(1, img_array.shape[1] - 10))
                    patch = img_array[y:y+10, x:x+10]
                    if patch.size > 0:
                        patches.append(np.var(patch))
                
                if patches:
                    metrics['noise_level'] = float(np.mean(patches))
                else:
                    metrics['noise_level'] = 0.0
            else:
                metrics['noise_level'] = 0.0
            
            # Overall quality score (0-100)
            quality_score = min(100, (metrics['contrast'] / 50.0) * (metrics['sharpness'] / 100.0) * 100)
            metrics['quality_score'] = max(0, min(100, quality_score))
            
            self.logger.debug(f"Image quality metrics: {metrics}")
            
            return metrics
            
        except Exception as e:
            self.logger.warning(f"Failed to assess image quality: {str(e)}")
            return {'quality_score': 50.0}  # Default moderate quality
    
    def enhance_contrast(self, image: Image.Image) -> Image.Image:
        """
        Enhance image contrast for better OCR
        
        Args:
            image: PIL Image object
            
        Returns:
            Enhanced image
        """
        try:
            # Auto-enhance contrast
            enhancer = ImageEnhance.Contrast(image)
            
            # Determine enhancement factor based on current contrast
            quality_metrics = self.assess_image_quality(image)
            contrast_level = quality_metrics.get('contrast', 50)
            
            if contrast_level < 30:
                factor = 1.5  # Boost low contrast
            elif contrast_level > 80:
                factor = 0.9  # Reduce high contrast slightly
            else:
                factor = 1.2  # Moderate enhancement
            
            enhanced = enhancer.enhance(factor)
            self.applied_operations.append(f"contrast_enhancement_{factor:.1f}")
            
            self.logger.debug(f"Enhanced contrast with factor: {factor}")
            return enhanced
            
        except Exception as e:
            self.logger.warning(f"Failed to enhance contrast: {str(e)}")
            return image
    
    def reduce_noise(self, image: Image.Image) -> Image.Image:
        """
        Apply noise reduction filters
        
        Args:
            image: PIL Image object
            
        Returns:
            Denoised image
        """
        try:
            # Apply median filter for noise reduction
            denoised = image.filter(ImageFilter.MedianFilter(size=3))
            
            # Apply slight gaussian blur for additional smoothing
            denoised = denoised.filter(ImageFilter.GaussianBlur(radius=0.5))
            
            self.applied_operations.append("noise_reduction")
            
            self.logger.debug("Applied noise reduction filters")
            return denoised
            
        except Exception as e:
            self.logger.warning(f"Failed to reduce noise: {str(e)}")
            return image
    
    def correct_orientation(self, image: Image.Image) -> Image.Image:
        """
        Detect and correct image orientation
        
        Args:
            image: PIL Image object
            
        Returns:
            Orientation-corrected image
        """
        try:
            # Try to use EXIF orientation data
            corrected = ImageOps.exif_transpose(image)
            
            if corrected != image:
                self.applied_operations.append("exif_orientation_correction")
                self.logger.debug("Applied EXIF orientation correction")
                return corrected
            
            # TODO: Implement text-based orientation detection
            # For now, return original image
            return image
            
        except Exception as e:
            self.logger.warning(f"Failed to correct orientation: {str(e)}")
            return image
    
    def resize_for_ocr(self, image: Image.Image) -> Image.Image:
        """
        Resize image to optimal DPI for OCR
        
        Args:
            image: PIL Image object
            
        Returns:
            Resized image
        """
        try:
            # Target DPI for OCR (typically 300 DPI is optimal)
            target_dpi = self.config.target_dpi
            
            # Get current DPI (default to 72 if not available)
            current_dpi = image.info.get('dpi', (72, 72))[0]
            
            # Calculate resize factor
            resize_factor = target_dpi / current_dpi
            
            # Only resize if factor is significantly different
            if not (0.8 <= resize_factor <= 1.2):
                new_width = int(image.size[0] * resize_factor)
                new_height = int(image.size[1] * resize_factor)
                
                # Use high-quality resampling
                resized = image.resize((new_width, new_height), Image.Resampling.LANCZOS)
                
                self.applied_operations.append(f"resize_for_ocr_{resize_factor:.2f}")
                self.logger.debug(f"Resized image for OCR: {image.size} -> {resized.size} (factor: {resize_factor:.2f})")
                
                return resized
            
            return image
            
        except Exception as e:
            self.logger.warning(f"Failed to resize for OCR: {str(e)}")
            return image
    
    def convert_to_optimal_format(self, image: Image.Image) -> Image.Image:
        """
        Convert image to optimal format for OCR
        
        Args:
            image: PIL Image object
            
        Returns:
            Format-optimized image
        """
        try:
            # Convert to RGB if not already (handles RGBA, P, etc.)
            if image.mode not in ['RGB', 'L']:
                if image.mode == 'RGBA':
                    # Create white background for transparent images
                    background = Image.new('RGB', image.size, (255, 255, 255))
                    background.paste(image, mask=image.split()[-1])
                    converted = background
                else:
                    converted = image.convert('RGB')
                
                self.applied_operations.append(f"format_conversion_{image.mode}_to_RGB")
                self.logger.debug(f"Converted image format: {image.mode} -> RGB")
                
                return converted
            
            return image
            
        except Exception as e:
            self.logger.warning(f"Failed to convert format: {str(e)}")
            return image
    
    def preprocess_image(self, image_data: bytes) -> Tuple[Image.Image, List[str], Dict[str, float]]:
        """
        Apply complete preprocessing pipeline to image
        
        Args:
            image_data: Raw image bytes
            
        Returns:
            Tuple of (processed_image, applied_operations, quality_metrics)
        """
        self.applied_operations = []  # Reset operations list
        
        try:
            # Load image
            image = self.load_image(image_data)
            
            # Assess initial quality
            initial_quality = self.assess_image_quality(image)
            
            # Apply preprocessing steps based on configuration
            if self.config.correct_orientation:
                image = self.correct_orientation(image)
            
            if self.config.enhance_contrast:
                image = self.enhance_contrast(image)
            
            if self.config.denoise_image:
                image = self.reduce_noise(image)
            
            if self.config.resize_for_ocr:
                image = self.resize_for_ocr(image)
            
            # Always convert to optimal format
            image = self.convert_to_optimal_format(image)
            
            # Assess final quality
            final_quality = self.assess_image_quality(image)
            
            # Combine quality metrics
            quality_metrics = {
                'initial_quality': initial_quality.get('quality_score', 0),
                'final_quality': final_quality.get('quality_score', 0),
                'improvement': final_quality.get('quality_score', 0) - initial_quality.get('quality_score', 0),
                **final_quality
            }
            
            self.logger.info(f"Preprocessing completed. Applied operations: {self.applied_operations}")
            self.logger.info(f"Quality improvement: {quality_metrics['improvement']:.1f} points")
            
            return image, self.applied_operations, quality_metrics
            
        except Exception as e:
            self.logger.error(f"Preprocessing failed: {str(e)}")
            raise
    
    async def preprocess_from_url(self, url: str) -> Tuple[Image.Image, List[str], Dict[str, float]]:
        """
        Download and preprocess image from URL
        
        Args:
            url: Image URL
            
        Returns:
            Tuple of (processed_image, applied_operations, quality_metrics)
        """
        try:
            # Download image
            image_data = self.download_image(url)
            
            # Preprocess
            return self.preprocess_image(image_data)
            
        except Exception as e:
            self.logger.error(f"Failed to preprocess image from URL {url}: {str(e)}")
            raise