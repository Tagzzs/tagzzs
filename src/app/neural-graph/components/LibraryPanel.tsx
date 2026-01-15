'use client';

import { memo } from 'react';
import { CaretRight } from '@phosphor-icons/react';

interface DeepDataItem {
    name: string;
    desc: string;
    image: string;
    content: string;
    contentId?: string;
}

interface SubCategory {
    name: string;
    tagId?: string;
    items: DeepDataItem[];
}

interface Category {
    name: string;
    tagId?: string;
    subs: SubCategory[];
}

interface GraphNode {
    id: string | number;
    label?: string;
    type: 'root' | 'category' | 'sub' | 'content' | 'dust';
    x: number; y: number; z: number;
    radius: number;
    color: string;
    parent?: string | number;
    data?: DeepDataItem;
}

interface LibraryPanelProps {
    leftPanelRef: React.RefObject<HTMLDivElement | null>;
    deepData: Category[];
    expandedGroups: Set<string>;
    selectedNode: GraphNode | null;
    nodesRef: React.RefObject<GraphNode[]>;
    onToggleGroup: (id: string) => void;
    onSelectNode: (node: GraphNode) => void;
}

function LibraryPanel({
    leftPanelRef,
    deepData,
    expandedGroups,
    selectedNode,
    nodesRef,
    onToggleGroup,
    onSelectNode
}: LibraryPanelProps) {
    return (
        <aside
            ref={leftPanelRef}
            id="left-panel"
            className="absolute top-0 bottom-0 left-0 w-64 sidebar-panel left-panel flex flex-col border-r border-zinc-800 bg-black pt-14"
        >
            <div className="p-4 pt-2">
                <h2 className="text-lg font-bold text-white mb-4 pl-1">Library</h2>
                <div id="file-tree" className="flex flex-col gap-1 select-none overflow-y-auto h-full pb-10">
                    {deepData.map((cat, i) => {
                        const catId = `cat-${i}`;
                        const isCatOpen = expandedGroups.has(catId);
                        return (
                            <div key={catId} className="tree-group lvl-cat">
                                <div className="tree-header">
                                    <div className="tree-arrow" style={{ transform: isCatOpen ? 'rotate(90deg)' : 'rotate(0deg)' }} onClick={(e) => { e.stopPropagation(); onToggleGroup(catId); }}>
                                        <CaretRight weight="fill" size={10} />
                                    </div>
                                    <span className="tree-label" onClick={(e) => {
                                        e.stopPropagation();
                                        const node = nodesRef.current?.find(n => n.label === cat.name && n.type === 'category');
                                        if (node) onSelectNode(node);
                                    }}>{cat.name}</span>
                                </div>
                                {isCatOpen && (
                                    <div className="tree-children open">
                                        {cat.subs.map((sub, j) => {
                                            const subId = `sub-${i}-${j}`;
                                            const isSubOpen = expandedGroups.has(subId);
                                            const hasSubName = sub.name && sub.name.trim() !== '';
                                            
                                            // If no subcategory name, show items directly
                                            if (!hasSubName) {
                                                return (
                                                    <div key={subId} className="tree-group">
                                                        {sub.items.map((item, k) => {
                                                            const isSelected = selectedNode?.label === item.name;
                                                            return (
                                                                <div
                                                                    key={item.name + k}
                                                                    className={`lvl-item ${isSelected ? 'active-item' : ''}`}
                                                                    onClick={(e) => {
                                                                        e.stopPropagation();
                                                                        const node = nodesRef.current?.find(n => n.label === item.name && n.type === 'content');
                                                                        if (node) onSelectNode(node);
                                                                    }}
                                                                >
                                                                    {item.name}
                                                                </div>
                                                            );
                                                        })}
                                                    </div>
                                                );
                                            }
                                            
                                            return (
                                                <div key={subId} className="tree-group lvl-sub">
                                                    <div className="tree-header">
                                                        <div className="tree-arrow" style={{ transform: isSubOpen ? 'rotate(90deg)' : 'rotate(0deg)' }} onClick={(e) => { e.stopPropagation(); onToggleGroup(subId); }}>
                                                            <CaretRight weight="fill" size={10} />
                                                        </div>
                                                        <span className="tree-label" onClick={(e) => {
                                                            e.stopPropagation();
                                                            const node = nodesRef.current?.find(n => n.label === sub.name && n.type === 'sub');
                                                            if (node) onSelectNode(node);
                                                        }}>{sub.name}</span>
                                                    </div>
                                                    {isSubOpen && (
                                                        <div className="tree-children open">
                                                            {sub.items.map((item, k) => {
                                                                const isSelected = selectedNode?.label === item.name;
                                                                return (
                                                                    <div
                                                                        key={item.name + k}
                                                                        className={`lvl-item ${isSelected ? 'active-item' : ''}`}
                                                                        onClick={(e) => {
                                                                            e.stopPropagation();
                                                                            const node = nodesRef.current?.find(n => n.label === item.name && n.type === 'content');
                                                                            if (node) onSelectNode(node);
                                                                        }}
                                                                    >
                                                                        {item.name}
                                                                    </div>
                                                                );
                                                            })}
                                                        </div>
                                                    )}
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            </div>
        </aside>
    );
}

export default memo(LibraryPanel);
