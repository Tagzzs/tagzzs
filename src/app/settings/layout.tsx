"use client";

import { SidebarProvider } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/layout/Sidebar";
import AuthGuard from "@/components/auth-guard";

export default function SettingsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AuthGuard>
      <SidebarProvider
        defaultOpen={false}
        className="flex h-screen w-full selection:bg-[#9F55FF]/30 selection:text-white bg-black overflow-hidden"
        style={{
          "--sidebar-width-icon": "4.5rem"
        } as React.CSSProperties}
      >
        <AppSidebar />
        {children}
      </SidebarProvider>
    </AuthGuard>
  );
}
