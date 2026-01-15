'use client';

import React, { useState, useRef, useEffect } from 'react';
import { ArrowUp, Spinner } from '@phosphor-icons/react';
import { useChat } from '@/contexts/ChatContext';

interface ChatViewProps {
    currentMode: 'quick' | 'smart' | 'deep';
}

export default function ChatView({
    currentMode
}: ChatViewProps) {
    const { messages, sendMessage, isSending } = useChat();
    const [input, setInput] = useState('');
    const chatEndRef = useRef<HTMLDivElement>(null);

    // Auto-scroll to bottom
    useEffect(() => {
        chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    const handleSend = async () => {
        if (!input.trim() || isSending) return;
        const text = input.trim();
        setInput('');
        await sendMessage(text);
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSend();
        }
    };

    return (
        <div id="chat-view" className="flex-1 flex flex-col opacity-100 transition-opacity duration-500 h-full">
            <div id="chat-stream" className="flex-1 overflow-y-auto p-4 md:p-20 scroll-smooth">
                {/* Intro Message if empty */}
                {messages.length === 0 && (
                    <div className="flex gap-4 mb-6">
                        <div className="w-8 h-8 rounded-full bg-zinc-800 flex items-center justify-center text-xs text-zinc-400 shrink-0">K</div>
                        <div className="text-zinc-300 text-sm leading-relaxed max-w-2xl bg-zinc-900/50 p-4 rounded-2xl rounded-tl-none">
                            Hello! I'm Kai. I'm ready to help you with {currentMode === 'quick' ? 'quick answers' : currentMode === 'smart' ? 'complex analysis' : 'deep research'}.
                        </div>
                    </div>
                )}

                {/* Chat History */}
                {messages.map((msg, idx) => (
                    <div key={msg.id || idx} className={`flex gap-4 mb-6 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
                         {msg.role === 'assistant' ? (
                            <div className="w-8 h-8 rounded-full bg-zinc-800 flex items-center justify-center text-xs text-zinc-400 shrink-0">K</div>
                         ) : (
                            <div className="w-8 h-8 rounded-full bg-[#A78BFA]/20 flex items-center justify-center text-xs text-[#A78BFA] shrink-0 border border-[#A78BFA]/30">U</div>
                         )}
                        
                        <div className={`text-sm leading-relaxed max-w-2xl p-4 rounded-2xl shadow-sm ${
                            msg.role === 'assistant' 
                                ? 'bg-zinc-900 text-zinc-300 rounded-tl-none' 
                                : 'bg-[#A78BFA]/10 text-zinc-100 border border-[#A78BFA]/20 rounded-tr-none'
                        }`}>
                            {msg.content}
                        </div>
                    </div>
                ))}

                {/* Loading Indicator */}
                {isSending && (
                    <div className="flex gap-4 mb-6">
                        <div className="w-8 h-8 rounded-full bg-zinc-800 flex items-center justify-center text-xs text-zinc-400 shrink-0">K</div>
                        <div className="bg-zinc-900 p-4 rounded-2xl rounded-tl-none flex items-center gap-2">
                             <div className="flex gap-1">
                                <span className="w-1.5 h-1.5 bg-zinc-500 rounded-full animate-bounce [animation-delay:-0.3s]"></span>
                                <span className="w-1.5 h-1.5 bg-zinc-500 rounded-full animate-bounce [animation-delay:-0.15s]"></span>
                                <span className="w-1.5 h-1.5 bg-zinc-500 rounded-full animate-bounce"></span>
                            </div>
                        </div>
                    </div>
                )}
                <div ref={chatEndRef} />
            </div>

            {/* Input Area */}
            <div className="p-6 pb-8 bg-gradient-to-t from-black via-black to-transparent shrink-0">
                <div className="max-w-3xl mx-auto relative">
                    <div className={`bg-[#121212] rounded-full flex items-center border p-1.5 pl-4 transition-colors ${isSending ? 'border-zinc-800 opacity-50' : 'border-[#27272a] focus-within:border-[#D8CEF0]'}`}>
                        <input 
                            type="text" 
                            placeholder="Reply..." 
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            onKeyDown={handleKeyDown}
                            disabled={isSending}
                            className="flex-1 bg-transparent h-10 outline-none text-zinc-200 text-sm border-none focus:ring-0 placeholder-zinc-600" 
                        />
                        <button 
                            onClick={handleSend}
                            disabled={!input.trim() || isSending}
                            className="h-9 w-9 rounded-full bg-zinc-800 hover:bg-zinc-700 disabled:bg-zinc-900 disabled:text-zinc-600 text-zinc-400 flex items-center justify-center transition-colors"
                        >
                            {isSending ? <Spinner className="animate-spin" /> : <ArrowUp weight="bold" />}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
