"""
Text chunking module for splitting documents into overlapping segments.

Low-Level Architecture:
- Token-aware chunking using HF tokenizer
- Word boundary detection
- Configurable chunk size and overlap
- Production-grade error handling
- Structured output with metadata
"""

from dataclasses import dataclass
from typing import List, Any, Dict
import logging
from transformers import AutoTokenizer

logger = logging.getLogger(__name__)


@dataclass
class ChunkData:
    """
    Structured representation of a text chunk with metadata:
    - text: str  (Actual chunk text)
    - index: int  (Chunk position 0-based)
    - total: int  (Total chunks in document)
    - token_count: int  (Actual token count for this chunk)
    - start_char: int  (Character position in original text)
    - end_char: int  (Character position in original text)
    - overlap_with_prev: int  (Token overlap with previous chunk if any)
    """

    text: str
    index: int
    total: int
    token_count: int
    start_char: int
    end_char: int
    overlap_with_prev: int

    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary for JSON serialization."""
        return {
            "text": self.text,
            "index": self.index,
            "total": self.total,
            "token_count": self.token_count,
            "start_char": self.start_char,
            "end_char": self.end_char,
            "overlap_with_prev": self.overlap_with_prev,
        }


class TextChunker:
    """
    Production-grade text chunking with token-aware boundaries.

    Architecture:
    1. Initialize tokenizer (lazy-loaded on first use)
    2. Tokenize input text
    3. Create overlapping windows of chunks
    4. Backtrack to word boundaries
    5. Return ChunkData objects with metadata

    Defaults:
    - chunk size(DEFAULT_CHUNK_SIZE): 500 tokens
    - overlap(DEFAULT_OVERLAP): 100 tokens
    - min chunk size(MIN_CHUNK_SIZE): 50 tokens (minimum viable chunk)
    - min input length(MIN_INPUT_LENGTH): 50 characters
    - max input length(MAX_INPUT_LENGTH): 1,000,000 characters (1MB)
    - tokenizer model(TOKENIZER_MODEL): "sentence-transformers/all-MiniLM-L6-v2"
    """

    # Default configuration
    DEFAULT_CHUNK_SIZE = 500
    DEFAULT_OVERLAP = 100
    MIN_CHUNK_SIZE = 50
    MIN_INPUT_LENGTH = 50
    MAX_INPUT_LENGTH = 1_000_000
    TOKENIZER_MODEL = "sentence-transformers/all-MiniLM-L6-v2"

    def __init__(
        self,
        chunk_size: int = DEFAULT_CHUNK_SIZE,
        overlap: int = DEFAULT_OVERLAP,
        tokenizer_model: str = TOKENIZER_MODEL,
    ):
        """
        Initialize chunker with configuration.

        Args:
            chunk_size: Target tokens per chunk (default 500)
            overlap: Overlap tokens between chunks (default 100)
            tokenizer_model: HF tokenizer model to use

        Raises:
            ValueError: If chunk_size or overlap invalid
        """
        if chunk_size < self.MIN_CHUNK_SIZE:
            raise ValueError(f"chunk_size must be >= {self.MIN_CHUNK_SIZE}")
        if overlap >= chunk_size:
            raise ValueError("overlap must be < chunk_size")

        self.chunk_size = chunk_size
        self.overlap = overlap
        self.tokenizer_model = tokenizer_model
        self._tokenizer = None

    @property
    def tokenizer(self):
        """Lazy-load tokenizer on first access."""
        if self._tokenizer is None:
            try:
                logger.debug(f"Loading tokenizer: {self.tokenizer_model}")
                self._tokenizer = AutoTokenizer.from_pretrained(self.tokenizer_model)
            except Exception as e:
                logger.error(f"Failed to load tokenizer: {e}")
                raise
        return self._tokenizer

    def chunk_text(self, text: str) -> List[ChunkData]:
        """
        Split text into overlapping chunks with word boundaries.

        Process:
        1. Validate input
        2. Tokenize text
        3. Create overlapping windows
        4. Backtrack to word boundaries
        5. Return ChunkData list

        Args:
            text: Raw text to chunk

        Returns:
            List of ChunkData objects
            Empty list if text too short

        Raises:
            ValueError: If input invalid
            RuntimeError: If tokenization fails
        """
        if not isinstance(text, str):
            raise ValueError("text must be a string")

        text = text.strip()

        if len(text) < self.MIN_INPUT_LENGTH:
            logger.warning(
                f"Input text too short ({len(text)} chars < {self.MIN_INPUT_LENGTH}). "
                "Returning empty chunks."
            )
            return []

        if len(text) > self.MAX_INPUT_LENGTH:
            logger.warning(
                f"Input text very large ({len(text)} chars). "
                "Performance may be affected."
            )

        try:
            tokens = self.tokenizer.encode(text, add_special_tokens=False)
            token_count = len(tokens)

            logger.debug(f"Tokenized text: {len(text)} chars -> {token_count} tokens")

            if token_count <= self.chunk_size:
                return [
                    ChunkData(
                        text=text,
                        index=0,
                        total=1,
                        token_count=token_count,
                        start_char=0,
                        end_char=len(text),
                        overlap_with_prev=0,
                    )
                ]

            chunks = self._create_chunks(text, tokens)

            logger.info(
                f"Created {len(chunks)} chunks from {token_count} tokens "
                f"(chunk_size={self.chunk_size}, overlap={self.overlap})"
            )

            return chunks

        except Exception as e:
            logger.error(f"Chunking failed: {e}", exc_info=True)
            raise RuntimeError(f"Failed to chunk text: {e}") from e

    def _create_chunks(self, text: str, tokens: List[int]) -> List[ChunkData]:
        """
        Create overlapping chunks from tokens.

        Algorithm:
        1. Calculate stride (step between chunks)
        2. For each chunk window:
           a. Extract token range
           b. Decode to text
           c. Backtrack to word boundary
           d. Create ChunkData
        """
        chunks = []
        token_count = len(tokens)
        stride = self.chunk_size - self.overlap

        chunk_idx = 0
        current_pos = 0

        while current_pos < token_count:
            chunk_start_token = max(0, current_pos - self.overlap if chunks else 0)
            chunk_end_token = min(token_count, current_pos + self.chunk_size)

            char_start = self._approximate_char_pos(text, chunk_start_token, tokens)
            char_end = self._approximate_char_pos(text, chunk_end_token, tokens)

            char_start = self._backtrack_to_word_start(text, char_start)
            char_end = self._backtrack_to_word_end(text, char_end)

            final_chunk_text = text[char_start:char_end].strip()

            if not final_chunk_text:
                current_pos += stride
                continue

            actual_tokens = self.tokenizer.encode(
                final_chunk_text, add_special_tokens=False
            )

            overlap_count = 0
            if chunks and chunk_idx > 0:
                overlap_count = self.overlap

            chunks.append(
                ChunkData(
                    text=final_chunk_text,
                    index=chunk_idx,
                    total=0,  # Update below
                    token_count=len(actual_tokens),
                    start_char=char_start,
                    end_char=char_end,
                    overlap_with_prev=overlap_count,
                )
            )

            chunk_idx += 1
            current_pos += stride

        for chunk in chunks:
            chunk.total = len(chunks)

        return chunks

    def _approximate_char_pos(
        self, text: str, token_idx: int, tokens: List[int]
    ) -> int:
        """
        Approximate character position from token index.

        Heuristic: average tokens per character
        """
        if token_idx == 0:
            return 0
        if token_idx >= len(tokens):
            return len(text)

        estimated_pos = int((token_idx / len(tokens)) * len(text))
        return min(estimated_pos, len(text))

    def _backtrack_to_word_start(self, text: str, pos: int) -> int:
        """
        Backtrack from position to start of word.

        Logic:
        1. If at word boundary, return as-is
        2. Otherwise, scan backward to find space/punctuation
        """
        if pos <= 0:
            return 0
        if pos >= len(text):
            return len(text)

        if text[pos] == " ":
            return pos

        current = pos
        while current > 0 and text[current] not in (" ", "\n", "\t", ".", "!", "?"):
            current -= 1

        while current < len(text) and text[current] in (" ", "\n", "\t"):
            current += 1

        return current

    def _backtrack_to_word_end(self, text: str, pos: int) -> int:
        """
        Backtrack from position to end of word.

        Logic:
        1. Scan forward to find next word boundary
        2. Include punctuation with word
        """
        if pos >= len(text):
            return len(text)
        if pos <= 0:
            return 0

        current = pos
        while current < len(text) and text[current] not in (" ", "\n", "\t"):
            current += 1

        return current


# Module-level default chunker for convenience function
_default_chunker = None


def chunk_text(
    text: str,
    chunk_size: int = TextChunker.DEFAULT_CHUNK_SIZE,
    overlap: int = TextChunker.DEFAULT_OVERLAP,
) -> List[Dict[str, Any]]:
    """
    Convenience function to chunk text with defaults.

    Args:
        text: Raw text to chunk
        chunk_size: Target tokens per chunk
        overlap: Overlap tokens between chunks

    Returns:
        List of chunk dictionaries (converted from ChunkData)
    """
    global _default_chunker

    if _default_chunker is None:
        _default_chunker = TextChunker(chunk_size, overlap)

    chunk_data_list = _default_chunker.chunk_text(text)
    return [chunk.to_dict() for chunk in chunk_data_list]
