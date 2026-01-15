'use client';

import React, { useState } from 'react';
import { Paperclip, ArrowRight } from '@phosphor-icons/react';
import ParticleOrb from './ParticleOrb';


interface StartViewProps {
    currentMode: 'quick' | 'smart' | 'deep';
    modeRef: React.MutableRefObject<'quick' | 'smart' | 'deep'>;
    isModeChangeActiveRef: React.MutableRefObject<boolean>;
    rotationSpeedRef: React.MutableRefObject<number>;
    onSetMode: (mode: 'quick' | 'smart' | 'deep') => void;
    onToggleUpload: () => void;
    onTransitionToChat: (initialMessage?: string) => void;
}

export default function StartView({
    currentMode,
    modeRef,
    isModeChangeActiveRef,
    rotationSpeedRef,
    onSetMode,
    onToggleUpload,
    onTransitionToChat
}: StartViewProps) {
    const [input, setInput] = useState('');

    const handleStart = () => {
        if (!input.trim()) return;
        onTransitionToChat(input);
    };

    return (
        <div id="start-view" className="flex-1 flex flex-col items-center justify-center relative z-10 transition-all duration-500 pb-20">
            <div className="mb-10 relative">
                <ParticleOrb
                    currentMode={currentMode}
                    modeRef={modeRef}
                    isModeChangeActiveRef={isModeChangeActiveRef}
                    rotationSpeedRef={rotationSpeedRef}
                />
            </div>

            <div className="w-full max-w-2xl px-4 mb-10">
                <div className="hero-input rounded-full h-14 flex items-center px-2">
                    <button onClick={onToggleUpload} className="h-10 w-10 rounded-full flex items-center justify-center text-zinc-500 hover:text-zinc-300 ml-1 transition-colors">
                        <Paperclip weight="bold" className="text-lg" />
                    </button>
                    <input
                        type="text"
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        placeholder="Ask a question..."
                        className="flex-1 bg-transparent h-full outline-none text-zinc-200 placeholder-zinc-600 px-2 font-light border-none focus:ring-0"
                        onKeyDown={(e) => {
                            if (e.key === 'Enter') handleStart();
                        }}
                    />
                    <div className="flex items-center gap-2 mr-2">
                        <button
                            onClick={handleStart}
                            disabled={!input.trim()}
                            className="h-9 w-9 rounded-full bg-zinc-200 hover:bg-[#A78BFA] text-black flex items-center justify-center transition-transform active:scale-95 shadow-[0_0_15px_rgba(255,255,255,0.1)] disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            <ArrowRight weight="bold" />
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
