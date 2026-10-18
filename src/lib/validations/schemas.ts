import { z } from 'zod';

// ============================================================
// AgenKu — Skema Validasi (Zod)
// Pesan error dalam Bahasa Indonesia
// ============================================================

// ---- Produk ----
export const productSchema = z.object({
  name: z
    .string()
    .min(1, 'Nama produk wajib diisi')
    .max(200, 'Nama produk maksimal 200 karakter')
    .transform((v) => v.trim()),
  category: z
    .string()
    .max(100, 'Kategori maksimal 100 karakter')
    .transform((v) => v.trim())
    .optional()
    .default(''),
  unit: z
    .string()
    .min(1, 'Satuan wajib diisi')
    .max(50, 'Satuan maksimal 50 karakter')
    .transform((v) => v.trim())
    .default('pcs'),
  stock: z
    .number({ invalid_type_error: 'Stok harus berupa angka' })
    .int('Stok harus bilangan bulat')
    .min(0, 'Stok tidak boleh negatif'),
  cost_price: z
    .number({ invalid_type_error: 'Harga modal harus berupa angka' })
    .int('Harga modal harus bilangan bulat (rupiah)')
    .min(0, 'Harga modal tidak boleh negatif'),
  selling_price: z
    .number({ invalid_type_error: 'Harga jual harus berupa angka' })
    .int('Harga jual harus bilangan bulat (rupiah)')
    .min(0, 'Harga jual tidak boleh negatif'),
  is_active: z.boolean().default(true),
});

export type ProductSchemaType = z.infer<typeof productSchema>;

// Validasi tambahan: peringatan jika harga jual < harga modal
export function validatePriceWarning(costPrice: number, sellingPrice: number): string | null {
  if (sellingPrice < costPrice) {
    return 'Harga jual lebih rendah dari harga modal. Transaksi akan menghasilkan keuntungan negatif.';
  }
  return null;
}

// ---- Item Transaksi ----
export const saleItemSchema = z.object({
  product_id: z.string().uuid('ID produk tidak valid'),
  quantity: z
    .number({ invalid_type_error: 'Jumlah harus berupa angka' })
    .int('Jumlah harus bilangan bulat')
    .min(1, 'Jumlah minimal 1'),
});

export type SaleItemSchemaType = z.infer<typeof saleItemSchema>;

// ---- Transaksi ----
export const createSaleSchema = z.object({
  buyer_name: z
    .string()
    .min(1, 'Nama pembeli wajib diisi')
    .max(200, 'Nama pembeli maksimal 200 karakter')
    .transform((v) => v.trim()),
  occurred_at: z
    .string()
    .min(1, 'Tanggal transaksi wajib diisi'),
  notes: z
    .string()
    .max(1000, 'Catatan maksimal 1000 karakter')
    .transform((v) => v.trim())
    .optional()
    .default(''),
  idempotency_key: z.string().uuid().optional(),
  items: z
    .array(saleItemSchema)
    .min(1, 'Transaksi harus memiliki minimal 1 item produk'),
});

export type CreateSaleSchemaType = z.infer<typeof createSaleSchema>;

// Validasi tambahan: cek duplikat product_id
export function validateNoDuplicateProducts(items: SaleItemSchemaType[]): string | null {
  const productIds = items.map((item) => item.product_id);
  const uniqueIds = new Set(productIds);
  if (uniqueIds.size !== productIds.length) {
    return 'Terdapat produk yang sama dalam beberapa baris. Gabungkan kuantitas menjadi satu baris.';
  }
  return null;
}

// ---- Pembatalan Transaksi ----
export const cancelSaleSchema = z.object({
  sale_id: z.string().uuid('ID transaksi tidak valid'),
  reason: z
    .string()
    .min(1, 'Alasan pembatalan wajib diisi')
    .max(500, 'Alasan pembatalan maksimal 500 karakter')
    .transform((v) => v.trim()),
});

export type CancelSaleSchemaType = z.infer<typeof cancelSaleSchema>;

// ---- Penyesuaian Stok ----
export const adjustStockSchema = z.object({
  product_id: z.string().uuid('ID produk tidak valid'),
  new_stock: z
    .number({ invalid_type_error: 'Stok baru harus berupa angka' })
    .int('Stok baru harus bilangan bulat')
    .min(0, 'Stok baru tidak boleh negatif'),
  reason: z
    .string()
    .min(1, 'Alasan penyesuaian wajib diisi')
    .max(500, 'Alasan penyesuaian maksimal 500 karakter')
    .transform((v) => v.trim()),
});

export type AdjustStockSchemaType = z.infer<typeof adjustStockSchema>;

// ---- Filter Laporan ----
export const reportFilterSchema = z.object({
  start_date: z.string().min(1, 'Tanggal awal wajib diisi'),
  end_date: z.string().min(1, 'Tanggal akhir wajib diisi'),
});

export type ReportFilterSchemaType = z.infer<typeof reportFilterSchema>;

// ---- Pencarian & Pagination ----
export const searchParamsSchema = z.object({
  search: z.string().optional().default(''),
  filter: z.enum(['all', 'low_stock', 'out_of_stock', 'active', 'inactive']).optional().default('all'),
  page: z.coerce.number().int().min(1).optional().default(1),
  per_page: z.coerce.number().int().min(1).max(100).optional().default(20),
});

export type SearchParamsSchemaType = z.infer<typeof searchParamsSchema>;

// ---- Pencarian Transaksi ----
export const salesSearchSchema = z.object({
  search: z.string().optional().default(''),
  status: z.enum(['all', 'completed', 'cancelled']).optional().default('all'),
  start_date: z.string().optional().default(''),
  end_date: z.string().optional().default(''),
  page: z.coerce.number().int().min(1).optional().default(1),
  per_page: z.coerce.number().int().min(1).max(100).optional().default(20),
});

export type SalesSearchSchemaType = z.infer<typeof salesSearchSchema>;
