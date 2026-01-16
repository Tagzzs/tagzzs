"use client";

import { useMemo, useState } from "react";
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from "chart.js";
import { Doughnut } from "react-chartjs-2";
import { TrendUp, Target, Stack } from "@phosphor-icons/react";
import { ContentItem } from "@/types";
import { Tag } from "@/hooks/useTags";

ChartJS.register(ArcElement, Tooltip, Legend);

interface MonthlyBreakdownProps {
  content: ContentItem[];
  tags: Tag[];
  loading?: boolean;
  onClick: () => void;
  selectedMonthIdx: number;
  selectedYear: number;
}

// Color palette for chart segments
const CHART_COLORS = [
  "#60A5FA", // Blue-400
  "#34D399", // Emerald-400
  "#FB7185", // Rose-400
  "#FBBF24", // Amber-400
  "#22D3EE", // Cyan-400
  "#E879F9", // Fuchsia-400
  "#A78BFA", // Violet-400
  "#F472B6", // Pink-400
];

export default function MonthlyBreakdown({
  content,
  tags,
  loading = false,
  onClick,
  selectedMonthIdx,
  selectedYear,
}: MonthlyBreakdownProps) {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  // Calculate breakdown from real content data
  const { chartData, legendItems, totalItems, topTag, growthPercent } =
    useMemo(() => {
      if (!content) {
        return {
          chartData: {
            labels: [],
            datasets: [{ data: [], backgroundColor: [], borderWidth: 0 }],
          },
          legendItems: [],
          totalItems: 0,
          topTag: "None",
          growthPercent: 0,
        };
      }

      // Filter for Current Month
      const currentMonthData = content.filter((item) => {
        const date = new Date(item.createdAt);
        return (
          date.getMonth() === selectedMonthIdx &&
          date.getFullYear() === selectedYear
        );
      });

      // Filter for Previous Month (for velocity)
      const prevMonthDate = new Date(selectedYear, selectedMonthIdx - 1);
      const prevMonthIdx = prevMonthDate.getMonth();
      const prevMonthYear = prevMonthDate.getFullYear();

      const prevMonthData = content.filter((item) => {
        const date = new Date(item.createdAt);
        // Handle year rollover logic if needed, but JS Date handles "Month - 1" correctly (idx -1 becomes Dec prev year)
        // Actually Date constructor handles Month overflow/underflow automatically
        // let's just use the calculated prevMonthIdx/Year from the date object
        return (
          date.getMonth() === prevMonthIdx &&
          date.getFullYear() === prevMonthYear
        );
      });

      // Count content by tag for Current Month
      const tagCounts: Record<string, number> = {};
      const tagNameMap: Record<string, string> = {};

      // Build tag name lookup
      tags.forEach((tag) => {
        tagNameMap[tag.id] = tag.tagName;
      });

      // Count items per tag
      currentMonthData.forEach((item) => {
        if (item.tagsId && item.tagsId.length > 0) {
          item.tagsId.forEach((tagId) => {
            const tagName = tagNameMap[tagId] || "Uncategorized";
            tagCounts[tagName] = (tagCounts[tagName] || 0) + 1;
          });
        } else {
          // Count content by type if no tags
          const type = item.contentType || "Other";
          tagCounts[type] = (tagCounts[type] || 0) + 1;
        }
      });

      // Sort by count and take top 6
      const sortedTags = Object.entries(tagCounts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 6);

      const labels = sortedTags.map(([name]) => name);
      const data = sortedTags.map(([, count]) => count);
      const total = data.reduce((sum, val) => sum + val, 0);

      const legendData = sortedTags.map(([name, count], index) => ({
        label: name,
        percentage: total > 0 ? `${Math.round((count / total) * 100)}%` : "0%",
        color: CHART_COLORS[index % CHART_COLORS.length],
      }));

      // Calculate growth (Velocity)
      let growth = 0;
      const currentTotal = currentMonthData.length;
      const prevTotal = prevMonthData.length;

      if (prevTotal > 0) {
        growth = Math.round(((currentTotal - prevTotal) / prevTotal) * 100);
      } else if (currentTotal > 0) {
        growth = 100;
      }

      return {
        chartData: {
          labels,
          datasets: [
            {
              data,
              backgroundColor: CHART_COLORS.slice(0, data.length),
              borderWidth: 0,
            },
          ],
        },
        legendItems: legendData,
        totalItems: currentTotal,
        topTag: labels[0] || "None",
        growthPercent: growth,
      };
    }, [content, tags, selectedMonthIdx, selectedYear]);

  const chartOptions: any = {
    responsive: true,
    maintainAspectRatio: false,
    cutout: "75%",
    plugins: {
      legend: {
        display: false,
      },
    },
    onHover: (event: any, elements: any) => {
      if (elements && elements.length > 0) {
        setHoveredIndex(elements[0].index);
      } else {
        setHoveredIndex(null);
      }
    },
  };

  // Loading skeleton
  if (loading) {
    return (
      <div className="glass-panel bg-[#050505] mt-12 p-5 flex flex-col lg:flex-row gap-6 items-center h-auto lg:h-96 animate-pulse">
        <div className="flex-1 h-full flex flex-col justify-center gap-4 w-full">
          <div className="h-6 bg-zinc-800/50 rounded w-1/3 ml-2" />
          <div className="h-10 bg-zinc-800/50 rounded w-1/4 ml-2" />
          <div className="flex items-center gap-6">
            <div className="h-64 w-64 rounded-full bg-zinc-800/30" />
            <div className="grid grid-cols-2 gap-4">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <div key={i} className="h-4 bg-zinc-800/30 rounded w-24" />
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Empty state
  if (content.length === 0) {
    return (
      <div className="glass-panel bg-[#050505] mt-12 p-5 flex flex-col items-center justify-center h-64">
        <p className="text-zinc-500 text-sm mb-1">No content to analyze</p>
        <p className="text-zinc-600 text-xs">
          Add content to see your breakdown
        </p>
      </div>
    );
  }

  return (
    <div
      onClick={onClick}
      className="glass-panel bg-[#050505] mt-12 p-6 flex flex-col xl:flex-row gap-8 items-center min-h-fit cursor-pointer hover:bg-white/5 transition-colors group/panel"
    >
      {/* Left Section */}
      <div className="flex-1 w-full flex flex-col justify-center gap-6">
        <div className="flex justify-between items-center w-full px-2">
          <div>
            <div className="text-xs md:text-sm font-bold text-zinc-500 uppercase tracking-widest mb-1">
              <span className="text-gradient">Monthly Breakdown</span>
            </div>
            <div className="text-2xl md:text-3xl lg:text-4xl mt-2 font-medium text-white">
              {totalItems}{" "}
              <span className="text-xs md:text-sm text-zinc-500 font-normal">
                items
              </span>
            </div>
          </div>
          {growthPercent > 0 && (
            <div className="flex items-center gap-1 bg-[#9F55FF]/20 border border-[#9F55FF]/30 px-2 py-0.5 rounded-full text-[15px] text-[#9F55FF] font-bold">
              <TrendUp size={15} weight="fill" />+{growthPercent}%
            </div>
          )}
        </div>

        <div className="flex flex-col md:flex-row items-center gap-8 justify-center w-full">
          {/* Doughnut Chart */}
          <div
            className="relative h-64 w-64 shrink-0"
            onMouseLeave={() => setHoveredIndex(null)}
          >
            <Doughnut data={chartData} options={chartOptions} />
            <div className="chart-center-text text-[8px] md:text-[10px] font-bold text-zinc-600">
              RATIO
            </div>
          </div>

          {/* Legend */}
          <div className="grid grid-cols-2 gap-x-6 gap-y-3 w-full sm:w-auto">
            {legendItems.map((item, index) => (
              <div
                key={index}
                className={`flex items-center gap-2 text-sm xl:text-[16px] transition-all duration-300 ${
                  hoveredIndex === index
                    ? "text-white scale-105 font-medium"
                    : hoveredIndex !== null
                    ? "text-zinc-600 blur-[1px]"
                    : "text-zinc-300"
                }`}
              >
                <div
                  className={`w-2 h-2 rounded-full shrink-0 transition-all duration-300 ${
                    hoveredIndex === index
                      ? "scale-150 ring-2 ring-white/20"
                      : ""
                  }`}
                  style={{ backgroundColor: item.color }}
                />
                <span className="truncate">{item.label}</span>
                <span
                  className={`ml-auto pl-4 transition-colors duration-300 ${
                    hoveredIndex === index ? "text-white" : "text-zinc-500"
                  }`}
                >
                  {item.percentage}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Divider */}
      <div className="hidden xl:block w-px h-[200px] bg-white/5 opacity-50" />

      {/* Side Stats */}
      <div className="w-full xl:w-64 flex flex-row xl:flex-col gap-4 self-stretch justify-center">
        <div className="flex-1 bg-[#111] p-5 rounded-2xl border border-white/5 hover:border-[#9F55FF]/50 transition-colors flex flex-col justify-center">
          <div className="flex items-center gap-2 text-[10px] md:text-xs text-zinc-500 font-bold uppercase mb-2">
            <Target size={14} weight="fill" className="text-[#9F55FF]" />
            Streaks
          </div>
          <div className="text-xl md:text-2xl font-bold text-white">
            {totalItems}
          </div>
        </div>
        <div className="flex-1 bg-[#111] p-5 rounded-2xl border border-white/5 hover:border-[#9F55FF]/50 transition-colors flex flex-col justify-center">
          <div className="flex items-center gap-2 text-[10px] md:text-xs text-zinc-500 font-bold uppercase mb-2">
            <Stack size={14} weight="fill" className="text-[#9F55FF]" />
            Top
          </div>
          <div
            className="text-xl md:text-2xl font-bold text-white truncate"
            title={topTag}
          >
            {topTag}
          </div>
        </div>
      </div>
    </div>
  );
}
