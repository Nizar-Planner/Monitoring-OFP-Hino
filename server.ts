import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import dotenv from 'dotenv';
import multer from 'multer';
import {
  getDb,
  getAllOpfRecords,
  getOpfById,
  insertOrUpdateOpf,
  updateAreaReceipt,
  updateQualityInspection,
  updateDeliveryToHmmi,
  deleteOpfRecord,
  getOpfStats,
  OpfRecord
} from './src/server/db.js';
import { parseAndImportExcel, generateExcelTemplate } from './src/server/excel.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const isProduction = process.env.NODE_ENV === 'production';
const PORT = !isProduction ? 3000 : (Number(process.env.PORT) || (process.env.SPACE_ID ? 7860 : 3000));

// Increase payload limit for base64 photo uploads from mobile camera
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Multer in-memory storage for Excel uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 25 * 1024 * 1024 }, // 25MB max Excel size
});

// ==========================================
// API Endpoints
// ==========================================

// 1. Health check
app.get('/api/health', (_req, res) => {
  res.json({
    status: 'online',
    app: 'Hino OPF Monitoring & Tracking Dashboard (HMSI -> HMMI/HML)',
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
  });
});

// 2. Get OPF Records with search & status filters
app.get('/api/opf', async (req, res) => {
  try {
    const search = typeof req.query.search === 'string' ? req.query.search : '';
    const status = typeof req.query.status === 'string' ? req.query.status : 'all';
    const overdueOnly = req.query.overdue === 'true';

    const records = await getAllOpfRecords(search, status, overdueOnly);
    res.json({ success: true, data: records, count: records.length });
  } catch (error) {
    console.error('Error fetching OPF records:', error);
    res.status(500).json({ success: false, error: 'Gagal mengambil data OPF.' });
  }
});

// 3. Get single OPF record by ID
app.get('/api/opf/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    const record = await getOpfById(id);
    if (!record) {
      return res.status(404).json({ success: false, error: 'Data tidak ditemukan.' });
    }
    res.json({ success: true, data: record });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Gagal memuat rincian OPF.' });
  }
});

// 4. Excel File Upload (.xlsx / .xls)
app.post('/api/upload-excel', upload.single('file'), async (req, res) => {
  try {
    if (!req.file || !req.file.buffer) {
      return res.status(400).json({ success: false, error: 'Pilih file Excel (.xlsx atau .xls) untuk di-upload.' });
    }

    console.log(`[EXCEL] Menerima file upload: ${req.file.originalname} (${req.file.size} bytes)`);
    const result = await parseAndImportExcel(req.file.buffer);

    res.json({
      success: true,
      message: `Berhasil memproses ${result.totalRowsProcessed} baris Excel (${result.recordsInserted} baru, ${result.recordsUpdated} diperbarui).`,
      data: result,
    });
  } catch (error: any) {
    console.error('[EXCEL] Error parsing file:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Gagal membaca file Excel. Pastikan format file sesuai.',
    });
  }
});

// 5. Download Standard Excel Template
app.get('/api/download-template', (_req, res) => {
  try {
    const buffer = generateExcelTemplate();
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename="Template_Monitoring_OPF_HMSI.xlsx"');
    res.send(buffer);
  } catch (error) {
    console.error('Error generating template:', error);
    res.status(500).send('Gagal membuat template Excel.');
  }
});

// 6. Action Tim Area: Update physical receipt at HMSI with Photo Proof
app.put('/api/opf/:id/area-receipt', async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    const { area_received_by, area_photo, area_notes, received_date } = req.body;

    if (!area_received_by) {
      return res.status(400).json({ success: false, error: 'Nama penerima Tim Area wajib diisi.' });
    }

    await updateAreaReceipt(id, {
      area_received_by,
      area_photo,
      area_notes,
      received_date,
    });

    const updated = await getOpfById(id);
    res.json({
      success: true,
      message: 'Part OPF berhasil dikonfirmasi diterima di HMSI oleh Tim Area. Notifikasi diteruskan ke Tim Quality.',
      data: updated,
    });
  } catch (error: any) {
    console.error('Error updating area receipt:', error);
    res.status(500).json({ success: false, error: error.message || 'Gagal menyimpan penerimaan Tim Area.' });
  }
});

// 7. Action Tim Quality: Inspection & Quality Photo Proof
app.put('/api/opf/:id/quality-check', async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    const { quality_checked_by, quality_photo, quality_notes, quality_date } = req.body;

    if (!quality_checked_by) {
      return res.status(400).json({ success: false, error: 'Nama personil Tim Quality wajib diisi.' });
    }

    await updateQualityInspection(id, {
      quality_checked_by,
      quality_photo,
      quality_notes,
      quality_date,
    });

    const updated = await getOpfById(id);
    res.json({
      success: true,
      message: 'Verifikasi kondisi fisik part oleh Tim Quality berhasil disimpan.',
      data: updated,
    });
  } catch (error: any) {
    console.error('Error updating quality inspection:', error);
    res.status(500).json({ success: false, error: error.message || 'Gagal menyimpan verifikasi Tim Quality.' });
  }
});

// 8. Action Tim Quality: Update delivery to HMMI/HML (Supplier)
app.put('/api/opf/:id/ship-hmmi', async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    const { shipped_date, shipping_resi, shipping_carrier } = req.body;

    if (!shipping_resi) {
      return res.status(400).json({ success: false, error: 'Nomor Resi / Surat Jalan pengiriman ke HMMI/HML wajib diisi.' });
    }

    await updateDeliveryToHmmi(id, {
      shipped_date: shipped_date || new Date().toISOString().split('T')[0],
      shipping_resi,
      shipping_carrier,
    });

    const updated = await getOpfById(id);
    res.json({
      success: true,
      message: 'Status berhasil diperbarui: Part OPF telah dikirimkan ke HMMI / HML (Delivered).',
      data: updated,
    });
  } catch (error: any) {
    console.error('Error updating shipping to HMMI:', error);
    res.status(500).json({ success: false, error: error.message || 'Gagal menyimpan pengiriman ke HMMI/HML.' });
  }
});

// 9. Manual Create or Update Record
app.post('/api/opf', async (req, res) => {
  try {
    const record: OpfRecord = req.body;
    if (!record.dtr_number || !record.part_name || !record.chassis_number) {
      return res.status(400).json({
        success: false,
        error: 'Nomor DTR, Part Name, dan No. Chassis wajib diisi.',
      });
    }

    const result = await insertOrUpdateOpf(record);
    res.json({
      success: true,
      isNew: result.isNew,
      message: result.isNew ? 'Data OPF baru berhasil ditambahkan.' : 'Data OPF berhasil diperbarui.',
      id: result.id,
    });
  } catch (error) {
    console.error('Error saving OPF record:', error);
    res.status(500).json({ success: false, error: 'Gagal menyimpan data OPF.' });
  }
});

// 10. Delete OPF Record
app.delete('/api/opf/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) {
      return res.status(400).json({ success: false, error: 'ID tidak valid.' });
    }
    await deleteOpfRecord(id);
    res.json({ success: true, message: 'Data OPF berhasil dihapus.' });
  } catch (error) {
    console.error('Error deleting OPF record:', error);
    res.status(500).json({ success: false, error: 'Gagal menghapus data OPF.' });
  }
});

// 11. Statistics & Top 5 Overdue (> 30 Hari) Parts
app.get('/api/stats', async (_req, res) => {
  try {
    const stats = await getOpfStats();
    res.json({ success: true, data: stats });
  } catch (error) {
    console.error('Error fetching stats:', error);
    res.status(500).json({ success: false, error: 'Gagal mengambil statistik data.' });
  }
});

// 12. Export OPF Data as CSV
app.get('/api/export/csv', async (_req, res) => {
  try {
    const records = await getAllOpfRecords();
    const headers = [
      'ID',
      'Nomor DTR',
      'Part Name',
      'Quantity',
      'Model',
      'No. Chassis',
      'No. Engine',
      'Mileage (km)',
      'Dealer',
      'Nomor QPI',
      'Judgement QPI',
      'Tanggal DTR',
      'Status Alur',
      'Hari Berjalan',
      'Overdue > 30 Hari',
      'Tgl Diterima Area HMSI',
      'Penerima Area',
      'Catatan Area',
      'Tgl Cek Quality',
      'Pengecek Quality',
      'Catatan Quality',
      'Tgl Kirim HMMI/HML',
      'No. Resi/Surat Jalan',
      'Ekspedisi/Pengirim'
    ];

    const escapeCsv = (val: unknown) => {
      const str = String(val ?? '').replace(/"/g, '""');
      return `"${str}"`;
    };

    const csvRows = [headers.join(',')];
    for (const r of records) {
      csvRows.push([
        r.id,
        escapeCsv(r.dtr_number),
        escapeCsv(r.part_name),
        r.quantity,
        escapeCsv(r.model),
        escapeCsv(r.chassis_number),
        escapeCsv(r.engine_number),
        r.mileage,
        escapeCsv(r.dealer_name),
        escapeCsv(r.qpi_number),
        escapeCsv(r.judgement_qpi),
        escapeCsv(r.request_date),
        escapeCsv(r.tracking_status),
        r.days_elapsed,
        r.is_overdue ? 'YA (OVERDUE)' : 'TIDAK',
        escapeCsv(r.area_received_date || ''),
        escapeCsv(r.area_received_by || ''),
        escapeCsv(r.area_notes || ''),
        escapeCsv(r.quality_checked_date || ''),
        escapeCsv(r.quality_checked_by || ''),
        escapeCsv(r.quality_notes || ''),
        escapeCsv(r.shipped_date || ''),
        escapeCsv(r.shipping_resi || ''),
        escapeCsv(r.shipping_carrier || '')
      ].join(','));
    }

    const csvContent = csvRows.join('\r\n');
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="hino_opf_monitoring_hmsi_${new Date().toISOString().split('T')[0]}.csv"`);
    res.send(csvContent);
  } catch (error) {
    console.error('Error exporting CSV:', error);
    res.status(500).send('Gagal mengekspor CSV');
  }
});

// Setup Frontend Serving
async function startServer() {
  await getDb();
  console.log('[DATABASE] SQLite berhasil dimuat.');

  if (!isProduction) {
    const { createServer } = await import('vite');
    const vite = await createServer({
      server: {
        middlewareMode: true,
        hmr: false,
      },
      appType: 'spa',
    });
    app.use(vite.middlewares);
    app.use('*', async (req, res, next) => {
      const url = req.originalUrl;
      if (url.startsWith('/api')) return next();
      try {
        let template = fs.readFileSync(path.resolve(__dirname, 'index.html'), 'utf-8');
        template = await vite.transformIndexHtml(url, template);
        res.status(200).set({ 'Content-Type': 'text/html' }).end(template);
      } catch (e) {
        next(e);
      }
    });
    console.log('[DEV] Vite dev middleware terhubung ke Express.');
  } else {
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
    console.log('[PROD] Serving static production build dari dist.');
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`=============================================================`);
    console.log(`🚚 Hino OPF Tracker (HMSI -> HMMI/HML) aktif di http://0.0.0.0:${PORT}`);
    console.log(`=============================================================`);
  });
}

startServer().catch((err) => {
  console.error('Fatal server startup error:', err);
  process.exit(1);
});
