// ============================================================
// AgenKu — Tipe Data Utama
// ============================================================

// ---- Konfigurasi Aplikasi ----
export const APP_NAME = 'AgenKu';
export const LOW_STOCK_THRESHOLD = 5;
export const BUSINESS_TIMEZONE = 'Asia/Jakarta';

// ---- Products ----
export interface Product {
  id: string;
  name: string;
  category: string | null;
  unit: string;
  stock: number;
  cost_price: number;   // bigint dari DB, dipakai sebagai number di JS
  selling_price: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface ProductFormData {
  name: string;
  category: string;
  unit: string;
  stock: number;
  cost_price: number;
  selling_price: number;
  is_active: boolean;
}

// ---- Sales ----
export type SaleStatus = 'completed' | 'cancelled';

export interface Sale {
  id: string;
  transaction_code: string;
  buyer_name: string;
  occurred_at: string;
  status: SaleStatus;
  notes: string | null;
  created_at: string;
  cancelled_at: string | null;
  cancellation_reason: string | null;
}

export interface SaleWithTotals extends Sale {
  total_revenue: number;
  total_profit: number;
  item_count: number;
}

export interface SaleItem {
  id: string;
  sale_id: string;
  product_id: string;
  product_name_snapshot: string;
  quantity: number;
  unit_cost_snapshot: number;
  unit_selling_price_snapshot: number;
  created_at: string;
}

// Item yang dikirim ke RPC create_sale
export interface SaleItemInput {
  product_id: string;
  quantity: number;
}

export interface CreateSaleInput {
  buyer_name: string;
  occurred_at: string;
  notes?: string;
  idempotency_key?: string;
  items: SaleItemInput[];
}

export interface CancelSaleInput {
  sale_id: string;
  reason: string;
}

// Response dari RPC
export interface CreateSaleResult {
  sale_id: string;
  transaction_code: string;
  buyer_name: string;
  occurred_at: string;
  status: SaleStatus;
  notes: string | null;
  total_revenue: number;
  total_profit: number;
  duplicate: boolean;
}

export interface CancelSaleResult {
  sale_id: string;
  transaction_code: string;
  status: SaleStatus;
  cancelled_at: string;
  cancellation_reason: string;
}

// ---- Stock Movements ----
export type MovementType = 'opening' | 'sale' | 'cancellation_return' | 'adjustment';

export interface StockMovement {
  id: string;
  product_id: string;
  movement_type: MovementType;
  quantity_delta: number;
  stock_before: number;
  stock_after: number;
  reference_sale_id: string | null;
  reason: string | null;
  created_at: string;
}

export interface AdjustStockInput {
  product_id: string;
  new_stock: number;
  reason: string;
}

export interface AdjustStockResult {
  product_id: string;
  product_name: string;
  stock_before: number;
  stock_after: number;
  delta: number;
  message: string;
}

// ---- Dashboard / Ringkasan ----
export interface DashboardSummary {
  today_revenue: number;
  today_profit: number;
  today_transaction_count: number;
  low_stock_count: number;
  out_of_stock_count: number;
}

// ---- Laporan ----
export interface ReportFilter {
  start_date: string;  // ISO date string
  end_date: string;    // ISO date string (exclusive)
}

export interface ReportSummary {
  total_revenue: number;
  total_profit: number;
  transaction_count: number;
  avg_transaction_value: number;
}

export interface DailyReportRow {
  date: string;
  transaction_count: number;
  revenue: number;
  profit: number;
}

export interface ProductReportRow {
  product_id: string;
  product_name: string;
  total_quantity: number;
  total_revenue: number;
  total_profit: number;
}

// ---- Pagination ----
export interface PaginationParams {
  page: number;
  per_page: number;
}

export interface PaginatedResult<T> {
  data: T[];
  total: number;
  page: number;
  per_page: number;
  total_pages: number;
}

// ---- Server Action Results ----
export interface ActionResult<T = void> {
  success: boolean;
  data?: T;
  error?: string;
}

// ---- Stock filter ----
export type StockFilter = 'all' | 'low_stock' | 'out_of_stock' | 'active' | 'inactive';

// ---- Product categories ----
export const PRODUCT_CATEGORIES = ['Air Minum', 'Gas', 'Lainnya'] as const;
export type ProductCategory = (typeof PRODUCT_CATEGORIES)[number];

// ---- Product units ----
export const PRODUCT_UNITS = ['galon', 'tabung', 'botol', 'pcs'] as const;
export type ProductUnit = (typeof PRODUCT_UNITS)[number];
