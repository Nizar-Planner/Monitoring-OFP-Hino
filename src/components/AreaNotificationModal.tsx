import React, { useState, useEffect } from 'react';
import { OpfRecord, UserProfile } from '../types';
import {
  Mail,
  Send,
  AlertTriangle,
  Clock,
  Building,
  CheckCircle2,
  Users,
  ExternalLink,
  History,
  X,
  Loader2,
  Copy,
  Check,
  ChevronRight,
  ShieldCheck,
  Calendar,
  Truck
} from 'lucide-react';

interface AreaNotificationModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUserRole?: string;
  currentUserName?: string;
}

interface AreaPendingData {
  totalPending: number;
  overdueCount: number;
  pendingRecords: OpfRecord[];
  areaRecipients: UserProfile[];
}

export const AreaNotificationModal: React.FC<AreaNotificationModalProps> = ({
  isOpen,
  onClose,
  currentUserRole = 'Tim Quality',
  currentUserName = 'Tim Quality',
}) => {
  const [data, setData] = useState<AreaPendingData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedRecipients, setSelectedRecipients] = useState<string[]>([]);
  const [extraEmail, setExtraEmail] = useState('');
  const [customNotes, setCustomNotes] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [sendSuccessMessage, setSendSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [historyLogs, setHistoryLogs] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<'compose' | 'history'>('compose');
  const [copiedBody, setCopiedBody] = useState(false);

  const fetchPendingData = async () => {
    try {
      setIsLoading(true);
      const [resSummary, resHistory] = await Promise.all([
        fetch('/api/notifications/area-pending').then((r) => r.json()),
        fetch('/api/notifications/history').then((r) => r.json()).catch(() => ({ success: false })),
      ]);

      if (resSummary.success) {
        setData(resSummary.data);
        const areaEmails = (resSummary.data.areaRecipients || []).map((u: UserProfile) => u.email).filter(Boolean);
        setSelectedRecipients(areaEmails);
      }
      if (resHistory.success && Array.isArray(resHistory.data)) {
        setHistoryLogs(resHistory.data);
      }
    } catch (err: any) {
      console.error('Error fetching area pending data:', err);
      setErrorMessage('Gagal memuat data ringkasan OFP pending.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchPendingData();
      setSendSuccessMessage(null);
      setErrorMessage(null);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const totalPending = data?.totalPending || 0;
  const overdueCount = data?.overdueCount || 0;
  const pendingRecords = data?.pendingRecords || [];

  const handleToggleRecipient = (email: string) => {
    setSelectedRecipients((prev) =>
      prev.includes(email) ? prev.filter((item) => item !== email) : [...prev, email]
    );
  };

  const handleAddExtraEmail = (e: React.FormEvent) => {
    e.preventDefault();
    const clean = extraEmail.trim().toLowerCase();
    if (!clean || !clean.includes('@')) return;
    if (!selectedRecipients.includes(clean)) {
      setSelectedRecipients((prev) => [...prev, clean]);
    }
    setExtraEmail('');
  };

  // Generate Email Content
  const emailSubject = `[PENTING] Pengingat Penyerahan Fisik Part OFP Hino HMSI (${totalPending} Part Menunggu Diterima Area)`;

  const pendingListText = pendingRecords
    .slice(0, 15)
    .map(
      (r, idx) =>
        `${idx + 1}. DTR: ${r.dtr_number} | Part: ${r.part_name} | Dealer: ${r.dealer_name} | Umur: ${r.days_elapsed || 0} Hari ${r.is_overdue ? '[OVERDUE >30 Hari]' : ''}`
    )
    .join('\n');

  const emailBodyText = `Kepada Rekan-rekan Tim Area PT Hino Motors Sales Indonesia (HMSI),

Dengan hormat,

Kami dari ${currentUserRole} menginformasikan bahwa saat ini terdapat ${totalPending} unit Original Failure Part (OFP) yang masih berstatus menunggu penerimaan fisik part di gudang transit HMSI (${overdueCount} part telah melewati batas target lead time 30 hari).

Berikut adalah ringkasan part OFP yang perlu segera dikonfirmasi penerimaannya:
---------------------------------------------------------------------------------
${pendingListText}
${pendingRecords.length > 15 ? `... dan ${pendingRecords.length - 15} part lainnya dapat dilihat di dashboard.` : ''}
---------------------------------------------------------------------------------

${customNotes ? `Catatan Tambahan dari ${currentUserName}:\n${customNotes}\n\n` : ''}Mengingat aturan investigasi klaim pabrik HMMI/HML mewajibkan lead time pengiriman part maksimal 30 hari (menghindari penolakan klaim / OFP Not Return), kami memohon bantuan Tim Area untuk segera:
1. Memeriksa ketersediaan fisik sparepart failure dari dealer terkait di gudang transit HMSI.
2. Membuka Hino OFP Monitoring Dashboard dan melakukan konfirmasi "Terima Part (Area Receipt)".
3. Mengunggah foto bukti serah terima fisik part di aplikasi agar status berubah menjadi "Area Verified".

Dashboard URL: ${window.location.origin}

Atas perhatian dan kerja sama cepat rekan-rekan Tim Area, kami ucapkan terima kasih.

Salam hormat,
${currentUserName}
${currentUserRole} - Field Quality
PT Hino Motors Sales Indonesia (HMSI)`;

  const handleSendServerEmail = async () => {
    if (selectedRecipients.length === 0) {
      setErrorMessage('Pilih minimal 1 alamat email Tim Area tujuan.');
      return;
    }

    try {
      setIsSending(true);
      setErrorMessage(null);
      setSendSuccessMessage(null);

      const res = await fetch('/api/notifications/send-area-reminder', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sent_by: `${currentUserName} (${currentUserRole})`,
          recipients: selectedRecipients,
          custom_notes: customNotes,
        }),
      }).then((r) => r.json());

      if (res.success) {
        setSendSuccessMessage(
          `Pemberitahuan berhasil dicatat dan dikirimkan ke ${selectedRecipients.length} alamat email Tim Area!`
        );
        // Refresh history
        const histRes = await fetch('/api/notifications/history').then((r) => r.json());
        if (histRes.success) setHistoryLogs(histRes.data);
      } else {
        setErrorMessage(res.error || 'Gagal mengirimkan notifikasi.');
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Terjadi kesalahan sistem.');
    } finally {
      setIsSending(false);
    }
  };

  const handleOpenMailClient = () => {
    const to = selectedRecipients.join(';');
    const mailtoUrl = `mailto:${encodeURIComponent(to)}?subject=${encodeURIComponent(emailSubject)}&body=${encodeURIComponent(emailBodyText)}`;
    window.location.href = mailtoUrl;
  };

  const handleCopyEmailText = () => {
    navigator.clipboard.writeText(`Subject: ${emailSubject}\n\n${emailBodyText}`);
    setCopiedBody(true);
    setTimeout(() => setCopiedBody(false), 3000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/70 backdrop-blur-xs overflow-y-auto animate-fadeIn font-sans">
      <div className="relative w-full max-w-4xl bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 flex flex-col max-h-[92vh] overflow-hidden">
        
        {/* Header Modal */}
        <div className="px-5 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50/80 dark:bg-slate-850">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-amber-500/10 dark:bg-amber-500/20 text-amber-600 dark:text-amber-400 border border-amber-200 dark:border-amber-800">
              <Mail className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-slate-900 dark:text-white">
                  Pemberitahuan Part OFP Tertunda ke Tim Area
                </h2>
                <span className="px-2 py-0.5 rounded text-[10px] font-extrabold uppercase bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-300 border border-amber-300 dark:border-amber-800">
                  Tim Quality &amp; Admin
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Kirim pengingat email penyerahan fisik part ke Tim Area untuk mengendalikan lead time &le; 30 hari sebelum di-reject HMMI.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-lg text-xs font-semibold">
              <button
                onClick={() => setActiveTab('compose')}
                className={`px-3 py-1 rounded-md transition-colors cursor-pointer ${
                  activeTab === 'compose'
                    ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs'
                    : 'text-slate-500 hover:text-slate-800 dark:hover:text-white'
                }`}
              >
                Kirim Notifikasi
              </button>
              <button
                onClick={() => setActiveTab('history')}
                className={`px-3 py-1 rounded-md transition-colors cursor-pointer flex items-center gap-1 ${
                  activeTab === 'history'
                    ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs'
                    : 'text-slate-500 hover:text-slate-800 dark:hover:text-white'
                }`}
              >
                <History className="w-3.5 h-3.5" />
                <span>Riwayat ({historyLogs.length})</span>
              </button>
            </div>

            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Feedback Alert Banners */}
        {sendSuccessMessage && (
          <div className="px-5 py-3 bg-emerald-50 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border-b border-emerald-200 dark:border-emerald-800 text-xs flex items-center justify-between animate-fadeIn">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
              <span>{sendSuccessMessage}</span>
            </div>
            <button onClick={() => setSendSuccessMessage(null)} className="font-bold opacity-60 hover:opacity-100 cursor-pointer">
              &times;
            </button>
          </div>
        )}

        {errorMessage && (
          <div className="px-5 py-3 bg-red-50 dark:bg-red-950/60 text-red-800 dark:text-red-300 border-b border-red-200 dark:border-red-800 text-xs flex items-center justify-between animate-fadeIn">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-red-600 dark:text-red-400 shrink-0" />
              <span>{errorMessage}</span>
            </div>
            <button onClick={() => setErrorMessage(null)} className="font-bold opacity-60 hover:opacity-100 cursor-pointer">
              &times;
            </button>
          </div>
        )}

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-5">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-20 text-slate-400 gap-2">
              <Loader2 className="w-8 h-8 animate-spin text-amber-500" />
              <span className="text-xs font-semibold">Menghitung part pending &amp; daftar email Tim Area...</span>
            </div>
          ) : activeTab === 'history' ? (
            /* History Logs View */
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                  <History className="w-4 h-4 text-amber-500" />
                  Log Riwayat Pengiriman Email Pengingat
                </span>
                <span className="text-[11px] text-slate-400">Menampilkan {historyLogs.length} catatan terakhir</span>
              </div>

              {historyLogs.length === 0 ? (
                <div className="text-center py-12 text-slate-400 text-xs">
                  Belum ada catatan pengiriman notifikasi pengingat.
                </div>
              ) : (
                <div className="space-y-2">
                  {historyLogs.map((log: any, idx) => (
                    <div
                      key={idx}
                      className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-xs space-y-1.5"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                          <Send className="w-3.5 h-3.5 text-emerald-500" />
                          Dikirim oleh: {log.sent_by}
                        </span>
                        <span className="text-[11px] text-slate-500 dark:text-slate-400 font-mono flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          {log.created_at ? new Date(log.created_at).toLocaleString('id-ID') : '-'}
                        </span>
                      </div>
                      <div className="text-slate-600 dark:text-slate-300 text-[11px]">
                        <strong>Tujuan ({log.recipients.split(',').length} email):</strong> {log.recipients}
                      </div>
                      <div className="flex items-center gap-4 text-[11px] text-slate-500 dark:text-slate-400">
                        <span>Total Pending: <strong>{log.pending_count} Part</strong></span>
                        <span className="text-red-500 font-semibold">Overdue: <strong>{log.overdue_count} Part</strong></span>
                        {log.notes && <span className="italic text-slate-400">Catatan: &ldquo;{log.notes}&rdquo;</span>}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : (
            /* Compose & Send View */
            <>
              {/* Summary Metrics Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="p-3.5 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/60 flex items-center gap-3">
                  <div className="p-2.5 rounded-lg bg-amber-500 text-white shadow-xs">
                    <Truck className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="text-[11px] font-bold text-amber-800 dark:text-amber-400 block uppercase">
                      Part Belum Diterima Area
                    </span>
                    <span className="text-xl font-black text-amber-900 dark:text-amber-200">
                      {totalPending} <span className="text-xs font-normal">Part OFP</span>
                    </span>
                  </div>
                </div>

                <div className="p-3.5 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800/60 flex items-center gap-3">
                  <div className="p-2.5 rounded-lg bg-red-600 text-white shadow-xs">
                    <Clock className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="text-[11px] font-bold text-red-800 dark:text-red-400 block uppercase">
                      Part Overdue &gt; 30 Hari
                    </span>
                    <span className="text-xl font-black text-red-700 dark:text-red-300">
                      {overdueCount} <span className="text-xs font-normal">Klaim Urgent</span>
                    </span>
                  </div>
                </div>

                <div className="p-3.5 rounded-xl bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800/60 flex items-center gap-3">
                  <div className="p-2.5 rounded-lg bg-blue-600 text-white shadow-xs">
                    <Building className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="text-[11px] font-bold text-blue-800 dark:text-blue-400 block uppercase">
                      Penerima Tim Area
                    </span>
                    <span className="text-xl font-black text-blue-900 dark:text-blue-200">
                      {selectedRecipients.length} <span className="text-xs font-normal">Personel</span>
                    </span>
                  </div>
                </div>
              </div>

              {/* Target Recipients Section */}
              <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                    <Users className="w-4 h-4 text-amber-500" />
                    Penerima Email Tim Area (Otomatis Terdeteksi dari Tabel Profiles)
                  </span>
                  <span className="text-[11px] text-slate-400">
                    {selectedRecipients.length} email terpilih
                  </span>
                </div>

                {/* Recipient Chips */}
                <div className="flex flex-wrap gap-1.5">
                  {(data?.areaRecipients || []).map((u) => {
                    const isChecked = selectedRecipients.includes(u.email);
                    return (
                      <button
                        key={u.id}
                        type="button"
                        onClick={() => handleToggleRecipient(u.email)}
                        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium transition-all cursor-pointer border ${
                          isChecked
                            ? 'bg-amber-100 dark:bg-amber-950/80 text-amber-800 dark:text-amber-300 border-amber-300 dark:border-amber-800'
                            : 'bg-white dark:bg-slate-800 text-slate-400 border-slate-300 dark:border-slate-700 hover:text-slate-600'
                        }`}
                      >
                        <span className={`w-2 h-2 rounded-full ${isChecked ? 'bg-amber-500' : 'bg-slate-400'}`}></span>
                        <span>{u.full_name || u.email}</span>
                        <span className="text-[10px] font-mono opacity-75">&lt;{u.email}&gt;</span>
                      </button>
                    );
                  })}
                </div>

                {/* Add Custom Email Input */}
                <form onSubmit={handleAddExtraEmail} className="flex gap-2 pt-1">
                  <input
                    type="email"
                    placeholder="Tambah email PIC Area / Dealer (@hino.co.id)..."
                    value={extraEmail}
                    onChange={(e) => setExtraEmail(e.target.value)}
                    className="flex-1 px-3 py-1.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-xs text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-500"
                  />
                  <button
                    type="submit"
                    className="px-3 py-1.5 rounded-lg bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-xs font-bold text-slate-800 dark:text-slate-200 transition-colors cursor-pointer"
                  >
                    Tambah Email
                  </button>
                </form>
              </div>

              {/* Custom Notes Section */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Catatan Tambahan untuk Tim Area (Opsional)
                </label>
                <textarea
                  rows={2}
                  placeholder="Contoh: Mohon koordinasi dengan Dealer Transindo Medan untuk part silinder kopling yang sudah melewati 35 hari..."
                  value={customNotes}
                  onChange={(e) => setCustomNotes(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>

              {/* Email Content Preview */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                    <Mail className="w-4 h-4 text-slate-500" />
                    Pratinjau Isi Pesan Email (Format Standar Hino Indonesia)
                  </span>
                  <button
                    onClick={handleCopyEmailText}
                    className="flex items-center gap-1 text-[11px] font-semibold text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 cursor-pointer"
                  >
                    {copiedBody ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copiedBody ? 'Tersalin!' : 'Salin Teks Email'}</span>
                  </button>
                </div>
                <div className="p-3.5 rounded-xl bg-slate-900 text-slate-200 border border-slate-800 font-sans text-xs space-y-2 max-h-56 overflow-y-auto">
                  <div className="pb-2 border-b border-slate-800 text-amber-400 font-mono text-[11px] font-bold">
                    Subject: {emailSubject}
                  </div>
                  <pre className="whitespace-pre-wrap font-sans text-xs text-slate-300 leading-relaxed">
                    {emailBodyText}
                  </pre>
                </div>
              </div>
            </>
          )}
        </div>

        {/* Footer Actions */}
        <div className="px-5 py-3.5 border-t border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3 bg-slate-50/80 dark:bg-slate-850">
          <div className="text-xs text-slate-500 dark:text-slate-400 text-center sm:text-left">
            Target Lead Time: <strong>&le; 30 Hari</strong> &bull; Total Part Pending: <strong>{totalPending}</strong>
          </div>

          <div className="flex items-center gap-2.5 w-full sm:w-auto justify-end">
            <button
              onClick={handleOpenMailClient}
              className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 text-xs font-bold transition-all cursor-pointer"
              title="Buka Outlook / Gmail di komputer Anda dengan penerima, subjek, dan pesan terisi otomatis"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              <span>Buka di Mail Client (Outlook / Gmail)</span>
            </button>

            <button
              onClick={handleSendServerEmail}
              disabled={isSending || totalPending === 0}
              className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 active:scale-95 text-white text-xs font-bold transition-all shadow-md shadow-amber-900/20 cursor-pointer disabled:opacity-50"
            >
              {isSending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              <span>{isSending ? 'Mengirimkan...' : 'Kirim Email Notifikasi'}</span>
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
