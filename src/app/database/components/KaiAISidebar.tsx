'use client';

import React, { useRef, useEffect } from 'react';
import { X, Plus, Sparkle } from '@phosphor-icons/react';
import NanobotSphere from '@/app/neural-graph/components/NanobotSphere';
import { useChat } from '@/contexts/ChatContext';
import { useAuth } from '@/contexts/AuthContext';

interface KaiAISidebarProps {
    isOpen: boolean;
    onClose: () => void;
}

export default function KaiAISidebar({ isOpen, onClose }: KaiAISidebarProps) {
    const { user } = useAuth();
    const { messages, sendMessage, isSending, newChat } = useChat();
    const [input, setInput] = React.useState('');
    const chatEndRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);

    // Auto-scroll to bottom
    useEffect(() => {
        chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    // Focus input when opened
    useEffect(() => {
        if (isOpen) {
            inputRef.current?.focus();
        }
    }, [isOpen]);

    const handleSend = async () => {
        const text = input.trim();
        if (!text || isSending) return;

        setInput('');
        await sendMessage(text);
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSend();
        }
    };

    const handleNewChat = () => {
        newChat();
    };

    if (!isOpen) return null;

    // Only show if user is authenticated
    if (!user) {
        return (
            <div className="fixed inset-0 z-[100]" onClick={onClose}>
                <div 
                    className="absolute right-0 top-0 bottom-0 w-80 bg-black border-l border-zinc-800 shadow-2xl flex flex-col items-center justify-center"
                    onClick={(e) => e.stopPropagation()}
                >
                    <p className="text-zinc-500 text-sm">Please sign in to use Kai AI</p>
                </div>
            </div>
        );
    }

    return (
        <div className="fixed inset-0 z-[100]" onClick={onClose}>
            <div 
                className="absolute right-0 top-0 bottom-0 w-80 bg-black border-l border-zinc-800 shadow-2xl flex flex-col"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Nanobot Sphere */}
                <div className="h-40 relative shrink-0 flex items-center justify-center bg-gradient-to-b from-black to-zinc-900/10">
                    <NanobotSphere className="w-full h-full object-cover opacity-90" />
                    {/* Close Button */}
                    <button
                        onClick={onClose}
                        className="absolute top-4 right-4 z-20 w-6 h-6 rounded-full bg-zinc-900 border border-zinc-800 text-zinc-500 hover:text-white hover:border-zinc-700 flex items-center justify-center transition"
                        title="Close"
                    >
                        <X weight="bold" className="text-xs" />
                    </button>
                    {/* New Chat Button */}
                    <button
                        onClick={handleNewChat}
                        className="absolute top-4 left-4 z-20 px-2 py-1 rounded-md bg-zinc-900 border border-zinc-800 text-zinc-500 hover:text-white hover:border-zinc-700 text-xs flex items-center gap-1 transition"
                        title="New Chat"
                    >
                        <Plus weight="bold" size={10} /> New
                    </button>
                </div>

                {/* Messages */}
                <div className="flex-1 overflow-y-auto p-4 space-y-4" id="kai-chat-history">
                    {messages.length === 0 && (
                        <div className="flex gap-3 fade-in">
                            <div className="w-8 h-8 rounded-full bg-zinc-900 flex items-center justify-center shrink-0 text-xs text-white border border-zinc-800">
                                K
                            </div>
                            <div className="bg-zinc-900 p-3 rounded-2xl rounded-tl-none text-xs text-zinc-400 leading-relaxed shadow-sm max-w-[85%]">
                                Neural interface active. How can I help you today?
                            </div>
                        </div>
                    )}
                    {messages.map((msg, idx) => (
                        <div key={msg.id || idx} className="flex gap-3 fade-in">
                            {msg.role === 'assistant' ? (
                                <>
                                    <div className="w-8 h-8 rounded-full bg-zinc-900 flex items-center justify-center shrink-0 text-xs text-white border border-zinc-800">
                                        K
                                    </div>
                                    <div className="bg-zinc-900 p-3 rounded-2xl rounded-tl-none text-xs text-zinc-400 leading-relaxed shadow-sm max-w-[85%]">
                                        {msg.content}
                                    </div>
                                </>
                            ) : (
                                <>
                                    <div className="bg-[#A78BFA]/10 border border-[#A78BFA]/20 p-3 rounded-2xl rounded-tr-none text-xs text-zinc-200 leading-relaxed shadow-sm ml-auto max-w-[80%]">
                                        {msg.content}
                                    </div>
                                    <div className="w-8 h-8 rounded-full bg-[#A78BFA]/20 flex items-center justify-center shrink-0 text-xs text-[#A78BFA] border border-[#A78BFA]/30">
                                        U
                                    </div>
                                </>
                            )}
                        </div>
                    ))}
                    {isSending && (
                        <div className="flex gap-3">
                            <div className="w-8 h-8 rounded-full bg-zinc-900 flex items-center justify-center shrink-0 text-xs text-white border border-zinc-800">
                                K
                            </div>
                            <div className="bg-zinc-900 p-3 rounded-2xl rounded-tl-none text-xs text-zinc-500">
                                <span className="animate-pulse">...</span>
                            </div>
                        </div>
                    )}
                    <div ref={chatEndRef} />
                </div>

                {/* Input Footer */}
                <div className="p-4 border-t border-zinc-800 shrink-0">
                    <div className="flex items-center gap-2">
                        <Sparkle weight="fill" className="text-zinc-500 shrink-0" />
                        <input
                            ref={inputRef}
                            type="text"
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            onKeyDown={handleKeyDown}
                            placeholder="Ask Kai AI anything..."
                            className="flex-1 bg-transparent text-sm text-white placeholder-zinc-500 outline-none"
                            disabled={isSending}
                        />
                        <button
                            onClick={handleSend}
                            disabled={isSending || !input.trim()}
                            className="flex items-center gap-1 px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 disabled:bg-zinc-900 disabled:text-zinc-600 text-white text-xs font-medium rounded-md transition-colors"
                        >
                            <Plus weight="bold" className="text-sm" /> Add
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
