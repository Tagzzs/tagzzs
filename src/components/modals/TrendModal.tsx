'use client';

import { X } from '@phosphor-icons/react';
import {
    Chart as ChartJS,
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    Filler,
    Legend
} from 'chart.js';
import { Line } from 'react-chartjs-2';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Filler, Legend);

interface TrendModalProps {
    isOpen: boolean;
    onClose: () => void;
}

const summaryStats = [
    { color: 'bg-white', label: 'Focus Hours', value: '1,204', unit: 'hrs' },
    { color: 'bg-zinc-500', label: 'Tasks Done', value: '842', unit: 'items' },
    { color: 'bg-zinc-700', label: 'Streak', value: '14', unit: 'days' },
    { color: 'border border-zinc-500', label: 'Efficiency', value: '94', unit: '/ 100' }
];

export default function TrendModal({ isOpen, onClose }: TrendModalProps) {
    if (!isOpen) return null;

    const data = {
        labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
        datasets: [
            {
                label: 'Focus Hours',
                data: [65, 59, 80, 81, 56, 55, 40, 70, 90, 100, 85, 95],
                borderColor: '#A064FF',
                backgroundColor: (context: { chart: ChartJS }) => {
                    const chart = context.chart;
                    const { ctx, chartArea } = chart;
                    if (!chartArea) return 'rgba(160, 100, 255, 0)';

                    const gradient = ctx.createLinearGradient(0, 0, 0, 400);
                    gradient.addColorStop(0, 'rgba(160, 100, 255, 0.35)');
                    gradient.addColorStop(1, 'rgba(160, 100, 255, 0)');
                    return gradient;
                },
                fill: true,
                tension: 0.4
            },
            {
                label: 'Tasks Completed',
                data: [28, 48, 40, 19, 86, 27, 90, 60, 70, 85, 90, 100],
                borderColor: '#71717a',
                borderDash: [5, 5],
                tension: 0.4,
                pointRadius: 0
            }
        ]
    };

    const options = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: {
                labels: {
                    color: '#999'
                }
            }
        },
        scales: {
            y: {
                grid: {
                    color: '#222'
                },
                ticks: {
                    color: '#666'
                }
            },
            x: {
                grid: {
                    display: false
                },
                ticks: {
                    color: '#666'
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
            <div className="relative bg-[#09090b] w-full max-w-4xl h-[80vh] rounded-3xl border border-white/10 shadow-2xl flex flex-col overflow-hidden modal-content mx-4 p-8">
                {/* Header */}
                <div className="flex justify-between items-center mb-2">
                    <div>
                        <h2 className="text-3xl font-bold text-white">Productivity Overview</h2>
                        <p className="text-zinc-500 text-sm">Yearly performance metrics</p>
                    </div>
                    <button
                        onClick={onClose}
                        className="h-8 w-8 bg-white/5 rounded-full flex items-center justify-center text-zinc-400 hover:bg-white hover:text-black transition-colors"
                    >
                        <X size={14} weight="bold" />
                    </button>
                </div>

                <div className="w-full h-px bg-white/5 my-6" />

                {/* Chart */}
                <div className="flex-1 relative w-full min-h-0">
                    <Line data={data} options={options} />
                </div>

                {/* Summary Stats */}
                <div className="grid grid-cols-4 gap-4 mt-8">
                    {summaryStats.map((stat, index) => (
                        <div key={index} className="bg-[#111] p-4 rounded-xl border border-white/5">
                            <div className="flex items-center gap-2 mb-2">
                                <div className={`w-2 h-2 rounded-full ${stat.color}`} />
                                <span className="text-[10px] text-zinc-400 uppercase">{stat.label}</span>
                            </div>
                            <div className="text-xl font-bold text-white">
                                {stat.value} <span className="text-xs text-zinc-600 font-normal">{stat.unit}</span>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
