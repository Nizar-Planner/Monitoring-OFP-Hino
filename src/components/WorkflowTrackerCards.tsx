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
  Bell,
  Layers
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
    <div className="space-y-4 w-full">
      {/* Critical SLA Alert Banner: Overdue > 30 Days */}
      {overdueCount > 0 && (
        <div className="bg-red-600 text-white rounded-xl p-4 sm:p-5 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3.5 animate-fade-in w-full">
          <div className="flex items-start sm:items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-white/20 flex items-center justify-center shrink-0">
              <AlertOctagon className="w-6 h-6 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-extrabold text-sm sm:text-base tracking-tight">
                  PERINGATAN KRITIS: {overdueCount} KLAIM OFP MELEBIHI 30 HARI!
                </span>
                <span className="bg-white text-red-700 font-black text-[11px] px-2 py-0.5 rounded uppercase">
                  Batas Supplier
                </span>
              </div>
              <p className="text-xs text-red-100 mt-1 max-w-3xl leading-relaxed">
                Part yang melebihi leadtime 30 hari berisiko tinggi di-<strong>REJECT oleh Supplier HMMI/HML</strong> dengan alasan <em>&ldquo;OFP Not Return&rdquo;</em>. Segera lakukan penarikan fisik dari dealer atau pengiriman ke supplier.
              </p>
            </div>
          </div>

          <button
            onClick={onToggleOverdueFilter}
            className={`w-full sm:w-auto px-4 py-2.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap shadow-xs cursor-pointer text-center ${
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
        <div className="bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800 text-blue-900 dark:text-blue-200 rounded-xl px-4 py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 text-xs w-full">
          <div className="flex items-center gap-2.5">
            <Bell className="w-4 h-4 text-blue-600 dark:text-blue-400 animate-bounce shrink-0" />
            <span>
              <strong>Notifikasi Tim Quality:</strong> Ada <strong>{pendingQuality} part OFP</strong> yang sudah diterima Tim Area di HMSI dan sedang menunggu pemeriksaan fisik &amp; foto verifikasi Tim Quality!
            </span>
          </div>
          <button
            onClick={() => onSelectStatusFilter('Not yet shipped')}
            className="text-xs font-bold text-blue-700 dark:text-blue-400 hover:underline shrink-0 text-left sm:text-right cursor-pointer"
          >
            Lihat Part &rarr;
          </button>
        </div>
      )}

      {/* 4 Metric Cards: grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5 sm:gap-4 w-full">
        
        {/* Card 1: Total Klaim (Semua Data) */}
        <button
          onClick={() => onSelectStatusFilter('all')}
          className={`text-left p-4 sm:p-5 rounded-xl border transition-all relative overflow-hidden bg-white dark:bg-slate-900 cursor-pointer ${
            activeStatusFilter === 'all' && !isOverdueFilterActive
              ? 'border-red-500 ring-2 ring-red-500/20 shadow-md'
              : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 hover:shadow-xs'
          }`}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-9 h-9 rounded-lg bg-red-50 dark:bg-red-950/60 text-red-600 dark:text-red-400 flex items-center justify-center shrink-0">
                <Layers className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <span className="text-[10px] sm:text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider block">Total Data</span>
                <span className="text-sm font-bold text-slate-900 dark:text-white truncate block">Semua Part OFP</span>
              </div>
            </div>
            <span className="text-2xl font-extrabold text-slate-900 dark:text-white font-mono tabular-nums shrink-0 ml-2">
              {total}
            </span>
          </div>

          <div className="mt-3.5 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
            <span>Klaim: <strong className="text-slate-800 dark:text-slate-200 font-mono">100%</strong> aktif</span>
            <span className="flex items-center gap-0.5 text-red-600 dark:text-red-400 font-semibold text-[11px]">
              Tampilkan semua <ChevronRight className="w-3.5 h-3.5" />
            </span>
          </div>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-2 line-clamp-2">
            Seluruh data klaim part OFP terdaftar dari file Excel monitoring dealer.
          </p>
        </button>

        {/* Card 2: Belum Terkirim / Waiting OFP */}
        <button
          onClick={() => onSelectStatusFilter((activeStatusFilter === 'Belum Terkirim' || activeStatusFilter === 'Waiting OFP') ? 'all' : 'Belum Terkirim')}
          className={`text-left p-4 sm:p-5 rounded-xl border transition-all relative overflow-hidden bg-white dark:bg-slate-900 cursor-pointer ${
            (activeStatusFilter === 'Belum Terkirim' || activeStatusFilter === 'Waiting OFP') && !isOverdueFilterActive
              ? 'border-amber-500 ring-2 ring-amber-500/20 shadow-md'
              : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 hover:shadow-xs'
          }`}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-9 h-9 rounded-lg bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-400 flex items-center justify-center shrink-0">
                <Clock className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <span className="text-[10px] sm:text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider block">Status 1</span>
                <span className="text-sm font-bold text-slate-900 dark:text-white truncate block">Belum Terkirim</span>
              </div>
            </div>
            <span className="text-2xl font-extrabold text-amber-600 dark:text-amber-400 font-mono tabular-nums shrink-0 ml-2">
              {waitingOfp}
            </span>
          </div>

          <div className="mt-3.5 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
            <span>Porsi: <strong className="text-slate-800 dark:text-slate-200 font-mono">{waitingPct}%</strong></span>
            <span className="flex items-center gap-0.5 text-amber-700 dark:text-amber-400 font-semibold text-[11px]">
              Filter status <ChevronRight className="w-3.5 h-3.5" />
            </span>
          </div>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-2 line-clamp-2">
            Kolom <em>OFP Receive</em> kosong di Excel. Part masih berada di bengkel dealer.
          </p>
        </button>

        {/* Card 3: Received by Area */}
        <button
          onClick={() => onSelectStatusFilter((activeStatusFilter === 'Received by Area' || activeStatusFilter === 'Not yet shipped') ? 'all' : 'Received by Area')}
          className={`text-left p-4 sm:p-5 rounded-xl border transition-all relative overflow-hidden bg-white dark:bg-slate-900 cursor-pointer ${
            (activeStatusFilter === 'Received by Area' || activeStatusFilter === 'Not yet shipped') && !isOverdueFilterActive
              ? 'border-blue-500 ring-2 ring-blue-500/20 shadow-md'
              : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 hover:shadow-xs'
          }`}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-9 h-9 rounded-lg bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-400 flex items-center justify-center shrink-0">
                <Package className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <span className="text-[10px] sm:text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider block">Status 2</span>
                <span className="text-sm font-bold text-slate-900 dark:text-white truncate block">Received Area</span>
              </div>
            </div>
            <span className="text-2xl font-extrabold text-blue-600 dark:text-blue-400 font-mono tabular-nums shrink-0 ml-2">
              {notYetShipped}
            </span>
          </div>

          <div className="mt-3.5 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
            <span>Porsi: <strong className="text-slate-800 dark:text-slate-200 font-mono">{notYetPct}%</strong></span>
            <span className="flex items-center gap-0.5 text-blue-700 dark:text-blue-400 font-semibold text-[11px]">
              Filter status <ChevronRight className="w-3.5 h-3.5" />
            </span>
          </div>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-2 line-clamp-2">
            Kolom <em>OFP Receive</em> terisi di Excel. Part fisik telah diterima Tim Area di HMSI.
          </p>
        </button>

        {/* Card 4: Sent to HMMI */}
        <button
          onClick={() => onSelectStatusFilter((activeStatusFilter === 'Sent to HMMI' || activeStatusFilter === 'Delivered') ? 'all' : 'Sent to HMMI')}
          className={`text-left p-4 sm:p-5 rounded-xl border transition-all relative overflow-hidden bg-white dark:bg-slate-900 cursor-pointer ${
            (activeStatusFilter === 'Sent to HMMI' || activeStatusFilter === 'Delivered') && !isOverdueFilterActive
              ? 'border-emerald-500 ring-2 ring-emerald-500/20 shadow-md'
              : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 hover:shadow-xs'
          }`}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-9 h-9 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 flex items-center justify-center shrink-0">
                <Truck className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <span className="text-[10px] sm:text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider block">Status 3</span>
                <span className="text-sm font-bold text-slate-900 dark:text-white truncate block">Sent to HMMI</span>
              </div>
            </div>
            <span className="text-2xl font-extrabold text-emerald-600 dark:text-emerald-400 font-mono tabular-nums shrink-0 ml-2">
              {delivered}
            </span>
          </div>

          <div className="mt-3.5 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
            <span>Porsi: <strong className="text-slate-800 dark:text-slate-200 font-mono">{deliveredPct}%</strong></span>
            <span className="flex items-center gap-0.5 text-emerald-700 dark:text-emerald-400 font-semibold text-[11px]">
              Filter status <ChevronRight className="w-3.5 h-3.5" />
            </span>
          </div>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-2 line-clamp-2">
            Kolom <em>OFP Send to HMMI</em> terisi. Part fisik telah dikirimkan ke Supplier Pabrik HMMI/HML.
          </p>
        </button>

      </div>
    </div>
  );
};
