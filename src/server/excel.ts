import * as XLSX from 'xlsx';
import { OpfRecord, ExcelImportResult } from '../types.js';
import { bulkInsertOrUpdateOpf } from './db.js';
import {
  extractOpfRecordsFromSheet,
  normalizeKey,
  parseExcelDate,
  parseSafeExcelDate,
  EXCLUDED_JUDGEMENTS,
  isExcludedJudgement,
  extractJudgementFromRowMap,
} from '../utils/excelParser.js';
import { supabase, isSupabaseConfigured } from '../lib/supabase.js';

export {
  extractOpfRecordsFromSheet,
  normalizeKey,
  parseExcelDate,
  parseSafeExcelDate,
  EXCLUDED_JUDGEMENTS,
  isExcludedJudgement,
  extractJudgementFromRowMap,
};

/**
 * Reads Excel file buffer, inserts/upserts directly to Supabase as Single Source of Truth,
 * and updates SQLite local cache.
 */
export async function parseAndImportExcel(buffer: Buffer): Promise<ExcelImportResult> {
  const workbook = XLSX.read(buffer, { type: 'buffer' });
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

  const supabaseErrors: string[] = [];

  // 1. SIMPAN LANGSUNG KE SUPABASE (Single Source of Truth)
  if (isSupabaseConfigured() && supabase) {
    try {
      console.log(`[EXCEL -> SUPABASE] Mengirim ${records.length} data ke Supabase...`);
      
      // Bersihkan object agar sesuai dengan skema kolom Supabase (tanpa ID auto-increment lokal)
      const payload = records.map(({ id, ...rest }) => rest);

      const { data, error } = await supabase
        .from('opf_records')
        .upsert(payload, { onConflict: 'dtr_number,part_name' }); // Menggunakan composite key/unique constraint

      if (error) {
        console.error('[EXCEL -> SUPABASE] Error upsert Supabase:', error.message);
        supabaseErrors.push(`Supabase Error: ${error.message}`);
      } else {
        console.log('[EXCEL -> SUPABASE] Berhasil menyinkronkan data ke Supabase.');
      }
    } catch (sbErr: any) {
      console.error('[EXCEL -> SUPABASE] Exception saat kirim ke Supabase:', sbErr);
      supabaseErrors.push(`Supabase Exception: ${sbErr.message || sbErr}`);
    }
  }

  // 2. PERBARUI SQLITE LOKAL (sebagai cache sementara)
  const dbResult = await bulkInsertOrUpdateOpf(records);

  return {
    totalRowsProcessed: dbResult.totalRowsProcessed,
    recordsInserted: dbResult.recordsInserted,
    recordsUpdated: dbResult.recordsUpdated,
    errors: [...parseErrors, ...supabaseErrors, ...dbResult.errors],
  };
}

/**
 * Generates an Excel workbook template for user download and OneDrive sharing
 */
export function generateExcelTemplate(): Buffer {
  const sampleHeaders = [
    'TR_No',
    'Part',
    'Part Number',
    'Model_Unit',
    'Chassis',
    'Engine_No',
    'Mileage',
    'DLR',
    'QPI Number',
    'Problem',
    'Judgment',
    'Judgement Date',
    'Occurred Date',
    'Repair Date',
    'OFP Receive',
    'OFP Send to HMMI'
  ];

  const sampleRows = [
    [
      'TR-2026-JKT-0101',
      'Turbocharger Assembly',
      '24100-33120',
      'Hino 500 FM 260 JD (6x4 Dump)',
      'MHFJ1JGBMK003312',
      'J08E-WD33120',
      42000,
      'PT Duta Cemerlang Motors - Jakarta Barat',
      'QPI-HMSI-26-0601',
      'Suara mendesing dan tenaga mesin drop saat tanjakan',
      'Under Technical Review',
      '2026-10-15',
      '2026-10-10',
      '2026-10-14',
      '2026-10-18', // OFP Receive -> Status: Sent to HMMI (jika terkirim)
      '2026-10-20'  // OFP Send to HMMI
    ],
    [
      'TR-2026-SBY-0205',
      'Common Rail High Pressure Pump',
      '22100-E0020',
      'Hino 500 FL 260 JW (6x2)',
      'MHFJ1JGCMK019940',
      'J08E-WE19940',
      53400,
      'PT Indomobil Prima Niaga - Surabaya',
      'QPI-HMSI-26-0602',
      'Tekanan bahan bakar abnormal (DTC P0087)',
      'Waiting Physical Sample',
      '2026-09-10',
      '2026-09-05',
      '2026-09-09',
      '2026-10-12', // OFP Receive -> Status: Received by Area
      ''            // OFP Send to HMMI (belum kirim)
    ],
    // Case 1 TR dengan beberapa jenis sparepart berbeda
    [
      'TR-2026-BDG-0310',
      'Leaf Spring Rear No. 1',
      '48201-3820',
      'Hino Dutro 300 130 HD (4x2)',
      'MHFW1JGAMK024100',
      'W04D-TN24100',
      31200,
      'PT Maya Graha Indah - Bandung',
      'QPI-HMSI-26-0603',
      'Daun per nomor 1 patah pada bagian lengkungan',
      'Pending Metallurgical Lab',
      '2026-10-01',
      '2026-09-28',
      '2026-09-30',
      '',           // OFP Receive (kosong) -> Status: Belum Terkirim
      ''            // OFP Send to HMMI (kosong)
    ],
    [
      'TR-2026-BDG-0310',
      'U-Bolt Spring Rear',
      '90117-16010',
      'Hino Dutro 300 130 HD (4x2)',
      'MHFW1JGAMK024100',
      'W04D-TN24100',
      31200,
      'PT Maya Graha Indah - Bandung',
      'QPI-HMSI-26-0603',
      'Drat baut slek dan longgar',
      'Pending Inspection',
      '2026-10-01',
      '2026-09-28',
      '2026-09-30',
      '',
      ''
    ],
    [
      'TR-2026-MDN-0412',
      'Clutch Booster Assembly',
      '31470-1380',
      'Hino 500 FM 350 TH (Tractor Head)',
      'MHFJ1JTHMK005510',
      'P11C-VP55102',
      68000,
      'PT Indomobil Prima Niaga - Medan',
      'QPI-HMSI-26-0604',
      'Pedal kopling keras dan kebocoran minyak kopling',
      'Piston Seal Leaking',
      '2026-09-14',
      '2026-09-08',
      '2026-09-12',
      '2026-10-05',
      '2026-10-10'
    ]
  ];

  const ws = XLSX.utils.aoa_to_sheet([sampleHeaders, ...sampleRows]);

  // Set column widths
  ws['!cols'] = [
    { wch: 20 }, // TR_No
    { wch: 32 }, // Part
    { wch: 18 }, // Part Number
    { wch: 32 }, // Model_Unit
    { wch: 22 }, // Chassis
    { wch: 18 }, // Engine_No
    { wch: 12 }, // Mileage
    { wch: 38 }, // DLR
    { wch: 20 }, // QPI Number
    { wch: 35 }, // Problem
    { wch: 26 }, // Judgment
    { wch: 16 }, // Judgement Date
    { wch: 16 }, // Occurred Date
    { wch: 16 }, // Repair Date
    { wch: 18 }, // OFP Receive
    { wch: 20 }  // OFP Send to HMMI
  ];

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Monitoring_OFP_HMSI');

  return XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
}
