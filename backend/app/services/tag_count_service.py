import asyncio
from app.services.firebase.firebase_admin_setup import admin_db
from datetime import datetime
from typing import List, Optional


async def update_tag_count(user_id: str, tag_id: str) -> None:
    if not tag_id or not user_id: return

    try:
        content_collection = admin_db.collection('users').document(user_id).collection('content')
        
        content_snapshot = content_collection.where('tagsId', 'array_contains', tag_id).get()
        current_content_count = len(content_snapshot)

        tag_ref = admin_db.collection('users').document(user_id).collection('tags').document(tag_id)
        
        tag_doc = tag_ref.get()
        if tag_doc.exists:
            tag_ref.update({
                'contentCount': current_content_count,
                'updatedAt': datetime.utcnow().isoformat() + "Z"
            })
    except Exception as error:
        print(f"Error updating tag count: {error}")

async def update_multiple_tag_counts(user_id: str, tag_ids: list[str]) -> None:
    valid_tag_ids = [tid for tid in tag_ids if tid and tid.strip() != '']
    if valid_tag_ids:
        await asyncio.gather(*(update_tag_count(user_id, tid) for tid in valid_tag_ids))


async def update_tag_counts_on_content_change(
    user_id: str, 
    old_tag_id: Optional[str] = None, 
    new_tag_id: Optional[str] = None
) -> None:
    """
    Updates tag counts when content changes from one tag to another
    """
    tags_to_update: List[str] = []
    
    if old_tag_id and old_tag_id.strip() != '':
        tags_to_update.append(old_tag_id)
    
    if new_tag_id and new_tag_id.strip() != '' and new_tag_id != old_tag_id:
        tags_to_update.append(new_tag_id)
    
    await update_multiple_tag_counts(user_id, tags_to_update)


async def update_tag_counts_on_array_change(
    user_id: str, 
    old_tag_ids: List[str] = [], 
    new_tag_ids: List[str] = []
) -> None:
    """
    Updates tag counts when content changes from old tag array to new tag array
    """
    # Get all unique tag IDs that need count updates
    all_tag_ids = set(old_tag_ids + new_tag_ids)
    
    # Update counts for all affected tags
    await update_multiple_tag_counts(user_id, list(all_tag_ids))


async def recalculate_all_tag_counts(user_id: str) -> None:
    """
    Recalculates tag counts for all tags of a user
    Useful for syncing up counts if they get out of sync
    """
    try:
        # Get all tags for the user
        tags_collection = admin_db.collection('users').document(user_id).collection('tags')
        tags_snapshot = tags_collection.get()
        
        # Update count for each tag
        # Replicating tagsSnapshot.docs.map and Promise.all
        tasks = []
        for tag_doc in tags_snapshot:
            tag_id = tag_doc.id
            tasks.append(update_tag_count(user_id, tag_id))
        
        if tasks:
            await asyncio.gather(*tasks)
            
    except Exception as error:
        # Replicating console.error and throw error
        print(f"Error recalculating all tag counts: {error}")
        raise error