"""
Chroma Cloud Connection Manager with Multi-Database Support

Manages connections to Chroma Cloud:
1. Summaries Database - Stores summarized content embeddings
2. Chunks Database - Stores chunked content embeddings

Each database is isolated for better performance and organization.
"""

import logging
import os
from typing import Optional, Literal
import chromadb
from chromadb.api import ClientAPI
from chromadb.api.models.Collection import Collection
from dotenv import load_dotenv

logger = logging.getLogger(__name__)

load_dotenv(".env.local")
load_dotenv()

CHROMA_API_KEY_SUMMARIES = os.getenv("CHROMA_API_KEY_SUMMARIES")
CHROMA_TENANT_SUMMARIES = os.getenv("CHROMA_TENANT_SUMMARIES")
CHROMA_DATABASE_SUMMARIES = os.getenv("CHROMA_DATABASE_SUMMARIES")

CHROMA_API_KEY_CHUNKS = os.getenv("CHROMA_API_KEY_CHUNKS")
CHROMA_TENANT_CHUNKS = os.getenv("CHROMA_TENANT_CHUNKS")
CHROMA_DATABASE_CHUNKS = os.getenv("CHROMA_DATABASE_CHUNKS")

logger.info(f"📁 Chroma Cloud - Summaries DB: {CHROMA_DATABASE_SUMMARIES}")
logger.info(f"📁 Chroma Cloud - Chunks DB: {CHROMA_DATABASE_CHUNKS}")

_summaries_client: Optional[ClientAPI] = None
_chunks_client: Optional[ClientAPI] = None


def get_summaries_client() -> ClientAPI:
    """
    Get or initialize Chroma Cloud client for summaries database.

    Returns:
        Chroma ClientAPI instance connected to summaries database

    Raises:
        Exception: If connection to Chroma Cloud fails
    """
    global _summaries_client

    if _summaries_client is None:
        try:
            logger.info(
                f"☁️ Connecting to Chroma Cloud - Summaries DB ({CHROMA_DATABASE_SUMMARIES})"
            )
            _summaries_client = chromadb.CloudClient(
                tenant=CHROMA_TENANT_SUMMARIES,
                database=CHROMA_DATABASE_SUMMARIES,
                api_key=CHROMA_API_KEY_SUMMARIES,
            )
            logger.info("✅ Connected to Chroma Cloud Summaries database successfully")

        except Exception as e:
            logger.error(f"Failed to initialize Summaries Chroma client: {str(e)}")
            raise

    return _summaries_client


def get_chunks_client() -> ClientAPI:
    """
    Get or initialize Chroma Cloud client for chunks database.

    Returns:
        Chroma ClientAPI instance connected to chunks database

    Raises:
        Exception: If connection to Chroma Cloud fails
    """
    global _chunks_client

    if _chunks_client is None:
        try:
            logger.info(
                f"☁️ Connecting to Chroma Cloud - Chunks DB ({CHROMA_DATABASE_CHUNKS})"
            )
            _chunks_client = chromadb.CloudClient(
                tenant=CHROMA_TENANT_CHUNKS,
                database=CHROMA_DATABASE_CHUNKS,
                api_key=CHROMA_API_KEY_CHUNKS,
            )
            logger.info("✅ Connected to Chroma Cloud Chunks database successfully")

        except Exception as e:
            logger.error(f"Failed to initialize Chunks Chroma client: {str(e)}")
            raise

    return _chunks_client


def get_user_collection(
    user_id: str, collection_type: Literal["summaries", "chunks"] = "chunks"
) -> Collection:
    """
    Get or create a user-specific Chroma collection.

    Multi-database implementation: Each user gets collections in two databases
    - Summaries DB: user_{user_id}_summaries (summarized content)
    - Chunks DB: user_{user_id}_chunks (chunked content for RAG)

    Args:
        user_id: User identifier
        collection_type: Type of collection ("summaries" or "chunks")

    Returns:
        Chroma collection instance (created if doesn't exist)

    Raises:
        ValueError: If user_id is invalid
        Exception: If Chroma operation fails
    """
    if not user_id or not isinstance(user_id, str):
        raise ValueError("user_id must be a non-empty string")

    if collection_type not in ["summaries", "chunks"]:
        raise ValueError(
            f"Invalid collection_type: {collection_type}. Must be 'summaries' or 'chunks'"
        )

    try:
        collection_name = f"user_{user_id}_{collection_type}"

        if collection_type == "summaries":
            client = get_summaries_client()
        else:
            client = get_chunks_client()

        logger.debug(f"Getting collection: {collection_name}")

        collection = client.get_or_create_collection(
            name=collection_name,
            metadata={"collection_type": collection_type, "user_id": user_id},
        )

        logger.info(f"✅ Retrieved collection: {collection_name}")
        return collection

    except Exception as e:
        logger.error(
            f"Failed to get user collection {user_id}/{collection_type}: {str(e)}"
        )
        raise


def delete_user_collections(user_id: str) -> bool:
    """
    Delete all collections for a specific user (cleanup on account deletion).

    Deletes collections from both summaries and chunks databases.

    Args:
        user_id: User identifier

    Returns:
        True if successful, False otherwise
    """
    try:
        for collection_type, client_func in [
            ("summaries", get_summaries_client),
            ("chunks", get_chunks_client),
        ]:
            collection_name = f"user_{user_id}_{collection_type}"
            try:
                client = client_func()
                client.delete_collection(name=collection_name)
                logger.info(f"🗑️  Deleted collection: {collection_name}")
            except Exception as e:
                logger.warning(
                    f"Collection not found or error deleting {collection_name}: {str(e)}"
                )

        logger.info(f"✅ Cleaned up all collections for user: {user_id}")
        return True

    except Exception as e:
        logger.error(f"Failed to delete user collections for {user_id}: {str(e)}")
        return False


def get_collection_stats(
    user_id: str, collection_type: Literal["summaries", "chunks"] = "chunks"
) -> dict:
    """
    Get statistics for a user collection.

    Args:
        user_id: User identifier
        collection_type: Type of collection ("summaries" or "chunks")

    Returns:
        Dictionary with collection stats (document count, metadata)
    """
    try:
        collection = get_user_collection(user_id, collection_type)

        count = collection.count()
        metadata = collection.metadata

        stats = {
            "collection_name": collection.name,
            "document_count": count,
            "metadata": metadata,
        }

        logger.debug(f"Collection stats for {user_id}/{collection_type}: {stats}")
        return stats

    except Exception as e:
        logger.error(f"Failed to get stats for {user_id}/{collection_type}: {str(e)}")
        return {"error": str(e), "collection_name": f"user_{user_id}_{collection_type}"}


def reinitialize_clients():
    """
    Force reinitialize Chroma clients.

    Useful for testing or recovering from connection issues.
    """
    global _summaries_client, _chunks_client
    _summaries_client = None
    _chunks_client = None
    logger.info("🔄 Chroma Cloud clients reinitialized")
    get_summaries_client()
    get_chunks_client()


if __name__ == "__main__":
    get_user_collection("test_user", "summaries")
    get_user_collection("test_user", "chunks")
