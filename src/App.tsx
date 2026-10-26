import React, { useState, useEffect, useCallback } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { LoginView } from './components/LoginView';
import { Header } from './components/Header';
import { WorkflowTrackerCards } from './components/WorkflowTrackerCards';
import { AnalyticsCharts } from './components/AnalyticsCharts';
import { DataTable } from './components/DataTable';
import { DetailModal } from './components/DetailModal';
import { ManualEntryModal } from './components/ManualEntryModal';
import { ActionVerificationModal } from './components/ActionVerificationModal';
import { ExcelUploadModal } from './components/ExcelUploadModal';
import { PrintTagView } from './components/PrintTagView';
import { RollbackModal } from './components/RollbackModal';
import { OpfRecord, StatsData, ExcelImportResult } from './types';
import { Truck, AlertTriangle, CheckCircle2, FileSpreadsheet, Clock, ShieldCheck, Building, Loader2 } from 'lucide-react';

function DashboardApp() {
  const { user, profile, role, permissions, isLoading: isAuthLoading } = useAuth();

  const [records, setRecords] = useState<OpfRecord[]>([]);
  const [stats, setStats] = useState<StatsData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSupabaseActive, setIsSupabaseActive] = useState(false);
  const [isSchemaSynced, setIsSchemaSynced] = useState(true);
  const [isDarkMode, setIsDarkMode] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('hino_theme');
      if (saved) return saved === 'dark';
      return window.matchMedia('(prefers-color-scheme: dark)').matches;
    }
    return false;
  });

  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('hino_theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('hino_theme', 'light');
    }
  }, [isDarkMode]);

  const toggleDarkMode = () => setIsDarkMode((prev) => !prev);

  // Filters & State
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [isOverdueFilterActive, setIsOverdueFilterActive] = useState(false);

  // Modals
  const [selectedRecord, setSelectedRecord] = useState<OpfRecord | null>(null);
  const [actionRecord, setActionRecord] = useState<OpfRecord | null>(null);
  const [rollbackRecord, setRollbackRecord] = useState<OpfRecord | null>(null);
  const [isUploadExcelOpen, setIsUploadExcelOpen] = useState(false);
  const [isManualModalOpen, setIsManualModalOpen] = useState(false);
  const [isPrintTagOpen, setIsPrintTagOpen] = useState(false);
  const [tagsToPrint, setTagsToPrint] = useState<OpfRecord[]>([]);

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
      const [recRes, statsRes, sbRes] = await Promise.all([
        fetch('/api/opf').then((r) => r.json()).catch(() => ({ success: false })),
        fetch('/api/stats').then((r) => r.json()).catch(() => ({ success: false })),
        fetch('/api/supabase/status').then((r) => r.json()).catch(() => ({ success: false, active: false })),
      ]);

      if (recRes.success) setRecords(recRes.data);
      if (statsRes.success) setStats(statsRes.data);
      if (sbRes.success) {
        setIsSupabaseActive(Boolean(sbRes.active));
        setIsSchemaSynced(sbRes.isSchemaSynced !== false);
      }
    } catch (err) {
      console.error('Error fetching dashboard data:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (user) {
      fetchData();
    }
  }, [user, fetchData]);

  // Handle manual create / edit
  const handleCreateOrUpdate = async (record: OpfRecord) => {
    try {
      const res = await fetch('/api/opf', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(record),
      }).then((r) => r.json());

      if (res.success) {
        showToast(res.message || 'Data OFP berhasil disimpan.', 'success');
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
        showToast('Data klaim OFP berhasil dihapus.', 'success');
        await fetchData();
        if (selectedRecord?.id === id) setSelectedRecord(null);
        if (actionRecord?.id === id) setActionRecord(null);
        if (rollbackRecord?.id === id) setRollbackRecord(null);
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

  // Open Print Tag View Modal
  const handleOpenPrintTags = (selected: OpfRecord[]) => {
    if (!selected || selected.length === 0) {
      showToast('Pilih minimal satu data part di tabel untuk mencetak tag!', 'warning');
      return;
    }
    setTagsToPrint(selected);
    setIsPrintTagOpen(true);
  };

  // Loading state
  if (isAuthLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-900 text-white font-sans">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-4 border-red-500 border-t-transparent rounded-full animate-spin"></div>
          <span className="text-sm font-semibold tracking-wide text-slate-300">
            Memuat Sistem Hino OFP Tracking...
          </span>
        </div>
      </div>
    );
  }

  // Auth gate: If user is not authenticated, show corporate login view
  if (!user) {
    return <LoginView />;
  }

  return (
    <div className="min-h-screen w-full overflow-x-hidden bg-slate-100/70 dark:bg-slate-950 text-slate-900 dark:text-slate-100 font-sans antialiased transition-colors duration-200">
      
      {/* Toast Notification */}
      {toastMessage && (
        <div className={`fixed bottom-5 right-5 z-50 flex items-center gap-2.5 px-4 py-3 rounded-xl shadow-xl border text-xs sm:text-sm font-semibold transition-all transform animate-bounce bg-white dark:bg-slate-900 ${
          toastMessage.type === 'error'
            ? 'border-red-300 dark:border-red-800 text-red-800 dark:text-red-300'
            : toastMessage.type === 'warning'
            ? 'border-amber-300 dark:border-amber-800 text-amber-800 dark:text-amber-300'
            : 'border-emerald-300 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300'
        }`}>
          {toastMessage.type === 'error' ? (
            <AlertTriangle className="w-5 h-5 text-red-600 dark:text-red-400 shrink-0" />
          ) : toastMessage.type === 'warning' ? (
            <Clock className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0" />
          ) : (
            <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0" />
          )}
          <span>{toastMessage.text}</span>
        </div>
      )}

      {/* Main Header with User Role & Switcher */}
      <Header
        onOpenUploadExcel={() => setIsUploadExcelOpen(true)}
        onOpenManualEntry={() => setIsManualModalOpen(true)}
        activeStatusFilter={statusFilter}
        isSupabaseActive={isSupabaseActive}
        isDarkMode={isDarkMode}
        onToggleTheme={toggleDarkMode}
        setActiveStatusFilter={(st) => {
          setStatusFilter(st);
          setIsOverdueFilterActive(false);
        }}
      />

      {/* Page Content Container */}
      <main className="w-full max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-5 sm:py-6 space-y-6">
        
        {/* Context Hero Banner */}
        <div className="relative rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-800 bg-slate-900 shadow-xs">
          <div className="absolute inset-0">
            <img
              src="/src/assets/images/hino_truck_fleet_1792158559046.jpg"
              alt="Armada Hino Indonesia"
              className="w-full h-full object-cover opacity-20"
              referrerPolicy="no-referrer"
            />
            <div className="absolute inset-0 bg-gradient-to-r from-slate-950 via-slate-900/90 to-transparent"></div>
          </div>

          <div className="relative p-5 sm:p-6 lg:p-8 flex flex-col lg:flex-row lg:items-center justify-between gap-5 sm:gap-6">
            <div className="max-w-3xl space-y-2">
              <div className="flex items-center gap-2 text-xs font-semibold text-red-400">
                <Truck className="w-4 h-4 shrink-0" />
                <span>PT HINO MOTORS SALES INDONESIA (HMSI)</span>
                <span>·</span>
                <span className="text-slate-300">HMSI-FIELD QUALITY</span>
              </div>
              <h1 className="text-xl sm:text-2xl lg:text-3xl font-extrabold tracking-tight text-white leading-tight">
                Sistem Monitoring &amp; Tracking Part OFP (Dealer &rarr; HMSI &rarr; HMMI/HML)
              </h1>
              <p className="text-xs sm:text-sm text-slate-300 leading-relaxed font-medium">
                Harap diperhatikan terkait lead Time OFP &gt; 30 Hari Agar tidak mendapatkan judgement QPI menjadi (OFP Not Return)!
              </p>
            </div>

            {/* Role-protected Upload Excel action button on Hero Banner */}
            {permissions.canUploadExcel && (
              <div className="flex items-center gap-3 shrink-0">
                <button
                  onClick={() => setIsUploadExcelOpen(true)}
                  className="w-full sm:w-auto flex items-center justify-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold transition-all shadow-md active:scale-95 cursor-pointer"
                  title="Unggah File Excel Monitoring Baru"
                >
                  <FileSpreadsheet className="w-4 h-4" />
                  <span>Upload Excel Monitoring</span>
                </button>
              </div>
            )}
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
          isDarkMode={isDarkMode}
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
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                Master Data Monitoring Klaim Part OFP
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Diambil dari file Excel monitoring OneDrive kantor atau input teknisi lapangan
              </p>
            </div>

            <div className="flex items-center gap-2">
              <a
                href="/api/download-template"
                className="text-xs text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:underline flex items-center gap-1 font-medium transition-colors"
              >
                <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                <span>Unduh Template Excel</span>
              </a>
              <span className="text-slate-300 dark:text-slate-700">·</span>
              <a
                href="/api/export/csv"
                className="text-xs text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:underline font-medium transition-colors"
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
            onOpenRollbackModal={(rec) => setRollbackRecord(rec)}
            onDeleteRecord={handleDeleteRecord}
            searchTerm={searchTerm}
            setSearchTerm={setSearchTerm}
            statusFilter={statusFilter}
            setStatusFilter={setStatusFilter}
            isOverdueFilterActive={isOverdueFilterActive}
            setIsOverdueFilterActive={setIsOverdueFilterActive}
            onPrintTags={handleOpenPrintTags}
          />
        </div>

      </main>

      {/* Footer */}
      <footer className="mt-12 border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 py-6 text-xs text-slate-500 dark:text-slate-400 transition-colors">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <span className="w-5 h-5 rounded bg-red-600 text-white font-black text-xs flex items-center justify-center">
              H
            </span>
            <span className="font-semibold text-slate-800 dark:text-slate-200">
              Hino Motors Sales Indonesia (HMSI) · OFP SLA Monitoring System
            </span>
            <span>·</span>
            <span>Database Terhubung</span>
          </div>
          <div className="flex items-center gap-4 text-[11px] text-slate-400 dark:text-slate-500">
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
        onPrintTag={(rec) => handleOpenPrintTags([rec])}
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

      {/* MODAL 5: Original Failure Part Tag Print Preview & Sheet */}
      <PrintTagView
        isOpen={isPrintTagOpen}
        onClose={() => setIsPrintTagOpen(false)}
        selectedRecords={tagsToPrint}
        onRemoveRecord={(key) =>
          setTagsToPrint((prev) => prev.filter((r) => (r.id ? r.id !== key : r.dtr_number !== key)))
        }
      />

      {/* MODAL 6: Rollback / Reject Modal ke Tim Area */}
      <RollbackModal
        record={rollbackRecord}
        onClose={() => setRollbackRecord(null)}
        onSuccess={async () => {
          showToast('Part berhasil di-rollback ke Tim Area dengan catatan revisi.', 'warning');
          await fetchData();
        }}
      />

    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <DashboardApp />
    </AuthProvider>
  );
}
