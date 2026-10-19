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
}

export const AnalyticsCharts: React.FC<AnalyticsChartsProps> = ({
  stats,
  onFilterByPart,
  onFilterByStatus,
}) => {
  const topOverdueParts = stats?.topOverdueParts || [];
  const statusCounts = stats?.statusCounts;

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
          stepSize: 1,
          font: { size: 11 },
        },
        grid: {
          color: 'rgba(0, 0, 0, 0.05)',
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
        borderColor: '#FFFFFF',
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
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      
      {/* Top 5 Part Name Overdue > 30 Days (Primary User KPI) */}
      <div className="lg:col-span-2 bg-white p-5 rounded-xl border border-slate-200 shadow-xs flex flex-col justify-between">
        <div>
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-red-100 text-red-700 flex items-center justify-center">
                <AlertTriangle className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <span>Top 5 Part Name OFP Over &gt; 30 Hari</span>
                  <span className="text-[10px] bg-red-600 text-white font-bold px-1.5 py-0.5 rounded uppercase">
                    Critical Risk
                  </span>
                </h3>
                <p className="text-xs text-slate-500">
                  Part yang terancam di-reject oleh Supplier (HMMI/HML) dengan alasan &ldquo;OFP Not Return&rdquo;
                </p>
              </div>
            </div>
            <span className="text-xs text-slate-400 font-mono hidden sm:inline">
              Klik bar untuk filter
            </span>
          </div>

          <div className="h-64 mt-4 relative">
            {topOverdueParts.length > 0 ? (
              <Bar data={barChartData} options={barChartOptions} />
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-center p-6 text-slate-400">
                <ShieldAlert className="w-10 h-10 text-emerald-500 mb-2" />
                <p className="font-semibold text-slate-700 text-xs">Semua Part Masih dalam Batas Aman (&le; 30 Hari)</p>
                <p className="text-[11px] text-slate-400 mt-1 max-w-sm">
                  Hebat! Tidak ada klaim OFP yang melewati 30 hari. Seluruh aliran klaim ke supplier berjalan tepat waktu.
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Priority Quick Filter Badges */}
        {topOverdueParts.length > 0 && (
          <div className="mt-4 pt-3 border-t border-slate-100 flex flex-wrap items-center gap-2 text-xs text-slate-600">
            <span className="font-semibold text-slate-800">Prioritas Segera Follow-up:</span>
            {topOverdueParts.map((item, idx) => (
              <button
                key={idx}
                onClick={() => onFilterByPart(item.name)}
                className="text-red-700 hover:text-red-900 bg-red-50 hover:bg-red-100 px-2 py-0.5 rounded text-[11px] font-semibold flex items-center gap-1 transition-colors"
              >
                <span>#{idx + 1} {item.name}</span>
                <span className="font-mono text-red-800 font-bold">({item.maxDays} hr)</span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Tracking Status Breakdown Doughnut Chart */}
      <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs flex flex-col justify-between">
        <div>
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
                <PieChart className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900">Distribusi Status Tracking</h3>
                <p className="text-xs text-slate-500">Posisi fisik part saat ini</p>
              </div>
            </div>
          </div>

          <div className="h-64 mt-4 relative">
            <Doughnut data={doughnutData} options={doughnutOptions} />
          </div>
        </div>

        <div className="mt-4 pt-3 border-t border-slate-100 text-[11px] text-slate-500 flex items-center justify-between">
          <span>Target Pengiriman: &le; 30 Hari</span>
          <span className="font-mono font-bold text-slate-800">
            {stats?.totalRecords || 0} Total Part
          </span>
        </div>
      </div>

    </div>
  );
};
