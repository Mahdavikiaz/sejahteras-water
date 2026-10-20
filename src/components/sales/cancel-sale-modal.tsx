'use client';

import React, { useState } from 'react';
import { X, Loader2, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';
import { cancelSale } from '@/app/actions/sales';
import type { SaleWithTotals } from '@/types';

interface CancelSaleModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  sale: SaleWithTotals | null;
}

export function CancelSaleModal({
  isOpen,
  onClose,
  onSuccess,
  sale,
}: CancelSaleModalProps) {
  const [reason, setReason] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen || !sale) return null;

  async function handleConfirm(e: React.FormEvent) {
    e.preventDefault();
    if (!sale) return;

    if (!reason.trim()) {
      setError('Alasan pembatalan wajib diisi');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await cancelSale(sale.id, reason.trim());

      if (!res.success) {
        setError(res.error || 'Gagal membatalkan transaksi');
        return;
      }

      toast.success(
        `Transaksi ${sale.transaction_code} berhasil dibatalkan dan seluruh stok barang telah dikembalikan secara otomatis.`
      );
      setReason('');
      onSuccess();
      onClose();
    } catch {
      setError('Terjadi kesalahan saat memproses pembatalan');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xl w-full max-w-md overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-rose-50/50">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-rose-100 text-rose-700">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">
                Batalkan Transaksi
              </h2>
              <p className="text-xs text-rose-700 font-medium">
                {sale.transaction_code}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleConfirm} className="p-6 space-y-4">
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-xs font-medium text-red-700">
              {error}
            </div>
          )}

          <div className="p-3.5 bg-amber-50 rounded-xl border border-amber-200 text-xs text-amber-900 leading-relaxed">
            <p className="font-bold">Konfirmasi Pengembalian Stok:</p>
            <p className="mt-1">
              Membatalkan transaksi ini akan secara otomatis <strong>mengembalikan seluruh kuantitas stok barang</strong> ke gudang dan mengecualikan transaksi dari total pemasukan serta laporan keuangan.
            </p>
          </div>

          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1">
              Alasan Pembatalan <span className="text-red-500">*</span>
            </label>
            <textarea
              required
              rows={3}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Contoh: Pembeli salah pesan produk / Transaksi salah input jumlah barang / Pembeli membatalkan pesanan"
              className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 transition-colors"
            />
          </div>

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
              disabled={loading || !reason.trim()}
              className="px-5 py-2.5 rounded-lg bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold shadow-sm transition-colors flex items-center gap-2 min-h-[44px] disabled:opacity-50"
            >
              {loading && <Loader2 className="w-4 h-4 animate-spin" />}
              Ya, Batalkan Transaksi
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
