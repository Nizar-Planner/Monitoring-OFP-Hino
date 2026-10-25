import React, { useState } from 'react';
import { X, PlusCircle, Check } from 'lucide-react';
import { OpfRecord } from '../types';

interface ManualEntryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (record: OpfRecord) => Promise<void>;
}

export const ManualEntryModal: React.FC<ManualEntryModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
}) => {
  if (!isOpen) return null;

  const [dtrNumber, setDtrNumber] = useState('');
  const [partName, setPartName] = useState('');
  const [partNumber, setPartNumber] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [model, setModel] = useState('');
  const [chassisNumber, setChassisNumber] = useState('');
  const [engineNumber, setEngineNumber] = useState('');
  const [mileage, setMileage] = useState<number | ''>('');
  const [dealerName, setDealerName] = useState('');
  const [qpiNumber, setQpiNumber] = useState('');
  const [problem, setProblem] = useState('');
  const [pos, setPos] = useState('');
  const [judgementQpi, setJudgementQpi] = useState('Under Technical Review');
  const [judgementDate, setJudgementDate] = useState(new Date().toISOString().split('T')[0]);
  const [requestDate, setRequestDate] = useState(new Date().toISOString().split('T')[0]);
  const [occurredDate, setOccurredDate] = useState('');
  const [repairDate, setRepairDate] = useState('');
  const [trackingStatus, setTrackingStatus] = useState<'Waiting OFP' | 'Not yet shipped' | 'Delivered'>('Waiting OFP');
  const [areaNotes, setAreaNotes] = useState('');

  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!dtrNumber.trim() || !partName.trim() || !chassisNumber.trim()) {
      alert('TR_No, Part, dan Chassis wajib diisi.');
      return;
    }

    setIsSubmitting(true);
    try {
      await onSubmit({
        dtr_number: dtrNumber,
        part_name: partName,
        part_number: partNumber,
        quantity: Number(quantity) || 1,
        model,
        chassis_number: chassisNumber,
        engine_number: engineNumber,
        mileage: Number(mileage) || 0,
        dealer_name: dealerName,
        qpi_number: qpiNumber,
        problem,
        pos,
        judgement_qpi: judgementQpi,
        judgement_date: judgementDate,
        request_date: requestDate,
        occurred_date: occurredDate,
        repair_date: repairDate,
        tracking_status: trackingStatus,
        area_notes: areaNotes,
      });
      onClose();
    } catch (err) {
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
      <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-2xl w-full my-auto shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-5 sm:px-6 py-4 bg-slate-900 text-white flex items-center justify-between border-b border-slate-800 shrink-0">
          <div className="flex items-center gap-2">
            <PlusCircle className="w-5 h-5 text-red-500" />
            <h3 className="font-bold text-sm sm:text-base">Input Data DTR &amp; Part OFP Baru</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-4 sm:p-6 overflow-y-auto space-y-4 text-xs sm:text-sm bg-white dark:bg-slate-900 flex-1">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            
            {/* TR_No */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                TR_No (Nomor TR) <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                value={dtrNumber}
                onChange={(e) => setDtrNumber(e.target.value)}
                placeholder="TR-2026-..."
                className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 bg-white dark:bg-slate-800 font-mono text-xs focus:ring-1 focus:ring-red-500 focus:outline-none"
              />
            </div>

            {/* Part */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Part (Nama Komponen) <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                value={partName}
                onChange={(e) => setPartName(e.target.value)}
                placeholder="Turbocharger Assembly..."
                className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 bg-white dark:bg-slate-800 text-xs focus:ring-1 focus:ring-red-500 focus:outline-none"
              />
            </div>

            {/* Part Number */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Part Number (Nomor Part)
              </label>
              <input
                type="text"
                value={partNumber}
                onChange={(e) => setPartNumber(e.target.value)}
                placeholder="24100-33120..."
                className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 bg-white dark:bg-slate-800 font-mono text-xs focus:ring-1 focus:ring-red-500 focus:outline-none"
              />
            </div>

            {/* Quantity */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Quantity (Qty)
              </label>
              <input
                type="number"
                min={1}
                value={quantity}
                onChange={(e) => setQuantity(Number(e.target.value))}
                className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 bg-white dark:bg-slate-800 font-mono text-xs focus:ring-1 focus:ring-red-500 focus:outline-none"
              />
            </div>

            {/* Model_Unit */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Model_Unit
              </label>
              <input
                type="text"
                value={model}
                onChange={(e) => setModel(e.target.value)}
                placeholder="Hino 500 FM 260 JD..."
                className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 bg-white dark:bg-slate-800 text-xs focus:ring-1 focus:ring-red-500 focus:outline-none"
              />
            </div>

            {/* Chassis */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Chassis <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                value={chassisNumber}
                onChange={(e) => setChassisNumber(e.target.value)}
                placeholder="MHFJ1JGBMK..."
                className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 bg-white dark:bg-slate-800 font-mono text-xs focus:ring-1 focus:ring-red-500 focus:outline-none"
              />
            </div>

            {/* Engine_No */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Engine_No
              </label>
              <input
                type="text"
                value={engineNumber}
                onChange={(e) => setEngineNumber(e.target.value)}
                placeholder="J08E-WD..."
                className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 bg-white dark:bg-slate-800 font-mono text-xs focus:ring-1 focus:ring-red-500 focus:outline-none"
              />
            </div>

            {/* Mileage */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Mileage (km)
              </label>
              <input
                type="number"
                value={mileage}
                onChange={(e) => setMileage(Number(e.target.value))}
                className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 bg-white dark:bg-slate-800 font-mono text-xs focus:ring-1 focus:ring-red-500 focus:outline-none"
              />
            </div>

            {/* DLR */}
            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                DLR (Dealer)
              </label>
              <input
                type="text"
                value={dealerName}
                onChange={(e) => setDealerName(e.target.value)}
                placeholder="PT Indomobil Prima Niaga / Duta Cemerlang Motors..."
                className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 bg-white dark:bg-slate-800 text-xs focus:ring-1 focus:ring-red-500 focus:outline-none"
              />
            </div>

            {/* QPI Number */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                QPI Number
              </label>
              <input
                type="text"
                value={qpiNumber}
                onChange={(e) => setQpiNumber(e.target.value)}
                placeholder="QPI-HMSI-26-..."
                className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 bg-white dark:bg-slate-800 font-mono text-xs focus:ring-1 focus:ring-red-500 focus:outline-none"
              />
            </div>

            {/* Judgment */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Judgment
              </label>
              <input
                type="text"
                value={judgementQpi}
                onChange={(e) => setJudgementQpi(e.target.value)}
                placeholder="Under Investigation / Approved..."
                className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 bg-white dark:bg-slate-800 text-xs focus:ring-1 focus:ring-red-500 focus:outline-none"
              />
            </div>

            {/* Judgement Date */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Judgement Date
              </label>
              <input
                type="date"
                value={judgementDate}
                onChange={(e) => setJudgementDate(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 bg-white dark:bg-slate-800 text-xs focus:ring-1 focus:ring-red-500 focus:outline-none"
              />
            </div>

            {/* Problem */}
            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Problem / Keluhan Kerusakan
              </label>
              <textarea
                rows={2}
                value={problem}
                onChange={(e) => setProblem(e.target.value)}
                placeholder="Deskripsi kerusakan part..."
                className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 bg-white dark:bg-slate-800 text-xs focus:ring-1 focus:ring-red-500 focus:outline-none"
              />
            </div>

            {/* Pos / Lokasi Rak Gudang */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Pos / Lokasi Rak Part (Quality)
              </label>
              <input
                type="text"
                value={pos}
                onChange={(e) => setPos(e.target.value)}
                placeholder="Contoh: L2.1, L3.1..."
                className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 bg-white dark:bg-slate-800 text-xs focus:ring-1 focus:ring-red-500 focus:outline-none font-mono"
              />
            </div>

            {/* Tanggal Request / DTR */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Tanggal DTR / Request Date
              </label>
              <input
                type="date"
                value={requestDate}
                onChange={(e) => setRequestDate(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 bg-white dark:bg-slate-800 text-xs focus:ring-1 focus:ring-red-500 focus:outline-none"
              />
            </div>

            {/* Occurred Date */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Occurred Date (Tgl Kerusakan)
              </label>
              <input
                type="date"
                value={occurredDate}
                onChange={(e) => setOccurredDate(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 bg-white dark:bg-slate-800 text-xs focus:ring-1 focus:ring-red-500 focus:outline-none"
              />
            </div>

            {/* Repair Date */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Repair Date (Tgl Perbaikan)
              </label>
              <input
                type="date"
                value={repairDate}
                onChange={(e) => setRepairDate(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 bg-white dark:bg-slate-800 text-xs focus:ring-1 focus:ring-red-500 focus:outline-none"
              />
            </div>

            {/* Status Tracking */}
            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Status Alur Awal
              </label>
              <select
                value={trackingStatus}
                onChange={(e) => setTrackingStatus(e.target.value as any)}
                className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 bg-white dark:bg-slate-800 text-xs focus:ring-1 focus:ring-red-500 focus:outline-none"
              >
                <option value="Waiting OFP">Waiting OFP (Belum tiba di HMSI / masih di Dealer)</option>
                <option value="Not yet shipped">Not yet shipped (Sudah diterima Tim Area di HMSI)</option>
                <option value="Delivered">Delivered (Sudah terkirim ke Supplier HMMI/HML)</option>
              </select>
            </div>

          </div>

          <div className="pt-4 border-t border-slate-200 dark:border-slate-800 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-200 text-xs font-semibold rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2 bg-red-600 hover:bg-red-700 text-white text-xs font-semibold rounded-lg transition-colors flex items-center gap-1.5 shadow-sm"
            >
              <Check className="w-4 h-4" />
              <span>{isSubmitting ? 'Menyimpan...' : 'Simpan Data DTR'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
