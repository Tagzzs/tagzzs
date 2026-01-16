"use client";

import React, { useEffect, useRef } from "react";
import { Sparkle } from "@phosphor-icons/react";
import { useChat } from "@/contexts/ChatContext";

interface NeuralMapSidebarProps {
  currentFilter: string;
  currentDetailItem: any | null;
  graphRef: React.RefObject<SVGSVGElement | null>;
  isOpen: boolean;
  onClose: () => void;
}

export default function NeuralMapSidebar({
  currentFilter,
  currentDetailItem,
  graphRef,
  isOpen,
  onClose,
}: NeuralMapSidebarProps) {
  const nanobotRef = useRef<HTMLCanvasElement>(null);
  const { messages, sendMessage, isSending } = useChat();
  const [inputValue, setInputValue] = React.useState("");
  const chatContainerRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom of chat
  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop =
        chatContainerRef.current.scrollHeight;
    }
  }, [messages, isSending, isOpen]);

  const handleSendMessage = async () => {
    if (!inputValue.trim() || isSending) return;

    const message = inputValue;
    setInputValue(""); // Clear input immediately for better UX
    await sendMessage(message);
  };

  // Nanobot Animation
  useEffect(() => {
    const canvas = nanobotRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const resizeCanvas = () => {
      const rect = canvas.getBoundingClientRect();
      if (rect.width === 0) return;
      canvas.width = rect.width * window.devicePixelRatio;
      canvas.height = rect.height * window.devicePixelRatio;
      ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
    };
    resizeCanvas();
    window.addEventListener("resize", resizeCanvas);

    const particleCount = 1000;
    const sphereRadius = 60;
    let rotationAngle = 0;
    const particles = Array.from({ length: particleCount }, () => ({
      theta: Math.random() * 2 * Math.PI,
      phi: Math.acos(Math.random() * 2 - 1),
    }));
    const centerX = 160;
    const centerY = 80;
    let animationFrame: number;

    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      rotationAngle += 0.002;
      particles.forEach((p) => {
        let rotatedTheta = p.theta + rotationAngle;
        let x = sphereRadius * Math.sin(p.phi) * Math.cos(rotatedTheta);
        let y = sphereRadius * Math.cos(p.phi);
        let z = sphereRadius * Math.sin(p.phi) * Math.sin(rotatedTheta);
        const perspective = 300 / (300 - z);
        const alpha = Math.max(
          0.05,
          Math.min(1, (z + sphereRadius) / (2 * sphereRadius))
        );
        const projX = centerX + x * perspective;
        const projY = centerY + y * perspective;

        ctx.beginPath();
        ctx.arc(projX, projY, 1.2 * perspective, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(255, 255, 255, ${alpha})`;
        ctx.fill();
      });
      animationFrame = requestAnimationFrame(animate);
    };
    animate();

    return () => {
      window.removeEventListener("resize", resizeCanvas);
      cancelAnimationFrame(animationFrame);
    };
  }, []);

  return (
    <aside
      id="right-sidebar"
      className={`w-80 bg-black border-l border-zinc-900 flex-col flex-shrink-0 z-50 transition-all ${
        isOpen ? "hidden lg:flex" : "hidden"
      } relative h-full`}
    >
      <div className="absolute top-4 right-4 z-50">
        <button
          onClick={onClose}
          className="w-8 h-8 rounded-full bg-zinc-900 border border-zinc-800 flex items-center justify-center text-zinc-500 hover:text-white transition-colors"
        >
          <svg
            className="w-4 h-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              d="M6 18L18 6M6 6l12 12"
            ></path>
          </svg>
        </button>
      </div>

      <div className="flex-1 flex flex-col p-0 overflow-hidden bg-black relative">
        <div className="mt-8 w-full h-40 relative shrink-0 flex items-center justify-center bg-gradient-to-b from-black to-zinc-900/10">
          <canvas
            ref={nanobotRef}
            className="w-full h-full object-cover opacity-90"
          ></canvas>
        </div>
        <div
          ref={chatContainerRef}
          className="flex-1 overflow-y-auto space-y-4 p-5 pt-0 scrollbar-thin scrollbar-thumb-zinc-800 scrollbar-track-transparent"
          id="chat-history"
        >
          {/* Welcome Message */}
          <div className="my-10 flex gap-3 fade-in">
            <div className="w-8 h-8 rounded-full bg-zinc-900 flex items-center justify-center flex-shrink-0 text-xs text-white border border-zinc-800">
              K
            </div>
            <div className="bg-zinc-900 p-3 rounded-2xl rounded-tl-none text-xs text-zinc-400 leading-relaxed shadow-sm">
              Neural interface active. I'm tracking your navigation context.
            </div>
          </div>

          {/* Chat Messages */}
          {messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex gap-3 fade-in ${
                msg.role === "user" ? "flex-row-reverse" : ""
              }`}
            >
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 text-xs text-white border ${
                  msg.role === "user"
                    ? "bg-indigo-600 border-indigo-500"
                    : "bg-zinc-900 border-zinc-800"
                }`}
              >
                {msg.role === "user" ? "U" : "K"}
              </div>
              <div
                className={`p-3 rounded-2xl text-xs leading-relaxed shadow-sm max-w-[80%] ${
                  msg.role === "user"
                    ? "bg-indigo-900/30 text-indigo-200 rounded-tr-none border border-indigo-500/30"
                    : "bg-zinc-900 text-zinc-400 rounded-tl-none"
                }`}
              >
                {msg.content}
              </div>
            </div>
          ))}

          {/* Loading Indicator */}
          {isSending && (
            <div className="flex gap-3 fade-in">
              <div className="w-8 h-8 rounded-full bg-zinc-900 flex items-center justify-center flex-shrink-0 text-xs text-white border border-zinc-800">
                K
              </div>
              <div className="bg-zinc-900 p-3 rounded-2xl rounded-tl-none text-xs text-zinc-500 leading-relaxed shadow-sm flex items-center gap-1">
                <span
                  className="w-1 h-1 bg-zinc-500 rounded-full animate-bounce"
                  style={{ animationDelay: "0ms" }}
                ></span>
                <span
                  className="w-1 h-1 bg-zinc-500 rounded-full animate-bounce"
                  style={{ animationDelay: "150ms" }}
                ></span>
                <span
                  className="w-1 h-1 bg-zinc-500 rounded-full animate-bounce"
                  style={{ animationDelay: "300ms" }}
                ></span>
              </div>
            </div>
          )}
        </div>

        {/* Input Area */}
        <div className="p-3 border-t border-zinc-900 bg-black sticky bottom-0 z-10">
          <div className="flex flex-col gap-3">
            {/* Chat Input */}
            <div className="relative flex items-center bg-zinc-900/50 border border-zinc-800 rounded-xl overflow-hidden shadow-sm focus-within:border-zinc-700 transition-colors">
              <input
                type="text"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    handleSendMessage();
                  }
                }}
                disabled={isSending}
                placeholder={isSending ? "Thinking..." : "Ask Kai..."}
                className="flex-1 bg-transparent text-zinc-300 text-sm px-3 py-3 outline-none placeholder:text-zinc-600 min-w-0"
              />

              <button
                onClick={handleSendMessage}
                disabled={!inputValue.trim() || isSending}
                className={`pr-3 transition-colors shrink-0 ${
                  !inputValue.trim() || isSending
                    ? "text-zinc-700"
                    : "text-zinc-500 hover:text-white"
                }`}
              >
                <Sparkle weight="fill" className="text-lg" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </aside>
  );
}
