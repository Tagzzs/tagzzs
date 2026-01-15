import { useMemo } from 'react';
import { X, TrendUp, TrendDown, Minus } from '@phosphor-icons/react';
import {
    Chart as ChartJS,
    CategoryScale,
    LinearScale,
    BarElement,
    Tooltip,
    Legend
} from 'chart.js';
import { Bar } from 'react-chartjs-2';
import { ContentItem } from '@/types';
import { Tag } from '@/hooks/useTags';

ChartJS.register(CategoryScale, LinearScale, BarElement, Tooltip, Legend);

interface BreakdownModalProps {
    isOpen: boolean;
    onClose: () => void;
    content: ContentItem[];
    tags: Tag[];
    selectedMonthIdx: number;
    selectedYear: number;
}

export default function BreakdownModal({ 
    isOpen, 
    onClose, 
    content = [], 
    tags = [],
    selectedMonthIdx,
    selectedYear
}: BreakdownModalProps) {
    
    // Calculate stats
    const stats = useMemo(() => {
        if (!content) return null;

        // Current Month Data
        const currentMonthData = content.filter(item => {
            const date = new Date(item.createdAt);
            return date.getMonth() === selectedMonthIdx && date.getFullYear() === selectedYear;
        });

        // Previous Month Data
        const prevMonthDate = new Date(selectedYear, selectedMonthIdx - 1);
        const prevMonthIdx = prevMonthDate.getMonth();
        const prevMonthYear = prevMonthDate.getFullYear();

        const prevMonthData = content.filter(item => {
            const date = new Date(item.createdAt);
            return date.getMonth() === prevMonthIdx && date.getFullYear() === prevMonthYear;
        });

        // 1. Total Items
        const totalItems = currentMonthData.length;
        const prevTotal = prevMonthData.length;

        // 2. Velocity
        let velocity = 0;
        if (prevTotal > 0) {
            velocity = Math.round(((totalItems - prevTotal) / prevTotal) * 100);
        } else if (totalItems > 0) {
            velocity = 100; // 100% growth if prev was 0
        }

        // 3. Top Category & Distribution
        const tagCounts: Record<string, number> = {};
        const tagNameMap: Record<string, string> = {};
        tags.forEach(t => tagNameMap[t.id] = t.tagName);

        currentMonthData.forEach(item => {
            if (item.tagsId && item.tagsId.length > 0) {
                item.tagsId.forEach(id => {
                    const name = tagNameMap[id] || 'Uncategorized';
                    tagCounts[name] = (tagCounts[name] || 0) + 1;
                });
            } else {
                 const type = item.contentType || 'Other';
                 tagCounts[type] = (tagCounts[type] || 0) + 1;
            }
        });

        const sortedTags = Object.entries(tagCounts)
            .sort((a, b) => b[1] - a[1]);

        const topCategory = sortedTags.length > 0 ? sortedTags[0][0] : 'None';
        
        // Chart Data (Top 8)
        const chartLabels = sortedTags.slice(0, 8).map(t => t[0]);
        const chartValues = sortedTags.slice(0, 8).map(t => t[1]);

        return {
            totalItems,
            topCategory,
            velocity,
            chartLabels,
            chartValues
        };
    }, [content, tags, selectedMonthIdx, selectedYear]);

    if (!isOpen || !stats) return null;

    const chartData = {
        labels: stats.chartLabels,
        datasets: [{
            label: 'Items',
            data: stats.chartValues,
            backgroundColor: '#9F55FF',
            borderRadius: 4
        }]
    };

    const chartOptions = {
        indexAxis: 'y' as const,
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: {
                display: false
            }
        },
        scales: {
            x: {
                grid: {
                    color: '#333'
                },
                ticks: {
                    color: '#666'
                }
            },
            y: {
                grid: {
                    display: false
                },
                ticks: {
                    color: '#ccc'
                }
            }
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
            {/* Overlay */}
            <div
                className="absolute inset-0 bg-black/80 backdrop-blur-sm modal-overlay"
                onClick={onClose}
            />

            {/* Modal Content */}
            <div className="relative bg-[#09090b] w-full max-w-2xl h-auto max-h-[85vh] rounded-3xl border border-white/10 shadow-2xl flex flex-col overflow-hidden modal-content mx-4 p-8">
                {/* Header */}
                <div className="flex justify-between items-center mb-6">
                    <h2 className="text-3xl font-bold text-white">Monthly Analytics</h2>
                    <button
                        onClick={onClose}
                        className="h-8 w-8 bg-white/5 rounded-full flex items-center justify-center text-zinc-400 hover:bg-white hover:text-black transition-colors"
                    >
                        <X size={14} weight="bold" />
                    </button>
                </div>

                {/* Summary Stats */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
                    {/* Total Items */}
                    <div className="bg-[#111] p-4 rounded-xl border border-white/5 group hover:border-[#9F55FF]/50 transition-colors">
                        <div className="text-xs text-zinc-500 mb-1">Total Items</div>
                        <div className="text-2xl font-bold flex items-center gap-1 text-white">
                            {stats.totalItems}
                        </div>
                    </div>

                    {/* Top Category */}
                    <div className="bg-[#111] p-4 rounded-xl border border-white/5 group hover:border-[#9F55FF]/50 transition-colors">
                         <div className="text-xs text-zinc-500 mb-1">Top Category</div>
                         <div className="text-2xl font-bold flex items-center gap-1 text-[#9F55FF]">
                            {stats.topCategory}
                         </div>
                    </div>
                    
                    {/* Velocity */}
                    <div className="bg-[#111] p-4 rounded-xl border border-white/5 group hover:border-[#9F55FF]/50 transition-colors">
                         <div className="text-xs text-zinc-500 mb-1">Velocity</div>
                         <div className="text-2xl font-bold flex items-center gap-1 text-white">
                            {stats.velocity > 0 ? '+' : ''}{stats.velocity}%
                            {stats.velocity > 0 ? (
                                <TrendUp size={18} weight="fill" className="text-emerald-400" />
                            ) : stats.velocity < 0 ? (
                                <TrendDown size={18} weight="fill" className="text-rose-400" />
                            ) : (
                                <Minus size={18} weight="bold" className="text-zinc-500" />
                            )}
                         </div>
                    </div>
                </div>

                {/* Chart */}
                <div className="flex-1 bg-[#111] rounded-xl border border-white/5 p-4 min-h-[300px] flex flex-col">
                    <h3 className="text-xs font-bold text-zinc-500 uppercase tracking-widest mb-4">
                        Distribution by Tag
                    </h3>
                    <div className="flex-1 relative w-full h-full">
                         {stats.chartLabels.length > 0 ? (
                            <Bar data={chartData} options={chartOptions} />
                         ) : (
                            <div className="h-full w-full flex items-center justify-center text-zinc-600">
                                No data for this month
                            </div>
                         )}
                    </div>
                </div>
            </div>
        </div>
    );
}
