'use server';

import { createServerSupabaseClient } from '@/lib/supabase/server';
import { productSchema, type ProductSchemaType } from '@/lib/validations/schemas';
import type { ActionResult, Product, StockFilter, PaginatedResult } from '@/types';
import { LOW_STOCK_THRESHOLD } from '@/types';
import { requireAuth } from './auth';

// ============================================================
// Product Actions — CRUD produk & stok
// ============================================================

/**
 * Ambil daftar produk dengan filter, pencarian, dan pagination
 */
export async function getProducts(params: {
  search?: string;
  filter?: StockFilter;
  page?: number;
  per_page?: number;
}): Promise<ActionResult<PaginatedResult<Product>>> {
  await requireAuth();

  const supabase = await createServerSupabaseClient();
  const { search = '', filter = 'all', page = 1, per_page = 20 } = params;
  const offset = (page - 1) * per_page;

  // Build query
  let query = supabase.from('products').select('*', { count: 'exact' });

  // Filter pencarian
  if (search.trim()) {
    query = query.ilike('name', `%${search.trim()}%`);
  }

  // Filter status
  switch (filter) {
    case 'low_stock':
      query = query
        .gt('stock', 0)
        .lte('stock', LOW_STOCK_THRESHOLD)
        .eq('is_active', true);
      break;
    case 'out_of_stock':
      query = query.eq('stock', 0).eq('is_active', true);
      break;
    case 'active':
      query = query.eq('is_active', true);
      break;
    case 'inactive':
      query = query.eq('is_active', false);
      break;
    case 'all':
    default:
      break;
  }

  // Urutkan dan pagination
  query = query
    .order('created_at', { ascending: false })
    .range(offset, offset + per_page - 1);

  const { data, error, count } = await query;

  if (error) {
    console.error('Error fetching products:', error);
    return { success: false, error: 'Gagal mengambil data produk. Pastikan koneksi database sudah dikonfigurasi.' };
  }

  const total = count ?? 0;
  return {
    success: true,
    data: {
      data: (data as Product[]) ?? [],
      total,
      page,
      per_page,
      total_pages: Math.ceil(total / per_page),
    },
  };
}

/**
 * Ambil satu produk berdasarkan ID
 */
export async function getProductById(id: string): Promise<ActionResult<Product>> {
  await requireAuth();

  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase
    .from('products')
    .select('*')
    .eq('id', id)
    .single();

  if (error || !data) {
    return { success: false, error: 'Produk tidak ditemukan' };
  }

  return { success: true, data: data as Product };
}

/**
 * Ambil semua produk aktif (untuk dropdown transaksi)
 */
export async function getActiveProducts(): Promise<ActionResult<Product[]>> {
  await requireAuth();

  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase
    .from('products')
    .select('*')
    .eq('is_active', true)
    .order('name', { ascending: true });

  if (error) {
    console.error('Error fetching active products:', error);
    return { success: false, error: 'Gagal mengambil data produk aktif' };
  }

  return { success: true, data: (data as Product[]) ?? [] };
}

/**
 * Tambah produk baru
 */
export async function createProduct(input: ProductSchemaType): Promise<ActionResult<Product>> {
  await requireAuth();

  // Validasi server-side
  const validation = productSchema.safeParse(input);
  if (!validation.success) {
    const firstError = validation.error.issues[0];
    return { success: false, error: firstError?.message ?? 'Data produk tidak valid' };
  }

  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase
    .from('products')
    .insert({
      name: validation.data.name,
      category: validation.data.category || null,
      unit: validation.data.unit,
      stock: validation.data.stock,
      cost_price: validation.data.cost_price,
      selling_price: validation.data.selling_price,
      is_active: validation.data.is_active,
    })
    .select()
    .single();

  if (error) {
    console.error('Error creating product:', error);
    if (error.message.includes('duplicate')) {
      return { success: false, error: 'Produk dengan nama tersebut sudah ada' };
    }
    return { success: false, error: 'Gagal menambahkan produk. Silakan coba lagi.' };
  }

  // Catat stock movement jika stok awal > 0
  if (validation.data.stock > 0 && data) {
    await supabase.from('stock_movements').insert({
      product_id: data.id,
      movement_type: 'opening',
      quantity_delta: validation.data.stock,
      stock_before: 0,
      stock_after: validation.data.stock,
      reason: 'Stok awal saat produk dibuat',
    });
  }

  return { success: true, data: data as Product };
}

/**
 * Edit produk
 */
export async function updateProduct(
  id: string,
  input: Partial<ProductSchemaType>
): Promise<ActionResult<Product>> {
  await requireAuth();

  // Validasi partial — hanya field yang ada
  const updateData: Record<string, unknown> = {};

  if (input.name !== undefined) {
    if (!input.name.trim()) {
      return { success: false, error: 'Nama produk wajib diisi' };
    }
    updateData.name = input.name.trim();
  }
  if (input.category !== undefined) {
    updateData.category = input.category.trim() || null;
  }
  if (input.unit !== undefined) {
    if (!input.unit.trim()) {
      return { success: false, error: 'Satuan wajib diisi' };
    }
    updateData.unit = input.unit.trim();
  }
  if (input.cost_price !== undefined) {
    if (input.cost_price < 0 || !Number.isInteger(input.cost_price)) {
      return { success: false, error: 'Harga modal harus bilangan bulat dan tidak negatif' };
    }
    updateData.cost_price = input.cost_price;
  }
  if (input.selling_price !== undefined) {
    if (input.selling_price < 0 || !Number.isInteger(input.selling_price)) {
      return { success: false, error: 'Harga jual harus bilangan bulat dan tidak negatif' };
    }
    updateData.selling_price = input.selling_price;
  }
  if (input.is_active !== undefined) {
    updateData.is_active = input.is_active;
  }

  // Jangan izinkan update stok melalui fungsi ini (harus via adjust_stock)
  // stock dihapus dari updateData jika ada
  if (Object.keys(updateData).length === 0) {
    return { success: false, error: 'Tidak ada data yang diperbarui' };
  }

  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase
    .from('products')
    .update(updateData)
    .eq('id', id)
    .select()
    .single();

  if (error) {
    console.error('Error updating product:', error);
    return { success: false, error: 'Gagal memperbarui produk. Silakan coba lagi.' };
  }

  return { success: true, data: data as Product };
}

/**
 * Nonaktifkan produk (soft delete)
 */
export async function deactivateProduct(id: string): Promise<ActionResult> {
  await requireAuth();

  const supabase = await createServerSupabaseClient();
  const { error } = await supabase
    .from('products')
    .update({ is_active: false })
    .eq('id', id);

  if (error) {
    console.error('Error deactivating product:', error);
    return { success: false, error: 'Gagal menonaktifkan produk' };
  }

  return { success: true };
}

/**
 * Aktifkan kembali produk
 */
export async function activateProduct(id: string): Promise<ActionResult> {
  await requireAuth();

  const supabase = await createServerSupabaseClient();
  const { error } = await supabase
    .from('products')
    .update({ is_active: true })
    .eq('id', id);

  if (error) {
    console.error('Error activating product:', error);
    return { success: false, error: 'Gagal mengaktifkan produk' };
  }

  return { success: true };
}

/**
 * Penyesuaian stok manual via RPC (atomik)
 */
export async function adjustProductStock(
  productId: string,
  newStock: number,
  reason: string
): Promise<ActionResult> {
  await requireAuth();

  if (newStock < 0 || !Number.isInteger(newStock)) {
    return { success: false, error: 'Stok baru harus bilangan bulat dan tidak negatif' };
  }

  if (!reason.trim()) {
    return { success: false, error: 'Alasan penyesuaian stok wajib diisi' };
  }

  const supabase = await createServerSupabaseClient();
  const { error } = await supabase.rpc('adjust_stock', {
    p_product_id: productId,
    p_new_stock: newStock,
    p_reason: reason.trim(),
  });

  if (error) {
    console.error('Error adjusting stock:', error);
    return { success: false, error: error.message || 'Gagal menyesuaikan stok' };
  }

  return { success: true };
}

/**
 * Ambil daftar produk dengan stok menipis
 */
export async function getLowStockProducts(): Promise<ActionResult<Product[]>> {
  await requireAuth();

  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase
    .from('products')
    .select('*')
    .eq('is_active', true)
    .lte('stock', LOW_STOCK_THRESHOLD)
    .order('stock', { ascending: true })
    .limit(10);

  if (error) {
    console.error('Error fetching low stock products:', error);
    return { success: false, error: 'Gagal mengambil data produk stok menipis' };
  }

  return { success: true, data: (data as Product[]) ?? [] };
}

/**
 * Ambil histori pergerakan stok untuk satu produk
 */
export async function getStockMovements(productId: string): Promise<ActionResult<import('@/types').StockMovement[]>> {
  await requireAuth();

  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase
    .from('stock_movements')
    .select('*')
    .eq('product_id', productId)
    .order('created_at', { ascending: false })
    .limit(50);

  if (error) {
    console.error('Error fetching stock movements:', error);
    return { success: false, error: 'Gagal mengambil histori stok' };
  }

  return { success: true, data: data ?? [] };
}
