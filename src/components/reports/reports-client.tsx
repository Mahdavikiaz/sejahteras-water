'use client';

import React, { useState, useTransition } from 'react';
import {
  BarChart3,
  Calendar,
  Download,
  DollarSign,
  TrendingUp,
  ShoppingCart,
  Calculator,
  Loader2,
  FileSpreadsheet,
  Package,
} from 'lucide-react';
import { toast } from 'sonner';
import { getReportSummary, getDailyReport, getProductReport } from '@/app/actions/reports';
import { StatCard } from '@/components/ui/stat-card';
import {
  formatRupiah,
  formatDate,
  getMonthStart,
  getYearStart,
  getTodayStart,
  getTodayEnd,
  localDateToStartOfDay,
  localDateToEndOfDay,
} from '@/lib/formatters';
import type { ReportSummary, DailyReportRow, ProductReportRow } from '@/types';

interface ReportsClientProps {
  initialSummary: ReportSummary;
  initialDaily: DailyReportRow[];
  initialProducts: ProductReportRow[];
  initialStartDate: string;
  initialEndDate: string;
}

type PeriodPreset = 'today' | 'this_month' | 'this_year' | 'custom';

export function ReportsClient({
  initialSummary,
  initialDaily,
  initialProducts,
  initialStartDate,
  initialEndDate,
}: ReportsClientProps) {
  const [isPending, startTransition] = useTransition();

  const [preset, setPreset] = useState<PeriodPreset>('this_month');
  const [startDate, setStartDate] = useState(initialStartDate);
  const [endDate, setEndDate] = useState(initialEndDate);

  // Custom date picker inputs (YYYY-MM-DD)
  const [customStart, setCustomStart] = useState(() => initialStartDate.slice(0, 10));
  const [customEnd, setCustomEnd] = useState(() => initialEndDate.slice(0, 10));

  const [summary, setSummary] = useState<ReportSummary>(initialSummary);
  const [dailyReport, setDailyReport] = useState<DailyReportRow[]>(initialDaily);
  const [productReport, setProductReport] = useState<ProductReportRow[]>(initialProducts);

  const [activeReportTab, setActiveReportTab] = useState<'daily' | 'product'>('daily');

  // Trigger data load
  const loadReportData = (start: string, end: string) => {
    startTransition(async () => {
      const [sumRes, dailyRes, prodRes] = await Promise.all([
        getReportSummary(start, end),
        getDailyReport(start, end),
        getProductReport(start, end),
      ]);

      if (sumRes.success && sumRes.data) {
        setSummary(sumRes.data);
      }
      if (dailyRes.success && dailyRes.data) {
        setDailyReport(dailyRes.data);
      }
      if (prodRes.success && prodRes.data) {
        setProductReport(prodRes.data);
      }
    });
  };

  const handlePresetChange = (newPreset: PeriodPreset) => {
    setPreset(newPreset);

    let start = startDate;
    let end = endDate;

    if (newPreset === 'today') {
      start = getTodayStart();
      end = getTodayEnd();
    } else if (newPreset === 'this_month') {
      start = getMonthStart();
      end = getTodayEnd();
    } else if (newPreset === 'this_year') {
      start = getYearStart();
      end = getTodayEnd();
    }

    if (newPreset !== 'custom') {
      setStartDate(start);
      setEndDate(end);
      loadReportData(start, end);
    }
  };

  const handleApplyCustomFilter = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customStart || !customEnd) {
      toast.error('Pilih tanggal awal dan akhir dengan lengkap');
      return;
    }
    const start = localDateToStartOfDay(customStart);
    const end = localDateToEndOfDay(customEnd);

    if (new Date(start) > new Date(end)) {
      toast.error('Tanggal awal tidak boleh melebihi tanggal akhir');
      return;
    }

    setStartDate(start);
    setEndDate(end);
    loadReportData(start, end);
  };

  const handleExportCSV = () => {
    toast.info('Mempersiapkan berkas laporan CSV...');
    const url = `/api/reports/export?start_date=${encodeURIComponent(startDate)}&end_date=${encodeURIComponent(endDate)}`;
    window.open(url, '_blank');
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
            Laporan Keuangan
          </h1>
          <p className="mt-1 text-sm text-slate-600">
            Rekap pemasukan, laba bersih, dan volume penjualan barang
          </p>
        </div>

        {/* Ekspor CSV Button */}
        <button
          onClick={handleExportCSV}
          className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-slate-800 text-sm font-semibold shadow-sm transition-colors min-h-[44px]"
        >
          <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
          Ekspor Laporan (CSV)
        </button>
      </div>

      {/* Period Filter Card */}
      <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-slate-400" />
            <span className="text-sm font-semibold text-slate-800">Pilih Periode:</span>
          </div>

          {/* Preset Buttons */}
          <div className="flex flex-wrap items-center gap-1.5">
            {[
              { id: 'today', label: 'Hari Ini' },
              { id: 'this_month', label: 'Bulan Ini' },
              { id: 'this_year', label: 'Tahun Ini' },
              { id: 'custom', label: 'Rentang Kustom' },
            ].map((p) => (
              <button
                key={p.id}
                onClick={() => handlePresetChange(p.id as PeriodPreset)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors min-h-[36px] ${
                  preset === p.id
                    ? 'bg-blue-900 text-white shadow-xs'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>

        {/* Custom Date Form */}
        {preset === 'custom' && (
          <form
            onSubmit={handleApplyCustomFilter}
            className="pt-3 border-t border-slate-100 flex flex-wrap items-end gap-3"
          >
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">
                Tanggal Mulai:
              </label>
              <input
                type="date"
                required
                value={customStart}
                onChange={(e) => setCustomStart(e.target.value)}
                className="px-3 py-1.5 rounded-lg border border-slate-300 text-xs text-slate-900 bg-white"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">
                Tanggal Selesai:
              </label>
              <input
                type="date"
                required
                value={customEnd}
                onChange={(e) => setCustomEnd(e.target.value)}
                className="px-3 py-1.5 rounded-lg border border-slate-300 text-xs text-slate-900 bg-white"
              />
            </div>
            <button
              type="submit"
              className="px-4 py-2 rounded-lg bg-blue-900 hover:bg-blue-800 text-white text-xs font-semibold transition-colors min-h-[36px]"
            >
              Terapkan Rentang
            </button>
          </form>
        )}
      </div>

      {/* KPI Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Total Pemasukan"
          value={formatRupiah(summary.total_revenue)}
          subtitle="Total omset penjualan completed"
          icon={DollarSign}
          variant="default"
        />

        <StatCard
          title="Total Keuntungan Bersih"
          value={formatRupiah(summary.total_profit)}
          subtitle="Total profit berdasarkan snapshot modal"
          icon={TrendingUp}
          variant="success"
        />

        <StatCard
          title="Jumlah Transaksi"
          value={`${summary.transaction_count} Transaksi`}
          subtitle="Volume transaksi selesai dalam periode"
          icon={ShoppingCart}
          variant="default"
        />

        <StatCard
          title="Rata-rata per Transaksi"
          value={formatRupiah(summary.avg_transaction_value)}
          subtitle="Nilai belanja rata-rata pembeli"
          icon={Calculator}
          variant="default"
        />
      </div>

      {/* Sub-table Tabs & Content */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        {/* Tab Headers */}
        <div className="p-4 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50/50">
          <div className="inline-flex p-1 bg-slate-200/70 rounded-lg">
            <button
              onClick={() => setActiveReportTab('daily')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-bold transition-all ${
                activeReportTab === 'daily'
                  ? 'bg-white text-blue-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Calendar className="w-3.5 h-3.5" />
              Rekap Harian
            </button>
            <button
              onClick={() => setActiveReportTab('product')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-bold transition-all ${
                activeReportTab === 'product'
                  ? 'bg-white text-blue-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Package className="w-3.5 h-3.5" />
              Rekap per Produk
            </button>
          </div>

          <span className="text-xs text-slate-500 font-medium">
            Periode: {formatDate(startDate)} s/d {formatDate(endDate)}
          </span>
        </div>

        {/* Tab Content */}
        {isPending ? (
          <div className="py-16 flex flex-col items-center justify-center text-slate-400">
            <Loader2 className="w-8 h-8 animate-spin text-blue-900 mb-2" />
            <p className="text-sm font-medium text-slate-600">Memperbarui data laporan...</p>
          </div>
        ) : activeReportTab === 'daily' ? (
          dailyReport.length === 0 ? (
            <div className="p-12 text-center text-slate-500">
              <BarChart3 className="w-10 h-10 text-slate-300 mx-auto mb-2" />
              <p className="text-sm font-semibold text-slate-800">
                Tidak Ada Transaksi di Periode Ini
              </p>
              <p className="text-xs text-slate-500 mt-1">
                Silakan ganti rentang periode filter di atas.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-50 text-slate-600 text-xs uppercase tracking-wider border-b border-slate-200">
                  <tr>
                    <th className="py-3 px-4 font-semibold">Tanggal</th>
                    <th className="py-3 px-4 font-semibold text-center">Jumlah Transaksi</th>
                    <th className="py-3 px-4 font-semibold text-right">Pemasukan (Omset)</th>
                    <th className="py-3 px-4 font-semibold text-right">Keuntungan (Profit)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {dailyReport.map((row) => (
                    <tr key={row.date} className="hover:bg-slate-50/70">
                      <td className="py-3 px-4 font-semibold text-slate-800">
                        {formatDate(row.date)}
                      </td>
                      <td className="py-3 px-4 text-center text-slate-600 font-medium">
                        {row.transaction_count} transaksi
                      </td>
                      <td className="py-3 px-4 text-right font-bold text-slate-900 font-mono text-xs">
                        {formatRupiah(row.revenue)}
                      </td>
                      <td className="py-3 px-4 text-right font-semibold text-emerald-700 font-mono text-xs">
                        +{formatRupiah(row.profit)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )
        ) : productReport.length === 0 ? (
          <div className="p-12 text-center text-slate-500">
            <Package className="w-10 h-10 text-slate-300 mx-auto mb-2" />
            <p className="text-sm font-semibold text-slate-800">
              Belum Ada Data Produk Terjual
            </p>
            <p className="text-xs text-slate-500 mt-1">
              Tidak ada data penjualan produk pada rentang tanggal yang dipilih.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 text-slate-600 text-xs uppercase tracking-wider border-b border-slate-200">
                <tr>
                  <th className="py-3 px-4 font-semibold">Nama Produk</th>
                  <th className="py-3 px-4 font-semibold text-center">Kuantitas Terjual</th>
                  <th className="py-3 px-4 font-semibold text-right">Total Pemasukan</th>
                  <th className="py-3 px-4 font-semibold text-right">Total Keuntungan</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {productReport.map((p) => (
                  <tr key={p.product_id} className="hover:bg-slate-50/70">
                    <td className="py-3 px-4 font-semibold text-slate-800">
                      {p.product_name}
                    </td>
                    <td className="py-3 px-4 text-center font-bold text-slate-700">
                      {p.total_quantity} unit
                    </td>
                    <td className="py-3 px-4 text-right font-bold text-slate-900 font-mono text-xs">
                      {formatRupiah(p.total_revenue)}
                    </td>
                    <td className="py-3 px-4 text-right font-semibold text-emerald-700 font-mono text-xs">
                      +{formatRupiah(p.total_profit)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
