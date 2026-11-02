import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { UserRole } from '../types';
import {
  Truck,
  Lock,
  Mail,
  AlertCircle,
  CheckCircle2,
  LogIn,
  UserPlus
} from 'lucide-react';

export const LoginView: React.FC = () => {
  const { login, signUp, isLoading } = useAuth();
  const [isSignUpMode, setIsSignUpMode] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [selectedRole, setSelectedRole] = useState<UserRole>('Tim Quality');
  const [fullName, setFullName] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Validasi live format email kantor @hino.co.id
  const isCorporateEmail = email.trim().toLowerCase().endsWith('@hino.co.id');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    if (!email.trim() || !password) {
      setErrorMsg('Silakan isi alamat email kantor dan kata sandi.');
      return;
    }

    if (!isCorporateEmail) {
      setErrorMsg('Format email salah! Sistem mewajibkan email perusahaan berakhiran domain @hino.co.id.');
      return;
    }

    setIsSubmitting(true);
    try {
      if (isSignUpMode) {
        const res = await signUp(email, password, selectedRole, fullName);
        if (res.success) {
          setSuccessMsg('Akun kantor berhasil didaftarkan! Masuk otomatis...');
        } else {
          setErrorMsg(res.error || 'Pendaftaran gagal.');
        }
      } else {
        const res = await login(email, password);
        if (!res.success) {
          setErrorMsg(res.error || 'Login gagal. Periksa kembali email dan kata sandi.');
        }
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Terjadi kesalahan saat memproses login.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen w-full bg-slate-950 flex flex-col items-center justify-center p-4 relative overflow-hidden font-sans">
      {/* Background Graphic Patterns */}
      <div className="absolute inset-0 z-0 opacity-20 pointer-events-none">
        <div className="absolute -top-40 -left-40 w-96 h-96 bg-red-600 rounded-full blur-3xl"></div>
        <div className="absolute -bottom-40 -right-40 w-96 h-96 bg-blue-600 rounded-full blur-3xl"></div>
      </div>

      <div className="relative z-10 w-full max-w-md my-auto">
        {/* Hino Brand Header */}
        <div className="text-center mb-6 space-y-2">
          <div className="inline-flex items-center justify-center p-3 rounded-2xl bg-gradient-to-br from-red-600 to-red-800 shadow-xl border border-red-500/30 mb-1">
            <Truck className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-2xl font-black tracking-tight text-white">
            HINO MOTORS INDONESIA
          </h1>
          <p className="text-xs font-semibold uppercase tracking-wider text-red-400">
            Field Quality · OFP Monitoring &amp; Tracking System
          </p>
          <p className="text-xs text-slate-400 max-w-xs mx-auto">
            Portal Pemantauan Alur Klaim Original Failure Part: Dealer &rarr; HMSI &rarr; HMMI/HML
          </p>
        </div>

        {/* Login / Register Card */}
        <div className="bg-slate-900/90 backdrop-blur-md rounded-2xl border border-slate-800 shadow-2xl p-6 sm:p-7 space-y-5">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div className="flex gap-2 text-xs font-bold">
              <button
                type="button"
                onClick={() => {
                  setIsSignUpMode(false);
                  setErrorMsg(null);
                }}
                className={`pb-1 px-2 border-b-2 transition-all cursor-pointer ${
                  !isSignUpMode
                    ? 'border-red-500 text-white'
                    : 'border-transparent text-slate-400 hover:text-slate-200'
                }`}
              >
                Masuk (Supabase Auth)
              </button>
              <button
                type="button"
                onClick={() => {
                  setIsSignUpMode(true);
                  setErrorMsg(null);
                }}
                className={`pb-1 px-2 border-b-2 transition-all cursor-pointer ${
                  isSignUpMode
                    ? 'border-red-500 text-white'
                    : 'border-transparent text-slate-400 hover:text-slate-200'
                }`}
              >
                Daftar Akun Baru
              </button>
            </div>
          </div>

          {/* Feedback Alerts */}
          {errorMsg && (
            <div className="flex items-start gap-2.5 p-3 rounded-xl bg-red-950/60 border border-red-800/80 text-red-300 text-xs leading-relaxed animate-shake">
              <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
              <span>{errorMsg}</span>
            </div>
          )}

          {successMsg && (
            <div className="flex items-center gap-2.5 p-3 rounded-xl bg-emerald-950/60 border border-emerald-800/80 text-emerald-300 text-xs">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>{successMsg}</span>
            </div>
          )}

          {/* Form Credentials */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {isSignUpMode && (
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Nama Lengkap Pegawai
                </label>
                <input
                  type="text"
                  required
                  placeholder="Misal: Andi Wijaya"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-800/90 border border-slate-700 text-white text-xs placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-red-500"
                />
              </div>
            )}

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-semibold text-slate-300">
                  Email Kantor Resmi
                </label>
                <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded ${
                  isCorporateEmail ? 'bg-emerald-950 text-emerald-400 border border-emerald-800/50' : 'bg-slate-800 text-slate-400'
                }`}>
                  @hino.co.id
                </span>
              </div>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                <input
                  type="email"
                  required
                  placeholder="nama.pegawai@hino.co.id"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className={`w-full pl-10 pr-3.5 py-2.5 rounded-xl bg-slate-800/90 border text-white text-xs placeholder:text-slate-500 focus:outline-none focus:ring-2 ${
                    email && !isCorporateEmail
                      ? 'border-red-500/80 focus:ring-red-500'
                      : 'border-slate-700 focus:ring-red-500'
                  }`}
                />
              </div>
              {email && !isCorporateEmail && (
                <p className="text-[11px] text-red-400 mt-1 flex items-center gap-1">
                  <AlertCircle className="w-3 h-3" /> Wajib menggunakan domain perusahaan: <strong>@hino.co.id</strong>
                </p>
              )}
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Kata Sandi
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                <input
                  type="password"
                  required
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-10 pr-3.5 py-2.5 rounded-xl bg-slate-800/90 border border-slate-700 text-white text-xs placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-red-500"
                />
              </div>
            </div>

            {isSignUpMode && (
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Tingkatan Peran (Role RBAC)
                </label>
                <select
                  value={selectedRole}
                  onChange={(e) => setSelectedRole(e.target.value as UserRole)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-800/90 border border-slate-700 text-white text-xs focus:outline-none focus:ring-2 focus:ring-red-500"
                >
                  <option value="Tim Quality">Tim Quality (Verifikasi Teknis &amp; Kirim HMMI)</option>
                  <option value="Tim Area">Tim Area (Penerimaan Part &amp; Area Verified)</option>
                  <option value="Tim Viewer">Tim Viewer (Hanya Lihat / Read-Only)</option>
                  <option value="Super Admin">Super Admin (Akses Penuh Seluruh Sistem)</option>
                </select>
              </div>
            )}

            <button
              type="submit"
              disabled={isSubmitting || isLoading}
              className="w-full py-2.5 px-4 rounded-xl bg-red-600 hover:bg-red-700 active:scale-98 transition-all font-bold text-white text-xs flex items-center justify-center gap-2 shadow-lg shadow-red-900/30 cursor-pointer disabled:opacity-60"
            >
              {isSignUpMode ? (
                <>
                  <UserPlus className="w-4 h-4" />
                  <span>{isSubmitting ? 'Mendaftarkan Akun...' : 'Daftar Akun @hino.co.id'}</span>
                </>
              ) : (
                <>
                  <LogIn className="w-4 h-4" />
                  <span>{isSubmitting ? 'Memverifikasi Sesi...' : 'Masuk ke Dashboard OFP'}</span>
                </>
              )}
            </button>
          </form>
        </div>

        <div className="mt-6 text-center">
          <p className="text-[11px] text-slate-500 font-medium">
            &copy; {new Date().getFullYear()} PT Hino Motors Sales Indonesia. All rights reserved.
          </p>
        </div>
      </div>
    </div>
  );
};
