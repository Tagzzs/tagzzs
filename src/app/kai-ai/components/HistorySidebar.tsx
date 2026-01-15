'use client';

import React, { useEffect } from 'react';
import { Sparkle, Brain, Trash, Spinner } from '@phosphor-icons/react';
import { useChat } from '@/contexts/ChatContext';

interface HistorySidebarProps {
    isHistoryOpen: boolean;
    onNewChat: () => void;
}

export default function HistorySidebar({
    isHistoryOpen,
    onNewChat
}: HistorySidebarProps) {
    const { chatList, loadChat, deleteChat, newChat, refreshChatList, isLoading } = useChat();

    // Refresh chat list when sidebar opens
    useEffect(() => {
        if (isHistoryOpen) {
            refreshChatList();
        }
    }, [isHistoryOpen, refreshChatList]);

    const handleNewChat = () => {
        newChat();
        onNewChat();
    };

    const handleLoadChat = (chatId: string) => {
        loadChat(chatId);
    };

    const handleDeleteChat = async (e: React.MouseEvent, chatId: string) => {
        e.stopPropagation();
        if (confirm('Delete this chat?')) {
            await deleteChat(chatId);
        }
    };

    return (
        <aside
            id="history-sidebar"
            className={`history-sidebar-transition h-full flex flex-col bg-[#0a0a0a] shrink-0 z-30 overflow-hidden
             ${isHistoryOpen ? 'w-64 border-r border-[#27272a]' : 'w-0 history-collapsed border-none'}`}
        >
            <div className="p-4 pt-5 shrink-0 min-w-[16rem]">
                <div
                    onClick={handleNewChat}
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
                        {isLoading ? (
                            <div className="flex items-center justify-center py-4">
                                <Spinner className="animate-spin text-zinc-500" />
                            </div>
                        ) : chatList.length === 0 ? (
                            <p className="text-xs text-zinc-600 px-3 py-2">No chats yet</p>
                        ) : (
                            chatList.map((chat) => (
                                <button
                                    key={chat.chatId}
                                    onClick={() => handleLoadChat(chat.chatId)}
                                    className="flex items-center gap-3 w-full text-left px-3 py-2 rounded-lg hover:bg-white/5 border border-transparent hover:border-white/5 text-sm text-zinc-500 hover:text-zinc-200 transition-all group overflow-hidden"
                                >
                                    <Brain weight="regular" className="shrink-0 group-hover:text-[#D8CEF0]" />
                                    <span className="sidebar-text truncate text-xs flex-1">{chat.title}</span>
                                    <Trash
                                        weight="regular"
                                        className="shrink-0 opacity-0 group-hover:opacity-100 text-zinc-600 hover:text-red-400 transition-all"
                                        onClick={(e) => handleDeleteChat(e, chat.chatId)}
                                    />
                                </button>
                            ))
                        )}
                    </div>
                </div>
            </div>
        </aside>
    );
}

