"use client"

import type React from "react"

import { SidebarProvider } from "@/components/ui/sidebar"
import { AppSidebar } from "@/components/app-sidebar"
import { SidebarInset } from "@/components/ui/sidebar"
import { DashboardNavbar } from "@/components/dashboard-navbar"

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset className="border-0 rounded-none shadow-none m-0 md:m-0">
        <DashboardNavbar />
        <div className="flex flex-1 flex-col gap-0">{children}</div>
      </SidebarInset>
    </SidebarProvider>
  )
}
