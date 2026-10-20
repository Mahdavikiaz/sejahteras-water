import { connection } from 'next/server';
import { getActiveProducts } from '@/app/actions/products';
import { getSales } from '@/app/actions/sales';
import { SalesClient } from '@/components/sales/sales-client';

export default async function SalesPage() {
  await connection();
  const [productsRes, salesRes] = await Promise.all([
    getActiveProducts(),
    getSales({ page: 1, per_page: 20 }),
  ]);

  const products = productsRes.success && productsRes.data ? productsRes.data : [];
  const sales = salesRes.success && salesRes.data ? salesRes.data.data : [];
  const total = salesRes.success && salesRes.data ? salesRes.data.total : 0;

  return (
    <SalesClient
      products={products}
      initialSales={sales}
      initialTotal={total}
    />
  );
}
