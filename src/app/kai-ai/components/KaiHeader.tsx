"use client";

import React from "react";
import { List, Coin } from "@phosphor-icons/react";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { useCreditBalance } from "@/hooks/useCreditBalance";

interface KaiHeaderProps {
  onToggleHistory: () => void;
}

export default function KaiHeader({ onToggleHistory }: KaiHeaderProps) {
  const { creditBalance, loading, error } = useCreditBalance();

  return (
    <header className="h-16 shrink-0 flex items-center justify-between px-6 z-20">
      {/* Left side - History toggle */}
      <div className="flex items-center gap-4">
        <div className="md:hidden">
          <SidebarTrigger />
        </div>
        <button
          onClick={onToggleHistory}
          className="p-2 rounded-lg hover:bg-white/5 text-zinc-500 hover:text-zinc-200 transition-colors"
          title="Toggle Chat History"
        >
          <List weight="bold" className="text-lg" />
        </button>
        <span className="text-sm font-medium text-zinc-500">New Session</span>
      </div>

      {/* Right side - Credit balance */}
      <div className="flex items-center">
        <div
          className={`flex items-center gap-2 px-3 py-1.5 rounded-full transition-all duration-300 ${
            error
              ? "bg-red-500/10 border border-red-500/20"
              : "bg-gradient-to-r from-amber-500/10 to-yellow-500/10 border border-amber-500/20 hover:border-amber-500/40"
          }`}
          title={error ? "Unable to load credits" : `You have ${creditBalance ?? 0} credits`}
        >
          <Coin
            weight="duotone"
            className={`text-lg ${
              error ? "text-red-400" : "text-amber-400"
            } ${loading ? "animate-pulse" : ""}`}
          />
          {loading ? (
            <div className="w-8 h-4 bg-zinc-700/50 rounded animate-pulse" />
          ) : error ? (
            <span className="text-xs font-semibold text-red-400">--</span>
          ) : (
            <span className="text-sm font-semibold text-amber-200/90">
              {creditBalance?.toLocaleString() ?? 0}
            </span>
          )}
        </div>
      </div>
    </header>
  );
}
