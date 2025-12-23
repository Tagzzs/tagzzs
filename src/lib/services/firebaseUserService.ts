// lib/services/firebaseUserService.ts
import { adminDb } from '@/lib/firebase/admin';

export interface UserFirebaseData {
  userId: string;
  createdAt: string;
  totalContent: number;
  totalTags: number;
}

export interface ContentData {
  id: string;
  title: string;
  content: string;
  createdAt: string;
  updatedAt: string;
  tags: string[];
}

export interface TagData {
  id: string;
  tagName: string;
  createdAt: string;
  contentCount: number;
}

export class FirebaseUserService {
  /**
   * Create initial user document structure in Firebase
   */
  static async createUserDocument(userData: UserFirebaseData): Promise<boolean> {
    try {
      const { userId, createdAt } = userData;

      // Create main user document only
      await adminDb
        .collection('users')
        .doc(userId)
        .set({
          createdAt,
          totalContent: 0,
          totalTags: 0,
          updatedAt: createdAt,
        });

      return true;
    } catch (error) {
      console.error('Error creating Firebase user document:', error);
      return false;
    }
  }

  /**
   * Add content to user's content collection
   */
  static async addContent(userId: string, contentData: ContentData): Promise<boolean> {
    try {
      const contentRef = adminDb
        .collection('users')
        .doc(userId)
        .collection('content')
        .doc(contentData.id);

      await contentRef.set(contentData);

      // Update total content count
      await this.updateContentCount(userId, 1);

      return true;
    } catch (error) {
      console.error('Error adding content:', error);
      return false;
    }
  }

  /**
   * Add tag to user's tags collection
   */
  static async addTag(userId: string, tagData: TagData): Promise<boolean> {
    try {
      const tagRef = adminDb
        .collection('users')
        .doc(userId)
        .collection('tags')
        .doc(tagData.id);

      await tagRef.set(tagData);

      // Update total tags count
      await this.updateTagsCount(userId, 1);

      return true;
    } catch (error) {
      console.error('Error adding tag:', error);
      return false;
    }
  }

  /**
   * Update user's total content count
   */
  static async updateContentCount(userId: string, increment: number): Promise<void> {
    try {
      const userRef = adminDb.collection('users').doc(userId);
      const userDoc = await userRef.get();
      
      if (userDoc.exists) {
        const currentCount = userDoc.data()?.totalContent || 0;
        await userRef.update({
          totalContent: Math.max(0, currentCount + increment),
          updatedAt: new Date().toISOString(),
        });
      }
    } catch (error) {
      console.error('Error updating content count:', error);
    }
  }

  /**
   * Update user's total tags count
   */
  static async updateTagsCount(userId: string, increment: number): Promise<void> {
    try {
      const userRef = adminDb.collection('users').doc(userId);
      const userDoc = await userRef.get();
      
      if (userDoc.exists) {
        const currentCount = userDoc.data()?.totalTags || 0;
        await userRef.update({
          totalTags: Math.max(0, currentCount + increment),
          updatedAt: new Date().toISOString(),
        });
      }
    } catch (error) {
      console.error('Error updating tags count:', error);
    }
  }

  /**
   * Get user document with stats
   */
  static async getUserDocument(userId: string) {
    try {
      const userDoc = await adminDb.collection('users').doc(userId).get();
      
      if (userDoc.exists) {
        return userDoc.data();
      }
      
      return null;
    } catch (error) {
      console.error('Error getting user document:', error);
      return null;
    }
  }

  /**
   * Delete user document and all subcollections
   */
  static async deleteUserDocument(userId: string): Promise<boolean> {
    try {
      // Delete content subcollection
      const contentCollection = adminDb
        .collection('users')
        .doc(userId)
        .collection('content');
      
      const contentDocs = await contentCollection.get();
      const contentDeletePromises = contentDocs.docs.map(doc => doc.ref.delete());
      await Promise.all(contentDeletePromises);

      // Delete tags subcollection
      const tagsCollection = adminDb
        .collection('users')
        .doc(userId)
        .collection('tags');
      
      const tagsDocs = await tagsCollection.get();
      const tagsDeletePromises = tagsDocs.docs.map(doc => doc.ref.delete());
      await Promise.all(tagsDeletePromises);

      // Delete main user document
      await adminDb.collection('users').doc(userId).delete();

      return true;
    } catch (error) {
      console.error('Error deleting Firebase user document:', error);
      return false;
    }
  }
}