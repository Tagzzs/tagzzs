# services/robustness.py
"""
Robustness helpers for Kai AI stack

Purpose:
- Centralize common sanitization, stable scoring, sorting and validation logic.
- Be non-invasive: minimal surface area to call from existing nodes/services.

Functions provided:
- clamp_confidence
- safe_score (combine scores robustly)
- sanitize_and_trim_chunks (ensure chunk schema, trim very large fields)
- stable_sort_chunks (stable sort by combined_relevance then semantic_score then relevance)
- is_valid_answer (basic sanity checks to avoid jumbled/empty answers)
- log_request_id (generate + return request id for tracing)
- normalize_sources_summary

Usage:
- Import functions where you calculate/re-rank results (content_retrieval, ollama_ai_service.search_relevant_content, rag_chat_service._build_context_string)
- Call sanitize_and_trim_chunks immediately after retrieving results from DB
- Use stable_sort_chunks before taking top_k
- Use is_valid_answer on final LLM output before returning to client

This file also contains lightweight configuration constants you can tune.
"""
from __future__ import annotations

import logging
import uuid
import math
from typing import List, Dict, Any, Callable, Optional

logger = logging.getLogger(__name__)

# ----------------------------
# Tunable constants
# ----------------------------
MAX_CHUNK_CONTENT_LEN = 2000  # chars — reduce very large chunk bodies
MIN_RELEVANCE_THRESHOLD = 0.35
MAX_RETURNED_CHUNKS = 50  # defensive cap
MIN_ANSWER_LENGTH = 10  # words
MAX_ANSWER_LENGTH = 2000  # words

# ----------------------------
# Helpers
# ----------------------------

def log_request_id(prefix: str = "req") -> str:
    """Generate a short UUID to tag logs and responses (returns string).

    Use at the start of request handling and include the id in logs and responses.
    """
    rid = f"{prefix}-{uuid.uuid4().hex[:8]}"
    logger.debug(f"[ROBUSTNESS] Generated request id: {rid}")
    return rid


def clamp_confidence(score: float) -> float:
    """Clamp score to [0.0, 1.0] and protect against NaN/inf."""
    try:
        if score is None:
            return 0.0
        if math.isnan(score) or math.isinf(score):
            return 0.0
        return max(0.0, min(1.0, float(score)))
    except Exception:
        return 0.0


def safe_score(*components: Optional[float], weights: Optional[List[float]] = None) -> float:
    """Combine score components safely. Components and weights may be missing.

    - If weights provided, they must match components length.
    - Missing components treated as 0.0.
    - Result clamped to [0,1].
    """
    comps = [0.0 if c is None else float(c) for c in components]
    if weights:
        try:
            weighted = [c * float(w) for c, w in zip(comps, weights)]
            s = sum(weighted) / (sum(weights) or 1.0)
        except Exception:
            s = sum(comps) / (len(comps) or 1)
    else:
        s = sum(comps) / (len(comps) or 1)
    return clamp_confidence(s)


def sanitize_and_trim_chunks(chunks: List[Dict[str, Any]],
                             max_content_len: int = MAX_CHUNK_CONTENT_LEN,
                             min_relevance: float = MIN_RELEVANCE_THRESHOLD,
                             max_chunks: int = MAX_RETURNED_CHUNKS) -> List[Dict[str, Any]]:
    """Ensure each chunk has expected keys, trim large content, drop low-relevance items.

    Normalizes chunk dicts to guaranteed keys so downstream logic doesn't crash.
    """
    sanitized: List[Dict[str, Any]] = []

    for c in (chunks or []):
        try:
            metadata = c.get("metadata") if isinstance(c, dict) else {}
            if metadata is None:
                metadata = {}

            relevance = metadata.get("relevance_score") if isinstance(metadata, dict) else None
            # fallbacks
            if relevance is None:
                relevance = c.get("relevance") or c.get("score") or 0.0

            relevance = clamp_confidence(float(relevance))
            if relevance < min_relevance:
                # skip low relevance
                continue

            content = c.get("content") or c.get("document") or c.get("text") or ""
            if not isinstance(content, str):
                # coerce to string safely
                content = str(content)

            # Trim very large content early to avoid huge prompts
            if len(content) > max_content_len:
                content = content[:max_content_len] + "..."

            # Ensure metadata fields exist and are well-typed
            normalized_meta = {
                "source_field": metadata.get("source_field") or metadata.get("field") or "raw_data",
                "relevance_score": relevance,
                "field_weight": metadata.get("field_weight") or 0.6,
                "content_id": metadata.get("content_id") or metadata.get("id"),
                "title": metadata.get("title"),
                "tags": metadata.get("tags") or ([] if metadata.get("tags") is None else metadata.get("tags")),
                "url": metadata.get("url")
            }

            sanitized.append({
                "content": content,
                "document": content,
                "metadata": normalized_meta,
                # preserve original extras if present
                **{k: v for k, v in c.items() if k not in ("content", "document", "text", "metadata")}
            })

            if len(sanitized) >= max_chunks:
                break

        except Exception as e:
            logger.debug(f"[ROBUSTNESS] Skipping chunk due to sanitization error: {e}")
            continue

    return sanitized


def stable_sort_chunks(chunks: List[Dict[str, Any]], key_functions: Optional[List[Callable[[Dict[str, Any]], Any]]] = None, reverse: bool = True) -> List[Dict[str, Any]]:
    """Stable sort with multiple keys while guarding missing fields.

    Default behaviour: sort by metadata.relevance_score, then metadata.semantic_score, then metadata.field_weight.
    """
    if not chunks:
        return []

    def default_key(c: Dict[str, Any]):
        m = c.get("metadata", {}) or {}
        return (
            -(m.get("relevance_score") or 0.0),
            -(m.get("semantic_score") or 0.0),
            -(m.get("field_weight") or 0.0)
        )

    if key_functions:
        def composed_key(c: Dict[str, Any]):
            return tuple(f(c) for f in key_functions)
        sorted_chunks = sorted(chunks, key=composed_key, reverse=reverse)
    else:
        sorted_chunks = sorted(chunks, key=default_key)

    # stable sort guaranteed by Python's sort
    return sorted_chunks


def is_valid_answer(answer: Optional[str], min_words: int = MIN_ANSWER_LENGTH) -> bool:
    """Basic heuristics to detect jumbled or empty LLM outputs.

    Returns False for:
    - None/empty answers
    - Very short answers (few words) unless explicitly allowed
    - Answers that look like logging traces or JSON dumps (heuristic)
    """
    if not answer or not isinstance(answer, str):
        return False

    # remove whitespace
    stripped = answer.strip()
    if len(stripped) == 0:
        return False

    # word count heuristic
    words = stripped.split()
    if len(words) < min_words:
        # allow if it contains clear single-line answer like "Yes" or "No"
        if stripped.lower() in ("yes", "no", "i don't know", "i don't have this information in your saved content"):
            return True
        return False

    # crude check for stack traces / json dumps starting characters
    if stripped.startswith("Traceback") or stripped.startswith("{") or stripped.startswith("["):
        return False

    return True


def normalize_sources_summary(chunks: List[Dict[str, Any]], max_items: int = 3) -> str:
    """Create a concise sources summary string used in final responses.

    Example output: "title (relevance: 92%), description (relevance: 83%)"
    """
    if not chunks:
        return ""

    parts = []
    for c in chunks[:max_items]:
        m = c.get("metadata", {}) or {}
        field = m.get("source_field", "unknown")
        rel = m.get("relevance_score", 0.0)
        parts.append(f"{field} (relevance: {int(rel*100)}%)")
    return " • ".join(parts)


# ----------------------------
# Small utility for guard-wrapping LLM calls
# ----------------------------

def guard_llm_call(callable_llm: Callable[..., str],
                   *args, retry_on_empty: bool = True, max_retries: int = 1, **kwargs) -> str:
    """Call an LLM function and apply basic post-checks.

    - If the LLM returns empty or invalid output, optionally retry once.
    - Always return a non-null string (may be a safe fallback message).
    """
    try:
        out = callable_llm(*args, **kwargs)
        if is_valid_answer(out):
            return out
        # Try retry
        if retry_on_empty and max_retries > 0:
            for _ in range(max_retries):
                out = callable_llm(*args, **kwargs)
                if is_valid_answer(out):
                    return out
        # final fallback
        logger.warning("[ROBUSTNESS] LLM produced invalid or jumbled output; returning safe fallback")
        return "I couldn't generate a clear answer. Please rephrase your question or provide more context."
    except Exception as e:
        logger.exception(f"[ROBUSTNESS] Exception calling LLM: {e}")
        return "I couldn't generate a response due to an internal error. Try again later."
