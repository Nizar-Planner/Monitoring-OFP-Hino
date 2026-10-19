import React from 'react';
import {
  Clock,
  Package,
  Truck,
  CheckCircle2,
  AlertOctagon,
  ArrowRight,
  ShieldAlert,
  ChevronRight,
  Bell
} from 'lucide-react';
import { StatsData, TrackingStatus } from '../types';

interface WorkflowTrackerCardsProps {
  stats: StatsData | null;
  activeStatusFilter: string;
  onSelectStatusFilter: (status: string) => void;
  isOverdueFilterActive: boolean;
  onToggleOverdueFilter: () => void;
}

export const WorkflowTrackerCards: React.FC<WorkflowTrackerCardsProps> = ({
  stats,
  activeStatusFilter,
  onSelectStatusFilter,
  isOverdueFilterActive,
  onToggleOverdueFilter,
}) => {
  const total = stats?.totalRecords || 0;
  const waitingOfp = stats?.statusCounts.waitingOfp || 0;
  const notYetShipped = stats?.statusCounts.notYetShipped || 0;
  const delivered = stats?.statusCounts.delivered || 0;
  const overdueCount = stats?.statusCounts.overdueCount || 0;
  const pendingQuality = stats?.pendingQualityVerificationCount || 0;

  const waitingPct = total > 0 ? Math.round((waitingOfp / total) * 100) : 0;
  const notYetPct = total > 0 ? Math.round((notYetShipped / total) * 100) : 0;
  const deliveredPct = total > 0 ? Math.round((delivered / total) * 100) : 0;

  return (
    <div className="space-y-4">
      {/* Critical SLA Alert Banner: Overdue > 30 Days */}
      {overdueCount > 0 && (
        <div className="bg-red-600 text-white rounded-xl p-4 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3 animate-fade-in">
          <div className="flex items-start sm:items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-white/20 flex items-center justify-center shrink-0">
              <AlertOctagon className="w-6 h-6 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-sm sm:text-base tracking-tight">
                  PERINGATAN KRITIS: {overdueCount} KLAIM OPF MELEBIHI 30 HARI!
                </span>
                <span className="bg-white text-red-700 font-black text-[11px] px-2 py-0.5 rounded uppercase">
                  Batas Supplier
                </span>
              </div>
              <p className="text-xs text-red-100 mt-0.5 max-w-3xl">
                Part yang melebihi leadtime 30 hari berisiko tinggi di-<strong>REJECT oleh Supplier HMMI/HML</strong> dengan alasan <em>&ldquo;OFP Not Return&rdquo;</em>. Segera lakukan penarikan fisik dari dealer atau pengiriman ke supplier.
              </p>
            </div>
          </div>

          <button
            onClick={onToggleOverdueFilter}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition-all whitespace-nowrap shadow-xs ${
              isOverdueFilterActive
                ? 'bg-slate-900 text-white ring-2 ring-white'
                : 'bg-white text-red-700 hover:bg-red-50'
            }`}
          >
            {isOverdueFilterActive ? 'Tampilkan Semua Data' : `Filter ${overdueCount} Part Overdue > 30 Hari`}
          </button>
        </div>
      )}

      {/* Internal Notification for Tim Quality */}
      {pendingQuality > 0 && (
        <div className="bg-blue-50 border border-blue-200 text-blue-900 rounded-xl px-4 py-3 flex items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2.5">
            <Bell className="w-4 h-4 text-blue-600 animate-bounce shrink-0" />
            <span>
              <strong>Notifikasi Tim Quality:</strong> Ada <strong>{pendingQuality} part OFP</strong> yang sudah diterima Tim Area di HMSI dan sedang menunggu pemeriksaan fisik &amp; foto verifikasi Tim Quality!
            </span>
          </div>
          <button
            onClick={() => onSelectStatusFilter('Not yet shipped')}
            className="text-xs font-bold text-blue-700 hover:underline shrink-0"
          >
            Lihat Part &rarr;
          </button>
        </div>
      )}

      {/* 3 Status Tracking Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        
        {/* Card 1: Waiting OFP */}
        <button
          onClick={() => onSelectStatusFilter(activeStatusFilter === 'Waiting OFP' ? 'all' : 'Waiting OFP')}
          className={`text-left p-5 rounded-xl border transition-all relative overflow-hidden bg-white ${
            activeStatusFilter === 'Waiting OFP' && !isOverdueFilterActive
              ? 'border-amber-500 ring-2 ring-amber-500/20 shadow-md'
              : 'border-slate-200 hover:border-slate-300 hover:shadow-xs'
          }`}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-lg bg-amber-50 text-amber-700 flex items-center justify-center">
                <Clock className="w-5 h-5" />
              </div>
              <div>
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block">Status 1</span>
                <span className="text-sm font-bold text-slate-900">Waiting OFP</span>
              </div>
            </div>
            <span className="text-2xl font-extrabold text-amber-600 font-mono tabular-nums">
              {waitingOfp}
            </span>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
            <span>Porsi: <strong className="text-slate-800 font-mono">{waitingPct}%</strong> dari total</span>
            <span className="flex items-center gap-0.5 text-amber-700 font-medium">
              Filter status <ChevronRight className="w-3.5 h-3.5" />
            </span>
          </div>
          <p className="text-[11px] text-slate-500 mt-2 line-clamp-2">
            Part belum tiba di transit HMSI. Masih berada di bengkel dealer atau sedang dalam perjalanan ekspedisi ke HMSI.
          </p>
        </button>

        {/* Card 2: Not yet shipped */}
        <button
          onClick={() => onSelectStatusFilter(activeStatusFilter === 'Not yet shipped' ? 'all' : 'Not yet shipped')}
          className={`text-left p-5 rounded-xl border transition-all relative overflow-hidden bg-white ${
            activeStatusFilter === 'Not yet shipped' && !isOverdueFilterActive
              ? 'border-blue-500 ring-2 ring-blue-500/20 shadow-md'
              : 'border-slate-200 hover:border-slate-300 hover:shadow-xs'
          }`}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-lg bg-blue-50 text-blue-700 flex items-center justify-center">
                <Package className="w-5 h-5" />
              </div>
              <div>
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block">Status 2</span>
                <span className="text-sm font-bold text-slate-900">Not yet shipped</span>
              </div>
            </div>
            <span className="text-2xl font-extrabold text-blue-600 font-mono tabular-nums">
              {notYetShipped}
            </span>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
            <span>Porsi: <strong className="text-slate-800 font-mono">{notYetPct}%</strong> dari total</span>
            <span className="flex items-center gap-0.5 text-blue-700 font-medium">
              Filter status <ChevronRight className="w-3.5 h-3.5" />
            </span>
          </div>
          <p className="text-[11px] text-slate-500 mt-2 line-clamp-2">
            Part fisik sudah diterima Tim Area di HMSI. Sedang menunggu pengecekan/verifikasi Tim Quality untuk segera dikirimkan ke HMMI/HML.
          </p>
        </button>

        {/* Card 3: Delivered */}
        <button
          onClick={() => onSelectStatusFilter(activeStatusFilter === 'Delivered' ? 'all' : 'Delivered')}
          className={`text-left p-5 rounded-xl border transition-all relative overflow-hidden bg-white ${
            activeStatusFilter === 'Delivered' && !isOverdueFilterActive
              ? 'border-emerald-500 ring-2 ring-emerald-500/20 shadow-md'
              : 'border-slate-200 hover:border-slate-300 hover:shadow-xs'
          }`}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center">
                <Truck className="w-5 h-5" />
              </div>
              <div>
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block">Status 3</span>
                <span className="text-sm font-bold text-slate-900">Delivered (HMMI/HML)</span>
              </div>
            </div>
            <span className="text-2xl font-extrabold text-emerald-600 font-mono tabular-nums">
              {delivered}
            </span>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
            <span>Porsi: <strong className="text-slate-800 font-mono">{deliveredPct}%</strong> dari total</span>
            <span className="flex items-center gap-0.5 text-emerald-700 font-medium">
              Filter status <ChevronRight className="w-3.5 h-3.5" />
            </span>
          </div>
          <p className="text-[11px] text-slate-500 mt-2 line-clamp-2">
            Part sudah berhasil dikirimkan ke Supplier HMMI / HML sebelum batas waktu. Klaim garansi aman dari penolakan &ldquo;OFP Not Return&rdquo;.
          </p>
        </button>

      </div>
    </div>
  );
};
