"""
Embedding Routes
API endpoints for embedding storage and management in ChromaDB
"""

import time
from fastapi import APIRouter, HTTPException

router = APIRouter(tags=["embeddings"])


@router.post("/embed/store")
async def embed_and_store_chunks(request: dict):
    """
    Phase 2 Embedding & Storage Pipeline: Chunk → Embed → Store in Chroma Cloud
    """
    try:
        from app.services.chunking.chunker import TextChunker
        from app.services.refiners.embeddings.generator import EmbeddingGenerator
        from app.services.refiners.embeddings.storage import ChromaCloudStorage
        from app.connections.chroma import get_user_collection

        # Validate request
        required_fields = ["user_id", "content_id", "extracted_text", "summary"]
        for field in required_fields:
            if field not in request or not request[field]:
                raise ValueError(f"Missing required field: {field}")

        start_time = time.time()
        user_id = request["user_id"]
        content_id = request["content_id"]
        extracted_text = request["extracted_text"]
        summary = request["summary"]
        tags = request.get("tags", [])
        source_url = request.get("source_url", "")
        source_type = request.get("source_type", "web")

        # Step 1: Chunk the content
        chunker = TextChunker()
        chunks = chunker.chunk_text(extracted_text)
        if not chunks:
            raise ValueError("Failed to chunk content")

        # Step 2: Generate embeddings
        chunk_texts = [chunk.text for chunk in chunks]

        # Truncate texts to safe token length
        MAX_EMBEDDING_LENGTH = 400
        truncated_chunk_texts = [
            text[:MAX_EMBEDDING_LENGTH] if len(text) > MAX_EMBEDDING_LENGTH else text
            for text in chunk_texts
        ]
        summary_for_embedding = (
            summary[:MAX_EMBEDDING_LENGTH]
            if len(summary) > MAX_EMBEDDING_LENGTH
            else summary
        )
        all_texts = truncated_chunk_texts + [summary_for_embedding]

        generator = EmbeddingGenerator()
        embeddings = await generator.generate_embeddings(all_texts)

        if not embeddings or len(embeddings) != len(all_texts):
            raise ValueError(
                f"Embedding generation failed: expected {len(all_texts)} embeddings, got {len(embeddings) if embeddings else 0}"
            )

        chunk_embeddings = embeddings[:-1]
        summary_embedding = embeddings[-1]

        # Step 3: Store chunks in Chroma
        chunks_collection = get_user_collection(user_id, "chunks")
        chunks_storage = ChromaCloudStorage(chunks_collection)
        doc_ids, failed_count = await chunks_storage.store_chunks(
            chunks=chunks,
            embeddings=chunk_embeddings,
            content_id=content_id,
            user_id=user_id,
            tags=tags,
            source_url=source_url,
            source_type=source_type,
        )

        if failed_count > 0:
            raise ValueError(f"Failed to store {failed_count} chunks in Chroma")

        # Step 4: Store summary in Chroma
        summaries_collection = get_user_collection(user_id, "summaries")
        summaries_storage = ChromaCloudStorage(summaries_collection)
        summary_doc_id = await summaries_storage.store_summary(
            summary=summary,
            summary_embedding=summary_embedding,
            content_id=content_id,
            user_id=user_id,
            tags=tags,
            source_url=source_url,
            source_type=source_type,
            extracted_text_length=len(extracted_text),
        )

        processing_time_ms = int((time.time() - start_time) * 1000)

        return {
            "success": True,
            "chunk_count": len(chunks),
            "chroma_doc_ids": doc_ids,
            "summary_doc_id": summary_doc_id,
            "processing_time_ms": processing_time_ms,
            "errors": [],
        }

    except Exception as e:
        import traceback

        raise HTTPException(
            status_code=500,
            detail={
                "error": f"Phase 2 embedding & storage failed: {str(e)}",
                "details": traceback.format_exc(),
            },
        )


@router.post("/embed/delete")
async def delete_embeddings(request: dict):
    """Delete embeddings from Chroma Cloud when content is deleted."""
    try:
        from app.connections.chroma import get_user_collection

        start_time = time.time()

        required_fields = ["user_id", "content_id", "chroma_doc_ids"]
        for field in required_fields:
            if field not in request:
                raise ValueError(f"Missing required field: {field}")

        user_id = request["user_id"]
        content_id = request["content_id"]
        chroma_doc_ids = request["chroma_doc_ids"]

        if not isinstance(chroma_doc_ids, list) or len(chroma_doc_ids) == 0:
            raise ValueError("chroma_doc_ids must be a non-empty list")

        deleted_chunk_count = 0
        deleted_summary_doc_id = None

        # Delete chunk embeddings
        try:
            chunks_collection = get_user_collection(user_id, "chunks")
            chunks_collection.delete(ids=chroma_doc_ids)
            deleted_chunk_count = len(chroma_doc_ids)
            print(
                f"[EMBED_DELETE] Deleted {deleted_chunk_count} chunk embeddings for content {content_id}"
            )
        except Exception as e:
            print(
                f"[EMBED_DELETE] Warning: Failed to delete chunk embeddings: {str(e)}"
            )

        # Delete summary embedding
        try:
            summaries_collection = get_user_collection(user_id, "summaries")
            summary_doc_id = f"{user_id}_{content_id}_summary"
            summaries_collection.delete(ids=[summary_doc_id])
            deleted_summary_doc_id = summary_doc_id
            print(f"[EMBED_DELETE] Deleted summary embedding for content {content_id}")
        except Exception as e:
            print(
                f"[EMBED_DELETE] Warning: Failed to delete summary embedding: {str(e)}"
            )

        processing_time_ms = int((time.time() - start_time) * 1000)

        return {
            "success": True,
            "deleted_chunk_count": deleted_chunk_count,
            "deleted_summary_doc_id": deleted_summary_doc_id,
            "processing_time_ms": processing_time_ms,
        }

    except Exception as e:
        import traceback

        raise HTTPException(
            status_code=500,
            detail={
                "error": f"Failed to delete embeddings: {str(e)}",
                "details": traceback.format_exc(),
            },
        )


@router.post("/embed/update-metadata")
async def update_embeddings_metadata(request: dict):
    """Update embeddings metadata in Chroma Cloud when a tag is deleted."""
    try:
        import json
        from app.connections.chroma import get_user_collection

        start_time = time.time()

        required_fields = ["user_id", "tag_id", "content_items", "action"]
        for field in required_fields:
            if field not in request:
                raise ValueError(f"Missing required field: {field}")

        user_id = request["user_id"]
        tag_id = request["tag_id"]
        content_items = request["content_items"]
        action = request["action"]

        if not isinstance(content_items, list) or len(content_items) == 0:
            return {
                "success": True,
                "updated_content_count": 0,
                "updated_chunk_count": 0,
                "processing_time_ms": 0,
                "message": "No content items to update",
            }

        if action not in ["remove_tag", "update_tag"]:
            raise ValueError(
                f"Invalid action: {action}. Must be 'remove_tag' or 'update_tag'"
            )

        updated_content_count = 0
        updated_chunk_count = 0

        chunks_collection = get_user_collection(user_id, "chunks")
        summaries_collection = get_user_collection(user_id, "summaries")

        for content_item in content_items:
            content_id = content_item.get("contentId")
            chroma_doc_ids = content_item.get("chromaDocIds", [])

            if not content_id or not chroma_doc_ids:
                continue

            try:
                for doc_id in chroma_doc_ids:
                    try:
                        result = chunks_collection.get(
                            ids=[doc_id], include=["metadatas"]
                        )

                        if (
                            result
                            and result["metadatas"]
                            and len(result["metadatas"]) > 0
                        ):
                            current_metadata = result["metadatas"][0]

                            if action == "remove_tag":
                                current_tags = current_metadata.get("tags", [])

                                if isinstance(current_tags, str):
                                    try:
                                        current_tags = json.loads(current_tags)
                                    except json.JSONDecodeError:
                                        current_tags = [current_tags]
                                elif not isinstance(current_tags, list):
                                    current_tags = (
                                        [current_tags] if current_tags else []
                                    )

                                if (
                                    isinstance(current_tags, list)
                                    and tag_id in current_tags
                                ):
                                    current_tags.remove(tag_id)
                                    updated_metadata = {
                                        **current_metadata,
                                        "tags": current_tags,
                                    }
                                    chunks_collection.update(
                                        ids=[doc_id], metadatas=[updated_metadata]
                                    )
                                    updated_chunk_count += 1

                    except Exception as e:
                        print(
                            f"[EMBED_UPDATE] Warning: Failed to update chunk metadata {doc_id}: {str(e)}"
                        )

                # Update summary metadata
                try:
                    summary_doc_id = f"{user_id}_{content_id}_summary"
                    result = summaries_collection.get(
                        ids=[summary_doc_id], include=["metadatas"]
                    )

                    if result and result["metadatas"] and len(result["metadatas"]) > 0:
                        current_metadata = result["metadatas"][0]

                        if action == "remove_tag":
                            current_tags = current_metadata.get("tags", [])

                            if isinstance(current_tags, str):
                                try:
                                    current_tags = json.loads(current_tags)
                                except json.JSONDecodeError:
                                    current_tags = [current_tags]
                            elif not isinstance(current_tags, list):
                                current_tags = [current_tags] if current_tags else []

                            if (
                                isinstance(current_tags, list)
                                and tag_id in current_tags
                            ):
                                current_tags.remove(tag_id)
                                updated_metadata = {
                                    **current_metadata,
                                    "tags": current_tags,
                                }
                                summaries_collection.update(
                                    ids=[summary_doc_id], metadatas=[updated_metadata]
                                )

                except Exception as e:
                    print(
                        f"[EMBED_UPDATE] Warning: Failed to update summary metadata: {str(e)}"
                    )

                updated_content_count += 1

            except Exception as e:
                print(
                    f"[EMBED_UPDATE] Warning: Failed to process content {content_id}: {str(e)}"
                )

        processing_time_ms = int((time.time() - start_time) * 1000)

        return {
            "success": True,
            "updated_content_count": updated_content_count,
            "updated_chunk_count": updated_chunk_count,
            "processing_time_ms": processing_time_ms,
        }

    except Exception as e:
        import traceback

        raise HTTPException(
            status_code=500,
            detail={
                "error": f"Failed to update embeddings metadata: {str(e)}",
                "details": traceback.format_exc(),
            },
        )
