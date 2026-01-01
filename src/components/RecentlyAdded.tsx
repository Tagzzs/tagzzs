"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  BookOpen,
  Plus,
  Tag,
  Calendar,
  User,
  FileText,
  Video,
  File,
  Link as LinkIcon,
  Image as ImageIcon,
} from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";
import { createClient } from "@/utils/supabase/client";

interface ContentItem {
  id: string;
  title: string;
  description: string;
  contentSource: string;
  contentType: string;
  tagsId: string[];
  createdAt: string;
  link?: string;
  thumbnailUrl?: string;
}

interface TagItem {
  id: string;
  tagName: string;
  tagColor: string;
  contentCount?: number;
}

interface RecentlyAddedProps {
  filteredContent?: ContentItem[];
  isFiltered?: boolean;
}

// Helper function to get type icon component
const getTypeIconComponent = (contentType: string) => {
  switch (contentType.toLowerCase()) {
    case "article":
      return <FileText className="w-4 h-4" />;
    case "video":
      return <Video className="w-4 h-4" />;
    case "pdf":
      return <File className="w-4 h-4" />;
    case "image":
      return <ImageIcon className="w-4 h-4" />;
    case "link":
      return <LinkIcon className="w-4 h-4" />;
    default:
      return <FileText className="w-4 h-4" />;
  }
};

// Helper function to get dummy image based on content type
const getDummyImage = (_contentType: string, _id: string): string => {
  return `https://www.contentviewspro.com/wp-content/uploads/2017/07/default_image.png`;
};

// Helper function to get preview image
const getPreviewImage = (item: ContentItem): string => {
  // If thumbnail exists, use it
  if (item.thumbnailUrl) {
    console.log(
      `[RecentlyAdded] Using thumbnail for ${item.title}:`,
      item.thumbnailUrl
    );
    return item.thumbnailUrl;
  }

  // For links, try to extract image or use dummy
  if (item.link) {
    console.log(`[RecentlyAdded] No thumbnail for ${item.title}, using dummy`);
    return getDummyImage(item.contentType, item.id);
  }

  // Default dummy image
  console.log(`[RecentlyAdded] No link found for ${item.title}, using dummy`);
  return getDummyImage(item.contentType, item.id);
};

const RecentlyAdded: React.FC<RecentlyAddedProps> = ({
  filteredContent,
  isFiltered = false,
}) => {
  const [content, setContent] = useState<ContentItem[]>([]);
  const [tags, setTags] = useState<TagItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const isMobile = useIsMobile();

  useEffect(() => {
    const fetchRecentlyAddedData = async () => {
      setIsLoading(true);
      try {
        const [contentRes, tagsRes] = await Promise.all([
          fetch(
            `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/user-database/content/get`,
            {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              credentials: "include",
              body: JSON.stringify({ sortBy: "newest", limit: 4 }),
            }
          ),
          fetch(
            `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/user-database/tags/get`,
            {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              credentials: "include",
              body: JSON.stringify({}),
            }
          ),
        ]);
        if (!contentRes.ok || !tagsRes.ok) {
          throw new Error("Failed to fetch data");
        }
        const contentData = await contentRes.json();
        const tagsData = await tagsRes.json();
        console.log("[RecentlyAdded] Fetched content:", contentData.data);
        setContent(contentData.data || []);
        setTags(tagsData.data || []);
      } catch (error) {
        console.error("Error fetching recently added data:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchRecentlyAddedData();
  }, []);

  const displayContent = isFiltered ? filteredContent || [] : content;

  const getTagsForContent = (tagIds: string[]) =>
    tags.filter((tag) => tagIds.includes(tag.id));

  const _getTypeIcon = (type: string) => {
    switch (type.toLowerCase()) {
      case "article":
        return FileText;
      case "video":
        return Video;
      case "pdf":
        return File;
      case "link":
        return LinkIcon;
      default:
        return FileText;
    }
  };

  const _getTypeColors = (type: string) => {
    switch (type.toLowerCase()) {
      case "article":
        return {
          iconColor: "text-violet-600",
          iconBg: "bg-violet-50",
          typeColor: "bg-violet-100 text-violet-700",
        };
      case "video":
        return {
          iconColor: "text-purple-600",
          iconBg: "bg-purple-50",
          typeColor: "bg-purple-100 text-purple-700",
        };
      case "pdf":
        return {
          iconColor: "text-orange-600",
          iconBg: "bg-orange-50",
          typeColor: "bg-orange-100 text-orange-700",
        };
      case "link":
        return {
          iconColor: "text-green-600",
          iconBg: "bg-green-50",
          typeColor: "bg-green-100 text-green-700",
        };
      default:
        return {
          iconColor: "text-indigo-600",
          iconBg: "bg-indigo-50",
          typeColor: "bg-indigo-100 text-indigo-700",
        };
    }
  };

  const getTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInMs = now.getTime() - date.getTime();
    const diffInHours = Math.floor(diffInMs / (1000 * 60 * 60));
    const diffInDays = Math.floor(diffInHours / 24);
    if (diffInHours < 1) return "Just now";
    if (diffInHours < 24)
      return `${diffInHours} hour${diffInHours > 1 ? "s" : ""} ago`;
    if (diffInDays < 7)
      return `${diffInDays} day${diffInDays > 1 ? "s" : ""} ago`;
    return date.toLocaleDateString();
  };

  // Responsive grid columns
  const gridColsClass = isMobile ? "grid-cols-1" : "grid-cols-2 lg:grid-cols-2";
  const gapClass = isMobile ? "gap-3 sm:gap-4" : "gap-4 lg:gap-6";

  return (
    <div className="mt-6 sm:mt-8">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-4 mb-4 sm:mb-6">
        <h2 className="text-lg sm:text-xl text-foreground">
          {isFiltered ? "Filtered Results" : "Recently Added"}
        </h2>
        <Link href="/dashboard/memory-space">
          <button className="text-sm text-primary hover:text-primary/80 transition-colors whitespace-nowrap">
            View All
          </button>
        </Link>
      </div>

      {isLoading && !isFiltered ? (
        <div className={`grid ${gridColsClass} ${gapClass}`}>
          {Array.from({ length: 4 }).map((_, index) => (
            <Card key={index} className="overflow-hidden bg-white">
              <Skeleton className="w-full aspect-video bg-gradient-to-br from-[#F4F0FF] to-[#E4D7FF]/50" />
              <div className="p-3 sm:p-4 space-y-2 sm:space-y-3">
                <Skeleton className="h-5 w-3/4" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-5/6" />
                <div className="flex gap-2">
                  <Skeleton className="h-5 w-12 rounded-full" />
                  <Skeleton className="h-5 w-16 rounded-full" />
                </div>
                <div className="flex gap-2 sm:gap-4 pt-2 flex-wrap">
                  <Skeleton className="h-4 w-20" />
                  <Skeleton className="h-4 w-16" />
                </div>
              </div>
            </Card>
          ))}
        </div>
      ) : (displayContent?.length ?? 0) === 0 ? (
        <Card>
          <CardContent className="p-6 sm:p-8 lg:p-12 text-center">
            <BookOpen className="h-10 sm:h-12 w-10 sm:w-12 text-muted-foreground mx-auto mb-3 sm:mb-4" />
            <h3 className="text-base sm:text-lg font-medium text-foreground mb-2">
              {isFiltered ? "No matching content" : "No content yet"}
            </h3>
            <p className="text-xs sm:text-sm text-muted-foreground mb-4">
              {isFiltered
                ? "Try adjusting your filters or search terms to find content."
                : "Start building your knowledge base by adding your first content."}
            </p>
            <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 justify-center">
              <Link href="/dashboard/quick-capture">
                <Button size={isMobile ? "sm" : "default"}>
                  <Plus className="h-4 w-4 mr-2" /> Quick Capture
                </Button>
              </Link>
              {!isFiltered && (!tags || tags.length === 0) && (
                <Link href="/dashboard/neural-tags">
                  <Button variant="outline" size={isMobile ? "sm" : "default"}>
                    <Tag className="h-4 w-4 mr-2" /> Neural Tags
                  </Button>
                </Link>
              )}
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className={`grid ${gridColsClass} ${gapClass}`}>
          {displayContent.slice(0, 4).map((item) => {
            const itemTags = getTagsForContent(item.tagsId || []);

            return (
              <Link key={item.id} href={`/dashboard/content/${item.id}`}>
                <Card className="overflow-hidden hover:shadow-lg hover:shadow-[#E8DBFF]/40 transition-all duration-300 border-[#E4D7FF]/30 bg-white group hover:scale-[1.02] h-full cursor-pointer">
                  {/* Thumbnail Section */}
                  <div className="relative aspect-video bg-gradient-to-br from-[#F4F0FF] to-[#E4D7FF]/50 overflow-hidden">
                    <Image
                      src={getPreviewImage(item)}
                      alt={item.title}
                      fill
                      className="object-cover"
                      onError={(e) => {
                        // Fallback if image fails to load
                        (e.currentTarget as HTMLImageElement).src =
                          getDummyImage(item.contentType, item.id);
                      }}
                    />

                    {/* Type Badge */}
                    <div className="absolute top-2 sm:top-3 right-2 sm:right-3 text-xs px-2 py-1 rounded-full flex items-center gap-1 shadow-lg border bg-[#F4F0FF] text-[#7A70B6] border-[#E4D7FF]/40">
                      {getTypeIconComponent(item.contentType)}
                      <span className="hidden sm:inline">
                        {item.contentType}
                      </span>
                    </div>
                  </div>

                  {/* Content Section */}
                  <div className="p-3 sm:p-4 space-y-2 sm:space-y-3">
                    {/* Header */}
                    <div className="flex items-start justify-between gap-2 sm:gap-3">
                      <div className="flex-1 min-w-0">
                        <h3 className="text-sm sm:text-base text-[#2B235A] line-clamp-2 leading-snug font-medium break-words">
                          {item.title}
                        </h3>
                      </div>
                    </div>

                    {/* Description */}
                    <p className="text-xs sm:text-sm text-[#6B6B7C] line-clamp-2 leading-relaxed">
                      {item.description}
                    </p>

                    {/* Tags */}
                    <div className="flex flex-wrap gap-1">
                      {itemTags
                        .slice(0, isMobile ? 2 : 3)
                        .map((tag, tagIndex) => {
                          const tagColors = [
                            "bg-[#E4D7FF] text-[#7A70B6] border-[#C9B6FF]/30",
                            "bg-[#FFD8F0]/40 text-[#C9469E] border-[#FFD8F0]",
                            "bg-[#D6FFE5]/60 text-[#4CAF84] border-[#D6FFE5]",
                          ];
                          return (
                            <Badge
                              key={tag.id}
                              variant="secondary"
                              className={`text-xs rounded-full px-2 py-0.5 border ${
                                tagColors[tagIndex % tagColors.length]
                              }`}
                            >
                              {tag.tagName}
                            </Badge>
                          );
                        })}
                      {itemTags.length > (isMobile ? 2 : 3) && (
                        <Badge
                          variant="secondary"
                          className="text-xs rounded-full px-2 py-0.5 bg-[#F4F0FF] text-[#A59CCF] border-[#E4D7FF]/40 border"
                        >
                          +{itemTags.length - (isMobile ? 2 : 3)}
                        </Badge>
                      )}
                    </div>

                    {/* Footer */}
                    <div className="flex items-center justify-between gap-1 sm:gap-2 pt-2 text-xs text-[#A59CCF] flex-wrap">
                      <div className="flex items-center gap-1 whitespace-nowrap">
                        <Calendar className="w-3 h-3 flex-shrink-0" />
                        <span className="truncate">
                          {getTimeAgo(item.createdAt)}
                        </span>
                      </div>
                      <div className="flex items-center gap-1 whitespace-nowrap">
                        <User className="w-3 h-3 flex-shrink-0" />
                        <span className="truncate text-xs">
                          {item.contentSource || "Manual"}
                        </span>
                      </div>
                    </div>
                  </div>
                </Card>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default RecentlyAdded;
