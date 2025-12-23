'use client';

import { Card } from './ui/card';
import { FileText, Tag, Calendar, TrendingUp } from 'lucide-react';
import { Skeleton } from './ui/skeleton';
import React from "react";
import { useIsMobile } from '@/hooks/use-mobile';

interface StatsCardsProps {
  isLoading: boolean;
  contentLength: number;
  tagsLength: number;
  thisWeekItems: number;
  topTagName: string;
  topTagCount: number;
}

export function StatsCards({ isLoading, contentLength, tagsLength, thisWeekItems, topTagName, topTagCount }: StatsCardsProps) {
  const isMobile = useIsMobile();

  const getStatsData = () => [
    {
      label: "Total Items",
      value: contentLength.toLocaleString(),
      icon: FileText,
      trend: thisWeekItems > 0 ? `+${thisWeekItems}` : undefined,
      color: 'text-violet-600',
      bgColor: 'bg-violet-50',
      changeColor: 'text-violet-600 bg-violet-50',
    },
    {
      label: "Tags Created",
      value: tagsLength.toString(),
      icon: Tag,
      trend: tagsLength === 0 ? undefined : `+${Math.ceil(tagsLength * 0.1)}`,
      color: 'text-purple-600',
      bgColor: 'bg-purple-50',
      changeColor: 'text-purple-600 bg-purple-50',
    },
    {
      label: "This Week",
      value: thisWeekItems.toString(),
      icon: Calendar,
      trend: thisWeekItems > 0 ? `+${Math.ceil(thisWeekItems * 0.18)}%` : undefined,
      color: 'text-indigo-600',
      bgColor: 'bg-indigo-50',
      changeColor: 'text-indigo-600 bg-indigo-50',
    },
    {
      label: "Most Used Tag",
      value: topTagName || "None yet",
      description: topTagCount > 0 ? `${topTagCount} uses` : undefined,
      icon: TrendingUp,
      color: 'text-pink-600',
      bgColor: 'bg-pink-50',
      changeColor: 'text-pink-600 bg-pink-50',
    },
  ];

  // Determine grid columns based on device size
  const gridColsClass = isMobile ? "grid-cols-1 sm:grid-cols-2" : "grid-cols-2 sm:grid-cols-4";

  return (
    <div className="mb-6">
      <div className={`grid ${gridColsClass} gap-3 max-w-full`}>
        {isLoading
          ? Array.from({ length: 4 }).map((_, index) => (
            <Card key={index} className="p-3 bg-card shadow-sm border border-border">
              <div className="flex items-center justify-between mb-2">
                <Skeleton className="w-6 h-6 rounded-md" />
                <Skeleton className="h-4 w-8 rounded-full" />
              </div>
              <Skeleton className="h-5 w-16 mb-1" />
              <Skeleton className="h-3 w-20" />
            </Card>
          ))
          : getStatsData().map((stat) => (
            <Card key={stat.label} className="p-3 bg-card shadow-sm border border-border hover:shadow-md transition-shadow">
              <div className="flex items-center justify-between mb-2">
                <div className={`w-6 h-6 ${stat.bgColor} rounded-md flex items-center justify-center flex-shrink-0`}>
                  <stat.icon className={`w-3 h-3 ${stat.color}`} />
                </div>
                {stat.trend && (
                  <span className={`text-xs px-1.5 py-0.5 rounded-full ${stat.changeColor} whitespace-nowrap`}>
                    {stat.trend}
                  </span>
                )}
              </div>
              <div className="text-lg text-foreground mb-1 truncate">{stat.value}</div>
              <div className="text-xs text-muted-foreground line-clamp-2">
                {stat.description || stat.label}
              </div>
            </Card>
          ))}
      </div>
    </div>
  );
}
