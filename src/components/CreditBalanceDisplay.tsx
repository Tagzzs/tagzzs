"use client";

import React from "react";
import { Coin } from "@phosphor-icons/react";
import { useCreditBalance } from "@/hooks/useCreditBalance";

interface CreditBalanceDisplayProps {
  className?: string;
  compact?: boolean;
}

/**
 * Reusable credit balance display component.
 * Shows the user's credit balance with a coin icon.
 * 
 * @param className - Additional CSS classes
 * @param compact - If true, shows a smaller version suitable for tight spaces
 */
export function CreditBalanceDisplay({ className = "", compact = false }: CreditBalanceDisplayProps) {
  const { creditBalance, loading, error } = useCreditBalance();

  return (
    <div
      className={`flex items-center gap-1.5 transition-all duration-300 ${
        error
          ? "bg-red-500/10 border border-red-500/20"
          : "bg-gradient-to-r from-amber-500/10 to-yellow-500/10 border border-amber-500/20 hover:border-amber-500/40"
      } ${compact ? "px-2 py-1 rounded-lg" : "px-3 py-1.5 rounded-full"} ${className}`}
      title={error ? "Unable to load credits" : `You have ${creditBalance ?? 0} credits`}
    >
      <Coin
        weight="duotone"
        className={`${compact ? "text-sm" : "text-lg"} ${
          error ? "text-red-400" : "text-amber-400"
        } ${loading ? "animate-pulse" : ""}`}
      />
      {loading ? (
        <div className={`${compact ? "w-6 h-3" : "w-8 h-4"} bg-zinc-700/50 rounded animate-pulse`} />
      ) : error ? (
        <span className={`${compact ? "text-[10px]" : "text-xs"} font-semibold text-red-400`}>--</span>
      ) : (
        <span className={`${compact ? "text-xs" : "text-sm"} font-semibold text-amber-200/90`}>
          {creditBalance?.toLocaleString() ?? 0}
        </span>
      )}
    </div>
  );
}
