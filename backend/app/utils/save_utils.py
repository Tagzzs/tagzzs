# save_utils.py
from datetime import datetime, timezone
from typing import Dict, Any, Optional

def ensure_created_at(metadata: Optional[Dict[str, Any]]) -> Dict[str, Any]:
    """
    Ensure metadata contains 'created_at' in ISO 8601 UTC format.
    Use this before saving/upserting a document into Chroma/DB.
    """
    if metadata is None:
        metadata = {}
    # Only set created_at if not present (do not overwrite original timestamp on updates)
    if not metadata.get("created_at"):
        metadata["created_at"] = datetime.now(timezone.utc).isoformat()
    return metadata
