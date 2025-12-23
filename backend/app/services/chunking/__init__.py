"""Text chunking module for splitting documents into overlapping segments."""

from .chunker import TextChunker, chunk_text, ChunkData

__all__ = ["TextChunker", "chunk_text", "ChunkData"]
