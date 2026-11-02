import React, { useState, useEffect } from 'react';
import { UserProfile, UserRole } from '../types';
import {
  Users,
  ShieldCheck,
  ShieldAlert,
  Building,
  Eye,
  Search,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  Copy,
  Check,
  X,
  UserPlus,
  RefreshCw,
  Loader2,
  Sliders,
  ChevronDown,
  Sparkles
} from 'lucide-react';

interface UserRoleManagementModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUserEmail?: string;
  onUserRoleUpdated?: () => void;
}

export const UserRoleManagementModal: React.FC<UserRoleManagementModalProps> = ({
  isOpen,
  onClose,
  currentUserEmail,
  onUserRoleUpdated,
}) => {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('all');
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [isAddUserOpen, setIsAddUserOpen] = useState(false);
  const [newEmail, setNewEmail] = useState('');
  const [newFullName, setNewFullName] = useState('');
  const [newRole, setNewRole] = useState<UserRole>('Tim Quality');
  const [newDept, setNewDept] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [showSqlGuide, setShowSqlGuide] = useState(false);
  const [copiedSql, setCopiedSql] = useState(false);

  const fetchUsers = async () => {
    try {
      setIsLoading(true);
      const res = await fetch('/api/users').then((r) => r.json());
      if (res.success && Array.isArray(res.data)) {
        setUsers(res.data);
      }
    } catch (err) {
      console.error('Error fetching users:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchUsers();
    }
  }, [isOpen]);

  const handleRoleChange = async (userId: string, newRole: UserRole) => {
    try {
      setUpdatingId(userId);
      setStatusMessage(null);
      const res = await fetch(`/api/users/${userId}/role`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role: newRole }),
      }).then((r) => r.json());

      if (res.success) {
        setStatusMessage({
          type: 'success',
          text: `Peran berhasil diubah menjadi "${newRole}".`,
        });
        setUsers((prev) =>
          prev.map((u) => (u.id === userId ? { ...u, role: newRole, updated_at: new Date().toISOString() } : u))
        );
        if (onUserRoleUpdated) onUserRoleUpdated();
      } else {
        setStatusMessage({ type: 'error', text: res.error || 'Gagal mengubah peran.' });
      }
    } catch (err: any) {
      setStatusMessage({ type: 'error', text: err.message || 'Terjadi kesalahan sistem.' });
    } finally {
      setUpdatingId(null);
    }
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEmail.trim().toLowerCase().endsWith('@hino.co.id')) {
      setStatusMessage({ type: 'error', text: 'Email wajib menggunakan domain resmi @hino.co.id' });
      return;
    }

    try {
      setIsCreating(true);
      setStatusMessage(null);
      const res = await fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: newEmail.trim().toLowerCase(),
          role: newRole,
          full_name: newFullName.trim() || newEmail.split('@')[0],
          department: newDept.trim() || 'PT Hino Motors Sales Indonesia',
        }),
      }).then((r) => r.json());

      if (res.success) {
        setStatusMessage({
          type: 'success',
          text: `Pengguna ${newEmail} berhasil ditambahkan dengan peran "${newRole}".`,
        });
        setNewEmail('');
        setNewFullName('');
        setNewDept('');
        setIsAddUserOpen(false);
        await fetchUsers();
        if (onUserRoleUpdated) onUserRoleUpdated();
      } else {
        setStatusMessage({ type: 'error', text: res.error || 'Gagal menambahkan pengguna.' });
      }
    } catch (err: any) {
      setStatusMessage({ type: 'error', text: err.message || 'Gagal menghubungi server.' });
    } finally {
      setIsCreating(false);
    }
  };

  const copySqlScript = () => {
    navigator.clipboard.writeText(SUPABASE_ROLE_SETUP_SQL);
    setCopiedSql(true);
    setTimeout(() => setCopiedSql(false), 3000);
  };

  if (!isOpen) return null;

  const allRoles: UserRole[] = ['Super Admin', 'Tim Quality', 'Tim Area', 'Tim Viewer'];

  const filteredUsers = users.filter((u) => {
    const matchSearch =
      (u.email || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (u.full_name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (u.department || '').toLowerCase().includes(searchTerm.toLowerCase());
    const matchRole = roleFilter === 'all' || u.role === roleFilter;
    return matchSearch && matchRole;
  });

  const getRoleBadge = (role: UserRole) => {
    switch (role) {
      case 'Super Admin':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-purple-100 dark:bg-purple-950/80 text-purple-700 dark:text-purple-300 border border-purple-300 dark:border-purple-800">
            <ShieldAlert className="w-3.5 h-3.5" />
            Super Admin
          </span>
        );
      case 'Tim Quality':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-blue-100 dark:bg-blue-950/80 text-blue-700 dark:text-blue-300 border border-blue-300 dark:border-blue-800">
            <ShieldCheck className="w-3.5 h-3.5" />
            Tim Quality
          </span>
        );
      case 'Tim Area':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-amber-100 dark:bg-amber-950/80 text-amber-700 dark:text-amber-300 border border-amber-300 dark:border-amber-800">
            <Building className="w-3.5 h-3.5" />
            Tim Area
          </span>
        );
      case 'Tim Viewer':
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-300 dark:border-slate-700">
            <Eye className="w-3.5 h-3.5" />
            Tim Viewer
          </span>
        );
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/70 backdrop-blur-xs overflow-y-auto animate-fadeIn font-sans">
      <div className="relative w-full max-w-4xl bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 flex flex-col max-h-[92vh] overflow-hidden">
        
        {/* Header Modal */}
        <div className="px-5 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50/80 dark:bg-slate-850">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-purple-600/10 dark:bg-purple-500/20 text-purple-600 dark:text-purple-400 border border-purple-200 dark:border-purple-800">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-slate-900 dark:text-white">
                  Manajemen Pengguna &amp; Peran (RBAC)
                </h2>
                <span className="px-2 py-0.5 rounded text-[10px] font-extrabold uppercase bg-purple-100 dark:bg-purple-950 text-purple-700 dark:text-purple-300 border border-purple-300 dark:border-purple-800">
                  Khusus Super Admin
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Atur wewenang pengguna (Super Admin, Tim Quality, Tim Area, atau Tim Viewer) untuk pengamanan alur klaim OFP.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowSqlGuide(!showSqlGuide)}
              className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-semibold text-slate-700 dark:text-slate-300 transition-colors cursor-pointer"
              title="Panduan skema SQL Supabase"
            >
              <HelpCircle className="w-4 h-4 text-purple-500" />
              <span>Panduan SQL Supabase</span>
            </button>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Status Alert Banner */}
        {statusMessage && (
          <div
            className={`px-5 py-2.5 text-xs flex items-center justify-between ${
              statusMessage.type === 'success'
                ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border-b border-emerald-200 dark:border-emerald-800'
                : 'bg-red-50 dark:bg-red-950/60 text-red-800 dark:text-red-300 border-b border-red-200 dark:border-red-800'
            }`}
          >
            <div className="flex items-center gap-2">
              {statusMessage.type === 'success' ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
              ) : (
                <AlertCircle className="w-4 h-4 text-red-600 dark:text-red-400 shrink-0" />
              )}
              <span>{statusMessage.text}</span>
            </div>
            <button
              onClick={() => setStatusMessage(null)}
              className="text-xs font-bold opacity-60 hover:opacity-100 cursor-pointer"
            >
              &times;
            </button>
          </div>
        )}

        {/* Collapsible Supabase SQL Guide Drawer */}
        {showSqlGuide && (
          <div className="bg-slate-900 border-b border-slate-800 p-4 text-slate-300 text-xs space-y-2.5 animate-fadeIn">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 font-bold text-white text-xs">
                <Sparkles className="w-4 h-4 text-purple-400" />
                <span>Langkah-langkah Konfigurasi Tabel `public.profiles` di Supabase</span>
              </div>
              <button
                onClick={copySqlScript}
                className="flex items-center gap-1 px-2.5 py-1 rounded bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold transition-all shadow-xs cursor-pointer"
              >
                {copiedSql ? <Check className="w-3.5 h-3.5 text-emerald-300" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedSql ? 'Tersalin ke Clipboard!' : 'Salin Seluruh SQL'}</span>
              </button>
            </div>
            <ol className="list-decimal list-inside space-y-1 text-[11px] text-slate-300">
              <li>Buka dashboard Supabase proyek Anda &rarr; klik menu <strong>SQL Editor</strong> di bilah navigasi kiri.</li>
              <li>Klik tombol <strong>"New query"</strong>, tempel (paste) skrip SQL di bawah ini.</li>
              <li>Klik tombol hijau <strong>"Run"</strong>. Skrip ini akan membuat tabel <code>profiles</code>, menyetel trigger sinkronisasi otomatis dari <code>auth.users</code>, dan mengizinkan Super Admin mengubah role pengguna.</li>
            </ol>
            <pre className="p-3 rounded-xl bg-slate-950 text-emerald-400 font-mono text-[10px] overflow-x-auto max-h-48 border border-slate-800 leading-relaxed">
              {SUPABASE_ROLE_SETUP_SQL}
            </pre>
          </div>
        )}

        {/* Sub-Header: Search & Action Bar */}
        <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white dark:bg-slate-900">
          <div className="flex flex-1 items-center gap-2">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                placeholder="Cari email pegawai, nama, atau departemen..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
            </div>

            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              className="px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-800 dark:text-slate-200 font-medium focus:outline-none focus:ring-2 focus:ring-purple-500 cursor-pointer"
            >
              <option value="all">Semua Peran ({users.length})</option>
              <option value="Super Admin">Super Admin ({users.filter((u) => u.role === 'Super Admin').length})</option>
              <option value="Tim Quality">Tim Quality ({users.filter((u) => u.role === 'Tim Quality').length})</option>
              <option value="Tim Area">Tim Area ({users.filter((u) => u.role === 'Tim Area').length})</option>
              <option value="Tim Viewer">Tim Viewer ({users.filter((u) => u.role === 'Tim Viewer').length})</option>
            </select>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={fetchUsers}
              disabled={isLoading}
              className="p-2 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 transition-colors cursor-pointer"
              title="Segarkan daftar pengguna"
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin text-purple-500' : ''}`} />
            </button>
            <button
              onClick={() => setIsAddUserOpen(!isAddUserOpen)}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 active:scale-95 text-white font-bold text-xs transition-all shadow-xs cursor-pointer"
            >
              <UserPlus className="w-4 h-4" />
              <span>Tambah Pegawai @hino.co.id</span>
            </button>
          </div>
        </div>

        {/* Add User Form Drawer */}
        {isAddUserOpen && (
          <form
            onSubmit={handleCreateUser}
            className="p-4 bg-purple-50/60 dark:bg-purple-950/30 border-b border-purple-200 dark:border-purple-800/80 space-y-3 animate-fadeIn"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-purple-900 dark:text-purple-300 flex items-center gap-1.5">
                <UserPlus className="w-4 h-4" />
                Daftarkan Pegawai Baru &amp; Tetapkan Peran Awal
              </span>
              <button
                type="button"
                onClick={() => setIsAddUserOpen(false)}
                className="text-xs text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                Batal
              </button>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-2.5">
              <div>
                <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Email Kantor *
                </label>
                <input
                  type="email"
                  required
                  placeholder="pegawai@hino.co.id"
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Nama Lengkap
                </label>
                <input
                  type="text"
                  placeholder="Nama pegawai"
                  value={newFullName}
                  onChange={(e) => setNewFullName(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Peran (Role) *
                </label>
                <select
                  value={newRole}
                  onChange={(e) => setNewRole(e.target.value as UserRole)}
                  className="w-full px-3 py-2 rounded-lg bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500 cursor-pointer"
                >
                  <option value="Tim Quality">Tim Quality (Verifikasi &amp; Kirim HMMI)</option>
                  <option value="Tim Area">Tim Area (Penerimaan Fisik Part)</option>
                  <option value="Tim Viewer">Tim Viewer (Hanya Lihat)</option>
                  <option value="Super Admin">Super Admin (Akses Penuh)</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Departemen / Wilayah
                </label>
                <input
                  type="text"
                  placeholder="HMSI Area Regional / QA"
                  value={newDept}
                  onChange={(e) => setNewDept(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>
            </div>

            <div className="flex justify-end">
              <button
                type="submit"
                disabled={isCreating}
                className="px-4 py-2 rounded-lg bg-purple-600 hover:bg-purple-700 active:scale-95 text-white font-bold text-xs flex items-center gap-1.5 transition-all cursor-pointer shadow-xs disabled:opacity-60"
              >
                {isCreating ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
                <span>Simpan Pegawai Baru</span>
              </button>
            </div>
          </form>
        )}

        {/* Table of Users */}
        <div className="flex-1 overflow-x-auto overflow-y-auto min-h-[300px]">
          {isLoading && users.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-slate-400 gap-2">
              <Loader2 className="w-7 h-7 animate-spin text-purple-600" />
              <span className="text-xs font-semibold">Memuat profil pengguna...</span>
            </div>
          ) : filteredUsers.length === 0 ? (
            <div className="text-center py-16 text-slate-400 space-y-1">
              <p className="text-sm font-bold text-slate-600 dark:text-slate-300">Tidak ada pengguna yang cocok</p>
              <p className="text-xs">Coba ubah kata kunci pencarian atau filter peran.</p>
            </div>
          ) : (
            <table className="w-full text-left border-collapse text-xs">
              <thead className="bg-slate-100/90 dark:bg-slate-800/80 sticky top-0 z-10 border-b border-slate-200 dark:border-slate-700">
                <tr>
                  <th className="py-3 px-4 font-bold text-slate-700 dark:text-slate-300">Pegawai Hino</th>
                  <th className="py-3 px-4 font-bold text-slate-700 dark:text-slate-300">Departemen / Wilayah</th>
                  <th className="py-3 px-4 font-bold text-slate-700 dark:text-slate-300">Peran Saat Ini</th>
                  <th className="py-3 px-4 font-bold text-slate-700 dark:text-slate-300">Ubah Peran (Assign Role)</th>
                  <th className="py-3 px-4 font-bold text-slate-700 dark:text-slate-300 text-right">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {filteredUsers.map((u) => {
                  const isCurrentLoggedIn = currentUserEmail && u.email.toLowerCase() === currentUserEmail.toLowerCase();
                  const isUpdating = updatingId === u.id;

                  return (
                    <tr
                      key={u.id}
                      className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
                    >
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center font-bold text-slate-700 dark:text-slate-200 shrink-0 uppercase text-xs">
                            {u.full_name ? u.full_name.charAt(0) : u.email.charAt(0)}
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5">
                              <span className="font-bold text-slate-900 dark:text-white truncate">
                                {u.full_name || u.email.split('@')[0]}
                              </span>
                              {isCurrentLoggedIn && (
                                <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-red-100 dark:bg-red-950 text-red-700 dark:text-red-300 border border-red-300 dark:border-red-800">
                                  Anda
                                </span>
                              )}
                            </div>
                            <span className="text-[11px] text-slate-500 dark:text-slate-400 font-mono truncate block">
                              {u.email}
                            </span>
                          </div>
                        </div>
                      </td>

                      <td className="py-3 px-4 text-slate-600 dark:text-slate-400">
                        <span>{u.department || 'HMSI'}</span>
                      </td>

                      <td className="py-3 px-4">
                        {getRoleBadge(u.role)}
                      </td>

                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2">
                          <select
                            value={u.role}
                            disabled={isUpdating}
                            onChange={(e) => handleRoleChange(u.id, e.target.value as UserRole)}
                            className="px-2.5 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-xs text-slate-900 dark:text-white font-medium focus:outline-none focus:ring-2 focus:ring-purple-500 cursor-pointer disabled:opacity-50"
                          >
                            {allRoles.map((r) => (
                              <option key={r} value={r}>
                                {r}
                              </option>
                            ))}
                          </select>
                          {isUpdating && <Loader2 className="w-4 h-4 animate-spin text-purple-600 shrink-0" />}
                        </div>
                      </td>

                      <td className="py-3 px-4 text-right">
                        <span className="text-[11px] text-emerald-600 dark:text-emerald-400 font-medium flex items-center justify-end gap-1">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          Aktif
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>

        {/* Footer Modal */}
        <div className="px-5 py-3 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50/80 dark:bg-slate-850 text-xs text-slate-500 dark:text-slate-400">
          <div className="flex items-center gap-2">
            <span>Total Pengguna: <strong>{users.length}</strong></span>
            <span>&bull;</span>
            <span className="text-purple-600 dark:text-purple-400 font-semibold">
              Super Admin: {users.filter((u) => u.role === 'Super Admin').length}
            </span>
          </div>

          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 font-bold transition-colors cursor-pointer"
          >
            Tutup
          </button>
        </div>

      </div>
    </div>
  );
};

export const SUPABASE_ROLE_SETUP_SQL = `-- ==============================================================================
-- PANDUAN LENGKAP SUPABASE SQL: TABEL PROFILES & ROLE-BASED ACCESS CONTROL (RBAC)
-- Jalankan skrip ini di Supabase Dashboard -> SQL Editor
-- ==============================================================================

-- 1. Buat Tabel public.profiles yang terhubung dengan auth.users
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  role TEXT NOT NULL DEFAULT 'Tim Viewer' CHECK (role IN ('Super Admin', 'Tim Quality', 'Tim Area', 'Tim Viewer')),
  full_name TEXT,
  department TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Aktifkan Row Level Security (RLS)
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- 3. Kebijakan RLS: Siapapun yang login dapat melihat seluruh profil
DROP POLICY IF EXISTS "Profiles viewable by authenticated users" ON public.profiles;
CREATE POLICY "Profiles viewable by authenticated users"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (true);

-- 4. Kebijakan RLS: Super Admin atau Pengguna Sendiri dapat mengupdate profil
DROP POLICY IF EXISTS "Users and Super Admin can update profiles" ON public.profiles;
CREATE POLICY "Users and Super Admin can update profiles"
  ON public.profiles FOR UPDATE
  TO authenticated
  USING (
    auth.uid() = id OR
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid() AND profiles.role = 'Super Admin'
    )
  );

-- 5. Trigger Otomatis: Membuat entri di public.profiles saat user baru mendaftar
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, role, full_name, department)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'role', 'Tim Viewer'),
    COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
    COALESCE(NEW.raw_user_meta_data->>'department', 'PT Hino Motors Sales Indonesia')
  )
  ON CONFLICT (id) DO UPDATE
  SET email = EXCLUDED.email,
      role = COALESCE(profiles.role, EXCLUDED.role),
      full_name = COALESCE(profiles.full_name, EXCLUDED.full_name);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 6. Tetapkan akun Super Admin awal Anda (Ganti email dengan email Anda):
-- UPDATE public.profiles SET role = 'Super Admin' WHERE email = 'superadmin@hino.co.id';
`;
