"""
Text Chunking Utility

Handles intelligent extraction of useful chunks from long text for summarization.
Focuses on getting representative content without truncating mid-sentence.
"""

from typing import List, Tuple, Optional


class TextChunker:
    """
    Intelligent text chunker that extracts useful chunks from text.
    Breaks at sentence boundaries to preserve context.
    """

    # Configuration
    MAX_CHUNK_SIZE = 2000  # Maximum characters per chunk
    TARGET_CHUNKS = 3  # Try to extract this many chunks
    MIN_CHUNK_SIZE = 500  # Minimum chunk size to be useful

    @staticmethod
    def extract_chunks(
        text: str, num_chunks: Optional[int] = None, max_size: Optional[int] = None
    ) -> List[str]:
        """
        Extract useful chunks from text for summarization.

        Strategy:
        1. If text is short (< 3000 chars): return as-is
        2. If text is medium (3K-10K): extract beginning + middle + end
        3. If text is long (> 10K): extract beginning + samples from middle + end

        Args:
            text: The text to chunk
            num_chunks: Number of chunks to extract (default: TARGET_CHUNKS)
            max_size: Maximum size per chunk (default: MAX_CHUNK_SIZE)

        Returns:
            List of extracted chunks
        """
        if num_chunks is None:
            num_chunks = TextChunker.TARGET_CHUNKS
        if max_size is None:
            max_size = TextChunker.MAX_CHUNK_SIZE

        text_length = len(text)
        if text_length <= max_size:
            return [text]

        chunks = []

        if text_length <= 10000:
            chunks.append(TextChunker._extract_chunk(text, 0, max_size))

            if num_chunks >= 2:
                mid_pos = text_length // 2
                chunks.append(TextChunker._extract_chunk(text, mid_pos, max_size))

            if num_chunks >= 3:
                end_pos = max(text_length - max_size, text_length // 2 + max_size)
                chunks.append(TextChunker._extract_chunk(text, end_pos, max_size))
        else:
            chunk_positions = TextChunker._calculate_positions(
                text_length, num_chunks, max_size
            )

            for pos in chunk_positions:
                chunk = TextChunker._extract_chunk(text, pos, max_size)
                if len(chunk) >= TextChunker.MIN_CHUNK_SIZE:
                    chunks.append(chunk)

        chunks = [c for c in chunks if c and len(c) >= TextChunker.MIN_CHUNK_SIZE]

        return chunks if chunks else [text[:max_size]]

    @staticmethod
    def _extract_chunk(text: str, start_pos: int, max_size: int) -> str:
        """
        Extract a chunk starting from position, breaking at sentence boundary.

        Args:
            text: Source text
            start_pos: Starting position
            max_size: Maximum chunk size

        Returns:
            Extracted chunk
        """
        if start_pos >= len(text):
            start_pos = len(text) - max_size

        if start_pos < 0:
            start_pos = 0

        end_pos = min(start_pos + max_size, len(text))
        chunk = text[start_pos:end_pos]

        for sentence_end in [". ", "! ", "? ", ".\n", "!\n", "?\n"]:
            pos = chunk.rfind(sentence_end)
            if pos > max_size * 0.6:
                return text[start_pos : start_pos + pos + 1]

        para_pos = chunk.rfind("\n\n")
        if para_pos > max_size * 0.5:
            return text[start_pos : start_pos + para_pos]

        return chunk

    @staticmethod
    def _calculate_positions(
        text_length: int, num_chunks: int, max_size: int
    ) -> List[int]:
        """
        Calculate starting positions for chunks across the text.

        Distributes chunks evenly across the text to get representative samples.

        Args:
            text_length: Total length of text
            num_chunks: Number of chunks to extract
            max_size: Maximum chunk size

        Returns:
            List of starting positions
        """
        positions = []

        if num_chunks == 0:
            return positions

        if num_chunks == 1:
            return [0]

        step = (text_length - max_size) // (num_chunks - 1)

        for i in range(num_chunks):
            pos = i * step
            pos = min(pos, text_length - max_size)
            if pos >= 0:
                positions.append(pos)

        if positions[-1] < text_length - max_size:
            positions[-1] = max(0, text_length - max_size)

        return positions

    @staticmethod
    def combine_chunks(chunks: List[str], separator: str = "\n\n[...]\n\n") -> str:
        """
        Combine multiple chunks into a single text with separator.

        Args:
            chunks: List of text chunks
            separator: String to separate chunks

        Returns:
            Combined text
        """
        return separator.join(chunks)

    @staticmethod
    def get_chunk_info(text: str, num_chunks: int = 3) -> Tuple[List[str], dict]:
        """
        Extract chunks and return metadata about extraction.

        Args:
            text: Text to chunk
            num_chunks: Number of chunks to extract

        Returns:
            Tuple of (chunks, metadata)
        """
        chunks = TextChunker.extract_chunks(text, num_chunks)

        metadata = {
            "original_length": len(text),
            "num_chunks": len(chunks),
            "chunk_sizes": [len(c) for c in chunks],
            "total_extracted": sum(len(c) for c in chunks),
            "compression_ratio": len(text) / max(sum(len(c) for c in chunks), 1),
        }

        return chunks, metadata
