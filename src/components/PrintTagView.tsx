import React, { useState, useRef, useMemo, useEffect } from 'react';
import {
  Printer,
  X,
  Tag,
  Info,
  Copy,
  Check,
  FileDown,
  CheckCircle2,
  Loader2,
  AlertCircle,
  Download,
} from 'lucide-react';
import { OpfRecord } from '../types';
import { downloadTagsPdf, formatQpiDisplay } from '../utils/tagPdfGenerator';

interface PrintTagViewProps {
  isOpen: boolean;
  onClose: () => void;
  selectedRecords: OpfRecord[];
  onRemoveRecord?: (idOrDtr: string | number) => void;
}

/**
 * Format helper: Memberikan nilai fallback '-' jika string kosong, null, atau undefined
 */
function getSafeValue(val: any, fallback: string = '-'): string {
  if (val === null || val === undefined) return fallback;
  const str = String(val).trim();
  if (!str || str === '' || str === 'null' || str === 'undefined' || str === 'NaN') {
    return fallback;
  }
  return str;
}

/**
 * Format tanggal Indonesia / ISO ke tampilan ringkas DD/MM/YYYY
 */
function formatDateTag(val: any): string {
  if (!val) return '-';
  const str = String(val).trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(str)) {
    const [y, m, d] = str.split('-');
    return `${d}/${m}/${y}`;
  }
  return str;
}

export const PrintTagView: React.FC<PrintTagViewProps> = ({
  isOpen,
  onClose,
  selectedRecords,
  onRemoveRecord,
}) => {
  const [tagList, setTagList] = useState<OpfRecord[]>(selectedRecords);
  const [copiedDtr, setCopiedDtr] = useState<string | null>(null);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const [isPrinting, setIsPrinting] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{
    type: 'success' | 'info' | 'error';
    title: string;
    description: string;
    downloadUrl?: string;
    downloadFilename?: string;
  } | null>(null);

  const printContainerRef = useRef<HTMLDivElement>(null);

  // Sinkronisasi tagList saat selectedRecords berubah
  useEffect(() => {
    setTagList(selectedRecords);
  }, [selectedRecords]);

  // Bagi tag per halaman A4 (6 tag per halaman = 2 baris x 3 kolom)
  // Menjamin tag tidak pernah terpotong di tengah lembar A4 dan memiliki proporsi tajam
  const TAGS_PER_PAGE = 6;
  const tagPages = useMemo(() => {
    const pages: OpfRecord[][] = [];
    for (let i = 0; i < tagList.length; i += TAGS_PER_PAGE) {
      pages.push(tagList.slice(i, i + TAGS_PER_PAGE));
    }
    return pages.length > 0 ? pages : [[]];
  }, [tagList]);

  if (!isOpen) return null;

  /**
   * 1. Cetak Langsung ke Printer Fisik
   * Menggunakan teknik isolated printable iframe dan direct window.print fallback
   */
  const handleDirectPrint = () => {
    if (tagList.length === 0) return;
    setIsPrinting(true);
    setStatusMessage({
      type: 'info',
      title: 'Mempersiapkan Cetak ke Printer...',
      description: 'Membuka dialog cetak printer langsung. Pastikan kertas diatur ke A4 Portrait.',
    });

    try {
      const container = printContainerRef.current;
      const oldIframe = document.getElementById('opf-print-iframe');
      if (oldIframe) {
        oldIframe.remove();
      }

      // Buat iframe terisolasi agar dialog cetak langsung muncul tanpa terhalang sandbox
      const iframe = document.createElement('iframe');
      iframe.id = 'opf-print-iframe';
      iframe.style.position = 'fixed';
      iframe.style.right = '0';
      iframe.style.bottom = '0';
      iframe.style.width = '0';
      iframe.style.height = '0';
      iframe.style.border = '0';
      iframe.style.visibility = 'hidden';
      document.body.appendChild(iframe);

      const iframeDoc = iframe.contentWindow?.document;
      if (iframeDoc && container) {
        iframeDoc.open();
        // Kumpulkan styles aplikasi
        const styles = Array.from(document.querySelectorAll('style, link[rel="stylesheet"]'))
          .map((el) => el.outerHTML)
          .join('\n');

        iframeDoc.write(`
          <!DOCTYPE html>
          <html>
            <head>
              <meta charset="utf-8" />
              <title>Print Original Failure Part Tag - HMSI</title>
              ${styles}
              <style>
                @page {
                  size: A4 portrait;
                  margin: 6mm 5mm;
                }
                body {
                  margin: 0;
                  padding: 0;
                  background: #ffffff !important;
                  color: #000000 !important;
                  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
                  -webkit-print-color-adjust: exact !important;
                  print-color-adjust: exact !important;
                }
                .opf-pdf-page {
                  page-break-after: always;
                  break-after: page;
                  padding: 6mm 5mm;
                  box-sizing: border-box;
                }
                .opf-pdf-page:last-child {
                  page-break-after: avoid;
                  break-after: avoid;
                }
                .tag-grid {
                  display: grid !important;
                  grid-template-columns: repeat(3, 1fr) !important;
                  gap: 3.5mm !important;
                }
                .print-tag-card {
                  break-inside: avoid !important;
                  page-break-inside: avoid !important;
                  border: 1.5px solid #000 !important;
                  background: #ffffff !important;
                }
              </style>
            </head>
            <body>
              ${container.innerHTML}
            </body>
          </html>
        `);
        iframeDoc.close();

        setTimeout(() => {
          try {
            iframe.contentWindow?.focus();
            iframe.contentWindow?.print();
          } catch (e) {
            console.warn('Iframe print error, falling back to window.print():', e);
            window.focus();
            window.print();
          }
          setIsPrinting(false);
        }, 350);
        return;
      }

      // Fallback
      window.focus();
      window.print();
    } catch (err) {
      console.error('Print trigger error:', err);
      window.focus();
      window.print();
    } finally {
      setTimeout(() => setIsPrinting(false), 1000);
    }
  };

  /**
   * 2. Simpan sebagai PDF Langsung
   * Menghasilkan file PDF A4 resolusi tinggi (3 kolom per baris) dan otomatis men-download file .pdf ke perangkat
   */
  const handleSavePdf = async () => {
    if (tagList.length === 0) return;
    setIsGeneratingPdf(true);
    setStatusMessage({
      type: 'info',
      title: 'Menyiapkan File PDF...',
      description: `Sedang memproses ${tagList.length} tag part menjadi dokumen PDF A4...`,
    });

    try {
      // Tunggu jeda microtask agar spinner UI sempat dirender
      await new Promise((resolve) => setTimeout(resolve, 80));

      // Buat & download file PDF secara langsung menggunakan vector engine jsPDF
      const { filename, blobUrl } = downloadTagsPdf(tagList);

      setStatusMessage({
        type: 'success',
        title: 'File PDF Berhasil Dibuat & Diunduh!',
        description: `File "${filename}" telah otomatis dikirim ke download manager browser Anda.`,
        downloadUrl: blobUrl,
        downloadFilename: filename,
      });
    } catch (err: any) {
      console.error('Error generating PDF:', err);
      setStatusMessage({
        type: 'error',
        title: 'Gagal Membuat File PDF',
        description:
          'Terjadi kesalahan saat memproses file PDF: ' + (err?.message || 'Error tidak diketahui'),
      });
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  const handleRemove = (item: OpfRecord) => {
    const key = item.id || `${item.dtr_number}-${item.part_name}`;
    setTagList((prev) =>
      prev.filter((r) => (r.id ? r.id !== item.id : `${r.dtr_number}-${r.part_name}` !== key))
    );
    if (onRemoveRecord) {
      onRemoveRecord(item.id || item.dtr_number);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedDtr(text);
    setTimeout(() => setCopiedDtr(null), 2000);
  };

  return (
    <>
      {/* =========================================================================
          PRINT STYLES: Dioptimalkan untuk Kertas A4 Portrait (3 Kolom per Baris)
          Hanya merender area tag stiker, menyembunyikan semua elemen UI lainnya.
          ========================================================================= */}
      <style>{`
        @media print {
          @page {
            size: A4 portrait;
            margin: 6mm 5mm 6mm 5mm;
          }
          
          html, body {
            background: #ffffff !important;
            color: #000000 !important;
            margin: 0 !important;
            padding: 0 !important;
            font-size: 11px !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }

          /* Sembunyikan semua elemen UI dashboard, modal backdrop, scrollbar */
          .no-print,
          header,
          footer,
          nav,
          main,
          aside,
          .print-tag-backdrop {
            display: none !important;
          }

          /* Tampilkan area render cetak */
          #opf-printable-sheet {
            position: static !important;
            left: auto !important;
            top: auto !important;
            width: 100% !important;
            z-index: auto !important;
            pointer-events: auto !important;
            display: block !important;
          }

          .opf-pdf-page {
            min-height: auto !important;
            padding: 4mm 2mm !important;
            page-break-after: always !important;
            break-after: page !important;
          }

          .opf-pdf-page:last-child {
            page-break-after: avoid !important;
            break-after: avoid !important;
          }

          .tag-grid {
            display: grid !important;
            grid-template-columns: repeat(3, minmax(0, 1fr)) !important;
            gap: 3.5mm !important;
            width: 100% !important;
          }

          .print-tag-card {
            break-inside: avoid !important;
            page-break-inside: avoid !important;
            display: block !important;
            border: 1.5px solid #000000 !important;
            background: #ffffff !important;
            margin: 0 !important;
            box-shadow: none !important;
          }
        }
      `}</style>

      {/* =========================================================================
          PREVIEW MODAL UI (Terlihat di layar browser, otomatis hidden saat print)
          ========================================================================= */}
      <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5 print-tag-backdrop no-print">
        <div className="bg-white rounded-2xl w-full max-w-6xl max-h-[92vh] shadow-2xl border border-slate-200 overflow-hidden flex flex-col">
          {/* Modal Header Bar */}
          <div className="px-6 py-4 bg-slate-900 text-white flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 shrink-0">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-red-600 flex items-center justify-center text-white shadow-sm font-black shrink-0">
                <Tag className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="font-extrabold text-sm sm:text-base tracking-tight text-white">
                    Pratinjau Cetak Tag Part (Original Failure Part Tag)
                  </h3>
                  <span className="bg-red-500/30 text-red-300 font-mono text-[11px] px-2 py-0.5 rounded border border-red-500/40 font-bold">
                    HMSI-Field Quality
                  </span>
                </div>
                <p className="text-xs text-slate-300 mt-0.5">
                  Label stiker fisik resmi pengiriman part failure ke Pabrik HMMI / HML
                </p>
              </div>
            </div>

            {/* Direct Action Buttons: Print via Printer & Save as PDF */}
            <div className="flex items-center gap-2 shrink-0">
              {/* Button 1: Cetak ke Printer */}
              <button
                type="button"
                onClick={handleDirectPrint}
                disabled={tagList.length === 0 || isPrinting || isGeneratingPdf}
                className="flex items-center gap-1.5 px-3.5 py-2 bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white rounded-lg text-xs font-bold transition-all shadow-md active:scale-95 cursor-pointer disabled:cursor-not-allowed"
                title="Cetak langsung menggunakan printer fisik"
              >
                {isPrinting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin text-white" />
                    <span>Membuka Printer...</span>
                  </>
                ) : (
                  <>
                    <Printer className="w-4 h-4" />
                    <span>Cetak ke Printer</span>
                  </>
                )}
              </button>

              {/* Button 2: Simpan sebagai PDF */}
              <button
                type="button"
                onClick={handleSavePdf}
                disabled={tagList.length === 0 || isPrinting || isGeneratingPdf}
                className="flex items-center gap-1.5 px-3.5 py-2 bg-slate-800 hover:bg-slate-700 disabled:opacity-50 text-white rounded-lg text-xs font-bold transition-all shadow-md border border-slate-700 active:scale-95 cursor-pointer disabled:cursor-not-allowed"
                title="Langsung unduh dokumen PDF stiker part"
              >
                {isGeneratingPdf ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin text-red-400" />
                    <span>Membuat PDF...</span>
                  </>
                ) : (
                  <>
                    <FileDown className="w-4 h-4 text-red-400" />
                    <span>Simpan sebagai PDF</span>
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={onClose}
                className="p-2 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors ml-1 cursor-pointer"
                title="Tutup pratinjau"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Action & Info Strip */}
          <div className="px-6 py-2.5 bg-slate-100 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3 text-xs shrink-0">
            <div className="flex items-center gap-2 text-slate-700">
              <Info className="w-4 h-4 text-blue-600 shrink-0" />
              <span>
                Total <strong>{tagList.length} tag</strong> siap dicetak untuk unit{' '}
                <strong>HMSI-Field Quality</strong> ({tagPages.length} Halaman A4).
              </span>
            </div>

            <div className="flex items-center gap-2 text-[11px] text-slate-600">
              <span className="bg-white text-slate-700 px-2.5 py-0.5 rounded font-medium border border-slate-200 shadow-2xs">
                Format Cetak: <strong>Kertas A4 (3 Kolom per Baris)</strong>
              </span>
            </div>
          </div>

          {/* Scrollable Preview Area (Simulasi lembar kertas A4 dihilangkan) */}
          <div className="p-5 sm:p-6 overflow-y-auto bg-slate-50 flex-1">
            {/* Interactive Status & Feedback Banner */}
            {statusMessage && (
              <div
                className={`mb-4 p-3.5 rounded-xl border flex items-start justify-between gap-3 text-xs shadow-xs transition-all ${
                  statusMessage.type === 'success'
                    ? 'bg-emerald-50 border-emerald-200 text-emerald-950'
                    : statusMessage.type === 'error'
                    ? 'bg-amber-50 border-amber-200 text-amber-950'
                    : 'bg-blue-50 border-blue-200 text-blue-950'
                }`}
              >
                <div className="flex items-start gap-2.5">
                  {statusMessage.type === 'success' ? (
                    <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                  ) : statusMessage.type === 'error' ? (
                    <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                  ) : (
                    <Loader2 className="w-5 h-5 text-blue-600 shrink-0 mt-0.5 animate-spin" />
                  )}
                  <div>
                    <h5 className="font-bold text-xs">{statusMessage.title}</h5>
                    <p className="text-[11px] mt-0.5 leading-relaxed opacity-90">
                      {statusMessage.description}
                    </p>
                    {statusMessage.downloadUrl && (
                      <div className="mt-2.5 flex items-center gap-2">
                        <a
                          href={statusMessage.downloadUrl}
                          download={statusMessage.downloadFilename || 'Tag-Original-Failure-Part.pdf'}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg text-xs font-bold shadow-xs transition-colors"
                        >
                          <Download className="w-3.5 h-3.5" />
                          <span>Unduh Manual File PDF ({statusMessage.downloadFilename})</span>
                        </a>
                      </div>
                    )}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setStatusMessage(null)}
                  className="text-slate-400 hover:text-slate-700 font-bold px-1.5 py-0.5 rounded cursor-pointer"
                >
                  &times;
                </button>
              </div>
            )}

            {tagList.length === 0 ? (
              <div className="text-center py-16 bg-white rounded-xl border border-slate-200 p-8 space-y-3">
                <Tag className="w-12 h-12 text-slate-300 mx-auto" />
                <h4 className="text-base font-bold text-slate-800">Tidak ada tag part yang dipilih</h4>
                <p className="text-xs text-slate-500 max-w-md mx-auto">
                  Silakan centang satu atau beberapa baris klaim part di tabel utama terlebih dahulu
                  untuk mencetak tag fisik.
                </p>
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 bg-slate-900 text-white rounded-lg text-xs font-semibold hover:bg-slate-800 cursor-pointer"
                >
                  Kembali ke Tabel
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                {/* Section Header: HMSI-Field Quality */}
                <div className="flex flex-wrap items-center justify-between gap-3 bg-white px-4 py-3 rounded-xl border border-slate-200 text-xs shadow-2xs">
                  <div className="flex items-center gap-2.5">
                    <span className="font-extrabold text-sm text-slate-900 tracking-wide">
                      HMSI-Field Quality
                    </span>
                    <span className="text-slate-300">|</span>
                    <span className="text-slate-600 font-medium">
                      Daftar Tag Stiker ({tagList.length} Label Part)
                    </span>
                  </div>

                  <div className="flex items-center gap-2 text-[11px] text-slate-500 font-mono">
                    <span className="bg-slate-100 text-slate-700 px-2 py-0.5 rounded border border-slate-200">
                      Standar Grid 3 Kolom
                    </span>
                  </div>
                </div>

                {/* Direct 3-Column Tag Grid without artificial A4 paper framing */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
                  {tagList.map((record, index) => (
                    <div key={record.id || `${record.dtr_number}-${index}`} className="relative group">
                      {/* Interactive Remove Tag button */}
                      <button
                        type="button"
                        onClick={() => handleRemove(record)}
                        className="absolute -top-2 -right-2 z-10 w-6 h-6 rounded-full bg-red-600 hover:bg-red-700 text-white flex items-center justify-center shadow-md transition-all opacity-0 group-hover:opacity-100 no-print cursor-pointer"
                        title="Hapus tag ini dari antrean cetak"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>

                      {/* Render Tag Card */}
                      <SingleTagCard
                        record={record}
                        onCopyDtr={copyToClipboard}
                        copiedDtr={copiedDtr}
                      />
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Modal Footer Bar */}
          <div className="px-6 py-3.5 bg-white border-t border-slate-200 flex flex-wrap items-center justify-between gap-3 text-xs shrink-0">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-slate-300 hover:bg-slate-50 text-slate-700 font-semibold rounded-lg transition-colors cursor-pointer"
            >
              Tutup Pratinjau
            </button>

            <div className="flex flex-wrap items-center gap-2.5">
              <span className="text-slate-500 text-[11px] font-medium mr-1 hidden sm:inline">
                {tagList.length} Label Part Terpilih ({tagPages.length} Halaman A4)
              </span>

              {/* Cetak ke Printer Fisik */}
              <button
                type="button"
                onClick={handleDirectPrint}
                disabled={tagList.length === 0 || isPrinting || isGeneratingPdf}
                className="flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white font-bold rounded-lg shadow-sm transition-all active:scale-95 cursor-pointer disabled:cursor-not-allowed"
              >
                {isPrinting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin text-white" />
                    <span>Membuka Printer...</span>
                  </>
                ) : (
                  <>
                    <Printer className="w-4 h-4" />
                    <span>Cetak ke Printer</span>
                  </>
                )}
              </button>

              {/* Cetak atau Simpan sebagai PDF Langsung */}
              <button
                type="button"
                onClick={handleSavePdf}
                disabled={tagList.length === 0 || isPrinting || isGeneratingPdf}
                className="flex items-center gap-2 px-4 py-2 bg-slate-900 hover:bg-slate-800 disabled:opacity-50 text-white font-bold rounded-lg shadow-sm transition-all border border-slate-700 active:scale-95 cursor-pointer disabled:cursor-not-allowed"
              >
                {isGeneratingPdf ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin text-red-400" />
                    <span>Membuat PDF...</span>
                  </>
                ) : (
                  <>
                    <FileDown className="w-4 h-4 text-red-400" />
                    <span>Simpan sebagai PDF</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* =========================================================================
          HIGH-RESOLUTION RENDER TARGET FOR DIRECT PDF EXPORT & IFRAME PRINT
          Ditempatkan di luar viewport layar dengan lebar presisi A4 (794px pada 96 DPI)
          sehingga html2canvas dan engine printer merender teks & barcode dengan tajam.
          ========================================================================= */}
      <div
        ref={printContainerRef}
        id="opf-printable-sheet"
        style={{
          position: 'fixed',
          left: '-9999px',
          top: 0,
          width: '794px',
          background: '#ffffff',
          zIndex: -9999,
          pointerEvents: 'none',
        }}
      >
        {tagPages.map((pageTags, pageIdx) => (
          <div
            key={`page-${pageIdx}`}
            className="opf-pdf-page bg-white p-4 box-border"
            style={{
              width: '794px',
              minHeight: '1120px',
              backgroundColor: '#ffffff',
              pageBreakAfter: pageIdx < tagPages.length - 1 ? 'always' : 'avoid',
              breakAfter: pageIdx < tagPages.length - 1 ? 'page' : 'avoid',
            }}
          >
            {/* Header info per lembar A4 */}
            <div className="flex items-center justify-between border-b-2 border-slate-900 pb-2 mb-3">
              <div className="flex items-center gap-2">
                <span className="bg-red-700 text-white font-black text-xs px-2 py-0.5 rounded">
                  HINO
                </span>
                <span className="font-extrabold text-xs text-slate-900 tracking-wide">
                  ORIGINAL FAILURE PART TAG - HMSI-Field Quality
                </span>
              </div>
              <span className="text-[10px] font-mono text-slate-600">
                Lembar {pageIdx + 1} dari {tagPages.length} | Total {tagList.length} Label Part
              </span>
            </div>

            {/* 3-Column Tag Grid */}
            <div className="tag-grid grid grid-cols-3 gap-3">
              {pageTags.map((record, index) => (
                <div
                  key={`export-tag-${record.id || record.dtr_number}-${index}`}
                  className="print-tag-card"
                  style={{ breakInside: 'avoid', pageBreakInside: 'avoid' }}
                >
                  <SingleTagCard record={record} isPrintMode={true} />
                </div>
              ))}
            </div>

            {/* Footer info per lembar A4 */}
            <div className="mt-4 pt-2 border-t border-slate-300 flex items-center justify-between text-[9px] text-slate-500 font-mono">
              <span>PT Hino Motors Sales Indonesia - HMSI-Field Quality &rarr; Pabrik HMMI</span>
              <span>Dicetak: {new Date().toLocaleDateString('id-ID')}</span>
            </div>
          </div>
        ))}
      </div>
    </>
  );
};

/**
 * Komponen Kartu Satuan Tag Part (Original Failure Part Tag)
 * Memuat semua 10 atribut wajib dengan tata letak garis tepi kotak yang rapi.
 */
interface SingleTagCardProps {
  record: OpfRecord;
  isPrintMode?: boolean;
  onCopyDtr?: (dtr: string) => void;
  copiedDtr?: string | null;
}

export const SingleTagCard: React.FC<SingleTagCardProps> = ({
  record,
  isPrintMode = false,
  onCopyDtr,
  copiedDtr,
}) => {
  // 10 Atribut Data Wajib
  const rawQpiNo = getSafeValue(record.qpi_number);
  const qpiInfo = formatQpiDisplay(rawQpiNo);
  const partName = getSafeValue(record.part_name);
  const problem = getSafeValue(
    record.problem || record.judgement_qpi || record.quality_notes || record.area_notes
  );
  const chassisNo = getSafeValue(record.chassis_number);
  const engineNo = getSafeValue(record.engine_number);
  const km = record.mileage ? `${record.mileage.toLocaleString('id-ID')} km` : '-';
  const occurredDate = formatDateTag(record.occurred_date || record.request_date);
  const repairDate = formatDateTag(
    record.repair_date || record.area_received_date || record.quality_checked_date || record.request_date
  );
  const dtrNo = getSafeValue(record.dtr_number);
  const pos = getSafeValue(record.pos, '-');

  return (
    <div
      className={`bg-white border-2 border-slate-900 rounded-sm overflow-hidden text-[10.5px] leading-tight flex flex-col justify-between font-sans ${
        isPrintMode ? 'h-full' : 'shadow-xs hover:border-red-600 transition-colors'
      }`}
      style={{ minHeight: '260px' }}
    >
      {/* 1. Header Banner Tag: Hino & HMSI-Field Quality */}
      <div className="bg-red-700 text-white px-2 py-1.5 border-b-2 border-slate-900 flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <span className="bg-white text-red-700 font-black text-[9px] px-1 py-0.2 rounded font-sans tracking-tight">
            HINO
          </span>
          <span className="font-extrabold uppercase text-[10.5px] tracking-wide">
            ORIGINAL FAILURE PART TAG
          </span>
        </div>
        <span className="text-[8px] font-mono tracking-widest text-red-100 font-bold uppercase">
          HMSI-Field Quality &rarr; HMMI
        </span>
      </div>

      {/* 2. Isi Formulir Tag (Grid Border Kotak Rapi) */}
      <div className="p-1.5 space-y-1 flex-1 flex flex-col justify-between">
        {/* Row 1: QPI No (Utama & Menonjol - Muncul Sepenuhnya Tanpa Terpotong) */}
        <div className="border border-slate-800 bg-slate-50 p-1.5 flex flex-col justify-center">
          <div className="flex items-center justify-between gap-1 mb-0.5">
            <span className="font-bold text-[9px] text-slate-700 uppercase tracking-wide shrink-0">
              QPI No:
            </span>
            {qpiInfo.lines.length === 1 && (
              <span
                className="font-mono font-black text-slate-900 text-[10.5px] sm:text-[11px] tracking-tight text-right break-all"
                title={qpiInfo.fullFormatted}
              >
                {qpiInfo.lines[0]}
              </span>
            )}
          </div>
          {qpiInfo.lines.length > 1 && (
            <div className="space-y-0.5 bg-white p-1 rounded border border-slate-200">
              {qpiInfo.lines.map((line, idx) => (
                <div key={idx} className="font-mono font-bold text-slate-900 text-[9px] sm:text-[9.5px] leading-tight">
                  {line}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Row 2: Part Name & Pos */}
        <div className="border border-slate-800 p-1 bg-white space-y-0.5">
          <div className="flex items-start justify-between gap-1">
            <span className="font-bold text-[9px] text-slate-600 uppercase shrink-0">
              Part Name:
            </span>
            <span
              className="font-black text-slate-900 text-[11px] text-right truncate max-w-[150px]"
              title={partName}
            >
              {partName}
            </span>
          </div>
          <div className="flex items-center justify-between gap-1 pt-0.5 border-t border-slate-200 text-[9px]">
            <span className="font-semibold text-slate-600 uppercase">Pos (Lokasi):</span>
            <span className="font-mono font-bold text-slate-800 text-[10px] truncate max-w-[140px]">
              {pos}
            </span>
          </div>
        </div>

        {/* Row 3: Problem / Deskripsi Kerusakan */}
        <div className="border border-slate-800 p-1 bg-amber-50/50">
          <span className="font-bold text-[9px] text-slate-700 uppercase block mb-0.5">
            Problem:
          </span>
          <p className="font-semibold text-slate-900 text-[10px] line-clamp-2 italic leading-tight">
            &ldquo;{problem}&rdquo;
          </p>
        </div>

        {/* Row 4: Chassis No & Engine No (2 Kolom) */}
        <div className="grid grid-cols-2 gap-1">
          <div className="border border-slate-800 p-1 bg-white">
            <span className="font-bold text-[8.5px] text-slate-600 uppercase block">Chassis No:</span>
            <span
              className="font-mono font-bold text-slate-900 text-[9.5px] block truncate"
              title={chassisNo}
            >
              {chassisNo}
            </span>
          </div>
          <div className="border border-slate-800 p-1 bg-white">
            <span className="font-bold text-[8.5px] text-slate-600 uppercase block">Engine No:</span>
            <span
              className="font-mono font-bold text-slate-900 text-[9.5px] block truncate"
              title={engineNo}
            >
              {engineNo}
            </span>
          </div>
        </div>

        {/* Row 5: Km, Occurred Date, Repair Date */}
        <div className="grid grid-cols-3 gap-1 text-[9px]">
          <div className="border border-slate-800 p-1 bg-white text-center">
            <span className="font-bold text-slate-600 uppercase block text-[8px]">Km (Odo):</span>
            <span className="font-mono font-extrabold text-slate-900 text-[9.5px] block truncate">
              {km}
            </span>
          </div>
          <div className="border border-slate-800 p-1 bg-white text-center">
            <span className="font-bold text-slate-600 uppercase block text-[8px]">Occurred:</span>
            <span className="font-mono font-bold text-slate-900 text-[9px] block">
              {occurredDate}
            </span>
          </div>
          <div className="border border-slate-800 p-1 bg-white text-center">
            <span className="font-bold text-slate-600 uppercase block text-[8px]">Repair:</span>
            <span className="font-mono font-bold text-slate-900 text-[9px] block">
              {repairDate}
            </span>
          </div>
        </div>

        {/* Row 6: DTR No & Copy Helper */}
        <div className="border border-slate-800 p-1 bg-slate-50 flex items-center justify-between">
          <div className="flex items-center gap-1">
            <span className="font-bold text-[9px] text-slate-700 uppercase">DTR No:</span>
            <span className="font-mono font-black text-red-700 text-[10.5px]">{dtrNo}</span>
          </div>
          {!isPrintMode && onCopyDtr && (
            <button
              type="button"
              onClick={() => onCopyDtr(dtrNo)}
              className="text-slate-400 hover:text-slate-700 p-0.5 no-print cursor-pointer"
              title="Salin No DTR"
            >
              {copiedDtr === dtrNo ? (
                <Check className="w-3 h-3 text-emerald-600" />
              ) : (
                <Copy className="w-3 h-3" />
              )}
            </button>
          )}
        </div>

        {/* Row 7: Barcode Simbolik & QC Stamp Footer */}
        <div className="border border-slate-800 p-1 bg-white flex items-center justify-between gap-1 text-[8.5px]">
          {/* Mockup Barcode Strip */}
          <div className="flex flex-col items-start">
            <div className="h-4 flex items-center gap-[1.5px] bg-white">
              <span className="w-[1.5px] h-3.5 bg-black"></span>
              <span className="w-[3px] h-3.5 bg-black"></span>
              <span className="w-[1px] h-3.5 bg-black"></span>
              <span className="w-[2px] h-3.5 bg-black"></span>
              <span className="w-[1px] h-3.5 bg-black"></span>
              <span className="w-[3px] h-3.5 bg-black"></span>
              <span className="w-[2px] h-3.5 bg-black"></span>
              <span className="w-[1.5px] h-3.5 bg-black"></span>
              <span className="w-[3px] h-3.5 bg-black"></span>
              <span className="w-[1px] h-3.5 bg-black"></span>
              <span className="w-[2px] h-3.5 bg-black"></span>
              <span className="w-[1.5px] h-3.5 bg-black"></span>
            </div>
            <span className="font-mono text-[7px] text-slate-500 uppercase tracking-tighter">
              {dtrNo}
            </span>
          </div>

          {/* Verification Box Tim Quality */}
          <div className="text-right border-l border-slate-300 pl-1.5 flex flex-col justify-center">
            <span className="font-bold uppercase text-[7.5px] text-slate-500 mb-0.5">QC Verified:</span>
            <div className="flex items-center gap-1 justify-end">
              <span className="inline-flex items-center justify-center w-3 h-3 rounded-xs bg-blue-100 text-blue-700 text-[8px] font-bold border border-blue-300">
                ✓
              </span>
              <span className="font-bold text-slate-900 text-[8.5px] leading-none">
                HMSI-Field Quality
              </span>
            </div>
            {record.quality_checked_by ? (
              <span className="text-[7.5px] text-slate-600 font-medium truncate max-w-[100px] mt-0.5">
                {record.quality_checked_by}
              </span>
            ) : (
              <span className="text-[7px] text-slate-400 font-mono mt-0.5">
                Tgl: {formatDateTag(record.quality_checked_date || record.repair_date || record.request_date)}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* 3. Footer Strip */}
      <div className="bg-slate-900 text-slate-300 text-[7.5px] px-2 py-0.5 flex items-center justify-between font-mono">
        <span>PT Hino Motors Sales Indonesia (HMSI-Field Quality)</span>
        <span>HMMI Return Tag</span>
      </div>
    </div>
  );
};
