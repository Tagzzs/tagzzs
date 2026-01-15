'use client';

import React from 'react';
import { Sparkle, Brain } from '@phosphor-icons/react';

interface HistorySidebarProps {
    isHistoryOpen: boolean;
    onNewChat: () => void;
}

export default function HistorySidebar({
    isHistoryOpen,
    onNewChat
}: HistorySidebarProps) {
    return (
        <aside
            id="history-sidebar"
            className={`history-sidebar-transition h-full flex flex-col bg-[#0a0a0a] shrink-0 z-30 overflow-hidden
             ${isHistoryOpen ? 'w-64 border-r border-[#27272a]' : 'w-0 history-collapsed border-none'}`}
        >
            <div className="p-4 pt-5 shrink-0 min-w-[16rem]">
                <div
                    onClick={onNewChat}
                    className="cursor-pointer group flex items-center gap-3 bg-[#121212] hover:bg-[#181818] border border-[#27272a] hover:border-zinc-600 text-zinc-400 transition-all rounded-full p-3 shadow-md"
                >
                    <Sparkle weight="bold" className="text-[#D8CEF0] text-lg" />
                    <span className="sidebar-text text-sm font-medium text-zinc-300 group-hover:text-white">New Chat</span>
                </div>
            </div>
            <div className="flex-1 overflow-y-auto px-3 pb-4 min-w-[16rem]">
                <div className="mb-6">
                    <h3 className="sidebar-text px-3 mb-2 text-[10px] font-bold text-zinc-600 uppercase tracking-widest">Recent</h3>
                    <div className="flex flex-col gap-1">
                        <button className="flex items-center gap-3 w-full text-left px-3 py-2 rounded-lg bg-white/5 border border-white/5 text-sm text-zinc-200 relative group overflow-hidden">
                            <Brain weight="regular" className="shrink-0 text-[#6D6780] group-hover:text-[#D8CEF0]" />
                            <span className="sidebar-text truncate text-xs text-zinc-300 group-hover:text-white">Productivity Trends</span>
                        </button>
                        <button className="flex items-center gap-3 w-full text-left px-3 py-2 rounded-lg hover:bg-white/5 border border-transparent hover:border-white/5 text-sm text-zinc-500 hover:text-zinc-200 transition-all group overflow-hidden">
                            <Brain weight="regular" className="shrink-0" />
                            <span className="sidebar-text truncate text-xs">Schema Generation SQL</span>
                        </button>
                    </div>
                </div>
            </div>
        </aside>
    );
}
