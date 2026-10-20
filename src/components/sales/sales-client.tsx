'use client';

import React, { useState, useEffect, useTransition } from 'react';
import { useSearchParams } from 'next/navigation';
import {
  ShoppingCart,
  History,
  Search,
  Filter,
  Eye,
  Ban,
  Calendar,
  Loader2,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react';
import { getSales } from '@/app/actions/sales';
import { NewSaleForm } from './new-sale-form';
import { SaleDetailModal } from './sale-detail-modal';
import { CancelSaleModal } from './cancel-sale-modal';
import { formatRupiah, formatDateTime, getTodayStart, getTodayEnd } from '@/lib/formatters';
import type { Product, SaleWithTotals } from '@/types';

interface SalesClientProps {
  products: Product[];
  initialSales: SaleWithTotals[];
  initialTotal: number;
}

export function SalesClient({
  products,
  initialSales,
  initialTotal,
}: SalesClientProps) {
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  // Active Tab: 'new' | 'history'
  const [activeTab, setActiveTab] = useState<'new' | 'history'>(() => {
    return searchParams.get('baru') === '1' ? 'new' : 'history';
  });

  const [sales, setSales] = useState<SaleWithTotals[]>(initialSales);
  const [total, setTotal] = useState<number>(initialTotal);

  // Filters
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<string>('all');
  const [dateRangeFilter, setDateRangeFilter] = useState<'all' | 'today'>('all');
  const [page, setPage] = useState(1);

  // Modals
  const [selectedSaleDetail, setSelectedSaleDetail] = useState<SaleWithTotals | null>(null);
  const [selectedSaleCancel, setSelectedSaleCancel] = useState<SaleWithTotals | null>(null);

  // Sync tab if URL changes
  useEffect(() => {
    if (searchParams.get('baru') === '1') {
      setActiveTab('new');
    }
  }, [searchParams]);

  // Load sales with filters
  const loadSales = (
    currentSearch = search,
    currentStatus = status,
    currentDateRange = dateRangeFilter,
    currentPage = page
  ) => {
    startTransition(async () => {
      let startDate: string | undefined = undefined;
      let endDate: string | undefined = undefined;

      if (currentDateRange === 'today') {
        startDate = getTodayStart();
        endDate = getTodayEnd();
      }

      const res = await getSales({
        search: currentSearch,
        status: currentStatus,
        start_date: startDate,
        end_date: endDate,
        page: currentPage,
        per_page: 20,
      });

      if (res.success && res.data) {
        setSales(res.data.data);
        setTotal(res.data.total);
      }
    });
  };

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setSearch(val);
    setPage(1);
    loadSales(val, status, dateRangeFilter, 1);
  };

  const handleStatusChange = (newStatus: string) => {
    setStatus(newStatus);
    setPage(1);
    loadSales(search, newStatus, dateRangeFilter, 1);
  };

  const handleDateFilterChange = (range: 'all' | 'today') => {
    setDateRangeFilter(range);
    setPage(1);
    loadSales(search, status, range, 1);
  };

  const handleSaleCreated = () => {
    setActiveTab('history');
    loadSales();
  };

  return (
    <div className="space-y-6">
      {/* Page Header with Tab Switcher */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
            Transaksi Penjualan
          </h1>
          <p className="mt-1 text-sm text-slate-600">
            Catat penjualan barang dan lihat histori transaksi operasional
          </p>
        </div>

        {/* Tab Buttons */}
        <div className="inline-flex p-1 bg-slate-200/70 rounded-xl">
          <button
            onClick={() => setActiveTab('history')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all min-h-[38px] ${activeTab === 'history'
                ? 'bg-white text-blue-900 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
              }`}
          >
            <History className="w-4 h-4" />
            Riwayat Transaksi
          </button>
          <button
            onClick={() => setActiveTab('new')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all min-h-[38px] ${activeTab === 'new'
                ? 'bg-blue-900 text-white shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
              }`}
          >
            <ShoppingCart className="w-4 h-4" />
            Catat Transaksi Baru
          </button>
        </div>
      </div>

      {/* Tab 1: Form Catat Transaksi Baru */}
      {activeTab === 'new' && (
        <NewSaleForm
          products={products}
          onSaleCreated={handleSaleCreated}
        />
      )}

      {/* Tab 2: Riwayat Transaksi */}
      {activeTab === 'history' && (
        <div className="space-y-4">
          {/* Filter Bar */}
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm space-y-4">
            <div className="flex flex-col md:flex-row md:items-center gap-4 justify-between">
              {/* Search box */}
              <div className="relative flex-1 max-w-md">
                <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={search}
                  onChange={handleSearchChange}
                  placeholder="Cari kode transaksi atau nama pembeli..."
                  className="w-full pl-10 pr-4 py-2 rounded-lg border border-slate-300 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-900/20 focus:border-blue-900 transition-colors"
                />
              </div>

              {/* Filters */}
              <div className="flex flex-wrap items-center gap-2">
                {/* Date range filter */}
                <div className="inline-flex rounded-lg border border-slate-200 p-0.5 bg-slate-50">
                  <button
                    onClick={() => handleDateFilterChange('all')}
                    className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${dateRangeFilter === 'all'
                        ? 'bg-white text-slate-900 shadow-xs font-semibold'
                        : 'text-slate-600 hover:text-slate-900'
                      }`}
                  >
                    Semua Waktu
                  </button>
                  <button
                    onClick={() => handleDateFilterChange('today')}
                    className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${dateRangeFilter === 'today'
                        ? 'bg-white text-slate-900 shadow-xs font-semibold'
                        : 'text-slate-600 hover:text-slate-900'
                      }`}
                  >
                    Hari Ini
                  </button>
                </div>

                {/* Status filter */}
                <select
                  value={status}
                  onChange={(e) => handleStatusChange(e.target.value)}
                  className="px-3 py-1.5 rounded-lg border border-slate-300 text-xs font-semibold text-slate-700 bg-white focus:outline-none focus:ring-2 focus:ring-blue-900/20"
                >
                  <option value="all">Semua Status</option>
                  <option value="completed">Selesai</option>
                  <option value="cancelled">Dibatalkan</option>
                </select>
              </div>
            </div>
          </div>

          {/* Sales Table */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            {isPending ? (
              <div className="py-16 flex flex-col items-center justify-center text-slate-400">
                <Loader2 className="w-8 h-8 animate-spin text-blue-900 mb-2" />
                <p className="text-sm font-medium text-slate-600">Memuat riwayat transaksi...</p>
              </div>
            ) : sales.length === 0 ? (
              <div className="p-12 text-center">
                <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center mx-auto text-slate-400 mb-3">
                  <ShoppingCart className="w-6 h-6" />
                </div>
                <p className="text-base font-semibold text-slate-800">
                  Tidak Ada Transaksi yang Ditemukan
                </p>
                <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                  {search || status !== 'all' || dateRangeFilter !== 'all'
                    ? 'Tidak ada transaksi yang cocok dengan kata kunci atau filter yang Anda pilih.'
                    : 'Belum ada transaksi yang tercatat di sistem.'}
                </p>
                <div className="mt-5">
                  <button
                    onClick={() => setActiveTab('new')}
                    className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-blue-900 hover:bg-blue-800 text-white text-xs font-semibold shadow-sm transition-colors"
                  >
                    <ShoppingCart className="w-4 h-4" />
                    Catat Transaksi Sekarang
                  </button>
                </div>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="bg-slate-50 text-slate-600 text-xs uppercase tracking-wider border-b border-slate-200">
                    <tr>
                      <th className="py-3 px-4 font-semibold">Kode & Tanggal</th>
                      <th className="py-3 px-4 font-semibold">Pembeli</th>
                      <th className="py-3 px-4 font-semibold text-center">Item</th>
                      <th className="py-3 px-4 font-semibold text-right">Pemasukan</th>
                      <th className="py-3 px-4 font-semibold text-right">Keuntungan</th>
                      <th className="py-3 px-4 font-semibold text-center">Status</th>
                      <th className="py-3 px-4 font-semibold text-center">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {sales.map((s) => {
                      const isCompleted = s.status === 'completed';
                      return (
                        <tr
                          key={s.id}
                          className={`hover:bg-slate-50/70 transition-colors ${!isCompleted ? 'bg-slate-50/40 text-slate-400' : ''
                            }`}
                        >
                          {/* Kode & Tanggal */}
                          <td className="py-3.5 px-4">
                            <div className="font-semibold text-slate-900">
                              {s.transaction_code}
                            </div>
                            <div className="text-xs text-slate-500 mt-0.5">
                              {formatDateTime(s.occurred_at)}
                            </div>
                          </td>

                          {/* Pembeli */}
                          <td className="py-3.5 px-4 font-medium text-slate-700">
                            {s.buyer_name || 'Pembeli langsung'}
                          </td>

                          {/* Item count */}
                          <td className="py-3.5 px-4 text-center font-medium text-slate-600 text-xs">
                            {s.item_count || 1} barang
                          </td>

                          {/* Pemasukan */}
                          <td className="py-3.5 px-4 text-right font-bold text-slate-900 font-mono text-xs">
                            {formatRupiah(s.total_revenue ?? 0)}
                          </td>

                          {/* Keuntungan */}
                          <td className="py-3.5 px-4 text-right font-mono text-xs">
                            {isCompleted ? (
                              <span className="font-semibold text-emerald-700">
                                +{formatRupiah(s.total_profit ?? 0)}
                              </span>
                            ) : (
                              <span className="text-slate-400 line-through">
                                {formatRupiah(s.total_profit ?? 0)}
                              </span>
                            )}
                          </td>

                          {/* Status */}
                          <td className="py-3.5 px-4 text-center">
                            {isCompleted ? (
                              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
                                Selesai
                              </span>
                            ) : (
                              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-rose-50 text-rose-700 border border-rose-200">
                                Dibatalkan
                              </span>
                            )}
                          </td>

                          {/* Aksi */}
                          <td className="py-3.5 px-4 text-center">
                            <div className="flex items-center justify-center gap-1">
                              {/* Rincian detail */}
                              <button
                                onClick={() => setSelectedSaleDetail(s)}
                                title="Lihat rincian transaksi"
                                className="p-1.5 rounded-lg text-slate-600 hover:text-blue-900 hover:bg-blue-50 transition-colors"
                              >
                                <Eye className="w-4 h-4" />
                              </button>

                              {/* Batalkan (hanya jika completed) */}
                              {isCompleted && (
                                <button
                                  onClick={() => setSelectedSaleCancel(s)}
                                  title="Batalkan transaksi ini & kembalikan stok"
                                  className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                                >
                                  <Ban className="w-4 h-4" />
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}

            {/* Footer */}
            <div className="p-4 bg-slate-50 border-t border-slate-200 text-xs text-slate-500 flex items-center justify-between">
              <span>Menampilkan {sales.length} dari total {total} transaksi</span>
              <span className="font-medium text-slate-700">
                Pencatatan waktu: Zona Bisnis Asia/Jakarta (WIB)
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Modals */}
      <SaleDetailModal
        isOpen={!!selectedSaleDetail}
        onClose={() => setSelectedSaleDetail(null)}
        sale={selectedSaleDetail}
      />

      <CancelSaleModal
        isOpen={!!selectedSaleCancel}
        onClose={() => setSelectedSaleCancel(null)}
        onSuccess={() => loadSales()}
        sale={selectedSaleCancel}
      />
    </div>
  );
}
