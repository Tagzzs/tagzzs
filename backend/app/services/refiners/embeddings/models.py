"""
Embeddings Request/Response Models

Data structures for embeddings pipeline following architecture pattern.
"""

from pydantic import BaseModel, validator
from typing import List, Optional, Dict, Any
from datetime import datetime
import uuid


class EmbeddingMetadata(BaseModel):
    """Metadata to store with embeddings"""

    source_url: str
    tags: List[str] = []
    summary: Optional[str] = None
    source_type: str
    content_length: int
    extracted_date: datetime = datetime.utcnow()


class EmbeddingRequest(BaseModel):
    """Request model for embedding generation and storage"""

    text: str
    metadata: EmbeddingMetadata
    doc_id: Optional[str] = None

    @validator("text")
    def validate_text(cls, v):
        """Ensure text is not empty"""
        if not v.strip():
            raise ValueError("Text cannot be empty")
        return v.strip()

    @validator("doc_id", pre=True, always=True)
    def generate_doc_id(cls, v):
        """Generate doc_id if not provided"""
        return v or str(uuid.uuid4())


class EmbeddingResponse(BaseModel):
    """Response model for embedding operations"""

    success: bool
    doc_id: str
    embedding_dimension: int
    text_length: int
    metadata: EmbeddingMetadata
    storage_status: str
    processing_time_ms: int
    model_used: str = "sentence-transformers/all-MiniLM-L6-v2"
    chroma_collection: str = "tagzs_refined_content"
    stored_at: Optional[datetime] = None
    errors: List[str] = []


class EmbeddingConfig(BaseModel):
    """Configuration for embeddings engine"""

    model_name: str = "sentence-transformers/all-MiniLM-L6-v2"
    embedding_dimension: int = 384
    device: str = "cuda"  # 'cuda' or 'cpu' based on availability

    # Chroma Cloud configuration
    chroma_api_key: str
    chroma_host: str
    chroma_port: int = 443
    chroma_collection: str = "tagzs_refined_content"
    use_ssl: bool = True

    # Batch settings
    batch_size: int = 32
    max_retries: int = 3
    retry_delay: int = 1  # seconds


# ========== PHASE 2 EMBEDDING & STORAGE REQUEST/RESPONSE ==========


class EmbedStoreRequest(BaseModel):
    """
    Request model for Phase 2: Embed & Store pipeline.

    Takes Phase 1 output and chunks/embeds/stores in Chroma.
    Stores both chunks (for RAG) and finalized summary (for reference).
    """

    user_id: str
    content_id: str
    extracted_text: str
    summary: str
    tags: List[str] = []
    source_url: str = ""
    source_type: str = ""

    @validator("user_id")
    def validate_user_id(cls, v):
        """Ensure user_id is valid"""
        if not v or not isinstance(v, str):
            raise ValueError("user_id must be a non-empty string")
        if len(v) < 3:
            raise ValueError("user_id must be at least 3 characters")
        return v.strip()

    @validator("content_id")
    def validate_content_id(cls, v):
        """Ensure content_id is valid"""
        if not v or not isinstance(v, str):
            raise ValueError("content_id must be a non-empty string")
        return v.strip()

    @validator("extracted_text")
    def validate_text(cls, v):
        """Ensure text is long enough for chunking"""
        if not v or not isinstance(v, str):
            raise ValueError("extracted_text must be a non-empty string")
        text_len = len(v.strip())
        if text_len < 100:
            raise ValueError("extracted_text must be at least 100 characters")
        return v.strip()

    @validator("summary")
    def validate_summary(cls, v):
        """Ensure summary is provided"""
        if not v or not isinstance(v, str):
            raise ValueError("summary must be a non-empty string")
        return v.strip()

    @validator("source_type")
    def validate_source_type(cls, v):
        """Ensure valid source type"""
        valid_types = ["web", "pdf", "image"]
        if v not in valid_types:
            raise ValueError(f"source_type must be one of {valid_types}")
        return v


class EmbedStoreResponse(BaseModel):
    """
    Response model for Phase 2: Embed & Store pipeline.

    Returns only essential information:
    - IDs for tracking stored documents in Chroma
    - Processing time and status
    - No embedding details (stored in Chroma, not Firestore)
    """

    success: bool
    chunk_count: int
    chroma_doc_ids: List[str]
    summary_doc_id: str
    processing_time_ms: int
    errors: List[str] = []

    def to_dict(self) -> Dict[str, Any]:
        """Convert response to dictionary"""
        return {
            "success": self.success,
            "chunk_count": self.chunk_count,
            "chroma_doc_ids": self.chroma_doc_ids,
            "summary_doc_id": self.summary_doc_id,
            "processing_time_ms": self.processing_time_ms,
            "errors": self.errors,
        }
