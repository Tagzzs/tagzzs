'use client';

import React from 'react';
import { List } from '@phosphor-icons/react';

interface KaiHeaderProps {
    onToggleHistory: () => void;
}

export default function KaiHeader({
    onToggleHistory
}: KaiHeaderProps) {
    return (
        <header className="h-16 shrink-0 flex items-center justify-between px-6 z-20">
            <div className="flex items-center gap-4">
                <button
                    onClick={onToggleHistory}
                    className="p-2 rounded-lg hover:bg-white/5 text-zinc-500 hover:text-zinc-200 transition-colors"
                    title="Toggle Chat History"
                >
                    <List weight="bold" className="text-lg" />
                </button>
                <span className="text-sm font-medium text-zinc-500">New Session</span>
            </div>
        </header>
    );
}
