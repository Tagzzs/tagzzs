"""
ChromaClient - Vector Database Client for Chroma Cloud

Handles all interactions with Chroma vector database including:
- Semantic search in chunks and summaries collections
- Metadata filtering
- Content retrieval by ID and tags
"""

import logging
from typing import Optional, List, Dict, Any
from app.connections import get_user_collection

logger = logging.getLogger(__name__)


class ChromaClient:
    """
    Client for interacting with Chroma vector database.

    Manages two collections:
    - chunks: Raw text chunks with embeddings for semantic search
    - summaries: Pre-summarized content for quick overview queries
    """

    def __init__(self, user_id: str):
        """
        Initialize ChromaClient for a specific user.

        Args:
            user_id: The user's unique identifier

        Raises:
            ValueError: If user_id is empty or invalid
        """
        if not user_id or not isinstance(user_id, str):
            raise ValueError("user_id must be a non-empty string")

        self.user_id = user_id
        self.chunks_collection = get_user_collection(user_id, "chunks")
        self.summaries_collection = get_user_collection(user_id, "summaries")

        logger.info(f"ChromaClient initialized for user: {user_id}")

    def search_chunks(
        self,
        query_embedding: List[float],
        top_k: int = 5,
        where_filter: Optional[Dict[str, Any]] = None,
    ) -> List[Dict[str, Any]]:
        """
        Search for similar chunks using semantic embeddings.

        Args:
            query_embedding: The query embedding vector (384 dimensions)
            top_k: Number of results to return (default: 5)
            where_filter: Optional Chroma where filter for metadata

        Returns:
            List of matching chunk documents with metadata

        Example:
            >>> embedding = [0.1] * 384
            >>> results = client.search_chunks(embedding, top_k=3)
            >>> print(len(results))  # 3 results
        """
        try:
            results = self.chunks_collection.query(
                query_embeddings=[query_embedding], n_results=top_k, where=where_filter
            )

            logger.debug(
                f"Found {len(results['documents'][0]) if results['documents'] and len(results['documents']) > 0 else 0} chunks"
            )

            formatted_results = []
            if results["documents"] and len(results["documents"]) > 0:
                for i, doc in enumerate(results["documents"][0]):
                    formatted_results.append(
                        {
                            "content": doc,
                            "metadata": (
                                results["metadatas"][0][i]
                                if results["metadatas"]
                                else {}
                            ),
                            "distance": (
                                results["distances"][0][i]
                                if results["distances"]
                                else None
                            ),
                        }
                    )

            return formatted_results

        except Exception as e:
            logger.error(f"Error searching chunks: {str(e)}")
            raise

    def search_summaries(
        self,
        query_embedding: List[float],
        top_k: int = 5,
        where_filter: Optional[Dict[str, Any]] = None,
    ) -> List[Dict[str, Any]]:
        """
        Search for similar summaries using semantic embeddings.

        Args:
            query_embedding: The query embedding vector (384 dimensions)
            top_k: Number of results to return (default: 5)
            where_filter: Optional Chroma where filter for metadata

        Returns:
            List of matching summary documents with metadata
        """
        try:
            results = self.summaries_collection.query(
                query_embeddings=[query_embedding], n_results=top_k, where=where_filter
            )

            logger.debug(
                f"Found {len(results['documents'][0]) if results['documents'] else 0} summaries"
            )

            formatted_results = []
            if results["documents"] and len(results["documents"]) > 0:
                for i, doc in enumerate(results["documents"][0]):
                    formatted_results.append(
                        {
                            "content": doc,
                            "metadata": (
                                results["metadatas"][0][i]
                                if results["metadatas"]
                                else {}
                            ),
                            "distance": (
                                results["distances"][0][i]
                                if results["distances"]
                                else None
                            ),
                        }
                    )

            return formatted_results

        except Exception as e:
            logger.error(f"Error searching summaries: {str(e)}")
            raise

    def filter_by_metadata(
        self, metadata_filter: Dict[str, Any], include_content: bool = True
    ) -> List[Dict[str, Any]]:
        """
        Query database using only metadata filters (no semantic search).

        Use this for queries like "all PDFs" or "content from 2024" without embeddings.

        Args:
            metadata_filter: Chroma where filter dict for metadata
            include_content: Whether to include document content

        Returns:
            List of documents matching metadata filter

        Example:
            >>> filter = {"source_type": {"$eq": "pdf"}}
            >>> results = client.filter_by_metadata(filter)
        """
        try:
            results = self.chunks_collection.get(where=metadata_filter)

            logger.debug(f"Metadata filter returned {len(results['ids'])} documents")

            formatted_results = []
            for i, doc_id in enumerate(results["ids"]):
                formatted_results.append(
                    {
                        "id": doc_id,
                        "content": (
                            results["documents"][i]
                            if include_content and results["documents"]
                            else None
                        ),
                        "metadata": (
                            results["metadatas"][i] if results["metadatas"] else {}
                        ),
                    }
                )

            return formatted_results

        except Exception as e:
            logger.error(f"Error filtering by metadata: {str(e)}")
            raise

    def get_by_content_id(self, content_id: str) -> Optional[Dict[str, Any]]:
        """
        Retrieve a specific document by its content ID.

        Args:
            content_id: The unique content identifier

        Returns:
            Document data with metadata, or None if not found
        """
        try:
            results = self.chunks_collection.get(ids=[content_id])

            if results["ids"] and len(results["ids"]) > 0:
                return {
                    "id": results["ids"][0],
                    "content": (
                        results["documents"][0] if results["documents"] else None
                    ),
                    "metadata": results["metadatas"][0] if results["metadatas"] else {},
                }

            logger.debug(f"Content ID not found: {content_id}")
            return None

        except Exception as e:
            logger.error(f"Error getting content by ID: {str(e)}")
            raise

    def get_all_with_tag(self, tag: str) -> List[Dict[str, Any]]:
        """
        Retrieve all documents with a specific tag.

        Args:
            tag: The tag to filter by

        Returns:
            List of documents with the specified tag

        Example:
            >>> results = client.get_all_with_tag("AI")
            >>> print(f"Found {len(results)} items tagged AI")
        """
        try:
            metadata_filter = {"tags": {"$contains": tag}}

            return self.filter_by_metadata(metadata_filter)

        except Exception as e:
            logger.error(f"Error getting documents by tag '{tag}': {str(e)}")
            raise

    def count_with_filter(self, metadata_filter: Dict[str, Any]) -> int:
        """
        Count documents matching a metadata filter.

        Args:
            metadata_filter: Chroma where filter dict

        Returns:
            Number of matching documents
        """
        try:
            results = self.chunks_collection.get(where=metadata_filter)
            count = len(results["ids"])

            logger.debug(f"Found {count} documents matching filter")
            return count

        except Exception as e:
            logger.error(f"Error counting with filter: {str(e)}")
            raise

    def get_collection_stats(self) -> Dict[str, Any]:
        """
        Get statistics about the collections.

        Returns:
            Dictionary with collection stats (counts, etc.)
        """
        try:
            chunks_count = self.chunks_collection.count()
            summaries_count = self.summaries_collection.count()

            return {
                "chunks_count": chunks_count,
                "summaries_count": summaries_count,
                "total_documents": chunks_count + summaries_count,
            }

        except Exception as e:
            logger.error(f"Error getting collection stats: {str(e)}")
            raise

    def get_all_unique_tags(self) -> List[str]:
        """
        Get all unique tags from the user's database.

        Retrieves all documents and extracts unique tags from their metadata.
        This is used for "list all tags", "show all metadata tags" type queries.

        Returns:
            List of unique tags found in user's content

        Example:
            >>> client = ChromaClient("user123")
            >>> tags = client.get_all_unique_tags()
            >>> print(tags)  # ['AI', 'Python', 'Web Development', ...]
        """
        try:
            logger.info(
                f"[GET_ALL_TAGS] Fetching all documents for user: {self.user_id}"
            )

            all_docs = self.chunks_collection.get()

            logger.info(
                f"[GET_ALL_TAGS] Retrieved {len(all_docs['ids'])} total documents"
            )

            unique_tags = set()

            metadatas = all_docs.get("metadatas", [])
            if metadatas:
                for metadata in metadatas:
                    if metadata and isinstance(metadata, dict) and "tags" in metadata:
                        tags = metadata["tags"]

                        if isinstance(tags, list):
                            unique_tags.update(tags)
                        elif isinstance(tags, str):
                            try:
                                import json

                                parsed_tags = json.loads(tags)
                                if isinstance(parsed_tags, list):
                                    unique_tags.update(parsed_tags)
                                else:
                                    unique_tags.add(tags)
                            except Exception:
                                if tags.strip():
                                    unique_tags.add(tags)
                        else:
                            if tags:
                                unique_tags.add(str(tags))

            tags_list = sorted(list(unique_tags))

            logger.info(
                f"[GET_ALL_TAGS] Found {len(tags_list)} unique tags: {tags_list}"
            )
            return tags_list

        except Exception as e:
            logger.error(
                f"[GET_ALL_TAGS] Error retrieving unique tags: {str(e)}", exc_info=True
            )
            raise

    def get_content_by_tags(
        self, tags: List[str], match_all: bool = False
    ) -> List[Dict[str, Any]]:
        """
        Get all content items that have specific tags.

        Args:
            tags: List of tags to search for
            match_all: If True, content must have ALL tags. If False, content with ANY tag

        Returns:
            List of content items with matching tags
        """
        try:
            logger.info(
                f"[GET_BY_TAGS] Fetching content with tags: {tags}, match_all={match_all}"
            )

            all_docs = self.chunks_collection.get()

            matching_results = []
            seen_content_ids = set()

            metadatas = all_docs.get("metadatas", []) or []
            ids_list = all_docs.get("ids", []) or []
            documents = all_docs.get("documents", []) or []

            for i, metadata in enumerate(metadatas):
                if not metadata or not isinstance(metadata, dict):
                    continue

                content_id = metadata.get("content_id")

                if content_id and content_id in seen_content_ids:
                    continue

                doc_tags = metadata.get("tags", [])

                if isinstance(doc_tags, str):
                    try:
                        import json

                        doc_tags = json.loads(doc_tags)
                    except Exception:
                        doc_tags = [doc_tags] if doc_tags else []
                elif not isinstance(doc_tags, list):
                    doc_tags = [doc_tags] if doc_tags else []

                has_match = False
                if match_all:
                    has_match = all(tag in doc_tags for tag in tags)
                else:
                    has_match = any(tag in doc_tags for tag in tags)

                if has_match:
                    matching_results.append(
                        {
                            "id": ids_list[i] if i < len(ids_list) else None,
                            "content": documents[i] if i < len(documents) else None,
                            "metadata": metadata,
                            "tags": doc_tags,
                        }
                    )
                    if content_id:
                        seen_content_ids.add(content_id)

            logger.info(f"[GET_BY_TAGS] Found {len(matching_results)} content items")
            return matching_results

        except Exception as e:
            logger.error(f"[GET_BY_TAGS] Error: {str(e)}", exc_info=True)
            raise
