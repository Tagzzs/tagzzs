import React from 'react';
import { AnimatedBrandPanel } from './AnimatedBrandPanel';
import './auth.css';

interface SplitScreenAuthProps {
  children: React.ReactNode;
}

export function SplitScreenAuth({ children }: SplitScreenAuthProps) {
  return (
    <div className="fixed inset-0 flex overflow-hidden bg-black auth-interactive">
      {/* Left Panel - Brand/Splash (60%) */}
      <div className="hidden md:flex md:w-[60%] relative">
        <AnimatedBrandPanel />
      </div>

      {/* Right Panel - Auth Forms (40%) */}
      <div
        className="w-full md:w-[40%] relative overflow-y-auto scrollbar-thin scrollbar-thumb-purple-500/20 scrollbar-track-transparent hover:scrollbar-thumb-purple-500/40"
        style={{
          background: 'radial-gradient(circle at top right, #1a0a2e 0%, #0a0a0f 50%, #000000 100%)',
        }}
      >
        {/* Subtle animated gradient overlay */}
        <div
          className="absolute top-0 right-0 w-96 h-96 rounded-full opacity-10 blur-3xl animate-pulse pointer-events-none"
          style={{
            background: 'radial-gradient(circle, rgba(168, 85, 247, 0.6) 0%, transparent 70%)',
            animationDuration: '5s',
          }}
        />

        {/* Content wrapper with custom scrollbar */}
        <div className="relative min-h-full flex items-center justify-center p-6 md:p-8 lg:p-12">
          <div className="w-full max-w-md animate-in fade-in slide-in-from-right-4 duration-700">
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}