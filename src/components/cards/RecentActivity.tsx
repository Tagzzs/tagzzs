'use client';

import { ContentItem } from '@/types';
import { Tag } from '@/hooks/useTags';
import ActivityCard from './ActivityCard';

interface RecentActivityProps {
    content: ContentItem[];
    tagsMap: Map<string, Tag>;
    filterLabel: string;
    loading?: boolean;
    onResetFilter: () => void;
    onCardClick: (id: string) => void;
    title?: string;
}

export default function RecentActivity({ 
    content, 
    tagsMap, 
    filterLabel, 
    loading = false,
    onResetFilter, 
    onCardClick,
    title = "Recent Activity"
}: RecentActivityProps) {
    // Helper to get tags for a content item
    const getTagsForContent = (item: ContentItem): Tag[] => {
        return item.tagsId
            .map(id => tagsMap.get(id))
            .filter((tag): tag is Tag => tag !== undefined);
    };

    return (
        <div className="glass-panel bg-[#050505] p-5 mt-7 flex flex-col flex-1">
            <div className="flex justify-between items-center mb-5">
                <h3 className="text-[14px] font-bold text-zinc-500 uppercase tracking-widest">
                    <span className="text-gradient">{title}</span>
                </h3>
                <div
                    onClick={onResetFilter}
                    className={`text-[14px] bg-white/5 px-2.5 py-0.5 rounded-full border border-white/5 cursor-pointer hover:bg-white/10 transition-colors ${filterLabel === 'Filter: All' ? 'text-zinc-500' : 'text-white'
                        }`}
                >
                    {filterLabel}
                </div>
            </div>

            <div className="grid grid-cols-1 mt-4 md:grid-cols-2 xl:grid-cols-3 gap-6 flex-1">
                {loading ? (
                    // Loading skeleton
                    <>
                        {[1, 2, 3, 4, 5, 6].map((i) => (
                            <div 
                                key={i}
                                className="aspect-square bg-[#0a0a0a] rounded-xl overflow-hidden border border-white/5 animate-pulse"
                            >
                                <div className="h-[55%] w-full bg-zinc-800/50" />
                                <div className="p-3 space-y-2">
                                    <div className="h-4 bg-zinc-800/50 rounded w-3/4" />
                                    <div className="h-3 bg-zinc-800/30 rounded w-1/2" />
                                </div>
                            </div>
                        ))}
                    </>
                ) : content.length === 0 ? (
                    // Empty state
                    <div className="col-span-full h-64 flex flex-col items-center justify-center text-center">
                        <div className="w-16 h-16 mb-4 rounded-full bg-zinc-800/50 flex items-center justify-center">
                            <svg className="w-8 h-8 text-zinc-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                            </svg>
                        </div>
                        <p className="text-zinc-500 text-sm mb-1">No content yet</p>
                        <p className="text-zinc-600 text-xs">Add your first item to get started</p>
                    </div>
                ) : (
                    // Content cards
                    content.map((item) => (
                        <ActivityCard
                            key={item.id}
                            content={item}
                            tags={getTagsForContent(item)}
                            onClick={() => onCardClick(item.id)}
                        />
                    ))
                )}
            </div>
        </div>
    );
}
