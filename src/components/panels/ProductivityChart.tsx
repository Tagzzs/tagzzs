'use client';

import { useRef } from 'react';
import {
    Chart as ChartJS,
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    Filler
} from 'chart.js';
import { Line } from 'react-chartjs-2';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Filler);

interface ProductivityChartProps {
    onClick: () => void;
}

export default function ProductivityChart({ onClick }: ProductivityChartProps) {
    const chartRef = useRef<ChartJS<'line'>>(null);

    const data = {
        labels: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12],
        datasets: [{
            data: [40, 30, 80, 20, 55, 65, 60, 62, 70, 45, 25, 40],
            borderColor: '#A064FF',
            borderWidth: 2,
            backgroundColor: (context: { chart: ChartJS }) => {
                const chart = context.chart;
                const { ctx, chartArea } = chart;
                if (!chartArea) return 'rgba(160, 100, 255, 0)';

                const gradient = ctx.createLinearGradient(0, 0, 0, 300);
                gradient.addColorStop(0, 'rgba(160, 100, 255, 0.35)');
                gradient.addColorStop(1, 'rgba(160, 100, 255, 0)');
                return gradient;
            },
            fill: true,
            tension: 0.4,
            pointRadius: 0
        }]
    };

    const options = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: {
                display: false
            }
        },
        scales: {
            x: {
                display: false
            },
            y: {
                display: false
            }
        }
    };

    return (
        <div
            onClick={onClick}
            className="glass-panel bg-[#050505] p-4 h-96 flex flex-col cursor-pointer hover:bg-white/5 transition-colors group/trend"
        >
            <h3 className="text-[12px] font-bold text-zinc-500 uppercase tracking-widest mb-4 group-hover/trend:text-white transition-colors">
                Productivity
            </h3>
            <div className="flex-1 w-full relative flex items-end pb-2">
                <Line ref={chartRef} data={data} options={options} />
            </div>
        </div>
    );
}
