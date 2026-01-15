'use client';

import { useParams, useRouter } from 'next/navigation';
import { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import { useContent } from '@/hooks/useContent';
import { useTags } from '@/hooks/useTags';
import { useAuthenticatedApi } from '@/hooks/use-authenticated-api';
import DetailView from '@/app/database/components/DetailView';
import { X, SidebarSimple } from '@phosphor-icons/react';
import LibrarySidebar from '@/app/database/components/LibrarySidebar';
import NeuralMapSidebar from '@/app/database/components/NeuralMapSidebar';
import FloatingSearchBar from '@/app/database/components/FloatingSearchBar';
import { buildTreeData } from '@/utils/buildTreeData';

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8000';

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export default function ContentPage() { 
    const params = useParams();
    const router = useRouter();
    const id = params.id as string;

    // Fetch content and tags
    const { content, loading: contentLoading } = useContent();
    const { tagsMap, tagTree, loading: tagsLoading } = useTags();

    // API for deletion
    const api = useAuthenticatedApi();

    // Build tree structure from real data
    const treeData = useMemo(() => {
        if (contentLoading || tagsLoading) return [];
        return buildTreeData(tagTree, content, tagsMap);
    }, [tagTree, content, tagsMap, contentLoading, tagsLoading]);

    // Find the current item
    const currentItem = useMemo(() => {
        return content.find(item => item.id === id);
    }, [content, id]);

    // Derived state for DetailView
    const currentDetailItem = useMemo(() => {
        if (!currentItem) return null;

        const tags = currentItem.tagsId
            .map(tagId => tagsMap.get(tagId))
            .filter(t => t !== undefined);

        return {
            id: currentItem.id,
            image: currentItem.thumbnailUrl || `https://picsum.photos/seed/${currentItem.id}/1200/800`,
            category: tags[0]?.tagName || 'General',
            subCategory: tags[1]?.tagName || '',
            title: currentItem.title,
            desc: currentItem.description || 'No description available.',
            content: currentItem.personalNotes || '', // Display personal notes in Notes section
            tags: tags.map(t => {
                let name = t.tagName;
                // If the tag name looks like a UUID, it might be a mistakenly created tag where the name IS the ID of another tag.
                // Try to resolve the real name from the tagsMap.
                if (UUID_REGEX.test(name)) {
                    const originalTag = tagsMap.get(name);
                    if (originalTag) {
                        name = originalTag.tagName;
                    }
                }
                return { id: t.id, name };
            }),
            _original: currentItem
        };
    }, [currentItem, tagsMap]);
    
    // Siblings for navigation
    const allItemsTransformed = useMemo(() => {
        return content.map(item => {
            const tags = item.tagsId
            .map(tagId => tagsMap.get(tagId))
            .filter(t => t !== undefined);
            
            return {
                id: item.id,
                category: tags[0]?.tagName || 'General',
                subCategory: tags[1]?.tagName || '',
            };
        });
    }, [content, tagsMap]);

    // Sidebar States
    const [isSidebarOpen, setIsSidebarOpen] = useState(true);
    const [sidebarExpandedCats, setSidebarExpandedCats] = useState<Set<string>>(new Set());
    
    // View State
    const [isEditing, setIsEditing] = useState(false);
    const [aiSummaryVisible, setAiSummaryVisible] = useState(true);
    const [aiSummaryText, setAiSummaryText] = useState('');



    const isLoading = contentLoading || tagsLoading;

    // Handlers
    const handleNavigate = useCallback((direction: number) => {
        if (!content.length) return;
        const currentIndex = content.findIndex(item => item.id === id);
        if (currentIndex === -1) return;
        
        const newIndex = currentIndex + direction;
        if (newIndex >= 0 && newIndex < content.length) {
            router.push(`/content/${content[newIndex].id}`);
        }
    }, [content, id, router]);

    const handleToggleSummary = useCallback(() => {
        setAiSummaryVisible(prev => !prev);
    }, []);

    const handleToggleSidebarCat = useCallback((name: string) => {
        setSidebarExpandedCats(prev => {
            const newSet = new Set(prev);
            if (newSet.has(name)) newSet.delete(name); else newSet.add(name);
            return newSet;
        });
    }, []);

    const handleUpdateView = useCallback((name: string) => {
        // Navigate to database view with filter
        router.push(`/database?filter=${encodeURIComponent(name)}`);
    }, [router]);

    // Delete Handler
    const handleDelete = useCallback(async () => {
        if (!currentDetailItem) return;
        
        try {
            await api.callApi(`${BACKEND_URL}/api/user-database/content/delete`, {
                method: 'DELETE',
                body: { contentId: currentDetailItem.id }
            });
            
            // Redirect to database on success
            router.push('/database');
        } catch (error) {
            console.error("Failed to delete content:", error);
        }
    }, [currentDetailItem, api, router]);

    // Save Handler
    const handleSave = useCallback(async (updates: { personalNotes?: string; description?: string; tagsId?: string[] }) => {
        if (!currentDetailItem) return;

        try {
            await api.callApi(`${BACKEND_URL}/api/user-database/content/edit`, {
                method: 'PUT',
                body: { 
                    contentId: currentDetailItem.id,
                    ...updates
                }
            });
            // Optionally refetch content here if needed, or rely on local state updates for now
        } catch (error) {
            console.error("Failed to update content:", error);
        }
    }, [currentDetailItem, api]);

    // Handle Tag Removal
    const handleRemoveTag = useCallback(async (tagIdToRemove: string) => {
        if (!currentItem || !tagsMap) return;

        let newTagsIds = currentItem.tagsId.filter(id => id !== tagIdToRemove);

        // Map to Uncategorized if no tags left
        if (newTagsIds.length === 0) {
            // Find "Uncategorized" or "General" tag
            let fallbackTag = Array.from(tagsMap.values()).find(t => t.tagName.toLowerCase() === 'uncategorized');
            if (!fallbackTag) {
                 fallbackTag = Array.from(tagsMap.values()).find(t => t.tagName.toLowerCase() === 'general');
            }
            
            if (fallbackTag) {
                newTagsIds = [fallbackTag.id];
            }
        }

        await handleSave({ tagsId: newTagsIds });
    }, [currentItem, tagsMap, handleSave]);

    // Search Mode State for Floating Bar
    const [searchMode, setSearchMode] = useState<'DB' | 'AI'>('DB');

    return (
        <div className="flex h-screen w-full bg-black overflow-hidden relative">
             {/* Left Sidebar (Library) */}
             <LibrarySidebar
                isSidebarOpen={isSidebarOpen}
                treeData={treeData}
                currentFilter={currentDetailItem?.category || 'All'}
                sidebarExpandedCats={sidebarExpandedCats}
                onToggleSidebarCat={handleToggleSidebarCat}
                onUpdateView={handleUpdateView}
                onToggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)}
             />

             {/* Main Content Area */}
             <div className="flex-1 h-full overflow-hidden relative flex flex-col min-w-0">
                 {!isSidebarOpen && (
                    <div className="absolute top-4 left-4 z-50">
                        <button
                            onClick={() => setIsSidebarOpen(true)}
                            className="bg-black/50 hover:bg-zinc-800 border border-zinc-700 text-zinc-400 hover:text-white p-2 rounded-lg transition-colors backdrop-blur-sm shadow-xl"
                            title="Open Library"
                        >
                            <SidebarSimple weight="bold" />
                        </button>
                    </div>
                 )}

                 {isLoading ? (
                    <div className="flex flex-1 h-full items-center justify-center">
                        <div className="flex flex-col items-center gap-4">
                            <div className="w-8 h-8 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" />
                            <p className="text-zinc-500 text-sm">Loading content...</p>
                        </div>
                    </div>
                 ) : !currentDetailItem ? (
                    <div className="flex h-full flex-col items-center justify-center bg-black text-white gap-4">
                        <div className="w-16 h-16 mb-2 rounded-full bg-zinc-800 flex items-center justify-center">
                            <X size={32} className="text-zinc-600" />
                        </div>
                        <p className="text-lg">Content not found</p>
                        <button 
                            onClick={() => router.push('/dashboard')} 
                            className="mt-4 text-zinc-400 hover:text-white border border-zinc-700 px-4 py-2 rounded-lg transition-colors"
                        >
                            Return to Dashboard
                        </button>
                    </div>
                 ) : (
                     <DetailView
                        currentDetailItem={currentDetailItem}
                        allItems={allItemsTransformed}
                        isEditing={isEditing}
                        aiSummaryVisible={aiSummaryVisible}
                        aiSummaryText={aiSummaryText || "AI summary generation not yet connected."}
                        onBack={() => router.push('/database')}
                        onNavigate={handleNavigate}
                        onToggleEditing={() => setIsEditing(!isEditing)}
                        onToggleSummary={handleToggleSummary}
                        onDelete={handleDelete}
                        onSave={handleSave}
                        onRemoveTag={handleRemoveTag}
                     />
                 )}
             </div>

             {/* Right Sidebar (Neural Map & AI Chat) */}
             <NeuralMapSidebar
                currentFilter={currentDetailItem?.category || 'All'}
                currentDetailItem={currentDetailItem}
             />
        </div>
    );
}
