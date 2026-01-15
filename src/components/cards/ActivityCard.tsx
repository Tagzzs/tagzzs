'use client';

import { memo } from 'react';
import Image from 'next/image';
import { ArrowRight } from '@phosphor-icons/react';
import { ContentItem } from '@/types';
import { Tag } from '@/hooks/useTags';

interface ActivityCardProps {
    content: ContentItem;
    tags?: Tag[];
    onClick: () => void;
}

// Format ISO date to readable format
function formatDate(isoDate: string): string {
    try {
        const date = new Date(isoDate);
        return date.toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric'
        });
    } catch {
        return '';
    }
}

// Generate color classes from hex color
function getTagColorFromHex(hexColor: string | undefined): string {
    if (!hexColor) {
        return 'bg-zinc-500/10 text-zinc-400 border border-zinc-500/20';
    }
    // Use the hex color directly with opacity
    return `border border-white/10`;
}

function ActivityCard({ content, tags = [], onClick }: ActivityCardProps) {
    // Get display image - use thumbnail or fallback
    const imageUrl = content.thumbnailUrl || `https://picsum.photos/seed/${content.id}/800/600`;
    
    return (
        <div
            onClick={onClick}
            className="aspect-square group bg-[#0a0a0a] rounded-xl overflow-hidden border border-white/5 hover:border-white/20 transition-all duration-300 hover:shadow-[0_0_20px_rgba(0,0,0,0.5)] cursor-pointer flex flex-col"
        >
            {/* Image Section */}
            <div className="h-[55%] w-full overflow-hidden relative shrink-0">
                <div className="absolute inset-0 bg-black/20 group-hover:bg-transparent transition-colors z-10" />
                <Image
                    src={imageUrl}
                    alt={content.title}
                    fill
                    className="object-cover transform group-hover:scale-105 transition-transform duration-500 opacity-90 group-hover:opacity-100"
                    unoptimized
                />
            </div>

            {/* Content Section */}
            <div className="flex-1 p-3 flex flex-col">
                <div className="mb-1">
                    <h4 className="text-sm md:text-base font-semibold text-white leading-tight group-hover:text-zinc-300 transition-colors line-clamp-2">
                        {content.title}
                    </h4>
                </div>
                
                {/* Tags */}
                <div className="flex flex-wrap gap-1 mb-2 overflow-hidden mt-auto">
                    {tags.slice(0, 2).map((tag) => (
                        <span
                            key={tag.id}
                            className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${getTagColorFromHex(tag.tagColor)}`}
                            style={{ 
                                backgroundColor: `${tag.tagColor}15`,
                                color: tag.tagColor 
                            }}
                        >
                            {tag.tagName}
                        </span>
                    ))}
                    {/* Show content type as fallback if no tags */}
                    {tags.length === 0 && content.contentType && (
                        <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-zinc-500/10 text-zinc-400 border border-zinc-500/20">
                            {content.contentType}
                        </span>
                    )}
                </div>

                {/* Footer */}
                <div className="flex items-center justify-between pt-2 border-t border-white/5">
                    <span className="text-[10px] text-zinc-600 font-medium">{formatDate(content.createdAt)}</span>
                    <div className="h-4 w-4 rounded-full bg-zinc-900 flex items-center justify-center text-zinc-500 group-hover:bg-white group-hover:text-black transition-colors shrink-0">
                        <ArrowRight size={8} weight="bold" />
                    </div>
                </div>
            </div>
        </div>
    );
}

export default memo(ActivityCard);
