export type TrackingStatus =
  | 'Belum Terkirim'
  | 'Area Verified'
  | 'Received by Area'
  | 'Sent to HMMI'
  | 'Waiting OFP'
  | 'Not yet shipped'
  | 'Delivered';

export type UserRole = 'Super Admin' | 'Tim Quality' | 'Tim Area' | 'Tim Viewer';

export interface UserProfile {
  id: string; // Foreign key ke auth.users.id
  email: string;
  role: UserRole;
  full_name?: string;
  department?: string;
  avatar_url?: string;
  created_at?: string;
  updated_at?: string;
}

export interface RolePermissions {
  canVerifyArea: boolean;        // Tim Area & Super Admin: terima fisik part & update Area Verified
  canVerifyQuality: boolean;     // Tim Quality & Super Admin: inspeksi kualitas
  canShipHmmi: boolean;          // Tim Quality & Super Admin: kirim ke pabrik HMMI/HML
  canRollback: boolean;          // Tim Quality & Super Admin: kembalikan/reject status ke Tim Area
  canUploadExcel: boolean;       // Super Admin: impor master data Excel
  canCreateManual: boolean;      // Tim Area, Tim Quality, Super Admin: input DTR baru
  canDelete: boolean;            // Super Admin: hapus record
  canExport: boolean;            // Semua role (termasuk Tim Viewer): ekspor CSV & Print Tag
  isReadOnly: boolean;           // Tim Viewer: read-only
}

export function getRolePermissions(role: UserRole): RolePermissions {
  switch (role) {
    case 'Super Admin':
      return {
        canVerifyArea: true,
        canVerifyQuality: true,
        canShipHmmi: true,
        canRollback: true,
        canUploadExcel: true,
        canCreateManual: true,
        canDelete: true,
        canExport: true,
        isReadOnly: false,
      };
    case 'Tim Quality':
      return {
        canVerifyArea: false,
        canVerifyQuality: true,
        canShipHmmi: true,
        canRollback: true,
        canUploadExcel: false,
        canCreateManual: true,
        canDelete: false,
        canExport: true,
        isReadOnly: false,
      };
    case 'Tim Area':
      return {
        canVerifyArea: true,
        canVerifyQuality: false,
        canShipHmmi: false,
        canRollback: false,
        canUploadExcel: false,
        canCreateManual: true,
        canDelete: false,
        canExport: true,
        isReadOnly: false,
      };
    case 'Tim Viewer':
    default:
      return {
        canVerifyArea: false,
        canVerifyQuality: false,
        canShipHmmi: false,
        canRollback: false,
        canUploadExcel: false,
        canCreateManual: false,
        canDelete: false,
        canExport: true,
        isReadOnly: true,
      };
  }
}

/**
 * Validasi apakah record OFP sudah berstatus "Area Verified" (atau alias Received by Area)
 * Syarat ketat sebelum Tim Quality dapat melakukan aksi pengecekan atau pengiriman ke HMMI.
 */
export function isRecordAreaVerified(record: OpfRecord | null | undefined): boolean {
  if (!record) return false;
  const status = (record.tracking_status || '').toLowerCase();
  return (
    status === 'area verified' ||
    status === 'received by area' ||
    status === 'not yet shipped' ||
    Boolean(record.area_received_date)
  );
}

export interface OpfRecord {
  id?: number;
  dtr_number: string; // TR_No / Nomor DTR
  part_name: string; // Part
  part_number?: string; // Part Number
  quantity: number;
  model: string; // Model_Unit
  chassis_number: string; // Chassis
  engine_number: string; // Engine_No
  mileage: number; // Mileage
  dealer_name: string; // DLR
  qpi_number: string; // QPI Number
  judgement_qpi: string; // Judgment
  judgement_date?: string | null; // Judgement Date
  request_date: string; // YYYY-MM-DD (DTR created / part requested)
  tracking_status: TrackingStatus;
  
  // Tim Area verification & photo
  area_received_date?: string | null;
  area_received_by?: string;
  area_photo?: string; // base64 or url
  area_notes?: string;

  // Tim Quality inspection & verification
  quality_checked_date?: string | null;
  quality_checked_by?: string;
  quality_photo?: string; // base64 or url
  quality_notes?: string;

  // Delivery to HMMI / HML
  shipped_date?: string | null;
  shipping_resi?: string;
  shipping_carrier?: string;

  // OFP Tag specific fields
  problem?: string;
  pos?: string;
  occurred_date?: string | null;
  repair_date?: string | null;

  // Calculated metrics
  days_elapsed?: number;
  is_overdue?: boolean; // > 30 days and not delivered

  created_at?: string;
  updated_at?: string;
}

export interface StatsData {
  totalRecords: number;
  statusCounts: {
    waitingOfp: number;
    notYetShipped: number;
    delivered: number;
    overdueCount: number; // > 30 days & not delivered
  };
  topOverdueParts: {
    name: string;
    overdueCount: number;
    maxDays: number;
    avgDays: number;
  }[];
  modelDistribution: {
    model: string;
    count: number;
  }[];
  dealerDistribution: {
    dealer: string;
    count: number;
    overdueCount: number;
  }[];
  pendingQualityVerificationCount: number; // Received by Area, waiting for Quality
}

export interface ExcelImportResult {
  totalRowsProcessed: number;
  recordsInserted: number;
  recordsUpdated: number;
  errors: string[];
}
