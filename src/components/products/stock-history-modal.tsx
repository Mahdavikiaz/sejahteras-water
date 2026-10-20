'use client';

import React, { useEffect, useState } from 'react';
import { X, Loader2, History, ArrowDown, ArrowUp, RefreshCw } from 'lucide-react';
import { getStockMovements } from '@/app/actions/products';
import { formatDateTime } from '@/lib/formatters';
import type { Product, StockMovement } from '@/types';

interface StockHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  product: Product | null;
}

export function StockHistoryModal({
  isOpen,
  onClose,
  product,
}: StockHistoryModalProps) {
  const [movements, setMovements] = useState<StockMovement[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen && product) {
      setLoading(true);
      getStockMovements(product.id)
        .then((res) => {
          if (res.success && res.data) {
            setMovements(res.data);
          } else {
            setMovements([]);
          }
        })
        .finally(() => setLoading(false));
    }
  }, [isOpen, product]);

  if (!isOpen || !product) return null;

  function getMovementLabel(type: StockMovement['movement_type']) {
    switch (type) {
      case 'opening':
        return { label: 'Stok Awal', color: 'bg-blue-50 text-blue-700 border-blue-200' };
      case 'sale':
        return { label: 'Penjualan', color: 'bg-rose-50 text-rose-700 border-rose-200' };
      case 'cancellation_return':
        return { label: 'Batal Transaksi', color: 'bg-emerald-50 text-emerald-700 border-emerald-200' };
      case 'adjustment':
        return { label: 'Penyesuaian Manual', color: 'bg-amber-50 text-amber-700 border-amber-200' };
      default:
        return { label: type, color: 'bg-slate-100 text-slate-700 border-slate-200' };
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[85vh]">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-blue-50 text-blue-900">
              <History className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900">
                Histori Pergerakan Stok
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Produk: <span className="font-semibold text-slate-700">{product.name}</span> (Stok saat ini: {product.stock} {product.unit})
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

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto flex-1">
          {loading ? (
            <div className="py-12 flex flex-col items-center justify-center text-slate-400">
              <Loader2 className="w-8 h-8 animate-spin text-blue-900 mb-2" />
              <p className="text-sm font-medium text-slate-600">Memuat catatan histori...</p>
            </div>
          ) : movements.length === 0 ? (
            <div className="py-12 text-center">
              <RefreshCw className="w-8 h-8 text-slate-300 mx-auto mb-2" />
              <p className="text-sm font-semibold text-slate-700">Belum Ada Catatan Stok</p>
              <p className="text-xs text-slate-500 mt-1">
                Catatan pergerakan stok akan dicatat otomatis saat ada penjualan atau penyesuaian manual.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-50 text-slate-600 text-xs uppercase tracking-wider">
                  <tr>
                    <th className="py-2.5 px-3 font-semibold">Waktu</th>
                    <th className="py-2.5 px-3 font-semibold">Jenis</th>
                    <th className="py-2.5 px-3 font-semibold text-center">Perubahan</th>
                    <th className="py-2.5 px-3 font-semibold text-center">Sebelum → Sesudah</th>
                    <th className="py-2.5 px-3 font-semibold">Alasan / Catatan</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs">
                  {movements.map((m) => {
                    const tag = getMovementLabel(m.movement_type);
                    const isPositive = m.quantity_delta > 0;
                    return (
                      <tr key={m.id} className="hover:bg-slate-50/70">
                        <td className="py-3 px-3 text-slate-600 font-medium whitespace-nowrap">
                          {formatDateTime(m.created_at)}
                        </td>
                        <td className="py-3 px-3">
                          <span
                            className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold border ${tag.color}`}
                          >
                            {tag.label}
                          </span>
                        </td>
                        <td className="py-3 px-3 text-center font-bold">
                          <span
                            className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded ${
                              isPositive
                                ? 'bg-emerald-50 text-emerald-700'
                                : 'bg-rose-50 text-rose-700'
                            }`}
                          >
                            {isPositive ? (
                              <ArrowUp className="w-3 h-3 inline" />
                            ) : (
                              <ArrowDown className="w-3 h-3 inline" />
                            )}
                            {isPositive ? `+${m.quantity_delta}` : m.quantity_delta}
                          </span>
                        </td>
                        <td className="py-3 px-3 text-center text-slate-600 font-mono">
                          {m.stock_before} → <span className="font-bold text-slate-800">{m.stock_after}</span>
                        </td>
                        <td className="py-3 px-3 text-slate-700 max-w-[200px] truncate" title={m.reason || ''}>
                          {m.reason || '-'}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-4 border-t border-slate-100 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold transition-colors min-h-[36px]"
          >
            Tutup
          </button>
        </div>
      </div>
    </div>
  );
}
