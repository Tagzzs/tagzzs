'use client';

import React, { useState } from 'react';
import {
    CaretLeft,
    CaretRight,
    FileText,
    Cards,
    Bell,
    Lightning,
    X,
    PencilSimple,
    Check
} from '@phosphor-icons/react';

interface DetailViewProps {
    currentDetailItem: any;
    allItems: any[];
    isEditing: boolean;
    aiSummaryVisible: boolean;
    aiSummaryText: string;
    onBack: () => void;
    onNavigate: (direction: number) => void;
    onToggleEditing: () => void;
    onToggleSummary: () => void;
}

export default function DetailView({
    currentDetailItem,
    allItems,
    isEditing,
    aiSummaryVisible,
    aiSummaryText,
    onBack,
    onNavigate,
    onToggleEditing,
    onToggleSummary
}: DetailViewProps) {
    const siblings = allItems.filter(i => i.category === currentDetailItem.category && i.subCategory === currentDetailItem.subCategory);
    const currentIndex = siblings.findIndex(i => i.id === currentDetailItem.id);

    // Preview modal state
    const [previewOpen, setPreviewOpen] = useState(false);
    const [previewSrc, setPreviewSrc] = useState('');
    const [previewType, setPreviewType] = useState<'image' | 'video' | 'file'>('image');

    // AI Summary edit state
    const [isSummaryEditing, setIsSummaryEditing] = useState(false);
    const [summaryContent, setSummaryContent] = useState('');

    // Notes toggle state
    const [isNotesOpen, setIsNotesOpen] = useState(false);

    // Handle opening preview
    const openPreview = (src: string) => {
        // Determine file type from extension
        const ext = src.split('.').pop()?.toLowerCase() || '';
        const videoExts = ['mp4', 'webm', 'ogg', 'mov', 'avi'];
        const imageExts = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'bmp'];

        if (videoExts.includes(ext)) {
            setPreviewType('video');
        } else if (imageExts.includes(ext)) {
            setPreviewType('image');
        } else {
            setPreviewType('file');
        }

        setPreviewSrc(src);
        setPreviewOpen(true);
    };

    // Get default summary content
    const getDefaultSummary = () => {
        return `Key Insight: This document covers the core architectural principles of ${currentDetailItem.title}.\n\nIt primarily focuses on implementation details and best practices. Based on the content length of ${currentDetailItem.content.length} characters, it serves as a technical reference rather than a tutorial.`;
    };

    // Initialize summary content if needed
    React.useEffect(() => {
        if (!summaryContent) {
            setSummaryContent(getDefaultSummary());
        }
    }, [currentDetailItem]);

    return (
        <>
            <div className="flex flex-col h-full p-0 overflow-y-auto db-scroll fade-in">
                <div className="w-full max-w-5xl mx-auto flex flex-col gap-8 pt-4 px-8 pb-32">
                    <div className="flex items-center justify-between sticky top-0 bg-black/95 backdrop-blur py-4 z-20 border-b border-zinc-900">
                        <button onClick={onBack} className="text-zinc-500 hover:text-white flex items-center gap-2 transition-colors text-xs font-bold uppercase tracking-wider group">
                            <CaretLeft weight="bold" className="group-hover:-translate-x-1 transition-transform" /> Back
                        </button>

                        <div className="flex items-center gap-3 bg-zinc-900/50 rounded-lg p-1 border border-zinc-800">
                            <button onClick={() => onNavigate(-1)} className="w-6 h-6 flex items-center justify-center rounded hover:bg-zinc-800 text-zinc-400 hover:text-white transition-colors">
                                <CaretLeft weight="bold" />
                            </button>
                            <span className="text-xs font-mono text-zinc-500 font-medium min-w-[40px] text-center select-none">
                                {currentIndex + 1} / {siblings.length}
                            </span>
                            <button onClick={() => onNavigate(1)} className="w-6 h-6 flex items-center justify-center rounded hover:bg-zinc-800 text-zinc-400 hover:text-white transition-colors">
                                <CaretRight weight="bold" />
                            </button>
                        </div>
                    </div>

                    {/* Clickable Image with Preview */}
                    <div
                        className="w-full h-80 rounded-2xl overflow-hidden relative shadow-2xl border border-zinc-800 group cursor-pointer"
                        onClick={() => openPreview(currentDetailItem.image)}
                    >
                        <img src={currentDetailItem.image} className="w-full h-full object-cover transition-transform duration-1000 group-hover:scale-105" alt="cover" />
                        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/20 to-transparent"></div>
                        <div className="absolute bottom-6 left-8">
                            <div className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest mb-2 border border-zinc-700 bg-black/50 backdrop-blur px-2 py-1 inline-block rounded">{currentDetailItem.category}</div>
                            <h1 className="text-5xl text-white font-bold tracking-tight shadow-black drop-shadow-lg">{currentDetailItem.title}</h1>
                        </div>
                        {/* Preview indicator */}
                        <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity bg-black/50 backdrop-blur px-3 py-1.5 rounded-full text-xs text-white font-medium">
                            Click to preview
                        </div>
                    </div>

                    {/* Description */}
                    {/* <div>
                        <p className="text-zinc-400 text-lg border-l-2 border-zinc-800 pl-4 leading-relaxed">{currentDetailItem.desc}</p>
                    </div> */}

                    {/* AI Summary Section - Always Visible */}
                    <div className="text-zinc-400 text-lg border-l-2 border-zinc-800 pl-4 leading-relaxed">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <div className="w-1.5 h-1.5 rounded-full mb-2 bg-indigo-500 shadow-[0_0_8px_rgba(99,102,241,0.6)]"></div>
                                <h3 className="text-sm font-bold text-white tracking-wide mb-2">AI SUMMARY</h3>
                            </div>
                            <button
                                onClick={() => {
                                    if (isSummaryEditing) {
                                        setIsSummaryEditing(false);
                                    } else {
                                        setIsSummaryEditing(true);
                                    }
                                }}
                                className={`flex items-center gap-1.5 text-xs font-bold transition-colors ${isSummaryEditing ? 'text-emerald-500 hover:text-emerald-400' : 'text-zinc-400 hover:text-white'}`}
                            >
                                {isSummaryEditing ? (
                                    <>
                                        <Check weight="bold" className="text-sm" />
                                        Save
                                    </>
                                ) : (
                                    <>
                                        <PencilSimple weight="bold" className="text-sm" />
                                        Edit
                                    </>
                                )}
                            </button>
                        </div>
                        {isSummaryEditing ? (
                            <textarea
                                value={summaryContent}
                                onChange={(e) => setSummaryContent(e.target.value)}
                                className="text-zinc-400 text-sm leading-relaxed bg-zinc-900/50 border border-zinc-800 rounded-lg p-4 min-h-[120px] outline-none focus:border-indigo-500/50 transition-colors resize-none"
                                placeholder="Enter AI summary..."
                            />
                        ) : (
                            <p className="text-zinc-400 text-sm leading-relaxed whitespace-pre-wrap">
                                {summaryContent}
                            </p>
                        )}
                    </div>

                    {isNotesOpen && (
                        <div className="bg-[#0a0a0a] border border-zinc-800 rounded-xl overflow-hidden shadow-2xl min-h-[400px] flex flex-col">
                            <div className="bg-[#0f0f0f] border-b border-zinc-800 px-6 py-3 flex justify-between items-center">
                                <span className="text-[10px] font-bold text-zinc-500 tracking-widest flex items-center gap-2 uppercase">
                                    <FileText weight="fill" /> Notes
                                </span>
                                <button
                                    className={`text-xs font-bold transition-colors ${isEditing ? 'text-emerald-500' : 'text-zinc-400 hover:text-white'}`}
                                    onClick={onToggleEditing}
                                >
                                    {isEditing ? 'Save' : 'Edit'}
                                </button>
                            </div>
                            <textarea
                                className="p-8 text-base text-zinc-300 font-mono whitespace-pre-wrap leading-relaxed outline-none flex-1 bg-transparent resize-none focus:bg-zinc-900/10 transition-colors"
                                defaultValue={currentDetailItem.content}
                                readOnly={!isEditing}
                            />
                        </div>
                    )}

                    <div className="grid grid-cols-4 gap-4 h-24">
                        <button 
                            onClick={() => setIsNotesOpen(!isNotesOpen)}
                            className={`bg-[#121212] hover:bg-zinc-800 border ${isNotesOpen ? 'border-zinc-500 bg-zinc-800' : 'border-zinc-800'} rounded-xl flex flex-col items-center justify-center gap-2 transition group hover:border-zinc-700`}
                        >
                            <FileText weight="bold" className={`text-2xl ${isNotesOpen ? 'text-white' : 'text-zinc-600'} group-hover:text-white transition-colors`} />
                            <span className={`text-xs font-bold ${isNotesOpen ? 'text-white' : 'text-zinc-500'} group-hover:text-white`}>Notes</span>
                        </button>
                        <button className="bg-[#121212] hover:bg-zinc-800 border border-zinc-800 rounded-xl flex flex-col items-center justify-center gap-2 transition group hover:border-zinc-700">
                            <Cards weight="bold" className="text-2xl text-zinc-600 group-hover:text-white transition-colors" />
                            <span className="text-xs font-bold text-zinc-500 group-hover:text-white">Flashcards</span>
                        </button>
                        <button className="bg-[#121212] hover:bg-zinc-800 border border-zinc-800 rounded-xl flex flex-col items-center justify-center gap-2 transition group hover:border-zinc-700">
                            <Bell weight="bold" className="text-2xl text-zinc-600 group-hover:text-white transition-colors" />
                            <span className="text-xs font-bold text-zinc-500 group-hover:text-white">Reminders</span>
                        </button>
                        <button className="bg-white hover:bg-zinc-200 text-black border border-white rounded-xl flex flex-col items-center justify-center gap-2 transition shadow-lg shadow-white/5">
                            <Lightning weight="bold" className="text-2xl" />
                            <span className="text-xs font-bold">CTA</span>
                        </button>
                    </div>
                </div>
            </div>

            {/* Preview Modal - Centered Popup */}
            {previewOpen && (
                <div
                    className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-8 fade-in"
                    onClick={() => setPreviewOpen(false)}
                >
                    {/* Preview Popup Container */}
                    <div
                        className="relative bg-zinc-900 border border-zinc-700 rounded-2xl overflow-hidden shadow-2xl w-[80vw] max-w-4xl h-[70vh] flex flex-col"
                        onClick={(e) => e.stopPropagation()}
                    >
                        {/* Header */}
                        <div className="flex items-center justify-between px-5 py-3 bg-zinc-800/50 border-b border-zinc-700 shrink-0">
                            <div className="flex items-center gap-3">
                                <FileText weight="fill" className="text-lg text-zinc-400" />
                                <span className="text-sm font-medium text-zinc-200 truncate max-w-[300px]">
                                    {currentDetailItem.title}
                                </span>
                                <span className="text-xs text-zinc-500 uppercase bg-zinc-800 px-2 py-0.5 rounded">
                                    {previewType}
                                </span>
                            </div>
                            <button
                                onClick={() => setPreviewOpen(false)}
                                className="w-8 h-8 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-400 hover:text-white flex items-center justify-center transition-colors"
                            >
                                <X weight="bold" className="text-base" />
                            </button>
                        </div>

                        {/* Content Area */}
                        <div className="flex-1 bg-black overflow-hidden">
                            {previewType === 'image' && (
                                <img
                                    src={previewSrc}
                                    alt="Preview"
                                    className="w-full h-full object-cover"
                                />
                            )}
                            {previewType === 'video' && (
                                <video
                                    src={previewSrc}
                                    controls
                                    autoPlay
                                    className="w-full h-full object-cover"
                                />
                            )}
                            {previewType === 'file' && (
                                <iframe
                                    src={previewSrc}
                                    className="w-full h-full bg-white"
                                    title="File Preview"
                                />
                            )}
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}
