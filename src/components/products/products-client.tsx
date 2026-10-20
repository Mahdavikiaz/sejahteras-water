'use client';

import React, { useState, useEffect, useTransition } from 'react';
import { useSearchParams } from 'next/navigation';
import {
  Package,
  Plus,
  Search,
  Edit2,
  RefreshCw,
  History,
  Power,
  PowerOff,
  AlertTriangle,
  Loader2,
} from 'lucide-react';
import { toast } from 'sonner';
import { getProducts, deactivateProduct, activateProduct } from '@/app/actions/products';
import { ProductModal } from './product-modal';
import { StockAdjustModal } from './stock-adjust-modal';
import { StockHistoryModal } from './stock-history-modal';
import { formatRupiah } from '@/lib/formatters';
import { LOW_STOCK_THRESHOLD, type Product, type StockFilter } from '@/types';

interface ProductsClientProps {
  initialProducts: Product[];
  initialTotal: number;
}

export function ProductsClient({
  initialProducts,
  initialTotal,
}: ProductsClientProps) {
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  const [products, setProducts] = useState<Product[]>(initialProducts);
  const [total, setTotal] = useState<number>(initialTotal);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<StockFilter>('all');
  const [page, setPage] = useState(1);

  // Modals state
  const [isProductModalOpen, setIsProductModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);

  const [isStockModalOpen, setIsStockModalOpen] = useState(false);
  const [stockProduct, setStockProduct] = useState<Product | null>(null);

  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);
  const [historyProduct, setHistoryProduct] = useState<Product | null>(null);

  // Open create modal if ?tambah=1 in URL
  useEffect(() => {
    if (searchParams.get('tambah') === '1') {
      setEditingProduct(null);
      setIsProductModalOpen(true);
    }
  }, [searchParams]);

  // Refresh products list
  const loadProducts = (currentSearch = search, currentFilter = filter, currentPage = page) => {
    startTransition(async () => {
      const res = await getProducts({
        search: currentSearch,
        filter: currentFilter,
        page: currentPage,
        per_page: 20,
      });

      if (res.success && res.data) {
        setProducts(res.data.data);
        setTotal(res.data.total);
      }
    });
  };

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setSearch(val);
    setPage(1);
    loadProducts(val, filter, 1);
  };

  const handleFilterChange = (newFilter: StockFilter) => {
    setFilter(newFilter);
    setPage(1);
    loadProducts(search, newFilter, 1);
  };

  const handleToggleActive = async (product: Product) => {
    const action = product.is_active ? deactivateProduct : activateProduct;
    const actionName = product.is_active ? 'dinonaktifkan' : 'diaktifkan';

    try {
      const res = await action(product.id);
      if (!res.success) {
        toast.error(res.error || `Gagal mengubah status produk`);
        return;
      }
      toast.success(`Produk "${product.name}" berhasil ${actionName}`);
      loadProducts();
    } catch {
      toast.error('Terjadi kesalahan saat mengubah status produk');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header bar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
            Produk & Stok
          </h1>
          <p className="mt-1 text-sm text-slate-600">
            Kelola katalog harga jual, harga modal, dan pemantauan stok fisik
          </p>
        </div>

        <button
          onClick={() => {
            setEditingProduct(null);
            setIsProductModalOpen(true);
          }}
          className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-lg bg-blue-900 hover:bg-blue-800 text-white text-sm font-semibold shadow-sm transition-colors min-h-[44px]"
        >
          <Plus className="w-4 h-4" />
          Tambah Produk
        </button>
      </div>

      {/* Filter and Search Toolbar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm space-y-4">
        <div className="flex flex-col md:flex-row md:items-center gap-4 justify-between">
          {/* Search box */}
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={handleSearchChange}
              placeholder="Cari nama produk..."
              className="w-full pl-10 pr-4 py-2 rounded-lg border border-slate-300 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-900/20 focus:border-blue-900 transition-colors"
            />
          </div>

          {/* Status Filter Tabs */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0">
            {(
              [
                { id: 'all', label: 'Semua' },
                { id: 'low_stock', label: 'Stok Menipis' },
                { id: 'out_of_stock', label: 'Stok Habis' },
                { id: 'active', label: 'Aktif' },
                { id: 'inactive', label: 'Nonaktif' },
              ] as { id: StockFilter; label: string }[]
            ).map((tab) => (
              <button
                key={tab.id}
                onClick={() => handleFilterChange(tab.id)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors min-h-[36px] ${
                  filter === tab.id
                    ? 'bg-blue-900 text-white shadow-xs'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Main Table / List */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        {isPending ? (
          <div className="py-16 flex flex-col items-center justify-center text-slate-400">
            <Loader2 className="w-8 h-8 animate-spin text-blue-900 mb-2" />
            <p className="text-sm font-medium text-slate-600">Memuat data produk...</p>
          </div>
        ) : products.length === 0 ? (
          <div className="p-12 text-center">
            <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center mx-auto text-slate-400 mb-3">
              <Package className="w-6 h-6" />
            </div>
            <p className="text-base font-semibold text-slate-800">
              Tidak Ada Produk yang Ditemukan
            </p>
            <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
              {search || filter !== 'all'
                ? 'Tidak ada produk yang cocok dengan pencarian atau filter yang dipilih.'
                : 'Mulai dengan menambahkan produk pertama Anda untuk dicatat penjualannya.'}
            </p>
            <div className="mt-5">
              <button
                onClick={() => {
                  setEditingProduct(null);
                  setIsProductModalOpen(true);
                }}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-blue-900 hover:bg-blue-800 text-white text-xs font-semibold shadow-sm transition-colors"
              >
                <Plus className="w-4 h-4" />
                Tambah Produk Sekarang
              </button>
            </div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 text-slate-600 text-xs uppercase tracking-wider border-b border-slate-200">
                <tr>
                  <th className="py-3 px-4 font-semibold">Nama Produk</th>
                  <th className="py-3 px-4 font-semibold text-center">Stok</th>
                  <th className="py-3 px-4 font-semibold text-right">Modal</th>
                  <th className="py-3 px-4 font-semibold text-right">Harga Jual</th>
                  <th className="py-3 px-4 font-semibold text-right">Untung / Unit</th>
                  <th className="py-3 px-4 font-semibold text-center">Status</th>
                  <th className="py-3 px-4 font-semibold text-center">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {products.map((p) => {
                  const profit = p.selling_price - p.cost_price;
                  const isOutOfStock = p.stock === 0;
                  const isLowStock = p.stock > 0 && p.stock <= LOW_STOCK_THRESHOLD;

                  return (
                    <tr
                      key={p.id}
                      className={`hover:bg-slate-50/70 transition-colors ${
                        !p.is_active ? 'opacity-60 bg-slate-50/30' : ''
                      }`}
                    >
                      {/* Name & Category */}
                      <td className="py-3.5 px-4">
                        <div className="font-semibold text-slate-900">{p.name}</div>
                        <div className="text-xs text-slate-500 mt-0.5">
                          {p.category || 'Umum'} • per {p.unit}
                        </div>
                      </td>

                      {/* Stock with Badge */}
                      <td className="py-3.5 px-4 text-center">
                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold border ${
                            isOutOfStock
                              ? 'bg-rose-50 text-rose-700 border-rose-200'
                              : isLowStock
                              ? 'bg-amber-50 text-amber-700 border-amber-200'
                              : 'bg-slate-100 text-slate-800 border-slate-200'
                          }`}
                        >
                          {isOutOfStock && <AlertTriangle className="w-3 h-3 text-rose-600" />}
                          {isLowStock && <AlertTriangle className="w-3 h-3 text-amber-600" />}
                          {isOutOfStock
                            ? 'Habis (0)'
                            : `${p.stock} ${p.unit}`}
                        </span>
                      </td>

                      {/* Cost price */}
                      <td className="py-3.5 px-4 text-right text-slate-600 font-medium font-mono text-xs">
                        {formatRupiah(p.cost_price)}
                      </td>

                      {/* Selling price */}
                      <td className="py-3.5 px-4 text-right font-bold text-slate-900 font-mono text-xs">
                        {formatRupiah(p.selling_price)}
                      </td>

                      {/* Profit */}
                      <td className="py-3.5 px-4 text-right font-mono text-xs">
                        <span
                          className={`font-semibold ${
                            profit < 0 ? 'text-rose-600' : 'text-emerald-700'
                          }`}
                        >
                          {formatRupiah(profit)}
                        </span>
                      </td>

                      {/* Status */}
                      <td className="py-3.5 px-4 text-center">
                        {p.is_active ? (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
                            Aktif
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-600 border border-slate-200">
                            Nonaktif
                          </span>
                        )}
                      </td>

                      {/* Action buttons */}
                      <td className="py-3.5 px-4 text-center">
                        <div className="flex items-center justify-center gap-1">
                          {/* Edit button */}
                          <button
                            onClick={() => {
                              setEditingProduct(p);
                              setIsProductModalOpen(true);
                            }}
                            title="Edit data produk"
                            className="p-1.5 rounded-lg text-slate-600 hover:text-blue-900 hover:bg-blue-50 transition-colors"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>

                          {/* Adjust stock button */}
                          <button
                            onClick={() => {
                              setStockProduct(p);
                              setIsStockModalOpen(true);
                            }}
                            title="Sesuaikan stok fisik"
                            className="p-1.5 rounded-lg text-slate-600 hover:text-amber-700 hover:bg-amber-50 transition-colors"
                          >
                            <RefreshCw className="w-4 h-4" />
                          </button>

                          {/* Stock movement history button */}
                          <button
                            onClick={() => {
                              setHistoryProduct(p);
                              setIsHistoryModalOpen(true);
                            }}
                            title="Lihat riwayat pergerakan stok"
                            className="p-1.5 rounded-lg text-slate-600 hover:text-indigo-700 hover:bg-indigo-50 transition-colors"
                          >
                            <History className="w-4 h-4" />
                          </button>

                          {/* Toggle Active / Inactive */}
                          <button
                            onClick={() => handleToggleActive(p)}
                            title={p.is_active ? 'Nonaktifkan produk' : 'Aktifkan produk'}
                            className={`p-1.5 rounded-lg transition-colors ${
                              p.is_active
                                ? 'text-slate-400 hover:text-rose-600 hover:bg-rose-50'
                                : 'text-slate-400 hover:text-emerald-600 hover:bg-emerald-50'
                            }`}
                          >
                            {p.is_active ? (
                              <PowerOff className="w-4 h-4" />
                            ) : (
                              <Power className="w-4 h-4" />
                            )}
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Total Summary Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 text-xs text-slate-500 flex items-center justify-between">
          <span>Menampilkan {products.length} dari total {total} produk</span>
          <span className="font-medium text-slate-700">Ambang stok menipis: {LOW_STOCK_THRESHOLD} unit</span>
        </div>
      </div>

      {/* Modals */}
      <ProductModal
        isOpen={isProductModalOpen}
        onClose={() => {
          setIsProductModalOpen(false);
          setEditingProduct(null);
        }}
        onSuccess={() => loadProducts()}
        initialProduct={editingProduct}
      />

      <StockAdjustModal
        isOpen={isStockModalOpen}
        onClose={() => {
          setIsStockModalOpen(false);
          setStockProduct(null);
        }}
        onSuccess={() => loadProducts()}
        product={stockProduct}
      />

      <StockHistoryModal
        isOpen={isHistoryModalOpen}
        onClose={() => {
          setIsHistoryModalOpen(false);
          setHistoryProduct(null);
        }}
        product={historyProduct}
      />
    </div>
  );
}
