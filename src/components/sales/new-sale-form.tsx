'use client';

import React, { useState } from 'react';
import {
  Plus,
  Trash2,
  ShoppingCart,
  Loader2,
  AlertCircle,
  CheckCircle2,
  User,
  Calendar,
  FileText,
} from 'lucide-react';
import { toast } from 'sonner';
import { createSale } from '@/app/actions/sales';
import { formatRupiah } from '@/lib/formatters';
import type { Product } from '@/types';

interface NewSaleFormProps {
  products: Product[];
  onSaleCreated: () => void;
}

interface SaleRow {
  productId: string;
  quantity: number;
}

export function NewSaleForm({ products, onSaleCreated }: NewSaleFormProps) {
  const activeProducts = products.filter((p) => p.is_active);

  // Form states
  const [buyerName, setBuyerName] = useState('');
  const [occurredAt, setOccurredAt] = useState(() => {
    // Current local ISO string without milliseconds
    const now = new Date();
    const tzOffset = now.getTimezoneOffset() * 60000;
    return new Date(now.getTime() - tzOffset).toISOString().slice(0, 16);
  });
  const [notes, setNotes] = useState('');
  const [rows, setRows] = useState<SaleRow[]>([
    {
      productId: activeProducts[0]?.id || '',
      quantity: 1,
    },
  ]);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Helper row management
  const handleAddRow = () => {
    // Find first product not yet in rows
    const usedIds = new Set(rows.map((r) => r.productId));
    const available = activeProducts.find((p) => !usedIds.has(p.id));
    setRows([
      ...rows,
      {
        productId: available?.id || activeProducts[0]?.id || '',
        quantity: 1,
      },
    ]);
  };

  const handleRemoveRow = (index: number) => {
    if (rows.length <= 1) return;
    setRows(rows.filter((_, idx) => idx !== index));
  };

  const handleRowChange = (index: number, field: keyof SaleRow, value: string | number) => {
    const updated = [...rows];
    updated[index] = { ...updated[index], [field]: value };
    setRows(updated);
  };

  // Calculations
  const calculatedRows = rows.map((row) => {
    const product = activeProducts.find((p) => p.id === row.productId);
    const sellingPrice = product?.selling_price || 0;
    const costPrice = product?.cost_price || 0;
    const subtotal = sellingPrice * row.quantity;
    const profit = (sellingPrice - costPrice) * row.quantity;
    const availableStock = product?.stock || 0;
    const isExceedingStock = row.quantity > availableStock;

    return {
      ...row,
      product,
      sellingPrice,
      subtotal,
      profit,
      availableStock,
      isExceedingStock,
    };
  });

  const totalRevenue = calculatedRows.reduce((sum, r) => sum + r.subtotal, 0);
  const totalProfit = calculatedRows.reduce((sum, r) => sum + r.profit, 0);
  const totalItemsCount = calculatedRows.reduce((sum, r) => sum + r.quantity, 0);

  // Check for duplicate products
  const productIds = rows.map((r) => r.productId).filter(Boolean);
  const hasDuplicates = new Set(productIds).size !== productIds.length;
  const hasExceedingStock = calculatedRows.some((r) => r.isExceedingStock);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!buyerName.trim()) {
      setError('Nama pembeli wajib diisi');
      return;
    }

    if (rows.length === 0 || !rows.some((r) => r.productId)) {
      setError('Pilih minimal satu produk');
      return;
    }

    if (hasDuplicates) {
      setError('Terdapat produk yang sama dalam beberapa baris. Silakan gabungkan jumlahnya.');
      return;
    }

    if (hasExceedingStock) {
      setError('Jumlah salah satu produk melebihi stok yang tersedia di gudang.');
      return;
    }

    setLoading(true);

    try {
      // Generate client-side idempotency UUID
      const idempotencyKey = crypto.randomUUID();

      const res = await createSale({
        buyer_name: buyerName.trim(),
        occurred_at: new Date(occurredAt).toISOString(),
        notes: notes.trim() || undefined,
        idempotency_key: idempotencyKey,
        items: rows.map((r) => ({
          product_id: r.productId,
          quantity: Number(r.quantity),
        })),
      });

      if (!res.success) {
        setError(res.error || 'Gagal menyimpan transaksi');
        return;
      }

      toast.success(
        `Transaksi ${res.data?.transaction_code || ''} berhasil dicatat! Total ${formatRupiah(totalRevenue)}`,
        { icon: <CheckCircle2 className="w-5 h-5 text-emerald-600" /> }
      );

      // Reset form
      setBuyerName('Pembeli langsung');
      setNotes('');
      setRows([{ productId: activeProducts[0]?.id || '', quantity: 1 }]);
      onSaleCreated();
    } catch {
      setError('Terjadi kendala saat menghubungi server');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
      <div className="p-6 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-slate-900">
            Form Catat Transaksi Baru
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Mencatat transaksi penjualan akan langsung memotong stok produk secara otomatis
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="p-6 space-y-6">
        {error && (
          <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-sm font-medium text-red-700 flex items-start gap-2.5">
            <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        {/* Section 1: Informasi Pelanggan & Waktu */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1 flex items-center gap-1.5">
              <User className="w-4 h-4 text-slate-400" />
              Nama Pembeli <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              required
              value={buyerName}
              onChange={(e) => setBuyerName(e.target.value)}
              placeholder="Contoh: Pak Budi"
              className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-900/20 focus:border-blue-900 transition-colors"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1 flex items-center gap-1.5">
              <Calendar className="w-4 h-4 text-slate-400" />
              Tanggal & Waktu Transaksi <span className="text-red-500">*</span>
            </label>
            <input
              type="date"
              required
              value={occurredAt}
              onChange={(e) => setOccurredAt(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-900/20 focus:border-blue-900 transition-colors bg-white"
            />
          </div>
        </div>

        {/* Section 2: Baris Produk */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <label className="block text-sm font-semibold text-slate-800">
              Daftar Barang Belanjaan <span className="text-red-500">*</span>
            </label>
            <span className="text-xs text-slate-500">
              {rows.length} jenis produk dipilih
            </span>
          </div>

          <div className="border border-slate-200 rounded-xl overflow-hidden divide-y divide-slate-100">
            {calculatedRows.map((row, idx) => (
              <div
                key={idx}
                className="p-4 bg-slate-50/30 flex flex-col sm:flex-row items-start sm:items-center gap-3 justify-between"
              >
                {/* Select Produk */}
                <div className="flex-1 w-full sm:w-auto">
                  <label className="block text-xs font-medium text-slate-500 mb-1 sm:hidden">
                    Produk
                  </label>
                  <select
                    value={row.productId}
                    onChange={(e) => handleRowChange(idx, 'productId', e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-900/20 focus:border-blue-900 bg-white"
                  >
                    {activeProducts.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Kuantitas Input */}
                <div className="flex items-center gap-2 w-full sm:w-auto">
                  <div className="w-28">
                    <label className="block text-xs font-medium text-slate-500 mb-1 sm:hidden">
                      Jumlah
                    </label>
                    <input
                      type="number"
                      min="1"
                      step="1"
                      value={row.quantity}
                      onChange={(e) =>
                        handleRowChange(idx, 'quantity', Math.max(1, parseInt(e.target.value) || 1))
                      }
                      className={`w-full px-3 py-2 rounded-lg border text-sm text-center font-bold focus:outline-none focus:ring-2 focus:ring-blue-900/20 ${row.isExceedingStock
                        ? 'border-rose-400 bg-rose-50 text-rose-800'
                        : 'border-slate-300 text-slate-900'
                        }`}
                    />
                  </div>
                  <span className="text-xs text-slate-500 font-medium whitespace-nowrap">
                    {row.product?.unit || 'unit'}
                  </span>
                </div>

                {/* Subtotal */}
                <div className="w-full sm:w-36 text-left sm:text-right">
                  <span className="text-xs text-slate-400 block sm:hidden">Subtotal</span>
                  <div className="text-sm font-bold text-slate-900 font-mono">
                    {formatRupiah(row.subtotal)}
                  </div>
                  <div className="text-[11px] text-emerald-600 font-medium">
                    Untung: {formatRupiah(row.profit)}
                  </div>
                </div>

                {/* Hapus Baris */}
                <div className="shrink-0 self-end sm:self-center">
                  <button
                    type="button"
                    onClick={() => handleRemoveRow(idx)}
                    disabled={rows.length <= 1}
                    className="p-2 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors disabled:opacity-30 disabled:hover:bg-transparent"
                    title="Hapus baris"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Tombol Tambah Produk Lain */}
          <div className="pt-1">
            <button
              type="button"
              onClick={handleAddRow}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg border border-dashed border-slate-300 hover:border-blue-900 text-slate-700 hover:text-blue-900 text-xs font-semibold transition-colors bg-white"
            >
              <Plus className="w-4 h-4" />
              Tambah Produk Lain
            </button>
          </div>

          {/* Peringatan jika stok melebihi batas */}
          {hasExceedingStock && (
            <p className="text-xs text-rose-600 font-medium flex items-center gap-1.5 mt-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              Jumlah pesanan melebihi stok yang tersedia. Harap kurangi jumlah barang.
            </p>
          )}

          {/* Peringatan duplikasi */}
          {hasDuplicates && (
            <p className="text-xs text-amber-600 font-medium flex items-center gap-1.5 mt-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              Produk yang sama terdaftar di beberapa baris. Harap pilih produk yang berbeda atau gabungkan jumlahnya.
            </p>
          )}
        </div>

        {/* Section 3: Catatan Transaksi */}
        <div>
          <label className="block text-sm font-semibold text-slate-700 mb-1 flex items-center gap-1.5">
            <FileText className="w-4 h-4 text-slate-400" />
            Catatan Tambahan (Opsional)
          </label>
          <input
            type="text"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Contoh: Titip di warung depan / Pembayaran transfer BCA / Galon diantar sore"
            className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-900/20 focus:border-blue-900 transition-colors"
          />
        </div>

        {/* Section 4: Ringkasan Total & Tombol Submit */}
        <div className="pt-4 border-t border-slate-200 flex flex-col md:flex-row items-center justify-between gap-4 bg-slate-50 p-5 rounded-xl">
          <div className="flex items-center gap-6 text-sm">
            <div>
              <span className="text-xs text-slate-500 block">Total Jumlah Item</span>
              <span className="text-base font-bold text-slate-800">
                {totalItemsCount} Unit
              </span>
            </div>
            <div>
              <span className="text-xs text-slate-500 block">Estimasi Keuntungan</span>
              <span className="text-base font-bold text-emerald-700">
                +{formatRupiah(totalProfit)}
              </span>
            </div>
            <div>
              <span className="text-xs text-slate-500 block">Total Belanja (Pemasukan)</span>
              <span className="text-2xl font-extrabold text-blue-950 font-mono">
                {formatRupiah(totalRevenue)}
              </span>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading || hasDuplicates || hasExceedingStock || rows.length === 0}
            className="w-full md:w-auto px-8 py-3 rounded-lg bg-blue-900 hover:bg-blue-800 text-white font-semibold text-base shadow-sm transition-colors flex items-center justify-center gap-2 min-h-[48px] disabled:opacity-50"
          >
            {loading ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <ShoppingCart className="w-5 h-5" />
            )}
            Simpan Transaksi
          </button>
        </div>
      </form>
    </div>
  );
}
