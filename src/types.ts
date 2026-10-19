export type TrackingStatus = 'Waiting OFP' | 'Not yet shipped' | 'Delivered';

export interface OpfRecord {
  id?: number;
  dtr_number: string;
  part_name: string;
  quantity: number;
  model: string;
  chassis_number: string;
  engine_number: string;
  mileage: number;
  dealer_name: string;
  qpi_number: string;
  judgement_qpi: string;
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
