'use server';

import { createServerSupabaseClient } from '@/lib/supabase/server';
import { createSaleSchema, cancelSaleSchema } from '@/lib/validations/schemas';
import { validateNoDuplicateProducts } from '@/lib/validations/schemas';
import type { ActionResult, SaleWithTotals, SaleItem, PaginatedResult, CreateSaleResult, CancelSaleResult } from '@/types';
import { requireAuth } from './auth';

// ============================================================
// Sales Actions — Transaksi penjualan
// ============================================================

/**
 * Buat transaksi baru via RPC (atomik)
 */
export async function createSale(input: {
  buyer_name: string;
  occurred_at: string;
  notes?: string;
  idempotency_key?: string;
  items: { product_id: string; quantity: number }[];
}): Promise<ActionResult<CreateSaleResult>> {
  await requireAuth();

  // Validasi server-side
  const validation = createSaleSchema.safeParse(input);
  if (!validation.success) {
    const firstError = validation.error.issues[0];
    return { success: false, error: firstError?.message ?? 'Data transaksi tidak valid' };
  }

  // Cek duplikat produk
  const dupError = validateNoDuplicateProducts(validation.data.items);
  if (dupError) {
    return { success: false, error: dupError };
  }

  const supabase = await createServerSupabaseClient();

  // Panggil RPC create_sale (atomik di database)
  const { data, error } = await supabase.rpc('create_sale', {
    p_buyer_name: validation.data.buyer_name,
    p_occurred_at: validation.data.occurred_at,
    p_notes: validation.data.notes || null,
    p_idempotency_key: validation.data.idempotency_key || null,
    p_items: validation.data.items,
  });

  if (error) {
    console.error('Error creating sale:', error);
    // Parse pesan error dari PostgreSQL function
    const pgMessage = error.message || '';
    if (pgMessage.includes('stok') || pgMessage.includes('Stok')) {
      return { success: false, error: pgMessage };
    }
    if (pgMessage.includes('tidak aktif')) {
      return { success: false, error: pgMessage };
    }
    if (pgMessage.includes('tidak ditemukan')) {
      return { success: false, error: pgMessage };
    }
    if (pgMessage.includes('terduplikasi') || pgMessage.includes('duplikat')) {
      return { success: false, error: pgMessage };
    }
    return { success: false, error: 'Gagal menyimpan transaksi. Silakan coba lagi.' };
  }

  return { success: true, data: data as CreateSaleResult };
}

/**
 * Batalkan transaksi via RPC (atomik)
 */
export async function cancelSale(
  saleId: string,
  reason: string
): Promise<ActionResult<CancelSaleResult>> {
  await requireAuth();

  const validation = cancelSaleSchema.safeParse({ sale_id: saleId, reason });
  if (!validation.success) {
    const firstError = validation.error.issues[0];
    return { success: false, error: firstError?.message ?? 'Data pembatalan tidak valid' };
  }

  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase.rpc('cancel_sale', {
    p_sale_id: validation.data.sale_id,
    p_reason: validation.data.reason,
  });

  if (error) {
    console.error('Error cancelling sale:', error);
    const pgMessage = error.message || '';
    if (pgMessage.includes('sudah dibatalkan')) {
      return { success: false, error: pgMessage };
    }
    if (pgMessage.includes('tidak ditemukan')) {
      return { success: false, error: pgMessage };
    }
    return { success: false, error: 'Gagal membatalkan transaksi. Silakan coba lagi.' };
  }

  return { success: true, data: data as CancelSaleResult };
}

/**
 * Ambil daftar transaksi dengan filter dan pagination
 */
export async function getSales(params: {
  search?: string;
  status?: string;
  start_date?: string;
  end_date?: string;
  page?: number;
  per_page?: number;
}): Promise<ActionResult<PaginatedResult<SaleWithTotals>>> {
  await requireAuth();

  const supabase = await createServerSupabaseClient();
  const {
    search = '',
    status = 'all',
    start_date = '',
    end_date = '',
    page = 1,
    per_page = 20,
  } = params;
  const offset = (page - 1) * per_page;

  // Gunakan view sales_with_totals
  let query = supabase
    .from('sales_with_totals')
    .select('*', { count: 'exact' });

  // Filter pencarian (kode transaksi atau nama pembeli)
  if (search.trim()) {
    query = query.or(
      `transaction_code.ilike.%${search.trim()}%,buyer_name.ilike.%${search.trim()}%`
    );
  }

  // Filter status
  if (status && status !== 'all') {
    query = query.eq('status', status);
  }

  // Filter rentang tanggal
  if (start_date) {
    query = query.gte('occurred_at', start_date);
  }
  if (end_date) {
    query = query.lt('occurred_at', end_date);
  }

  // Urutkan dan pagination
  query = query
    .order('occurred_at', { ascending: false })
    .range(offset, offset + per_page - 1);

  const { data, error, count } = await query;

  if (error) {
    console.error('Error fetching sales:', error);
    return { success: false, error: 'Gagal mengambil data transaksi' };
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

/**
 * Ambil detail satu transaksi
 */
export async function getSaleById(id: string): Promise<ActionResult<SaleWithTotals>> {
  await requireAuth();

  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase
    .from('sales_with_totals')
    .select('*')
    .eq('id', id)
    .single();

  if (error || !data) {
    return { success: false, error: 'Transaksi tidak ditemukan' };
  }

  return { success: true, data: data as SaleWithTotals };
}

/**
 * Ambil item-item dalam satu transaksi
 */
export async function getSaleItems(saleId: string): Promise<ActionResult<SaleItem[]>> {
  await requireAuth();

  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase
    .from('sale_items')
    .select('*')
    .eq('sale_id', saleId)
    .order('created_at', { ascending: true });

  if (error) {
    console.error('Error fetching sale items:', error);
    return { success: false, error: 'Gagal mengambil detail item transaksi' };
  }

  return { success: true, data: (data as SaleItem[]) ?? [] };
}

/**
 * Ambil transaksi terbaru (untuk dashboard)
 */
export async function getRecentSales(limit: number = 5): Promise<ActionResult<SaleWithTotals[]>> {
  await requireAuth();

  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase
    .from('sales_with_totals')
    .select('*')
    .order('occurred_at', { ascending: false })
    .limit(limit);

  if (error) {
    console.error('Error fetching recent sales:', error);
    return { success: false, error: 'Gagal mengambil transaksi terbaru' };
  }

  return { success: true, data: (data as SaleWithTotals[]) ?? [] };
}
