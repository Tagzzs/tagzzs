"""
Chroma Cloud Storage Layer

Handles storage and retrieval from Chroma Cloud using FastAPI Depends pattern.
Production-level implementation following storage pattern.

Supports both single embeddings and chunk-based storage for Phase 2 pipeline.
"""

import logging
from typing import List, Dict, Any, Optional, Tuple

try:
    from chromadb.api.models.Collection import Collection

    HAS_COLLECTION = True
except ImportError:
    Collection = None
    HAS_COLLECTION = False

from .models import EmbeddingMetadata
from app.services.chunking.chunker import ChunkData


class ChromaCloudStorage:
    """
    Chroma Cloud storage layer for embeddings.

    Uses FastAPI's Depends pattern for connection management.
    Collection is injected via dependency injection.
    """

    def __init__(self, collection: Any):
        """
        Initialize Chroma Cloud storage with injected collection.

        Args:
            collection: Chroma collection instance (injected via Depends)
        """
        self.collection = collection
        self.logger = logging.getLogger(__name__)

        if collection is None:
            raise ValueError("Chroma collection is required")

        self.logger.info("✅ Chroma Cloud storage initialized")

    async def store_embedding(
        self,
        doc_id: str,
        text: str,
        embedding: List[float],
        metadata: EmbeddingMetadata,
    ) -> bool:
        """
        Store single embedding in Chroma Cloud.

        Args:
            doc_id: Document ID
            text: Original text
            embedding: Embedding vector
            metadata: Document metadata

        Returns:
            True if stored successfully, False otherwise
        """
        try:
            self.logger.debug(f"Storing embedding for doc_id: {doc_id}")

            meta_dict = {
                "source_url": metadata.source_url,
                "source_type": metadata.source_type,
                "content_length": metadata.content_length,
                "tags": ",".join(metadata.tags) if metadata.tags else "",
            }

            if metadata.summary:
                meta_dict["summary"] = metadata.summary

            self.collection.add(
                ids=[doc_id],
                documents=[text],
                embeddings=[embedding],
                metadatas=[meta_dict],
            )

            self.logger.debug(f"✅ Stored embedding for {doc_id}")
            return True

        except Exception as e:
            self.logger.error(f"Failed to store embedding for {doc_id}: {str(e)}")
            raise

    async def store_embeddings_batch(
        self, docs: List[Dict[str, Any]]
    ) -> Tuple[int, int]:
        """
        Store multiple embeddings in batch.

        Args:
            docs: List of dicts with keys: doc_id, text, embedding, metadata

        Returns:
            Tuple of (successful_count, failed_count)
        """
        successful = 0
        failed = 0

        try:
            ids = [doc["doc_id"] for doc in docs]
            documents = [doc["text"] for doc in docs]
            embeddings = [doc["embedding"] for doc in docs]

            metadatas = []
            for doc in docs:
                metadata = doc["metadata"]
                meta_dict = {
                    "source_url": metadata.source_url,
                    "source_type": metadata.source_type,
                    "content_length": metadata.content_length,
                    "tags": ",".join(metadata.tags) if metadata.tags else "",
                }
                if metadata.summary:
                    meta_dict["summary"] = metadata.summary
                metadatas.append(meta_dict)

            self.collection.add(
                ids=ids, documents=documents, embeddings=embeddings, metadatas=metadatas
            )

            successful = len(docs)
            self.logger.info(f"✅ Stored {successful} embeddings in batch")

        except Exception as e:
            self.logger.error(f"Failed to store batch: {str(e)}")
            failed = len(docs)

        return successful, failed

    async def search(
        self, query_embedding: List[float], top_k: int = 5
    ) -> List[Dict[str, Any]]:
        """
        Search for similar embeddings.

        Args:
            query_embedding: Query embedding vector
            top_k: Number of results to return

        Returns:
            List of matching documents with scores
        """
        try:
            results = self.collection.query(
                query_embeddings=[query_embedding], n_results=top_k
            )

            matches = []
            if results["documents"] and len(results["documents"]) > 0:
                for i, (doc, dist, meta) in enumerate(
                    zip(
                        results["documents"][0],
                        results["distances"][0],
                        results["metadatas"][0],
                    )
                ):
                    matches.append(
                        {
                            "document": doc,
                            "metadata": meta,
                            "distance": dist,
                            "similarity": 1 - dist,
                        }
                    )

            return matches

        except Exception as e:
            self.logger.error(f"Search failed: {str(e)}")
            raise

    async def store_chunks(
        self,
        chunks: List[ChunkData],
        embeddings: List[List[float]],
        content_id: str,
        user_id: str,
        tags: Optional[List[str]] = None,
        source_url: str = "",
        source_type: str = "web",
    ) -> Tuple[List[str], int]:
        """
        Store document chunks with embeddings in Chroma Cloud.

        Phase 2 pipeline: Store chunked content with embeddings for vector search.
        Each chunk gets a unique doc_id for tracking and retrieval.

        Args:
            chunks: List of ChunkData objects (one per chunk)
            embeddings: List of embedding vectors (one per chunk)
            content_id: Content identifier from Phase 1
            user_id: User ID for multi-tenancy (collection name: user_{user_id}_chunks)
            tags: Optional tags from Phase 1
            source_url: Source URL
            source_type: Source type (web, pdf, image)

        Returns:
            Tuple of (list of stored doc_ids, number of failed chunks)

        Raises:
            ValueError: If chunks and embeddings length mismatch
            Exception: If Chroma storage fails
        """
        if len(chunks) != len(embeddings):
            raise ValueError(
                f"Chunks count ({len(chunks)}) must match embeddings count ({len(embeddings)})"
            )

        if not chunks:
            self.logger.warning("No chunks to store")
            return [], 0

        successful_ids = []
        failed_count = 0

        try:
            self.logger.info(
                f"📦 Storing {len(chunks)} chunks for content_id={content_id}, user_id={user_id}"
            )

            doc_ids = []
            documents = []
            embeddings_data = []
            metadatas = []

            for i, (chunk, embedding) in enumerate(zip(chunks, embeddings)):
                doc_id = f"user_{user_id}_content_{content_id}_chunk_{chunk.index}"
                doc_ids.append(doc_id)
                documents.append(chunk.text)
                embeddings_data.append(embedding)

                metadata = {
                    "content_id": content_id,
                    "user_id": user_id,
                    "chunk_index": chunk.index,
                    "total_chunks": chunk.total,
                    "token_count": chunk.token_count,
                    "char_start": chunk.start_char,
                    "char_end": chunk.end_char,
                    "overlap_with_prev": chunk.overlap_with_prev,
                    "source_url": source_url,
                    "source_type": source_type,
                    "tags": ",".join(tags) if tags else "",
                }
                metadatas.append(metadata)

            self.collection.add(
                ids=doc_ids,
                documents=documents,
                embeddings=embeddings_data,
                metadatas=metadatas,
            )

            successful_ids = doc_ids
            self.logger.info(
                f"✅ Stored {len(doc_ids)} chunks in Chroma Cloud collection: {self.collection.name}"
            )

        except Exception as e:
            self.logger.error(f"Failed to store chunks: {str(e)}")
            failed_count = len(chunks)
            raise

        return successful_ids, failed_count

    async def store_summary(
        self,
        summary: str,
        summary_embedding: List[float],
        content_id: str,
        user_id: str,
        tags: Optional[List[str]] = None,
        source_url: str = "",
        source_type: str = "web",
        extracted_text_length: int = 0,
    ) -> str:
        """
        Store finalized summary with embedding in Chroma Cloud.

        Stores the Phase 1 refined summary for quick reference and retrieval.
        Uses same collection as chunks but marked with special metadata.

        Args:
            summary: The finalized summary text
            summary_embedding: Embedding vector for the summary
            content_id: Content identifier
            user_id: User ID for multi-tenancy
            tags: Optional tags
            source_url: Source URL
            source_type: Source type (web, pdf, image)
            extracted_text_length: Length of original extracted text

        Returns:
            Document ID of stored summary

        Raises:
            Exception: If storage fails
        """
        try:
            doc_id = f"user_{user_id}_content_{content_id}_summary"

            self.logger.info(
                f"📝 Storing summary for content_id={content_id}, user_id={user_id}"
            )

            metadata = {
                "content_id": content_id,
                "user_id": user_id,
                "document_type": "summary",
                "source_url": source_url,
                "source_type": source_type,
                "tags": ",".join(tags) if tags else "",
                "original_text_length": extracted_text_length,
                "summary_length": len(summary),
            }

            self.collection.add(
                ids=[doc_id],
                documents=[summary],
                embeddings=[summary_embedding],
                metadatas=[metadata],
            )

            self.logger.info(
                f"✅ Stored summary in Chroma Cloud collection: {self.collection.name}, doc_id={doc_id}"
            )

            return doc_id

        except Exception as e:
            self.logger.error(f"Failed to store summary: {str(e)}")
            raise
