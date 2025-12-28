"""
Tag Generation Request/Response Models

Data structures for tag generation pipeline using Groq API.
Following architecture pattern with free-tier API integration.
"""

from pydantic import BaseModel, validator
from typing import List
from datetime import datetime


class TagGenerationRequest(BaseModel):
    """Request model for tag generation via Groq API"""

    text: str
    top_k: int = 5

    @validator("text")
    def validate_text(cls, v):
        """Ensure text is not empty"""
        if not v.strip():
            raise ValueError("Text cannot be empty")
        if len(v) < 20:
            raise ValueError("Text must be at least 20 characters")
        return v.strip()

    @validator("top_k")
    def validate_top_k(cls, v):
        """Ensure valid top_k"""
        if v < 1 or v > 10:
            raise ValueError("top_k must be between 1 and 10")
        return v


class Tag(BaseModel):
    """Individual tag with score"""

    name: str
    score: float  # Confidence score 0-1


class TagGenerationResponse(BaseModel):
    """Response model for tag generation via Groq API"""

    success: bool
    text: str
    tags: List[Tag]
    candidate_labels: List[str]
    processing_time_ms: int
    model_used: str = "llama-3.3-70b-versatile"
    generated_at: datetime = datetime.utcnow()
    api_provider: str = "groq"
    errors: List[str] = []


class TagGenerationConfig(BaseModel):
    """Configuration for tag generation engine using Groq API"""

    model_name: str = "llama-3.1-8b-instant"
    api_key: str = ""

    temperature: float = 0.7
    top_p: float = 0.9

    candidate_labels: List[str] = [
        # Content Types & Formats
        "Tutorial",
        "Guide",
        "Review",
        "Vlog",
        "Documentary",
        "Interview",
        "Podcast",
        "News",
        "Opinion",
        "Report",
        "Case Study",
        "Research Paper",
        "Documentation",
        # Technology & Engineering
        "AI",
        "Machine Learning",
        "Deep Learning",
        "NLP",
        "Computer Vision",
        "Transformer",
        "Neural Networks",
        "Python",
        "Software Development",
        "Web Infrastructure",
        "Cloud Computing",
        "Cybersecurity",
        "Blockchain",
        # Science & Education
        "Science",
        "Education",
        "Physics",
        "Biology",
        "Chemistry",
        "Mathematics",
        "History",
        "Philosophy",
        "Sociology",
        # Business & Finance
        "Business",
        "Finance",
        "Marketing",
        "Entrepreneurship",
        "Productivity",
        "Management",
        "Economics",
        # Lifestyle & Entertainment
        "Health",
        "Fitness",
        "Cooking",
        "Travel",
        "Gaming",
        "Sports",
        "Music",
        "Art",
        "Fashion",
        "Beauty",
        "Movie Review",
        "Entertainment",
        "Comedy",
        "Motivation",
        # Society & Nature
        "Politics",
        "Environment",
        "Sustainability",
        "Architecture",
        "Animals",
        "Nature",
        "Space Exploration",
    ]

    # API settings
    timeout: int = 30
    max_retries: int = 3
    retry_delay: int = 1  # seconds
