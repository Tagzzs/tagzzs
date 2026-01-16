"use client";

import React, { useRef, useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import "./kai.css";
import { useChat } from "@/contexts/ChatContext";

// Components
import HistorySidebar from "./components/HistorySidebar";
import KaiHeader from "./components/KaiHeader";
import StartView from "./components/StartView";
import ChatView from "./components/ChatView";
import UploadModal from "./components/UploadModal";

export default function KaiAIPage() {
  const searchParams = useSearchParams();
  const { sendMessage, currentChatId } = useChat();
  const [isHistoryOpen, setIsHistoryOpen] = useState(true);
  const [currentMode, setCurrentMode] = useState<"quick" | "smart" | "deep">(
    "deep"
  );
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [showChat, setShowChat] = useState(false);

  // Auto-close history on smaller screens on mount
  useEffect(() => {
    if (window.innerWidth < 1024) {
      setIsHistoryOpen(false);
    }
  }, []);

  // Refs for animation state to avoid closure staleness in loop
  const modeRef = useRef<"quick" | "smart" | "deep">("deep");
  const isModeChangeActiveRef = useRef(false);
  const rotationSpeedRef = useRef(0.002);

  // Auto-start chat if query param exists
  useEffect(() => {
    const query = searchParams.get("q");
    if (query && !showChat) {
      // Wait a brief moment for hydration/animation or just start immediately
      // Using a small timeout to ensure context is ready and UI looks smooth
      const timer = setTimeout(() => {
        transitionToChat(query);
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [searchParams]);

  // Auto-switch to chat view when a chat is loaded from history
  useEffect(() => {
    if (currentChatId) {
      setShowChat(true);
    }
  }, [currentChatId]);

  // Toggle history sidebar
  const toggleHistorySidebar = () => setIsHistoryOpen(!isHistoryOpen);

  // Toggle upload modal
  const toggleUpload = () => setIsUploadOpen(!isUploadOpen);

  // Modes
  const setMode = (mode: "quick" | "smart" | "deep") => {
    setCurrentMode(mode);
    modeRef.current = mode;

    // Trigger particle effect change (Impulse)
    rotationSpeedRef.current = 0.02; // Impulse Speed
    isModeChangeActiveRef.current = true;
    setTimeout(() => {
      isModeChangeActiveRef.current = false;
    }, 800);
  };

  const transitionToChat = async (initialMessage?: string) => {
    setShowChat(true);
    if (initialMessage) {
      await sendMessage(initialMessage);
    }
  };

  return (
    <div className="flex h-screen w-full selection:bg-[#D8CEF0]/20 selection:text-white bg-black kai-scroll font-sans text-zinc-200 overflow-hidden">
      {/* History Sidebar */}
      <HistorySidebar
        isHistoryOpen={isHistoryOpen}
        onNewChat={() => setShowChat(false)}
      />

      {/* Main Content */}
      <main className="flex-1 flex flex-col relative overflow-hidden bg-black w-full">
        {/* Background Blur */}
        <div className="absolute top-[-10%] left-[50%] -translate-x-1/2 w-[800px] h-[600px] bg-[#D8CEF0]/3 rounded-full blur-[120px] pointer-events-none"></div>

        <KaiHeader onToggleHistory={toggleHistorySidebar} />

        {!showChat ? (
          <StartView
            currentMode={currentMode}
            modeRef={modeRef}
            isModeChangeActiveRef={isModeChangeActiveRef}
            rotationSpeedRef={rotationSpeedRef}
            onSetMode={setMode}
            onToggleUpload={toggleUpload}
            onTransitionToChat={transitionToChat}
          />
        ) : (
          <ChatView currentMode={currentMode} />
        )}
      </main>

      {/* Upload Modal */}
      <UploadModal isOpen={isUploadOpen} onClose={toggleUpload} />
    </div>
  );
}
