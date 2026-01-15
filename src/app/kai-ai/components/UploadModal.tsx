'use client';

import React from 'react';
import { X, UploadSimple } from '@phosphor-icons/react';

interface UploadModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export default function UploadModal({
    isOpen,
    onClose
}: UploadModalProps) {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-60 flex items-center justify-center fade-in">
            <div className="bg-[#121212] border border-[#27272a] rounded-2xl p-6 w-[400px] animate-in zoom-in-95 duration-200">
                <div className="flex justify-between items-center mb-4">
                    <h3 className="text-zinc-200 font-semibold text-sm">Upload Files</h3>
                    <button onClick={onClose} className="text-zinc-500 hover:text-white"><X weight="bold" /></button>
                </div>
                <div className="border-2 border-dashed border-zinc-800 rounded-xl h-32 flex flex-col items-center justify-center mb-4 hover:border-[#D8CEF0]/50 transition-colors cursor-pointer group">
                    <UploadSimple weight="bold" className="text-zinc-600 group-hover:text-[#D8CEF0] text-2xl mb-2 transition-colors" />
                    <span className="text-xs text-zinc-500 group-hover:text-zinc-300">Drop files or click to browse</span>
                </div>
                <div className="flex justify-end gap-2">
                    <button onClick={onClose} className="px-4 py-2 rounded-lg text-xs text-zinc-400 hover:text-white">Cancel</button>
                    <button onClick={onClose} className="px-4 py-2 rounded-lg bg-zinc-200 hover:bg-[#A78BFA] text-black text-xs font-semibold transition-colors">Upload</button>
                </div>
            </div>
        </div>
    );
}
