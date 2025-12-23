"""
Manages connections to different databases used in the application:
- Chroma Database - Local vector database for embeddings
"""

from .chroma.chroma_connections import (
    get_summaries_client,
    get_chunks_client,
    get_user_collection,
    delete_user_collections,
    get_collection_stats,
    reinitialize_clients,
)

__all__ = [
    "get_summaries_client",
    "get_chunks_client",
    "get_user_collection",
    "delete_user_collections",
    "get_collection_stats",
    "reinitialize_clients",
]
