import initSqlJs, { Database, SqlValue } from 'sql.js';
import fs from 'fs';
import path from 'path';
import { OpfRecord, StatsData, TrackingStatus, ExcelImportResult } from '../types.js';
import {
  getSupabaseClient,
  isSupabaseConfigured,
  uploadPhotoToSupabase,
  SUPABASE_STORAGE_BUCKET
} from '../lib/supabase.js';

export type { OpfRecord, StatsData, TrackingStatus, ExcelImportResult };

let dbInstance: Database | null = null;
const DATA_DIR = path.resolve(process.cwd(), 'data');
const DB_PATH = path.join(DATA_DIR, 'opf_database.sqlite');

/**
 * Indicates whether Supabase PostgreSQL is actively being used
 */
export function isUsingSupabase(): boolean {
  return isSupabaseConfigured() && getSupabaseClient() !== null;
}

/**
 * Calculates lead time elapsed in days from request date to today or shipped date
 */
export function calculateDaysElapsed(requestDateStr: string, shippedDateStr?: string | null): number {
  if (!requestDateStr) return 0;
  const start = new Date(requestDateStr).getTime();
  if (isNaN(start)) return 0;

  const end = shippedDateStr ? new Date(shippedDateStr).getTime() : Date.now();
  if (isNaN(end)) return 0;

  const diffMs = Math.max(0, end - start);
  return Math.floor(diffMs / (1000 * 60 * 60 * 24));
}

// ============================================================================
// SQLite In-Memory / Local Storage Fallback Engine
// (Ensures zero-downtime when Supabase credentials are pending or offline)
// ============================================================================

export async function getDb(): Promise<Database> {
  if (dbInstance) {
    return dbInstance;
  }

  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }

  const SQL = await initSqlJs();

  if (fs.existsSync(DB_PATH)) {
    try {
      const fileBuffer = fs.readFileSync(DB_PATH);
      dbInstance = new SQL.Database(fileBuffer);
    } catch (err) {
      console.warn('Existing database file could not be read. Initializing new database.', err);
      dbInstance = new SQL.Database();
    }
  } else {
    dbInstance = new SQL.Database();
  }

  createLocalTables(dbInstance);
  seedInitialData(dbInstance);
  saveDb();
  return dbInstance;
}

export function saveDb(): void {
  if (!dbInstance) return;
  try {
    const data = dbInstance.export();
    const buffer = Buffer.from(data);
    fs.writeFileSync(DB_PATH, buffer);
  } catch (err) {
    console.error('Failed to save SQLite database to disk:', err);
  }
}

function createLocalTables(db: Database): void {
  db.run(`
    CREATE TABLE IF NOT EXISTS opf_records (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      dtr_number TEXT NOT NULL,
      part_name TEXT NOT NULL,
      part_number TEXT DEFAULT '',
      quantity INTEGER NOT NULL DEFAULT 1,
      model TEXT NOT NULL,
      chassis_number TEXT NOT NULL,
      engine_number TEXT NOT NULL,
      mileage INTEGER NOT NULL DEFAULT 0,
      dealer_name TEXT NOT NULL,
      qpi_number TEXT DEFAULT '',
      judgement_qpi TEXT DEFAULT '',
      judgement_date TEXT DEFAULT NULL,
      request_date TEXT NOT NULL,
      tracking_status TEXT NOT NULL DEFAULT 'Waiting OFP',
      
      area_received_date TEXT DEFAULT NULL,
      area_received_by TEXT DEFAULT '',
      area_photo TEXT DEFAULT '',
      area_notes TEXT DEFAULT '',

      quality_checked_date TEXT DEFAULT NULL,
      quality_checked_by TEXT DEFAULT '',
      quality_photo TEXT DEFAULT '',
      quality_notes TEXT DEFAULT '',

      shipped_date TEXT DEFAULT NULL,
      shipping_resi TEXT DEFAULT '',
      shipping_carrier TEXT DEFAULT '',

      days_elapsed INTEGER DEFAULT 0,
      is_overdue INTEGER DEFAULT 0,

      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
  `);

  try {
    db.run("ALTER TABLE opf_records ADD COLUMN part_number TEXT DEFAULT ''");
  } catch (_e) {}
  try {
    db.run("ALTER TABLE opf_records ADD COLUMN judgement_date TEXT DEFAULT NULL");
  } catch (_e) {}

  db.run(`CREATE INDEX IF NOT EXISTS idx_dtr_part ON opf_records (dtr_number, part_name);`);
  db.run(`CREATE INDEX IF NOT EXISTS idx_dtr_part_no ON opf_records (dtr_number, part_number);`);
}

function seedInitialData(db: Database): void {
  const result = db.exec('SELECT COUNT(*) as count FROM opf_records');
  const count = (result.length > 0 && result[0].values.length > 0) ? (result[0].values[0][0] as number) : 0;

  if (count > 0) return;

  const sampleRecords: Array<Omit<OpfRecord, 'id' | 'days_elapsed' | 'is_overdue'>> = [
    {
      dtr_number: 'DTR-2026-MDN-0018',
      part_name: 'Turbocharger Assembly',
      part_number: '24100-33120',
      quantity: 1,
      model: 'Hino 500 FM 260 JD (6x4 Dump)',
      chassis_number: 'MHFJ1JGBMK009182',
      engine_number: 'J08E-WE19844',
      mileage: 61300,
      dealer_name: 'PT Indomobil Prima Niaga - Medan',
      qpi_number: 'QPI-HMSI-26-0312',
      judgement_qpi: 'Under Investigation',
      request_date: '2026-09-08',
      tracking_status: 'Waiting OFP',
      area_notes: 'Part belum dikirimkan dari gudang dealer Medan, sudah di-follow up berkali-kali.',
    },
    {
      dtr_number: 'DTR-2026-BPP-0021',
      part_name: 'Common Rail High Pressure Pump',
      part_number: '22100-E0020',
      quantity: 1,
      model: 'Hino 500 FM 350 TH (Tractor Head)',
      chassis_number: 'MHFJ1JTHMK001092',
      engine_number: 'P11C-VP10922',
      mileage: 72100,
      dealer_name: 'PT Hibaindah Armada Motor - Balikpapan',
      qpi_number: 'QPI-HMSI-26-0344',
      judgement_qpi: 'Waiting Physical Sample',
      request_date: '2026-09-12',
      tracking_status: 'Waiting OFP',
      area_notes: 'Dealer terkendala ekspedisi laut dari Kalimantan.',
    },
    {
      dtr_number: 'DTR-2026-SBY-0094',
      part_name: 'Leaf Spring Rear No. 1',
      part_number: '48201-3820',
      quantity: 2,
      model: 'Hino 500 FL 260 JW (6x2 Cargo)',
      chassis_number: 'MHFJ1JGCMK018432',
      engine_number: 'J08E-WD31089',
      mileage: 48900,
      dealer_name: 'PT Indomobil Prima Niaga - Surabaya',
      qpi_number: 'QPI-HMSI-26-0388',
      judgement_qpi: 'Metallurgical Review',
      request_date: '2026-09-15',
      tracking_status: 'Not yet shipped',
      area_received_date: '2026-10-02',
      area_received_by: 'Budi Santoso (Tim Area Jatim)',
      area_photo: '/src/assets/images/hino_engine_part_1792158559395.jpg',
      area_notes: 'Part per daun patah sudah diterima di HMSI Jakarta, menunggu Tim Quality kirim ke HMMI.',
      quality_checked_date: '2026-10-06',
      quality_checked_by: 'Andi Wijaya (QA HMSI)',
      quality_photo: '/src/assets/images/hino_engine_part_1792158559395.jpg',
      quality_notes: 'Kondisi part bersih, tag DTR nomor lengkap terpasang.',
    },
    {
      dtr_number: 'DTR-2026-JKT-0041',
      part_name: 'Clutch Booster Assembly',
      part_number: '31470-1380',
      quantity: 1,
      model: 'Hino 500 FM 260 JD (6x4)',
      chassis_number: 'MHFJ1JGBMK002491',
      engine_number: 'J08E-WD28412',
      mileage: 38200,
      dealer_name: 'PT Duta Cemerlang Motors - Jakarta Barat',
      qpi_number: 'QPI-HMSI-26-0410',
      judgement_qpi: 'Leakage Analysis',
      request_date: '2026-09-16',
      tracking_status: 'Waiting OFP',
      area_notes: 'Dealer sedang membongkar unit pengganti.',
    },
    {
      dtr_number: 'DTR-2026-BDG-0072',
      part_name: 'King Pin & Bushing Set',
      part_number: '04431-36010',
      quantity: 2,
      model: 'Hino Dutro 300 130 HD (4x2)',
      chassis_number: 'MHFW1JGAMK011044',
      engine_number: 'W04D-TN99214',
      mileage: 29400,
      dealer_name: 'PT Maya Graha Indah - Bandung',
      qpi_number: 'QPI-HMSI-26-0429',
      judgement_qpi: 'Knuckle Clearance Check',
      request_date: '2026-09-18',
      tracking_status: 'Waiting OFP',
      area_notes: 'Dealer menginformasikan part siap diambil oleh tim ekspedisi.',
    },
    {
      dtr_number: 'DTR-2026-SMG-0033',
      part_name: 'Water Pump Assembly',
      part_number: '16100-78120',
      quantity: 1,
      model: 'Hino Dutro 300 110 SDB (Microbus)',
      chassis_number: 'MHFW1JSBMK008122',
      engine_number: 'W04D-TM11094',
      mileage: 34100,
      dealer_name: 'PT Duta Cemerlang Motors - Semarang',
      qpi_number: 'QPI-HMSI-26-0489',
      judgement_qpi: 'Seal Mechanical Check',
      request_date: '2026-10-04',
      tracking_status: 'Not yet shipped',
      area_received_date: '2026-10-12',
      area_received_by: 'Eko Prasetyo (Tim Area Jateng)',
      area_photo: '/src/assets/images/hino_engine_part_1792158559395.jpg',
      area_notes: 'Diterima di gudang transit HMSI Jakarta dalam packing kardus kayu aman.',
      quality_checked_date: null,
    },
    {
      dtr_number: 'DTR-2026-MKS-0056',
      part_name: 'Brake Chamber Rear Diaphragm',
      part_number: '44540-1080',
      quantity: 2,
      model: 'Hino Dutro 300 130 HD (4x2 Dump)',
      chassis_number: 'MHFW1JGAMK022091',
      engine_number: 'W04D-TN84910',
      mileage: 18400,
      dealer_name: 'PT Kumala Motor Sejahtera - Makassar',
      qpi_number: 'QPI-HMSI-26-0512',
      judgement_qpi: 'Approved Warranty',
      request_date: '2026-09-25',
      tracking_status: 'Delivered',
      area_received_date: '2026-10-02',
      area_received_by: 'Reza Fahlevi (Tim Area Sulsel)',
      area_photo: '/src/assets/images/hino_engine_part_1792158559395.jpg',
      quality_checked_date: '2026-10-04',
      quality_checked_by: 'Bambang Irawan (QA HMSI)',
      quality_photo: '/src/assets/images/hino_engine_part_1792158559395.jpg',
      shipped_date: '2026-10-08',
      shipping_resi: 'SJ-HMSI-HMMI-26-1044',
      shipping_carrier: 'Internal Shuttle Truck HMSI to Plant HMMI Purwakarta',
      quality_notes: 'Diserahkan langsung ke Tim QA Plant HMMI Kawasan Industri Kota Bukit Indah.',
    }
  ];

  for (const item of sampleRecords) {
    const days = calculateDaysElapsed(item.request_date, item.shipped_date);
    const overdue = (days > 30 && item.tracking_status !== 'Delivered') ? 1 : 0;

    db.run(
      `INSERT INTO opf_records 
      (dtr_number, part_name, part_number, quantity, model, chassis_number, engine_number, mileage, dealer_name, qpi_number, judgement_qpi, request_date, tracking_status, area_received_date, area_received_by, area_photo, area_notes, quality_checked_date, quality_checked_by, quality_photo, quality_notes, shipped_date, shipping_resi, shipping_carrier, days_elapsed, is_overdue) 
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        item.dtr_number,
        item.part_name,
        item.part_number || '',
        item.quantity,
        item.model,
        item.chassis_number,
        item.engine_number,
        item.mileage,
        item.dealer_name,
        item.qpi_number || '',
        item.judgement_qpi || '',
        item.request_date,
        item.tracking_status,
        item.area_received_date || null,
        item.area_received_by || '',
        item.area_photo || '',
        item.area_notes || '',
        item.quality_checked_date || null,
        item.quality_checked_by || '',
        item.quality_photo || '',
        item.quality_notes || '',
        item.shipped_date || null,
        item.shipping_resi || '',
        item.shipping_carrier || '',
        days,
        overdue
      ]
    );
  }
}

// ============================================================================
// Core Database Access Methods (Supabase PostgreSQL + SQLite Fallback)
// ============================================================================

/**
 * Fetch all OPF records with search and status filtering
 */
export async function getAllOpfRecords(query = '', statusFilter = 'all', overdueOnly = false): Promise<OpfRecord[]> {
  const supabase = getSupabaseClient();

  if (supabase) {
    try {
      let sbQuery = supabase.from('opf_records').select('*');

      if (statusFilter && statusFilter !== 'all') {
        sbQuery = sbQuery.eq('tracking_status', statusFilter);
      }

      if (query.trim()) {
        const q = `%${query.trim()}%`;
        sbQuery = sbQuery.or(
          `dtr_number.ilike.${q},part_name.ilike.${q},part_number.ilike.${q},model.ilike.${q},chassis_number.ilike.${q},engine_number.ilike.${q},dealer_name.ilike.${q},qpi_number.ilike.${q},judgement_qpi.ilike.${q}`
        );
      }

      sbQuery = sbQuery.order('created_at', { ascending: false });

      const { data, error } = await sbQuery;
      if (error) {
        console.warn('[SUPABASE] Query failed, falling back to local SQLite:', error.message);
      } else if (data) {
        const records: OpfRecord[] = data.map((row: any) => {
          const days = calculateDaysElapsed(row.request_date, row.shipped_date);
          const isOverdue = days > 30 && row.tracking_status !== 'Delivered' && row.tracking_status !== 'Sent to HMMI';
          return {
            ...row,
            id: Number(row.id),
            days_elapsed: days,
            is_overdue: isOverdue,
          };
        });

        let filtered = records;
        if (overdueOnly) {
          filtered = filtered.filter((r) => r.is_overdue);
        }

        // Sort: overdue first, then lead time descending, then id descending
        filtered.sort((a, b) => {
          if (a.is_overdue && !b.is_overdue) return -1;
          if (!a.is_overdue && b.is_overdue) return 1;
          return (b.days_elapsed || 0) - (a.days_elapsed || 0) || (b.id || 0) - (a.id || 0);
        });

        return filtered;
      }
    } catch (err) {
      console.error('[SUPABASE] Unexpected query error:', err);
    }
  }

  // Fallback to SQLite
  const db = await getDb();
  let sql = 'SELECT * FROM opf_records WHERE 1=1';
  const params: SqlValue[] = [];

  if (query.trim()) {
    const q = `%${query.trim()}%`;
    sql += ` AND (dtr_number LIKE ? 
             OR part_name LIKE ? 
             OR part_number LIKE ?
             OR model LIKE ? 
             OR chassis_number LIKE ? 
             OR engine_number LIKE ? 
             OR dealer_name LIKE ? 
             OR qpi_number LIKE ?
             OR judgement_qpi LIKE ?)`;
    params.push(q, q, q, q, q, q, q, q, q);
  }

  if (statusFilter && statusFilter !== 'all') {
    sql += ` AND tracking_status = ?`;
    params.push(statusFilter);
  }

  if (overdueOnly) {
    sql += ` AND is_overdue = 1`;
  }

  sql += ' ORDER BY is_overdue DESC, days_elapsed DESC, id DESC';

  const stmt = db.prepare(sql);
  if (params.length > 0) {
    stmt.bind(params);
  }

  const records: OpfRecord[] = [];
  while (stmt.step()) {
    const row = stmt.getAsObject() as unknown as OpfRecord;
    const days = calculateDaysElapsed(row.request_date, row.shipped_date);
    row.days_elapsed = days;
    row.is_overdue = days > 30 && row.tracking_status !== 'Delivered' && row.tracking_status !== 'Sent to HMMI';
    records.push(row);
  }
  stmt.free();

  return records;
}

/**
 * Fetch a single OPF record by its primary key ID
 */
export async function getOpfById(id: number): Promise<OpfRecord | null> {
  const supabase = getSupabaseClient();
  if (supabase) {
    try {
      const { data, error } = await supabase
        .from('opf_records')
        .select('*')
        .eq('id', id)
        .maybeSingle();

      if (!error && data) {
        const row = { ...data, id: Number(data.id) };
        row.days_elapsed = calculateDaysElapsed(row.request_date, row.shipped_date);
        row.is_overdue = row.days_elapsed > 30 && row.tracking_status !== 'Delivered' && row.tracking_status !== 'Sent to HMMI';
        return row;
      }
    } catch (err) {
      console.warn('[SUPABASE] Failed to getOpfById, fallback to SQLite:', err);
    }
  }

  const db = await getDb();
  const stmt = db.prepare('SELECT * FROM opf_records WHERE id = ?');
  stmt.bind([id]);
  if (stmt.step()) {
    const row = stmt.getAsObject() as unknown as OpfRecord;
    row.days_elapsed = calculateDaysElapsed(row.request_date, row.shipped_date);
    row.is_overdue = row.days_elapsed > 30 && row.tracking_status !== 'Delivered' && row.tracking_status !== 'Sent to HMMI';
    stmt.free();
    return row;
  }
  stmt.free();
  return null;
}

/**
 * Helper to upload base64 photos to Supabase Storage if present
 */
async function processPhotosForRecord(record: Partial<OpfRecord>): Promise<void> {
  if (record.area_photo && record.area_photo.startsWith('data:')) {
    const res = await uploadPhotoToSupabase(record.area_photo, `area_${record.dtr_number || 'part'}`);
    if (res.success && res.publicUrl) {
      record.area_photo = res.publicUrl;
    }
  }
  if (record.quality_photo && record.quality_photo.startsWith('data:')) {
    const res = await uploadPhotoToSupabase(record.quality_photo, `quality_${record.dtr_number || 'part'}`);
    if (res.success && res.publicUrl) {
      record.quality_photo = res.publicUrl;
    }
  }
}

/**
 * Inserts or updates an individual OPF item (Supabase PostgreSQL with fallback to SQLite)
 */
export async function insertOrUpdateOpf(record: OpfRecord): Promise<{ isNew: boolean; id: number }> {
  // If base64 photo is provided, upload to Supabase Storage Bucket first
  await processPhotosForRecord(record);

  const supabase = getSupabaseClient();
  const days = calculateDaysElapsed(record.request_date, record.shipped_date);
  const isOverdue = days > 30 && record.tracking_status !== 'Delivered' && record.tracking_status !== 'Sent to HMMI';
  const partNum = (record.part_number || '').trim();

  if (supabase) {
    try {
      // Find matching record by dtr_number AND (part_number OR part_name)
      let query = supabase
        .from('opf_records')
        .select('id, area_received_date, area_received_by, area_photo, area_notes, quality_checked_date, quality_checked_by, quality_photo, quality_notes, shipped_date, shipping_resi, shipping_carrier, tracking_status')
        .eq('dtr_number', record.dtr_number);

      if (partNum) {
        query = query.or(`part_number.eq.${partNum},part_name.eq.${record.part_name}`);
      } else {
        query = query.eq('part_name', record.part_name);
      }

      const { data: existingList } = await query.limit(1);
      const existing = existingList && existingList.length > 0 ? existingList[0] : null;

      if (existing && existing.id) {
        // Update existing record, preserving verification/photo if not supplied
        const updatePayload: any = {
          part_name: record.part_name,
          part_number: partNum,
          quantity: record.quantity || 1,
          model: record.model,
          chassis_number: record.chassis_number,
          engine_number: record.engine_number,
          mileage: record.mileage || 0,
          dealer_name: record.dealer_name,
          qpi_number: record.qpi_number || '',
          judgement_qpi: record.judgement_qpi || '',
          judgement_date: record.judgement_date || null,
          request_date: record.request_date,
          tracking_status: record.tracking_status || existing.tracking_status,
          days_elapsed: days,
          is_overdue: isOverdue,
          updated_at: new Date().toISOString(),
        };

        if (record.area_received_date !== undefined) updatePayload.area_received_date = record.area_received_date;
        if (record.area_received_by !== undefined) updatePayload.area_received_by = record.area_received_by;
        if (record.area_photo) updatePayload.area_photo = record.area_photo;
        if (record.area_notes !== undefined) updatePayload.area_notes = record.area_notes;

        if (record.quality_checked_date !== undefined) updatePayload.quality_checked_date = record.quality_checked_date;
        if (record.quality_checked_by !== undefined) updatePayload.quality_checked_by = record.quality_checked_by;
        if (record.quality_photo) updatePayload.quality_photo = record.quality_photo;
        if (record.quality_notes !== undefined) updatePayload.quality_notes = record.quality_notes;

        if (record.shipped_date !== undefined) updatePayload.shipped_date = record.shipped_date;
        if (record.shipping_resi !== undefined) updatePayload.shipping_resi = record.shipping_resi;
        if (record.shipping_carrier !== undefined) updatePayload.shipping_carrier = record.shipping_carrier;

        const { error: updateError } = await supabase
          .from('opf_records')
          .update(updatePayload)
          .eq('id', existing.id);

        if (updateError) {
          throw updateError;
        }

        return { isNew: false, id: Number(existing.id) };
      } else {
        // Insert new record
        const insertPayload: any = {
          dtr_number: record.dtr_number,
          part_name: record.part_name,
          part_number: partNum,
          quantity: record.quantity || 1,
          model: record.model,
          chassis_number: record.chassis_number,
          engine_number: record.engine_number,
          mileage: record.mileage || 0,
          dealer_name: record.dealer_name,
          qpi_number: record.qpi_number || '',
          judgement_qpi: record.judgement_qpi || '',
          judgement_date: record.judgement_date || null,
          request_date: record.request_date || new Date().toISOString().split('T')[0],
          tracking_status: record.tracking_status || 'Waiting OFP',
          area_received_date: record.area_received_date || null,
          area_received_by: record.area_received_by || '',
          area_photo: record.area_photo || '',
          area_notes: record.area_notes || '',
          quality_checked_date: record.quality_checked_date || null,
          quality_checked_by: record.quality_checked_by || '',
          quality_photo: record.quality_photo || '',
          quality_notes: record.quality_notes || '',
          shipped_date: record.shipped_date || null,
          shipping_resi: record.shipping_resi || '',
          shipping_carrier: record.shipping_carrier || '',
          days_elapsed: days,
          is_overdue: isOverdue,
        };

        const { data: inserted, error: insertError } = await supabase
          .from('opf_records')
          .insert(insertPayload)
          .select('id')
          .single();

        if (insertError) {
          throw insertError;
        }

        return { isNew: true, id: Number(inserted.id) };
      }
    } catch (err: any) {
      console.warn('[SUPABASE] insertOrUpdateOpf error, fallback to SQLite:', err.message);
    }
  }

  // SQLite Fallback
  const db = await getDb();
  const res = insertOrUpdateOpfInternal(db, record);
  saveDb();
  return res;
}

/**
 * Internal synchronous insert or update for SQLite
 */
function insertOrUpdateOpfInternal(db: Database, record: OpfRecord): { isNew: boolean; id: number } {
  const days = calculateDaysElapsed(record.request_date, record.shipped_date);
  const isOverdue = (days > 30 && record.tracking_status !== 'Delivered' && record.tracking_status !== 'Sent to HMMI') ? 1 : 0;
  const partNum = (record.part_number || '').trim();

  let checkStmt;
  if (partNum) {
    checkStmt = db.prepare(
      'SELECT id, area_received_date, area_received_by, area_photo, area_notes, quality_checked_date, quality_checked_by, quality_photo, quality_notes, shipped_date, shipping_resi, shipping_carrier, tracking_status FROM opf_records WHERE dtr_number = ? AND (part_number = ? OR part_name = ?)'
    );
    checkStmt.bind([record.dtr_number, partNum, record.part_name]);
  } else {
    checkStmt = db.prepare(
      'SELECT id, area_received_date, area_received_by, area_photo, area_notes, quality_checked_date, quality_checked_by, quality_photo, quality_notes, shipped_date, shipping_resi, shipping_carrier, tracking_status FROM opf_records WHERE dtr_number = ? AND part_name = ?'
    );
    checkStmt.bind([record.dtr_number, record.part_name]);
  }
  const exists = checkStmt.step();

  let existing: any = null;
  if (exists) {
    existing = checkStmt.getAsObject();
  }
  checkStmt.free();

  if (existing && existing.id) {
    const status = record.tracking_status || existing.tracking_status;
    const areaDate = record.area_received_date !== undefined ? record.area_received_date : existing.area_received_date;
    const areaBy = record.area_received_by !== undefined ? record.area_received_by : existing.area_received_by;
    const areaPhoto = record.area_photo !== undefined ? record.area_photo : existing.area_photo;
    const areaNotes = record.area_notes !== undefined ? record.area_notes : existing.area_notes;

    const qualityDate = record.quality_checked_date !== undefined ? record.quality_checked_date : existing.quality_checked_date;
    const qualityBy = record.quality_checked_by !== undefined ? record.quality_checked_by : existing.quality_checked_by;
    const qualityPhoto = record.quality_photo !== undefined ? record.quality_photo : existing.quality_photo;
    const qualityNotes = record.quality_notes !== undefined ? record.quality_notes : existing.quality_notes;

    const shippedDate = record.shipped_date !== undefined ? record.shipped_date : existing.shipped_date;
    const shippingResi = record.shipping_resi !== undefined ? record.shipping_resi : existing.shipping_resi;
    const shippingCarrier = record.shipping_carrier !== undefined ? record.shipping_carrier : existing.shipping_carrier;

    db.run(
      `UPDATE opf_records 
       SET part_name = ?, part_number = ?, quantity = ?, model = ?, chassis_number = ?, engine_number = ?, 
           mileage = ?, dealer_name = ?, qpi_number = ?, judgement_qpi = ?, judgement_date = ?,
           request_date = ?, tracking_status = ?,
           area_received_date = ?, area_received_by = ?, area_photo = ?, area_notes = ?,
           quality_checked_date = ?, quality_checked_by = ?, quality_photo = ?, quality_notes = ?,
           shipped_date = ?, shipping_resi = ?, shipping_carrier = ?,
           days_elapsed = ?, is_overdue = ?, updated_at = datetime('now')
       WHERE id = ?`,
      [
        record.part_name,
        partNum,
        record.quantity || 1,
        record.model,
        record.chassis_number,
        record.engine_number,
        record.mileage,
        record.dealer_name,
        record.qpi_number || '',
        record.judgement_qpi || '',
        record.judgement_date || null,
        record.request_date,
        status,
        areaDate,
        areaBy,
        areaPhoto,
        areaNotes,
        qualityDate,
        qualityBy,
        qualityPhoto,
        qualityNotes,
        shippedDate,
        shippingResi,
        shippingCarrier,
        days,
        isOverdue,
        existing.id
      ]
    );
    return { isNew: false, id: Number(existing.id) };
  } else {
    db.run(
      `INSERT INTO opf_records 
       (dtr_number, part_name, part_number, quantity, model, chassis_number, engine_number, mileage, dealer_name, qpi_number, judgement_qpi, judgement_date, request_date, tracking_status, area_received_date, area_received_by, area_photo, area_notes, quality_checked_date, quality_checked_by, quality_photo, quality_notes, shipped_date, shipping_resi, shipping_carrier, days_elapsed, is_overdue)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        record.dtr_number,
        record.part_name,
        partNum,
        record.quantity || 1,
        record.model,
        record.chassis_number,
        record.engine_number,
        record.mileage,
        record.dealer_name,
        record.qpi_number || '',
        record.judgement_qpi || '',
        record.judgement_date || null,
        record.request_date || new Date().toISOString().split('T')[0],
        record.tracking_status || 'Waiting OFP',
        record.area_received_date || null,
        record.area_received_by || '',
        record.area_photo || '',
        record.area_notes || '',
        record.quality_checked_date || null,
        record.quality_checked_by || '',
        record.quality_photo || '',
        record.quality_notes || '',
        record.shipped_date || null,
        record.shipping_resi || '',
        record.shipping_carrier || '',
        days,
        isOverdue
      ]
    );
    const lastIdRes = db.exec('SELECT last_insert_rowid() as id');
    const newId = Number(lastIdRes[0].values[0][0]);
    return { isNew: true, id: newId };
  }
}

/**
 * Bulk insert or update OPF records directly to Supabase PostgreSQL or SQLite fallback
 */
export async function bulkInsertOrUpdateOpf(records: OpfRecord[]): Promise<ExcelImportResult> {
  const supabase = getSupabaseClient();
  let totalRowsProcessed = 0;
  let recordsInserted = 0;
  let recordsUpdated = 0;
  const errors: string[] = [];

  if (supabase) {
    try {
      console.log(`[SUPABASE] Executing bulk upsert of ${records.length} records...`);
      for (let i = 0; i < records.length; i++) {
        const record = records[i];
        try {
          const res = await insertOrUpdateOpf(record);
          totalRowsProcessed++;
          if (res.isNew) recordsInserted++;
          else recordsUpdated++;
        } catch (err: any) {
          errors.push(`Baris ${i + 1} (${record.dtr_number || 'N/A'}): ${err.message || 'Gagal menyimpan ke Supabase'}`);
        }
      }

      return {
        totalRowsProcessed,
        recordsInserted,
        recordsUpdated,
        errors,
      };
    } catch (err: any) {
      console.warn('[SUPABASE] Bulk upsert error, falling back to SQLite:', err.message);
    }
  }

  // SQLite Transaction Fallback
  const db = await getDb();
  totalRowsProcessed = 0;
  recordsInserted = 0;
  recordsUpdated = 0;

  db.run('BEGIN TRANSACTION');
  try {
    for (let i = 0; i < records.length; i++) {
      const record = records[i];
      try {
        const res = insertOrUpdateOpfInternal(db, record);
        totalRowsProcessed++;
        if (res.isNew) recordsInserted++;
        else recordsUpdated++;
      } catch (err: any) {
        errors.push(`Baris ${i + 1} (${record.dtr_number || 'N/A'}): ${err.message || 'Gagal menyimpan'}`);
      }
    }
    db.run('COMMIT');
    saveDb();
  } catch (err: any) {
    try {
      db.run('ROLLBACK');
    } catch (_rb) {}
    console.error('Bulk transaction error:', err);
    throw err;
  }

  return {
    totalRowsProcessed,
    recordsInserted,
    recordsUpdated,
    errors,
  };
}

/**
 * Update specifically Tim Area verification receipt
 */
export async function updateAreaReceipt(id: number, data: {
  area_received_by: string;
  area_photo?: string;
  area_notes?: string;
  received_date?: string;
}): Promise<boolean> {
  const date = data.received_date || new Date().toISOString().split('T')[0];
  let photoUrl = data.area_photo || '';

  // If base64 photo is provided, upload directly to Supabase Storage
  if (photoUrl && photoUrl.startsWith('data:')) {
    const uploadRes = await uploadPhotoToSupabase(photoUrl, `area_receipt_${id}`);
    if (uploadRes.success && uploadRes.publicUrl) {
      photoUrl = uploadRes.publicUrl;
    }
  }

  const supabase = getSupabaseClient();
  if (supabase) {
    try {
      const updateData: any = {
        area_received_date: date,
        area_received_by: data.area_received_by,
        area_notes: data.area_notes || '',
        tracking_status: 'Not yet shipped',
        updated_at: new Date().toISOString(),
      };
      if (photoUrl) {
        updateData.area_photo = photoUrl;
      }

      const { error } = await supabase
        .from('opf_records')
        .update(updateData)
        .eq('id', id);

      if (!error) return true;
      console.warn('[SUPABASE] updateAreaReceipt failed, falling back to SQLite:', error.message);
    } catch (err) {
      console.warn('[SUPABASE] updateAreaReceipt error:', err);
    }
  }

  // SQLite fallback
  const db = await getDb();
  db.run(
    `UPDATE opf_records 
     SET area_received_date = ?, 
         area_received_by = ?, 
         area_photo = COALESCE(NULLIF(?, ''), area_photo), 
         area_notes = ?, 
         tracking_status = 'Not yet shipped',
         updated_at = datetime('now')
     WHERE id = ?`,
    [date, data.area_received_by, photoUrl, data.area_notes || '', id]
  );
  saveDb();
  return true;
}

/**
 * Update specifically Tim Quality verification
 */
export async function updateQualityInspection(id: number, data: {
  quality_checked_by: string;
  quality_photo?: string;
  quality_notes?: string;
  quality_date?: string;
}): Promise<boolean> {
  const date = data.quality_date || new Date().toISOString().split('T')[0];
  let photoUrl = data.quality_photo || '';

  // If base64 photo is provided, upload directly to Supabase Storage
  if (photoUrl && photoUrl.startsWith('data:')) {
    const uploadRes = await uploadPhotoToSupabase(photoUrl, `quality_check_${id}`);
    if (uploadRes.success && uploadRes.publicUrl) {
      photoUrl = uploadRes.publicUrl;
    }
  }

  const supabase = getSupabaseClient();
  if (supabase) {
    try {
      const updateData: any = {
        quality_checked_date: date,
        quality_checked_by: data.quality_checked_by,
        quality_notes: data.quality_notes || '',
        updated_at: new Date().toISOString(),
      };
      if (photoUrl) {
        updateData.quality_photo = photoUrl;
      }

      const { error } = await supabase
        .from('opf_records')
        .update(updateData)
        .eq('id', id);

      if (!error) return true;
      console.warn('[SUPABASE] updateQualityInspection failed, falling back to SQLite:', error.message);
    } catch (err) {
      console.warn('[SUPABASE] updateQualityInspection error:', err);
    }
  }

  // SQLite fallback
  const db = await getDb();
  db.run(
    `UPDATE opf_records 
     SET quality_checked_date = ?, 
         quality_checked_by = ?, 
         quality_photo = COALESCE(NULLIF(?, ''), quality_photo), 
         quality_notes = ?, 
         updated_at = datetime('now')
     WHERE id = ?`,
    [date, data.quality_checked_by, photoUrl, data.quality_notes || '', id]
  );
  saveDb();
  return true;
}

/**
 * Update shipment to HMMI / HML (Supplier)
 */
export async function updateDeliveryToHmmi(id: number, data: {
  shipped_date: string;
  shipping_resi: string;
  shipping_carrier?: string;
}): Promise<boolean> {
  const rec = await getOpfById(id);
  const days = rec ? calculateDaysElapsed(rec.request_date, data.shipped_date) : 0;

  const supabase = getSupabaseClient();
  if (supabase) {
    try {
      const { error } = await supabase
        .from('opf_records')
        .update({
          shipped_date: data.shipped_date,
          shipping_resi: data.shipping_resi,
          shipping_carrier: data.shipping_carrier || '',
          tracking_status: 'Delivered',
          days_elapsed: days,
          is_overdue: false,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id);

      if (!error) return true;
      console.warn('[SUPABASE] updateDeliveryToHmmi failed, falling back to SQLite:', error.message);
    } catch (err) {
      console.warn('[SUPABASE] updateDeliveryToHmmi error:', err);
    }
  }

  // SQLite fallback
  const db = await getDb();
  db.run(
    `UPDATE opf_records 
     SET shipped_date = ?, 
         shipping_resi = ?, 
         shipping_carrier = ?, 
         tracking_status = 'Delivered',
         days_elapsed = ?,
         is_overdue = 0,
         updated_at = datetime('now')
     WHERE id = ?`,
    [data.shipped_date, data.shipping_resi, data.shipping_carrier || '', days, id]
  );
  saveDb();
  return true;
}

/**
 * Delete record
 */
export async function deleteOpfRecord(id: number): Promise<boolean> {
  const supabase = getSupabaseClient();
  if (supabase) {
    try {
      const { error } = await supabase
        .from('opf_records')
        .delete()
        .eq('id', id);

      if (!error) return true;
      console.warn('[SUPABASE] deleteOpfRecord failed, falling back to SQLite:', error.message);
    } catch (err) {
      console.warn('[SUPABASE] deleteOpfRecord error:', err);
    }
  }

  const db = await getDb();
  db.run('DELETE FROM opf_records WHERE id = ?', [id]);
  saveDb();
  return true;
}

/**
 * Aggregate summary statistics & top overdue parts
 */
export async function getOpfStats(): Promise<StatsData> {
  const records = await getAllOpfRecords('');

  let waitingOfp = 0;
  let notYetShipped = 0;
  let delivered = 0;
  let overdueCount = 0;
  let pendingQualityVerificationCount = 0;

  const overdueMap = new Map<string, { count: number; maxDays: number; totalDays: number }>();
  const modelMap = new Map<string, number>();
  const dealerMap = new Map<string, { count: number; overdueCount: number }>();

  for (const r of records) {
    if (r.tracking_status === 'Waiting OFP' || r.tracking_status === 'Belum Terkirim') waitingOfp++;
    else if (r.tracking_status === 'Not yet shipped' || r.tracking_status === 'Received by Area') notYetShipped++;
    else if (r.tracking_status === 'Delivered' || r.tracking_status === 'Sent to HMMI') delivered++;

    if (r.is_overdue) {
      overdueCount++;
      const current = overdueMap.get(r.part_name) || { count: 0, maxDays: 0, totalDays: 0 };
      current.count += (r.quantity || 1);
      current.maxDays = Math.max(current.maxDays, r.days_elapsed || 0);
      current.totalDays += (r.days_elapsed || 0);
      overdueMap.set(r.part_name, current);
    }

    if (r.area_received_date && !r.quality_checked_date && r.tracking_status !== 'Delivered' && r.tracking_status !== 'Sent to HMMI') {
      pendingQualityVerificationCount++;
    }

    if (r.model) {
      modelMap.set(r.model, (modelMap.get(r.model) || 0) + 1);
    }

    if (r.dealer_name) {
      const d = dealerMap.get(r.dealer_name) || { count: 0, overdueCount: 0 };
      d.count++;
      if (r.is_overdue) d.overdueCount++;
      dealerMap.set(r.dealer_name, d);
    }
  }

  const topOverdueParts = Array.from(overdueMap.entries())
    .map(([name, data]) => ({
      name,
      overdueCount: data.count,
      maxDays: data.maxDays,
      avgDays: Math.round(data.totalDays / data.count),
    }))
    .sort((a, b) => b.overdueCount - a.overdueCount || b.maxDays - a.maxDays)
    .slice(0, 5);

  const modelDistribution = Array.from(modelMap.entries())
    .map(([model, count]) => ({ model, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);

  const dealerDistribution = Array.from(dealerMap.entries())
    .map(([dealer, data]) => ({ dealer, count: data.count, overdueCount: data.overdueCount }))
    .sort((a, b) => b.overdueCount - a.overdueCount || b.count - a.count)
    .slice(0, 5);

  return {
    totalRecords: records.length,
    statusCounts: {
      waitingOfp,
      notYetShipped,
      delivered,
      overdueCount,
    },
    topOverdueParts,
    modelDistribution,
    dealerDistribution,
    pendingQualityVerificationCount,
  };
}
