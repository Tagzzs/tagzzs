"use client";

import React, { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  Database,
  Sparkle,
  MagnifyingGlass,
  Plus,
  X,
  ArrowRight,
  Spinner,
} from "@phosphor-icons/react";
import KaiAISidebar from "./KaiAISidebar";
import { useChat } from "@/contexts/ChatContext";
import { useAuth } from "@/contexts/AuthContext";

interface SearchResult {
  id: string;
  title: string;
  description: string;
  score: number;
}

interface FloatingSearchBarProps {
  currentFilter: string;
  currentDetailItem: unknown | null;
  searchMode: "DB" | "AI";
  onSetSearchMode: (mode: "DB" | "AI") => void;
  onOpenAddModal: () => void;
  isAiSidebarOpen?: boolean;
  setAiSidebarOpen?: (open: boolean) => void;
}

const BACKEND_URL =
  process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:8000";

export default function FloatingSearchBar({
  currentFilter,
  currentDetailItem,
  searchMode,
  onSetSearchMode,
  onOpenAddModal,
  isAiSidebarOpen,
  setAiSidebarOpen,
}: FloatingSearchBarProps) {
  const router = useRouter();
  const { user } = useAuth();
  const { sendMessage, isSending } = useChat();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const [showKaiAI, setShowKaiAI] = useState(false);

  const handleSearch = useCallback(async () => {
    if (!query.trim()) return;

    if (searchMode === "AI") {
      // Open Kai-AI sidebar with the query and send it
      setShowResults(false);
      if (setAiSidebarOpen) {
        setAiSidebarOpen(true);
      } else {
        setShowKaiAI(true);
      }
      const q = query;
      setQuery("");
      await sendMessage(q);
      return;
    }

    // DB mode: semantic search
    setIsSearching(true);
    setShowResults(true);

    try {
      const response = await fetch(`${BACKEND_URL}/search/semantic-query`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          user_id: user?.id || "",
          query,
          limit: 10,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        setResults(data.results || []);
      } else {
        console.error("Search failed:", response.status);
        setResults([]);
      }
    } catch (err) {
      console.error("Search error:", err);
      setResults([]);
    } finally {
      setIsSearching(false);
    }
  }, [query, searchMode, user?.id, sendMessage, setAiSidebarOpen]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleSearch();
    } else if (e.key === "Escape") {
      setShowResults(false);
    }
  };

  const handleResultClick = (result: SearchResult) => {
    router.push(`/content/${result.id}`);
    setShowResults(false);
    setQuery("");
  };

  const clearSearch = () => {
    setQuery("");
    setResults([]);
    setShowResults(false);
  };

  return (
    <>
      <div
        id="floating-container"
        className={`z-50 flex items-center gap-3 transition-all duration-600 ${
          currentFilter !== "All" || currentDetailItem
            ? "float-search-sidebar"
            : "float-search-root"
        } ${isAiSidebarOpen ? "sidebar-open" : ""}`}
      >
        <div className="float-input-wrapper flex-1 bg-black border border-zinc-800 rounded-full h-14 flex items-center px-2 pl-2 shadow-2xl relative">
          {/* Toggle Switch */}
          <div className="h-10 bg-zinc-900 rounded-full flex items-center p-1 border border-zinc-800 shrink-0 mr-3">
            <button
              onClick={() => onSetSearchMode("DB")}
              className={`h-full px-4 rounded-full text-[10px] font-bold tracking-wide shadow-sm flex items-center gap-1 transition-colors ${
                searchMode === "DB"
                  ? "bg-zinc-700 text-white"
                  : "text-zinc-500 hover:text-white"
              }`}
            >
              <Database weight="fill" /> DB
            </button>
            <button
              onClick={() => onSetSearchMode("AI")}
              className={`h-full px-4 rounded-full text-[10px] font-bold tracking-wide transition-colors flex items-center gap-1 ${
                searchMode === "AI"
                  ? "bg-zinc-700 text-white shadow-sm"
                  : "text-zinc-500 hover:text-white"
              }`}
            >
              <Sparkle weight="fill" /> AI
            </button>
          </div>

          <div className="flex-1 flex items-center h-full mr-2">
            {isSearching || (searchMode === "AI" && isSending) ? (
              <Spinner
                className="mr-3 text-purple-400 animate-spin"
                size={18}
              />
            ) : searchMode === "DB" ? (
              <MagnifyingGlass
                weight="bold"
                className="text-zinc-600 mr-3 text-lg"
              />
            ) : (
              <Sparkle weight="fill" className="text-zinc-600 mr-3 text-lg" />
            )}
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={
                searchMode === "DB"
                  ? "Search in Database..."
                  : "Ask Kai AI anything..."
              }
              className="bg-transparent w-full h-full outline-none text-sm text-white placeholder-zinc-600 font-medium border-none focus:ring-0"
            />
            {query && (
              <button
                onClick={clearSearch}
                className="text-zinc-500 hover:text-white p-1"
              >
                <X weight="bold" />
              </button>
            )}
          </div>
          <button
            onClick={handleSearch}
            className="h-10 w-10 rounded-full bg-zinc-800 hover:bg-zinc-700 flex items-center justify-center text-white transition-colors"
          >
            <ArrowRight weight="bold" />
          </button>

          {/* Search Results Dropdown */}
          {showResults && searchMode === "DB" && (
            <div className="absolute top-full left-0 right-0 mt-2 bg-zinc-900 border border-zinc-800 rounded-xl shadow-2xl max-h-80 overflow-y-auto">
              {isSearching ? (
                <div className="p-4 text-center text-zinc-500">
                  Searching...
                </div>
              ) : results.length === 0 ? (
                <div className="p-4 text-center text-zinc-500">
                  No results found
                </div>
              ) : (
                results.map((result) => (
                  <div
                    key={result.id}
                    onClick={() => handleResultClick(result)}
                    className="p-3 hover:bg-zinc-800 cursor-pointer border-b border-zinc-800 last:border-b-0"
                  >
                    <h4 className="text-sm font-semibold text-white truncate">
                      {result.title}
                    </h4>
                    <p className="text-xs text-zinc-500 line-clamp-1 mt-1">
                      {result.description}
                    </p>
                  </div>
                ))
              )}
            </div>
          )}
        </div>
        <button
          id="floating-add-btn"
          onClick={onOpenAddModal}
          className={`h-14 px-8 bg-white hover:bg-zinc-200 text-black rounded-full font-bold text-sm shadow-xl flex items-center gap-2 shrink-0 transition-all cursor-pointer ${
            currentFilter !== "All" || currentDetailItem ? "add-btn-hidden" : ""
          }`}
        >
          <Plus weight="bold" className="text-lg" /> Add
        </button>
      </div>

      {/* Kai-AI Sidebar */}
      <KaiAISidebar isOpen={showKaiAI} onClose={() => setShowKaiAI(false)} />
    </>
  );
}
