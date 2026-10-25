import React, { useState, useRef } from 'react';
import { X, Upload, FileSpreadsheet, Download, CheckCircle2, AlertTriangle, RefreshCw, RotateCcw } from 'lucide-react';
import * as XLSX from 'xlsx';
import { ExcelImportResult, OpfRecord } from '../types';
import { extractOpfRecordsFromSheet } from '../utils/excelParser';

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
  const [uploadStep, setUploadStep] = useState<string | null>(null);
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

  /**
   * Dual-Strategy resilient upload & import:
   * Strategy 1: Direct backend file streaming to /api/upload-excel
   * Strategy 2 (Automatic Fallback): Client-side sheet parsing + batch JSON sync to /api/opf/bulk
   */
  const handleSubmit = async () => {
    if (!selectedFile) {
      setErrorMessage('Pilih file Excel terlebih dahulu.');
      return;
    }

    setIsUploading(true);
    setErrorMessage(null);
    setUploadResult(null);
    setUploadStep('Mengunggah & memproses file Excel...');

    try {
      // Strategy 1: Multipart upload to backend endpoint
      const formData = new FormData();
      formData.append('file', selectedFile);

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 45000); // 45s safety timeout

      let res: Response;
      try {
        res = await fetch('/api/upload-excel', {
          method: 'POST',
          body: formData,
          signal: controller.signal,
        });
      } finally {
        clearTimeout(timeoutId);
      }

      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          setUploadResult(data.data);
          onSuccess(data.data);
          return;
        } else {
          throw new Error(data.error || 'Gagal memproses file Excel.');
        }
      } else {
        let serverError = `Server error (${res.status})`;
        try {
          const errData = await res.json();
          if (errData?.error) serverError = errData.error;
        } catch {
          // not JSON, fallback to status text
          serverError = `${res.status} ${res.statusText}`;
        }
        throw new Error(serverError);
      }
    } catch (primaryErr: any) {
      console.warn('[UPLOAD] Direct server upload failed or timed out. Initiating local client parsing fallback...', primaryErr);
      setUploadStep('Mengalihkan ke pemrosesan lokal & sinkronisasi database...');

      // Strategy 2 (Fallback): Parse file directly in browser and bulk-send JSON
      try {
        const arrayBuffer = await selectedFile.arrayBuffer();
        const workbook = XLSX.read(arrayBuffer, { type: 'array' });
        const firstSheetName = workbook.SheetNames[0];
        if (!firstSheetName) {
          throw new Error('File Excel tidak memiliki lembar kerja (sheet).');
        }

        const worksheet = workbook.Sheets[firstSheetName];
        const { records, errors: parseErrors } = extractOpfRecordsFromSheet(worksheet);

        if (records.length === 0) {
          if (parseErrors.length > 0) {
            throw new Error(`Gagal membaca data Excel: ${parseErrors.slice(0, 3).join(', ')}`);
          }
          throw new Error('Tidak ada baris data valid yang ditemukan pada file Excel. Pastikan terdapat kolom TR_No dan Part.');
        }

        setUploadStep(`Menyimpan ${records.length} data OFP ke database...`);

        // Chunk sending to prevent oversized JSON payloads (500 records per chunk)
        const CHUNK_SIZE = 500;
        let totalRowsProcessed = 0;
        let recordsInserted = 0;
        let recordsUpdated = 0;
        const allErrors: string[] = [...parseErrors];

        for (let i = 0; i < records.length; i += CHUNK_SIZE) {
          const chunk = records.slice(i, i + CHUNK_SIZE);
          setUploadStep(`Menyimpan data baris ${i + 1} - ${Math.min(i + CHUNK_SIZE, records.length)} dari ${records.length}...`);

          const bulkRes = await fetch('/api/opf/bulk', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ records: chunk }),
          });

          if (!bulkRes.ok) {
            let bulkErrMsg = `Gagal menyimpan batch (status ${bulkRes.status})`;
            try {
              const bData = await bulkRes.json();
              if (bData?.error) bulkErrMsg = bData.error;
            } catch {}
            throw new Error(bulkErrMsg);
          }

          const bulkData = await bulkRes.json();
          if (bulkData.success && bulkData.data) {
            totalRowsProcessed += bulkData.data.totalRowsProcessed;
            recordsInserted += bulkData.data.recordsInserted;
            recordsUpdated += bulkData.data.recordsUpdated;
            if (bulkData.data.errors) allErrors.push(...bulkData.data.errors);
          }
        }

        const fallbackResult: ExcelImportResult = {
          totalRowsProcessed,
          recordsInserted,
          recordsUpdated,
          errors: allErrors,
        };

        setUploadResult(fallbackResult);
        onSuccess(fallbackResult);
      } catch (fallbackErr: any) {
        console.error('[FALLBACK IMPORT ERROR]', fallbackErr);
        const detailedMsg = fallbackErr.message || 'Gagal memproses file Excel.';
        setErrorMessage(
          `Gagal mengimpor file: ${detailedMsg}. Pastikan file Excel tidak rusak dan koneksi server stabil.`
        );
      }
    } finally {
      setIsUploading(false);
      setUploadStep(null);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
      <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-xl w-full max-h-[90vh] my-auto shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col">
        {/* Header */}
        <div className="px-5 sm:px-6 py-4 bg-slate-900 dark:bg-slate-950 text-white flex items-center justify-between border-b border-slate-800 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-600 flex items-center justify-center font-bold text-white shadow-xs shrink-0">
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
            className="p-1 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-4 sm:p-6 space-y-4 text-xs sm:text-sm overflow-y-auto flex-1">
          {/* Download Template Banner */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 p-3 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 rounded-xl">
            <div className="space-y-0.5">
              <span className="font-bold text-emerald-900 dark:text-emerald-200 text-xs block">
                Format Standar Excel Monitoring HMSI
              </span>
              <p className="text-[11px] text-emerald-700 dark:text-emerald-400">
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
                ? 'border-emerald-500 bg-emerald-50/40 dark:bg-emerald-950/20'
                : 'border-slate-300 dark:border-slate-700 hover:border-slate-400 dark:hover:border-slate-600 bg-slate-50 dark:bg-slate-800/50'
            }`}
          >
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileChange}
              accept=".xlsx, .xls"
              className="hidden"
            />
            <div className="w-12 h-12 mx-auto rounded-full bg-white dark:bg-slate-800 shadow-xs border border-slate-200 dark:border-slate-700 flex items-center justify-center text-slate-600 dark:text-slate-300 mb-2">
              <Upload className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
            </div>

            {selectedFile ? (
              <div>
                <p className="font-bold text-slate-900 dark:text-white text-sm">{selectedFile.name}</p>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  Ukuran: {(selectedFile.size / 1024).toFixed(1)} KB · Klik untuk ganti file
                </p>
              </div>
            ) : (
              <div>
                <p className="font-semibold text-slate-800 dark:text-slate-200 text-xs sm:text-sm">
                  Tarik &amp; lepas file Excel di sini, atau <span className="text-emerald-600 dark:text-emerald-400 font-bold underline">klik untuk memilih</span>
                </p>
                <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-1">
                  Mendukung file Microsoft Excel (.xlsx dan .xls)
                </p>
              </div>
            )}
          </div>

          {/* Kolom-Kolom yang Dikenali */}
          <div className="p-3.5 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl text-xs space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-bold text-slate-800 dark:text-slate-200 text-[11px] uppercase tracking-wide">
                KOLOM EXCEL YANG DIEKSTRAK OTOMATIS:
              </span>
              <span className="text-[10px] font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 px-1.5 py-0.5 rounded">
                Parser Aktif
              </span>
            </div>

            <p className="text-[11px] text-emerald-800 dark:text-emerald-300 bg-emerald-50/70 dark:bg-emerald-950/40 p-2.5 rounded-lg border border-emerald-200 dark:border-emerald-800 font-mono leading-relaxed">
              TR_No · Part · Part Number · Model_Unit · Chassis · Engine_No · Mileage · DLR · QPI Number · <strong className="text-emerald-900 dark:text-emerald-100 bg-emerald-200/80 dark:bg-emerald-800/80 px-1.5 py-0.5 rounded font-bold">Problem</strong> · Judgment · Judgement Date · <strong className="text-emerald-900 dark:text-emerald-100 bg-emerald-200/80 dark:bg-emerald-800/80 px-1.5 py-0.5 rounded font-bold">Occurred Date</strong> · <strong className="text-emerald-900 dark:text-emerald-100 bg-emerald-200/80 dark:bg-emerald-800/80 px-1.5 py-0.5 rounded font-bold">Repair Date</strong> · <strong className="text-emerald-900 dark:text-emerald-100 bg-emerald-200/80 dark:bg-emerald-800/80 px-1.5 py-0.5 rounded font-bold">OFP Receive</strong> · <strong className="text-emerald-900 dark:text-emerald-100 bg-emerald-200/80 dark:bg-emerald-800/80 px-1.5 py-0.5 rounded font-bold">OFP Send to HMMI</strong>
            </p>

            <div className="pt-2 border-t border-slate-200 dark:border-slate-700 text-[11px] text-slate-600 dark:text-slate-400 space-y-1.5">
              <p className="font-semibold text-slate-700 dark:text-slate-300">• <strong>Logika Status Otomatis:</strong></p>
              <ul className="list-disc list-inside pl-1 space-y-1 text-slate-500 dark:text-slate-400">
                <li>Jika kolom <strong>OFP Send to HMMI</strong> terisi tanggal &rarr; status otomatis <span className="text-emerald-700 dark:text-emerald-400 font-semibold">"Sent to HMMI"</span>.</li>
                <li>Jika kolom <strong>OFP Receive</strong> terisi tanggal &rarr; status otomatis <span className="text-blue-700 dark:text-blue-400 font-semibold">"Received by Area"</span>.</li>
                <li>Jika kedua kolom tanggal tersebut kosong &rarr; status otomatis <span className="text-amber-700 dark:text-amber-400 font-semibold">"Belum Terkirim"</span>.</li>
              </ul>
              <p className="pt-1 text-slate-500 dark:text-slate-400">• <strong>Anti-Duplikasi Cerdas:</strong> Jika data TR / Part yang sama di-upload ulang, sistem otomatis memperbarui baris data tanpa merusak foto bukti verifikasi yang sudah tersimpan.</p>
            </div>
          </div>

          {/* Processing step indicator */}
          {isUploading && uploadStep && (
            <div className="p-3 bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800 rounded-lg flex items-center gap-2.5 text-xs text-blue-700 dark:text-blue-300">
              <RefreshCw className="w-4 h-4 text-blue-600 dark:text-blue-400 animate-spin shrink-0" />
              <span className="font-medium">{uploadStep}</span>
            </div>
          )}

          {/* Error Message */}
          {errorMessage && (
            <div className="p-3 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 rounded-lg flex items-start justify-between gap-2 text-xs text-red-700 dark:text-red-300">
              <div className="flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 text-red-600 dark:text-red-400 shrink-0 mt-0.5" />
                <span>{errorMessage}</span>
              </div>
              <button
                onClick={handleSubmit}
                className="shrink-0 flex items-center gap-1 font-semibold text-red-800 dark:text-red-300 hover:text-red-900 underline text-[11px]"
              >
                <RotateCcw className="w-3 h-3" />
                <span>Coba Lagi</span>
              </button>
            </div>
          )}

          {/* Success Summary */}
          {uploadResult && (
            <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 rounded-lg space-y-2 text-xs">
              <div className="flex items-center gap-1.5 font-bold text-emerald-900 dark:text-emerald-200">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                <span>Impor Excel Berhasil!</span>
              </div>
              <div className="grid grid-cols-3 gap-2 pt-1 font-mono text-[11px]">
                <div className="bg-white dark:bg-slate-800 p-2 rounded border border-emerald-200 dark:border-emerald-800 text-center">
                  <span className="text-slate-500 dark:text-slate-400 block">Total Diproses</span>
                  <span className="font-bold text-slate-900 dark:text-white">{uploadResult.totalRowsProcessed}</span>
                </div>
                <div className="bg-white dark:bg-slate-800 p-2 rounded border border-emerald-200 dark:border-emerald-800 text-center">
                  <span className="text-slate-500 dark:text-slate-400 block">Data Baru</span>
                  <span className="font-bold text-emerald-700 dark:text-emerald-400">+{uploadResult.recordsInserted}</span>
                </div>
                <div className="bg-white dark:bg-slate-800 p-2 rounded border border-emerald-200 dark:border-emerald-800 text-center">
                  <span className="text-slate-500 dark:text-slate-400 block">Diperbarui</span>
                  <span className="font-bold text-blue-700 dark:text-blue-400">{uploadResult.recordsUpdated}</span>
                </div>
              </div>
              {uploadResult.errors && uploadResult.errors.length > 0 && (
                <div className="mt-2 p-2 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 rounded text-[11px] text-amber-800 dark:text-amber-300 max-h-24 overflow-y-auto">
                  <span className="font-bold block mb-1">Catatan Baris Dilewati:</span>
                  <ul className="list-disc list-inside space-y-0.5">
                    {uploadResult.errors.slice(0, 5).map((err, idx) => (
                      <li key={idx}>{err}</li>
                    ))}
                    {uploadResult.errors.length > 5 && (
                      <li>...dan {uploadResult.errors.length - 5} baris lainnya.</li>
                    )}
                  </ul>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-3 bg-slate-50 dark:bg-slate-950 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs">
          <button
            onClick={onClose}
            className="px-4 py-2 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-700 dark:text-slate-300 font-medium hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
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
