"use client";

import React, { useState, useRef, useEffect } from "react";
import { ArrowUp, Spinner, CaretDown, CaretUp } from "@phosphor-icons/react";
import { useChat } from "@/contexts/ChatContext";

interface ChatViewProps {
  currentMode: "quick" | "smart" | "deep";
}

export default function ChatView({ currentMode }: ChatViewProps) {
  const { messages, sendMessage, isSending } = useChat();
  const [input, setInput] = useState("");
  const chatEndRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  const [showScrollTop, setShowScrollTop] = useState(false);
  const [showScrollBottom, setShowScrollBottom] = useState(false);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || isSending) return;
    const text = input.trim();
    setInput("");
    await sendMessage(text);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleScroll = () => {
    if (!scrollContainerRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } =
      scrollContainerRef.current;

    // Show scroll top if scrolled down a bit (e.g., > 200px)
    setShowScrollTop(scrollTop > 200);

    // Show scroll bottom if not at the bottom (with some buffer)
    const isAtBottom = scrollHeight - scrollTop - clientHeight < 100;
    setShowScrollBottom(!isAtBottom);
  };

  const scrollToTop = () => {
    scrollContainerRef.current?.scrollTo({ top: 0, behavior: "smooth" });
  };

  const scrollToBottom = () => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <div
      id="chat-view"
      className="flex-1 flex flex-col opacity-100 transition-opacity duration-500 relative group/chat min-h-0"
    >
      <div
        id="chat-stream"
        ref={scrollContainerRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto p-4 md:p-20 scroll-smooth relative"
      >
        {/* Intro Message if empty */}
        {messages.length === 0 && (
          <div className="flex gap-4 mb-6">
            <div className="w-8 h-8 rounded-full bg-zinc-800 flex items-center justify-center text-xs text-zinc-400 shrink-0">
              K
            </div>
            <div className="text-zinc-300 text-sm leading-relaxed max-w-2xl bg-zinc-900/50 p-4 rounded-2xl rounded-tl-none">
              Hello! I'm Kai. I'm ready to help you with{" "}
              {currentMode === "quick"
                ? "quick answers"
                : currentMode === "smart"
                ? "complex analysis"
                : "deep research"}
              .
            </div>
          </div>
        )}

        {/* Chat History */}
        {messages.map((msg, idx) => (
          <div
            key={msg.id || idx}
            className={`flex gap-4 mb-6 ${
              msg.role === "user" ? "flex-row-reverse" : ""
            }`}
          >
            {msg.role === "assistant" ? (
              <div className="w-8 h-8 rounded-full bg-zinc-800 flex items-center justify-center text-xs text-zinc-400 shrink-0">
                K
              </div>
            ) : (
              <div className="w-8 h-8 rounded-full bg-[#A78BFA]/20 flex items-center justify-center text-xs text-[#A78BFA] shrink-0 border border-[#A78BFA]/30">
                U
              </div>
            )}

            <div
              className={`text-sm leading-relaxed max-w-2xl p-4 rounded-2xl shadow-sm ${
                msg.role === "assistant"
                  ? "bg-zinc-900 text-zinc-300 rounded-tl-none"
                  : "bg-[#A78BFA]/10 text-zinc-100 border border-[#A78BFA]/20 rounded-tr-none"
              }`}
            >
              {msg.content}
            </div>
          </div>
        ))}

        {/* Loading Indicator */}
        {isSending && (
          <div className="flex gap-4 mb-6">
            <div className="w-8 h-8 rounded-full bg-zinc-800 flex items-center justify-center text-xs text-zinc-400 shrink-0">
              K
            </div>
            <div className="bg-zinc-900 p-4 rounded-2xl rounded-tl-none flex items-center gap-2">
              <div className="flex gap-1">
                <span className="w-1.5 h-1.5 bg-zinc-500 rounded-full animate-bounce [animation-delay:-0.3s]"></span>
                <span className="w-1.5 h-1.5 bg-zinc-500 rounded-full animate-bounce [animation-delay:-0.15s]"></span>
                <span className="w-1.5 h-1.5 bg-zinc-500 rounded-full animate-bounce"></span>
              </div>
            </div>
          </div>
        )}
        <div ref={chatEndRef} />
      </div>

      {/* Scroll Buttons */}
      <div className="absolute right-6 bottom-24 flex flex-col gap-2 z-20 pointer-events-none">
        {showScrollTop && (
          <button
            onClick={scrollToTop}
            className="pointer-events-auto w-8 h-8 rounded-full bg-zinc-800/80 hover:bg-zinc-700 text-zinc-400 hover:text-white flex items-center justify-center shadow-lg backdrop-blur-sm transition-all animate-in fade-in zoom-in duration-200"
            title="Scroll to Top"
          >
            <CaretUp weight="bold" />
          </button>
        )}
        {showScrollBottom && (
          <button
            onClick={scrollToBottom}
            className="pointer-events-auto w-8 h-8 rounded-full bg-[#9F55FF]/80 hover:bg-[#9F55FF] text-white flex items-center justify-center shadow-lg backdrop-blur-sm transition-all animate-in fade-in zoom-in duration-200"
            title="Scroll to Bottom"
          >
            <CaretDown weight="bold" />
          </button>
        )}
      </div>

      {/* Input Area */}
      <div className="p-6 pb-8 bg-gradient-to-t from-black via-black to-transparent shrink-0">
        <div className="max-w-3xl mx-auto relative">
          <div
            className={`bg-[#121212] rounded-full flex items-center border p-1.5 pl-4 transition-colors ${
              isSending
                ? "border-zinc-800 opacity-50"
                : "border-[#27272a] focus-within:border-[#D8CEF0]"
            }`}
          >
            <input
              type="text"
              placeholder="Reply..."
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              disabled={isSending}
              className="flex-1 bg-transparent h-10 outline-none text-zinc-200 text-sm border-none focus:ring-0 placeholder-zinc-600"
            />
            <button
              onClick={handleSend}
              disabled={!input.trim() || isSending}
              className="h-9 w-9 rounded-full bg-zinc-800 hover:bg-zinc-700 disabled:bg-zinc-900 disabled:text-zinc-600 text-zinc-400 flex items-center justify-center transition-colors"
            >
              {isSending ? (
                <Spinner className="animate-spin" />
              ) : (
                <ArrowUp weight="bold" />
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
