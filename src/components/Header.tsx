import React, { useState } from 'react';
import {
  FileSpreadsheet,
  Download,
  Plus,
  FileDown,
  Sun,
  Moon,
  LogOut,
  User,
  ShieldCheck,
  Building,
  Eye,
  ChevronDown,
  Lock
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { UserRole } from '../types';

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
  const { user, profile, role, permissions, logout, switchRole } = useAuth();
  const [isRoleDropdownOpen, setIsRoleDropdownOpen] = useState(false);

  // Styling badge sesuai tingkatan peran pengguna
  const roleBadgeStyle = (() => {
    switch (role) {
      case 'Super Admin':
        return 'bg-purple-100 dark:bg-purple-950/80 text-purple-700 dark:text-purple-300 border-purple-300 dark:border-purple-800';
      case 'Tim Quality':
        return 'bg-blue-100 dark:bg-blue-950/80 text-blue-700 dark:text-blue-300 border-blue-300 dark:border-blue-800';
      case 'Tim Area':
        return 'bg-amber-100 dark:bg-amber-950/80 text-amber-700 dark:text-amber-300 border-amber-300 dark:border-amber-800';
      case 'Tim Viewer':
      default:
        return 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-300 dark:border-slate-700';
    }
  })();

  const roleIcon = (() => {
    switch (role) {
      case 'Super Admin':
        return <ShieldCheck className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400" />;
      case 'Tim Quality':
        return <ShieldCheck className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />;
      case 'Tim Area':
        return <Building className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />;
      case 'Tim Viewer':
      default:
        return <Eye className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400" />;
    }
  })();

  const allRoles: UserRole[] = ['Super Admin', 'Tim Quality', 'Tim Area', 'Tim Viewer'];

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
                HMSI Field Quality
              </span>
              <div className="flex items-center gap-1 text-[10px] font-medium text-slate-500 dark:text-slate-400 font-mono shrink-0 ml-1">
                <span className={`w-1.5 h-1.5 rounded-full ${isSupabaseActive ? 'bg-emerald-500' : 'bg-slate-400'}`}></span>
                <span className="hidden sm:inline">{isSupabaseActive ? 'Supabase Live' : 'Local Storage'}</span>
              </div>
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 hidden md:block truncate">
              Lead Time Part: Dealer &rarr; HMSI &rarr; HMMI / HML (Target &le; 30 Hari)
            </p>
          </div>
        </div>

        {/* Zone 2: Navigation / Workflow Status Filters (Desktop) */}
        <nav className="hidden xl:flex items-center gap-1 bg-slate-100 dark:bg-slate-800/80 p-1 rounded-lg text-xs font-semibold shrink-0">
          <button
            onClick={() => setActiveStatusFilter('all')}
            className={`px-3 py-1.5 rounded-md transition-colors whitespace-nowrap cursor-pointer ${
              activeStatusFilter === 'all'
                ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            Semua Part
          </button>
          
          <button
            onClick={() => setActiveStatusFilter('Waiting OFP')}
            className={`px-3 py-1.5 rounded-md transition-colors whitespace-nowrap cursor-pointer ${
              activeStatusFilter === 'Waiting OFP' || activeStatusFilter === 'Belum Terkirim'
                ? 'bg-white dark:bg-slate-700 text-amber-700 dark:text-amber-400 shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            Waiting OFP (Dealer)
          </button>

          {/* Menu Khusus: Received Area / Area Verified */}
          <button
            onClick={() => setActiveStatusFilter('Not yet shipped')}
            className={`px-3 py-1.5 rounded-md transition-colors whitespace-nowrap cursor-pointer flex items-center gap-1 ${
              activeStatusFilter === 'Not yet shipped' || activeStatusFilter === 'Received by Area' || activeStatusFilter === 'Area Verified'
                ? 'bg-white dark:bg-slate-700 text-blue-700 dark:text-blue-400 shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <span>Received Area</span>
            <span className="text-[10px] px-1 py-0.2 bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300 rounded font-bold">
              Area Verified
            </span>
          </button>

          {/* Menu Khusus: Sent to HMMI / Delivered */}
          <button
            onClick={() => setActiveStatusFilter('Delivered')}
            className={`px-3 py-1.5 rounded-md transition-colors whitespace-nowrap cursor-pointer ${
              activeStatusFilter === 'Delivered' || activeStatusFilter === 'Sent to HMMI'
                ? 'bg-white dark:bg-slate-700 text-emerald-700 dark:text-emerald-400 shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            Sent to HMMI
          </button>
        </nav>

        {/* Zone 3: User Profile, Role Badge, Switcher & Actions */}
        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
          
          {/* User Profile & Role Switcher Dropdown */}
          <div className="relative">
            <button
              onClick={() => setIsRoleDropdownOpen(!isRoleDropdownOpen)}
              className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-xs font-semibold transition-all cursor-pointer ${roleBadgeStyle}`}
              title="Klik untuk melihat profil atau beralih role (Role Switcher)"
            >
              {roleIcon}
              <span className="hidden sm:inline font-bold">{role}</span>
              <ChevronDown className="w-3 h-3 opacity-70" />
            </button>

            {/* Dropdown Menu */}
            {isRoleDropdownOpen && (
              <div
                className="absolute right-0 mt-2 w-64 bg-white dark:bg-slate-900 rounded-xl shadow-2xl border border-slate-200 dark:border-slate-800 p-3 z-50 animate-scaleIn text-xs space-y-2.5 font-sans"
                onClick={(e) => e.stopPropagation()}
              >
                {/* User Info Header */}
                <div className="pb-2 border-b border-slate-100 dark:border-slate-800">
                  <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider block">
                    Pengguna Aktif
                  </span>
                  <p className="font-bold text-slate-900 dark:text-white truncate">
                    {profile?.full_name || user?.email?.split('@')[0]}
                  </p>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 font-mono truncate">
                    {user?.email || 'user@hino.co.id'}
                  </p>
                </div>

                {/* Role Switcher Section for Instant Testing */}
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                    Ganti Role (Role Switcher)
                  </span>
                  <div className="space-y-1">
                    {allRoles.map((r) => (
                      <button
                        key={r}
                        onClick={() => {
                          switchRole(r);
                          setIsRoleDropdownOpen(false);
                        }}
                        className={`w-full text-left px-2 py-1.5 rounded-lg text-xs font-medium flex items-center justify-between transition-colors cursor-pointer ${
                          role === r
                            ? 'bg-red-50 dark:bg-red-950/60 text-red-600 dark:text-red-400 font-bold'
                            : 'hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300'
                        }`}
                      >
                        <span>{r}</span>
                        {role === r && <span className="text-[10px] bg-red-600 text-white px-1.5 py-0.2 rounded font-mono">Aktif</span>}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Sign Out Button */}
                <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
                  <button
                    onClick={() => {
                      setIsRoleDropdownOpen(false);
                      logout();
                    }}
                    className="w-full flex items-center gap-1.5 px-2 py-1.5 rounded-lg text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40 text-xs font-semibold transition-colors cursor-pointer"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                    <span>Keluar Akun (Logout)</span>
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Dark Mode Toggle */}
          {onToggleTheme && (
            <button
              onClick={onToggleTheme}
              className="p-2 text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 rounded-lg transition-colors cursor-pointer"
              title={isDarkMode ? 'Beralih ke Mode Terang' : 'Beralih ke Mode Malam'}
              aria-label="Toggle Dark Mode"
            >
              {isDarkMode ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-slate-700" />}
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

          {/* Manual Input DTR (Role Protected: Hidden for Tim Viewer) */}
          {permissions.canCreateManual && (
            <button
              onClick={onOpenManualEntry}
              className="flex items-center gap-1.5 px-2.5 sm:px-3 py-2 text-xs font-semibold text-slate-700 dark:text-slate-300 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 rounded-lg transition-colors whitespace-nowrap cursor-pointer active:scale-95"
              title="Input Manual 1 DTR"
            >
              <Plus className="w-3.5 h-3.5 text-red-600 dark:text-red-400" />
              <span className="hidden sm:inline">Input DTR</span>
            </button>
          )}

          {/* Export CSV (Available for all roles including Tim Viewer) */}
          <a
            href="/api/export/csv"
            className="hidden sm:flex items-center gap-1.5 px-2.5 sm:px-3 py-2 text-xs font-semibold text-slate-700 dark:text-slate-300 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 rounded-lg transition-colors whitespace-nowrap"
            title="Download seluruh data dalam format CSV untuk Excel"
          >
            <Download className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400" />
            <span className="hidden md:inline">Export CSV</span>
          </a>

          {/* Upload Excel Button (Role Protected: Only for Super Admin) */}
          {permissions.canUploadExcel && (
            <button
              onClick={onOpenUploadExcel}
              className="flex items-center gap-1.5 sm:gap-2 px-3 sm:px-3.5 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 active:scale-95 rounded-lg transition-all shadow-xs whitespace-nowrap cursor-pointer"
              title="Khusus Super Admin: Impor Master Data Excel"
            >
              <FileSpreadsheet className="w-4 h-4" />
              <span>Upload Excel</span>
            </button>
          )}

        </div>

      </div>

      {/* Sub-bar for mobile/tablet status filter tabs */}
      <div className="xl:hidden border-t border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-900/90 px-3 sm:px-6 py-2 overflow-x-auto w-full">
        <div className="flex items-center gap-1.5 min-w-max">
          <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 mr-1 shrink-0">Menu Alur:</span>
          {[
            { id: 'all', label: 'Semua Part' },
            { id: 'Waiting OFP', label: 'Waiting OFP (Dealer)' },
            { id: 'Not yet shipped', label: 'Received Area (Verified)' },
            { id: 'Delivered', label: 'Sent to HMMI' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveStatusFilter(tab.id)}
              className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors cursor-pointer whitespace-nowrap ${
                activeStatusFilter === tab.id
                  ? 'bg-slate-900 dark:bg-slate-700 text-white font-semibold shadow-xs'
                  : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-750'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>
    </header>
  );
};
