from numbers import Number

import firebase_admin
from firebase_admin import credentials, firestore
from datetime import datetime, timezone
from typing import Optional, Dict, Any
import os

# Initialize Firebase Admin SDK
if not firebase_admin._apps:
    cred = credentials.Certificate(os.getenv("FIREBASE_SERVICE_ACCOUNT_PATH"))
    firebase_admin.initialize_app(cred)

db = firestore.client()


class FirebaseUserService:
    """
    Python implementation of the FirebaseUserService used in Next.js right now.
    Handles user profiles, content, and tags in Firestore.
    """

    @staticmethod
    def create_user_document(user_id: str, created_at: str) -> bool:
        """
        Create initial user document structure in Firebase.
        """
        try:
            user_ref = db.collection('users').document(user_id)
            user_ref.set({
                'createdAt': created_at,
                'totalContent': 0,
                'totalTags': 0,
                'updatedAt': created_at,
            })
            return True
        except Exception as e:
            print(f"Error creating Firebase user document: {e}")
            return False

    @staticmethod
    def add_content(user_id: str, content_data: Dict[str, Any]) -> bool:
        """
        Add content to user's content subcollection.
        """
        try:
            content_id = content_data.get('id')
            if not content_id:
                return False

            content_ref = db.collection('users').document(user_id) \
                .collection('content').document(content_id)

            content_ref.set(content_data)

            # Update total content count
            FirebaseUserService.update_content_count(user_id, 1)
            return True
        except Exception as e:
            print(f"Error adding content: {e}")
            return False

    @staticmethod
    def add_tag(user_id: str, tag_data: Dict[str, Any]) -> bool:
        """
        Add tag to user's tags subcollection.
        """
        try:
            tag_id = tag_data.get('id')
            if not tag_id:
                return False

            tag_ref = db.collection('users').document(user_id) \
                .collection('tags').document(tag_id)

            tag_ref.set(tag_data)

            # Update total tags count
            FirebaseUserService.update_tags_count(user_id, 1)
            return True
        except Exception as e:
            print(f"Error adding tag: {e}")
            return False

    @staticmethod
    def update_content_count(user_id: str, increment_value: int) -> None:
        """
        Update user's total content count using an increment.
        """
        try:
            user_ref = db.collection('users').document(user_id)
            user_ref.update({
                'totalContent': firestore.Increment(increment_value),
                'updatedAt': datetime.now(timezone.utc).isoformat(),
            })
        except Exception as e:
            print(f"Error updating content count: {e}")


    @staticmethod
    def update_tags_count(user_id: str, increment_value: int) -> None:
        """
        Update user's total tags count using an increment.
        """
        try:
            user_ref = db.collection('users').document(user_id)
            user_ref.update({
                'totalTags': firestore.Increment(increment_value),
                'updatedAt': datetime.now(timezone.utc).isoformat(),
            })
        except Exception as e:
            print(f"Error updating tags count: {e}")


    @staticmethod
    def get_user_document(user_id: str) -> Optional[Dict[str, Any]]:
        """
        Get user document with stats.
        """
        try:
            user_doc = db.collection('users').document(user_id).get()
            if user_doc.exists:
                return user_doc.to_dict()
            return None
        except Exception as e:
            print(f"Error getting user document: {e}")
            return None


    @staticmethod
    def delete_user_document(user_id: str) -> bool:
        """
        Delete user documents and subcollections
        """
        try:
            user_ref = db.collection('users').document(user_id)
            batch = db.batch()

            # Content
            content_docs = user_ref.collection('content').list_documents()
            for doc_ref in content_docs:
                batch.delete(doc_ref)

            # Tags
            tags_docs = user_ref.collection('tags').list_documents()
            for doc_ref in tags_docs:
                batch.delete(doc_ref)

            batch.delete(user_ref)
            batch.commit()
            return True
        except Exception as e:
            print(f"Error deleting: {e}")
            return False