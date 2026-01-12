"use client";

import React, { useState, useEffect } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { ClientMeta } from "@/components/client-meta";
import { StatsCards } from "@/components/StatsCards";
import RecentlyAdded from "@/components/RecentlyAdded";

interface DashboardStats {
  totalContent: number;
  totalTags: number;
  thisWeekItems: number;
  topTagName: string;
  topTagCount: number;
}

export default function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats>({
    totalContent: 0,
    totalTags: 0,
    thisWeekItems: 0,
    topTagName: "",
    topTagCount: 0,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [, setError] = useState<string | null>(null);

  const fetchStats = async () => {
    try {
      setIsLoading(true);
      setError(null);

      const response = await fetch(
        `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/user-database/stats`,
        {
          method: "GET",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
        }
      );

      if (!response.ok) {
        throw new Error("Failed to fetch stats");
      }

      const data = await response.json();
      if (!data.success) {
        throw new Error(data.error || "Failed to fetch stats");
      }

      setStats(data.stats);
    } catch (error) {
      console.error("Error fetching dashboard stats:", error);
      setError(
        error instanceof Error ? error.message : "Failed to load dashboard data"
      );
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, []);

  return (
    <DashboardLayout>
      <div className="flex flex-col gap-8">
        <ClientMeta page="dashboard" personalized={true} />

        <StatsCards
          isLoading={isLoading}
          contentLength={stats.totalContent}
          tagsLength={stats.totalTags}
          thisWeekItems={stats.thisWeekItems}
          topTagName={stats.topTagName}
          topTagCount={stats.topTagCount}
        />

        <RecentlyAdded />
      </div>
    </DashboardLayout>
  );
}
