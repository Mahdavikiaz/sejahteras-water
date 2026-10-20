import Link from 'next/link';
import {
  DollarSign,
  TrendingUp,
  ShoppingCart,
  AlertTriangle,
  PlusCircle,
  ArrowRight,
  Package,
  Calendar,
  AlertCircle,
} from 'lucide-react';
import { getDashboardSummary } from '@/app/actions/reports';
import { getRecentSales } from '@/app/actions/sales';
import { getLowStockProducts } from '@/app/actions/products';
import { StatCard } from '@/components/ui/stat-card';
import { connection } from 'next/server';
import { formatRupiah, formatDateTime } from '@/lib/formatters';
import { BUSINESS_TIMEZONE } from '@/types';

export default async function DashboardPage() {
  await connection();

  // Fetch data in parallel
  const [summaryResult, salesResult, lowStockResult] = await Promise.all([
    getDashboardSummary(),
    getRecentSales(5),
    getLowStockProducts(),
  ]);

  const summary = summaryResult.success && summaryResult.data
    ? summaryResult.data
    : {
        today_revenue: 0,
        today_profit: 0,
        today_transaction_count: 0,
        low_stock_count: 0,
        out_of_stock_count: 0,
      };

  const recentSales = salesResult.success && salesResult.data ? salesResult.data : [];
  const lowStockProducts = lowStockResult.success && lowStockResult.data ? lowStockResult.data : [];

  const dbConnected = summaryResult.success;

  // Format tanggal hari ini dalam WIB
  const todayFormatted = new Intl.DateTimeFormat('id-ID', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: BUSINESS_TIMEZONE,
  }).format(new Date());

  const totalStockAlerts = summary.low_stock_count + summary.out_of_stock_count;

  return (
    <div className="space-y-8">
      {/* Koneksi Supabase Info jika belum setup */}
      {!dbConnected && (
        <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
          <div className="text-sm text-amber-900">
            <p className="font-semibold">Koneksi Database Belum Dikonfigurasi</p>
            <p className="mt-0.5 text-amber-800">
              Pastikan Anda telah mengisi variabel <code className="bg-amber-100 px-1 py-0.5 rounded font-mono">NEXT_PUBLIC_SUPABASE_URL</code> dan <code className="bg-amber-100 px-1 py-0.5 rounded font-mono">NEXT_PUBLIC_SUPABASE_ANON_KEY</code> pada file <code className="bg-amber-100 px-1 py-0.5 rounded font-mono">.env.local</code> serta menjalankan migrasi database di Supabase.
            </p>
          </div>
        </div>
      )}

      {/* Header Halaman */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
            Ringkasan Hari Ini
          </h1>
          <p className="mt-1 flex items-center gap-1.5 text-sm text-slate-600 font-medium">
            <Calendar className="w-4 h-4 text-slate-400" />
            {todayFormatted} (WIB)
          </p>
        </div>

        {/* Tombol Aksi Utama */}
        <div className="flex items-center gap-3">
          <Link
            href="/produk?tambah=1"
            className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 text-sm font-medium shadow-sm transition-colors min-h-[44px]"
          >
            <Package className="w-4 h-4 text-slate-500" />
            Tambah Produk
          </Link>
          <Link
            href="/transaksi?baru=1"
            className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-lg bg-blue-900 hover:bg-blue-800 text-white text-sm font-semibold shadow-sm transition-colors min-h-[44px]"
          >
            <PlusCircle className="w-4 h-4" />
            Catat Transaksi
          </Link>
        </div>
      </div>

      {/* Grid 4 Kartu Metrik */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Pemasukan Hari Ini"
          value={formatRupiah(summary.today_revenue)}
          subtitle="Total nilai transaksi berhasil"
          icon={DollarSign}
          variant="default"
        />

        <StatCard
          title="Keuntungan Hari Ini"
          value={formatRupiah(summary.today_profit)}
          subtitle="Selisih harga jual dan modal"
          icon={TrendingUp}
          variant={summary.today_profit > 0 ? 'success' : 'default'}
        />

        <StatCard
          title="Jumlah Transaksi"
          value={`${summary.today_transaction_count} Transaksi`}
          subtitle="Transaksi selesai hari ini"
          icon={ShoppingCart}
          variant="default"
        />

        <StatCard
          title="Peringatan Stok"
          value={
            totalStockAlerts > 0
              ? `${totalStockAlerts} Produk Perlu Dicek`
              : 'Stok Aman'
          }
          subtitle={
            summary.out_of_stock_count > 0
              ? `${summary.out_of_stock_count} habis, ${summary.low_stock_count} menipis`
              : totalStockAlerts > 0
              ? `${summary.low_stock_count} produk menipis`
              : 'Semua produk di atas batas minimum'
          }
          icon={AlertTriangle}
          variant={
            summary.out_of_stock_count > 0
              ? 'danger'
              : summary.low_stock_count > 0
              ? 'warning'
              : 'default'
          }
        />
      </div>

      {/* Grid 2 Kolom: Transaksi Terbaru & Produk Stok Menipis */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Kolom 1: Transaksi Terbaru (Lebar 2) */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden flex flex-col justify-between">
          <div className="p-5 border-b border-slate-100 flex items-center justify-between">
            <div>
              <h2 className="text-base font-semibold text-slate-900">
                Transaksi Terbaru
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                5 transaksi terakhir yang tercatat di sistem
              </p>
            </div>
            <Link
              href="/transaksi"
              className="inline-flex items-center gap-1 text-xs font-semibold text-blue-900 hover:text-blue-700"
            >
              Lihat Semua
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="flex-1 divide-y divide-slate-100">
            {recentSales.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="bg-slate-50 text-slate-600 text-xs uppercase tracking-wider">
                    <tr>
                      <th className="py-3 px-4 font-semibold">Kode & Waktu</th>
                      <th className="py-3 px-4 font-semibold">Pembeli</th>
                      <th className="py-3 px-4 font-semibold text-right">Pemasukan</th>
                      <th className="py-3 px-4 font-semibold text-right">Keuntungan</th>
                      <th className="py-3 px-4 font-semibold text-center">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {recentSales.map((sale) => (
                      <tr key={sale.id} className="hover:bg-slate-50/70 transition-colors">
                        <td className="py-3.5 px-4">
                          <div className="font-semibold text-slate-800">
                            {sale.transaction_code}
                          </div>
                          <div className="text-xs text-slate-500 mt-0.5">
                            {formatDateTime(sale.occurred_at)}
                          </div>
                        </td>
                        <td className="py-3.5 px-4 text-slate-700 font-medium">
                          {sale.buyer_name || 'Pembeli langsung'}
                        </td>
                        <td className="py-3.5 px-4 text-right font-semibold text-slate-900">
                          {formatRupiah(sale.total_revenue ?? 0)}
                        </td>
                        <td className="py-3.5 px-4 text-right font-medium text-emerald-700">
                          {sale.status === 'completed'
                            ? `+${formatRupiah(sale.total_profit ?? 0)}`
                            : '-'}
                        </td>
                        <td className="py-3.5 px-4 text-center">
                          {sale.status === 'completed' ? (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
                              Selesai
                            </span>
                          ) : (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-rose-50 text-rose-700 border border-rose-200">
                              Dibatalkan
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="p-8 text-center">
                <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center mx-auto text-slate-400 mb-3">
                  <ShoppingCart className="w-6 h-6" />
                </div>
                <p className="text-sm font-medium text-slate-800">Belum Ada Transaksi</p>
                <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                  Transaksi yang Anda catat hari ini akan otomatis muncul di tabel ini.
                </p>
                <div className="mt-4">
                  <Link
                    href="/transaksi?baru=1"
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-blue-900 hover:bg-blue-800 text-white text-xs font-medium shadow-sm transition-colors"
                  >
                    <PlusCircle className="w-3.5 h-3.5" />
                    Catat Transaksi Pertama
                  </Link>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Kolom 2: Produk Stok Menipis (Lebar 1) */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden flex flex-col justify-between">
          <div className="p-5 border-b border-slate-100 flex items-center justify-between">
            <div>
              <h2 className="text-base font-semibold text-slate-900">
                Peringatan Stok
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Stok habis atau di bawah batas minimum (5 unit)
              </p>
            </div>
            <Link
              href="/produk?filter=low_stock"
              className="text-xs font-semibold text-blue-900 hover:text-blue-700"
            >
              Semua Stok
            </Link>
          </div>

          <div className="flex-1 divide-y divide-slate-100">
            {lowStockProducts.length > 0 ? (
              <div className="divide-y divide-slate-100">
                {lowStockProducts.map((product) => {
                  const isOutOfStock = product.stock === 0;
                  return (
                    <div
                      key={product.id}
                      className="p-4 flex items-center justify-between gap-3 hover:bg-slate-50/70 transition-colors"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-semibold text-slate-800 truncate">
                          {product.name}
                        </p>
                        <p className="text-xs text-slate-500 mt-0.5">
                          {product.category || 'Umum'} • {formatRupiah(product.selling_price)}
                        </p>
                      </div>

                      <div className="text-right shrink-0">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold border ${
                            isOutOfStock
                              ? 'bg-rose-50 text-rose-700 border-rose-200'
                              : 'bg-amber-50 text-amber-700 border-amber-200'
                          }`}
                        >
                          {isOutOfStock
                            ? 'Habis (0)'
                            : `Sisa ${product.stock} ${product.unit}`}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="p-8 text-center">
                <div className="w-12 h-12 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto mb-3">
                  <Package className="w-6 h-6" />
                </div>
                <p className="text-sm font-medium text-slate-800">Stok Produk Aman</p>
                <p className="text-xs text-slate-500 mt-1">
                  Tidak ada produk yang stoknya habis atau menipis saat ini.
                </p>
              </div>
            )}
          </div>

          <div className="p-4 bg-slate-50/50 border-t border-slate-100 text-center">
            <Link
              href="/produk"
              className="text-xs font-semibold text-slate-700 hover:text-blue-900 inline-flex items-center gap-1"
            >
              Kelola & Tambah Stok Produk
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
