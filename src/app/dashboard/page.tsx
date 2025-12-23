"use client";

import React, { useState, useEffect } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { ClientMeta } from "@/components/client-meta";

interface ContentItem {
  id: string;
  title: string;
  description: string;
  contentSource: string;
  contentType: string;
  tagsId: string[];
  personalNotes: string;
  createdAt: string;
  updatedAt: string;
}

interface TagItem {
  id: string;
  tagName: string;
  tagColor: string;
  description: string;
  contentCount: number;
  createdAt: string;
  updatedAt: string;
}

interface DashboardStats {
  totalItems: number;
  totalTags: number;
  thisWeekItems: number;
  topTagName: string;
  topTagCount: number;
}

export default function DashboardPage() {
  const [, setContent] = useState<ContentItem[]>([]);
  const [, setTags] = useState<TagItem[]>([]);
  const [, setStats] = useState<DashboardStats>({
    totalItems: 0,
    totalTags: 0,
    thisWeekItems: 0,
    topTagName: "",
    topTagCount: 0,
  });
  const [, setIsLoading] = useState(true);
  const [, setError] = useState<string | null>(null);

  const fetchDashboardData = async () => {
    try {
      setIsLoading(true);
      setError(null);

      const [contentResponse, tagsResponse] = await Promise.all([
        fetch("/api/user-database/content/get", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ sortBy: "newest", limit: 4 }),
        }),
        fetch("/api/user-database/tags/get", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({}),
        }),
      ]);
      if (!contentResponse.ok || !tagsResponse.ok) {
        throw new Error("Failed to fetch dashboard data");
      }
      const [contentData, tagsData] = await Promise.all([
        contentResponse.json(),
        tagsResponse.json(),
      ]);
      if (!contentData.success || !tagsData.success) {
        throw new Error("API returned error response");
      }

      const allContentResponse = await fetch("/api/user-database/content/get", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sortBy: "newest" }),
      });
      let allContentData = { data: [] };
      if (allContentResponse.ok) {
        allContentData = await allContentResponse.json();
      }

      const allContent = allContentData.data || [];
      const allTags = tagsData.data || [];
      const oneWeekAgo = new Date();
      oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
      const thisWeekItems = allContent.filter((item: ContentItem) => {
        const createdDate = new Date(item.createdAt);
        return createdDate >= oneWeekAgo;
      }).length;
      const topTag = allTags.reduce((prev: TagItem | null, current: TagItem) => {
        if (!prev || current.contentCount > prev.contentCount) return current;
        return prev;
      }, null);

      setContent(contentData.data || []);
      setTags(allTags);
      setStats({
        totalItems: allContent.length,
        totalTags: allTags.length,
        thisWeekItems,
        topTagName: topTag?.tagName || "",
        topTagCount: topTag?.contentCount || 0,
      });

    } catch (error) {
      setError(error instanceof Error ? error.message : "Failed to load dashboard data");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  return (
    <>
    <DashboardLayout>
      <div className="flex flex-col gap-8">
        <ClientMeta page="dashboard" personalized={true} />
      </div>
    </DashboardLayout>
    </>
  );
}
