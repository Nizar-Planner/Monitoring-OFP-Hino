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
      judgement_date: '2026-09-08',
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
      judgement_date: '2026-09-12',
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
      judgement_date: '2026-09-15',
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
      judgement_date: '2026-09-16',
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
      judgement_date: '2026-09-18',
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
      judgement_date: '2026-10-04',
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
      judgement_date: '2026-09-25',
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
      (dtr_number, part_name, part_number, quantity, model, chassis_number, engine_number, mileage, dealer_name, qpi_number, judgement_qpi, judgement_date, request_date, tracking_status, area_received_date, area_received_by, area_photo, area_notes, quality_checked_date, quality_checked_by, quality_photo, quality_notes, shipped_date, shipping_resi, shipping_carrier, days_elapsed, is_overdue)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
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
        item.judgement_date || null,
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
