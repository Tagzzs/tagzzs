'use client';

export default function UserProfile() {
    return (
        <div className="mt-auto pt-6 border-t border-white/5">
            <div className="flex items-center gap-3 p-2 rounded-xl hover:bg-white/5 cursor-pointer transition-colors group">
                <div className="h-7 w-7 rounded-full bg-zinc-800 border border-zinc-700 flex items-center justify-center text-[10px] text-white font-bold group-hover:border-[#9F55FF]/50 shadow-inner">
                    U
                </div>
                <div className="flex flex-col">
                    <span className="text-xs font-semibold text-white">User</span>
                    <span className="text-[8px] text-zinc-500 font-bold tracking-wider">PRO</span>
                </div>
            </div>
        </div>
    );
}
