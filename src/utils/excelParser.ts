import * as XLSX from 'xlsx';
import { OpfRecord, TrackingStatus } from '../types.js';

/**
 * Normalisasi nama kolom/header Excel (lowercase & alphanumeric saja)
 * Contoh: "OFP Receive" -> "ofpreceive", "OFP Send to HMMI" -> "ofpsendtohmmi"
 */
export function normalizeKey(key: string): string {
  return String(key || '').toLowerCase().replace(/[^a-z0-9]/g, '');
}

/**
 * Memeriksa dan mengonversi format tanggal Excel (serial number, Date object, atau teks)
 * menjadi string ISO 'YYYY-MM-DD' yang aman disimpan ke kolom DATE PostgreSQL Supabase.
 * Mengembalikan `null` jika sel kosong, tidak valid, atau placeholder ('-', 'N/A', dll).
 */
export function parseSafeExcelDate(val: any): string | null {
  if (val === null || val === undefined) return null;

  // 1. Tangani jika sel sudah merupakan object Date JavaScript
  if (val instanceof Date) {
    if (!isNaN(val.getTime())) {
      const year = val.getFullYear();
      const month = String(val.getMonth() + 1).padStart(2, '0');
      const day = String(val.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    }
    return null;
  }

  // 2. Tangani angka serial Excel (misal: 45210 atau 45612)
  if (typeof val === 'number') {
    if (isNaN(val) || val <= 0) return null;
    
    // Gunakan parser internal SSF XLSX jika tersedia
    if (XLSX.SSF && typeof XLSX.SSF.parse_date_code === 'function') {
      try {
        const parsed = XLSX.SSF.parse_date_code(val);
        if (parsed && parsed.y && parsed.m && parsed.d) {
          const y = parsed.y;
          const m = String(parsed.m).padStart(2, '0');
          const d = String(parsed.d).padStart(2, '0');
          return `${y}-${m}-${d}`;
        }
      } catch (_e) {}
    }

    // Formula serial date Excel -> JS Date (UTC arithmetic untuk mencegah pergeseran timezone)
    // Excel menghitung leap year 1900 fiktif (serial 60), koreksi 25569 hari offset
    const utcDays = Math.floor(val - (val > 60 ? 25569 : 25568));
    const dateObj = new Date(utcDays * 86400 * 1000);
    if (!isNaN(dateObj.getTime())) {
      const year = dateObj.getUTCFullYear();
      const month = String(dateObj.getUTCMonth() + 1).padStart(2, '0');
      const day = String(dateObj.getUTCDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    }
    return null;
  }

  const str = String(val).trim();
  if (!str) return null;

  // 3. Tangani teks placeholder kosong umum
  const emptyIndicators = [
    '-', '--', '---', '/', 'n/a', 'na', 'null', 'undefined',
    'none', 'kosong', 'belum', 'belum terkirim', 'tidak ada', '0', '0000-00-00'
  ];
  if (emptyIndicators.includes(str.toLowerCase())) {
    return null;
  }

  // 4. Jika nilai berupa teks angka serial (misal "45612")
  if (/^\d{5}(\.\d+)?$/.test(str)) {
    const num = parseFloat(str);
    return parseSafeExcelDate(num);
  }

  // 5. Format ISO: YYYY-MM-DD atau YYYY/MM/DD
  const isoMatch = str.match(/^(\d{4})[-\/\.](\d{1,2})[-\/\.](\d{1,2})/);
  if (isoMatch) {
    const year = isoMatch[1];
    const month = isoMatch[2].padStart(2, '0');
    const day = isoMatch[3].padStart(2, '0');
    const mNum = parseInt(month, 10);
    const dNum = parseInt(day, 10);
    if (mNum >= 1 && mNum <= 12 && dNum >= 1 && dNum <= 31) {
      return `${year}-${month}-${day}`;
    }
  }

  // 6. Format DD/MM/YYYY, DD-MM-YYYY, atau DD.MM.YYYY
  const dmyMatch = str.match(/^(\d{1,2})[\/\-\.](\d{1,2})[\/\-\.](\d{4})$/);
  if (dmyMatch) {
    const partA = parseInt(dmyMatch[1], 10);
    const partB = parseInt(dmyMatch[2], 10);
    const year = dmyMatch[3];

    let day = partA;
    let month = partB;

    // Evaluasi jika formatnya MM/DD/YYYY vs DD/MM/YYYY
    if (partA > 12 && partB <= 12) {
      day = partA;
      month = partB;
    } else if (partB > 12 && partA <= 12) {
      day = partB;
      month = partA;
    }

    if (month >= 1 && month <= 12 && day >= 1 && day <= 31) {
      return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    }
  }

  // 7. Format Nama Bulan Indonesia & Inggris (misal: "15 Oktober 2026", "20-Jan-2026")
  const indoMonths: Record<string, string> = {
    jan: '01', januari: '01', january: '01',
    feb: '02', februari: '02', february: '02',
    mar: '03', maret: '03', march: '03',
    apr: '04', april: '04',
    mei: '05', may: '05',
    jun: '06', juni: '06', june: '06',
    jul: '07', juli: '07', july: '07',
    agu: '08', agt: '08', agustus: '08', aug: '08', august: '08',
    sep: '09', september: '09',
    okt: '10', oktober: '10', oct: '10', october: '10',
    nov: '11', november: '11',
    des: '12', desember: '12', dec: '12', december: '12'
  };

  const indoMatch = str.match(/^(\d{1,2})[\s\-\/\.]*([a-zA-Z]+)[\s\-\/\.]*(\d{4})$/);
  if (indoMatch) {
    const day = indoMatch[1].padStart(2, '0');
    const monthKey = indoMatch[2].toLowerCase();
    const month = indoMonths[monthKey];
    if (month) {
      return `${indoMatch[3]}-${month}-${day}`;
    }
  }

  // 8. Fallback parse Date bawaan browser / Node.js
  const parsed = new Date(str);
  if (!isNaN(parsed.getTime())) {
    const year = parsed.getFullYear();
    // Validasi tahun dalam batas wajar
    if (year >= 1990 && year <= 2100) {
      const month = String(parsed.getMonth() + 1).padStart(2, '0');
      const day = String(parsed.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    }
  }

  return null;
}

/**
 * Wrapper pembantu untuk tanggal wajib (seperti request_date),
 * mengembalikan string YYYY-MM-DD (atau fallback hari ini jika null).
 */
export function parseExcelDate(val: any, fallbackToToday: boolean = true): string {
  const parsed = parseSafeExcelDate(val);
  if (parsed) return parsed;
  return fallbackToToday ? new Date().toISOString().split('T')[0] : '';
}

/**
 * Membaca lembar kerja Excel (XLSX Worksheet) dan mengekstrak data OpfRecord
 * dengan deteksi kolom header otomatis dan logika penetapan status klaim.
 */
export function extractOpfRecordsFromSheet(worksheet: XLSX.WorkSheet): { records: OpfRecord[]; errors: string[] } {
  // Ubah lembar kerja menjadi Array 2 Dimensi (baris & kolom)
  const rawAoa: any[][] = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: '', raw: false });
  if (!rawAoa || rawAoa.length === 0) {
    return { records: [], errors: ['Lembar kerja Excel kosong.'] };
  }

  // Pindai 25 baris pertama untuk menemukan baris Header
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
      // Simpan index mapping tiap kolom yang terdeteksi
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

  // Fallback: Jika header tidak terdeteksi via AOA, gunakan sheet_to_json default
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

  // Proses seluruh baris data setelah baris header
  for (let r = headerRowIndex + 1; r < rawAoa.length; r++) {
    const row = rawAoa[r];
    if (!Array.isArray(row) || row.length === 0) continue;

    // Lewati baris jika seluruh sel kosong
    if (row.every((cell) => String(cell || '').trim() === '')) continue;

    const rowMap: Record<string, any> = {};
    for (const [normKey, colIdx] of Object.entries(headerColMap)) {
      rowMap[normKey] = row[colIdx] !== undefined ? row[colIdx] : '';
    }

    processRowMap(rowMap, r + 1, records, errors);
  }

  return { records, errors };
}

/**
 * Pemetaan baris Excel menjadi objek OpfRecord dan penentuan status klaim
 */
function processRowMap(
  rowMap: Record<string, any>,
  rowNum: number,
  records: OpfRecord[],
  errors: string[]
) {
  // 1. Kolom TR_No / Nomor DTR
  const trNo = String(
    rowMap['trno'] || rowMap['tr_no'] || rowMap['trnumber'] || rowMap['nomortr'] || rowMap['notr'] || rowMap['nomordtr'] || rowMap['nodtr'] || rowMap['dtr'] || rowMap['dtrnumber'] || ''
  ).trim();

  // 2. Kolom Part (Nama Komponen)
  const part = String(
    rowMap['part'] || rowMap['partname'] || rowMap['namapart'] || rowMap['namasparepart'] || ''
  ).trim();

  // 3. Kolom Part Number
  const partNumber = String(
    rowMap['partnumber'] || rowMap['partno'] || rowMap['nopart'] || rowMap['nomorpart'] || rowMap['part_number'] || ''
  ).trim();

  // 4. Kolom Model_Unit
  const modelUnit = String(
    rowMap['modelunit'] || rowMap['model_unit'] || rowMap['model'] || rowMap['modelkendaraan'] || rowMap['tipe'] || 'Hino 500'
  ).trim();

  // 5. Kolom Chassis
  const chassis = String(
    rowMap['chassis'] || rowMap['nochassis'] || rowMap['norangka'] || rowMap['vin'] || ''
  ).trim();

  // 6. Kolom Engine_No
  const engineNo = String(
    rowMap['engineno'] || rowMap['engine_no'] || rowMap['noengine'] || rowMap['engine'] || rowMap['nomesin'] || rowMap['eg'] || ''
  ).trim();

  // 7. Kolom Mileage
  const mileage = parseInt(String(rowMap['mileage'] || rowMap['km'] || rowMap['odometer'] || '0').replace(/\D/g, ''), 10) || 0;

  // 8. Kolom DLR (Dealer Name)
  const dlr = String(
    rowMap['dlr'] || rowMap['dealer'] || rowMap['namadealer'] || rowMap['dealername'] || rowMap['bengkel'] || 'Dealer Hino'
  ).trim();

  // 9. Kolom QPI Number
  const qpiNumber = String(
    rowMap['qpinumber'] || rowMap['nomorqpi'] || rowMap['noqpi'] || rowMap['qpi'] || ''
  ).trim();

  // 10. Kolom Judgment
  const judgment = String(
    rowMap['judgment'] || rowMap['judgement'] || rowMap['judgementqpi'] || rowMap['judgmentqpi'] || rowMap['putusanqpi'] || rowMap['statusqpi'] || 'Pending Inspection'
  ).trim();

  // 11. Kolom Judgement Date
  const rawJudgementDate =
    rowMap['judgementdate'] || rowMap['judgmentdate'] || rowMap['tanggaljudgement'] || rowMap['tanggaljudgment'] || rowMap['tgljudgement'] || rowMap['tgljudgment'] || '';
  const judgementDate = parseSafeExcelDate(rawJudgementDate);

  // 12. Kolom Request Date (Tanggal Permintaan / DTR Terbit)
  const rawRequestDate =
    rowMap['requestdate'] || rowMap['tanggaldtr'] || rowMap['tanggalrequest'] || rowMap['tanggal'] || rowMap['date'] || '';
  const requestDate = parseSafeExcelDate(rawRequestDate) || (judgementDate || new Date().toISOString().split('T')[0]);

  // Validasi baris kosong
  if (!trNo && !part && !partNumber) {
    return; // Lewati baris kosong
  }

  if (!trNo) {
    errors.push(`Baris ${rowNum}: Kolom TR_No / Nomor DTR kosong.`);
    return;
  }

  if (!part && !partNumber) {
    errors.push(`Baris ${rowNum} (${trNo}): Kolom Part / Part Number kosong.`);
    return;
  }

  const effectivePartName = part || partNumber;
  const quantity = Math.max(1, parseInt(String(rowMap['quantity'] || rowMap['qty'] || rowMap['jumlah'] || '1'), 10) || 1);

  // ==============================================================================
  // PEMETAAN KOLOM: OFP Receive & OFP Send to HMMI
  // ==============================================================================
  // 13. Kolom OFP Receive (Penerimaan part fisik oleh Area HMSI)
  const rawOfpReceive =
    rowMap['ofpreceive'] ||
    rowMap['ofpreceived'] ||
    rowMap['ofpreceivedate'] ||
    rowMap['receiveofp'] ||
    rowMap['receivedofp'] ||
    rowMap['tglterimaofp'] ||
    rowMap['tanggalterimaofp'] ||
    rowMap['tglofpterima'] ||
    rowMap['tanggalofpterima'] ||
    rowMap['areareceiveddate'] ||
    rowMap['areareceived'] ||
    rowMap['tglterimaarea'] ||
    rowMap['ofpterima'] ||
    '';

  // 14. Kolom OFP Send to HMMI (Pengiriman part fisik ke pabrik HMMI/HML)
  const rawOfpSendToHmmi =
    rowMap['ofpsendtohmmi'] ||
    rowMap['ofpsendtohmmihml'] ||
    rowMap['ofpsend'] ||
    rowMap['ofpsent'] ||
    rowMap['ofpsenddate'] ||
    rowMap['sendtohmmi'] ||
    rowMap['senttohmmi'] ||
    rowMap['ofpkirimkehmmi'] ||
    rowMap['tglkirimhmmi'] ||
    rowMap['tanggalkirimhmmi'] ||
    rowMap['tglofpkirim'] ||
    rowMap['tanggalofpkirim'] ||
    rowMap['shippeddate'] ||
    rowMap['shipped_date'] ||
    '';

  // Konversi format tanggal Excel agar aman dibaca dan disimpan ke Supabase
  const ofpReceiveDate = parseSafeExcelDate(rawOfpReceive);
  const ofpSendToHmmiDate = parseSafeExcelDate(rawOfpSendToHmmi);

  // ==============================================================================
  // LOGIKA PENETAPAN STATUS KLAIM OPF DARI EXCEL:
  // 1. Pengecekan Kolom `OFP Receive`: Jika kolom ini berisi tanggal yang valid/terisi,
  //    tetapkan status klaim menjadi "Received by Area".
  // 2. Pengecekan Kolom `OFP Send to HMMI`: Jika kolom ini berisi tanggal yang valid/terisi,
  //    tetapkan status klaim menjadi "Sent to HMMI".
  // 3. Kondisi Default: Jika kedua kolom tanggal tersebut kosong, tetapkan status awal
  //    menjadi "Belum Terkirim".
  // ==============================================================================
  let trackingStatus: TrackingStatus = 'Belum Terkirim';

  if (ofpReceiveDate) {
    trackingStatus = 'Received by Area';
  }

  if (ofpSendToHmmiDate) {
    trackingStatus = 'Sent to HMMI';
  }

  // Jika di Excel terdapat kolom status manual yang spesifik, gunakan sebagai fallback jika kedua kolom tanggal belum terisi
  if (!ofpReceiveDate && !ofpSendToHmmiDate && rowMap['status']) {
    const manualStatus = String(rowMap['status']).toLowerCase();
    if (manualStatus.includes('hmmi') || manualStatus.includes('delivered') || manualStatus.includes('sent')) {
      trackingStatus = 'Sent to HMMI';
    } else if (manualStatus.includes('area') || manualStatus.includes('received') || manualStatus.includes('terima')) {
      trackingStatus = 'Received by Area';
    }
  }

  // ==============================================================================
  // PEMETAAN KOLOM: Problem, Occurred Date, Repair Date, Pos
  // ==============================================================================
  // 15. Kolom Problem / Keluhan Kerusakan
  const problem = String(
    rowMap['problem'] ||
    rowMap['masalah'] ||
    rowMap['deskripsimasalah'] ||
    rowMap['issue'] ||
    rowMap['keluhan'] ||
    rowMap['failure'] ||
    rowMap['deskripsi'] ||
    ''
  ).trim();

  // 16. Kolom Occurred Date (Tanggal Kerusakan)
  const rawOccurredDate =
    rowMap['occurreddate'] ||
    rowMap['occurdate'] ||
    rowMap['tanggalkejadian'] ||
    rowMap['tglkejadian'] ||
    rowMap['occurred'] ||
    rowMap['failuredate'] ||
    rowMap['tglrusak'] ||
    '';
  const occurredDate = parseSafeExcelDate(rawOccurredDate);

  // 17. Kolom Repair Date (Tanggal Perbaikan)
  const rawRepairDate =
    rowMap['repairdate'] ||
    rowMap['tglperbaikan'] ||
    rowMap['tanggalperbaikan'] ||
    rowMap['repaired'] ||
    rowMap['tglrepair'] ||
    rowMap['tanggalselesai'] ||
    '';
  const repairDate = parseSafeExcelDate(rawRepairDate);

  // 18. Kolom Pos / Lokasi Penyimpanan Part
  const pos = String(
    rowMap['pos'] ||
    rowMap['lokasi'] ||
    rowMap['lokasipart'] ||
    rowMap['lokasipenyimpanan'] ||
    rowMap['storagepos'] ||
    rowMap['rack'] ||
    rowMap['rak'] ||
    ''
  ).trim();

  // Simpan record klaim
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
    area_received_date: ofpReceiveDate,
    area_received_by: ofpReceiveDate ? (rowMap['areareceivedby'] || 'Tim Area HMSI') : '',
    shipped_date: ofpSendToHmmiDate,
    problem: problem,
    pos: pos,
    occurred_date: occurredDate,
    repair_date: repairDate,
  });
}
