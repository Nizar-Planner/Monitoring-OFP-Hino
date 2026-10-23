import { jsPDF } from 'jspdf';
import { OpfRecord } from '../types';

/**
 * Format helper: Memberikan nilai fallback '-' jika string kosong, null, atau undefined
 */
function getSafeValue(val: any, fallback: string = '-'): string {
  if (val === null || val === undefined) return fallback;
  const str = String(val).trim();
  if (!str || str === '' || str === 'null' || str === 'undefined' || str === 'NaN') {
    return fallback;
  }
  return str;
}

/**
 * Format tanggal Indonesia DD/MM/YYYY
 */
function formatDateTag(val: any): string {
  if (!val) return '-';
  const str = String(val).trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(str)) {
    const [y, m, d] = str.split('-');
    return `${d}/${m}/${y}`;
  }
  return str;
}

/**
 * Helper pemformat QPI Number:
 * Mencegah pemotongan teks jika QPI No mengandung referensi multiline
 * Contoh: "Refer to :\nJKT-25-07-22-03\nQPIR :\n103/QPIR/VIII/2025"
 * Dikonversi menjadi baris-baris terstruktur yang rapi.
 */
export function formatQpiDisplay(raw: string): {
  mainText: string;
  subText?: string;
  fullFormatted: string;
  lines: string[];
} {
  if (!raw || raw.trim() === '' || raw === '-') {
    return { mainText: '-', fullFormatted: '-', lines: ['-'] };
  }
  const clean = raw.trim();

  // Jika terdapat baris baru atau format referensi majemuk
  if (clean.includes('\n') || clean.includes('\r')) {
    const rawLines = clean
      .split(/\r?\n/)
      .map((l) => l.trim())
      .filter(Boolean);

    let refVal = '';
    let qpirVal = '';

    for (let i = 0; i < rawLines.length; i++) {
      const line = rawLines[i];
      if (/^refer\s*to\s*:?$/i.test(line) && rawLines[i + 1]) {
        refVal = rawLines[i + 1];
        i++;
      } else if (/^refer\s*to\s*:\s*(.+)$/i.test(line)) {
        refVal = line.replace(/^refer\s*to\s*:\s*/i, '').trim();
      } else if (/^qpir\s*:?$/i.test(line) && rawLines[i + 1]) {
        qpirVal = rawLines[i + 1];
        i++;
      } else if (/^qpir\s*:\s*(.+)$/i.test(line)) {
        qpirVal = line.replace(/^qpir\s*:\s*/i, '').trim();
      }
    }

    if (refVal || qpirVal) {
      const formattedLines: string[] = [];
      if (refVal) formattedLines.push(`Ref: ${refVal}`);
      if (qpirVal) formattedLines.push(`QPIR: ${qpirVal}`);
      return {
        mainText: refVal || qpirVal,
        subText: refVal && qpirVal ? `QPIR: ${qpirVal}` : undefined,
        fullFormatted: formattedLines.join(' | '),
        lines: formattedLines,
      };
    }

    return {
      mainText: rawLines[0],
      subText: rawLines.slice(1).join(' '),
      fullFormatted: rawLines.join(' | '),
      lines: rawLines,
    };
  }

  // Teks satu baris standar (e.g. "QPI-HMSI-26-0312")
  return {
    mainText: clean,
    fullFormatted: clean,
    lines: [clean],
  };
}

/**
 * Menggambar Barcode Dummy menggunakan garis vertikal presisi
 */
function drawBarcode(doc: jsPDF, x: number, y: number, width: number, height: number, code: string) {
  const patterns = [1, 2, 0.8, 1.5, 0.5, 2.2, 1, 0.6, 1.8, 0.9, 1.4, 0.7, 2, 0.8, 1.2, 1];
  let curX = x;
  doc.setFillColor(0, 0, 0);
  for (let i = 0; i < patterns.length && curX < x + width - 2; i++) {
    const barW = patterns[i] * 0.45;
    const isBar = i % 2 === 0 || i % 3 === 0;
    if (isBar) {
      doc.rect(curX, y, barW, height, 'F');
    }
    curX += barW + 0.4;
  }

  // Label text barcode di bawah garis
  doc.setFont('courier', 'normal');
  doc.setFontSize(5);
  doc.setTextColor(100, 116, 139);
  doc.text(code.substring(0, 18), x, y + height + 2.5);
}

/**
 * Menggambar 1 Kartu Tag Part (Original Failure Part Tag)
 * Layout Kotak Rapi dengan 10 atribut wajib & HMSI-Field Quality
 * Total Tinggi = 130mm (Presisi 6 tag per lembar A4 portrait)
 */
function drawSingleTag(
  doc: jsPDF,
  tx: number,
  ty: number,
  tagWidth: number,
  tagHeight: number,
  record: OpfRecord
) {
  const rawQpiNo = getSafeValue(record.qpi_number);
  const qpiInfo = formatQpiDisplay(rawQpiNo);
  const partName = getSafeValue(record.part_name);
  const problem = getSafeValue(
    record.problem || record.judgement_qpi || record.quality_notes || record.area_notes
  );
  const chassisNo = getSafeValue(record.chassis_number);
  const engineNo = getSafeValue(record.engine_number);
  const km = record.mileage ? `${record.mileage.toLocaleString('id-ID')} km` : '-';
  const occurredDate = formatDateTag(record.occurred_date || record.request_date);
  const repairDate = formatDateTag(
    record.repair_date || record.area_received_date || record.quality_checked_date || record.request_date
  );
  const dtrNo = getSafeValue(record.dtr_number);
  const pos = getSafeValue(record.pos, '-');

  // 1. Kotak Border Luar Utama
  doc.setDrawColor(20, 20, 20);
  doc.setLineWidth(0.4);
  doc.rect(tx, ty, tagWidth, tagHeight, 'S');

  // 2. Header Banner: HINO RED (Tinggi 10mm)
  const headerH = 10;
  doc.setFillColor(197, 34, 31); // Hino Red #C5221F
  doc.rect(tx, ty, tagWidth, headerH, 'F');

  // White badge HINO
  doc.setFillColor(255, 255, 255);
  doc.roundedRect(tx + 2, ty + 1.5, 9.5, 3.8, 0.6, 0.6, 'F');
  doc.setTextColor(197, 34, 31);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(6.8);
  doc.text('HINO', tx + 2.8, ty + 4.3);

  // Header Title
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(6.8);
  doc.text('ORIGINAL FAILURE PART TAG', tx + 13.5, ty + 4.3);

  // Subtitle: HMSI-Field Quality -> HMMI (Tepat dan rapi dengan karakter standar ASCII)
  doc.setFontSize(5.2);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(254, 226, 226);
  doc.text('HMSI-FIELD QUALITY  |  PABRIK HMMI', tx + 2, ty + 8.4);

  // 3. Row 1: QPI No (Tinggi 12.5mm - Lengkap, Menonjol & Tidak Terpotong)
  const qpiH = 12.5;
  const qpiY = ty + headerH;
  doc.setFillColor(243, 244, 246);
  doc.rect(tx, qpiY, tagWidth, qpiH, 'F');
  doc.setDrawColor(50, 50, 50);
  doc.setLineWidth(0.25);
  doc.line(tx, qpiY + qpiH, tx + tagWidth, qpiY + qpiH);

  // Label QPI NO
  doc.setTextColor(55, 65, 81);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(5.5);
  doc.text('QPI NO:', tx + 2, qpiY + 3.8);

  // Nilai QPI No dengan penanganan multiline adaptif
  doc.setTextColor(15, 23, 42);
  doc.setFont('courier', 'bold');
  if (qpiInfo.lines.length === 1) {
    doc.setFontSize(7.5);
    const splitLines = doc.splitTextToSize(qpiInfo.lines[0], tagWidth - 4);
    if (splitLines.length > 1) {
      doc.setFontSize(6.2);
      doc.text(splitLines[0], tx + 2, qpiY + 7.5);
      doc.text(splitLines[1], tx + 2, qpiY + 10.8);
    } else {
      doc.text(splitLines[0], tx + 2, qpiY + 8.8);
    }
  } else if (qpiInfo.lines.length === 2) {
    doc.setFontSize(6.2);
    doc.text(qpiInfo.lines[0], tx + 2, qpiY + 7.2);
    doc.text(qpiInfo.lines[1], tx + 2, qpiY + 10.8);
  } else {
    // 3 baris atau lebih
    doc.setFontSize(5.2);
    qpiInfo.lines.slice(0, 3).forEach((line, lIdx) => {
      doc.text(line, tx + 2, qpiY + 6.2 + lIdx * 2.8);
    });
  }

  // 4. Row 2: Part Name & Pos / Part No (Tinggi 14.5mm)
  const partH = 14.5;
  const partY = qpiY + qpiH;
  doc.setFillColor(255, 255, 255);
  doc.rect(tx, partY, tagWidth, partH, 'F');
  doc.setDrawColor(50, 50, 50);
  doc.line(tx, partY + partH, tx + tagWidth, partY + partH);

  doc.setTextColor(75, 85, 99);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(5.2);
  doc.text('PART NAME:', tx + 2, partY + 3.5);

  doc.setTextColor(15, 23, 42);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(6.8);
  const partLines = doc.splitTextToSize(partName, tagWidth - 4);
  doc.text(partLines.slice(0, 2), tx + 2, partY + 7.2);

  // Divider Pos / Part No
  doc.setDrawColor(229, 231, 235);
  doc.line(tx + 2, partY + 10, tx + tagWidth - 2, partY + 10);
  doc.setTextColor(75, 85, 99);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(5);
  doc.text('POS / PART NO:', tx + 2, partY + 13.2);

  doc.setTextColor(31, 41, 55);
  doc.setFont('courier', 'bold');
  doc.setFontSize(6.5);
  doc.text(pos.substring(0, 22), tx + 20, partY + 13.2);

  // 5. Row 3: Problem / Deskripsi Kerusakan (Tinggi 16mm)
  const probH = 16;
  const probY = partY + partH;
  doc.setFillColor(254, 243, 199); // Amber tint
  doc.rect(tx, probY, tagWidth, probH, 'F');
  doc.setDrawColor(50, 50, 50);
  doc.line(tx, probY + probH, tx + tagWidth, probY + probH);

  doc.setTextColor(180, 83, 9);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(5.2);
  doc.text('PROBLEM / DAMAGE:', tx + 2, probY + 3.6);

  doc.setTextColor(30, 41, 59);
  doc.setFont('helvetica', 'italic');
  doc.setFontSize(6.2);
  const probLines = doc.splitTextToSize(`"${problem}"`, tagWidth - 4);
  doc.text(probLines.slice(0, 3), tx + 2, probY + 7.6);

  // 6. Row 4: Chassis No & Engine No (Split 2 Kolom, Tinggi 12.5mm)
  const chassisH = 12.5;
  const chassisY = probY + probH;
  const midX = tx + tagWidth / 2;
  doc.setFillColor(255, 255, 255);
  doc.rect(tx, chassisY, tagWidth, chassisH, 'F');
  doc.setDrawColor(50, 50, 50);
  doc.line(tx, chassisY + chassisH, tx + tagWidth, chassisY + chassisH);
  doc.line(midX, chassisY, midX, chassisY + chassisH);

  // Left: Chassis
  doc.setTextColor(75, 85, 99);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(5);
  doc.text('CHASSIS NO:', tx + 2, chassisY + 3.8);
  doc.setTextColor(15, 23, 42);
  doc.setFont('courier', 'bold');
  doc.setFontSize(6.5);
  const chassisLines = doc.splitTextToSize(chassisNo, tagWidth / 2 - 3);
  doc.text(chassisLines[0] || '-', tx + 2, chassisY + 8.5);

  // Right: Engine
  doc.setTextColor(75, 85, 99);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(5);
  doc.text('ENGINE NO:', midX + 2, chassisY + 3.8);
  doc.setTextColor(15, 23, 42);
  doc.setFont('courier', 'bold');
  doc.setFontSize(6.5);
  const engineLines = doc.splitTextToSize(engineNo, tagWidth / 2 - 3);
  doc.text(engineLines[0] || '-', midX + 2, chassisY + 8.5);

  // 7. Row 5: Km, Occurred Date, Repair Date (Split 3 Kolom, Tinggi 12.5mm)
  const odoH = 12.5;
  const odoY = chassisY + chassisH;
  const colW3 = tagWidth / 3;
  doc.setFillColor(255, 255, 255);
  doc.rect(tx, odoY, tagWidth, odoH, 'F');
  doc.setDrawColor(50, 50, 50);
  doc.line(tx, odoY + odoH, tx + tagWidth, odoY + odoH);
  doc.line(tx + colW3, odoY, tx + colW3, odoY + odoH);
  doc.line(tx + colW3 * 2, odoY, tx + colW3 * 2, odoY + odoH);

  // Col 1: Km (Odo)
  doc.setTextColor(75, 85, 99);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(5);
  doc.text('KM (ODO):', tx + 1.5, odoY + 3.8);
  doc.setTextColor(15, 23, 42);
  doc.setFont('courier', 'bold');
  doc.setFontSize(6.2);
  doc.text(km.substring(0, 14), tx + 1.5, odoY + 8.5);

  // Col 2: Occurred
  doc.setTextColor(75, 85, 99);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(5);
  doc.text('OCCURRED:', tx + colW3 + 1.5, odoY + 3.8);
  doc.setTextColor(15, 23, 42);
  doc.setFont('courier', 'bold');
  doc.setFontSize(5.8);
  doc.text(occurredDate, tx + colW3 + 1.5, odoY + 8.5);

  // Col 3: Repair
  doc.setTextColor(75, 85, 99);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(5);
  doc.text('REPAIR:', tx + colW3 * 2 + 1.5, odoY + 3.8);
  doc.setTextColor(15, 23, 42);
  doc.setFont('courier', 'bold');
  doc.setFontSize(5.8);
  doc.text(repairDate, tx + colW3 * 2 + 1.5, odoY + 8.5);

  // 8. Row 6: DTR No (Tinggi 9.5mm)
  const dtrH = 9.5;
  const dtrY = odoY + odoH;
  doc.setFillColor(248, 250, 252);
  doc.rect(tx, dtrY, tagWidth, dtrH, 'F');
  doc.setDrawColor(50, 50, 50);
  doc.line(tx, dtrY + dtrH, tx + tagWidth, dtrY + dtrH);

  doc.setTextColor(75, 85, 99);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(5.8);
  doc.text('DTR NO:', tx + 2, dtrY + 4);

  doc.setTextColor(197, 34, 31);
  doc.setFont('courier', 'bold');
  doc.setFontSize(8);
  doc.text(dtrNo, tx + 16, dtrY + 5.5);

  // 9. Row 7: Barcode Strip & QC Verification (Tinggi 17mm)
  const bcH = 17;
  const bcY = dtrY + dtrH;
  const qcDividerX = tx + 33;
  doc.setFillColor(255, 255, 255);
  doc.rect(tx, bcY, tagWidth, bcH, 'F');
  doc.setDrawColor(50, 50, 50);
  doc.line(tx, bcY + bcH, tx + tagWidth, bcY + bcH);
  doc.line(qcDividerX, bcY, qcDividerX, bcY + bcH);

  // Sisi Kiri: Barcode dummy & label
  drawBarcode(doc, tx + 2, bcY + 2.5, 29, 8, dtrNo);

  // Sisi Kanan: QC Verified - Stamp HMSI-Field Quality Presisi & Rapi
  // Mencegah overflow teks dan error unicode checkmark
  doc.setTextColor(71, 85, 105);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(5);
  doc.text('QC VERIFIED:', qcDividerX + 2, bcY + 3.8);

  // Gambar Kotak Checkbox Vektor Resmi
  doc.setDrawColor(37, 99, 235); // Blue-600
  doc.setFillColor(239, 246, 255); // Blue-50
  doc.roundedRect(qcDividerX + 2, bcY + 5.2, 3.2, 3.2, 0.4, 0.4, 'FD');

  // Gambar Garis Centang Vektor di Dalam Kotak (Bukan unicode font)
  doc.setDrawColor(29, 78, 216);
  doc.setLineWidth(0.4);
  doc.line(qcDividerX + 2.7, bcY + 6.8, qcDividerX + 3.4, bcY + 7.6);
  doc.line(qcDividerX + 3.4, bcY + 7.6, qcDividerX + 4.6, bcY + 6.0);

  // Teks "HMSI-Field Quality" dengan font helvetica bold rapi tanpa terpotong
  doc.setTextColor(15, 23, 42);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(5.2);
  doc.text('HMSI-Field Quality', qcDividerX + 6.2, bcY + 7.6);

  // Baris Info Checker / Status
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(4.6);
  const checkerName = record.quality_checked_by ? String(record.quality_checked_by).trim() : '';
  if (checkerName && !checkerName.toLowerCase().includes('hmsi')) {
    doc.setTextColor(30, 41, 59);
    doc.text(checkerName.substring(0, 18), qcDividerX + 2, bcY + 11.4);
  } else {
    doc.setTextColor(71, 85, 105);
    doc.text('Status: Verified OK', qcDividerX + 2, bcY + 11.4);
  }

  // Baris Tanggal QC
  doc.setTextColor(100, 116, 139);
  doc.setFontSize(4.5);
  const qcDate = formatDateTag(
    record.quality_checked_date || record.repair_date || record.request_date
  );
  doc.text(`Tgl: ${qcDate}`, qcDividerX + 2, bcY + 14.6);

  // 10. Row 8: Panduan Pengiriman (Tinggi 12mm)
  const guideH = 12;
  const guideY = bcY + bcH;
  doc.setFillColor(248, 250, 252);
  doc.rect(tx, guideY, tagWidth, guideH, 'F');
  doc.setDrawColor(50, 50, 50);
  doc.line(tx, guideY + guideH, tx + tagWidth, guideY + guideH);

  doc.setTextColor(71, 85, 105);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(4.8);
  doc.text('INSTRUKSI PENGIRIMAN:', tx + 2, guideY + 3.8);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(4.5);
  doc.setTextColor(100, 116, 139);
  doc.text('Gantungkan/tempelkan tag ini pada fisik', tx + 2, guideY + 7.2);
  doc.text('part OFP sebelum diserahkan ke Pabrik HMMI.', tx + 2, guideY + 10.2);

  // 11. Footer Strip: Dark Navy (Sisa tinggi hingga pas 130mm)
  const footY = guideY + guideH;
  const footH = tagHeight - (footY - ty);
  doc.setFillColor(15, 23, 42);
  doc.rect(tx, footY, tagWidth, footH, 'F');

  doc.setTextColor(241, 245, 249);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(5);
  doc.text('PT HINO MOTORS SALES INDONESIA', tx + 2, footY + 4);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(4.8);
  doc.setTextColor(254, 202, 202);
  doc.text('HMSI -> HMMI', tx + tagWidth - 2, footY + 4, { align: 'right' });
}

/**
 * Membuat Dokumen PDF Siap Cetak (A4 Portrait, 3 Kolom per Baris, 6 Tag per Lembar)
 * Menggunakan Vector Engine jsPDF yang 100% cepat, tajam, dan bebas error rendering.
 */
export function generateTagsPdf(records: OpfRecord[]): { blob: Blob; filename: string } {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
    compress: true,
  });

  const TAGS_PER_PAGE = 6;
  const totalPages = Math.max(1, Math.ceil(records.length / TAGS_PER_PAGE));

  // Layout Grid Parameter (A4: 210mm x 297mm)
  const startX = 8;
  const startY = 16;
  const colGap = 4;
  const rowGap = 5;
  const tagWidth = 62.6; // (210 - 16 - 8) / 3 = 62.6mm
  const tagHeight = 130; // 2 baris x 130mm = 260mm + 5mm = 265mm. Sisa margin bawah 16mm.

  for (let pageIdx = 0; pageIdx < totalPages; pageIdx++) {
    if (pageIdx > 0) {
      doc.addPage('a4', 'portrait');
    }

    const pageRecords = records.slice(pageIdx * TAGS_PER_PAGE, (pageIdx + 1) * TAGS_PER_PAGE);

    // Page Header
    doc.setFillColor(197, 34, 31);
    doc.rect(startX, 6, 12, 5, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7);
    doc.text('HINO', startX + 1.8, 9.5);

    doc.setTextColor(15, 23, 42);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.text('ORIGINAL FAILURE PART TAG - HMSI-Field Quality', startX + 15, 9.8);

    doc.setFont('courier', 'normal');
    doc.setFontSize(6.5);
    doc.setTextColor(100, 116, 139);
    const dateStr = new Date().toLocaleDateString('id-ID');
    doc.text(
      `Lembar ${pageIdx + 1} dari ${totalPages}  |  Total ${records.length} Tag  |  ${dateStr}`,
      202,
      9.8,
      { align: 'right' }
    );

    // Header divider line
    doc.setDrawColor(203, 213, 225);
    doc.setLineWidth(0.3);
    doc.line(startX, 13, 202, 13);

    // Gambar masing-masing tag dalam grid 3 kolom x 2 baris
    pageRecords.forEach((record, idx) => {
      const col = idx % 3;
      const row = Math.floor(idx / 3);
      const tx = startX + col * (tagWidth + colGap);
      const ty = startY + row * (tagHeight + rowGap);
      drawSingleTag(doc, tx, ty, tagWidth, tagHeight, record);
    });

    // Page Footer
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(5.5);
    doc.setTextColor(148, 163, 184);
    doc.text('PT Hino Motors Sales Indonesia - HMSI-Field Quality -> Pabrik HMMI', startX, 292);
    doc.text(`Dicetak dari Hino OFP Monitoring System`, 202, 292, { align: 'right' });
  }

  const timestamp = new Date().toISOString().slice(0, 10);
  const filename = `Tag-Original-Failure-Part-HMSI_${timestamp}_${records.length}-tag.pdf`;
  const blob = doc.output('blob');

  return { blob, filename };
}

/**
 * Trigger download file PDF langsung ke komputer / browser pengguna
 */
export function downloadTagsPdf(records: OpfRecord[]): { filename: string; blobUrl: string } {
  const { blob, filename } = generateTagsPdf(records);
  const blobUrl = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = blobUrl;
  link.download = filename;
  link.style.display = 'none';
  document.body.appendChild(link);
  link.click();

  // Bersihkan link setelah download terpicu
  setTimeout(() => {
    if (link.parentNode) {
      link.parentNode.removeChild(link);
    }
  }, 1000);

  return { filename, blobUrl };
}
