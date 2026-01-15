'use client';

import { memo } from 'react';
import { Lightning, Brain, Globe } from '@phosphor-icons/react';

interface ModeCardProps {
    mode: 'quick' | 'smart' | 'deep';
    currentMode: 'quick' | 'smart' | 'deep';
    onSetMode: (mode: 'quick' | 'smart' | 'deep') => void;
}

const modeConfig = {
    quick: {
        icon: Lightning,
        title: 'Quick Think',
        description: 'Fast, direct answers.'
    },
    smart: {
        icon: Brain,
        title: 'Smart Analysis',
        description: 'Balanced reasoning.'
    },
    deep: {
        icon: Globe,
        title: 'Deep Search',
        description: 'Web-connected research.'
    }
};

function ModeCard({
    mode,
    currentMode,
    onSetMode
}: ModeCardProps) {
    const config = modeConfig[mode];
    const Icon = config.icon;

    return (
        <button
            onClick={() => onSetMode(mode)}
            className={`mode-card rounded-2xl p-5 text-left group cursor-pointer relative overflow-hidden ${currentMode === mode ? 'active' : ''}`}
        >
            <div className="mb-3 h-8 w-8 rounded-lg bg-zinc-800/50 flex items-center justify-center text-zinc-400 group-hover:text-[#D8CEF0] transition-colors">
                <Icon weight="fill" />
            </div>
            <h3 className="text-sm font-semibold text-zinc-300 mb-1">{config.title}</h3>
            <p className="text-[11px] text-zinc-500 leading-relaxed">{config.description}</p>
        </button>
    );
}

export default memo(ModeCard);
