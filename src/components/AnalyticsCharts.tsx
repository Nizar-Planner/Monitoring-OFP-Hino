import React from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
} from 'chart.js';
import { Bar, Doughnut } from 'react-chartjs-2';
import { StatsData } from '../types';
import { AlertTriangle, PieChart, Clock, ShieldAlert } from 'lucide-react';

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend
);

interface AnalyticsChartsProps {
  stats: StatsData | null;
  onFilterByPart: (partName: string) => void;
  onFilterByStatus: (status: string) => void;
  isDarkMode?: boolean;
}

export const AnalyticsCharts: React.FC<AnalyticsChartsProps> = ({
  stats,
  onFilterByPart,
  onFilterByStatus,
  isDarkMode = false,
}) => {
  const topOverdueParts = stats?.topOverdueParts || [];
  const statusCounts = stats?.statusCounts;

  const tickColor = isDarkMode ? '#94a3b8' : '#64748b';
  const gridColor = isDarkMode ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.05)';
  const textColor = isDarkMode ? '#e2e8f0' : '#334155';

  // Bar Chart for Top 5 Part Name OFP yang Over > 30 Hari
  const barChartData = {
    labels: topOverdueParts.map((p) => p.name),
    datasets: [
      {
        label: 'Jumlah Unit Overdue (>30 Hari)',
        data: topOverdueParts.map((p) => p.overdueCount),
        backgroundColor: [
          'rgba(220, 38, 38, 0.9)', // Red 600
          'rgba(239, 68, 68, 0.85)',
          'rgba(248, 113, 113, 0.85)',
          'rgba(234, 88, 12, 0.85)', // Orange
          'rgba(217, 119, 6, 0.85)', // Amber
        ],
        borderRadius: 6,
        maxBarThickness: 38,
      },
    ],
  };

  const barChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: false,
      },
      tooltip: {
        callbacks: {
          label: (context: any) => {
            const index = context.dataIndex;
            const item = topOverdueParts[index];
            return ` ${item.overdueCount} part tertahan (Leadtime terlama: ${item.maxDays} hari)`;
          },
        },
      },
    },
    scales: {
      x: {
        grid: { display: false },
        ticks: {
          color: tickColor,
          font: { size: 11 },
          maxRotation: 20,
          callback: function (_val: any, index: number) {
            const label = topOverdueParts[index]?.name || '';
            return label.length > 20 ? label.substring(0, 18) + '...' : label;
          },
        },
      },
      y: {
        beginAtZero: true,
        ticks: {
          color: tickColor,
          stepSize: 1,
          font: { size: 11 },
        },
        grid: {
          color: gridColor,
        },
      },
    },
    onClick: (_event: any, elements: any[]) => {
      if (elements.length > 0) {
        const index = elements[0].index;
        const part = topOverdueParts[index]?.name;
        if (part) {
          onFilterByPart(part);
        }
      }
    },
  };

  // Doughnut Chart for Tracking Status Breakdown
  const doughnutData = {
    labels: ['Waiting OFP (Dealer)', 'Not yet shipped (HMSI)', 'Delivered (HMMI/HML)'],
    datasets: [
      {
        data: [
          statusCounts?.waitingOfp || 0,
          statusCounts?.notYetShipped || 0,
          statusCounts?.delivered || 0,
        ],
        backgroundColor: [
          '#D97706', // Amber (Waiting OFP)
          '#2563EB', // Blue (Not yet shipped)
          '#10B981', // Emerald (Delivered)
        ],
        borderWidth: 2,
        borderColor: isDarkMode ? '#0f172a' : '#FFFFFF',
      },
    ],
  };

  const doughnutOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'bottom' as const,
        labels: {
          color: textColor,
          boxWidth: 12,
          padding: 12,
          font: { size: 11 },
        },
      },
    },
    onClick: (_event: any, elements: any[]) => {
      if (elements.length > 0) {
        const index = elements[0].index;
        const statuses = ['Waiting OFP', 'Not yet shipped', 'Delivered'];
        if (statuses[index]) {
          onFilterByStatus(statuses[index]);
        }
      }
    },
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6 w-full">
      
      {/* Top 5 Part Name Overdue > 30 Days (Primary User KPI) */}
      <div className="lg:col-span-2 bg-white dark:bg-slate-900 p-4 sm:p-5 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col justify-between transition-colors min-w-0 w-full">
        <div>
          <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-red-100 dark:bg-red-950/60 text-red-700 dark:text-red-400 flex items-center justify-center">
                <AlertTriangle className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <span>Top 5 Part Name OFP Over &gt; 30 Hari</span>
                  <span className="text-[10px] bg-red-600 text-white font-bold px-1.5 py-0.5 rounded uppercase">
                    Critical Risk
                  </span>
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Part yang terancam di-reject oleh Supplier (HMMI/HML) dengan alasan &ldquo;OFP Not Return&rdquo;
                </p>
              </div>
            </div>
            <span className="text-xs text-slate-400 dark:text-slate-500 font-mono hidden sm:inline">
              Klik bar untuk filter
            </span>
          </div>

          <div className="h-64 mt-4 relative">
            {topOverdueParts.length > 0 ? (
              <Bar data={barChartData} options={barChartOptions} />
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-center p-6 text-slate-400 dark:text-slate-500">
                <ShieldAlert className="w-10 h-10 text-emerald-500 mb-2" />
                <p className="font-semibold text-slate-700 dark:text-slate-200 text-xs">Semua Part Masih dalam Batas Aman (&le; 30 Hari)</p>
                <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-1 max-w-sm">
                  Hebat! Tidak ada klaim OFP yang melewati 30 hari. Seluruh aliran klaim ke supplier berjalan tepat waktu.
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Priority Quick Filter Badges */}
        {topOverdueParts.length > 0 && (
          <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 flex flex-wrap items-center gap-2 text-xs text-slate-600 dark:text-slate-400">
            <span className="font-semibold text-slate-800 dark:text-slate-200">Prioritas Segera Follow-up:</span>
            {topOverdueParts.map((item, idx) => (
              <button
                key={idx}
                onClick={() => onFilterByPart(item.name)}
                className="text-red-700 dark:text-red-300 hover:text-red-900 dark:hover:text-red-200 bg-red-50 dark:bg-red-950/60 hover:bg-red-100 dark:hover:bg-red-900/60 px-2 py-0.5 rounded text-[11px] font-semibold flex items-center gap-1 transition-colors border border-red-200/60 dark:border-red-800/60"
              >
                <span>#{idx + 1} {item.name}</span>
                <span className="font-mono text-red-800 dark:text-red-200 font-bold">({item.maxDays} hr)</span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Tracking Status Breakdown Doughnut Chart */}
      <div className="bg-white dark:bg-slate-900 p-5 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col justify-between transition-colors">
        <div>
          <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center">
                <PieChart className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">Distribusi Status Tracking</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">Posisi fisik part saat ini</p>
              </div>
            </div>
          </div>

          <div className="h-64 mt-4 relative">
            <Doughnut data={doughnutData} options={doughnutOptions} />
          </div>
        </div>

        <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 text-[11px] text-slate-500 dark:text-slate-400 flex items-center justify-between">
          <span>Target Pengiriman: &le; 30 Hari</span>
          <span className="font-mono font-bold text-slate-800 dark:text-slate-200">
            {stats?.totalRecords || 0} Total Part
          </span>
        </div>
      </div>

    </div>
  );
};
