import React, { useState } from 'react';
import {
  X,
  FileSpreadsheet,
  Cloud,
  Check,
  Server,
  FolderOpen,
  ArrowRight,
  ShieldCheck,
  Laptop
} from 'lucide-react';

interface DeployGuideModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const DeployGuideModal: React.FC<DeployGuideModalProps> = ({
  isOpen,
  onClose,
}) => {
  if (!isOpen) return null;

  const [activeTab, setActiveTab] = useState<'onedrive' | 'local' | 'cloud'>('onedrive');

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-2xl w-full shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-red-600 flex items-center justify-center font-bold text-white">
              <Cloud className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-sm sm:text-base">
                Panduan Operasional &amp; Cara Menjalankan
              </h3>
              <p className="text-xs text-slate-400">
                Integrasi Excel OneDrive Kantor, Laptop Kantor, dan Hosting Cloud
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Selection */}
        <div className="grid grid-cols-3 border-b border-slate-200 bg-slate-50 text-xs font-semibold">
          <button
            onClick={() => setActiveTab('onedrive')}
            className={`py-3 px-2 text-center border-b-2 transition-colors flex items-center justify-center gap-1.5 ${
              activeTab === 'onedrive'
                ? 'border-emerald-600 text-emerald-700 bg-white'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <FileSpreadsheet className="w-3.5 h-3.5" />
            <span>1. Alur Excel OneDrive</span>
          </button>

          <button
            onClick={() => setActiveTab('local')}
            className={`py-3 px-2 text-center border-b-2 transition-colors flex items-center justify-center gap-1.5 ${
              activeTab === 'local'
                ? 'border-blue-600 text-blue-700 bg-white'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Laptop className="w-3.5 h-3.5" />
            <span>2. Di Laptop Kantor</span>
          </button>

          <button
            onClick={() => setActiveTab('cloud')}
            className={`py-3 px-2 text-center border-b-2 transition-colors flex items-center justify-center gap-1.5 ${
              activeTab === 'cloud'
                ? 'border-red-600 text-red-700 bg-white'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Server className="w-3.5 h-3.5" />
            <span>3. Pasang di Cloud</span>
          </button>
        </div>

        {/* Body Content */}
        <div className="p-6 overflow-y-auto space-y-4 text-xs sm:text-sm text-slate-700">
          
          {/* TAB 1: ONEDRIVE */}
          {activeTab === 'onedrive' && (
            <div className="space-y-3">
              <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl space-y-1">
                <span className="font-bold text-emerald-900 text-xs block">
                  Cara Menggunakan File Excel dari Sharing OneDrive Kantor
                </span>
                <p className="text-[11px] text-emerald-800 leading-relaxed">
                  Tidak perlu repot coding. Tim cukup mengisi atau mengekstrak data ke file Excel di OneDrive, lalu meng-upload file tersebut ke dashboard.
                </p>
              </div>

              <ol className="list-decimal list-inside space-y-2.5 text-xs text-slate-600 pl-1">
                <li>
                  Klik tombol <strong>&ldquo;Template Excel&rdquo;</strong> di pojok kanan atas untuk melihat urutan kolom resmi.
                </li>
                <li>
                  Pastikan kolom-kolom berikut ada di file Excel OneDrive kantor Anda:
                  <div className="bg-slate-100 p-2.5 rounded-lg font-mono text-[11px] text-slate-800 mt-1 leading-relaxed">
                    Nomor DTR | Part Name | Quantity | Model | No. Chassis | No. Engine | Mileage | Dealer | Nomor QPI | Judgement QPI | Tanggal DTR
                  </div>
                </li>
                <li>
                  Setiap ada pembaharuan data di folder sharing OneDrive, klik tombol hijau <strong>&ldquo;Upload Excel&rdquo;</strong> di dashboard lalu pilih file tersebut.
                </li>
                <li>
                  Sistem otomatis melakukan <strong>Anti-Duplikasi</strong>: jika DTR dan Part yang sama di-upload ulang, data master akan di-update tanpa menghapus bukti foto yang telah diambil oleh Tim Area atau Tim Quality.
                </li>
              </ol>
            </div>
          )}

          {/* TAB 2: LAPTOP KANTOR */}
          {activeTab === 'local' && (
            <div className="space-y-3">
              <div className="p-3 bg-blue-50 border border-blue-200 rounded-xl space-y-1">
                <span className="font-bold text-blue-900 text-xs block">
                  Jalankan di Laptop / Komputer Kantor (100% Gratis &amp; Tanpa Kartu Kredit)
                </span>
                <p className="text-[11px] text-blue-800 leading-relaxed">
                  Anda bisa menjalankan dashboard ini secara lokal di komputer kantor tanpa biaya hosting apa pun.
                </p>
              </div>

              <ol className="list-decimal list-inside space-y-2 text-xs text-slate-600 pl-1">
                <li>Download / Ekstrak seluruh file proyek ini ke komputer kantor Anda.</li>
                <li>Pastikan komputer Anda sudah terpasang <strong>Node.js</strong> (dapat di-download gratis di <a href="https://nodejs.org" target="_blank" rel="noreferrer" className="text-blue-600 underline font-bold">nodejs.org</a>).</li>
                <li>Klik dua kali file otomatis <strong>`jalankan.bat`</strong> di folder proyek.</li>
                <li>Browser Chrome Anda akan otomatis terbuka di alamat <code>http://localhost:3000</code>.</li>
                <li>
                  <strong>Buka dari HP:</strong> Jika ingin membuka dari HP lewat WiFi kantor yang sama, cukup buka alamat IP laptop Anda (contoh: <code>http://192.168.1.10:3000</code>).
                </li>
              </ol>
            </div>
          )}

          {/* TAB 3: CLOUD */}
          {activeTab === 'cloud' && (
            <div className="space-y-3">
              <div className="p-3 bg-red-50 border border-red-200 rounded-xl space-y-1">
                <span className="font-bold text-red-900 text-xs block">
                  Pasang di Cloud Hosting Gratis (Render / Koyeb / Docker)
                </span>
                <p className="text-[11px] text-red-800 leading-relaxed">
                  Aplikasi ini menggunakan Express + SQLite berbasis file sehingga membutuhkan runtime Node.js server aktif.
                </p>
              </div>

              <div className="space-y-2 text-xs text-slate-600">
                <p>
                  <strong>1. Google Cloud Run (Aktif Sekarang):</strong> Aplikasi Anda sudah langsung aktif di link Shared App URL Google AI Studio tanpa perlu kartu kredit.
                </p>
                <p>
                  <strong>2. Koyeb.com / Render:</strong> Hubungkan repositori GitHub Anda dan pilih runtime Docker. File <code>Dockerfile</code> sudah kami siapkan lengkap.
                </p>
                <p>
                  <strong>3. Catatan Vercel / Netlify:</strong> Vercel &amp; Netlify adalah hosting serverless yang bersifat &ldquo;read-only&rdquo; (tidak mengizinkan penulisan file SQLite lokal secara permanen). Untuk aplikasi yang menyimpan file SQLite seperti ini, disarankan menggunakan Node.js Server (seperti Cloud Run, Koyeb, Docker VPS, atau Komputer Kantor).
                </p>
              </div>
            </div>
          )}

        </div>

        {/* Footer */}
        <div className="px-6 py-3 bg-slate-50 border-t border-slate-200 flex items-center justify-end text-xs">
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-slate-900 text-white font-semibold rounded-lg hover:bg-slate-800"
          >
            Tutup
          </button>
        </div>

      </div>
    </div>
  );
};
