'use client';

import React from 'react';
import { CornersOut } from '@phosphor-icons/react';

interface GraphCanvasContainerProps {
    containerRef: React.RefObject<HTMLDivElement | null>;
    canvasRef: React.RefObject<HTMLCanvasElement | null>;
    onResetCamera: () => void;
}

export default function GraphCanvasContainer({
    containerRef,
    canvasRef,
    onResetCamera
}: GraphCanvasContainerProps) {
    return (
        <div ref={containerRef} id="canvas-container" className="absolute inset-0 transition-opacity duration-500">
            <div className="absolute bottom-6 left-6 z-30 pointer-events-none" id="hud">
                <div className="flex items-center gap-2 mb-1">
                    <div className="w-1.5 h-1.5 rounded-full bg-[#A78BFA] animate-pulse"></div>
                    <span className="text-[10px] text-zinc-500 font-mono tracking-wide">SYSTEM ACTIVE</span>
                </div>
                <h2 className="text-sm text-zinc-400 font-mono" id="node-status">Orbiting View</h2>
            </div>
            <canvas ref={canvasRef} id="neural-canvas"></canvas>
            <div className="absolute bottom-24 right-6 z-30 flex flex-col gap-2" id="controls">
                <button
                    onClick={onResetCamera}
                    className="w-8 h-8 rounded bg-black/50 border border-zinc-800 text-zinc-400 hover:text-white hover:border-[#A78BFA] flex items-center justify-center backdrop-blur-sm transition"
                >
                    <CornersOut weight="bold" />
                </button>
            </div>
        </div>
    );
}
