'use client';

import React from 'react';
import NanobotSphere from './NanobotSphere';
import { X } from '@phosphor-icons/react';
import { useChat, ChatMessage } from '@/contexts/ChatContext';

interface NeuralRightPanelProps {
    rightPanelRef: React.RefObject<HTMLDivElement | null>;
    miniGraphRef: React.RefObject<SVGSVGElement | null>;
    onResetCamera: () => void;
}

export default function NeuralRightPanel({
    rightPanelRef,
    onResetCamera
}: Omit<NeuralRightPanelProps, 'miniGraphRef'>) {
    const { messages: chatMessages, isSending } = useChat();

    return (
        <aside
            ref={rightPanelRef}
            id="right-panel"
            className="absolute top-0 bottom-0 right-0 w-80 sidebar-panel right-panel flex flex-col shadow-2xl border-l border-zinc-800 bg-black pb-14"
        >
            {/* Close Button */}
            <button
                onClick={onResetCamera}
                className="absolute top-4 right-4 z-20 w-6 h-6 rounded-full bg-zinc-900 border border-zinc-800 text-zinc-500 hover:text-white hover:border-zinc-700 flex items-center justify-center transition"
                title="Close"
            >
                <X weight="bold" className="text-xs" />
            </button>

            <div className="flex-1 flex flex-col p-0 pt-14 overflow-hidden bg-black relative">
                <div className="w-full h-40 relative shrink-0 flex items-center justify-center bg-gradient-to-b from-black to-zinc-900/10">
                    <NanobotSphere className="w-full h-full object-cover opacity-90" />
                </div>
                <div className="flex-1 overflow-y-auto space-y-4 p-5 pt-0 pb-4" id="chat-history">
                    {chatMessages.length === 0 && (
                        <div className="flex gap-3 fade-in">
                            <div className="my-10 w-8 h-8 rounded-full bg-zinc-900 flex items-center justify-center shrink-0 text-xs text-white border border-zinc-800">
                                K
                            </div>
                            <div className="my-10 bg-zinc-900 p-3 rounded-2xl rounded-tl-none text-xs text-zinc-400 leading-relaxed shadow-sm">
                                Neural interface active. Click a node to analyze its connections.
                            </div>
                        </div>
                    )}
                    {chatMessages.map((msg, idx) => (
                        <div key={msg.id || idx} className="flex gap-3 fade-in">
                            {msg.role === 'assistant' ? (
                                <>
                                    <div className="w-8 h-8 rounded-full bg-zinc-900 flex items-center justify-center shrink-0 text-xs text-white border border-zinc-800">
                                        K
                                    </div>
                                    <div className="bg-zinc-900 p-3 rounded-2xl rounded-tl-none text-xs text-zinc-400 leading-relaxed shadow-sm">
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
                        <div className="flex gap-3 fade-in">
                            <div className="w-8 h-8 rounded-full bg-zinc-900 flex items-center justify-center shrink-0 text-xs text-white border border-zinc-800">
                                K
                            </div>
                            <div className="bg-zinc-900 p-3 rounded-2xl rounded-tl-none text-xs text-zinc-500">
                                <span className="animate-pulse">...</span>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </aside>
    );
}
