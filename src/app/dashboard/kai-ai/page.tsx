"use client";

import React from "react";
import { ClientMeta } from "@/components/client-meta";
import KaiAIChat from "@/components/KaiAIChat";

export default function KaiAIPage() {
  return (
    <>
      <ClientMeta page="kai-ai" />
      <div className="h-full">
        <KaiAIChat />
      </div>
    </>
  );
}
