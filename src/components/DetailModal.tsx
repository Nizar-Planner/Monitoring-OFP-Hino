import React from 'react';
import {
  X,
  Truck,
  Building,
  ShieldCheck,
  Calendar,
  User,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Camera,
  Printer,
  Package,
  Wrench
} from 'lucide-react';
import { OpfRecord } from '../types';

interface DetailModalProps {
  record: OpfRecord | null;
  onClose: () => void;
  onOpenActionModal: (record: OpfRecord) => void;
  onPrintTag?: (record: OpfRecord) => void;
}

export const DetailModal: React.FC<DetailModalProps> = ({
  record,
  onClose,
  onOpenActionModal,
  onPrintTag,
}) => {
  if (!record) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5 no-print">
      <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-3xl w-full my-auto shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col max-h-[90vh]">
        
        {/* Modal Header */}
        <div className="px-5 sm:px-6 py-4 bg-slate-900 text-white flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-red-600 flex items-center justify-center font-bold text-white">
              H
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-mono text-xs font-semibold text-red-400 shrink-0">
                  {record.dtr_number}
                </span>
                <span className="text-[11px] bg-slate-800 text-slate-200 px-2 py-0.5 rounded font-mono shrink-0 break-all">
                  {record.qpi_number || 'No QPI'}
                </span>
                {record.is_overdue && (
                  <span className="text-[10px] bg-red-600 text-white font-black px-2 py-0.5 rounded uppercase animate-pulse shrink-0">
                    &gt; 30 HARI (OVERDUE)
                  </span>
                )}
              </div>
              <h2 className="text-base font-bold text-white truncate max-w-md">
                {record.part_name} ({record.quantity} unit)
              </h2>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {onPrintTag && (
              <button
                onClick={() => onPrintTag(record)}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded-lg text-xs font-semibold shadow-xs transition-colors"
                title="Cetak Tag Part (Original Failure Part Tag) untuk HMMI"
              >
                <span>Cetak Tag Part</span>
              </button>
            )}
            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-6 text-xs sm:text-sm bg-white dark:bg-slate-900">
          
          {/* Leadtime Tracking Alert Box */}
          <div className={`p-4 rounded-xl border flex items-center justify-between gap-4 ${
            record.is_overdue
              ? 'bg-red-50 dark:bg-red-950/40 border-red-200 dark:border-red-900/60 text-red-900 dark:text-red-200'
              : record.tracking_status === 'Delivered'
              ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-900/60 text-emerald-900 dark:text-emerald-200'
              : 'bg-slate-50 dark:bg-slate-800/60 border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200'
          }`}>
            <div>
              <span className="text-xs font-bold uppercase tracking-wider block">
                Lead Time Status Monitoring
              </span>
              <p className="text-xs mt-0.5">
                {record.is_overdue ? (
                  <strong className="text-red-700 dark:text-red-300">
                    Klaim ini sudah berjalan {record.days_elapsed} hari (melebihi batas toleransi 30 hari supplier HMMI/HML)!
                  </strong>
                ) : record.tracking_status === 'Delivered' ? (
                  <span className="text-emerald-800 dark:text-emerald-300">
                    Part telah dikirim ke HMMI/HML pada hari ke-{record.days_elapsed}. Resiko reject terhindari.
                  </span>
                ) : (
                  <span>Part sedang dalam proses. Total berjalan: <strong>{record.days_elapsed} hari</strong> (Target: &le; 30 hari).</span>
                )}
              </p>
            </div>

            <div className="text-right shrink-0">
              <span className="block text-[11px] text-slate-500 dark:text-slate-400 font-medium">Status</span>
              <span className="font-bold text-sm text-slate-900 dark:text-white">{record.tracking_status}</span>
            </div>
          </div>

          {/* 4-Step Alur Visualizer */}
          <div className="bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl p-4">
            <h4 className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-3">
              Tahapan Alur Serah Terima Part OFP
            </h4>
            
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-2">
              
              {/* Step 1: Dealer */}
              <div className="bg-white dark:bg-slate-800 p-3 rounded-lg border border-slate-200 dark:border-slate-700 space-y-1">
                <div className="flex items-center gap-1.5 text-xs font-bold text-slate-800 dark:text-slate-200">
                  <Wrench className="w-3.5 h-3.5 text-amber-600" />
                  <span>1. Dealer</span>
                </div>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 font-mono">Tgl: {record.request_date}</p>
                <span className="text-[10px] text-amber-700 dark:text-amber-300 font-semibold bg-amber-50 dark:bg-amber-950/60 px-1.5 py-0.5 rounded block text-center">
                  DTR Terbit
                </span>
              </div>

              {/* Step 2: Tim Area */}
              <div className={`p-3 rounded-lg border space-y-1 ${
                record.area_received_date
                  ? 'bg-amber-50/70 dark:bg-amber-950/40 border-amber-300 dark:border-amber-800'
                  : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 opacity-60'
              }`}>
                <div className="flex items-center gap-1.5 text-xs font-bold text-slate-800 dark:text-slate-200">
                  <Building className="w-3.5 h-3.5 text-amber-700 dark:text-amber-400" />
                  <span>2. Tim Area</span>
                </div>
                <p className="text-[11px] text-slate-600 dark:text-slate-300 font-mono">
                  {record.area_received_date ? `Tgl: ${record.area_received_date}` : 'Menunggu Part'}
                </p>
                <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded block text-center ${
                  record.area_received_date
                    ? 'bg-amber-200 dark:bg-amber-900/60 text-amber-900 dark:text-amber-200'
                    : 'bg-slate-100 dark:bg-slate-700 text-slate-400'
                }`}>
                  {record.area_received_date ? `Diterima: ${record.area_received_by}` : 'Belum Tiba'}
                </span>
              </div>

              {/* Step 3: Tim Quality */}
              <div className={`p-3 rounded-lg border space-y-1 ${
                record.quality_checked_date
                  ? 'bg-blue-50/70 dark:bg-blue-950/40 border-blue-300 dark:border-blue-800'
                  : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 opacity-60'
              }`}>
                <div className="flex items-center gap-1.5 text-xs font-bold text-slate-800 dark:text-slate-200">
                  <ShieldCheck className="w-3.5 h-3.5 text-blue-700 dark:text-blue-400" />
                  <span>3. Tim Quality</span>
                </div>
                <p className="text-[11px] text-slate-600 dark:text-slate-300 font-mono">
                  {record.quality_checked_date ? `Tgl: ${record.quality_checked_date}` : 'Menunggu Verif'}
                </p>
                <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded block text-center ${
                  record.quality_checked_date
                    ? 'bg-blue-200 dark:bg-blue-900/60 text-blue-900 dark:text-blue-200'
                    : 'bg-slate-100 dark:bg-slate-700 text-slate-400'
                }`}>
                  {record.quality_checked_date ? `Dicek: ${record.quality_checked_by}` : 'Belum Dicek'}
                </span>
              </div>

              {/* Step 4: HMMI/HML */}
              <div className={`p-3 rounded-lg border space-y-1 ${
                record.shipped_date
                  ? 'bg-emerald-50/70 dark:bg-emerald-950/40 border-emerald-300 dark:border-emerald-800'
                  : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 opacity-60'
              }`}>
                <div className="flex items-center gap-1.5 text-xs font-bold text-slate-800 dark:text-slate-200">
                  <Truck className="w-3.5 h-3.5 text-emerald-700 dark:text-emerald-400" />
                  <span>4. HMMI / HML</span>
                </div>
                <p className="text-[11px] text-slate-600 dark:text-slate-300 font-mono">
                  {record.shipped_date ? `Tgl: ${record.shipped_date}` : 'Belum Dikirim'}
                </p>
                <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded block text-center ${
                  record.shipped_date
                    ? 'bg-emerald-200 dark:bg-emerald-900/60 text-emerald-900 dark:text-emerald-200'
                    : 'bg-slate-100 dark:bg-slate-700 text-slate-400'
                }`}>
                  {record.shipped_date ? `Resi: ${record.shipping_resi}` : 'Not yet shipped'}
                </span>
              </div>

            </div>
          </div>

          {/* Vehicle & Claim Specs Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            
            {/* Column 1: Kendaraan */}
            <div className="border border-slate-200 dark:border-slate-700 rounded-xl p-4 space-y-3 bg-white dark:bg-slate-800/60">
              <div className="flex items-center gap-2 pb-2 border-b border-slate-100 dark:border-slate-700">
                <Truck className="w-4 h-4 text-red-600 dark:text-red-400" />
                <h4 className="font-bold text-slate-900 dark:text-white text-xs uppercase tracking-wide">
                  Identifikasi Kendaraan
                </h4>
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs">
                <div>
                  <span className="text-slate-500 dark:text-slate-400 block text-[11px]">Model_Unit</span>
                  <span className="font-semibold text-slate-900 dark:text-white">{record.model}</span>
                </div>
                <div>
                  <span className="text-slate-500 dark:text-slate-400 block text-[11px]">Mileage (Odometer)</span>
                  <span className="font-mono font-bold text-slate-900 dark:text-white">
                    {record.mileage?.toLocaleString('id-ID')} km
                  </span>
                </div>
                <div className="col-span-2">
                  <span className="text-slate-500 dark:text-slate-400 block text-[11px]">Chassis (No. Rangka / VIN)</span>
                  <span className="font-mono font-bold text-slate-800 dark:text-slate-200 bg-slate-100 dark:bg-slate-900 px-2 py-0.5 rounded block">
                    {record.chassis_number}
                  </span>
                </div>
                <div className="col-span-2">
                  <span className="text-slate-500 dark:text-slate-400 block text-[11px]">Engine_No (No. Mesin)</span>
                  <span className="font-mono font-bold text-slate-800 dark:text-slate-200 bg-slate-100 dark:bg-slate-900 px-2 py-0.5 rounded block">
                    {record.engine_number}
                  </span>
                </div>
              </div>
            </div>

            {/* Column 2: Legalitas & Dealer */}
            <div className="border border-slate-200 dark:border-slate-700 rounded-xl p-4 space-y-3 bg-white dark:bg-slate-800/60">
              <div className="flex items-center gap-2 pb-2 border-b border-slate-100 dark:border-slate-700">
                <Building className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                <h4 className="font-bold text-slate-900 dark:text-white text-xs uppercase tracking-wide">
                  Detail DLR, Part &amp; Judgment
                </h4>
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="col-span-2">
                  <span className="text-slate-500 dark:text-slate-400 block text-[11px]">DLR (Dealer Pelapor)</span>
                  <span className="font-semibold text-slate-900 dark:text-white">{record.dealer_name}</span>
                </div>
                <div>
                  <span className="text-slate-500 dark:text-slate-400 block text-[11px]">Part Number</span>
                  <span className="font-mono font-bold text-emerald-800 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/50 px-2 py-0.5 rounded border border-emerald-200 dark:border-emerald-800 block">
                    {record.part_number || '-'}
                  </span>
                </div>
                <div>
                  <span className="text-slate-500 dark:text-slate-400 block text-[11px]">Quantity</span>
                  <span className="font-mono font-bold text-red-600 dark:text-red-400">{record.quantity} Unit</span>
                </div>
                <div>
                  <span className="text-slate-500 dark:text-slate-400 block text-[11px]">QPI Number</span>
                  <span className="font-mono font-bold text-slate-800 dark:text-slate-200 bg-slate-100 dark:bg-slate-900 px-2 py-0.5 rounded block">
                    {record.qpi_number || '-'}
                  </span>
                </div>
                <div>
                  <span className="text-slate-500 dark:text-slate-400 block text-[11px]">Judgement Date</span>
                  <span className="font-mono font-semibold text-slate-800 dark:text-slate-200 bg-slate-100 dark:bg-slate-900 px-2 py-0.5 rounded block">
                    {record.judgement_date || '-'}
                  </span>
                </div>
                <div className="col-span-2">
                  <span className="text-slate-500 dark:text-slate-400 block text-[11px]">Judgment</span>
                  <span className="font-medium text-slate-900 dark:text-white">{record.judgement_qpi || '-'}</span>
                </div>
                <div className="col-span-2">
                  <span className="text-slate-500 dark:text-slate-400 block text-[11px]">Problem / Keluhan Kerusakan</span>
                  <span className="font-medium text-slate-900 dark:text-slate-100 bg-amber-50/70 dark:bg-amber-950/40 p-2 rounded border border-amber-200 dark:border-amber-900/60 block text-xs">
                    {record.problem || '-'}
                  </span>
                </div>
                <div>
                  <span className="text-slate-500 dark:text-slate-400 block text-[11px]">Pos / Lokasi Gudang QA</span>
                  <span className="font-mono font-bold text-slate-800 dark:text-slate-200 bg-slate-100 dark:bg-slate-900 px-2 py-0.5 rounded block">
                    {record.pos || '-'}
                  </span>
                </div>
                <div>
                  <span className="text-slate-500 dark:text-slate-400 block text-[11px]">Occurred Date</span>
                  <span className="font-mono text-slate-800 dark:text-slate-200">
                    {record.occurred_date || '-'}
                  </span>
                </div>
                <div>
                  <span className="text-slate-500 dark:text-slate-400 block text-[11px]">Repair Date</span>
                  <span className="font-mono text-slate-800 dark:text-slate-200">
                    {record.repair_date || '-'}
                  </span>
                </div>
              </div>
            </div>

          </div>

          {/* Bukti Foto Tim Area & Tim Quality */}
          <div className="space-y-3">
            <h4 className="font-bold text-slate-900 dark:text-white text-xs uppercase tracking-wide flex items-center gap-1.5">
              <Camera className="w-4 h-4 text-slate-600 dark:text-slate-400" />
              <span>Dokumentasi Foto Fisik Part (Tim Area &amp; Tim Quality)</span>
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              
              {/* Foto Tim Area */}
              <div className="border border-slate-200 dark:border-slate-700 rounded-xl p-3 bg-slate-50 dark:bg-slate-800/50 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-amber-900 dark:text-amber-300 text-xs">Foto Bukti Tim Area (Penerimaan)</span>
                  {record.area_received_date && <span className="font-mono text-[10px] text-slate-500 dark:text-slate-400">{record.area_received_date}</span>}
                </div>
                {record.area_photo ? (
                  <div className="rounded-lg overflow-hidden bg-slate-900 aspect-video flex items-center justify-center">
                    <img src={record.area_photo} alt="Foto Bukti Tim Area" className="w-full h-full object-contain" />
                  </div>
                ) : (
                  <div className="rounded-lg border border-dashed border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 p-6 text-center text-slate-400 dark:text-slate-500">
                    <Camera className="w-6 h-6 mx-auto mb-1 text-slate-300 dark:text-slate-600" />
                    <span className="text-[11px]">Belum ada foto penerimaan dari Tim Area</span>
                  </div>
                )}
                {record.area_notes && (
                  <p className="text-[11px] text-slate-600 dark:text-slate-300 italic bg-white dark:bg-slate-800 p-2 rounded border border-slate-200 dark:border-slate-700">
                    &ldquo;{record.area_notes}&rdquo;
                  </p>
                )}
              </div>

              {/* Foto Tim Quality */}
              <div className="border border-slate-200 dark:border-slate-700 rounded-xl p-3 bg-slate-50 dark:bg-slate-800/50 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-blue-900 dark:text-blue-300 text-xs">Foto Verifikasi Tim Quality</span>
                  {record.quality_checked_date && <span className="font-mono text-[10px] text-slate-500 dark:text-slate-400">{record.quality_checked_date}</span>}
                </div>
                {record.quality_photo ? (
                  <div className="rounded-lg overflow-hidden bg-slate-900 aspect-video flex items-center justify-center">
                    <img src={record.quality_photo} alt="Foto Bukti Tim Quality" className="w-full h-full object-contain" />
                  </div>
                ) : (
                  <div className="rounded-lg border border-dashed border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 p-6 text-center text-slate-400 dark:text-slate-500">
                    <ShieldCheck className="w-6 h-6 mx-auto mb-1 text-slate-300 dark:text-slate-600" />
                    <span className="text-[11px]">Belum ada foto pengecekan dari Tim Quality</span>
                  </div>
                )}
                {record.quality_notes && (
                  <p className="text-[11px] text-slate-600 dark:text-slate-300 italic bg-white dark:bg-slate-800 p-2 rounded border border-slate-200 dark:border-slate-700">
                    &ldquo;{record.quality_notes}&rdquo;
                  </p>
                )}
              </div>

            </div>
          </div>

        </div>

        {/* Modal Footer */}
        <div className="px-6 py-3 bg-slate-50 dark:bg-slate-900/90 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs">
          <button
            onClick={() => onOpenActionModal(record)}
            className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white font-semibold rounded-lg shadow-xs flex items-center gap-1.5"
          >
            <Camera className="w-4 h-4 text-red-400" />
            <span>Update / Verifikasi / Kirim Part Ini</span>
          </button>

          <button
            onClick={onClose}
            className="px-4 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-200 font-medium rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
          >
            Tutup
          </button>
        </div>

      </div>
    </div>
  );
};
