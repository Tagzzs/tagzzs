'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Sparkle, MagnifyingGlass, Plus, X, Spinner } from '@phosphor-icons/react';
import { ContentItem } from '@/types';
import { useAuth } from '@/contexts/AuthContext';
import { Tag } from '@/hooks/useTags';

interface SearchBarProps {
    onOpenAddModal: () => void;
    content: ContentItem[];
    tagsMap: Map<string, Tag>;
    onSearchChange?: (query: string, results: ContentItem[], isSearching: boolean, loading: boolean) => void;
}

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8000';

export default function SearchBar({ onOpenAddModal, content, tagsMap, onSearchChange }: SearchBarProps) {
    const router = useRouter();
    const { user } = useAuth();
    const [isAiMode, setIsAiMode] = useState(false);
    const [isSearchFocused, setIsSearchFocused] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    
    const inputRef = useRef<HTMLInputElement>(null);
    const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);
    const abortControllerRef = useRef<AbortController | null>(null);
    const lastSearchQueryRef = useRef<string>('');

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            if (debounceTimerRef.current) {
                clearTimeout(debounceTimerRef.current);
            }
            if (abortControllerRef.current) {
                abortControllerRef.current.abort();
            }
        };
    }, []);

    // Perform local search immediately (no API call)
    const performLocalSearch = useCallback((query: string): ContentItem[] => {
        if (!query.trim()) return [];
        
        const queryLower = query.toLowerCase();
        return content.filter(item => {
            // Search in title, description, contentType, contentSource
            if (item.title.toLowerCase().includes(queryLower)) return true;
            if (item.description?.toLowerCase().includes(queryLower)) return true;
            if (item.contentType?.toLowerCase().includes(queryLower)) return true;
            if (item.contentSource?.toLowerCase().includes(queryLower)) return true;
            
            // Search in tag names
            if (item.tagsId && item.tagsId.length > 0) {
                for (const tagId of item.tagsId) {
                    const tag = tagsMap.get(tagId);
                    if (tag && tag.tagName.toLowerCase().includes(queryLower)) {
                        return true;
                    }
                }
            }
            
            return false;
        });
    }, [content, tagsMap]);

    // Perform semantic search (API call - only for longer queries)
    const performSemanticSearch = useCallback(async (query: string): Promise<ContentItem[]> => {
        // Cancel any in-flight request
        if (abortControllerRef.current) {
            abortControllerRef.current.abort();
        }

        // Don't make API call for very short queries
        if (query.length < 4) {
            return [];
        }

        // Don't search again if same query
        if (query === lastSearchQueryRef.current) {
            return [];
        }

        abortControllerRef.current = new AbortController();
        lastSearchQueryRef.current = query;

        try {
            const response = await fetch(`${BACKEND_URL}/search/semantic-query`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                signal: abortControllerRef.current.signal,
                body: JSON.stringify({
                    user_id: user?.id || '',
                    query: query.trim(),
                    limit: 10,
                }),
            });

            if (!response.ok) return [];

            const data = await response.json();
            if (!data.success || !data.results) return [];

            // Map semantic results to content items
            const semanticItems = data.results
                .map((r: any) => content.find(c => c.id === r.content_id))
                .filter((item: ContentItem | undefined): item is ContentItem => item !== undefined);

            return semanticItems;
        } catch (err) {
            if (err instanceof Error && err.name === 'AbortError') {
                // Request was cancelled, ignore
                return [];
            }
            console.error('[SearchBar] Semantic search error:', err);
            return [];
        }
    }, [content]);

    // Handle search input change with smart debouncing
    const handleSearchChange = useCallback((query: string) => {
        setSearchQuery(query);

        // Clear existing debounce timer
        if (debounceTimerRef.current) {
            clearTimeout(debounceTimerRef.current);
        }

        // If query is empty, clear search immediately
        if (!query.trim()) {
            if (onSearchChange) {
                onSearchChange('', [], false, false);
            }
            lastSearchQueryRef.current = '';
            return;
        }

        // If in AI mode, don't search (parent results should be empty)
        if (isAiMode) return;

        // Show local results immediately (no debounce)
        const localResults = performLocalSearch(query);
        if (onSearchChange) {
            onSearchChange(query, localResults, true, query.length >= 4);
        }

        // Only trigger semantic search for longer queries with longer debounce
        if (query.length >= 4) {
            setIsLoading(true);
            
            // 500ms debounce for semantic search (reduces API calls)
            debounceTimerRef.current = setTimeout(async () => {
                const semanticResults = await performSemanticSearch(query);
                
                if (semanticResults.length > 0) {
                    // Merge: semantic first, then local matches not in semantic
                    const semanticIds = new Set(semanticResults.map(r => r.id));
                    const additionalLocal = localResults.filter(item => !semanticIds.has(item.id));
                    const combinedResults = [...semanticResults, ...additionalLocal];
                    
                    if (onSearchChange) {
                        onSearchChange(query, combinedResults, true, false);
                    }
                } else {
                    // Keep local results
                    if (onSearchChange) {
                        onSearchChange(query, localResults, true, false);
                    }
                }
                setIsLoading(false);
            }, 500);
        }
    }, [isAiMode, performLocalSearch, performSemanticSearch, onSearchChange]);

    const toggleSearchMode = () => {
        const nextMode = !isAiMode;
        setIsAiMode(nextMode);
        
        // If switching TO DB mode, trigger search with existing query if any
        if (!nextMode && searchQuery.trim()) {
            // Trigger local search
            const localResults = performLocalSearch(searchQuery);
            if (onSearchChange) {
                onSearchChange(searchQuery, localResults, true, searchQuery.length >= 4);
            }
            // Reset "last query" ref to force re-fetch if needed
             lastSearchQueryRef.current = '';
        }

        // If switching TO AI mode, clear parent results (dashboard should show default view)
        // But keep the query in the input field
        if (nextMode) {
            if (onSearchChange) {
                onSearchChange('', [], false, false);
            }
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter') {
            if (isAiMode && searchQuery.trim()) {
                router.push(`/kai-ai?q=${encodeURIComponent(searchQuery.trim())}`);
            }
        }
        if (e.key === 'Escape') {
            handleClear();
            inputRef.current?.blur();
        }
    };

    const handleClear = () => {
        setSearchQuery('');
        if (debounceTimerRef.current) {
            clearTimeout(debounceTimerRef.current);
        }
        if (abortControllerRef.current) {
            abortControllerRef.current.abort();
        }
        if (onSearchChange) {
            onSearchChange('', [], false, false);
        }
        lastSearchQueryRef.current = '';
        inputRef.current?.focus();
    };

    return (
        <div className="sticky top-4 z-50 px-4 md:px-8 lg:px-10 py-4 lg:py-6 w-full flex items-center gap-4 pointer-events-none mt-4 lg:mt-10 h-10 lg:h-12 mb-4">
            {/* Search Input Container */}
            <div className="pointer-events-auto flex-1 rounded-full flex items-center shadow-2xl relative h-10 lg:h-12 bg-[#09090b]/90 backdrop-blur-xl border border-white/10 ring-1 ring-white/5 transition-all duration-300">
                {/* Toggle Switch */}
                <div
                    onClick={toggleSearchMode}
                    className="cursor-pointer bg-black rounded-full p-0.5 flex items-center h-full w-24 lg:w-30 mr-3 border border-white/10 shrink-0 relative select-none"
                >
                    <div
                        className={`absolute left-0.5 w-[calc(50%-2px)] h-[calc(100%-4px)] bg-[#4b2976] rounded-full transition-transform duration-300 shadow-sm ${isAiMode ? 'translate-x-full' : 'translate-x-0'}`}
                    />
                    <div className={`relative z-10 flex-1 h-full flex items-center justify-center gap-1 text-[12px] font-bold transition-colors duration-300 ${!isAiMode ? 'text-white' : 'text-zinc-500'}`}>
                        DB
                    </div>
                    <div className={`relative z-10 flex-1 h-full flex items-center justify-center gap-1 text-[12px] font-bold transition-colors duration-300 ${isAiMode ? 'text-white' : 'text-zinc-500'}`}>
                        AI
                    </div>
                </div>

                {/* Search Icon / Loading Spinner */}
                {isLoading ? (
                    <Spinner size={12} className="text-purple-400 mr-3 animate-spin" />
                ) : isAiMode ? (
                    <Sparkle size={12} weight="fill" className="text-zinc-500 mr-3 transition-all duration-300" />
                ) : (
                    <MagnifyingGlass size={12} weight="fill" className="text-zinc-500 mr-3 transition-all duration-300" />
                )}

                {/* Search Input */}
                <input
                    ref={inputRef}
                    type="text"
                    value={searchQuery}
                    onChange={(e) => handleSearchChange(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder={isAiMode ? "Ask Kai AI anything... (Press Enter)" : "Search in Database..."}
                    className="bg-transparent w-full h-full outline-none text-white placeholder-zinc-500 text-[12px]"
                    onFocus={() => setIsSearchFocused(true)}
                    onBlur={() => setIsSearchFocused(false)}
                />

                {/* Clear button */}
                {searchQuery && (
                    <button
                        onClick={handleClear}
                        className="mr-3 p-1 rounded-full hover:bg-white/10 transition-colors"
                    >
                        <X size={12} className="text-zinc-500" />
                    </button>
                )}
            </div>

            {/* Add Button */}
            <button
                onClick={onOpenAddModal}
                className="pointer-events-auto h-10 lg:h-12 px-4 lg:px-5 rounded-full flex items-center justify-center transition-all duration-300 shadow-lg border border-[#9f63fe]/20 bg-[#4b2976] text-white hover:bg-[#4b2976] hover:border-[#4b2976] hover:shadow-[0_0_15px_rgba(159,85,255,0.3)] overflow-hidden cursor-pointer"
            >
                <Plus size={16} weight="bold" className="shrink-0" />
                <span className={`font-medium text-xs whitespace-nowrap transition-all duration-300 overflow-hidden ${isSearchFocused ? 'opacity-0 max-w-0 ml-0' : 'opacity-100 max-w-[50px] ml-2'}`}>
                    Add
                </span>
            </button>
        </div>
    );
}
