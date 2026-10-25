import React from 'react';
import {
  FileSpreadsheet,
  Download,
  Plus,
  BookOpen,
  HelpCircle,
  FileDown,
  Sun,
  Moon
} from 'lucide-react';

interface HeaderProps {
  onOpenUploadExcel: () => void;
  onOpenManualEntry: () => void;
  activeStatusFilter: string;
  setActiveStatusFilter: (status: string) => void;
  isSupabaseActive?: boolean;
  isDarkMode?: boolean;
  onToggleTheme?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  onOpenUploadExcel,
  onOpenManualEntry,
  activeStatusFilter,
  setActiveStatusFilter,
  isSupabaseActive = false,
  isDarkMode = false,
  onToggleTheme,
}) => {
  return (
    <header className="sticky top-0 z-40 w-full bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 transition-colors">
      <div className="w-full max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-2 sm:gap-4">
        
        {/* Zone 1: Brand Wordmark */}
        <div className="flex items-center gap-2.5 sm:gap-3 shrink-0 min-w-0">
          <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-lg bg-red-600 flex items-center justify-center text-white font-black text-base sm:text-lg shadow-xs shrink-0">
            H
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5 sm:gap-2">
              <span className="text-sm sm:text-base font-extrabold tracking-tight text-slate-900 dark:text-white truncate">
                HINO OFP TRACKER
              </span>
              <span className="text-[10px] font-bold text-red-700 dark:text-red-400 bg-red-50 dark:bg-red-950/60 border border-red-200 dark:border-red-800 px-1.5 py-0.5 rounded uppercase hidden xs:inline shrink-0">
                HMSI Quality
              </span>
              <div className="flex items-center gap-1 text-[10px] font-medium text-slate-500 dark:text-slate-400 font-mono shrink-0 ml-1">
                <span className={`w-1.5 h-1.5 rounded-full ${isSupabaseActive ? 'bg-emerald-500' : 'bg-slate-400'}`}></span>
                <span className="hidden sm:inline">{isSupabaseActive ? 'Supabase Live' : 'Local Storage'}</span>
              </div>
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 hidden md:block truncate">
              Monitoring Leadtime Part: Dealer &rarr; HMSI &rarr; HMMI / HML (Target &le; 30 Hari)
            </p>
          </div>
        </div>

        {/* Zone 2: Navigation / Quick Status Filters (Desktop) */}
        <nav className="hidden xl:flex items-center gap-1 bg-slate-100 dark:bg-slate-800/80 p-1 rounded-lg text-xs font-semibold shrink-0">
          <button
            onClick={() => setActiveStatusFilter('all')}
            className={`px-3 py-1.5 rounded-md transition-colors whitespace-nowrap ${
              activeStatusFilter === 'all'
                ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            Semua Part
          </button>
          <button
            onClick={() => setActiveStatusFilter('Waiting OFP')}
            className={`px-3 py-1.5 rounded-md transition-colors whitespace-nowrap ${
              activeStatusFilter === 'Waiting OFP'
                ? 'bg-white dark:bg-slate-700 text-amber-700 dark:text-amber-400 shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            Waiting OFP (Dealer)
          </button>
          <button
            onClick={() => setActiveStatusFilter('Not yet shipped')}
            className={`px-3 py-1.5 rounded-md transition-colors whitespace-nowrap ${
              activeStatusFilter === 'Not yet shipped'
                ? 'bg-white dark:bg-slate-700 text-blue-700 dark:text-blue-400 shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            Not yet shipped (HMSI)
          </button>
          <button
            onClick={() => setActiveStatusFilter('Delivered')}
            className={`px-3 py-1.5 rounded-md transition-colors whitespace-nowrap ${
              activeStatusFilter === 'Delivered'
                ? 'bg-white dark:bg-slate-700 text-emerald-700 dark:text-emerald-400 shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            Delivered (Supplier)
          </button>
        </nav>

        {/* Zone 3: Primary Action Controls */}
        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
          
          {/* Dark Mode Toggle */}
          {onToggleTheme && (
            <button
              onClick={onToggleTheme}
              className="p-2 text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 rounded-lg transition-colors cursor-pointer"
              title={isDarkMode ? 'Beralih ke Mode Terang (Light Mode)' : 'Beralih ke Mode Malam (Dark Mode)'}
              aria-label="Toggle Dark Mode"
            >
              {isDarkMode ? (
                <Sun className="w-4 h-4 text-amber-400" />
              ) : (
                <Moon className="w-4 h-4 text-slate-700" />
              )}
            </button>
          )}

          {/* Download Template Excel */}
          <a
            href="/api/download-template"
            className="hidden lg:flex items-center gap-1.5 px-2.5 sm:px-3 py-2 text-xs font-medium text-slate-700 dark:text-slate-300 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 rounded-lg transition-colors whitespace-nowrap"
            title="Download Template Excel Resmi HMSI"
          >
            <FileDown className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400" />
            <span>Template Excel</span>
          </a>

          {/* Manual Input DTR */}
          <button
            onClick={onOpenManualEntry}
            className="flex items-center gap-1.5 px-2.5 sm:px-3 py-2 text-xs font-semibold text-slate-700 dark:text-slate-300 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 rounded-lg transition-colors whitespace-nowrap cursor-pointer active:scale-95"
            title="Input Manual 1 DTR"
          >
            <Plus className="w-3.5 h-3.5 text-red-600 dark:text-red-400" />
            <span className="hidden sm:inline">Input DTR</span>
          </button>

          {/* Export CSV */}
          <a
            href="/api/export/csv"
            className="hidden sm:flex items-center gap-1.5 px-2.5 sm:px-3 py-2 text-xs font-semibold text-slate-700 dark:text-slate-300 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 rounded-lg transition-colors whitespace-nowrap"
            title="Download seluruh data dalam format CSV untuk Excel"
          >
            <Download className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400" />
            <span className="hidden md:inline">Export CSV</span>
          </a>

          {/* Upload Excel Button (Primary Action) */}
          <button
            onClick={onOpenUploadExcel}
            className="flex items-center gap-1.5 sm:gap-2 px-3 sm:px-3.5 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 active:scale-95 rounded-lg transition-all shadow-xs whitespace-nowrap cursor-pointer"
          >
            <FileSpreadsheet className="w-4 h-4" />
            <span>Upload Excel</span>
          </button>

        </div>

      </div>

      {/* Sub-bar for mobile/tablet status filter tabs */}
      <div className="xl:hidden border-t border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-900/90 px-3 sm:px-6 py-2 overflow-x-auto w-full">
        <div className="flex items-center gap-1.5 min-w-max">
          <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 mr-1 shrink-0">Status:</span>
          {(['all', 'Waiting OFP', 'Not yet shipped', 'Delivered'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveStatusFilter(tab)}
              className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors cursor-pointer whitespace-nowrap ${
                activeStatusFilter === tab
                  ? 'bg-slate-900 dark:bg-slate-700 text-white font-semibold shadow-xs'
                  : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-750'
              }`}
            >
              {tab === 'all'
                ? 'Semua Part'
                : tab === 'Waiting OFP'
                ? 'Waiting OFP'
                : tab === 'Not yet shipped'
                ? 'Not yet shipped'
                : 'Delivered'}
            </button>
          ))}
        </div>
      </div>
    </header>
  );
};
