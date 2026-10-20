'use client';

import React, { useState } from 'react';
import { X, Loader2, Trash2, AlertTriangle, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import { deleteSale } from '@/app/actions/sales';
import { formatRupiah } from '@/lib/formatters';
import type { SaleWithTotals } from '@/types';

interface DeleteSaleModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  sale: SaleWithTotals | null;
}

export function DeleteSaleModal({
  isOpen,
  onClose,
  onSuccess,
  sale,
}: DeleteSaleModalProps) {
  const [restoreStock, setRestoreStock] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen || !sale) return null;

  const isCompleted = sale.status === 'completed';

  async function handleConfirm(e: React.FormEvent) {
    e.preventDefault();
    if (!sale) return;

    setLoading(true);
    setError(null);

    try {
      const res = await deleteSale(sale.id, isCompleted ? restoreStock : false);

      if (!res.success) {
        setError(res.error || 'Gagal menghapus transaksi');
        return;
      }

      toast.success(
        `Transaksi ${sale.transaction_code} berhasil dihapus permanen.`
      );
      setRestoreStock(false);
      onSuccess();
      onClose();
    } catch {
      setError('Terjadi kesalahan saat memproses penghapusan');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xl w-full max-w-md overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-red-50/60">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-red-100 text-red-700">
              <Trash2 className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">
                Hapus Data Transaksi
              </h2>
              <p className="text-xs text-red-700 font-semibold font-mono">
                {sale.transaction_code}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={loading}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleConfirm} className="p-6 space-y-4">
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-xs font-medium text-red-700 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Ringkasan Singkat Transaksi */}
          <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 text-xs text-slate-700 space-y-1.5">
            <div className="flex justify-between">
              <span className="text-slate-500">Pembeli:</span>
              <span className="font-semibold text-slate-900">{sale.buyer_name || 'Pembeli langsung'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Nilai Transaksi:</span>
              <span className="font-semibold text-slate-900 font-mono">{formatRupiah(sale.total_revenue ?? 0)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Status Saat Ini:</span>
              <span className={`font-semibold ${isCompleted ? 'text-emerald-700' : 'text-rose-700'}`}>
                {isCompleted ? 'Selesai' : 'Dibatalkan'}
              </span>
            </div>
          </div>

          {/* Penjelasan Tindakan */}
          {!isCompleted ? (
            <div className="p-3.5 bg-amber-50 rounded-xl border border-amber-200 text-xs text-amber-900 leading-relaxed flex items-start gap-2.5">
              <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold">Transaksi Sudah Dibatalkan</p>
                <p className="mt-0.5 text-amber-800">
                  Stok barang sudah otomatis dikembalikan saat transaksi dibatalkan. Menghapus transaksi ini akan membersihkan data riwayat ini secara permanen dari sistem.
                </p>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="p-3.5 bg-rose-50 rounded-xl border border-rose-200 text-xs text-rose-900 leading-relaxed flex items-start gap-2.5">
                <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold">Peringatan Penghapusan Transaksi</p>
                  <p className="mt-0.5 text-rose-800">
                    Menghapus transaksi berstatus <strong>Selesai</strong> akan menghilangkannya secara permanen dari histori transaksi dan perhitungan laporan pemasukan.
                  </p>
                </div>
              </div>

              {/* Opsi Kembalikan Stok */}
              <label className="flex items-start gap-2.5 p-3 rounded-xl border border-slate-200 hover:bg-slate-50 cursor-pointer transition-colors">
                <input
                  type="checkbox"
                  checked={restoreStock}
                  onChange={(e) => setRestoreStock(e.target.checked)}
                  className="mt-0.5 rounded border-slate-300 text-red-600 focus:ring-red-500"
                />
                <div className="text-xs">
                  <span className="font-semibold text-slate-900 block">
                    Kembalikan stok barang ke inventaris
                  </span>
                  <span className="text-slate-500 block mt-0.5">
                    Centang jika transaksi ini dihapus karena kesalahan input dan barang tidak jadi keluar. Jangan centang jika transaksi ini adalah transaksi lama yang barangnya memang sudah keluar.
                  </span>
                </div>
              </label>
            </div>
          )}

          {/* Buttons */}
          <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="px-4 py-2.5 rounded-lg border border-slate-300 text-slate-700 text-xs font-semibold hover:bg-slate-50 transition-colors min-h-[44px]"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-5 py-2.5 rounded-lg bg-red-600 hover:bg-red-700 text-white text-xs font-semibold shadow-sm transition-colors flex items-center gap-2 min-h-[44px] disabled:opacity-50"
            >
              {loading && <Loader2 className="w-4 h-4 animate-spin" />}
              Ya, Hapus Permanen
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
