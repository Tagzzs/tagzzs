'use client';

import { memo, useRef, useState } from 'react';
import { CaretRight } from '@phosphor-icons/react';

interface TreeNode {
    name: string;
    children: {
        name: string;
        items: any[];
    }[];
}

interface KanbanViewProps {
    treeData: TreeNode[];
    kanbanExpandedCats: Set<string>;
    kanbanExpandedSubs: Set<string>;
    onToggleKanbanCat: (name: string) => void;
    onToggleKanbanSub: (id: string) => void;
    onUpdateView: (name: string) => void;
    onSelectItem: (item: any) => void;
}

function KanbanView({
    treeData,
    kanbanExpandedCats,
    kanbanExpandedSubs,
    onToggleKanbanCat,
    onToggleKanbanSub,
    onUpdateView,
    onSelectItem
}: KanbanViewProps) {
    const containerRef = useRef<HTMLDivElement>(null);
    const [isOverColumn, setIsOverColumn] = useState(false);

    // Handle horizontal scroll with mouse wheel when not over column content
    const handleWheel = (e: React.WheelEvent) => {
        if (!isOverColumn && containerRef.current) {
            e.preventDefault();
            containerRef.current.scrollLeft += e.deltaY;
        }
    };

    return (
        <div
            ref={containerRef}
            className="flex h-full gap-4 md:gap-6 overflow-x-auto px-4 md:px-10 pb-32 items-start db-scroll snap-x"
            onWheel={handleWheel}
        >
            {treeData.map(cat => {
                const isCatExpanded = kanbanExpandedCats.has(cat.name);
                return (
                    <div key={cat.name} className="min-w-[85vw] sm:min-w-[280px] md:min-w-[320px] w-[85vw] sm:w-[280px] md:w-[320px] shrink-0 flex flex-col h-full max-h-full bg-zinc-900/20 border border-zinc-800/50 rounded-xl snap-start">
                        <div className="p-4 border-b border-zinc-800/50 flex justify-between items-center bg-zinc-900/80 rounded-t-xl sticky top-0 backdrop-blur-sm z-10 select-none">
                            <div onClick={() => onUpdateView(cat.name)} className="flex items-center gap-3 cursor-pointer group hover:opacity-80 transition-opacity">
                                <div className="dot-base dot-grey shrink-0"></div>
                                <h3 className="text-sm font-bold text-white group-hover:text-zinc-300 transition-colors">{cat.name}</h3>
                            </div>
                            <div onClick={(e) => { e.stopPropagation(); onToggleKanbanCat(cat.name); }} className="p-1 rounded hover:bg-zinc-800 cursor-pointer text-zinc-500 hover:text-white transition-colors">
                                <CaretRight weight="bold" className={`text-xs arrow-icon ${isCatExpanded ? 'open' : ''}`} />
                            </div>
                        </div>
                        <div
                            className={`flex-1 overflow-y-auto p-3 db-scroll transition-all ${isCatExpanded ? '' : 'hidden'}`}
                            onMouseEnter={() => setIsOverColumn(true)}
                            onMouseLeave={() => setIsOverColumn(false)}
                        >
                            {cat.children.map(sub => {
                                const subId = `${cat.name}-${sub.name}`;
                                const isSubExpanded = kanbanExpandedSubs.has(subId);
                                const hasSubName = sub.name && sub.name.trim() !== '';
                                
                                return (
                                    <div key={sub.name || 'direct'} className="mb-4">
                                        {/* Only show subcategory header if name is not empty */}
                                        {hasSubName && (
                                            <div className="flex items-center justify-between py-2 px-2 rounded hover:bg-zinc-800/50 group transition-colors select-none mb-1">
                                                <div onClick={() => onUpdateView(cat.name)} className="flex items-center gap-3 cursor-pointer hover:opacity-80">
                                                    <div className="dot-base dot-blue shrink-0"></div>
                                                    <span className="text-xs font-bold text-zinc-400 group-hover:text-zinc-200 transition-colors">{sub.name}</span>
                                                </div>
                                                <div onClick={(e) => { e.stopPropagation(); onToggleKanbanSub(subId); }} className="p-1 rounded hover:bg-zinc-700/50 cursor-pointer text-zinc-600 hover:text-zinc-400">
                                                    <CaretRight weight="bold" className={`text-[10px] arrow-icon ${isSubExpanded ? 'open' : ''}`} />
                                                </div>
                                            </div>
                                        )}
                                        {/* Show items: always show if no subcategory name, otherwise respect expansion state */}
                                        {(!hasSubName || isSubExpanded) && (
                                            <div className={`flex flex-col gap-2 ${hasSubName ? 'pl-4 border-l border-zinc-800/50 ml-1.5' : ''}`}>
                                                {sub.items.length === 0 ? <div className="text-[10px] text-zinc-700 italic pl-4 py-1">No items</div> :
                                                    sub.items.map((item: any) => (
                                                        <div key={item.id} onClick={(e) => { e.stopPropagation(); onSelectItem(item); }} className="flex items-start gap-3 p-3 rounded-lg bg-[#121212] border border-zinc-800 hover:bg-zinc-800 hover:border-zinc-700 cursor-pointer group transition-all mb-2 shadow-sm">
                                                            <div className="pt-1.5 shrink-0"><div className="dot-base dot-neon"></div></div>
                                                            <div className="flex-1 min-w-0">
                                                                <h4 className="text-xs font-bold text-zinc-300 group-hover:text-white truncate transition-colors leading-tight mb-0.5">{item.title}</h4>
                                                                <p className="text-[10px] text-zinc-600 line-clamp-2 leading-relaxed">{item.description || item.desc}</p>
                                                            </div>
                                                        </div>
                                                    ))
                                                }
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                );
            })}
        </div>
    );
}

export default memo(KanbanView);
