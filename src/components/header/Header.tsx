'use client';

import { SidebarTrigger } from '@/components/ui/sidebar';
import ShinyText from '../ShinyText';

interface HeaderProps {
    onResetFilter: () => void;
}

const filterTags = [
    { label: '#AI', colorClass: 'bg-cyan-500/10 border-cyan-500/20 text-cyan-400 hover:bg-cyan-500/20' },
    { label: '#React', colorClass: 'bg-blue-500/10 border-blue-500/20 text-blue-400 hover:bg-blue-500/20' },
    { label: '#Design', colorClass: 'bg-pink-500/10 border-pink-500/20 text-pink-400 hover:bg-pink-500/20' },
    { label: '#Startup', colorClass: 'bg-orange-500/10 border-orange-500/20 text-orange-400 hover:bg-orange-500/20' }
];

export default function Header({ onResetFilter }: HeaderProps) {
    return (
        <div className="px-4 md:px-8 lg:px-10 pt-6 md:pt-10 pb-2 mt-4 shrink-0 bg-black">
            <div className="flex items-center gap-2 lg:hidden mb-4">
                <SidebarTrigger className="text-white" />
                <span className="text-zinc-500 text-sm font-medium">Menu</span>
            </div>

            <h2 className="text-[32px] md:text-[48px] lg:text-[60px] font-medium text-white tracking-tight leading-none">
                Good morning, <ShinyText text="User." disabled={false} speed={20} delay={0.8} color="#bfbfbf" spread={160} className="font-medium" />
            </h2>
            <p className="text-zinc-500 text-[18px] md:text-[24px] lg:text-[30px] font-normal mt-2 mb-6">
                Let&apos;s get productive.
            </p>
            <div className="flex flex-wrap gap-2">
                <button
                    onClick={onResetFilter}
                    className="px-3 py-1 rounded-full bg-[#4b2976] text-white text-[12px] border-[#9f63fe] font-bold shadow-[0_0_15px_rgba(159,85,255,0.3)] hover:opacity-90 transition-opacity"
                >
                    All
                </button>
                {filterTags.map((tag, index) => (
                    <button
                        key={index}
                        className={`px-3 py-1 rounded-full border text-[12px] font-medium transition-colors ${tag.colorClass}`}
                    >
                        {tag.label}
                    </button>
                ))}
            </div>
        </div>
    );
}
