'use client';

import React from 'react';
import { List } from '@phosphor-icons/react';

interface TreeNode {
    name: string;
    children: {
        name: string;
        items: any[];
    }[];
}

interface DatabaseHeaderProps {
    onToggleSidebar: () => void;
    currentFilter: string;
    currentDetailItem: any | null;
    allItemsCount: number;
    treeData: TreeNode[];
}

export default function DatabaseHeader({
    onToggleSidebar,
    currentFilter,
    currentDetailItem,
    allItemsCount,
    treeData
}: DatabaseHeaderProps) {
    return (
        <>
            <header className="h-12 md:h-12 flex items-center px-4 md:px-8 bg-black z-10 shrink-0">
                <button onClick={onToggleSidebar} className="text-zinc-500 hover:text-white transition-colors">
                    <List weight="bold" className="text-xl" />
                </button>
            </header>

            <div className="px-4 md:px-8 py-2 flex flex-col justify-end shrink-0">
                <h2 className="text-2xl md:text-3xl text-white font-bold flex items-center gap-3 tracking-tight mb-1">
                    {currentDetailItem ? currentDetailItem.subCategory : (currentFilter === 'All' ? 'Knowledge Base' : currentFilter)}
                </h2>
                <div className="text-xs text-zinc-500 font-medium flex items-center gap-2">
                    {currentDetailItem ? '' : (currentFilter === 'All' ? `${allItemsCount} Total Items` : `${treeData.find(c => c.name === currentFilter)?.children.reduce((acc, s) => acc + s.items.length, 0)} items across ${treeData.find(c => c.name === currentFilter)?.children.length} subcategories`)}
                </div>
            </div>
        </>
    );
}
