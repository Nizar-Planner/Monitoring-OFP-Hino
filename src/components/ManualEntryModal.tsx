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

  const [dtrNumber, setDtrNumber] = useState(`DTR-2026-JKT-${Math.floor(1000 + Math.random() * 9000)}`);
  const [partName, setPartName] = useState('Turbocharger Assembly');
  const [quantity, setQuantity] = useState(1);
  const [model, setModel] = useState('Hino 500 FM 260 JD (6x4 Dump)');
  const [chassisNumber, setChassisNumber] = useState('MHFJ1JGBMK00' + Math.floor(1000 + Math.random() * 9000));
  const [engineNumber, setEngineNumber] = useState('J08E-WD' + Math.floor(10000 + Math.random() * 90000));
  const [mileage, setMileage] = useState(38000);
  const [dealerName, setDealerName] = useState('PT Duta Cemerlang Motors - Jakarta Barat');
  const [qpiNumber, setQpiNumber] = useState('QPI-HMSI-26-' + Math.floor(100 + Math.random() * 900));
  const [judgementQpi, setJudgementQpi] = useState('Under Technical Review');
  const [requestDate, setRequestDate] = useState(new Date().toISOString().split('T')[0]);
  const [trackingStatus, setTrackingStatus] = useState<'Waiting OFP' | 'Not yet shipped' | 'Delivered'>('Waiting OFP');
  const [areaNotes, setAreaNotes] = useState('');

  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!dtrNumber.trim() || !partName.trim() || !chassisNumber.trim()) {
      alert('Nomor DTR, Part Name, dan No. Chassis wajib diisi.');
      return;
    }

    setIsSubmitting(true);
    try {
      await onSubmit({
        dtr_number: dtrNumber,
        part_name: partName,
        quantity: Number(quantity) || 1,
        model,
        chassis_number: chassisNumber,
        engine_number: engineNumber,
        mileage: Number(mileage) || 0,
        dealer_name: dealerName,
        qpi_number: qpiNumber,
        judgement_qpi: judgementQpi,
        request_date: requestDate,
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
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-2xl w-full shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-2">
            <PlusCircle className="w-5 h-5 text-red-500" />
            <h3 className="font-bold text-sm sm:text-base">Input Data DTR &amp; Part OPF Baru</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-4 text-xs sm:text-sm">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            
            {/* Nomor DTR */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Nomor DTR <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                value={dtrNumber}
                onChange={(e) => setDtrNumber(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-slate-900 font-mono text-xs focus:ring-1 focus:ring-red-500 focus:outline-none"
              />
            </div>

            {/* Part Name */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Part Name (Nama Komponen) <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                value={partName}
                onChange={(e) => setPartName(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-slate-900 text-xs focus:ring-1 focus:ring-red-500 focus:outline-none"
              />
            </div>

            {/* Quantity */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Quantity (Jumlah Part)
              </label>
              <input
                type="number"
                min={1}
                value={quantity}
                onChange={(e) => setQuantity(Number(e.target.value))}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-slate-900 font-mono text-xs focus:ring-1 focus:ring-red-500 focus:outline-none"
              />
            </div>

            {/* Model Kendaraan */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Model Kendaraan
              </label>
              <input
                type="text"
                value={model}
                onChange={(e) => setModel(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-slate-900 text-xs focus:ring-1 focus:ring-red-500 focus:outline-none"
              />
            </div>

            {/* Chassis Number */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                No. Chassis (Ch) <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                value={chassisNumber}
                onChange={(e) => setChassisNumber(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-slate-900 font-mono text-xs focus:ring-1 focus:ring-red-500 focus:outline-none"
              />
            </div>

            {/* Engine Number */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                No. Engine (EG)
              </label>
              <input
                type="text"
                value={engineNumber}
                onChange={(e) => setEngineNumber(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-slate-900 font-mono text-xs focus:ring-1 focus:ring-red-500 focus:outline-none"
              />
            </div>

            {/* Mileage */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Mileage / Odometer (km)
              </label>
              <input
                type="number"
                value={mileage}
                onChange={(e) => setMileage(Number(e.target.value))}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-slate-900 font-mono text-xs focus:ring-1 focus:ring-red-500 focus:outline-none"
              />
            </div>

            {/* Tanggal Request DTR */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Tanggal DTR / Permintaan Part
              </label>
              <input
                type="date"
                value={requestDate}
                onChange={(e) => setRequestDate(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-slate-900 text-xs focus:ring-1 focus:ring-red-500 focus:outline-none"
              />
            </div>

            {/* Dealer */}
            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Dealer Asal Part
              </label>
              <input
                type="text"
                value={dealerName}
                onChange={(e) => setDealerName(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-slate-900 text-xs focus:ring-1 focus:ring-red-500 focus:outline-none"
              />
            </div>

            {/* Nomor QPI */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Nomor QPI
              </label>
              <input
                type="text"
                value={qpiNumber}
                onChange={(e) => setQpiNumber(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-slate-900 font-mono text-xs focus:ring-1 focus:ring-red-500 focus:outline-none"
              />
            </div>

            {/* Judgement QPI */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Judgement QPI
              </label>
              <input
                type="text"
                value={judgementQpi}
                onChange={(e) => setJudgementQpi(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-slate-900 text-xs focus:ring-1 focus:ring-red-500 focus:outline-none"
              />
            </div>

            {/* Status Tracking */}
            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Status Alur Awal
              </label>
              <select
                value={trackingStatus}
                onChange={(e) => setTrackingStatus(e.target.value as any)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-slate-900 text-xs focus:ring-1 focus:ring-red-500 focus:outline-none"
              >
                <option value="Waiting OFP">Waiting OFP (Belum tiba di HMSI / masih di Dealer)</option>
                <option value="Not yet shipped">Not yet shipped (Sudah diterima Tim Area di HMSI)</option>
                <option value="Delivered">Delivered (Sudah terkirim ke Supplier HMMI/HML)</option>
              </select>
            </div>

          </div>

          <div className="pt-4 border-t border-slate-200 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-slate-300 text-slate-700 text-xs font-semibold rounded-lg hover:bg-slate-50 transition-colors"
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
