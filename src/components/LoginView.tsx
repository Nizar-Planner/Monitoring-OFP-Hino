import React, { useState } from 'react';
import { useAuth, DEMO_ACCOUNTS } from '../context/AuthContext';
import { UserRole } from '../types';
import {
  Truck,
  ShieldCheck,
  Building,
  Eye,
  Lock,
  Mail,
  AlertCircle,
  CheckCircle2,
  HelpCircle,
  Copy,
  Check,
  LogIn,
  UserPlus
} from 'lucide-react';

export const LoginView: React.FC = () => {
  const { login, signUp, quickDemoLogin, isLoading } = useAuth();
  const [isSignUpMode, setIsSignUpMode] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [selectedRole, setSelectedRole] = useState<UserRole>('Tim Quality');
  const [fullName, setFullName] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSqlGuide, setShowSqlGuide] = useState(false);
  const [copiedSql, setCopiedSql] = useState(false);

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

  const copySqlScript = () => {
    navigator.clipboard.writeText(SUPABASE_PROFILES_SQL);
    setCopiedSql(true);
    setTimeout(() => setCopiedSql(false), 3000);
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

            <button
              type="button"
              onClick={() => setShowSqlGuide(!showSqlGuide)}
              className="text-[11px] text-slate-400 hover:text-red-400 flex items-center gap-1 transition-colors cursor-pointer"
              title="Lihat Skema SQL Tabel Profiles Supabase"
            >
              <HelpCircle className="w-3.5 h-3.5" />
              <span>SQL Profiles</span>
            </button>
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

          {/* Quick Demo Access Buttons for 4 Roles */}
          <div className="pt-2 border-t border-slate-800 space-y-2">
            <span className="text-[11px] font-bold text-slate-400 block text-center uppercase tracking-wider">
              Mode Uji Coba Cepat (1-Klik Masuk Sesuai Role)
            </span>
            <div className="grid grid-cols-2 gap-2 text-[11px]">
              <button
                type="button"
                onClick={() => quickDemoLogin('Super Admin')}
                className="p-2.5 rounded-xl bg-purple-950/40 hover:bg-purple-900/60 border border-purple-800/50 text-purple-200 flex flex-col items-start gap-0.5 transition-all cursor-pointer group"
              >
                <div className="flex items-center gap-1.5 font-bold">
                  <ShieldCheck className="w-3.5 h-3.5 text-purple-400 group-hover:scale-110 transition-transform" />
                  <span>Super Admin</span>
                </div>
                <span className="text-[10px] text-purple-400/80">Akses Penuh</span>
              </button>

              <button
                type="button"
                onClick={() => quickDemoLogin('Tim Quality')}
                className="p-2.5 rounded-xl bg-blue-950/40 hover:bg-blue-900/60 border border-blue-800/50 text-blue-200 flex flex-col items-start gap-0.5 transition-all cursor-pointer group"
              >
                <div className="flex items-center gap-1.5 font-bold">
                  <ShieldCheck className="w-3.5 h-3.5 text-blue-400 group-hover:scale-110 transition-transform" />
                  <span>Tim Quality</span>
                </div>
                <span className="text-[10px] text-blue-400/80">Verifikasi &amp; Rollback</span>
              </button>

              <button
                type="button"
                onClick={() => quickDemoLogin('Tim Area')}
                className="p-2.5 rounded-xl bg-amber-950/40 hover:bg-amber-900/60 border border-amber-800/50 text-amber-200 flex flex-col items-start gap-0.5 transition-all cursor-pointer group"
              >
                <div className="flex items-center gap-1.5 font-bold">
                  <Building className="w-3.5 h-3.5 text-amber-400 group-hover:scale-110 transition-transform" />
                  <span>Tim Area</span>
                </div>
                <span className="text-[10px] text-amber-400/80">Area Verified</span>
              </button>

              <button
                type="button"
                onClick={() => quickDemoLogin('Tim Viewer')}
                className="p-2.5 rounded-xl bg-slate-800/50 hover:bg-slate-800 border border-slate-700 text-slate-200 flex flex-col items-start gap-0.5 transition-all cursor-pointer group"
              >
                <div className="flex items-center gap-1.5 font-bold">
                  <Eye className="w-3.5 h-3.5 text-slate-400 group-hover:scale-110 transition-transform" />
                  <span>Tim Viewer</span>
                </div>
                <span className="text-[10px] text-slate-400">Hanya Lihat</span>
              </button>
            </div>
          </div>
        </div>

        {/* Modal / SQL Guide Drawer */}
        {showSqlGuide && (
          <div className="mt-4 p-4 rounded-2xl bg-slate-900/90 border border-slate-800 text-slate-300 text-xs space-y-2 animate-fadeIn">
            <div className="flex items-center justify-between">
              <span className="font-bold text-white flex items-center gap-1.5">
                <HelpCircle className="w-4 h-4 text-red-400" />
                Skema Supabase Tabel public.profiles
              </span>
              <button
                onClick={copySqlScript}
                className="flex items-center gap-1 px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 text-[10px] font-semibold transition-colors cursor-pointer"
              >
                {copiedSql ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                <span>{copiedSql ? 'Tersalin!' : 'Salin SQL'}</span>
              </button>
            </div>
            <p className="text-[11px] text-slate-400">
              Jalankan script ini di <strong>Supabase SQL Editor</strong> untuk membuat tabel profiles yang otomatis sinkron dengan autentikasi pengguna:
            </p>
            <pre className="p-2.5 rounded-lg bg-slate-950 font-mono text-[10px] text-emerald-400 overflow-x-auto max-h-40 border border-slate-800">
              {SUPABASE_PROFILES_SQL}
            </pre>
          </div>
        )}

        <div className="mt-6 text-center">
          <p className="text-[11px] text-slate-500 font-medium">
            &copy; {new Date().getFullYear()} PT Hino Motors Sales Indonesia. All rights reserved.
          </p>
        </div>
      </div>
    </div>
  );
};

const SUPABASE_PROFILES_SQL = `-- 1. Buat Tabel public.profiles yang terhubung dengan auth.users
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

-- 3. Kebijakan RLS: Pengguna terautentikasi dapat melihat seluruh profil
CREATE POLICY "Profiles viewable by authenticated users"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (true);

-- 4. Kebijakan RLS: Pengguna dapat mengupdate profil sendiri
CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = id);

-- 5. Trigger Otomatis Pembuatan Profil saat Pengguna Mendaftar
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, role, full_name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'role', 'Tim Viewer'),
    COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1))
  )
  ON CONFLICT (id) DO UPDATE
  SET email = EXCLUDED.email,
      role = COALESCE(EXCLUDED.role, profiles.role);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();`;
