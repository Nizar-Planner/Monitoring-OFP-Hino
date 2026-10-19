import React from 'react';
import {
  FileSpreadsheet,
  Download,
  Plus,
  BookOpen,
  HelpCircle,
  FileDown
} from 'lucide-react';

interface HeaderProps {
  onOpenUploadExcel: () => void;
  onOpenManualEntry: () => void;
  onOpenGuide: () => void;
  activeStatusFilter: string;
  setActiveStatusFilter: (status: string) => void;
}

export const Header: React.FC<HeaderProps> = ({
  onOpenUploadExcel,
  onOpenManualEntry,
  onOpenGuide,
  activeStatusFilter,
  setActiveStatusFilter,
}) => {
  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
        
        {/* Zone 1: Brand Wordmark */}
        <div className="flex items-center gap-3 shrink-0">
          <div className="w-9 h-9 rounded-lg bg-red-600 flex items-center justify-center text-white font-black text-lg shadow-sm">
            H
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-base font-extrabold tracking-tight text-slate-900 whitespace-nowrap">
                HINO OFP TRACKER
              </span>
              <span className="text-[10px] font-bold text-red-700 bg-red-50 border border-red-200 px-1.5 py-0.5 rounded uppercase">
                HMSI Quality Hub
              </span>
            </div>
            <p className="text-[11px] text-slate-500 hidden sm:block">
              Monitoring Leadtime Part: Dealer &rarr; HMSI &rarr; HMMI / HML (Target &le; 30 Hari)
            </p>
          </div>
        </div>

        {/* Zone 2: Navigation / Quick Status Filters */}
        <nav className="hidden lg:flex items-center gap-1 bg-slate-100 p-1 rounded-lg text-xs font-semibold">
          <button
            onClick={() => setActiveStatusFilter('all')}
            className={`px-3 py-1.5 rounded-md transition-colors whitespace-nowrap ${
              activeStatusFilter === 'all'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Semua Part
          </button>
          <button
            onClick={() => setActiveStatusFilter('Waiting OFP')}
            className={`px-3 py-1.5 rounded-md transition-colors whitespace-nowrap ${
              activeStatusFilter === 'Waiting OFP'
                ? 'bg-white text-amber-700 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Waiting OFP (Dealer)
          </button>
          <button
            onClick={() => setActiveStatusFilter('Not yet shipped')}
            className={`px-3 py-1.5 rounded-md transition-colors whitespace-nowrap ${
              activeStatusFilter === 'Not yet shipped'
                ? 'bg-white text-blue-700 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Not yet shipped (HMSI)
          </button>
          <button
            onClick={() => setActiveStatusFilter('Delivered')}
            className={`px-3 py-1.5 rounded-md transition-colors whitespace-nowrap ${
              activeStatusFilter === 'Delivered'
                ? 'bg-white text-emerald-700 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Delivered (Supplier)
          </button>
        </nav>

        {/* Zone 3: Primary Action Controls */}
        <div className="flex items-center gap-2 shrink-0">
          
          {/* Download Template Excel */}
          <a
            href="/api/download-template"
            className="hidden sm:flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors whitespace-nowrap"
            title="Download Template Excel Resmi HMSI"
          >
            <FileDown className="w-3.5 h-3.5 text-slate-500" />
            <span className="hidden xl:inline">Template Excel</span>
          </a>

          {/* Guide Modal Trigger */}
          <button
            onClick={onOpenGuide}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors whitespace-nowrap"
            title="Panduan Deploy & Cara Pakai"
          >
            <BookOpen className="w-3.5 h-3.5 text-slate-500" />
            <span className="hidden md:inline">Panduan</span>
          </button>

          {/* Manual Input DTR */}
          <button
            onClick={onOpenManualEntry}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors whitespace-nowrap"
            title="Input Manual 1 DTR"
          >
            <Plus className="w-3.5 h-3.5 text-slate-700" />
            <span className="hidden sm:inline">Input DTR</span>
          </button>

          {/* Export CSV */}
          <a
            href="/api/export/csv"
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors whitespace-nowrap"
            title="Download seluruh data dalam format CSV untuk Excel"
          >
            <Download className="w-3.5 h-3.5 text-slate-500" />
            <span className="hidden xl:inline">Export CSV</span>
          </a>

          {/* Upload Excel Button (Primary Action) */}
          <button
            onClick={onOpenUploadExcel}
            className="flex items-center gap-2 px-3.5 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 active:scale-95 rounded-lg transition-all shadow-xs whitespace-nowrap"
          >
            <FileSpreadsheet className="w-4 h-4" />
            <span>Upload Excel</span>
          </button>

        </div>

      </div>

      {/* Sub-bar for mobile filters */}
      <div className="lg:hidden border-t border-slate-200 bg-slate-50 px-4 py-2 flex items-center justify-between overflow-x-auto gap-2">
        <span className="text-xs text-slate-500 shrink-0">Filter Status:</span>
        <div className="flex items-center gap-1 shrink-0">
          {(['all', 'Waiting OFP', 'Not yet shipped', 'Delivered'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveStatusFilter(tab)}
              className={`px-2.5 py-1 text-xs font-medium rounded ${
                activeStatusFilter === tab
                  ? 'bg-slate-900 text-white font-semibold'
                  : 'bg-white text-slate-600 border border-slate-200'
              }`}
            >
              {tab === 'all'
                ? 'Semua'
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
