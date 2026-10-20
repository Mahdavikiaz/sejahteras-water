'use server';

import { createServerSupabaseClient } from '@/lib/supabase/server';
import type {
  ActionResult,
  DashboardSummary,
  DailyReportRow,
  ProductReportRow,
  ReportSummary,
  SaleWithTotals,
  PaginatedResult,
} from '@/types';
import { LOW_STOCK_THRESHOLD, BUSINESS_TIMEZONE } from '@/types';
import { requireAuth } from './auth';

// ============================================================
// Dashboard & Report Actions
// ============================================================

/**
 * Mendapatkan awal & akhir hari ini di zona waktu bisnis
 */
function getTodayBounds(): { start: string; end: string } {
  const now = new Date();
  const jakartaDate = new Intl.DateTimeFormat('en-CA', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    timeZone: BUSINESS_TIMEZONE,
  }).format(now);
  // jakartaDate = "2026-10-18"
  const start = `${jakartaDate}T00:00:00+07:00`;
  const nextDate = new Date(start);
  nextDate.setDate(nextDate.getDate() + 1);
  const nextDayStr = new Intl.DateTimeFormat('en-CA', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    timeZone: BUSINESS_TIMEZONE,
  }).format(nextDate);
  const end = `${nextDayStr}T00:00:00+07:00`;
  return { start, end };
}

/**
 * Ringkasan dashboard harian
 */
export async function getDashboardSummary(): Promise<ActionResult<DashboardSummary>> {
  await requireAuth();

  const supabase = await createServerSupabaseClient();
  const { start, end } = getTodayBounds();

  // Ambil transaksi hari ini yang completed
  const { data: todaySales, error: salesError } = await supabase
    .from('sales_with_totals')
    .select('total_revenue, total_profit')
    .eq('status', 'completed')
    .gte('occurred_at', start)
    .lt('occurred_at', end);

  if (salesError) {
    console.error('Error fetching dashboard summary:', salesError);
    return { success: false, error: 'Gagal mengambil ringkasan hari ini' };
  }

  const todayRevenue = todaySales?.reduce((sum, s) => sum + (s.total_revenue ?? 0), 0) ?? 0;
  const todayProfit = todaySales?.reduce((sum, s) => sum + (s.total_profit ?? 0), 0) ?? 0;
  const todayCount = todaySales?.length ?? 0;

  // Ambil jumlah produk stok menipis dan habis
  const { count: lowStockCount } = await supabase
    .from('products')
    .select('id', { count: 'exact', head: true })
    .eq('is_active', true)
    .gt('stock', 0)
    .lte('stock', LOW_STOCK_THRESHOLD);

  const { count: outOfStockCount } = await supabase
    .from('products')
    .select('id', { count: 'exact', head: true })
    .eq('is_active', true)
    .eq('stock', 0);

  return {
    success: true,
    data: {
      today_revenue: todayRevenue,
      today_profit: todayProfit,
      today_transaction_count: todayCount,
      low_stock_count: lowStockCount ?? 0,
      out_of_stock_count: outOfStockCount ?? 0,
    },
  };
}

/**
 * Laporan ringkasan untuk periode tertentu
 */
export async function getReportSummary(
  startDate: string,
  endDate: string
): Promise<ActionResult<ReportSummary>> {
  await requireAuth();

  const supabase = await createServerSupabaseClient();

  const { data, error } = await supabase
    .from('sales_with_totals')
    .select('total_revenue, total_profit')
    .eq('status', 'completed')
    .gte('occurred_at', startDate)
    .lt('occurred_at', endDate);

  if (error) {
    console.error('Error fetching report summary:', error);
    return { success: false, error: 'Gagal mengambil ringkasan laporan' };
  }

  const totalRevenue = data?.reduce((sum, s) => sum + (s.total_revenue ?? 0), 0) ?? 0;
  const totalProfit = data?.reduce((sum, s) => sum + (s.total_profit ?? 0), 0) ?? 0;
  const count = data?.length ?? 0;
  const avgValue = count > 0 ? Math.round(totalRevenue / count) : 0;

  return {
    success: true,
    data: {
      total_revenue: totalRevenue,
      total_profit: totalProfit,
      transaction_count: count,
      avg_transaction_value: avgValue,
    },
  };
}

/**
 * Laporan harian — rekap per tanggal
 */
export async function getDailyReport(
  startDate: string,
  endDate: string
): Promise<ActionResult<DailyReportRow[]>> {
  await requireAuth();

  const supabase = await createServerSupabaseClient();

  // Ambil semua transaksi completed dalam periode
  const { data, error } = await supabase
    .from('sales_with_totals')
    .select('occurred_at, total_revenue, total_profit')
    .eq('status', 'completed')
    .gte('occurred_at', startDate)
    .lt('occurred_at', endDate)
    .order('occurred_at', { ascending: true });

  if (error) {
    console.error('Error fetching daily report:', error);
    return { success: false, error: 'Gagal mengambil laporan harian' };
  }

  // Kelompokkan per tanggal (zona waktu Jakarta)
  const dailyMap = new Map<string, DailyReportRow>();

  for (const sale of data ?? []) {
    const dateStr = new Intl.DateTimeFormat('en-CA', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      timeZone: BUSINESS_TIMEZONE,
    }).format(new Date(sale.occurred_at));

    const existing = dailyMap.get(dateStr);
    if (existing) {
      existing.transaction_count += 1;
      existing.revenue += sale.total_revenue ?? 0;
      existing.profit += sale.total_profit ?? 0;
    } else {
      dailyMap.set(dateStr, {
        date: dateStr,
        transaction_count: 1,
        revenue: sale.total_revenue ?? 0,
        profit: sale.total_profit ?? 0,
      });
    }
  }

  return {
    success: true,
    data: Array.from(dailyMap.values()),
  };
}

/**
 * Laporan per produk — kuantitas terjual, pemasukan, keuntungan
 */
export async function getProductReport(
  startDate: string,
  endDate: string
): Promise<ActionResult<ProductReportRow[]>> {
  await requireAuth();

  const supabase = await createServerSupabaseClient();

  // Ambil sale items dari transaksi completed dalam periode
  const { data: sales, error: salesError } = await supabase
    .from('sales')
    .select('id')
    .eq('status', 'completed')
    .gte('occurred_at', startDate)
    .lt('occurred_at', endDate);

  if (salesError) {
    console.error('Error fetching sales for product report:', salesError);
    return { success: false, error: 'Gagal mengambil laporan per produk' };
  }

  if (!sales || sales.length === 0) {
    return { success: true, data: [] };
  }

  const saleIds = sales.map((s) => s.id);

  const { data: items, error: itemsError } = await supabase
    .from('sale_items')
    .select('product_id, product_name_snapshot, quantity, unit_selling_price_snapshot, unit_cost_snapshot')
    .in('sale_id', saleIds);

  if (itemsError) {
    console.error('Error fetching sale items for product report:', itemsError);
    return { success: false, error: 'Gagal mengambil detail laporan per produk' };
  }

  // Kelompokkan per produk
  const productMap = new Map<string, ProductReportRow>();

  for (const item of items ?? []) {
    const existing = productMap.get(item.product_id);
    const revenue = item.quantity * item.unit_selling_price_snapshot;
    const profit = item.quantity * (item.unit_selling_price_snapshot - item.unit_cost_snapshot);

    if (existing) {
      existing.total_quantity += item.quantity;
      existing.total_revenue += revenue;
      existing.total_profit += profit;
    } else {
      productMap.set(item.product_id, {
        product_id: item.product_id,
        product_name: item.product_name_snapshot,
        total_quantity: item.quantity,
        total_revenue: revenue,
        total_profit: profit,
      });
    }
  }

  // Urutkan berdasarkan revenue tertinggi
  const result = Array.from(productMap.values()).sort(
    (a, b) => b.total_revenue - a.total_revenue
  );

  return { success: true, data: result };
}

/**
 * Transaksi detail dalam periode (untuk tabel laporan)
 */
export async function getReportTransactions(params: {
  start_date: string;
  end_date: string;
  page?: number;
  per_page?: number;
}): Promise<ActionResult<PaginatedResult<SaleWithTotals>>> {
  await requireAuth();

  const supabase = await createServerSupabaseClient();
  const { start_date, end_date, page = 1, per_page = 20 } = params;
  const offset = (page - 1) * per_page;

  const { data, error, count } = await supabase
    .from('sales_with_totals')
    .select('*', { count: 'exact' })
    .eq('status', 'completed')
    .gte('occurred_at', start_date)
    .lt('occurred_at', end_date)
    .order('occurred_at', { ascending: false })
    .range(offset, offset + per_page - 1);

  if (error) {
    console.error('Error fetching report transactions:', error);
    return { success: false, error: 'Gagal mengambil transaksi laporan' };
  }

  const total = count ?? 0;
  return {
    success: true,
    data: {
      data: (data as SaleWithTotals[]) ?? [],
      total,
      page,
      per_page,
      total_pages: Math.ceil(total / per_page),
    },
  };
}
