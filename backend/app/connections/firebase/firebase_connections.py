"""
Firebase/Firestore Connection Manager

Manages connections to Firebase Firestore for fetching content data.
Uses Firebase Admin SDK with service account credentials from environment.
"""

import logging
import os
from typing import Optional, List, Dict, Any
import firebase_admin
from firebase_admin import credentials, firestore
from dotenv import load_dotenv

logger = logging.getLogger(__name__)

load_dotenv(".env.local")
load_dotenv()

FIREBASE_PROJECT_ID = os.getenv("FIREBASE_PROJECT_ID")
FIREBASE_CLIENT_EMAIL = os.getenv("FIREBASE_CLIENT_EMAIL")
FIREBASE_PRIVATE_KEY = os.getenv("FIREBASE_PRIVATE_KEY", "").replace("\\n", "\n")

_firestore_client: Optional[firestore.Client] = None
_app_initialized: bool = False


def get_firestore_client() -> firestore.Client:
    """
    Get or initialize Firestore client.

    Returns:
        Firestore client instance

    Raises:
        Exception: If connection fails
    """
    global _firestore_client, _app_initialized

    if _firestore_client is None:
        try:
            if not _app_initialized:
                logger.info(f"🔥 Initializing Firebase for project: {FIREBASE_PROJECT_ID}")
                
                cred = credentials.Certificate({
                    "type": "service_account",
                    "project_id": FIREBASE_PROJECT_ID,
                    "private_key": FIREBASE_PRIVATE_KEY,
                    "client_email": FIREBASE_CLIENT_EMAIL,
                    "token_uri": "https://oauth2.googleapis.com/token",
                })
                
                firebase_admin.initialize_app(cred)
                _app_initialized = True
                logger.info("✅ Firebase Admin SDK initialized")

            _firestore_client = firestore.client()
            logger.info("✅ Firestore client connected")

        except Exception as e:
            logger.error(f"Failed to initialize Firestore client: {str(e)}")
            raise

    return _firestore_client


async def fetch_content_by_ids(user_id: str, content_ids: List[str]) -> List[Dict[str, Any]]:
    """
    Fetch content details from Firestore by content IDs.
    
    Efficiently fetches multiple documents using batch get.
    
    Args:
        user_id: User ID for the collection path
        content_ids: List of content IDs to fetch
        
    Returns:
        List of content documents with their data
    """
    try:
        import asyncio
        
        if not content_ids:
            return []
            
        logger.info(f"[FIREBASE] Fetching {len(content_ids)} content items for user {user_id}")
        
        def _fetch():
            db = get_firestore_client()
            results = []
            
            # Fetch all content docs in one batch
            # Path: users/{user_id}/content/{content_id}
            for content_id in content_ids[:5]:  # Limit to 5 for context window
                try:
                    doc_ref = db.collection("users").document(user_id).collection("content").document(content_id)
                    doc = doc_ref.get()
                    
                    if doc.exists:
                        data = doc.to_dict()
                        
                        summary = data.get("description") or data.get("rawContent") or ""
                        tags = data.get("tagsId") or data.get("tags") or []
                        
                        results.append({
                            "content_id": content_id,
                            "title": data.get("title", "Untitled"),
                            "summary": summary,
                            "tags": tags,
                            "source_url": data.get("link", "") or data.get("source_url", ""),
                            "content_type": data.get("contentType", "") or data.get("content_type", ""),
                        })
                except Exception as e:
                    logger.warning(f"[FIREBASE] Failed to fetch content {content_id}: {str(e)}")
                    
            return results
        
        results = await asyncio.to_thread(_fetch)
        logger.info(f"[FIREBASE] Fetched {len(results)} content items")
        return results
        
    except Exception as e:
        logger.error(f"[FIREBASE] Error fetching content: {str(e)}")
        return []


def reinitialize_firebase():
    """Force reinitialize Firebase connection."""
    global _firestore_client, _app_initialized
    _firestore_client = None
    logger.info("🔄 Firestore client reinitialized")
