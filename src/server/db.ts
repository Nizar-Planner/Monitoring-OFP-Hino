import initSqlJs, { Database, SqlValue } from 'sql.js';
import fs from 'fs';
import path from 'path';
import { OpfRecord, StatsData, TrackingStatus, ExcelImportResult, UserProfile, UserRole } from '../types.ts';
import {
  getSupabaseClient,
  isSupabaseConfigured,
  uploadPhotoToSupabase,
  SUPABASE_STORAGE_BUCKET
} from '../lib/supabase.ts';
import { isExcludedJudgement, EXCLUDED_JUDGEMENTS } from '../utils/excelParser.ts';

export type { OpfRecord, StatsData, TrackingStatus, ExcelImportResult, UserProfile, UserRole };
export { isExcludedJudgement, EXCLUDED_JUDGEMENTS };

let dbInstance: Database | null = null;
const DATA_DIR = path.resolve(process.cwd(), 'data');
const DB_PATH = path.join(DATA_DIR, 'opf_database.sqlite');

export function isUsingSupabase(): boolean {
  return isSupabaseConfigured() && getSupabaseClient() !== null;
}

export function calculateDaysElapsed(requestDateStr: string, shippedDateStr?: string | null): number {
  if (!requestDateStr) return 0;
  const start = new Date(requestDateStr).getTime();
  if (isNaN(start)) return 0;

  const end = shippedDateStr ? new Date(shippedDateStr).getTime() : Date.now();
  if (isNaN(end)) return 0;

  const diffMs = Math.max(0, end - start);
  return Math.floor(diffMs / (1000 * 60 * 60 * 24));
}

let cachedSupabaseColumns: Set<string> | null = null;
let lastSupabaseColumnsCheck = 0;

export async function getSupabaseColumns(forceRefresh = false): Promise<Set<string>> {
  const now = Date.now();
  if (!forceRefresh && cachedSupabaseColumns && now - lastSupabaseColumnsCheck < 60000) {
    return cachedSupabaseColumns;
  }
  const sb = getSupabaseClient();
  if (!sb) return new Set();

  try {
    const { data, error } = await sb.from('opf_records').select('*').limit(1);
    if (!error && data && data.length > 0) {
      cachedSupabaseColumns = new Set(Object.keys(data[0]));
      lastSupabaseColumnsCheck = now;
    }
  } catch (_e) {
    // ignore
  }
  return cachedSupabaseColumns || new Set();
}

export function filterRecordForSupabase(
  recordPayload: Record<string, any>,
  availableCols: Set<string>
): Record<string, any> {
  if (!availableCols || availableCols.size === 0) {
    return recordPayload;
  }
  const filtered: Record<string, any> = {};
  for (const [key, val] of Object.entries(recordPayload)) {
    if (availableCols.has(key)) {
      filtered[key] = val;
    }
  }
  return filtered;
}

export async function syncRecordToSupabase(record: OpfRecord, days: number, isOverdue: boolean): Promise<void> {
  const sb = getSupabaseClient();
  if (!isSupabaseConfigured() || !sb) return;

  try {
    const cols = await getSupabaseColumns();
    const { id: _id, days_elapsed: _de, is_overdue: _io, created_at: _ca, ...restPayload } = record;
    const rawPayload: Record<string, any> = {
      ...restPayload,
      days_elapsed: days,
      is_overdue: isOverdue,
      updated_at: new Date().toISOString(),
    };

    const payload = filterRecordForSupabase(rawPayload, cols);

    // Cek apakah data sudah ada di Supabase berdasarkan dtr_number dan part_name
    const { data: existingSb } = await sb
      .from('opf_records')
      .select('id')
      .eq('dtr_number', record.dtr_number)
      .eq('part_name', record.part_name)
      .limit(1);

    if (existingSb && existingSb.length > 0) {
      await sb.from('opf_records').update(payload).eq('id', existingSb[0].id);
    } else {
      await sb.from('opf_records').insert([payload]);
    }
  } catch (sbErr) {
    console.warn('[SUPABASE] Gagal sync record ke Supabase:', sbErr);
  }
}

/**
 * Robust batch synchronization to Supabase:
 * 1. Deduplicates records in the chunk to prevent Postgres "ON CONFLICT DO UPDATE command cannot affect row a second time"
 * 2. Filters fields against actual columns existing in the Supabase schema
 * 3. Attempts fast composite-key upsert (dtr_number, part_name)
 * 4. Gracefully falls back to (dtr_number, part_name, part_number) or ID-matched update/insert if no unique constraint matches
 */
export async function syncBatchToSupabase(records: OpfRecord[]): Promise<{ success: boolean; errors: string[] }> {
  const sb = getSupabaseClient();
  if (!isSupabaseConfigured() || !sb) return { success: true, errors: [] };

  const validRecords = records.filter((r) => !isExcludedJudgement(r.judgement_qpi));
  if (validRecords.length === 0) return { success: true, errors: [] };

  const errors: string[] = [];

  try {
    const cols = await getSupabaseColumns();

    // 1. Deduplikasi record dalam batch berdasarkan (dtr_number, part_name)
    // agar PostgreSQL tidak melempar error "ON CONFLICT DO UPDATE command cannot affect row a second time"
    const recordMap = new Map<string, Record<string, any>>();
    for (const r of validRecords) {
      const days = calculateDaysElapsed(r.request_date, r.shipped_date);
      const isOverdue = days > 30 && r.tracking_status !== 'Delivered' && r.tracking_status !== 'Sent to HMMI';
      const { id: _id, ...rest } = r;

      const rawPayload = {
        ...rest,
        days_elapsed: days,
        is_overdue: isOverdue,
        updated_at: new Date().toISOString(),
      };
      const filtered = filterRecordForSupabase(rawPayload, cols);
      
      const key = `${String(r.dtr_number || '').trim().toUpperCase()}:::${String(r.part_name || '').trim().toLowerCase()}`;
      recordMap.set(key, filtered);
    }

    const payloadList = Array.from(recordMap.values());
    const chunkSize = 100;

    for (let i = 0; i < payloadList.length; i += chunkSize) {
      const chunk = payloadList.slice(i, i + chunkSize);

      // Coba Cara 1: Upsert dengan onConflict: 'dtr_number,part_name'
      let upsertSuccess = false;
      let lastErrMessage = '';

      try {
        const { error: upsertErr1 } = await sb
          .from('opf_records')
          .upsert(chunk, { onConflict: 'dtr_number,part_name' });

        if (!upsertErr1) {
          upsertSuccess = true;
        } else {
          lastErrMessage = upsertErr1.message;
          // Coba Cara 2: Jika error constraint, coba dengan 'dtr_number,part_name,part_number'
          if (upsertErr1.message.includes('unique or exclusion constraint')) {
            const { error: upsertErr2 } = await sb
              .from('opf_records')
              .upsert(chunk, { onConflict: 'dtr_number,part_name,part_number' });
            if (!upsertErr2) {
              upsertSuccess = true;
            } else {
              lastErrMessage = upsertErr2.message;
            }
          }
        }
      } catch (e: any) {
        lastErrMessage = e.message || String(e);
      }

      // Cara 3: FALLBACK HANDLER JIKA ON CONFLICT GAGAL ATAU TIDAK ADA UNIQUE CONSTRAINT DI SUPABASE:
      // Cocokkan data yang sudah ada berdasarkan dtr_number, dapatkan ID Supabase,
      // lalu lakukan UPDATE untuk yang sudah ada dan INSERT untuk data baru.
      if (!upsertSuccess) {
        console.warn(`[SUPABASE SYNC] Upsert constraint tidak cocok (${lastErrMessage}). Menggunakan fallback ID-matching...`);
        try {
          const chunkDtrs = Array.from(new Set(chunk.map((item) => item.dtr_number).filter(Boolean)));
          
          // Cari record yang sudah ada di Supabase
          const { data: existingRows } = await sb
            .from('opf_records')
            .select('id, dtr_number, part_name, part_number')
            .in('dtr_number', chunkDtrs);

          const existingMap = new Map<string, number>();
          if (existingRows) {
            for (const row of existingRows) {
              const k = `${String(row.dtr_number).trim().toUpperCase()}:::${String(row.part_name).trim().toLowerCase()}`;
              existingMap.set(k, row.id);
            }
          }

          const toUpdate: Array<{ id: number; data: Record<string, any> }> = [];
          const toInsert: Record<string, any>[] = [];

          for (const item of chunk) {
            const k = `${String(item.dtr_number).trim().toUpperCase()}:::${String(item.part_name).trim().toLowerCase()}`;
            const existingId = existingMap.get(k);
            if (existingId) {
              toUpdate.push({ id: existingId, data: item });
            } else {
              toInsert.push(item);
            }
          }

          // Lakukan insert untuk data baru
          if (toInsert.length > 0) {
            const { error: insErr } = await sb.from('opf_records').insert(toInsert);
            if (insErr) {
              console.error('[SUPABASE SYNC] Fallback insert error:', insErr.message);
              errors.push(`Supabase Insert Error: ${insErr.message}`);
            }
          }

          // Lakukan update untuk data yang sudah ada
          for (const u of toUpdate) {
            const { error: updErr } = await sb.from('opf_records').update(u.data).eq('id', u.id);
            if (updErr) {
              console.error(`[SUPABASE SYNC] Fallback update error (id: ${u.id}):`, updErr.message);
            }
          }

          upsertSuccess = true;
          console.log(`[SUPABASE SYNC] Berhasil sinkronisasi via fallback (${toUpdate.length} updated, ${toInsert.length} inserted).`);
        } catch (fallbackErr: any) {
          console.error('[SUPABASE SYNC] Fallback sync exception:', fallbackErr);
          errors.push(`Supabase Fallback Exception: ${fallbackErr.message || fallbackErr}`);
        }
      }
    }
  } catch (err: any) {
    console.error('[SUPABASE SYNC] Batch sync error:', err);
    errors.push(`Supabase Batch Sync: ${err.message || err}`);
  }

  return { success: errors.length === 0, errors };
}

export async function getDb(): Promise<Database> {
  if (dbInstance) return dbInstance;

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
  ensureSqliteColumns(dbInstance);
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

function ensureSqliteColumns(db: Database): void {
  const info = db.exec('PRAGMA table_info(opf_records)');
  const columns = new Set<string>();

  if (info.length > 0) {
    for (const row of info[0].values) {
      columns.add(String(row[1]));
    }
  }

  const migrations: Array<{ name: string; sql: string }> = [
    { name: 'part_number', sql: "ALTER TABLE opf_records ADD COLUMN part_number TEXT DEFAULT ''" },
    { name: 'judgement_date', sql: "ALTER TABLE opf_records ADD COLUMN judgement_date TEXT DEFAULT NULL" },
    { name: 'problem', sql: "ALTER TABLE opf_records ADD COLUMN problem TEXT DEFAULT ''" },
    { name: 'pos', sql: "ALTER TABLE opf_records ADD COLUMN pos TEXT DEFAULT ''" },
    { name: 'occurred_date', sql: "ALTER TABLE opf_records ADD COLUMN occurred_date TEXT DEFAULT NULL" },
    { name: 'repair_date', sql: "ALTER TABLE opf_records ADD COLUMN repair_date TEXT DEFAULT NULL" },
  ];

  for (const item of migrations) {
    if (!columns.has(item.name)) {
      try {
        db.run(item.sql);
      } catch (_err) {
        // ignore if already exists
      }
    }
  }

  // Bersihkan data dummy (jika ada sisa)
  try {
    db.run("DELETE FROM opf_records WHERE dtr_number = 'DTR-2026-MDN-0018' OR dtr_number LIKE '%MDN-0018%'");
  } catch (_delErr) {
    // ignore
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
      problem TEXT DEFAULT '',
      pos TEXT DEFAULT '',
      occurred_date TEXT DEFAULT NULL,
      repair_date TEXT DEFAULT NULL,
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

  db.run(`CREATE INDEX IF NOT EXISTS idx_dtr_part ON opf_records (dtr_number, part_name);`);
  db.run(`CREATE INDEX IF NOT EXISTS idx_dtr_part_no ON opf_records (dtr_number, part_number);`);

  // Tabel Manajemen Profil Pengguna & RBAC
  db.run(`
    CREATE TABLE IF NOT EXISTS profiles (
      id TEXT PRIMARY KEY,
      email TEXT NOT NULL UNIQUE,
      role TEXT NOT NULL DEFAULT 'Tim Viewer',
      full_name TEXT DEFAULT '',
      department TEXT DEFAULT '',
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
  `);

  // Tabel Riwayat Log Notifikasi Email ke Tim Area
  db.run(`
    CREATE TABLE IF NOT EXISTS notification_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      sent_by TEXT NOT NULL,
      recipients TEXT NOT NULL,
      pending_count INTEGER NOT NULL DEFAULT 0,
      overdue_count INTEGER NOT NULL DEFAULT 0,
      notes TEXT DEFAULT '',
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
  `);

  // Bersihkan data dummy pengguna agar database profiles bersih murni dari user terdaftar
  try {
    db.run(`DELETE FROM profiles WHERE id LIKE 'usr_%' OR id LIKE 'demo_%'`);
  } catch (_cleanErr) {
    // ignore
  }
}

export async function getAllOpfRecords(query = '', statusFilter = 'all', overdueOnly = false): Promise<OpfRecord[]> {
  const sb = getSupabaseClient();
  if (isSupabaseConfigured() && sb) {
    try {
      let req = sb.from('opf_records').select('*');
      if (statusFilter && statusFilter !== 'all') {
        if (statusFilter === 'Waiting OFP' || statusFilter === 'Belum Terkirim') {
          req = req.in('tracking_status', ['Waiting OFP', 'Belum Terkirim']);
        } else if (statusFilter === 'Not yet shipped' || statusFilter === 'Received by Area') {
          req = req.in('tracking_status', ['Not yet shipped', 'Received by Area']);
        } else if (statusFilter === 'Delivered' || statusFilter === 'Sent to HMMI') {
          req = req.in('tracking_status', ['Delivered', 'Sent to HMMI']);
        } else {
          req = req.eq('tracking_status', statusFilter);
        }
      }

      const timeoutPromise = new Promise<{ data: null; error: { message: string } }>((res) =>
        setTimeout(() => res({ data: null, error: { message: 'Supabase query timeout (3s)' } }), 3000)
      );
      const { data, error } = (await Promise.race([req, timeoutPromise])) as any;
      if (!error && data) {
        let records: OpfRecord[] = data.map((row: any) => {
          const days = calculateDaysElapsed(row.request_date, row.shipped_date);
          const isOverdue = days > 30 && row.tracking_status !== 'Delivered' && row.tracking_status !== 'Sent to HMMI';
          return {
            ...row,
            days_elapsed: days,
            is_overdue: isOverdue,
          };
        });

        if (overdueOnly) {
          records = records.filter((r) => r.is_overdue);
        }

        if (query.trim()) {
          const q = query.trim().toLowerCase();
          records = records.filter((r) =>
            (r.dtr_number && r.dtr_number.toLowerCase().includes(q)) ||
            (r.part_name && r.part_name.toLowerCase().includes(q)) ||
            (r.part_number && r.part_number.toLowerCase().includes(q)) ||
            (r.model && r.model.toLowerCase().includes(q)) ||
            (r.chassis_number && r.chassis_number.toLowerCase().includes(q)) ||
            (r.engine_number && r.engine_number.toLowerCase().includes(q)) ||
            (r.dealer_name && r.dealer_name.toLowerCase().includes(q)) ||
            (r.qpi_number && r.qpi_number.toLowerCase().includes(q)) ||
            (r.problem && r.problem.toLowerCase().includes(q)) ||
            (r.pos && r.pos.toLowerCase().includes(q)) ||
            (r.judgement_qpi && r.judgement_qpi.toLowerCase().includes(q))
          );
        }

        records.sort((a, b) => {
          if ((b.is_overdue ? 1 : 0) !== (a.is_overdue ? 1 : 0)) {
            return (b.is_overdue ? 1 : 0) - (a.is_overdue ? 1 : 0);
          }
          return (b.days_elapsed || 0) - (a.days_elapsed || 0);
        });

        return records;
      } else if (error) {
        console.warn('[SUPABASE] Query failed, using SQLite cache:', error.message);
      }
    } catch (err) {
      console.warn('[SUPABASE] Exception in getAllOpfRecords, falling back to SQLite:', err);
    }
  }

  // SQLite fallback
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
              OR problem LIKE ?
              OR pos LIKE ?
              OR judgement_qpi LIKE ?)`;
    params.push(q, q, q, q, q, q, q, q, q, q, q);
  }

  if (statusFilter && statusFilter !== 'all') {
    if (statusFilter === 'Waiting OFP' || statusFilter === 'Belum Terkirim') {
      sql += ` AND (tracking_status = 'Waiting OFP' OR tracking_status = 'Belum Terkirim')`;
    } else if (statusFilter === 'Not yet shipped' || statusFilter === 'Received by Area') {
      sql += ` AND (tracking_status = 'Not yet shipped' OR tracking_status = 'Received by Area')`;
    } else if (statusFilter === 'Delivered' || statusFilter === 'Sent to HMMI') {
      sql += ` AND (tracking_status = 'Delivered' OR tracking_status = 'Sent to HMMI')`;
    } else {
      sql += ` AND tracking_status = ?`;
      params.push(statusFilter);
    }
  }

  if (overdueOnly) {
    sql += ` AND is_overdue = 1`;
  }

  sql += ' ORDER BY is_overdue DESC, days_elapsed DESC, id DESC';

  const stmt = db.prepare(sql);
  if (params.length > 0) stmt.bind(params);

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

export async function getOpfById(id: number): Promise<OpfRecord | null> {
  const sb = getSupabaseClient();
  if (isSupabaseConfigured() && sb) {
    try {
      const { data, error } = await sb.from('opf_records').select('*').eq('id', id).maybeSingle();
      if (!error && data) {
        const days = calculateDaysElapsed(data.request_date, data.shipped_date);
        return {
          ...data,
          days_elapsed: days,
          is_overdue: days > 30 && data.tracking_status !== 'Delivered' && data.tracking_status !== 'Sent to HMMI',
        };
      }
    } catch (_err) {
      // fallback to SQLite
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

async function processPhotosForRecord(record: Partial<OpfRecord>): Promise<void> {
  if (record.area_photo && record.area_photo.startsWith('data:')) {
    const res = await uploadPhotoToSupabase(record.area_photo, `area_${record.dtr_number || 'part'}`);
    if (res.success && res.publicUrl) record.area_photo = res.publicUrl;
  }
  if (record.quality_photo && record.quality_photo.startsWith('data:')) {
    const res = await uploadPhotoToSupabase(record.quality_photo, `quality_${record.dtr_number || 'part'}`);
    if (res.success && res.publicUrl) record.quality_photo = res.publicUrl;
  }
}

export async function insertOrUpdateOpf(
  record: OpfRecord,
  options: { syncToSupabase?: boolean; autoSave?: boolean } = {}
): Promise<{ isNew: boolean; id: number }> {
  // Lewati penyimpanan jika status judgement termasuk dalam daftar pengecualian
  if (isExcludedJudgement(record.judgement_qpi)) {
    return { isNew: false, id: 0 };
  }

  const syncToSupabase = options.syncToSupabase ?? true;
  const autoSave = options.autoSave ?? true;

  if (record.area_photo?.startsWith('data:') || record.quality_photo?.startsWith('data:')) {
    await processPhotosForRecord(record);
  }

  const db = await getDb();
  const days = calculateDaysElapsed(record.request_date, record.shipped_date);
  const isOverdue = days > 30 && record.tracking_status !== 'Delivered' && record.tracking_status !== 'Sent to HMMI';
  const partNum = (record.part_number || '').trim();

  // Robust default fallbacks for NOT NULL fields
  const safeDtr = (record.dtr_number || '').trim() || 'TR-UNKNOWN';
  const safePart = (record.part_name || '').trim() || '-';
  const safeModel = (record.model || '').trim() || '-';
  const safeChassis = (record.chassis_number || '').trim() || '-';
  const safeEngine = (record.engine_number || '').trim() || '-';
  const safeDealer = (record.dealer_name || '').trim() || '-';
  const safeMileage = Number(record.mileage || 0) || 0;
  const safeQty = Number(record.quantity || 1) || 1;
  const safeReqDate = (record.request_date || '').trim() || new Date().toISOString().split('T')[0];
  const safeStatus = (record.tracking_status || '').trim() || 'Waiting OFP';

  let checkStmt;
  if (partNum) {
    checkStmt = db.prepare('SELECT * FROM opf_records WHERE dtr_number = ? AND part_number = ? AND part_name = ?');
    checkStmt.bind([safeDtr, partNum, safePart]);
  } else {
    checkStmt = db.prepare('SELECT * FROM opf_records WHERE dtr_number = ? AND part_name = ?');
    checkStmt.bind([safeDtr, safePart]);
  }

  const exists = checkStmt.step();
  let existing: any = null;
  if (exists) existing = checkStmt.getAsObject();
  checkStmt.free();

  if (existing && existing.id) {
    db.run(
      `UPDATE opf_records SET part_name = ?, part_number = ?, quantity = ?, model = ?, chassis_number = ?, engine_number = ?, mileage = ?, dealer_name = ?, qpi_number = ?, judgement_qpi = ?, judgement_date = ?, request_date = ?, tracking_status = ?, problem = ?, pos = ?, occurred_date = ?, repair_date = ?, area_received_date = ?, area_received_by = ?, area_photo = ?, area_notes = ?, quality_checked_date = ?, quality_checked_by = ?, quality_photo = ?, quality_notes = ?, shipped_date = ?, shipping_resi = ?, shipping_carrier = ?, days_elapsed = ?, is_overdue = ?, updated_at = datetime('now') WHERE id = ?`,
      [
        safePart,
        partNum,
        safeQty,
        safeModel,
        safeChassis,
        safeEngine,
        safeMileage,
        safeDealer,
        record.qpi_number || '',
        record.judgement_qpi || '',
        record.judgement_date || null,
        safeReqDate,
        record.tracking_status || existing.tracking_status || safeStatus,
        record.problem ?? existing.problem ?? '',
        record.pos ?? existing.pos ?? '',
        record.occurred_date ?? existing.occurred_date ?? null,
        record.repair_date ?? existing.repair_date ?? null,
        record.area_received_date ?? existing.area_received_date,
        record.area_received_by ?? existing.area_received_by,
        record.area_photo ?? existing.area_photo,
        record.area_notes ?? existing.area_notes,
        record.quality_checked_date ?? existing.quality_checked_date,
        record.quality_checked_by ?? existing.quality_checked_by,
        record.quality_photo ?? existing.quality_photo,
        record.quality_notes ?? existing.quality_notes,
        record.shipped_date ?? existing.shipped_date,
        record.shipping_resi ?? existing.shipping_resi,
        record.shipping_carrier ?? existing.shipping_carrier,
        days,
        isOverdue ? 1 : 0,
        existing.id
      ]
    );
    if (autoSave) saveDb();
    if (syncToSupabase) {
      await syncRecordToSupabase({
        ...existing,
        ...record,
        dtr_number: safeDtr,
        part_name: safePart,
        part_number: partNum,
        tracking_status: record.tracking_status || existing.tracking_status,
        problem: record.problem ?? existing.problem ?? '',
        pos: record.pos ?? existing.pos ?? '',
        occurred_date: record.occurred_date ?? existing.occurred_date ?? null,
        repair_date: record.repair_date ?? existing.repair_date ?? null,
      }, days, isOverdue);
    }
    return { isNew: false, id: Number(existing.id) };
  }

  db.run(
    `INSERT INTO opf_records (dtr_number, part_name, part_number, quantity, model, chassis_number, engine_number, mileage, dealer_name, qpi_number, judgement_qpi, judgement_date, request_date, tracking_status, problem, pos, occurred_date, repair_date, area_received_date, area_received_by, area_photo, area_notes, quality_checked_date, quality_checked_by, quality_photo, quality_notes, shipped_date, shipping_resi, shipping_carrier, days_elapsed, is_overdue) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)` ,
    [
      safeDtr,
      safePart,
      partNum,
      safeQty,
      safeModel,
      safeChassis,
      safeEngine,
      safeMileage,
      safeDealer,
      record.qpi_number || '',
      record.judgement_qpi || '',
      record.judgement_date || null,
      safeReqDate,
      safeStatus,
      record.problem || '',
      record.pos || '',
      record.occurred_date || null,
      record.repair_date || null,
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
      isOverdue ? 1 : 0,
    ]
  );

  const lastIdRes = db.exec('SELECT last_insert_rowid() as id');
  const newId = Number(lastIdRes[0].values[0][0]);
  if (autoSave) saveDb();

  // Sync to Supabase if configured and requested
  if (syncToSupabase) {
    await syncRecordToSupabase({
      ...record,
      dtr_number: safeDtr,
      part_name: safePart,
      part_number: partNum,
    }, days, isOverdue);
  }

  return { isNew: true, id: newId };
}

// Mutex to serialize bulk database operations so concurrent transactions never collide
let bulkOperationMutex: Promise<void> = Promise.resolve();

export async function bulkInsertOrUpdateOpf(
  records: OpfRecord[],
  options: { syncToSupabase?: boolean } = {}
): Promise<ExcelImportResult> {
  const syncToSupabase = options.syncToSupabase ?? false;

  // Queue up to ensure serialized, non-colliding execution
  const currentLock = bulkOperationMutex;
  let unlock: () => void = () => {};
  bulkOperationMutex = new Promise<void>((resolve) => {
    unlock = resolve;
  });

  try {
    await currentLock;
    return await executeBulkInsertOrUpdate(records, syncToSupabase);
  } finally {
    unlock();
  }
}

async function executeBulkInsertOrUpdate(
  records: OpfRecord[],
  syncToSupabase: boolean
): Promise<ExcelImportResult> {
  const db = await getDb();
  let totalRowsProcessed = 0;
  let recordsInserted = 0;
  let recordsUpdated = 0;
  const errors: string[] = [];

  const savepointName = `sp_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  let savepointActive = false;

  try {
    db.run(`SAVEPOINT ${savepointName}`);
    savepointActive = true;

    for (let i = 0; i < records.length; i++) {
      const record = records[i];

      // 1, 2 & 3. Periksa status judgement dan lewati (continue) jika termasuk dalam daftar pengecualian
      if (isExcludedJudgement(record.judgement_qpi)) {
        continue;
      }

      try {
        const res = await insertOrUpdateOpf(record, {
          syncToSupabase: false, // Never sync individual rows over HTTP during bulk operations
          autoSave: false,       // Do not write SQLite disk file for every single row
        });
        totalRowsProcessed++;
        if (res.isNew) recordsInserted++; else recordsUpdated++;
      } catch (err: any) {
        errors.push(`Baris ${i + 1} (${record.dtr_number || 'N/A'}): ${err.message || 'Gagal menyimpan'}`);
      }
    }

    if (savepointActive) {
      db.run(`RELEASE ${savepointName}`);
      savepointActive = false;
    }
    saveDb();
  } catch (err: any) {
    if (savepointActive) {
      try { db.run(`ROLLBACK TO ${savepointName}`); } catch (_rb) {}
      try { db.run(`RELEASE ${savepointName}`); } catch (_rel) {}
      savepointActive = false;
    }
    console.error('Bulk transaction error:', err);
    throw err;
  }

  // If syncToSupabase requested, do robust batch sync to Supabase outside the SQLite transaction
  const validRecords = records.filter((r) => !isExcludedJudgement(r.judgement_qpi));
  if (syncToSupabase && isSupabaseConfigured() && validRecords.length > 0) {
    const sbResult = await syncBatchToSupabase(validRecords);
    if (!sbResult.success) {
      errors.push(...sbResult.errors);
    }
  }

  return { totalRowsProcessed, recordsInserted, recordsUpdated, errors };
}

export async function updateAreaReceipt(id: number, data: {
  area_received_by: string;
  area_photo?: string;
  area_notes?: string;
  received_date?: string;
}): Promise<boolean> {
  const date = data.received_date || new Date().toISOString().split('T')[0];
  let photoUrl = data.area_photo || '';
  if (photoUrl && photoUrl.startsWith('data:')) {
    const uploadRes = await uploadPhotoToSupabase(photoUrl, `area_receipt_${id}`);
    if (uploadRes.success && uploadRes.publicUrl) photoUrl = uploadRes.publicUrl;
  }

  const rec = await getOpfById(id);
  const db = await getDb();
  db.run(
    `UPDATE opf_records SET area_received_date = ?, area_received_by = ?, area_photo = COALESCE(NULLIF(?, ''), area_photo), area_notes = ?, tracking_status = 'Area Verified', updated_at = datetime('now') WHERE id = ?`,
    [date, data.area_received_by, photoUrl, data.area_notes || '', id]
  );
  saveDb();

  const sb = getSupabaseClient();
  if (isSupabaseConfigured() && sb && rec) {
    try {
      const cols = await getSupabaseColumns();
      const rawPayload = {
        area_received_date: date,
        area_received_by: data.area_received_by,
        area_photo: photoUrl || rec.area_photo || '',
        area_notes: data.area_notes || '',
        tracking_status: 'Area Verified',
        updated_at: new Date().toISOString(),
      };
      const payload = filterRecordForSupabase(rawPayload, cols);
      await sb.from('opf_records').update(payload).eq('dtr_number', rec.dtr_number).eq('part_name', rec.part_name);
    } catch (sbErr) {
      console.warn('[SUPABASE] Gagal update area receipt ke Supabase:', sbErr);
    }
  }

  return true;
}

export async function updateQualityInspection(id: number, data: {
  quality_checked_by: string;
  quality_photo?: string;
  quality_notes?: string;
  quality_date?: string;
  pos?: string;
}): Promise<boolean> {
  const date = data.quality_date || new Date().toISOString().split('T')[0];
  let photoUrl = data.quality_photo || '';
  if (photoUrl && photoUrl.startsWith('data:')) {
    const uploadRes = await uploadPhotoToSupabase(photoUrl, `quality_check_${id}`);
    if (uploadRes.success && uploadRes.publicUrl) photoUrl = uploadRes.publicUrl;
  }

  const rec = await getOpfById(id);
  const db = await getDb();
  db.run(
    `UPDATE opf_records SET quality_checked_date = ?, quality_checked_by = ?, quality_photo = COALESCE(NULLIF(?, ''), quality_photo), quality_notes = ?, pos = COALESCE(NULLIF(?, ''), pos), updated_at = datetime('now') WHERE id = ?`,
    [date, data.quality_checked_by, photoUrl, data.quality_notes || '', data.pos || '', id]
  );
  saveDb();

  const sb = getSupabaseClient();
  if (isSupabaseConfigured() && sb && rec) {
    try {
      const cols = await getSupabaseColumns();
      const rawPayload = {
        quality_checked_date: date,
        quality_checked_by: data.quality_checked_by,
        quality_photo: photoUrl || rec.quality_photo || '',
        quality_notes: data.quality_notes || '',
        pos: data.pos || rec.pos || '',
        updated_at: new Date().toISOString(),
      };
      const payload = filterRecordForSupabase(rawPayload, cols);
      await sb.from('opf_records').update(payload).eq('dtr_number', rec.dtr_number).eq('part_name', rec.part_name);
    } catch (sbErr) {
      console.warn('[SUPABASE] Gagal update quality check ke Supabase:', sbErr);
    }
  }

  return true;
}

export async function updateDeliveryToHmmi(id: number, data: {
  shipped_date: string;
  shipping_resi: string;
  shipping_carrier?: string;
}): Promise<boolean> {
  const rec = await getOpfById(id);
  const days = rec ? calculateDaysElapsed(rec.request_date, data.shipped_date) : 0;
  const db = await getDb();
  db.run(
    `UPDATE opf_records SET shipped_date = ?, shipping_resi = ?, shipping_carrier = ?, tracking_status = 'Delivered', days_elapsed = ?, is_overdue = 0, updated_at = datetime('now') WHERE id = ?`,
    [data.shipped_date, data.shipping_resi, data.shipping_carrier || '', days, id]
  );
  saveDb();

  const sb = getSupabaseClient();
  if (isSupabaseConfigured() && sb && rec) {
    try {
      const cols = await getSupabaseColumns();
      const rawPayload = {
        shipped_date: data.shipped_date,
        shipping_resi: data.shipping_resi,
        shipping_carrier: data.shipping_carrier || '',
        tracking_status: 'Delivered',
        days_elapsed: days,
        is_overdue: false,
        updated_at: new Date().toISOString(),
      };
      const payload = filterRecordForSupabase(rawPayload, cols);
      await sb.from('opf_records').update(payload).eq('dtr_number', rec.dtr_number).eq('part_name', rec.part_name);
    } catch (sbErr) {
      console.warn('[SUPABASE] Gagal update shipping ke Supabase:', sbErr);
    }
  }

  return true;
}

/**
 * Logika Alur Kerja (Workflow): Rollback / Reject dari Tim Quality kembali ke Tim Area
 * Mengembalikan status ke Waiting OFP / Belum Terkirim beserta catatan revisi teknis.
 */
export async function rollbackRecordToArea(id: number, data: {
  rejected_by: string;
  revision_notes: string;
}): Promise<boolean> {
  const rec = await getOpfById(id);
  if (!rec) throw new Error('Data OPF tidak ditemukan.');

  const timestamp = new Date().toLocaleString('id-ID');
  const revisionEntry = `[ROLLBACK TIM QUALITY - ${timestamp} oleh ${data.rejected_by}]: ${data.revision_notes}`;
  const updatedNotes = rec.quality_notes ? `${rec.quality_notes}\n${revisionEntry}` : revisionEntry;

  const db = await getDb();
  db.run(
    `UPDATE opf_records SET area_received_date = null, quality_checked_date = null, quality_notes = ?, tracking_status = 'Waiting OFP', updated_at = datetime('now') WHERE id = ?`,
    [updatedNotes, id]
  );
  saveDb();

  const sb = getSupabaseClient();
  if (isSupabaseConfigured() && sb && rec) {
    try {
      const cols = await getSupabaseColumns();
      const rawPayload = {
        area_received_date: null,
        quality_checked_date: null,
        quality_notes: updatedNotes,
        tracking_status: 'Waiting OFP',
        updated_at: new Date().toISOString(),
      };
      const payload = filterRecordForSupabase(rawPayload, cols);
      await sb.from('opf_records').update(payload).eq('dtr_number', rec.dtr_number).eq('part_name', rec.part_name);
    } catch (sbErr) {
      console.warn('[SUPABASE] Gagal rollback record ke Supabase:', sbErr);
    }
  }

  return true;
}

export async function deleteOpfRecord(id: number): Promise<boolean> {
  const rec = await getOpfById(id);
  const db = await getDb();
  db.run('DELETE FROM opf_records WHERE id = ?', [id]);
  saveDb();

  const sb = getSupabaseClient();
  if (isSupabaseConfigured() && sb && rec) {
    try {
      await sb.from('opf_records').delete().eq('dtr_number', rec.dtr_number).eq('part_name', rec.part_name);
    } catch (sbErr) {
      console.warn('[SUPABASE] Gagal delete record di Supabase:', sbErr);
    }
  }

  return true;
}

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
    .map(([name, data]) => ({ name, overdueCount: data.count, maxDays: data.maxDays, avgDays: Math.round(data.totalDays / data.count) }))
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

// ==========================================
// User & Role Management Functions
// ==========================================

export async function getAllUserProfiles(): Promise<UserProfile[]> {
  const sb = getSupabaseClient();
  if (isSupabaseConfigured() && sb) {
    try {
      const { data, error } = await sb
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false });

      if (!error && data && data.length > 0) {
        // Sinkronkan ke SQLite lokal sebagai cache
        const db = await getDb();
        for (const p of data) {
          db.run(
            `INSERT OR REPLACE INTO profiles (id, email, role, full_name, department, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)`,
            [
              p.id,
              p.email,
              p.role || 'Tim Viewer',
              p.full_name || '',
              p.department || '',
              p.created_at || new Date().toISOString(),
              p.updated_at || new Date().toISOString()
            ]
          );
        }
        saveDb();
        return data as UserProfile[];
      }
    } catch (sbErr) {
      console.warn('[USERS] Gagal mengambil profiles dari Supabase, fallback ke SQLite:', sbErr);
    }
  }

  // Fallback ke SQLite lokal
  const db = await getDb();
  const res = db.exec('SELECT * FROM profiles ORDER BY created_at DESC');
  if (!res || res.length === 0) return [];

  const columns = res[0].columns;
  return res[0].values.map((row) => {
    const obj: any = {};
    columns.forEach((col, idx) => {
      obj[col] = row[idx];
    });
    return obj as UserProfile;
  });
}

export async function updateUserProfileRole(
  id: string,
  newRole: UserRole
): Promise<{ success: boolean; user?: UserProfile; error?: string }> {
  const validRoles: UserRole[] = ['Super Admin', 'Tim Quality', 'Tim Area', 'Tim Viewer'];
  if (!validRoles.includes(newRole)) {
    return { success: false, error: `Role tidak valid. Pilihan: ${validRoles.join(', ')}` };
  }

  const now = new Date().toISOString();
  const sb = getSupabaseClient();

  if (isSupabaseConfigured() && sb) {
    try {
      await sb
        .from('profiles')
        .update({ role: newRole, updated_at: now })
        .eq('id', id);
    } catch (sbErr) {
      console.warn('[USER ROLE] Supabase update error:', sbErr);
    }
  }

  // Update ke database lokal SQLite
  const db = await getDb();
  db.run(`UPDATE profiles SET role = ?, updated_at = ? WHERE id = ?`, [newRole, now, id]);
  saveDb();

  // Ambil record terbaru
  const res = db.exec(`SELECT * FROM profiles WHERE id = ?`, [id]);
  let updatedUser: UserProfile | undefined = undefined;
  if (res && res.length > 0 && res[0].values.length > 0) {
    const cols = res[0].columns;
    const row = res[0].values[0];
    const obj: any = {};
    cols.forEach((c, idx) => (obj[c] = row[idx]));
    updatedUser = obj;
  }

  return { success: true, user: updatedUser };
}

export async function createUserProfile(
  payload: Partial<UserProfile>
): Promise<{ success: boolean; user?: UserProfile; error?: string }> {
  if (!payload.email || !payload.email.includes('@hino.co.id')) {
    return { success: false, error: 'Email wajib menggunakan domain resmi @hino.co.id' };
  }

  const id = payload.id || `usr_${Date.now()}`;
  const role = payload.role || 'Tim Viewer';
  const fullName = payload.full_name || payload.email.split('@')[0];
  const department = payload.department || 'PT Hino Motors Sales Indonesia';
  const now = new Date().toISOString();

  const sb = getSupabaseClient();
  if (isSupabaseConfigured() && sb) {
    try {
      await sb.from('profiles').upsert({
        id,
        email: payload.email.toLowerCase(),
        role,
        full_name: fullName,
        department,
        updated_at: now,
      });
    } catch (_e) {}
  }

  const db = await getDb();
  db.run(
    `INSERT OR REPLACE INTO profiles (id, email, role, full_name, department, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [id, payload.email.toLowerCase(), role, fullName, department, now, now]
  );
  saveDb();

  return {
    success: true,
    user: {
      id,
      email: payload.email.toLowerCase(),
      role,
      full_name: fullName,
      department,
      created_at: now,
      updated_at: now,
    },
  };
}

// ==========================================
// Area Notification Functions
// ==========================================

export async function getAreaPendingOfpSummary(): Promise<{
  totalPending: number;
  overdueCount: number;
  pendingRecords: OpfRecord[];
  areaRecipients: UserProfile[];
}> {
  // Ambil seluruh record yang belum diterima di Area (area_received_date IS NULL atau status Waiting OFP / Belum Terkirim)
  const allRecords = await getAllOpfRecords();
  const pendingRecords = allRecords.filter((r) => {
    const status = (r.tracking_status || '').toLowerCase();
    const hasAreaReceipt = Boolean(r.area_received_date);
    return !hasAreaReceipt || status === 'waiting ofp' || status === 'belum terkirim';
  });

  const overdueCount = pendingRecords.filter((r) => r.is_overdue).length;

  // Ambil user yang berstatus 'Tim Area'
  const allProfiles = await getAllUserProfiles();
  const areaRecipients = allProfiles.filter((p) => p.role === 'Tim Area');

  return {
    totalPending: pendingRecords.length,
    overdueCount,
    pendingRecords,
    areaRecipients,
  };
}

export async function logNotification(entry: {
  sent_by: string;
  recipients: string[];
  pending_count: number;
  overdue_count: number;
  notes?: string;
}): Promise<void> {
  const db = await getDb();
  db.run(
    `INSERT INTO notification_logs (sent_by, recipients, pending_count, overdue_count, notes) VALUES (?, ?, ?, ?, ?)`,
    [
      entry.sent_by,
      entry.recipients.join(', '),
      entry.pending_count,
      entry.overdue_count,
      entry.notes || '',
    ]
  );
  saveDb();
}

export async function getNotificationHistory(limit = 20): Promise<any[]> {
  const db = await getDb();
  const res = db.exec(`SELECT * FROM notification_logs ORDER BY created_at DESC LIMIT ${limit}`);
  if (!res || res.length === 0) return [];

  const columns = res[0].columns;
  return res[0].values.map((row) => {
    const obj: any = {};
    columns.forEach((col, idx) => {
      obj[col] = row[idx];
    });
    return obj;
  });
}

