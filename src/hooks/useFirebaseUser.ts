// hooks/useFirebaseUser.ts
"use client";

import { useState, useEffect } from 'react';
import { collection, doc, onSnapshot, addDoc, updateDoc, deleteDoc, query, orderBy } from 'firebase/firestore';
import { db } from '@/lib/firebase/client';
import { ContentData, TagData } from '@/lib/services/firebaseUserService';

export const useFirebaseUser = (userId: string | null) => {
  const [userStats, setUserStats] = useState<{
    totalContent: number;
    totalTags: number;
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!userId) {
      setLoading(false);
      return;
    }

    const unsubscribe = onSnapshot(
      doc(db, 'users', userId),
      (doc) => {
        if (doc.exists()) {
          const data = doc.data();
          setUserStats({
            totalContent: data.totalContent || 0,
            totalTags: data.totalTags || 0,
          });
        }
        setLoading(false);
      },
      (error) => {
        console.error('Error listening to user document:', error);
        setError(error.message);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [userId]);

  return { userStats, loading, error };
};

export const useUserContent = (userId: string | null) => {
  const [content, setContent] = useState<ContentData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!userId) {
      setLoading(false);
      return;
    }

    const contentRef = collection(db, 'users', userId, 'content');
    const q = query(contentRef, orderBy('createdAt', 'desc'));

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const contentData = snapshot.docs
          .map(doc => ({ id: doc.id, ...doc.data() } as ContentData))
          .filter(item => !item.id.startsWith('_')); 
        
        setContent(contentData);
        setLoading(false);
      },
      (error) => {
        console.error('Error listening to content:', error);
        setError(error.message);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [userId]);

  const addContent = async (contentData: Omit<ContentData, 'id'>) => {
    if (!userId) return null;

    try {
      const contentRef = collection(db, 'users', userId, 'content');
      const docRef = await addDoc(contentRef, {
        ...contentData,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
      return docRef.id;
    } catch (error) {
      console.error('Error adding content:', error);
      setError(error instanceof Error ? error.message : 'Failed to add content');
      return null;
    }
  };

  const updateContent = async (contentId: string, updates: Partial<ContentData>) => {
    if (!userId) return false;

    try {
      const contentRef = doc(db, 'users', userId, 'content', contentId);
      await updateDoc(contentRef, {
        ...updates,
        updatedAt: new Date().toISOString(),
      });
      return true;
    } catch (error) {
      console.error('Error updating content:', error);
      setError(error instanceof Error ? error.message : 'Failed to update content');
      return false;
    }
  };

  const deleteContent = async (contentId: string) => {
    if (!userId) return false;

    try {
      const contentRef = doc(db, 'users', userId, 'content', contentId);
      await deleteDoc(contentRef);
      return true;
    } catch (error) {
      console.error('Error deleting content:', error);
      setError(error instanceof Error ? error.message : 'Failed to delete content');
      return false;
    }
  };

  return {
    content,
    loading,
    error,
    addContent,
    updateContent,
    deleteContent,
  };
};

export const useUserTags = (userId: string | null) => {
  const [tags, setTags] = useState<TagData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!userId) {
      setLoading(false);
      return;
    }

    const tagsRef = collection(db, 'users', userId, 'tags');
    const q = query(tagsRef, orderBy('createdAt', 'desc'));

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const tagsData = snapshot.docs
          .map(doc => ({ id: doc.id, ...doc.data() } as TagData))
          .filter(item => !item.id.startsWith('_')); 
        
        setTags(tagsData);
        setLoading(false);
      },
      (error) => {
        console.error('Error listening to tags:', error);
        setError(error.message);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [userId]);

  const addTag = async (tagData: Omit<TagData, 'id'>) => {
    if (!userId) return null;

    try {
      const tagsRef = collection(db, 'users', userId, 'tags');
      const docRef = await addDoc(tagsRef, {
        ...tagData,
        createdAt: new Date().toISOString(),
        contentCount: 0,
      });
      return docRef.id;
    } catch (error) {
      console.error('Error adding tag:', error);
      setError(error instanceof Error ? error.message : 'Failed to add tag');
      return null;
    }
  };

  const updateTag = async (tagId: string, updates: Partial<TagData>) => {
    if (!userId) return false;

    try {
      const tagRef = doc(db, 'users', userId, 'tags', tagId);
      await updateDoc(tagRef, updates);
      return true;
    } catch (error) {
      console.error('Error updating tag:', error);
      setError(error instanceof Error ? error.message : 'Failed to update tag');
      return false;
    }
  };

  const deleteTag = async (tagId: string) => {
    if (!userId) return false;

    try {
      const tagRef = doc(db, 'users', userId, 'tags', tagId);
      await deleteDoc(tagRef);
      return true;
    } catch (error) {
      console.error('Error deleting tag:', error);
      setError(error instanceof Error ? error.message : 'Failed to delete tag');
      return false;
    }
  };

  return {
    tags,
    loading,
    error,
    addTag,
    updateTag,
    deleteTag,
  };
};
