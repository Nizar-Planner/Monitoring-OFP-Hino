import React, { useState } from 'react';
import { OpfRecord } from '../types';
import { useAuth } from '../context/AuthContext';
import {
  X,
  RotateCcw,
  AlertTriangle,
  Send,
  Building,
  ShieldCheck,
  FileText
} from 'lucide-react';

interface RollbackModalProps {
  record: OpfRecord | null;
  onClose: () => void;
  onSuccess: () => void;
}

export const RollbackModal: React.FC<RollbackModalProps> = ({
  record,
  onClose,
  onSuccess,
}) => {
  const { profile } = useAuth();
  const [revisionNotes, setRevisionNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (!record) return null;

  const handleRollback = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!revisionNotes.trim()) {
      setErrorMsg('Catatan revisi / alasan penolakan wajib diisi agar Tim Area dapat memperbaiki kendala pada part.');
      return;
    }

    setIsSubmitting(true);
    setErrorMsg(null);

    try {
      const res = await fetch(`/api/opf/${record.id}/rollback`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          rejected_by: profile?.full_name || 'Tim Quality',
          revision_notes: revisionNotes.trim(),
        }),
      });

      const data = await res.json();
      if (data.success) {
        onSuccess();
        onClose();
      } else {
        setErrorMsg(data.error || 'Gagal memproses rollback.');
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Terjadi kesalahan jaringan.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 font-sans">
      <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-lg w-full my-auto shadow-2xl border border-red-200 dark:border-red-900/50 overflow-hidden animate-scaleIn">
        
        {/* Modal Header */}
        <div className="px-5 py-4 bg-red-600 text-white flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-red-700">
              <RotateCcw className="w-4 h-4 text-white" />
            </div>
            <div>
              <h3 className="font-bold text-sm sm:text-base text-white">
                Rollback / Reject ke Tim Area
              </h3>
              <p className="text-xs text-red-100">
                Kembalikan status data ke Tim Area untuk verifikasi ulang
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-red-200 hover:text-white hover:bg-red-700 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <form onSubmit={handleRollback} className="p-5 sm:p-6 space-y-4">
          {/* Target Part Info */}
          <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60 text-xs space-y-1">
            <div className="flex items-center justify-between">
              <span className="font-mono font-bold text-red-600 dark:text-red-400">
                {record.dtr_number}
              </span>
              <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                Dealer: {record.dealer_name}
              </span>
            </div>
            <p className="font-bold text-slate-900 dark:text-white">
              {record.part_name} {record.part_number ? `(${record.part_number})` : ''}
            </p>
            <div className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center gap-3">
              <span>Status Saat Ini: <strong>{record.tracking_status}</strong></span>
              {record.area_received_date && (
                <span>Diterima Area: <strong>{record.area_received_date}</strong></span>
              )}
            </div>
          </div>

          <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/60 flex items-start gap-2.5 text-xs text-amber-900 dark:text-amber-300">
            <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
            <p className="leading-relaxed">
              Tindakan ini akan membatalkan verifikasi Area, mengembalikan status menjadi <strong>Waiting OFP / Belum Terkirim</strong>, dan mengirimkan catatan revisi kepada Tim Area.
            </p>
          </div>

          {errorMsg && (
            <div className="p-3 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/60 text-xs text-red-700 dark:text-red-300">
              {errorMsg}
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Catatan Revisi / Alasan Reject <span className="text-red-500">*</span>
            </label>
            <textarea
              required
              rows={3}
              placeholder="Jelaskan alasan penolakan atau perbaikan yang dibutuhkan oleh Tim Area (misal: Nomor serial tidak sesuai fisik part, foto bukti buram, packaging rusak)..."
              value={revisionNotes}
              onChange={(e) => setRevisionNotes(e.target.value)}
              className="w-full px-3 py-2 text-xs rounded-xl bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-red-500"
            />
          </div>

          {/* Action Buttons */}
          <div className="pt-2 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-4 py-2 rounded-xl text-xs font-bold bg-red-600 hover:bg-red-700 text-white flex items-center gap-1.5 transition-all shadow-md cursor-pointer disabled:opacity-50"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>{isSubmitting ? 'Memproses Rollback...' : 'Konfirmasi Rollback'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
