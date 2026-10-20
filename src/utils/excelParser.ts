import * as XLSX from 'xlsx';
import { OpfRecord } from '../types';

/**
 * Normalizes keys to handle various Excel header naming styles
 */
export function normalizeKey(key: string): string {
  return String(key || '').toLowerCase().replace(/[^a-z0-9]/g, '');
}

/**
 * Parses Excel date (serial number, Date object, or string) to YYYY-MM-DD
 */
export function parseExcelDate(val: any): string {
  if (!val) return new Date().toISOString().split('T')[0];

  if (val instanceof Date) {
    if (!isNaN(val.getTime())) {
      return val.toISOString().split('T')[0];
    }
  }

  if (typeof val === 'number') {
    // Excel serial date to JS Date
    const date = new Date(Math.round((val - 25569) * 86400 * 1000));
    if (!isNaN(date.getTime())) {
      return date.toISOString().split('T')[0];
    }
  }

  const str = String(val).trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(str)) return str;

  // DD/MM/YYYY or DD-MM-YYYY
  const dmyMatch = str.match(/^(\d{1,2})[\/\-\.](\d{1,2})[\/\-\.](\d{4})$/);
  if (dmyMatch) {
    const day = dmyMatch[1].padStart(2, '0');
    const month = dmyMatch[2].padStart(2, '0');
    const year = dmyMatch[3];
    return `${year}-${month}-${day}`;
  }

  // Indonesian month name support (e.g. 15 Oktober 2026, 12 Jan 2026)
  const indoMonths: Record<string, string> = {
    jan: '01', januari: '01',
    feb: '02', februari: '02',
    mar: '03', maret: '03',
    apr: '04', april: '04',
    mei: '05', may: '05',
    jun: '06', juni: '06',
    jul: '07', juli: '07',
    agu: '08', agt: '08', agustus: '08',
    sep: '09', september: '09',
    okt: '10', oktober: '10',
    nov: '11', november: '11',
    des: '12', desember: '12'
  };
  const indoMatch = str.match(/^(\d{1,2})\s+([a-zA-Z]+)\s+(\d{4})$/);
  if (indoMatch) {
    const day = indoMatch[1].padStart(2, '0');
    const monthKey = indoMatch[2].toLowerCase();
    const month = indoMonths[monthKey];
    if (month) {
      return `${indoMatch[3]}-${month}-${day}`;
    }
  }

  const parsed = new Date(str);
  if (!isNaN(parsed.getTime())) {
    return parsed.toISOString().split('T')[0];
  }

  return new Date().toISOString().split('T')[0];
}

/**
 * Extracts OpfRecord objects from an XLSX worksheet with dynamic header detection
 */
export function extractOpfRecordsFromSheet(worksheet: XLSX.WorkSheet): { records: OpfRecord[]; errors: string[] } {
  // Convert worksheet to 2D array of rows
  const rawAoa: any[][] = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: '', raw: false });
  if (!rawAoa || rawAoa.length === 0) {
    return { records: [], errors: ['Lembar kerja Excel kosong.'] };
  }

  // Scan first 25 rows to locate header row
  let headerRowIndex = -1;
  const headerColMap: Record<string, number> = {};

  for (let r = 0; r < Math.min(rawAoa.length, 25); r++) {
    const row = rawAoa[r];
    if (!Array.isArray(row)) continue;

    const rowNormalized = row.map((cell) => normalizeKey(String(cell || '')));
    const hasTrNo = rowNormalized.some((k) =>
      k === 'trno' || k === 'trnumber' || k === 'nomortr' || k === 'notr' || k === 'nomordtr' || k === 'nodtr' || k === 'dtr' || k === 'dtrnumber'
    );
    const hasPart = rowNormalized.some((k) =>
      k === 'part' || k === 'partname' || k === 'partnumber' || k === 'partno' || k === 'namapart' || k === 'namasparepart' || k === 'nopart'
    );

    if (hasTrNo || (hasPart && rowNormalized.some((k) => k.includes('model') || k.includes('chassis') || k.includes('qpi')))) {
      headerRowIndex = r;
      // Map columns
      for (let c = 0; c < rowNormalized.length; c++) {
        const norm = rowNormalized[c];
        if (norm) {
          headerColMap[norm] = c;
        }
      }
      break;
    }
  }

  const records: OpfRecord[] = [];
  const errors: string[] = [];

  // Fallback: if header row wasn't found in 2D array, try standard object sheet_to_json
  if (headerRowIndex === -1) {
    const rawObjs: Record<string, any>[] = XLSX.utils.sheet_to_json(worksheet, { defval: '' });
    for (let i = 0; i < rawObjs.length; i++) {
      const raw = rawObjs[i];
      const rowNum = i + 2;
      const rowMap: Record<string, any> = {};
      for (const [k, v] of Object.entries(raw)) {
        rowMap[normalizeKey(k)] = v;
      }
      processRowMap(rowMap, rowNum, records, errors);
    }
    return { records, errors };
  }

  // Process rows after the header row
  for (let r = headerRowIndex + 1; r < rawAoa.length; r++) {
    const row = rawAoa[r];
    if (!Array.isArray(row) || row.length === 0) continue;

    // Check if entire row is empty
    if (row.every((cell) => String(cell || '').trim() === '')) continue;

    const rowMap: Record<string, any> = {};
    for (const [normKey, colIdx] of Object.entries(headerColMap)) {
      rowMap[normKey] = row[colIdx] !== undefined ? row[colIdx] : '';
    }

    processRowMap(rowMap, r + 1, records, errors);
  }

  return { records, errors };
}

function processRowMap(
  rowMap: Record<string, any>,
  rowNum: number,
  records: OpfRecord[],
  errors: string[]
) {
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
    return; // skip completely empty rows
  }

  if (!trNo) {
    errors.push(`Baris ${rowNum}: Kolom TR_No kosong.`);
    return;
  }

  if (!part && !partNumber) {
    errors.push(`Baris ${rowNum} (${trNo}): Kolom Part / Part Number kosong.`);
    return;
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

  records.push({
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
  });
}
