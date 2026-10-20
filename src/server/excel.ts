import * as XLSX from 'xlsx';
import { OpfRecord, ExcelImportResult } from '../types.js';
import { bulkInsertOrUpdateOpf } from './db.js';
import { extractOpfRecordsFromSheet, normalizeKey, parseExcelDate } from '../utils/excelParser.js';

export { extractOpfRecordsFromSheet, normalizeKey, parseExcelDate };

/**
 * Reads Excel file buffer and imports rows into SQLite using high-speed bulk transactions
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

  const dbResult = await bulkInsertOrUpdateOpf(records);

  return {
    totalRowsProcessed: dbResult.totalRowsProcessed,
    recordsInserted: dbResult.recordsInserted,
    recordsUpdated: dbResult.recordsUpdated,
    errors: [...parseErrors, ...dbResult.errors],
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
    'Judgment',
    'Judgement Date'
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
      'Under Technical Review',
      '2026-10-15'
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
      'Waiting Physical Sample',
      '2026-09-10'
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
      'Pending Metallurgical Lab',
      '2026-10-01'
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
      'Pending Inspection',
      '2026-10-01'
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
      'Piston Seal Leaking',
      '2026-09-14'
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
    { wch: 26 }, // Judgment
    { wch: 16 }  // Judgement Date
  ];

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Monitoring_OFP_HMSI');

  return XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
}
