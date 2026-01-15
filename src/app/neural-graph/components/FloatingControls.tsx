'use client';

import React from 'react';
import { Sparkle, Plus } from '@phosphor-icons/react';

interface FloatingControlsProps {
    floatingRef: React.RefObject<HTMLDivElement | null>;
    inputValue: string;
    onInputChange: (value: string) => void;
    onInputKeyDown: (e: React.KeyboardEvent<HTMLInputElement>) => void;
    onOpenAddModal: () => void;
}

export default function FloatingControls({
    floatingRef,
    inputValue,
    onInputChange,
    onInputKeyDown,
    onOpenAddModal
}: FloatingControlsProps) {
    return (
        <div ref={floatingRef} id="floating-controls" className="flex items-center justify-center gap-3 pointer-events-auto">
            <div className="floating-bar h-12 rounded-full flex items-center pl-4 pr-6 w-full flex-1 group">
                <Sparkle weight="fill" className="text-zinc-500 text-lg group-hover:text-[#A78BFA] transition-colors" />
                <input
                    id="global-ai-input"
                    type="text"
                    value={inputValue}
                    onChange={(e) => onInputChange(e.target.value)}
                    onKeyDown={onInputKeyDown}
                    placeholder="Ask Kai AI anything..."
                    className="bg-transparent border-none outline-none text-sm text-zinc-200 placeholder-zinc-500 ml-2 w-full h-full font-medium"
                />
            </div>
            <button 
                onClick={onOpenAddModal}
                className="add-btn h-12 px-6 bg-white hover:bg-zinc-200 text-black rounded-full font-bold text-sm flex items-center gap-2 shadow-[0_0_20px_rgba(255,255,255,0.15)] transition shrink-0"
            >
                <Plus weight="bold" className="text-lg" />
                <span className="hidden sm:inline">Add</span>
            </button>
        </div>
    );
}
