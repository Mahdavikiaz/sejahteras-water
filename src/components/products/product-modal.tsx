'use client';

import React, { useState, useEffect } from 'react';
import { X, Loader2, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import { createProduct, updateProduct } from '@/app/actions/products';
import { PRODUCT_CATEGORIES, PRODUCT_UNITS, type Product } from '@/types';
import { formatRupiah } from '@/lib/formatters';

interface ProductModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  initialProduct?: Product | null;
}

export function ProductModal({
  isOpen,
  onClose,
  onSuccess,
  initialProduct,
}: ProductModalProps) {
  const isEditing = !!initialProduct;

  const [name, setName] = useState('');
  const [category, setCategory] = useState<string>('Air Minum');
  const [unit, setUnit] = useState<string>('galon');
  const [stock, setStock] = useState<number>(0);
  const [costPrice, setCostPrice] = useState<number>(0);
  const [sellingPrice, setSellingPrice] = useState<number>(0);
  const [isActive, setIsActive] = useState<boolean>(true);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Sync state on open / initialProduct change
  useEffect(() => {
    if (initialProduct) {
      setName(initialProduct.name);
      setCategory(initialProduct.category || 'Air Minum');
      setUnit(initialProduct.unit || 'galon');
      setStock(initialProduct.stock);
      setCostPrice(initialProduct.cost_price);
      setSellingPrice(initialProduct.selling_price);
      setIsActive(initialProduct.is_active);
    } else {
      setName('');
      setCategory('Air Minum');
      setUnit('galon');
      setStock(0);
      setCostPrice(0);
      setSellingPrice(0);
      setIsActive(true);
    }
    setError(null);
  }, [initialProduct, isOpen]);

  if (!isOpen) return null;

  const profitPerUnit = sellingPrice - costPrice;
  const isNegativeProfit = profitPerUnit < 0;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!name.trim()) {
      setError('Nama produk wajib diisi');
      return;
    }
    if (costPrice < 0) {
      setError('Harga modal tidak boleh negatif');
      return;
    }
    if (sellingPrice < 0) {
      setError('Harga jual tidak boleh negatif');
      return;
    }
    if (!isEditing && stock < 0) {
      setError('Stok awal tidak boleh negatif');
      return;
    }

    setLoading(true);

    try {
      if (isEditing && initialProduct) {
        const res = await updateProduct(initialProduct.id, {
          name: name.trim(),
          category: category.trim(),
          unit: unit.trim(),
          cost_price: Number(costPrice),
          selling_price: Number(sellingPrice),
          is_active: isActive,
        });

        if (!res.success) {
          setError(res.error || 'Gagal memperbarui produk');
          return;
        }

        toast.success(`Produk "${name}" berhasil diperbarui`);
      } else {
        const res = await createProduct({
          name: name.trim(),
          category: category.trim(),
          unit: unit.trim(),
          stock: Number(stock),
          cost_price: Number(costPrice),
          selling_price: Number(sellingPrice),
          is_active: true,
        });

        if (!res.success) {
          setError(res.error || 'Gagal menambahkan produk');
          return;
        }

        toast.success(`Produk "${name}" berhasil ditambahkan`);
      }

      onSuccess();
      onClose();
    } catch {
      setError('Terjadi kesalahan saat memproses data');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <div>
            <h2 className="text-lg font-bold text-slate-900">
              {isEditing ? 'Edit Data Produk' : 'Tambah Produk Baru'}
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              {isEditing
                ? 'Perbarui rincian informasi produk dan harga jual'
                : 'Daftarkan produk baru untuk mulai dicatat transaksinya'}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body / Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto">
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-xs font-medium text-red-700 flex items-start gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {/* Nama Produk */}
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1">
              Nama Produk <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Contoh: Galon Aqua 19L / Gas Elpiji 3kg"
              className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-900/20 focus:border-blue-900 transition-colors"
            />
          </div>

          {/* Kategori & Satuan */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1">
                Kategori
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-900/20 focus:border-blue-900 transition-colors bg-white"
              >
                {PRODUCT_CATEGORIES.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1">
                Satuan <span className="text-red-500">*</span>
              </label>
              <select
                value={unit}
                onChange={(e) => setUnit(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-900/20 focus:border-blue-900 transition-colors bg-white"
              >
                {PRODUCT_UNITS.map((u) => (
                  <option key={u} value={u}>
                    {u}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Stok Awal (hanya saat buat baru, jika edit pakai modal penyesuaian stok) */}
          {!isEditing ? (
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1">
                Stok Awal Saat Ini <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                min="0"
                step="1"
                required
                value={stock === 0 ? '' : stock}
                onChange={(e) => setStock(Math.max(0, parseInt(e.target.value) || 0))}
                placeholder="0"
                className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-900/20 focus:border-blue-900 transition-colors"
              />
              <p className="text-xs text-slate-500 mt-1">
                Jumlah unit yang siap dijual saat ini di toko/gudang.
              </p>
            </div>
          ) : (
            <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 flex items-center justify-between">
              <div>
                <span className="text-xs text-slate-500 block font-medium">Stok Saat Ini</span>
                <span className="text-base font-bold text-slate-800">
                  {initialProduct?.stock} {initialProduct?.unit}
                </span>
              </div>
              <p className="text-xs text-slate-500 max-w-[200px] text-right">
                Perubahan stok manual dicatat via menu &quot;Sesuaikan Stok&quot; agar histori tetap rapi.
              </p>
            </div>
          )}

          {/* Harga Modal & Harga Jual */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1">
                Harga Modal (Rp) <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                min="0"
                step="500"
                required
                value={costPrice === 0 ? '' : costPrice}
                onChange={(e) => setCostPrice(Math.max(0, parseInt(e.target.value) || 0))}
                placeholder="Contoh: 14000"
                className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-900/20 focus:border-blue-900 transition-colors"
              />
              <span className="text-xs text-slate-500 mt-1 block">
                {costPrice > 0 ? formatRupiah(costPrice) : 'Rp0'}
              </span>
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1">
                Harga Jual (Rp) <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                min="0"
                step="500"
                required
                value={sellingPrice === 0 ? '' : sellingPrice}
                onChange={(e) => setSellingPrice(Math.max(0, parseInt(e.target.value) || 0))}
                placeholder="Contoh: 19000"
                className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-900/20 focus:border-blue-900 transition-colors"
              />
              <span className="text-xs text-slate-500 mt-1 block">
                {sellingPrice > 0 ? formatRupiah(sellingPrice) : 'Rp0'}
              </span>
            </div>
          </div>

          {/* Perhitungan Otomatis Keuntungan per Unit */}
          <div
            className={`p-3.5 rounded-xl border flex items-center justify-between ${
              isNegativeProfit
                ? 'bg-rose-50 border-rose-200 text-rose-800'
                : 'bg-emerald-50 border-emerald-200 text-emerald-800'
            }`}
          >
            <div>
              <span className="text-xs font-semibold uppercase tracking-wider block">
                Keuntungan per Unit
              </span>
              <span className="text-lg font-bold">
                {formatRupiah(profitPerUnit)}
              </span>
            </div>
            {isNegativeProfit && (
              <span className="text-xs font-medium bg-rose-100 text-rose-700 px-2.5 py-1 rounded-md">
                Peringatan: Harga jual di bawah modal!
              </span>
            )}
          </div>

          {/* Status Aktif jika mode edit */}
          {isEditing && (
            <div className="pt-2">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={isActive}
                  onChange={(e) => setIsActive(e.target.checked)}
                  className="w-4 h-4 rounded text-blue-900 focus:ring-blue-900 border-slate-300"
                />
                <span className="text-sm font-semibold text-slate-800">
                  Produk Aktif (Tersedia untuk Transaksi Baru)
                </span>
              </label>
            </div>
          )}

          {/* Modal Footer */}
          <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="px-4 py-2.5 rounded-lg border border-slate-300 text-slate-700 text-sm font-medium hover:bg-slate-50 transition-colors min-h-[44px]"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-5 py-2.5 rounded-lg bg-blue-900 hover:bg-blue-800 text-white text-sm font-semibold shadow-sm transition-colors flex items-center gap-2 min-h-[44px] disabled:opacity-50"
            >
              {loading && <Loader2 className="w-4 h-4 animate-spin" />}
              {isEditing ? 'Simpan Perubahan' : 'Tambah Produk'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
