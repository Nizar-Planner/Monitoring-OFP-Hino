import * as XLSX from 'xlsx';
import { OpfRecord, ExcelImportResult } from '../types.js';
import { insertOrUpdateOpf } from './db.js';

/**
 * Normalizes keys to handle various Excel header naming styles
 */
function normalizeKey(key: string): string {
  return key.toLowerCase().replace(/[^a-z0-9]/g, '');
}

/**
 * Parses Excel date (serial number or string) to YYYY-MM-DD
 */
function parseExcelDate(val: any): string {
  if (!val) return new Date().toISOString().split('T')[0];
  
  if (typeof val === 'number') {
    // Excel serial date to JS Date
    const date = new Date(Math.round((val - 25569) * 86400 * 1000));
    if (!isNaN(date.getTime())) {
      return date.toISOString().split('T')[0];
    }
  }

  const str = String(val).trim();
  // Try parsing YYYY-MM-DD or DD/MM/YYYY
  if (/^\d{4}-\d{2}-\d{2}$/.test(str)) return str;

  const dmyMatch = str.match(/^(\d{1,2})[\/\-\.](\d{1,2})[\/\-\.](\d{4})$/);
  if (dmyMatch) {
    const day = dmyMatch[1].padStart(2, '0');
    const month = dmyMatch[2].padStart(2, '0');
    const year = dmyMatch[3];
    return `${year}-${month}-${day}`;
  }

  const parsed = new Date(str);
  if (!isNaN(parsed.getTime())) {
    return parsed.toISOString().split('T')[0];
  }

  return new Date().toISOString().split('T')[0];
}

/**
 * Reads Excel file buffer and imports rows into SQLite
 */
export async function parseAndImportExcel(buffer: Buffer): Promise<ExcelImportResult> {
  const workbook = XLSX.read(buffer, { type: 'buffer' });
  const firstSheetName = workbook.SheetNames[0];
  if (!firstSheetName) {
    throw new Error('File Excel tidak memiliki lembar kerja (sheet).');
  }

  const worksheet = workbook.Sheets[firstSheetName];
  const rawRows: Record<string, any>[] = XLSX.utils.sheet_to_json(worksheet, { defval: '' });

  let totalRowsProcessed = 0;
  let recordsInserted = 0;
  let recordsUpdated = 0;
  const errors: string[] = [];

  for (let i = 0; i < rawRows.length; i++) {
    const raw = rawRows[i];
    const rowNum = i + 2; // header is row 1

    // Map columns flexibly
    const rowMap: Record<string, any> = {};
    for (const [k, v] of Object.entries(raw)) {
      rowMap[normalizeKey(k)] = v;
    }

    // 1. TR_No
    const trNo = String(
      rowMap['trno'] || rowMap['tr_no'] || rowMap['trnumber'] || rowMap['nomortr'] || rowMap['notr'] || rowMap['nomordtr'] || rowMap['nodtr'] || rowMap['dtr'] || rowMap['dtrnumber'] || ''
    ).trim();

    // 2. Part
    const part = String(
      rowMap['part'] || rowMap['partname'] || rowMap['namapart'] || rowMap['namasparepart'] || ''
    ).trim();

    // 3. Part Number
    const partNumber = String(
      rowMap['partnumber'] || rowMap['partno'] || rowMap['nopart'] || rowMap['nomorpart'] || rowMap['part_number'] || ''
    ).trim();

    // 4. Model_Unit
    const modelUnit = String(
      rowMap['modelunit'] || rowMap['model_unit'] || rowMap['model'] || rowMap['modelkendaraan'] || rowMap['tipe'] || 'Hino 500'
    ).trim();

    // 5. Chassis
    const chassis = String(
      rowMap['chassis'] || rowMap['nochassis'] || rowMap['norangka'] || rowMap['vin'] || ''
    ).trim();

    // 6. Engine_No
    const engineNo = String(
      rowMap['engineno'] || rowMap['engine_no'] || rowMap['noengine'] || rowMap['engine'] || rowMap['nomesin'] || rowMap['eg'] || ''
    ).trim();

    // 7. Mileage
    const mileage = parseInt(String(rowMap['mileage'] || rowMap['km'] || rowMap['odometer'] || '0').replace(/\D/g, ''), 10) || 0;

    // 8. DLR
    const dlr = String(
      rowMap['dlr'] || rowMap['dealer'] || rowMap['namadealer'] || rowMap['dealername'] || rowMap['bengkel'] || 'Dealer Hino'
    ).trim();

    // 9. QPI Number
    const qpiNumber = String(
      rowMap['qpinumber'] || rowMap['nomorqpi'] || rowMap['noqpi'] || rowMap['qpi'] || ''
    ).trim();

    // 10. Judgment
    const judgment = String(
      rowMap['judgment'] || rowMap['judgement'] || rowMap['judgementqpi'] || rowMap['judgmentqpi'] || rowMap['putusanqpi'] || rowMap['statusqpi'] || 'Pending Inspection'
    ).trim();

    // 11. Judgement Date
    const rawJudgementDate = rowMap['judgementdate'] || rowMap['judgmentdate'] || rowMap['tanggaljudgement'] || rowMap['tanggaljudgment'] || rowMap['tgljudgement'] || rowMap['tgljudgment'] || '';
    const judgementDate = rawJudgementDate ? parseExcelDate(rawJudgementDate) : null;

    if (!trNo && !part && !partNumber) {
      continue; // skip empty rows
    }

    if (!trNo) {
      errors.push(`Baris ${rowNum}: Kolom TR_No kosong.`);
      continue;
    }

    if (!part && !partNumber) {
      errors.push(`Baris ${rowNum} (${trNo}): Kolom Part / Part Number kosong.`);
      continue;
    }

    const effectivePartName = part || partNumber;
    const quantity = Math.max(1, parseInt(String(rowMap['quantity'] || rowMap['qty'] || rowMap['jumlah'] || '1'), 10) || 1);

    // Request date: prefer explicit request date, otherwise use Judgement Date or today
    const rawRequestDate = rowMap['requestdate'] || rowMap['tanggaldtr'] || rowMap['tanggalrequest'] || rowMap['tanggal'] || rowMap['date'] || '';
    const requestDate = rawRequestDate ? parseExcelDate(rawRequestDate) : (judgementDate || new Date().toISOString().split('T')[0]);

    // Initial status determination from Excel if present, otherwise 'Waiting OFP'
    let trackingStatus: 'Waiting OFP' | 'Not yet shipped' | 'Delivered' = 'Waiting OFP';
    const rawStatus = String(rowMap['status'] || rowMap['trackingstatus'] || rowMap['statusalur'] || '').toLowerCase();
    if (rawStatus.includes('delivered') || rawStatus.includes('terkirim') || rawStatus.includes('selesai') || rawStatus.includes('hmmi')) {
      trackingStatus = 'Delivered';
    } else if (rawStatus.includes('not yet') || rawStatus.includes('hmsi') || rawStatus.includes('transit') || rawStatus.includes('terima')) {
      trackingStatus = 'Not yet shipped';
    }

    const record: OpfRecord = {
      dtr_number: trNo,
      part_name: effectivePartName,
      part_number: partNumber,
      quantity,
      model: modelUnit,
      chassis_number: chassis || 'MHFJ1JGBMK000000',
      engine_number: engineNo || 'J08E-WD00000',
      mileage,
      dealer_name: dlr,
      qpi_number: qpiNumber,
      judgement_qpi: judgment,
      judgement_date: judgementDate,
      request_date: requestDate,
      tracking_status: trackingStatus,
    };

    try {
      const res = await insertOrUpdateOpf(record);
      totalRowsProcessed++;
      if (res.isNew) recordsInserted++;
      else recordsUpdated++;
    } catch (err: any) {
      errors.push(`Baris ${rowNum} (${trNo} - ${effectivePartName}): ${err.message || 'Gagal menyimpan ke database'}`);
    }
  }

  return {
    totalRowsProcessed,
    recordsInserted,
    recordsUpdated,
    errors,
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
