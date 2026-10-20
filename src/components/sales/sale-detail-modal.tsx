'use client';

import React, { useEffect, useState } from 'react';
import { X, Loader2, Receipt, AlertCircle, Calendar, User, FileText, Ban, Trash2 } from 'lucide-react';
import { getSaleItems } from '@/app/actions/sales';
import { formatRupiah, formatDateTime } from '@/lib/formatters';
import type { SaleWithTotals, SaleItem } from '@/types';

interface SaleDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  sale: SaleWithTotals | null;
  onDelete?: (sale: SaleWithTotals) => void;
}

export function SaleDetailModal({
  isOpen,
  onClose,
  sale,
  onDelete,
}: SaleDetailModalProps) {
  const [items, setItems] = useState<SaleItem[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen && sale) {
      setLoading(true);
      getSaleItems(sale.id)
        .then((res) => {
          if (res.success && res.data) {
            setItems(res.data);
          } else {
            setItems([]);
          }
        })
        .finally(() => setLoading(false));
    }
  }, [isOpen, sale]);

  if (!isOpen || !sale) return null;

  const isCancelled = sale.status === 'cancelled';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xl w-full max-w-xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/50">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-blue-50 text-blue-900">
              <Receipt className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold text-slate-900">
                  {sale.transaction_code}
                </h2>
                {isCancelled ? (
                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-rose-50 text-rose-700 border border-rose-200">
                    Dibatalkan
                  </span>
                ) : (
                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                    Selesai
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500 mt-0.5 flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5" />
                {formatDateTime(sale.occurred_at)}
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

        {/* Body */}
        <div className="p-6 space-y-5 overflow-y-auto flex-1">
          {/* Info Pembeli & Catatan */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-3.5 bg-slate-50 rounded-xl border border-slate-200 text-xs">
            <div>
              <span className="text-slate-500 font-medium flex items-center gap-1">
                <User className="w-3.5 h-3.5" /> Nama Pembeli:
              </span>
              <span className="font-bold text-slate-900 text-sm mt-0.5 block">
                {sale.buyer_name || 'Pembeli langsung'}
              </span>
            </div>
            <div>
              <span className="text-slate-500 font-medium flex items-center gap-1">
                <FileText className="w-3.5 h-3.5" /> Catatan Transaksi:
              </span>
              <span className="text-slate-700 mt-0.5 block font-medium">
                {sale.notes || 'Tidak ada catatan'}
              </span>
            </div>
          </div>

          {/* Banner jika Dibatalkan */}
          {isCancelled && (
            <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-800 space-y-1">
              <div className="flex items-center gap-1.5 font-bold">
                <Ban className="w-4 h-4 text-rose-600" />
                Transaksi Ini Telah Dibatalkan
              </div>
              <p>
                Waktu Pembatalan: {sale.cancelled_at ? formatDateTime(sale.cancelled_at) : '-'}
              </p>
              <p>
                Alasan: <span className="font-semibold">{sale.cancellation_reason || '-'}</span>
              </p>
            </div>
          )}

          {/* Daftar Barang Belanja (Snapshot dari sale_items) */}
          <div>
            <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
              Rincian Item (Snapshot Harga Saat Transaksi)
            </h3>

            {loading ? (
              <div className="py-8 flex flex-col items-center justify-center text-slate-400">
                <Loader2 className="w-6 h-6 animate-spin text-blue-900 mb-2" />
                <p className="text-xs font-medium">Memuat rincian barang...</p>
              </div>
            ) : items.length === 0 ? (
              <p className="text-xs text-slate-500 py-4 text-center">
                Tidak ada data item tersimpan.
              </p>
            ) : (
              <div className="border border-slate-200 rounded-xl overflow-hidden divide-y divide-slate-100">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 text-slate-600 uppercase font-semibold">
                    <tr>
                      <th className="py-2.5 px-3">Produk</th>
                      <th className="py-2.5 px-3 text-center">Jumlah</th>
                      <th className="py-2.5 px-3 text-right">Harga Satuan</th>
                      <th className="py-2.5 px-3 text-right">Subtotal</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {items.map((it) => {
                      const itemSubtotal = it.quantity * it.unit_selling_price_snapshot;
                      return (
                        <tr key={it.id}>
                          <td className="py-3 px-3 font-semibold text-slate-900">
                            {it.product_name_snapshot}
                          </td>
                          <td className="py-3 px-3 text-center font-bold text-slate-800">
                            {it.quantity}
                          </td>
                          <td className="py-3 px-3 text-right text-slate-600 font-mono">
                            {formatRupiah(it.unit_selling_price_snapshot)}
                          </td>
                          <td className="py-3 px-3 text-right font-bold text-slate-900 font-mono">
                            {formatRupiah(itemSubtotal)}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Total & Keuntungan */}
          <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between">
            <div>
              <span className="text-xs text-slate-500 block">Total Keuntungan</span>
              <span className="text-sm font-bold text-emerald-700">
                +{formatRupiah(sale.total_profit ?? 0)}
              </span>
            </div>
            <div className="text-right">
              <span className="text-xs text-slate-500 block">Total Pembayaran</span>
              <span className="text-xl font-extrabold text-blue-950 font-mono">
                {formatRupiah(sale.total_revenue ?? 0)}
              </span>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-100 flex items-center justify-between">
          {onDelete ? (
            <button
              onClick={() => onDelete(sale)}
              className="px-3.5 py-2 rounded-lg border border-red-200 text-red-600 hover:bg-red-50 text-xs font-semibold transition-colors flex items-center gap-1.5 min-h-[40px]"
            >
              <Trash2 className="w-4 h-4" />
              Hapus Transaksi
            </button>
          ) : <div />}
          <button
            onClick={onClose}
            className="px-5 py-2.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold transition-colors min-h-[40px]"
          >
            Tutup Rincian
          </button>
        </div>
      </div>
    </div>
  );
}
