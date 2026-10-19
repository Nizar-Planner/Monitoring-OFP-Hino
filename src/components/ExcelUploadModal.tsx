import React, { useState, useRef } from 'react';
import { X, Upload, FileSpreadsheet, Download, CheckCircle2, AlertTriangle, RefreshCw, FileText } from 'lucide-react';
import { ExcelImportResult } from '../types';

interface ExcelUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (result: ExcelImportResult) => void;
}

export const ExcelUploadModal: React.FC<ExcelUploadModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
}) => {
  if (!isOpen) return null;

  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadResult, setUploadResult] = useState<ExcelImportResult | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      const ext = file.name.split('.').pop()?.toLowerCase();
      if (ext !== 'xlsx' && ext !== 'xls') {
        setErrorMessage('File harus berformat Excel (.xlsx atau .xls).');
        setSelectedFile(null);
        return;
      }
      setSelectedFile(file);
      setErrorMessage(null);
      setUploadResult(null);
    }
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      const ext = file.name.split('.').pop()?.toLowerCase();
      if (ext !== 'xlsx' && ext !== 'xls') {
        setErrorMessage('File harus berformat Excel (.xlsx atau .xls).');
        setSelectedFile(null);
        return;
      }
      setSelectedFile(file);
      setErrorMessage(null);
      setUploadResult(null);
    }
  };

  const handleSubmit = async () => {
    if (!selectedFile) {
      setErrorMessage('Pilih file Excel terlebih dahulu.');
      return;
    }

    setIsUploading(true);
    setErrorMessage(null);

    const formData = new FormData();
    formData.append('file', selectedFile);

    try {
      const res = await fetch('/api/upload-excel', {
        method: 'POST',
        body: formData,
      });

      const data = await res.json();
      if (data.success) {
        setUploadResult(data.data);
        onSuccess(data.data);
      } else {
        setErrorMessage(data.error || 'Gagal memproses file Excel.');
      }
    } catch (err: any) {
      console.error(err);
      setErrorMessage('Terjadi kesalahan koneksi saat meng-upload Excel.');
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-xl w-full shadow-2xl border border-slate-200 overflow-hidden flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-600 flex items-center justify-center font-bold text-white">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-sm sm:text-base">Upload Excel Monitoring OFP</h3>
              <p className="text-xs text-slate-400">
                Impor data dari folder sharing OneDrive kantor / file Excel lokal
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

        {/* Modal Body */}
        <div className="p-6 space-y-4 text-xs sm:text-sm">
          {/* Download Template Banner */}
          <div className="flex items-center justify-between p-3 bg-emerald-50 border border-emerald-200 rounded-xl">
            <div className="space-y-0.5">
              <span className="font-bold text-emerald-900 text-xs block">
                Format Standar Excel Monitoring HMSI
              </span>
              <p className="text-[11px] text-emerald-700">
                Gunakan template resmi agar nama kolom terbaca sempurna oleh sistem.
              </p>
            </div>
            <a
              href="/api/download-template"
              className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-lg transition-colors shadow-xs shrink-0"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Download Template</span>
            </a>
          </div>

          {/* Drag & Drop File Box */}
          <div
            onDragOver={(e) => e.preventDefault()}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-colors ${
              selectedFile
                ? 'border-emerald-500 bg-emerald-50/40'
                : 'border-slate-300 hover:border-slate-400 bg-slate-50'
            }`}
          >
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileChange}
              accept=".xlsx, .xls"
              className="hidden"
            />
            <div className="w-12 h-12 mx-auto rounded-full bg-white shadow-xs border border-slate-200 flex items-center justify-center text-slate-600 mb-2">
              <Upload className="w-6 h-6 text-emerald-600" />
            </div>

            {selectedFile ? (
              <div>
                <p className="font-bold text-slate-900 text-sm">{selectedFile.name}</p>
                <p className="text-xs text-slate-500 mt-1">
                  Ukuran: {(selectedFile.size / 1024).toFixed(1)} KB · Klik untuk ganti file
                </p>
              </div>
            ) : (
              <div>
                <p className="font-semibold text-slate-800 text-xs sm:text-sm">
                  Tarik &amp; lepas file Excel di sini, atau <span className="text-emerald-600 font-bold underline">klik untuk memilih</span>
                </p>
                <p className="text-[11px] text-slate-400 mt-1">
                  Mendukung file Microsoft Excel (.xlsx dan .xls)
                </p>
              </div>
            )}
          </div>

          {/* Kolom-Kolom yang Dikenali */}
          <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg text-xs space-y-1">
            <span className="font-bold text-slate-700 block text-[11px] uppercase tracking-wide">
              Kolom Excel yang Diekstrak Otomatis:
            </span>
            <p className="text-[11px] text-emerald-800 bg-emerald-50/60 p-2 rounded border border-emerald-200 font-mono leading-relaxed">
              TR_No · Part · Part Number · Model_Unit · Chassis · Engine_No · Mileage · DLR · QPI Number · Judgment · Judgement Date
            </p>
            <div className="pt-1.5 border-t border-slate-200 text-[11px] text-slate-500 space-y-0.5">
              <p>• <strong>Anti-Duplikasi Cerdas:</strong> Jika data TR / Part yang sama di-upload ulang, sistem otomatis memperbarui baris data tanpa merusak foto bukti verifikasi yang sudah tersimpan.</p>
              <p>• <strong>Multi-Part dalam 1 TR:</strong> Jika 1 Nomor TR memiliki beberapa jenis sparepart berbeda (berdasarkan Part Number / Part), sistem menyimpannya sebagai baris terpisah secara rapi.</p>
            </div>
          </div>

          {/* Error Message */}
          {errorMessage && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg flex items-start gap-2 text-xs text-red-700">
              <AlertTriangle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Success Summary */}
          {uploadResult && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg space-y-1 text-xs">
              <div className="flex items-center gap-1.5 font-bold text-emerald-900">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span>Impor Excel Berhasil!</span>
              </div>
              <div className="grid grid-cols-3 gap-2 pt-1 font-mono text-[11px]">
                <div className="bg-white p-2 rounded border border-emerald-200 text-center">
                  <span className="text-slate-500 block">Total Diproses</span>
                  <span className="font-bold text-slate-900">{uploadResult.totalRowsProcessed}</span>
                </div>
                <div className="bg-white p-2 rounded border border-emerald-200 text-center">
                  <span className="text-slate-500 block">Data Baru</span>
                  <span className="font-bold text-emerald-700">+{uploadResult.recordsInserted}</span>
                </div>
                <div className="bg-white p-2 rounded border border-emerald-200 text-center">
                  <span className="text-slate-500 block">Diperbarui</span>
                  <span className="font-bold text-blue-700">{uploadResult.recordsUpdated}</span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-3 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-xs">
          <button
            onClick={onClose}
            className="px-4 py-2 border border-slate-300 rounded-lg text-slate-700 font-medium hover:bg-slate-100"
          >
            {uploadResult ? 'Selesai' : 'Batal'}
          </button>

          {!uploadResult && (
            <button
              onClick={handleSubmit}
              disabled={!selectedFile || isUploading}
              className="flex items-center gap-1.5 px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-lg disabled:opacity-50 transition-colors shadow-xs"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isUploading ? 'animate-spin' : ''}`} />
              <span>{isUploading ? 'Mengimpor Data...' : 'Mulai Proses Impor'}</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
