import React, { useState, useEffect, useCallback } from 'react';
import { Header } from './components/Header';
import { WorkflowTrackerCards } from './components/WorkflowTrackerCards';
import { AnalyticsCharts } from './components/AnalyticsCharts';
import { DataTable } from './components/DataTable';
import { DetailModal } from './components/DetailModal';
import { ManualEntryModal } from './components/ManualEntryModal';
import { ActionVerificationModal } from './components/ActionVerificationModal';
import { ExcelUploadModal } from './components/ExcelUploadModal';
import { DeployGuideModal } from './components/DeployGuideModal';
import { OpfRecord, StatsData, ExcelImportResult } from './types';
import { Truck, AlertTriangle, CheckCircle2, FileSpreadsheet, ShieldAlert, ArrowUpRight, Clock, ShieldCheck, Building } from 'lucide-react';

export default function App() {
  const [records, setRecords] = useState<OpfRecord[]>([]);
  const [stats, setStats] = useState<StatsData | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Filters & State
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [isOverdueFilterActive, setIsOverdueFilterActive] = useState(false);

  // Modals
  const [selectedRecord, setSelectedRecord] = useState<OpfRecord | null>(null);
  const [actionRecord, setActionRecord] = useState<OpfRecord | null>(null);
  const [isUploadExcelOpen, setIsUploadExcelOpen] = useState(false);
  const [isManualModalOpen, setIsManualModalOpen] = useState(false);
  const [isGuideModalOpen, setIsGuideModalOpen] = useState(false);

  // Toast Notification
  const [toastMessage, setToastMessage] = useState<{ text: string; type: 'success' | 'error' | 'warning' } | null>(null);

  const showToast = (text: string, type: 'success' | 'error' | 'warning' = 'success') => {
    setToastMessage({ text, type });
    setTimeout(() => {
      setToastMessage(null);
    }, 4500);
  };

  // Fetch data
  const fetchData = useCallback(async () => {
    try {
      setIsLoading(true);
      const [recRes, statsRes] = await Promise.all([
        fetch('/api/opf').then((r) => r.json()),
        fetch('/api/stats').then((r) => r.json()),
      ]);

      if (recRes.success) setRecords(recRes.data);
      if (statsRes.success) setStats(statsRes.data);
    } catch (err) {
      console.error('Error fetching dashboard data:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Handle manual create / edit
  const handleCreateOrUpdate = async (record: OpfRecord) => {
    try {
      const res = await fetch('/api/opf', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(record),
      }).then((r) => r.json());

      if (res.success) {
        showToast(res.message || 'Data OPF berhasil disimpan.', 'success');
        await fetchData();
      } else {
        showToast(res.error || 'Gagal menyimpan data.', 'error');
      }
    } catch (err) {
      console.error(err);
      showToast('Terjadi kesalahan saat menyimpan data.', 'error');
    }
  };

  // Handle delete
  const handleDeleteRecord = async (id: number) => {
    try {
      const res = await fetch(`/api/opf/${id}`, { method: 'DELETE' }).then((r) => r.json());
      if (res.success) {
        showToast('Data klaim OPF berhasil dihapus.', 'success');
        await fetchData();
        if (selectedRecord?.id === id) setSelectedRecord(null);
        if (actionRecord?.id === id) setActionRecord(null);
      } else {
        showToast(res.error || 'Gagal menghapus data.', 'error');
      }
    } catch (err) {
      console.error(err);
      showToast('Gagal menghubungi server.', 'error');
    }
  };

  // Excel upload success handler
  const handleExcelSuccess = async (result: ExcelImportResult) => {
    showToast(
      `Berhasil mengimpor Excel! ${result.recordsInserted} data baru ditambahkan, ${result.recordsUpdated} data diperbarui.`,
      'success'
    );
    await fetchData();
  };

  return (
    <div className="min-h-screen bg-slate-100/70 text-slate-900 font-sans antialiased">
      
      {/* Toast Notification */}
      {toastMessage && (
        <div className={`fixed bottom-5 right-5 z-50 flex items-center gap-2.5 px-4 py-3 rounded-xl shadow-lg border text-xs sm:text-sm font-semibold transition-all transform animate-bounce bg-white ${
          toastMessage.type === 'error'
            ? 'border-red-300 text-red-800'
            : toastMessage.type === 'warning'
            ? 'border-amber-300 text-amber-800'
            : 'border-emerald-300 text-emerald-800'
        }`}>
          {toastMessage.type === 'error' ? (
            <AlertTriangle className="w-5 h-5 text-red-600 shrink-0" />
          ) : toastMessage.type === 'warning' ? (
            <Clock className="w-5 h-5 text-amber-600 shrink-0" />
          ) : (
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
          )}
          <span>{toastMessage.text}</span>
        </div>
      )}

      {/* Main Header */}
      <Header
        onOpenUploadExcel={() => setIsUploadExcelOpen(true)}
        onOpenManualEntry={() => setIsManualModalOpen(true)}
        onOpenGuide={() => setIsGuideModalOpen(true)}
        activeStatusFilter={statusFilter}
        setActiveStatusFilter={(st) => {
          setStatusFilter(st);
          setIsOverdueFilterActive(false);
        }}
      />

      {/* Page Content Container */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        
        {/* Context Hero Banner */}
        <div className="relative rounded-2xl overflow-hidden border border-slate-200 bg-slate-900 shadow-xs">
          <div className="absolute inset-0">
            <img
              src="/src/assets/images/hino_truck_fleet_1792158559046.jpg"
              alt="Armada Hino Indonesia"
              className="w-full h-full object-cover opacity-20"
              referrerPolicy="no-referrer"
            />
            <div className="absolute inset-0 bg-gradient-to-r from-slate-950 via-slate-900/90 to-transparent"></div>
          </div>

          <div className="relative p-6 sm:p-8 flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="max-w-3xl space-y-2">
              <div className="flex items-center gap-2 text-xs font-semibold text-red-400">
                <Truck className="w-4 h-4" />
                <span>PT HINO MOTORS SALES INDONESIA (HMSI)</span>
                <span>·</span>
                <span className="text-slate-300">DIVISI QUALITY ASSURANCE</span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white">
                Sistem Monitoring &amp; Tracking Part OFP (Dealer &rarr; HMSI &rarr; HMMI/HML)
              </h1>
              <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
                Mencegah penolakan klaim garansi oleh supplier pabrik akibat <strong>Lead Time &gt; 30 Hari (&ldquo;OFP Not Return&rdquo;)</strong>. Memfasilitasi serah terima fisik part di transit HMSI oleh <strong>Tim Area</strong> dan verifikasi teknis oleh <strong>Tim Quality</strong> lengkap dengan bukti foto digital.
              </p>
            </div>

            <div className="flex flex-col sm:flex-row gap-3 shrink-0">
              <button
                onClick={() => setIsUploadExcelOpen(true)}
                className="flex items-center justify-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold transition-all shadow-md active:scale-95"
              >
                <FileSpreadsheet className="w-4 h-4" />
                <span>Upload Excel Monitoring</span>
              </button>

              <button
                onClick={() => setIsGuideModalOpen(true)}
                className="flex items-center justify-center gap-1.5 px-4 py-2.5 bg-white/10 hover:bg-white/20 text-white rounded-lg text-xs font-semibold transition-colors border border-white/20"
              >
                <span>Panduan Alur</span>
                <ArrowUpRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>

        {/* 1. Status Indicator Cards (Delivered, Waiting OFP, Not yet shipped) + Overdue Alert */}
        <WorkflowTrackerCards
          stats={stats}
          activeStatusFilter={statusFilter}
          onSelectStatusFilter={(st) => {
            setStatusFilter(st);
            setIsOverdueFilterActive(false);
          }}
          isOverdueFilterActive={isOverdueFilterActive}
          onToggleOverdueFilter={() => setIsOverdueFilterActive(!isOverdueFilterActive)}
        />

        {/* 2. Analytics Charts (Top 5 Part Name Over > 30 Hari + Status Distribution) */}
        <AnalyticsCharts
          stats={stats}
          onFilterByPart={(partName) => setSearchTerm(partName)}
          onFilterByStatus={(st) => {
            setStatusFilter(st);
            setIsOverdueFilterActive(false);
          }}
        />

        {/* 3. Comprehensive Data Table & Fast Search */}
        <div className="space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
            <div>
              <h3 className="text-base font-bold text-slate-900">
                Master Data Monitoring Klaim Part OFP
              </h3>
              <p className="text-xs text-slate-500">
                Diambil dari file Excel monitoring OneDrive kantor atau input teknisi lapangan
              </p>
            </div>

            <div className="flex items-center gap-2">
              <a
                href="/api/download-template"
                className="text-xs text-slate-600 hover:text-slate-900 hover:underline flex items-center gap-1 font-medium"
              >
                <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
                <span>Unduh Template Excel</span>
              </a>
              <span className="text-slate-300">·</span>
              <a
                href="/api/export/csv"
                className="text-xs text-slate-600 hover:text-slate-900 hover:underline font-medium"
              >
                Export CSV
              </a>
            </div>
          </div>

          <DataTable
            records={records}
            isLoading={isLoading}
            onSelectRecord={(rec) => setSelectedRecord(rec)}
            onOpenActionModal={(rec) => setActionRecord(rec)}
            onDeleteRecord={handleDeleteRecord}
            searchTerm={searchTerm}
            setSearchTerm={setSearchTerm}
            statusFilter={statusFilter}
            setStatusFilter={setStatusFilter}
            isOverdueFilterActive={isOverdueFilterActive}
            setIsOverdueFilterActive={setIsOverdueFilterActive}
          />
        </div>

      </main>

      {/* Footer */}
      <footer className="mt-12 border-t border-slate-200 bg-white py-6 text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <span className="w-5 h-5 rounded bg-red-600 text-white font-black text-xs flex items-center justify-center">
              H
            </span>
            <span className="font-semibold text-slate-800">
              Hino Motors Sales Indonesia (HMSI) · OPF SLA Monitoring System
            </span>
            <span>·</span>
            <span>SQLite Database</span>
          </div>
          <div className="flex items-center gap-4 text-[11px] text-slate-400">
            <span>Target SLA: &le; 30 Hari</span>
            <span>·</span>
            <span>Bukti Foto Digital Tim Area &amp; Quality</span>
          </div>
        </div>
      </footer>

      {/* MODAL 1: Detail Modal */}
      <DetailModal
        record={selectedRecord}
        onClose={() => setSelectedRecord(null)}
        onOpenActionModal={(rec) => {
          setSelectedRecord(null);
          setActionRecord(rec);
        }}
      />

      {/* MODAL 2: Action & Verification Modal (Tim Area & Tim Quality) */}
      <ActionVerificationModal
        record={actionRecord}
        onClose={() => setActionRecord(null)}
        onSuccess={async () => {
          showToast('Data serah terima & foto verifikasi berhasil diperbarui!', 'success');
          await fetchData();
        }}
      />

      {/* MODAL 3: Excel Upload Modal */}
      <ExcelUploadModal
        isOpen={isUploadExcelOpen}
        onClose={() => setIsUploadExcelOpen(false)}
        onSuccess={handleExcelSuccess}
      />

      {/* MODAL 4: Manual Entry Modal */}
      <ManualEntryModal
        isOpen={isManualModalOpen}
        onClose={() => setIsManualModalOpen(false)}
        onSubmit={handleCreateOrUpdate}
      />

      {/* MODAL 5: Deployment & Operational Guide */}
      <DeployGuideModal
        isOpen={isGuideModalOpen}
        onClose={() => setIsGuideModalOpen(false)}
      />

    </div>
  );
}
