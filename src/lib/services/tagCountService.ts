import { adminDb } from '@/lib/firebase/admin';

/**
 * Updates the contentCount for a specific tag based on content that uses it
 */
export async function updateTagCount(userId: string, tagId: string): Promise<void> {
  if (!tagId || !userId) return;

  try {
    // Count content items that have this tagId in their tagsId array
    const contentCollection = adminDb
      .collection('users')
      .doc(userId)
      .collection('content');
    
    const contentSnapshot = await contentCollection.where('tagsId', 'array-contains', tagId).get();
    const currentContentCount = contentSnapshot.size;

    // Update the tag's contentCount
    const tagRef = adminDb
      .collection('users')
      .doc(userId)
      .collection('tags')
      .doc(tagId);

    // Check if tag exists before updating
    const tagDoc = await tagRef.get();
    if (tagDoc.exists) {
      await tagRef.update({
        contentCount: currentContentCount,
        updatedAt: new Date().toISOString()
      });
    }
  } catch (error) {
    console.error('Error updating tag count:', error);
  }
}

/**
 * Updates tag counts for multiple tags
 */
export async function updateMultipleTagCounts(userId: string, tagIds: string[]): Promise<void> {
  const validTagIds = tagIds.filter(id => id && id.trim() !== '');
  
  // Update each tag count
  await Promise.all(
    validTagIds.map(tagId => updateTagCount(userId, tagId))
  );
}

/**
 * Updates tag counts when content changes from one tag to another
 */
export async function updateTagCountsOnContentChange(
  userId: string, 
  oldTagId?: string, 
  newTagId?: string
): Promise<void> {
  const tagsToUpdate: string[] = [];
  
  if (oldTagId && oldTagId.trim() !== '') {
    tagsToUpdate.push(oldTagId);
  }
  
  if (newTagId && newTagId.trim() !== '' && newTagId !== oldTagId) {
    tagsToUpdate.push(newTagId);
  }
  
  await updateMultipleTagCounts(userId, tagsToUpdate);
}

/**
 * Updates tag counts when content changes from old tag array to new tag array
 */
export async function updateTagCountsOnArrayChange(
  userId: string, 
  oldTagIds: string[] = [], 
  newTagIds: string[] = []
): Promise<void> {
  // Get all unique tag IDs that need count updates
  const allTagIds = new Set([...oldTagIds, ...newTagIds]);
  
  // Update counts for all affected tags
  await updateMultipleTagCounts(userId, Array.from(allTagIds));
}

/**
 * Recalculates tag counts for all tags of a user
 * Useful for syncing up counts if they get out of sync
 */
export async function recalculateAllTagCounts(userId: string): Promise<void> {
  try {
    // Get all tags for the user
    const tagsCollection = adminDb
      .collection('users')
      .doc(userId)
      .collection('tags');
    
    const tagsSnapshot = await tagsCollection.get();
    
    // Update count for each tag
    const updatePromises = tagsSnapshot.docs.map(async (tagDoc) => {
      const tagId = tagDoc.id;
      await updateTagCount(userId, tagId);
    });
    
    await Promise.all(updatePromises);
  } catch (error) {
    console.error('Error recalculating all tag counts:', error);
    throw error;
  }
}