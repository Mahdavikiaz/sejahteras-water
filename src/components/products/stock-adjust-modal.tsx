'use client';

import React, { useState, useEffect } from 'react';
import { X, Loader2, AlertCircle, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';
import { adjustProductStock } from '@/app/actions/products';
import { type Product } from '@/types';

interface StockAdjustModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  product: Product | null;
}

export function StockAdjustModal({
  isOpen,
  onClose,
  onSuccess,
  product,
}: StockAdjustModalProps) {
  const [newStock, setNewStock] = useState<number>(0);
  const [reason, setReason] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (product) {
      setNewStock(product.stock);
      setReason('');
      setError(null);
    }
  }, [product, isOpen]);

  if (!isOpen || !product) return null;

  const currentStock = product.stock;
  const delta = newStock - currentStock;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!product) return;

    if (newStock < 0) {
      setError('Stok baru tidak boleh negatif');
      return;
    }
    if (!reason.trim()) {
      setError('Alasan penyesuaian stok wajib diisi');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await adjustProductStock(product.id, newStock, reason.trim());

      if (!res.success) {
        setError(res.error || 'Gagal menyesuaikan stok');
        return;
      }

      toast.success(
        `Stok "${product.name}" berhasil disesuaikan dari ${currentStock} menjadi ${newStock} ${product.unit}`
      );
      onSuccess();
      onClose();
    } catch {
      setError('Terjadi kesalahan saat menyesuaikan stok');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xl w-full max-w-md overflow-hidden flex flex-col">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <div>
            <h2 className="text-lg font-bold text-slate-900">
              Penyesuaian Stok Manual
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Ubah jumlah stok secara resmi dengan mencatat alasan
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-xs font-medium text-red-700 flex items-start gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {/* Info Produk */}
          <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block">
              Produk yang Dipilih
            </span>
            <p className="text-base font-bold text-slate-900 mt-0.5">
              {product.name}
            </p>
            <div className="flex items-center gap-2 mt-2 text-xs text-slate-600 font-medium">
              <span>Stok saat ini di sistem:</span>
              <span className="px-2 py-0.5 rounded bg-white border border-slate-300 font-bold text-slate-800">
                {currentStock} {product.unit}
              </span>
            </div>
          </div>

          {/* Input Stok Baru */}
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1">
              Jumlah Stok Baru Aktual <span className="text-red-500">*</span>
            </label>
            <input
              type="number"
              min="0"
              step="1"
              required
              value={newStock}
              onChange={(e) => setNewStock(Math.max(0, parseInt(e.target.value) || 0))}
              className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-900/20 focus:border-blue-900 transition-colors"
            />
            {/* Delta Indicator */}
            <div className="mt-2 flex items-center justify-between text-xs">
              <span className="text-slate-500">Perubahan stok:</span>
              <span
                className={`font-bold px-2 py-0.5 rounded ${
                  delta > 0
                    ? 'bg-emerald-50 text-emerald-700'
                    : delta < 0
                    ? 'bg-rose-50 text-rose-700'
                    : 'bg-slate-100 text-slate-600'
                }`}
              >
                {delta > 0 ? `+${delta}` : delta} {product.unit}
              </span>
            </div>
          </div>

          {/* Input Alasan */}
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1">
              Alasan Penyesuaian <span className="text-red-500">*</span>
            </label>
            <textarea
              required
              rows={3}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Contoh: Barang masuk kiriman supplier 20 galon / Tabung gas bocor / Koreksi opname fisik"
              className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-900/20 focus:border-blue-900 transition-colors"
            />
            <p className="text-xs text-slate-500 mt-1">
              Alasan ini akan tersimpan permanen di riwayat pergerakan stok.
            </p>
          </div>

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
              disabled={loading || delta === 0}
              className="px-5 py-2.5 rounded-lg bg-blue-900 hover:bg-blue-800 text-white text-sm font-semibold shadow-sm transition-colors flex items-center gap-2 min-h-[44px] disabled:opacity-50"
            >
              {loading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <RefreshCw className="w-4 h-4" />
              )}
              Terapkan Penyesuaian
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
