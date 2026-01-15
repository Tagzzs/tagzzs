'use client';

import React from 'react';

interface GraphNode {
    id: string | number;
    label?: string;
    type: 'root' | 'category' | 'sub' | 'content' | 'dust';
    x: number; y: number; z: number;
    radius: number;
    color: string;
    parent?: string | number;
    data?: { name: string; desc: string; image: string; content: string };
}

interface DetailViewLayerProps {
    detailLayerRef: React.RefObject<HTMLDivElement | null>;
    selectedNode: GraphNode | null;
    showSummary: boolean;
    onClose: () => void;
    onToggleSummary: () => void;
}

export default function DetailViewLayer({
    detailLayerRef,
    selectedNode,
    showSummary,
    onClose,
    onToggleSummary
}: DetailViewLayerProps) {
    return (
        <div
            ref={detailLayerRef}
            id="detail-view-layer"
            className="absolute z-45 bg-black/95 backdrop-blur-xl flex flex-col overflow-y-auto"
        >
            <div className="w-full max-w-5xl mx-auto flex flex-col gap-8 pt-16 px-8 pb-32">
                <div className="flex items-center gap-4 mb-4">
                    <button
                        onClick={onClose}
                        className="text-zinc-500 hover:text-white flex items-center gap-2 transition-colors text-xs font-bold uppercase tracking-wider group"
                    >
                        <i className="ph-bold ph-arrow-left group-hover:-translate-x-1 transition-transform"></i> Back to Graph
                    </button>
                </div>

                <div className="w-full h-80 rounded-2xl overflow-hidden relative shadow-2xl border border-zinc-800 group">
                    <img
                        id="detail-image"
                        src={selectedNode?.data?.image || "https://picsum.photos/seed/default/800/400"}
                        className="w-full h-full object-cover transition-transform duration-1000 group-hover:scale-105"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black via-black/20 to-transparent"></div>
                    <div className="absolute bottom-6 left-8">
                        <div className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest mb-2 border border-zinc-700 bg-black/50 backdrop-blur px-2 py-1 inline-block rounded">
                            TOPIC
                        </div>
                        <h1 className="text-5xl text-white font-bold tracking-tight shadow-black drop-shadow-lg">
                            {selectedNode?.label || 'Title'}
                        </h1>
                    </div>
                </div>

                <div>
                    <p className="text-zinc-400 text-lg border-l-2 border-zinc-800 pl-4 leading-relaxed">
                        {selectedNode?.data?.desc || 'Description'}
                    </p>
                </div>

                <div className="bg-[#09090b] border border-zinc-800 rounded-xl overflow-hidden shadow-2xl min-h-[300px] flex flex-col">
                    <div className="bg-[#18181b] border-b border-zinc-800 px-6 py-3 flex justify-between items-center">
                        <span className="text-[10px] font-bold text-zinc-500 tracking-widest flex items-center gap-2 uppercase">
                            <i className="ph-fill ph-file-text"></i> Documentation
                        </span>
                    </div>
                    <div className="p-8 text-base text-zinc-300 font-mono whitespace-pre-wrap leading-relaxed">
                        {selectedNode?.data?.content || ''}
                    </div>
                </div>

                {/* Action Buttons Grid */}
                <div className="grid grid-cols-4 gap-4 h-24">
                    <button
                        onClick={onToggleSummary}
                        className="bg-[#121212] hover:bg-zinc-800 border border-zinc-800 rounded-xl flex flex-col items-center justify-center gap-2 transition group hover:border-zinc-700"
                    >
                        <i className="ph-bold ph-text-aa text-2xl text-zinc-600 group-hover:text-white transition-colors"></i>
                        <span className="text-xs font-bold text-zinc-500 group-hover:text-white">Summary</span>
                    </button>
                    <button className="bg-[#121212] hover:bg-zinc-800 border border-zinc-800 rounded-xl flex flex-col items-center justify-center gap-2 transition group hover:border-zinc-700">
                        <i className="ph-bold ph-cards text-2xl text-zinc-600 group-hover:text-white transition-colors"></i>
                        <span className="text-xs font-bold text-zinc-500 group-hover:text-white">Flashcards</span>
                    </button>
                    <button className="bg-[#121212] hover:bg-zinc-800 border border-zinc-800 rounded-xl flex flex-col items-center justify-center gap-2 transition group hover:border-zinc-700">
                        <i className="ph-bold ph-bell text-2xl text-zinc-600 group-hover:text-white transition-colors"></i>
                        <span className="text-xs font-bold text-zinc-500 group-hover:text-white">Reminders</span>
                    </button>
                    <button className="bg-white hover:bg-zinc-200 text-black border border-white rounded-xl flex flex-col items-center justify-center gap-2 transition shadow-lg shadow-white/5">
                        <i className="ph-bold ph-lightning text-2xl"></i>
                        <span className="text-xs font-bold">CTA</span>
                    </button>
                </div>

                {/* AI Summary Section */}
                {showSummary && (
                    <div className="flex flex-col gap-3 bg-zinc-900/30 border border-zinc-800/50 rounded-xl p-6 fade-in mt-2">
                        <div className="flex items-center gap-2 mb-2">
                            <div className="w-1.5 h-1.5 rounded-full bg-indigo-500 shadow-[0_0_8px_rgba(99,102,241,0.6)]"></div>
                            <h3 className="text-sm font-bold text-white tracking-wide">AI SUMMARY</h3>
                        </div>
                        <p className="text-zinc-400 text-sm leading-relaxed">
                            <span className="text-white font-semibold">Key Insight:</span> This node represents a critical cluster in the{' '}
                            <span className="text-zinc-300">{selectedNode?.label || 'Topic'}</span> domain.
                            <br /><br />
                            {selectedNode?.data?.desc}
                            <br /><br />
                            <span className="italic opacity-70">Analysis complete. Connection strength: Strong.</span>
                        </p>
                    </div>
                )}
            </div>
        </div>
    );
}
