import React, { useState, useMemo } from 'react';
import {
  Search,
  Filter,
  Eye,
  Trash2,
  Camera,
  CheckCircle2,
  Clock,
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  SlidersHorizontal,
  X,
  Send,
  Building,
  ShieldCheck,
  Truck,
  Tag,
  Printer
} from 'lucide-react';
import { OpfRecord, TrackingStatus } from '../types';

interface DataTableProps {
  records: OpfRecord[];
  isLoading: boolean;
  onSelectRecord: (record: OpfRecord) => void;
  onOpenActionModal: (record: OpfRecord) => void;
  onDeleteRecord: (id: number) => void;
  searchTerm: string;
  setSearchTerm: (term: string) => void;
  statusFilter: string;
  setStatusFilter: (status: string) => void;
  isOverdueFilterActive: boolean;
  setIsOverdueFilterActive: (active: boolean) => void;
  onPrintTags?: (selected: OpfRecord[]) => void;
}

export const DataTable: React.FC<DataTableProps> = ({
  records,
  isLoading,
  onSelectRecord,
  onOpenActionModal,
  onDeleteRecord,
  searchTerm,
  setSearchTerm,
  statusFilter,
  setStatusFilter,
  isOverdueFilterActive,
  setIsOverdueFilterActive,
  onPrintTags,
}) => {
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [selectedDealer, setSelectedDealer] = useState<string>('all');
  const [selectedRecordKeys, setSelectedRecordKeys] = useState<Set<string>>(new Set());

  // Unique dealers list for quick dropdown filter
  const dealersList = useMemo(() => {
    const set = new Set<string>();
    records.forEach((r) => {
      if (r.dealer_name) set.add(r.dealer_name);
    });
    return Array.from(set).sort();
  }, [records]);

  // Filter records
  const filteredRecords = useMemo(() => {
    return records.filter((r) => {
      // Overdue filter
      if (isOverdueFilterActive && !r.is_overdue) {
        return false;
      }

      // Status filter with bidirectional alias support
      if (statusFilter !== 'all') {
        const isWaitingGroup = (statusFilter === 'Waiting OFP' || statusFilter === 'Belum Terkirim') &&
          (r.tracking_status === 'Waiting OFP' || r.tracking_status === 'Belum Terkirim');
        const isAreaGroup = (statusFilter === 'Not yet shipped' || statusFilter === 'Received by Area') &&
          (r.tracking_status === 'Not yet shipped' || r.tracking_status === 'Received by Area');
        const isDeliveredGroup = (statusFilter === 'Delivered' || statusFilter === 'Sent to HMMI') &&
          (r.tracking_status === 'Delivered' || r.tracking_status === 'Sent to HMMI');

        if (!isWaitingGroup && !isAreaGroup && !isDeliveredGroup && r.tracking_status !== statusFilter) {
          return false;
        }
      }

      // Dealer filter
      if (selectedDealer !== 'all' && r.dealer_name !== selectedDealer) {
        return false;
      }

      // Search term (TR_No, Part, Part Number, Chassis, Engine, DLR, QPI, Judgment)
      if (!searchTerm.trim()) return true;
      const term = searchTerm.toLowerCase();
      return (
        r.dtr_number?.toLowerCase().includes(term) ||
        r.part_name?.toLowerCase().includes(term) ||
        r.part_number?.toLowerCase().includes(term) ||
        r.chassis_number?.toLowerCase().includes(term) ||
        r.engine_number?.toLowerCase().includes(term) ||
        r.dealer_name?.toLowerCase().includes(term) ||
        r.qpi_number?.toLowerCase().includes(term) ||
        r.problem?.toLowerCase().includes(term) ||
        r.pos?.toLowerCase().includes(term) ||
        r.judgement_qpi?.toLowerCase().includes(term) ||
        r.model?.toLowerCase().includes(term)
      );
    });
  }, [records, searchTerm, statusFilter, isOverdueFilterActive, selectedDealer]);

  // Pagination
  const totalPages = Math.ceil(filteredRecords.length / itemsPerPage) || 1;
  const paginatedRecords = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredRecords.slice(start, start + itemsPerPage);
  }, [filteredRecords, currentPage, itemsPerPage]);

  // Unique identifier for selection state
  const getRecordKey = (r: OpfRecord): string => {
    return r.id ? String(r.id) : `${r.dtr_number}-${r.part_name}-${r.part_number || ''}`;
  };

  const toggleSelectRow = (r: OpfRecord) => {
    const key = getRecordKey(r);
    setSelectedRecordKeys((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const isAllPageSelected =
    paginatedRecords.length > 0 &&
    paginatedRecords.every((r) => selectedRecordKeys.has(getRecordKey(r)));

  const toggleSelectPage = () => {
    setSelectedRecordKeys((prev) => {
      const next = new Set(prev);
      if (isAllPageSelected) {
        paginatedRecords.forEach((r) => next.delete(getRecordKey(r)));
      } else {
        paginatedRecords.forEach((r) => next.add(getRecordKey(r)));
      }
      return next;
    });
  };

  const selectAllFiltered = () => {
    const next = new Set<string>();
    filteredRecords.forEach((r) => next.add(getRecordKey(r)));
    setSelectedRecordKeys(next);
  };

  const clearSelection = () => {
    setSelectedRecordKeys(new Set());
  };

  const selectedRecordsList = useMemo(() => {
    return records.filter((r) => selectedRecordKeys.has(getRecordKey(r)));
  }, [records, selectedRecordKeys]);

  const handlePrintSelected = () => {
    if (selectedRecordsList.length === 0) return;
    if (onPrintTags) {
      onPrintTags(selectedRecordsList);
    }
  };

  const handlePrintSingle = (record: OpfRecord) => {
    if (onPrintTags) {
      onPrintTags([record]);
    }
  };

  const renderStatusBadge = (status: TrackingStatus | string) => {
    switch (status) {
      case 'Belum Terkirim':
      case 'Waiting OFP':
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-amber-800 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/50 px-2 py-0.5 rounded border border-amber-200 dark:border-amber-900/60">
            <Clock className="w-3 h-3 text-amber-600 dark:text-amber-400" />
            <span>Belum Terkirim</span>
          </span>
        );
      case 'Received by Area':
      case 'Not yet shipped':
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-blue-800 dark:text-blue-300 bg-blue-50 dark:bg-blue-950/50 px-2 py-0.5 rounded border border-blue-200 dark:border-blue-900/60">
            <Building className="w-3 h-3 text-blue-600 dark:text-blue-400" />
            <span>Received by Area</span>
          </span>
        );
      case 'Sent to HMMI':
      case 'Delivered':
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-800 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/50 px-2 py-0.5 rounded border border-emerald-200 dark:border-emerald-900/60">
            <Truck className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
            <span>Sent to HMMI</span>
          </span>
        );
      default:
        return <span>{status}</span>;
    }
  };

  const renderDaysBadge = (days: number, isOverdue: boolean, isDelivered: boolean) => {
    if (isDelivered) {
      return (
        <span className="font-mono text-xs font-semibold text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded">
          {days} hr (Selesai)
        </span>
      );
    }

    if (isOverdue) {
      return (
        <span className="inline-flex items-center gap-1 font-mono text-xs font-bold text-red-700 dark:text-red-300 bg-red-100 dark:bg-red-950/60 px-2 py-0.5 rounded border border-red-300 dark:border-red-800 animate-pulse" title="Lebih dari 30 hari! Berisiko ditolak supplier!">
          <AlertTriangle className="w-3 h-3 text-red-600 dark:text-red-400 shrink-0" />
          <span>{days} hr (OVERDUE)</span>
        </span>
      );
    }

    if (days >= 20) {
      return (
        <span className="font-mono text-xs font-bold text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/40 px-2 py-0.5 rounded border border-amber-200 dark:border-amber-800" title="Mendekati batas 30 hari">
          {days} hr
        </span>
      );
    }

    return (
      <span className="font-mono text-xs font-medium text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded">
        {days} hr
      </span>
    );
  };

  return (
    <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs overflow-hidden w-full">
      
      {/* Table Toolbar */}
      <div className="p-3 sm:p-5 border-b border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/60 space-y-3 w-full">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3 sm:gap-4 w-full">
          
          {/* Search Box */}
          <div className="relative flex-1 w-full lg:max-w-lg min-w-0">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setCurrentPage(1);
              }}
              placeholder="Cari TR_No, Part, Part Number, Chassis, Engine_No, DLR, QPI..."
              className="w-full pl-9 pr-9 py-2 text-xs sm:text-sm bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500 text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Quick Filters */}
          <div className="flex flex-wrap items-center gap-2 w-full lg:w-auto">
            
            {/* Dealer Filter Dropdown */}
            <select
              value={selectedDealer}
              onChange={(e) => {
                setSelectedDealer(e.target.value);
                setCurrentPage(1);
              }}
              className="px-3 py-2 text-xs bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-red-500 max-w-[180px] sm:max-w-[220px] truncate cursor-pointer"
            >
              <option value="all">Semua DLR ({dealersList.length})</option>
              {dealersList.map((dealer) => (
                <option key={dealer} value={dealer}>
                  {dealer}
                </option>
              ))}
            </select>

            {/* Overdue Button Toggle */}
            <button
              onClick={() => {
                setIsOverdueFilterActive(!isOverdueFilterActive);
                setCurrentPage(1);
              }}
              className={`px-3 py-2 rounded-lg text-xs font-bold transition-colors flex items-center gap-1.5 cursor-pointer ${
                isOverdueFilterActive
                  ? 'bg-red-600 text-white shadow-xs'
                  : 'bg-white dark:bg-slate-800 text-red-700 dark:text-red-400 border border-red-300 dark:border-red-900/60 hover:bg-red-50 dark:hover:bg-red-950/40'
              }`}
            >
              <AlertTriangle className="w-3.5 h-3.5" />
              <span>Overdue &gt; 30 Hari</span>
            </button>

            {/* Status Segmented Buttons */}
            <div className="flex flex-wrap items-center gap-1 bg-slate-200/80 dark:bg-slate-800 p-0.5 rounded-lg text-xs font-medium">
              <button
                onClick={() => {
                  setStatusFilter('all');
                  setCurrentPage(1);
                }}
                className={`px-2.5 py-1.5 rounded-md transition-colors cursor-pointer ${
                  statusFilter === 'all' && !isOverdueFilterActive
                    ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white font-semibold shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                Semua
              </button>
              <button
                onClick={() => {
                  setStatusFilter('Belum Terkirim');
                  setIsOverdueFilterActive(false);
                  setCurrentPage(1);
                }}
                className={`px-2.5 py-1.5 rounded-md transition-colors cursor-pointer ${
                  (statusFilter === 'Belum Terkirim' || statusFilter === 'Waiting OFP')
                    ? 'bg-amber-600 text-white font-semibold'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                Belum Terkirim
              </button>
              <button
                onClick={() => {
                  setStatusFilter('Received by Area');
                  setIsOverdueFilterActive(false);
                  setCurrentPage(1);
                }}
                className={`px-2.5 py-1.5 rounded-md transition-colors cursor-pointer ${
                  (statusFilter === 'Received by Area' || statusFilter === 'Not yet shipped')
                    ? 'bg-blue-600 text-white font-semibold'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                Received Area
              </button>
              <button
                onClick={() => {
                  setStatusFilter('Sent to HMMI');
                  setIsOverdueFilterActive(false);
                  setCurrentPage(1);
                }}
                className={`px-2.5 py-1.5 rounded-md transition-colors cursor-pointer ${
                  (statusFilter === 'Sent to HMMI' || statusFilter === 'Delivered')
                    ? 'bg-emerald-600 text-white font-semibold'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                Sent to HMMI
              </button>
            </div>

            {/* Tombol Cetak Tag Part */}
            <button
              onClick={() => {
                if (selectedRecordsList.length > 0) {
                  handlePrintSelected();
                } else if (filteredRecords.length > 0 && onPrintTags) {
                  onPrintTags(filteredRecords.slice(0, 30));
                }
              }}
              className={`px-3 py-2 text-xs font-bold rounded-lg transition-all flex items-center gap-1.5 cursor-pointer ${
                selectedRecordsList.length > 0
                  ? 'bg-red-600 hover:bg-red-700 text-white shadow-xs active:scale-95'
                  : 'bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 hover:border-slate-400 dark:hover:border-slate-600 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700/50'
              }`}
              title="Cetak Tag Part (Original Failure Part Tag) untuk tim Quality / HMMI"
            >
              <Tag className={`w-3.5 h-3.5 ${selectedRecordsList.length > 0 ? 'text-white' : 'text-red-600 dark:text-red-400'}`} />
              <span>
                {selectedRecordsList.length > 0
                  ? `Cetak Tag (${selectedRecordsList.length})`
                  : 'Cetak Tag Part'}
              </span>
            </button>

            {/* Reset All */}
            {(searchTerm || selectedDealer !== 'all' || statusFilter !== 'all' || isOverdueFilterActive || selectedRecordsList.length > 0) && (
              <button
                onClick={() => {
                  setSearchTerm('');
                  setSelectedDealer('all');
                  setStatusFilter('all');
                  setIsOverdueFilterActive(false);
                  clearSelection();
                  setCurrentPage(1);
                }}
                className="px-2.5 py-1.5 text-xs font-semibold text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40 rounded-lg transition-colors cursor-pointer"
              >
                Reset
              </button>
            )}

          </div>
        </div>

        {/* Floating Action Banner: Terpilih untuk Dicetak Tag */}
        {selectedRecordsList.length > 0 && (
          <div className="p-3 bg-slate-900 text-white rounded-xl shadow-lg border border-slate-800 flex flex-wrap items-center justify-between gap-3 animate-fade-in no-print w-full">
            <div className="flex items-center gap-2.5">
              <span className="w-7 h-7 rounded-lg bg-red-600 flex items-center justify-center font-bold text-xs text-white shadow-xs">
                {selectedRecordsList.length}
              </span>
              <div>
                <span className="text-xs sm:text-sm font-bold text-white block">
                  {selectedRecordsList.length} Part Terpilih
                </span>
                <span className="text-[11px] text-slate-300">
                  Siap dicetak ke format stiker A4 (3 kolom per baris)
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              <button
                onClick={selectAllFiltered}
                className="px-2.5 py-1.5 text-xs text-slate-300 hover:text-white hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
              >
                Pilih Semua ({filteredRecords.length})
              </button>
              <button
                onClick={clearSelection}
                className="px-2.5 py-1.5 text-xs text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
              >
                Batal
              </button>
              <button
                onClick={handlePrintSelected}
                className="flex items-center gap-1.5 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-xs font-bold transition-all shadow-md active:scale-95 cursor-pointer"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>Cetak Tag Terpilih ({selectedRecordsList.length})</span>
              </button>
            </div>
          </div>
        )}

        {/* Count Summary */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between text-xs text-slate-500 dark:text-slate-400 pt-1 gap-1">
          <div>
            Menampilkan <strong className="text-slate-900 dark:text-white font-mono tabular-nums">{filteredRecords.length}</strong> part OFP
            {isOverdueFilterActive && <span className="text-red-600 dark:text-red-400 font-bold"> (Khusus Overdue &gt; 30 Hari)</span>}
            {searchTerm && <span> untuk kata kunci &ldquo;{searchTerm}&rdquo;</span>}
            {selectedRecordsList.length > 0 && (
              <span className="text-red-600 dark:text-red-400 font-bold ml-1">· ({selectedRecordsList.length} terpilih)</span>
            )}
          </div>
          <div className="text-[11px] text-slate-400 dark:text-slate-500 hidden sm:block">
            Centang checkbox untuk mencetak Original Failure Part Tag
          </div>
        </div>
      </div>

      {/* Table Data - wrapped with dedicated horizontal scroll */}
      <div className="w-full overflow-x-auto">
        <table className="w-full min-w-[1280px] text-left border-collapse text-xs">
          <thead>
            <tr className="bg-slate-100/90 dark:bg-slate-800/90 border-b border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 font-semibold uppercase tracking-wider text-[11px]">
              <th className="py-3 px-3 text-center w-10">
                <input
                  type="checkbox"
                  checked={isAllPageSelected}
                  onChange={toggleSelectPage}
                  className="w-4 h-4 rounded border-slate-300 dark:border-slate-600 text-red-600 focus:ring-red-500 cursor-pointer"
                  title="Pilih semua baris di halaman ini"
                />
              </th>
              <th className="py-3 px-4 whitespace-nowrap">TR_No</th>
              <th className="py-3 px-4 whitespace-nowrap">Part &amp; Part Number</th>
              <th className="py-3 px-2 text-center whitespace-nowrap">Qty</th>
              <th className="py-3 px-4 whitespace-nowrap">Model_Unit</th>
              <th className="py-3 px-4 whitespace-nowrap font-mono">Chassis</th>
              <th className="py-3 px-4 whitespace-nowrap font-mono">Engine_No</th>
              <th className="py-3 px-3 text-right whitespace-nowrap">Mileage</th>
              <th className="py-3 px-4 whitespace-nowrap">DLR</th>
              <th className="py-3 px-3 whitespace-nowrap font-mono">QPI Number</th>
              <th className="py-3 px-4 whitespace-nowrap">PROBLEM</th>
              <th className="py-3 px-3 whitespace-nowrap">Judgment</th>
              <th className="py-3 px-3 whitespace-nowrap text-center">OCCURRED DATE</th>
              <th className="py-3 px-3 whitespace-nowrap text-center">REPAIR DATE</th>
              <th className="py-3 px-3 whitespace-nowrap text-center">Leadtime (Hari)</th>
              <th className="py-3 px-3 whitespace-nowrap text-center">Status Alur</th>
              <th className="py-3 px-3 whitespace-nowrap text-center">Bukti Foto</th>
              <th className="py-3 px-4 whitespace-nowrap text-right">Tindakan Alur</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
            {isLoading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <tr key={i} className="animate-pulse">
                  <td colSpan={18} className="py-4 px-4">
                    <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-full"></div>
                  </td>
                </tr>
              ))
            ) : paginatedRecords.length > 0 ? (
              paginatedRecords.map((item) => (
                <tr
                  key={`${item.id || item.dtr_number}-${item.part_name}-${item.part_number || ''}`}
                  onClick={() => onSelectRecord(item)}
                  className={`hover:bg-slate-50/80 dark:hover:bg-slate-800/60 cursor-pointer transition-colors ${
                    selectedRecordKeys.has(getRecordKey(item))
                      ? 'bg-red-50/50 dark:bg-red-950/40'
                      : item.is_overdue
                      ? 'bg-red-50/30 dark:bg-red-950/20'
                      : ''
                  }`}
                >
                  {/* Checkbox Baris */}
                  <td className="py-3 px-3 text-center" onClick={(e) => e.stopPropagation()}>
                    <input
                      type="checkbox"
                      checked={selectedRecordKeys.has(getRecordKey(item))}
                      onChange={() => toggleSelectRow(item)}
                      className="w-4 h-4 rounded border-slate-300 dark:border-slate-600 text-red-600 focus:ring-red-500 cursor-pointer"
                    />
                  </td>

                  {/* TR_No */}
                  <td className="py-3 px-4 whitespace-nowrap font-mono font-bold text-red-600 dark:text-red-400">
                    {item.dtr_number}
                  </td>

                  {/* Part & Part Number */}
                  <td className="py-3 px-4 whitespace-nowrap max-w-[220px]">
                    <div className="font-bold text-slate-900 dark:text-white truncate" title={item.part_name}>
                      {item.part_name}
                    </div>
                    {item.part_number ? (
                      <div className="text-[11px] font-mono font-semibold text-emerald-700 dark:text-emerald-400 truncate" title={`Part Number: ${item.part_number}`}>
                        PN: {item.part_number}
                      </div>
                    ) : (
                      <div className="text-[10px] text-slate-400 dark:text-slate-500 font-mono">-</div>
                    )}
                  </td>

                  {/* Qty */}
                  <td className="py-3 px-2 text-center font-mono font-bold text-slate-800 dark:text-slate-200">
                    {item.quantity}
                  </td>

                  {/* Model_Unit */}
                  <td className="py-3 px-4 text-slate-700 dark:text-slate-300 whitespace-nowrap max-w-[180px] truncate" title={item.model}>
                    {item.model}
                  </td>

                  {/* Chassis */}
                  <td className="py-3 px-4 font-mono text-slate-600 dark:text-slate-400 whitespace-nowrap">
                    {item.chassis_number}
                  </td>

                  {/* Engine_No */}
                  <td className="py-3 px-4 font-mono text-slate-600 dark:text-slate-400 whitespace-nowrap">
                    {item.engine_number}
                  </td>

                  {/* Mileage */}
                  <td className="py-3 px-3 text-right font-mono tabular-nums text-slate-700 dark:text-slate-300 whitespace-nowrap">
                    {item.mileage ? `${item.mileage.toLocaleString('id-ID')} km` : '-'}
                  </td>

                  {/* DLR */}
                  <td className="py-3 px-4 text-slate-700 dark:text-slate-300 whitespace-nowrap max-w-[180px] truncate" title={item.dealer_name}>
                    {item.dealer_name}
                  </td>

                  {/* QPI Number */}
                  <td className="py-3 px-3 font-mono font-medium text-slate-700 dark:text-slate-300 whitespace-nowrap">
                    {item.qpi_number || '-'}
                  </td>

                  {/* PROBLEM */}
                  <td className="py-3 px-4 whitespace-nowrap max-w-[220px]" title={item.problem || '-'}>
                    <div className="font-normal text-slate-800 dark:text-slate-200 truncate">
                      {item.problem ? item.problem : '-'}
                    </div>
                  </td>

                  {/* Judgment & Judgement Date */}
                  <td className="py-3 px-3 whitespace-nowrap max-w-[160px]">
                    <div className="font-medium text-slate-900 dark:text-white truncate" title={item.judgement_qpi}>
                      {item.judgement_qpi || 'In Review'}
                    </div>
                    {item.judgement_date && (
                      <div className="text-[10px] font-mono text-slate-500 dark:text-slate-400">
                        Tgl: {item.judgement_date}
                      </div>
                    )}
                  </td>

                  {/* OCCURRED DATE */}
                  <td className="py-3 px-3 text-center whitespace-nowrap font-mono text-slate-700 dark:text-slate-300">
                    {item.occurred_date ? item.occurred_date : '-'}
                  </td>

                  {/* REPAIR DATE */}
                  <td className="py-3 px-3 text-center whitespace-nowrap font-mono text-slate-700 dark:text-slate-300">
                    {item.repair_date ? item.repair_date : '-'}
                  </td>

                  {/* Leadtime Hari */}
                  <td className="py-3 px-3 text-center whitespace-nowrap">
                    {renderDaysBadge(
                      item.days_elapsed || 0,
                      Boolean(item.is_overdue),
                      item.tracking_status === 'Delivered' || item.tracking_status === 'Sent to HMMI'
                    )}
                  </td>

                  {/* Status Alur */}
                  <td className="py-3 px-3 text-center whitespace-nowrap">
                    {renderStatusBadge(item.tracking_status)}
                  </td>

                  {/* Bukti Foto (Area & Quality) */}
                  <td className="py-3 px-3 text-center whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                    <div className="flex items-center justify-center gap-1.5">
                      <span
                        title={item.area_photo ? `Foto Tim Area: Diterima oleh ${item.area_received_by}` : 'Belum ada foto Tim Area'}
                        className={`p-1 rounded ${item.area_photo ? 'bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300' : 'text-slate-300 dark:text-slate-600'}`}
                      >
                        <Camera className="w-3.5 h-3.5" />
                      </span>
                      <span
                        title={item.quality_photo ? `Foto Tim Quality: Dicek oleh ${item.quality_checked_by}` : 'Belum ada foto Tim Quality'}
                        className={`p-1 rounded ${item.quality_photo ? 'bg-blue-100 dark:bg-blue-950/60 text-blue-800 dark:text-blue-300' : 'text-slate-300 dark:text-slate-600'}`}
                      >
                        <ShieldCheck className="w-3.5 h-3.5" />
                      </span>
                    </div>
                  </td>

                  {/* Tindakan Alur */}
                  <td className="py-3 px-4 text-right whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                    <div className="flex items-center justify-end gap-1.5">
                      <button
                        onClick={() => onOpenActionModal(item)}
                        className={`px-2.5 py-1 text-xs font-semibold rounded-lg transition-colors flex items-center gap-1 ${
                          item.tracking_status === 'Waiting OFP'
                            ? 'bg-amber-600 hover:bg-amber-700 text-white'
                            : item.tracking_status === 'Not yet shipped'
                            ? 'bg-blue-600 hover:bg-blue-700 text-white'
                            : 'bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200'
                        }`}
                        title="Perbarui Status, Upload Foto, atau Verifikasi"
                      >
                        {item.tracking_status === 'Waiting OFP' ? (
                          <><span>Terima Area</span></>
                        ) : item.tracking_status === 'Not yet shipped' ? (
                          <><span>Verif / Kirim</span></>
                        ) : (
                          <><span>Rincian</span></>
                        )}
                      </button>

                      <button
                        onClick={() => onSelectRecord(item)}
                        className="p-1 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded transition-colors"
                        title="Lihat Detail Lengkap"
                      >
                        <Eye className="w-3.5 h-3.5" />
                      </button>

                      <button
                        onClick={() => handlePrintSingle(item)}
                        className="p-1 text-slate-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40 rounded transition-colors"
                        title="Cetak Tag Part (Original Failure Part Tag) ini"
                      >
                        <Tag className="w-3.5 h-3.5" />
                      </button>

                      {item.id && (
                        <button
                          onClick={() => {
                            if (window.confirm(`Hapus data ${item.dtr_number} - ${item.part_name}?`)) {
                              onDeleteRecord(item.id!);
                            }
                          }}
                          className="p-1 text-slate-300 dark:text-slate-600 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40 rounded transition-colors"
                          title="Hapus Baris"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={18} className="py-12 text-center text-slate-500 dark:text-slate-400">
                  <p className="font-semibold text-slate-700 dark:text-slate-200">Tidak ada data klaim OFP yang cocok dengan filter.</p>
                  <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">Coba ubah kata kunci atau upload file Excel monitoring baru.</p>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination Footer */}
      <div className="p-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/80 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-600 dark:text-slate-400">
        <div className="flex items-center gap-2">
          <span>Baris per halaman:</span>
          <select
            value={itemsPerPage}
            onChange={(e) => {
              setItemsPerPage(Number(e.target.value));
              setCurrentPage(1);
            }}
            className="px-2 py-1 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded text-xs font-mono text-slate-800 dark:text-slate-200"
          >
            <option value={10}>10</option>
            <option value={25}>25</option>
            <option value={50}>50</option>
          </select>
          <span className="text-slate-400">·</span>
          <span>
            Halaman <strong className="font-mono text-slate-900 dark:text-white">{currentPage}</strong> dari <strong className="font-mono text-slate-900 dark:text-white">{totalPages}</strong>
          </span>
        </div>

        <div className="flex items-center gap-1">
          <button
            onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}
            disabled={currentPage === 1}
            className={`p-1.5 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 ${
              currentPage === 1 ? 'opacity-40 cursor-not-allowed' : 'hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200'
            }`}
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <span className="px-3 font-mono text-slate-800 dark:text-slate-200">{currentPage} / {totalPages}</span>
          <button
            onClick={() => setCurrentPage((p) => Math.min(p + 1, totalPages))}
            disabled={currentPage === totalPages}
            className={`p-1.5 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 ${
              currentPage === totalPages ? 'opacity-40 cursor-not-allowed' : 'hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200'
            }`}
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

    </div>
  );
};
