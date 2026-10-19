import React, { useState, useRef } from 'react';
import {
  X,
  Camera,
  CheckCircle2,
  Truck,
  Building,
  ShieldCheck,
  Calendar,
  User,
  AlertTriangle,
  Upload,
  ArrowRight,
  Send
} from 'lucide-react';
import { OpfRecord } from '../types';

interface ActionVerificationModalProps {
  record: OpfRecord | null;
  onClose: () => void;
  onSuccess: () => void;
}

export const ActionVerificationModal: React.FC<ActionVerificationModalProps> = ({
  record,
  onClose,
  onSuccess,
}) => {
  if (!record) return null;

  const [activeTab, setActiveTab] = useState<'area' | 'quality' | 'shipping'>(
    !record.area_received_date ? 'area' : !record.quality_checked_date ? 'quality' : 'shipping'
  );

  // Tim Area State
  const [areaReceivedBy, setAreaReceivedBy] = useState(record.area_received_by || '');
  const [areaReceivedDate, setAreaReceivedDate] = useState(
    record.area_received_date || new Date().toISOString().split('T')[0]
  );
  const [areaPhoto, setAreaPhoto] = useState(record.area_photo || '');
  const [areaNotes, setAreaNotes] = useState(record.area_notes || '');

  // Tim Quality State
  const [qualityCheckedBy, setQualityCheckedBy] = useState(record.quality_checked_by || '');
  const [qualityCheckedDate, setQualityCheckedDate] = useState(
    record.quality_checked_date || new Date().toISOString().split('T')[0]
  );
  const [qualityPhoto, setQualityPhoto] = useState(record.quality_photo || '');
  const [qualityNotes, setQualityNotes] = useState(record.quality_notes || '');

  // Shipping to HMMI/HML State
  const [shippedDate, setShippedDate] = useState(
    record.shipped_date || new Date().toISOString().split('T')[0]
  );
  const [shippingResi, setShippingResi] = useState(record.shipping_resi || '');
  const [shippingCarrier, setShippingCarrier] = useState(
    record.shipping_carrier || 'Internal Shuttle Truck HMSI to Plant HMMI'
  );

  const [isSubmitting, setIsSubmitting] = useState(false);
  const areaFileInputRef = useRef<HTMLInputElement>(null);
  const qualityFileInputRef = useRef<HTMLInputElement>(null);

  // Convert image file to base64
  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>, target: 'area' | 'quality') => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      const reader = new FileReader();
      reader.onload = (event) => {
        const base64 = event.target?.result as string;
        if (target === 'area') setAreaPhoto(base64);
        else setQualityPhoto(base64);
      };
      reader.readAsDataURL(file);
    }
  };

  // Submit Tim Area Receipt
  const handleAreaSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!areaReceivedBy.trim()) {
      alert('Nama personil Tim Area penerima wajib diisi.');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch(`/api/opf/${record.id}/area-receipt`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          area_received_by: areaReceivedBy,
          received_date: areaReceivedDate,
          area_photo: areaPhoto,
          area_notes: areaNotes,
        }),
      });

      const data = await res.json();
      if (data.success) {
        onSuccess();
        setActiveTab('quality');
      } else {
        alert(data.error || 'Gagal menyimpan penerimaan Tim Area.');
      }
    } catch (err) {
      console.error(err);
      alert('Terjadi kesalahan jaringan.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Submit Tim Quality Verification
  const handleQualitySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!qualityCheckedBy.trim()) {
      alert('Nama personil Tim Quality wajib diisi.');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch(`/api/opf/${record.id}/quality-check`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          quality_checked_by: qualityCheckedBy,
          quality_date: qualityCheckedDate,
          quality_photo: qualityPhoto,
          quality_notes: qualityNotes,
        }),
      });

      const data = await res.json();
      if (data.success) {
        onSuccess();
        setActiveTab('shipping');
      } else {
        alert(data.error || 'Gagal menyimpan verifikasi Tim Quality.');
      }
    } catch (err) {
      console.error(err);
      alert('Terjadi kesalahan jaringan.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Submit Shipping to HMMI/HML
  const handleShippingSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!shippingResi.trim()) {
      alert('Nomor Resi / Surat Jalan pengiriman ke HMMI/HML wajib diisi.');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch(`/api/opf/${record.id}/ship-hmmi`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          shipped_date: shippedDate,
          shipping_resi: shippingResi,
          shipping_carrier: shippingCarrier,
        }),
      });

      const data = await res.json();
      if (data.success) {
        onSuccess();
        onClose();
      } else {
        alert(data.error || 'Gagal menyimpan pengiriman ke HMMI/HML.');
      }
    } catch (err) {
      console.error(err);
      alert('Terjadi kesalahan jaringan.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-2xl w-full shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2">
              <span className="font-mono text-xs font-bold text-red-400">{record.dtr_number}</span>
              <span className="text-[11px] bg-slate-800 text-slate-300 px-2 py-0.5 rounded font-mono">
                {record.qpi_number || 'No QPI'}
              </span>
              {record.is_overdue && (
                <span className="text-[10px] bg-red-600 text-white font-bold px-2 py-0.5 rounded animate-pulse">
                  OVERDUE &gt; 30 HARI
                </span>
              )}
            </div>
            <h3 className="font-bold text-base text-white mt-0.5">
              {record.part_name} ({record.quantity} unit)
            </h3>
            <p className="text-xs text-slate-400">
              Dealer: {record.dealer_name} · Leadtime: <strong className="text-white font-mono">{record.days_elapsed} hari</strong>
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tabs: Tim Area vs Tim Quality vs Kirim ke HMMI/HML */}
        <div className="grid grid-cols-3 border-b border-slate-200 bg-slate-50 text-xs font-semibold">
          <button
            onClick={() => setActiveTab('area')}
            className={`py-3 px-3 text-center border-b-2 transition-colors flex items-center justify-center gap-1.5 ${
              activeTab === 'area'
                ? 'border-amber-600 text-amber-700 bg-white'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <Building className="w-3.5 h-3.5" />
            <span>1. Tim Area (HMSI)</span>
            {record.area_received_date && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />}
          </button>

          <button
            onClick={() => setActiveTab('quality')}
            className={`py-3 px-3 text-center border-b-2 transition-colors flex items-center justify-center gap-1.5 ${
              activeTab === 'quality'
                ? 'border-blue-600 text-blue-700 bg-white'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>2. Tim Quality</span>
            {record.quality_checked_date && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />}
          </button>

          <button
            onClick={() => setActiveTab('shipping')}
            className={`py-3 px-3 text-center border-b-2 transition-colors flex items-center justify-center gap-1.5 ${
              activeTab === 'shipping'
                ? 'border-emerald-600 text-emerald-700 bg-white'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <Truck className="w-3.5 h-3.5" />
            <span>3. Kirim HMMI/HML</span>
            {record.shipped_date && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />}
          </button>
        </div>

        {/* Tab Body */}
        <div className="p-6 overflow-y-auto space-y-4 text-xs sm:text-sm">
          
          {/* TAB 1: TIM AREA */}
          {activeTab === 'area' && (
            <form onSubmit={handleAreaSubmit} className="space-y-4">
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl space-y-1">
                <span className="font-bold text-amber-900 text-xs block">
                  Peran Tim Area HMSI: Penerimaan Part dari Dealer
                </span>
                <p className="text-[11px] text-amber-800 leading-relaxed">
                  Ketika fisik part OFP tiba di kantor/transit HMSI dari dealer, Tim Area mengonfirmasi penerimaan dan memotret part sebagai bukti serah terima resmi.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Tanggal Diterima di HMSI <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="date"
                    required
                    value={areaReceivedDate}
                    onChange={(e) => setAreaReceivedDate(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-slate-900 text-xs focus:ring-1 focus:ring-amber-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Nama Personil Tim Area Penerima <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Contoh: Budi Santoso (Area Jabodetabek)"
                    value={areaReceivedBy}
                    onChange={(e) => setAreaReceivedBy(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-slate-900 text-xs focus:ring-1 focus:ring-amber-500"
                  />
                </div>
              </div>

              {/* Foto Bukti Penerimaan Tim Area */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Foto Bukti Penerimaan Fisik Part di HMSI
                </label>
                <input
                  type="file"
                  ref={areaFileInputRef}
                  accept="image/*"
                  capture="environment"
                  onChange={(e) => handlePhotoUpload(e, 'area')}
                  className="hidden"
                />

                {areaPhoto ? (
                  <div className="relative rounded-xl border border-slate-200 overflow-hidden bg-slate-900 aspect-video max-h-48 flex items-center justify-center">
                    <img src={areaPhoto} alt="Bukti Foto Tim Area" className="w-full h-full object-contain" />
                    <button
                      type="button"
                      onClick={() => areaFileInputRef.current?.click()}
                      className="absolute bottom-2 right-2 px-2.5 py-1 bg-black/70 hover:bg-black text-white text-[11px] rounded-lg flex items-center gap-1"
                    >
                      <Camera className="w-3.5 h-3.5" /> Ganti Foto
                    </button>
                  </div>
                ) : (
                  <div
                    onClick={() => areaFileInputRef.current?.click()}
                    className="border-2 border-dashed border-slate-300 hover:border-amber-500 rounded-xl p-4 text-center cursor-pointer bg-slate-50 transition-colors"
                  >
                    <Camera className="w-8 h-8 mx-auto text-amber-600 mb-1" />
                    <span className="font-semibold text-slate-800 text-xs block">
                      Ambil Foto lewat Kamera HP atau Upload File Bukti
                    </span>
                    <span className="text-[11px] text-slate-400">
                      Foto part fisik yang tiba dengan label tag nomor DTR
                    </span>
                  </div>
                )}
              </div>

              {/* Catatan Tim Area */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Catatan Kondisi Fisik Part dari Tim Area
                </label>
                <textarea
                  rows={2}
                  placeholder="Catatan kemasan, label part, atau kondisi fisik saat diterima..."
                  value={areaNotes}
                  onChange={(e) => setAreaNotes(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-slate-900 text-xs focus:ring-1 focus:ring-amber-500"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex items-center gap-1.5 px-5 py-2 bg-amber-600 hover:bg-amber-700 text-white font-semibold rounded-lg text-xs shadow-xs"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>
                    {isSubmitting ? 'Menyimpan...' : 'Konfirmasi Part Tiba di HMSI & Kirim Notif ke Quality'}
                  </span>
                </button>
              </div>
            </form>
          )}

          {/* TAB 2: TIM QUALITY */}
          {activeTab === 'quality' && (
            <form onSubmit={handleQualitySubmit} className="space-y-4">
              <div className="p-3 bg-blue-50 border border-blue-200 rounded-xl space-y-1">
                <span className="font-bold text-blue-900 text-xs block">
                  Peran Tim Quality HMSI: Verifikasi Teknis Part
                </span>
                <p className="text-[11px] text-blue-800 leading-relaxed">
                  Tim Quality memeriksa keabsahan part yang diterima Tim Area, memastikan kondisi part dalam keadaan baik/layak diperiksa oleh Supplier HMMI/HML, dan mengambil foto verifikasi.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Tanggal Pengecekan Quality <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="date"
                    required
                    value={qualityCheckedDate}
                    onChange={(e) => setQualityCheckedDate(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-slate-900 text-xs focus:ring-1 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Nama Inspector Tim Quality <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Contoh: Andi Wijaya (QA Engineer)"
                    value={qualityCheckedBy}
                    onChange={(e) => setQualityCheckedBy(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-slate-900 text-xs focus:ring-1 focus:ring-blue-500"
                  />
                </div>
              </div>

              {/* Foto Bukti Tim Quality */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Foto Bukti Pengecekan Kondisi Part oleh Tim Quality
                </label>
                <input
                  type="file"
                  ref={qualityFileInputRef}
                  accept="image/*"
                  capture="environment"
                  onChange={(e) => handlePhotoUpload(e, 'quality')}
                  className="hidden"
                />

                {qualityPhoto ? (
                  <div className="relative rounded-xl border border-slate-200 overflow-hidden bg-slate-900 aspect-video max-h-48 flex items-center justify-center">
                    <img src={qualityPhoto} alt="Bukti Foto Tim Quality" className="w-full h-full object-contain" />
                    <button
                      type="button"
                      onClick={() => qualityFileInputRef.current?.click()}
                      className="absolute bottom-2 right-2 px-2.5 py-1 bg-black/70 hover:bg-black text-white text-[11px] rounded-lg flex items-center gap-1"
                    >
                      <Camera className="w-3.5 h-3.5" /> Ganti Foto
                    </button>
                  </div>
                ) : (
                  <div
                    onClick={() => qualityFileInputRef.current?.click()}
                    className="border-2 border-dashed border-slate-300 hover:border-blue-500 rounded-xl p-4 text-center cursor-pointer bg-slate-50 transition-colors"
                  >
                    <Camera className="w-8 h-8 mx-auto text-blue-600 mb-1" />
                    <span className="font-semibold text-slate-800 text-xs block">
                      Ambil Foto Verifikasi Quality
                    </span>
                    <span className="text-[11px] text-slate-400">
                      Foto detail kondisi kerusakan part dan segel identifikasi
                    </span>
                  </div>
                )}
              </div>

              {/* Catatan Tim Quality */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Catatan Teknis Pengecekan Tim Quality
                </label>
                <textarea
                  rows={2}
                  placeholder="Catatan keabsahan kerusakan teknis sebelum part diserahkan ke pabrik HMMI/HML..."
                  value={qualityNotes}
                  onChange={(e) => setQualityNotes(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-slate-900 text-xs focus:ring-1 focus:ring-blue-500"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex items-center gap-1.5 px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg text-xs shadow-xs"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>{isSubmitting ? 'Menyimpan...' : 'Simpan Verifikasi Tim Quality'}</span>
                </button>
              </div>
            </form>
          )}

          {/* TAB 3: PENGIRIMAN KE HMMI / HML */}
          {activeTab === 'shipping' && (
            <form onSubmit={handleShippingSubmit} className="space-y-4">
              <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl space-y-1">
                <span className="font-bold text-emerald-900 text-xs block">
                  Pengiriman ke Supplier HMMI / HML (Tahap Selesai)
                </span>
                <p className="text-[11px] text-emerald-800 leading-relaxed">
                  Setelah diverifikasi oleh Quality, part dikirimkan ke Plant HMMI / HML Japan. Masukkan nomor Surat Jalan atau Resi untuk mengubah status menjadi <strong>Delivered</strong> dan menghentikan hitungan lead time!
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Tanggal Pengiriman ke HMMI/HML <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="date"
                    required
                    value={shippedDate}
                    onChange={(e) => setShippedDate(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-slate-900 text-xs focus:ring-1 focus:ring-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    No. Resi / Surat Jalan Pengiriman <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Contoh: SJ-HMSI-HMMI-26-0812"
                    value={shippingResi}
                    onChange={(e) => setShippingResi(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-slate-900 font-mono text-xs focus:ring-1 focus:ring-emerald-500"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Ekspedisi / Metode Pengiriman
                  </label>
                  <input
                    type="text"
                    placeholder="Contoh: Internal Shuttle Truck HMSI to Plant HMMI Purwakarta"
                    value={shippingCarrier}
                    onChange={(e) => setShippingCarrier(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-slate-900 text-xs focus:ring-1 focus:ring-emerald-500"
                  />
                </div>
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex items-center gap-1.5 px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-lg text-xs shadow-xs"
                >
                  <Send className="w-4 h-4" />
                  <span>{isSubmitting ? 'Menyimpan...' : 'Konfirmasi Pengiriman ke HMMI/HML (Delivered)'}</span>
                </button>
              </div>
            </form>
          )}

        </div>

        {/* Modal Footer */}
        <div className="px-6 py-3 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-xs text-slate-500">
          <span>Status Sekarang: <strong className="text-slate-800">{record.tracking_status}</strong></span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-white border border-slate-300 rounded-lg text-slate-700 font-medium hover:bg-slate-50"
          >
            Tutup
          </button>
        </div>

      </div>
    </div>
  );
};
